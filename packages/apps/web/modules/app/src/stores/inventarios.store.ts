import { makeAutoObservable } from "mobx";

import {
  alertasDe,
  codigoDuplicado,
  construirArbol,
  descendientesDe,
  estadoDeLinea,
  fotoEsperada,
  inventarioEditable,
  fraseDeEvento,
  progresoDe,
  puedeFinalizar,
  resumenDeElemento,
  sanearCantidad,
  sirveDeReferencia,
  validarBajaUbicacion,
  validarCondicion,
  validarJerarquia,
  type Alerta,
  type ArbolUbicaciones,
  type ConfigInventarios,
  type CondicionElemento,
  type Elemento,
  type EstadoElemento,
  type EstadoInventario,
  type Evidencia,
  type EventoHistorial,
  type Inventario,
  type LineaInventario,
  type NivelUbicacion,
  type ResumenElemento,
  type TipoEvento,
  type TipoInventario,
  type Ubicacion,
} from "@/domain/inventarios/inventarios.domain";
import {
  CONFIG_SEED,
  ELEMENTOS_SEED,
  EVIDENCIAS_SEED,
  EVENTOS_SEED,
  INVENTARIOS_SEED,
  LINEAS_SEED,
  RESPONSABLE_POR_DEFECTO,
  UBICACIONES_SEED,
} from "@/stores/inventarios.seed";

// ═══════════════════════════════════════════════════════════════════════════
// INVENTARIOS STORE
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Qué es este store, y qué NO es ────────────────────────────────────────
//
// Es dueño de CINCO colecciones: elementos, ubicaciones, inventarios, líneas y
// eventos. Las alertas **no** se guardan aquí: se derivan en `alertas`, que es
// un getter, porque una alerta almacenada es una alerta que puede quedar
// desfasada de los datos que la produjeron.
//
// ── Lo que este store NO hace ─────────────────────────────────────────────
//
// 1. **No decide permisos.** No conoce capacidades ni roles. Comprueba
//    *estado* (`editable`, `puedeFinalizar`) y nada más; quién puede pulsar es
//    asunto de la capa de acceso. Mezclarlos aquí produciría un store que hay
//    que mockear entero para probar una regla de conteo.
// 2. **No importa ningún otro store.** Ni `sessionStore`, ni
//    `operadoresStore`, ni nada. Por eso los métodos que registran autoría
//    reciben `actorId` como **parámetro**: el store no sabe quién eres, se lo
//    dicen. Es lo que permite probarlo sin montar el árbol de la aplicación.
// 3. **No persiste.** Mismo criterio que el resto del mock: un `localStorage`
//    aquí daría la ilusión de que los conteos sobreviven, y las evidencias
//    —que son `dataUrl` de varios cientos de KB— reventarían la cuota del
//    navegador a la tercera foto. Sin persistencia, el seed se recarga limpio
//    y la UI dice la verdad sobre las evidencias.
//
// ── Las mutaciones comprueban el estado, no el permiso ────────────────────
//
// `agregarLineas` rechaza un inventario finalizado aunque quien llame sea un
// administrador. Eso es R7: un acto firmado no se edita, ni siquiera para
// corregirlo. La autorización decide si el botón EXISTE; el store decide si la
// operación es LEGAL. Son dos preguntas distintas y las dos se contestan.

/** Error de una mutación, con su motivo legible. No se lanza: se devuelve. */
export interface ResultadoMutacion {
  ok: boolean;
  motivo?: string;
  /** Ids creados, para que la UI pueda navegar o marcar lo nuevo. */
  ids?: string[];
}

/** Entrada de `agregarLineas`: lo mínimo que la UI sabe de cada elemento. */
export interface EntradaLinea {
  elementoId: string;
  cantidadObservada?: number | null;
  condicion?: CondicionElemento;
  observacion?: string;
}

/** Entrada de alta/edición de elemento. */
export interface DatosElemento {
  codigo: string;
  nombre: string;
  categoria: string;
  unidad: Elemento["unidad"];
  descripcion?: string;
}

/** Entrada de alta/edición de ubicación. */
export interface DatosUbicacion {
  nombre: string;
  nivel: NivelUbicacion;
  padreId: string | null;
}

/** Entrada de alta de inventario. */
export interface DatosInventario {
  nombre: string;
  tipo: TipoInventario;
  ubicacionId: string;
  responsableId: string;
  notas?: string;
}

const nowIso = () => new Date().toISOString();
const nuevoId = (prefijo: string) => `${prefijo}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

export class InventariosStore {
  // ── Estado ────────────────────────────────────────────────────────────────

  elementos: Elemento[] = ELEMENTOS_SEED.map((e) => ({ ...e }));
  ubicaciones: Ubicacion[] = UBICACIONES_SEED.map((u) => ({ ...u }));
  inventarios: Inventario[] = INVENTARIOS_SEED.map((i) => ({ ...i }));
  lineas: LineaInventario[] = LINEAS_SEED.map((l) => ({ ...l, evidenciaIds: [...l.evidenciaIds] }));
  evidencias: Evidencia[] = EVIDENCIAS_SEED.map((e) => ({ ...e }));
  eventos: EventoHistorial[] = EVENTOS_SEED.map((e) => ({ ...e, detalle: e.detalle ? { ...e.detalle } : undefined }));
  config: ConfigInventarios = { ...CONFIG_SEED, categoriasSugeridas: [...CONFIG_SEED.categoriasSugeridas] };

  /**
   * Reloj congelado para las alertas de estancamiento.
   *
   * `null` → se usa `new Date()` en el getter, que es lo correcto en la app.
   * Un valor → esa fecha manda. Existe para poder **probar** la alerta de
   * «lleva N días sin avance» sin esperar N días: el seed es de septiembre y
   * con el reloj real esas alertas no se verían hasta octubre.
   */
  relojSimulado: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // LECTURA — inventarios
  // ═════════════════════════════════════════════════════════════════════════

  get inventariosOrdenados(): Inventario[] {
    return [...this.inventarios].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  inventarioPorId(id: string | null | undefined): Inventario | undefined {
    if (!id) return undefined;
    return this.inventarios.find((i) => i.id === id);
  }

  /** Líneas de un inventario, en el orden del catálogo de elementos. */
  lineasDe(inventarioId: string): LineaInventario[] {
    const orden = new Map(this.elementos.map((e, i) => [e.id, i]));
    return this.lineas
      .filter((l) => l.inventarioId === inventarioId)
      .sort((a, b) => (orden.get(a.elementoId) ?? 0) - (orden.get(b.elementoId) ?? 0));
  }

  lineaPorId(id: string | null | undefined): LineaInventario | undefined {
    if (!id) return undefined;
    return this.lineas.find((l) => l.id === id);
  }

  elementoDe(linea: LineaInventario): Elemento | undefined {
    return this.elementoPorId(linea.elementoId);
  }

  progresoDeInventario(inventarioId: string) {
    return progresoDe(this.lineasDe(inventarioId));
  }

  /** Cuántas líneas de un inventario están en `sobra` o `falta`. */
  discrepanciasDe(inventarioId: string): number {
    return this.lineasDe(inventarioId).filter((l) => {
      const e = estadoDeLinea(l);
      return e === "sobra" || e === "falta";
    }).length;
  }

  /**
   * ¿Se puede editar el inventario? **Solo mira el estado.**
   *
   * No hay parámetro de rol a propósito: el permiso decide si el botón se
   * pinta; esta función decide si la operación tiene sentido. Un inventario
   * finalizado no se edita ni con todos los permisos del mundo (R7).
   */
  esEditable(inventarioId: string): boolean {
    const inv = this.inventarioPorId(inventarioId);
    return inv ? inventarioEditable(inv.estado) : false;
  }

  /** ¿Puede finalizarse? Devuelve el motivo con el número de pendientes (R8). */
  estadoDeFinalizacion(inventarioId: string) {
    const inv = this.inventarioPorId(inventarioId);
    if (!inv) return { puede: false, motivo: "El inventario no existe" };
    return puedeFinalizar(inv, this.lineasDe(inventarioId));
  }

  // ═════════════════════════════════════════════════════════════════════════
  // LECTURA — elementos y ubicaciones
  // ═════════════════════════════════════════════════════════════════════════

  elementoPorId(id: string | null | undefined): Elemento | undefined {
    if (!id) return undefined;
    return this.elementos.find((e) => e.id === id);
  }

  /** Nombre del elemento, o un respaldo honesto. Nunca lanza. */
  nombreDeElemento(id: string): string {
    return this.elementoPorId(id)?.nombre ?? "Elemento eliminado";
  }

  /** El catálogo completo, ordenado por código. Es lo que ve la pantalla. */
  get elementosOrdenados(): Elemento[] {
    return [...this.elementos].sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
  }

  /**
   * Elementos que se pueden agregar a un inventario: **activos y no incluidos**.
   *
   * Es el filtro del selector, y aplica las dos reglas juntas:
   *   · R4 — un elemento inactivo no se cuenta. No hay forma de forzarlo.
   *   · R2 — una línea por elemento por inventario.
   *
   * El resultado se calcula aparte del render para que la pantalla no repita la
   * regla y para que un test pueda comprobarla sin montar el modal.
   */
  elementosAgregables(inventarioId: string): Elemento[] {
    const inv = this.inventarioPorId(inventarioId);
    if (!inv) return [];
    const yaIncluidos = new Set(
      this.lineas.filter((l) => l.inventarioId === inventarioId).map((l) => l.elementoId),
    );
    return this.elementosOrdenados.filter(
      (e) => e.estado === "activo" && !yaIncluidos.has(e.id),
    );
  }

  /** Ids de elementos ya presentes en el inventario. Para pintar «Ya incluido». */
  elementosYaEn(inventarioId: string): Set<string> {
    return new Set(
      this.lineas.filter((l) => l.inventarioId === inventarioId).map((l) => l.elementoId),
    );
  }

  /** Categorías realmente usadas, para los chips del formulario. */
  get categoriasUsadas(): string[] {
    const set = new Set(this.elementos.map((e) => e.categoria).filter((c) => c.trim().length > 0));
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }

  /** Sugerencias de categoría: las configuradas más las ya usadas, sin repetir. */
  get categoriasSugeridas(): string[] {
    const set = new Set([...this.config.categoriasSugeridas, ...this.categoriasUsadas]);
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }

  get ubicacionesActivas(): Ubicacion[] {
    return this.ubicaciones.filter((u) => u.estado === "activo");
  }

  /** Ubicaciones donde tiene sentido abrir un inventario: las de nivel hoja. */
  get ubicacionesContables(): Ubicacion[] {
    return this.ubicaciones.filter((u) => u.estado === "activo" && u.nivel === "ubicacion");
  }

  ubicacionPorId(id: string | null | undefined): Ubicacion | undefined {
    if (!id) return undefined;
    return this.ubicaciones.find((u) => u.id === id);
  }

  /** `Map` id→ubicación. El árbol y el camino lo necesitan y se construye una vez. */
  get ubicacionesPorId(): Map<string, Ubicacion> {
    return new Map(this.ubicaciones.map((u) => [u.id, u]));
  }

  /** Árbol Cliente → Sede → Ubicación, tolerante a datos rotos. */
  get arbolUbicaciones(): ArbolUbicaciones {
    return construirArbol(this.ubicaciones);
  }

  /** Cuántos inventarios usan una ubicación (para el bloqueo de baja, R13). */
  inventariosEnUbicacion(ubicacionId: string): Inventario[] {
    return this.inventarios.filter((i) => i.ubicacionId === ubicacionId);
  }

  /**
   * ¿Se puede desactivar esta ubicación? Devuelve motivo, no booleano (R13).
   *
   * Un «no se puede» sin decir qué estorba obliga a investigar a mano; el
   * motivo nombra las ubicaciones dentro o los inventarios abiertos.
   */
  puedeDesactivarUbicacion(ubicacionId: string) {
    return validarBajaUbicacion(ubicacionId, this.ubicaciones, this.inventarios);
  }

  /** Descendientes de una ubicación. Lo usa el bloqueo de baja y el árbol. */
  descendientes(ubicacionId: string): Ubicacion[] {
    return descendientesDe(ubicacionId, this.ubicaciones);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // LECTURA — evidencias, historial, alertas, resúmenes
  // ═════════════════════════════════════════════════════════════════════════

  evidenciasDeLinea(lineaId: string): Evidencia[] {
    return this.evidencias.filter((e) => e.lineaId === lineaId);
  }

  /** Evidencias de un elemento, a través de todos sus conteos (D9). */
  evidenciasDeElemento(elementoId: string): Evidencia[] {
    return this.evidencias
      .filter((e) => e.elementoId === elementoId)
      .sort((a, b) => Date.parse(b.subidaEn) - Date.parse(a.subidaEn));
  }

  /** Historial, más reciente primero. Es el orden que espera la pantalla. */
  get eventosOrdenados(): EventoHistorial[] {
    return [...this.eventos].sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
  }

  eventosDeInventario(inventarioId: string): EventoHistorial[] {
    return this.eventosOrdenados.filter((e) => e.inventarioId === inventarioId);
  }

  eventosDeElemento(elementoId: string): EventoHistorial[] {
    return this.eventosOrdenados.filter((e) => e.elementoId === elementoId);
  }

  /** Nombre legible del inventario, o el número, o un respaldo. */
  nombreDeInventario(id: string): string {
    const inv = this.inventarioPorId(id);
    return inv ? inv.nombre : "Inventario eliminado";
  }

  /**
   * La frase legible de un evento, con los nombres ya resueltos.
   *
   * Existe para que las tres pantallas que pintan historial (detalle del conteo,
   * ficha del elemento, historial global) no repitan el mismo `nombres: {...}`
   * construido a mano. `fraseDeEvento` es pura y recibe nombres; esta envoltura
   * es la que sabe resolvérselos desde las colecciones del store.
   *
   * Va aquí y no en la capa de presentación porque necesita leer dos colecciones
   * cruzadas (`elemento` por la línea, inventario por el evento), y hacerlo
   * fuera obligaría a cada pantalla a repetir esa resolución.
   */
  fraseDeEventoConNombres(evento: EventoHistorial): string {
    const elemento = evento.elementoId ? this.nombreDeElemento(evento.elementoId) : undefined;
    const inv = this.inventarioPorId(evento.inventarioId);
    return fraseDeEvento(evento, {
      elemento,
      inventario: inv?.nombre,
    });
  }

  /**
   * Las alertas, **derivadas** de los datos actuales. `getter`, no campo.
   *
   * Es un getter y no una colección almacenada por una razón concreta: una
   * alerta guardada puede sobrevivir al hecho que la produjo. Si el operador
   * corrige la observación de una línea dañada, la alerta tiene que desaparecer
   * sola, no esperar a que alguien la borre.
   *
   * `relojSimulado` permite fijar «hoy» en las pruebas de estancamiento.
   */
  get alertas(): Alerta[] {
    return alertasDe(
      this.inventarios,
      this.lineas,
      this.elementos,
      this.config,
      this.relojSimulado ?? nowIso(),
    );
  }

  alertasDeInventario(inventarioId: string): Alerta[] {
    return this.alertas.filter((a) => a.inventarioId === inventarioId);
  }

  resumenDeElemento(elementoId: string): ResumenElemento {
    return resumenDeElemento(elementoId, this.lineas, this.inventarios);
  }

  // ── Métricas de la portada (D12: cuatro, y solo cuatro) ─────────────────

  /**
   * Las cuatro métricas del módulo.
   *
   * **Lo que NO está aquí, y por qué** — es tan importante como lo que sí:
   *   · «Valor total a costo»: obliga a moneda y a método de valorización. Es
   *     contabilidad, y es el indicador que hizo sonar a ERP al módulo anterior.
   *   · «% de exactitud»: no lleva a ninguna acción. Nadie hace nada con «94%».
   *   · «Rotación»: necesita ventas. Es otro dominio.
   *   · Tendencias y gráficas: no hay serie histórica real en un mock, y una
   *     gráfica bonita sobre datos inventados es decoración que miente.
   */
  get metricas() {
    const activos = this.inventarios.filter((i) => i.estado === "en_curso").length;
    const pendientes = this.lineas.filter((l) => {
      const inv = this.inventarioPorId(l.inventarioId);
      return inv !== undefined && inventarioEditable(inv.estado) && l.cantidadObservada === null;
    }).length;
    const discrepancias = this.inventarios
      .filter((i) => i.estado === "en_curso")
      .reduce((acc, i) => acc + this.discrepanciasDe(i.id), 0);
    const dañados = this.lineas.filter((l) => l.condicion === "dañado").length;
    return {
      inventariosActivos: activos,
      lineasPendientes: pendientes,
      discrepanciasAbiertas: discrepancias,
      elementosDañados: dañados,
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // MUTACIONES — INVENTARIOS
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Crea un inventario en `borrador`.
   *
   * Nace en borrador y no en curso: crear y empezar a contar son dos actos
   * distintos, y entre ellos cabe cargar el catálogo de elementos sin reloj
   * corriendo. Si naciera `en_curso`, el `iniciadoEn` de un conteo que no ha
   * empezado ensuciaría la métrica de estancamiento.
   */
  crearInventario(datos: DatosInventario, actorId: string): ResultadoMutacion {
    const nombre = datos.nombre.trim();
    if (!nombre) return { ok: false, motivo: "Escribe un nombre para el inventario" };
    if (!datos.ubicacionId) return { ok: false, motivo: "Selecciona una ubicación" };
    const ubicacion = this.ubicacionPorId(datos.ubicacionId);
    if (!ubicacion) return { ok: false, motivo: "La ubicación seleccionada no existe" };
    if (ubicacion.estado !== "activo") {
      return { ok: false, motivo: "No se puede contar en una ubicación desactivada" };
    }
    // Se cuenta en el nivel hoja: contar una «sede» sin decir en qué espacio es
    // contar en el aire, y la esperada dejaría de describir nada.
    if (ubicacion.nivel !== "ubicacion") {
      return { ok: false, motivo: "Selecciona una ubicación dentro de la sede, no la sede misma" };
    }

    const inv: Inventario = {
      id: nuevoId("inv"),
      numero: this.siguienteNumero(),
      nombre,
      tipo: datos.tipo,
      ubicacionId: datos.ubicacionId,
      estado: "borrador",
      responsableId: datos.responsableId || RESPONSABLE_POR_DEFECTO,
      notas: datos.notas?.trim() || undefined,
      createdAt: nowIso(),
    };
    this.inventarios.push(inv);
    this.registrarEvento("inventario_creado", inv.id, actorId, {
      tipo: datos.tipo,
      lineas: 0,
    });
    return { ok: true, ids: [inv.id] };
  }

  /** Correlativo `INV-AAAA-NNNN`, único dentro del año. */
  private siguienteNumero(): string {
    const anio = new Date().getFullYear();
    const prefijo = `INV-${anio}-`;
    const usados = this.inventarios
      .filter((i) => i.numero.startsWith(prefijo))
      .map((i) => Number(i.numero.slice(prefijo.length)))
      .filter((n) => Number.isFinite(n));
    const siguiente = usados.length === 0 ? 1 : Math.max(...usados) + 1;
    return `${prefijo}${String(siguiente).padStart(4, "0")}`;
  }

  /**
   * Inicia el conteo: `borrador → en_curso` y **congela la esperada** (D2).
   *
   * El congelamiento ocurre aquí y en ningún otro sitio. No se recalcula
   * después —ni al agregar una línea nueva, ni al finalizar— porque una foto
   * que se puede refrescar no es una foto: es una consulta con nombre de foto.
   *
   * La fuente es el **último finalizado de la misma ubicación**. Si el conteo
   * es `inicial`, no se busca referencia y todas las esperadas quedan en `null`:
   * un inventario inicial define el punto cero, así que compararlo contra algo
   * sería contradecir su propio nombre.
   */
  iniciarInventario(inventarioId: string, actorId: string): ResultadoMutacion {
    const inv = this.inventarioPorId(inventarioId);
    if (!inv) return { ok: false, motivo: "El inventario no existe" };
    if (inv.estado === "en_curso") return { ok: false, motivo: "Este inventario ya está en curso" };
    if (inv.estado !== "borrador") {
      return { ok: false, motivo: `No se puede iniciar un inventario ${inv.estado}` };
    }
    const lineas = this.lineasDe(inventarioId);
    if (lineas.length === 0) {
      return { ok: false, motivo: "Agrega al menos un elemento antes de iniciar" };
    }

    if (inv.tipo !== "inicial") {
      const referencia = this.ultimoFinalizadoDeUbicacion(inv.ubicacionId, inventarioId);
      if (referencia) {
        const foto = fotoEsperada(this.lineas.filter((l) => l.inventarioId === referencia.id));
        for (const l of this.lineas) {
          if (l.inventarioId !== inventarioId) continue;
          // Solo se sobreescribe si la línea NO tiene ya una esperada. Un valor
          // puesto a mano por el operador es una decisión suya y la foto no
          // tiene por qué pisarla.
          if (l.cantidadEsperada === null) l.cantidadEsperada = foto.get(l.elementoId) ?? null;
        }
      }
    }

    inv.estado = "en_curso";
    inv.iniciadoEn = nowIso();
    this.registrarEvento("inventario_iniciado", inventarioId, actorId, { lineas: lineas.length });
    return { ok: true };
  }

  /**
   * El último inventario finalizado de esa ubicación, excluyendo uno mismo.
   *
   * «Último» es por `finalizadoEn`, no por `createdAt`: un conteo creado antes
   * pero cerrado después es el que describe el estado más reciente del sitio.
   */
  private ultimoFinalizadoDeUbicacion(ubicacionId: string, exceptoId: string): Inventario | undefined {
    return this.inventarios
      .filter(
        (i) =>
          i.id !== exceptoId &&
          i.ubicacionId === ubicacionId &&
          sirveDeReferencia(i) &&
          i.finalizadoEn,
      )
      .sort((a, b) => Date.parse(b.finalizadoEn as string) - Date.parse(a.finalizadoEn as string))[0];
  }

  /**
   * El último finalizado de una ubicación, para **leer** (no para iniciar).
   *
   * Existe porque la pantalla de creación necesita enseñar cuál será la
   * referencia **antes** de crear el conteo: sin eso, el usuario elige
   * «periódico» sin saber si hay algo con qué comparar, y descubre que su
   * conteo no calcula diferencias cuando ya está contando.
   *
   * El `exceptoId` de la versión privada es el propio inventario que se está
   * iniciando. Aquí todavía no hay inventario, así que se pasa una cadena
   * imposible: no hay nada que excluir.
   */
  ultimoFinalizadoDeUbicacionPublico(ubicacionId: string): Inventario | undefined {
    return this.ultimoFinalizadoDeUbicacion(ubicacionId, "");
  }

  /**
   * Finaliza: congela, firma y pasa a ser la referencia (D5).
   *
   * Es la operación más consecuente del módulo: convierte un conteo en un hecho
   * con autor y fecha, y lo transforma en la base de comparación del siguiente.
   * Por eso comprueba R8 (sin pendientes) y `lineas.length > 0` antes de tocar
   * nada, y por eso es **irreversible**: no existe `desfinalizar`.
   */
  finalizarInventario(inventarioId: string, firmanteId: string): ResultadoMutacion {
    const inv = this.inventarioPorId(inventarioId);
    if (!inv) return { ok: false, motivo: "El inventario no existe" };

    const lineas = this.lineasDe(inventarioId);
    const veredicto = puedeFinalizar(inv, lineas);
    if (!veredicto.puede) return { ok: false, motivo: veredicto.motivo ?? "No se puede finalizar" };

    // R11: se revalida en el punto de guardado, no solo en el formulario. Una
    // condición «dañado» sin respaldo no puede llegar a un acto firmado.
    for (const l of lineas) {
      const req = validarCondicion(l);
      if (!req.ok) {
        return { ok: false, motivo: `«${this.nombreDeElemento(l.elementoId)}»: ${req.motivo}` };
      }
    }

    inv.estado = "finalizado";
    inv.finalizadoEn = nowIso();
    inv.finalizadoPorId = firmanteId;
    this.registrarEvento("inventario_finalizado", inventarioId, firmanteId, {
      contadas: lineas.filter((l) => l.cantidadObservada !== null).length,
    });
    return { ok: true };
  }

  /**
   * Anula: sale de los reportes activos y **conserva todo**.
   *
   * Anular no borra. Las líneas siguen ahí, el historial también, y el
   * inventario sigue siendo consultable. Es la salida honesta para un conteo
   * que dejó de ser comparable — no un `delete`, que borraría la evidencia de
   * que el conteo existió.
   */
  anularInventario(inventarioId: string, actorId: string, motivo?: string): ResultadoMutacion {
    const inv = this.inventarioPorId(inventarioId);
    if (!inv) return { ok: false, motivo: "El inventario no existe" };
    if (inv.estado === "anulado") return { ok: false, motivo: "Este inventario ya está anulado" };
    if (inv.estado === "finalizado") {
      // Se permite, pero se dice qué implica: un finalizado anulado deja de ser
      // referencia para el próximo periódico, y eso hay que saberlo antes.
      inv.estado = "anulado";
      this.registrarEvento("inventario_anulado", inventarioId, actorId, {
        motivo: motivo?.trim() || "Sin motivo registrado",
      });
      return { ok: true };
    }
    inv.estado = "anulado";
    this.registrarEvento("inventario_anulado", inventarioId, actorId, {
      motivo: motivo?.trim() || "Sin motivo registrado",
    });
    return { ok: true };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // MUTACIONES — LÍNEAS
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Agrega líneas a un inventario. **Una sola llamada para varias filas.**
   *
   * El modal de «Agregar elemento» puede venir con cinco elementos y cinco
   * cantidades; hacer cinco llamadas produciría cinco ráfagas de eventos y
   * cinco renders intermedios con el contador a medio. Aquí se valida todo,
   * se filtra lo que sobra y se escribe una vez.
   *
   * Filtra en silencio lo que la UI ya no debería mostrar (duplicados, elementos
   * inactivos) y devuelve `ok: false` solo cuando **nada** se pudo agregar. La
   * razón: si de cinco filas una estaba duplicada, rechazar las cinco castigaría
   * al usuario por un estado que la propia pantalla ya señalaba.
   */
  agregarLineas(inventarioId: string, entradas: readonly EntradaLinea[], actorId: string): ResultadoMutacion {
    const inv = this.inventarioPorId(inventarioId);
    if (!inv) return { ok: false, motivo: "El inventario no existe" };
    if (!inventarioEditable(inv.estado)) {
      return { ok: false, motivo: "Este inventario ya no admite cambios" };
    }
    if (entradas.length === 0) return { ok: false, motivo: "No seleccionaste ningún elemento" };

    const yaEn = this.elementosYaEn(inventarioId);
    const creadas: string[] = [];

    for (const entrada of entradas) {
      const elemento = this.elementoPorId(entrada.elementoId);
      if (!elemento) continue;
      if (elemento.estado !== "activo") continue; // R4
      if (yaEn.has(entrada.elementoId)) continue; // R2

      const condicion: CondicionElemento = entrada.condicion ?? "no_aplica";
      const observacion = entrada.observacion?.trim() || undefined;
      const cantidad = sanearCantidad(entrada.cantidadObservada ?? null); // R5

      const linea: LineaInventario = {
        id: nuevoId("ln"),
        inventarioId,
        elementoId: entrada.elementoId,
        cantidadObservada: cantidad,
        // La esperada se congela al INICIAR, no al agregar. Una línea creada en
        // un conteo ya en curso nace sin esperada: no estaba en la foto.
        cantidadEsperada: null,
        condicion,
        observacion,
        evidenciaIds: [],
        contadaEn: cantidad !== null ? nowIso() : undefined,
        contadoPorId: cantidad !== null ? actorId : undefined,
      };
      this.lineas.push(linea);
      yaEn.add(entrada.elementoId);
      creadas.push(linea.id);

      this.registrarEvento("linea_agregada", inventarioId, actorId, {
        elemento: elemento.nombre,
      }, { elementoId: elemento.id, lineaId: linea.id });
    }

    if (creadas.length === 0) {
      return { ok: false, motivo: "Los elementos ya estaban incluidos o no están disponibles" };
    }
    return { ok: true, ids: creadas };
  }

  /**
   * Cuenta una línea: cantidad, condición y observación de una vez.
   *
   * `cantidadObservada` pasa por `sanearCantidad`, que es el único punto por el
   * que entran las cantidades (R5). Ahí es donde `""` se convierte en `null` y
   * no en `0` — la distinción sobre la que se sostiene todo el módulo.
   *
   * Si la condición es «dañado» sin observación o sin evidencia, **se rechaza**.
   * El formulario ya deshabilita el botón, pero la regla se comprueba también
   * aquí: un guardado puede llegar por otro camino, y R11 no es una validación
   * de formulario, es una invariante del modelo.
   */
  contarLinea(
    lineaId: string,
    datos: { cantidadObservada: number | null; condicion: CondicionElemento; observacion?: string },
    actorId: string,
  ): ResultadoMutacion {
    const linea = this.lineaPorId(lineaId);
    if (!linea) return { ok: false, motivo: "La línea no existe" };
    const inv = this.inventarioPorId(linea.inventarioId);
    if (!inv) return { ok: false, motivo: "El inventario no existe" };
    if (!inventarioEditable(inv.estado)) {
      return { ok: false, motivo: "Este inventario ya no admite cambios" };
    }

    const cantidad = sanearCantidad(datos.cantidadObservada);
    const observacion = datos.observacion?.trim() || undefined;
    const req = validarCondicion({
      condicion: datos.condicion,
      observacion,
      evidenciaIds: linea.evidenciaIds,
    });
    if (!req.ok) return { ok: false, motivo: req.motivo ?? "La condición no es válida" };

    const estabaContada = linea.cantidadObservada !== null;
    linea.cantidadObservada = cantidad;
    linea.condicion = datos.condicion;
    linea.observacion = observacion;
    if (cantidad !== null) {
      linea.contadaEn = nowIso();
      linea.contadoPorId = actorId;
    } else {
      // Volver a dejar la cantidad vacía deshace el conteo: si no se limpia la
      // fecha, una línea «pendiente» conservaría un `contadaEn` y el historial
      // diría que se contó algo que la tabla pinta como no contado.
      linea.contadaEn = undefined;
      linea.contadoPorId = undefined;
    }

    this.registrarEvento(
      estabaContada ? "linea_editada" : "linea_contada",
      linea.inventarioId,
      actorId,
      // `cantidad === null` NO se codifica aquí: `detalle` es
      // `Record<string, string | number>` y un `null` no cabe. `fraseDeEvento`
      // ya sabe leer la ausencia de la clave como «marcó como contado sin
      // cantidad», que es exactamente este caso.
      { ...(cantidad !== null ? { cantidad } : {}), elemento: this.nombreDeElemento(linea.elementoId) },
      { elementoId: linea.elementoId, lineaId: linea.id },
    );
    return { ok: true };
  }

  /**
   * Adjunta evidencias a una línea.
   *
   * El `dataUrl` viene ya leído por el navegador (`FileReader.readAsDataURL`);
   * el store no toca el sistema de archivos. Como no hay backend, la evidencia
   * vive en memoria y desaparece al recargar — la UI lo dice.
   *
   * **No se valida el tipo MIME aquí**: lo filtra el `accept` del `<input>`, y
   * un `dataUrl` que no sea imagen simplemente no se podrá pintar. Validarlo
   * otra vez daría una falsa sensación de seguridad, porque el cliente es el
   * que decide qué envía.
   */
  adjuntarEvidencia(
    lineaId: string,
    archivos: readonly { nombreArchivo: string; dataUrl: string }[],
    actorId: string,
  ): ResultadoMutacion {
    const linea = this.lineaPorId(lineaId);
    if (!linea) return { ok: false, motivo: "La línea no existe" };
    const inv = this.inventarioPorId(linea.inventarioId);
    if (!inv || !inventarioEditable(inv.estado)) {
      return { ok: false, motivo: "Este inventario ya no admite cambios" };
    }
    if (archivos.length === 0) return { ok: false, motivo: "No seleccionaste ningún archivo" };

    const ids: string[] = [];
    for (const a of archivos) {
      const ev: Evidencia = {
        id: nuevoId("ev"),
        lineaId,
        elementoId: linea.elementoId,
        inventarioId: linea.inventarioId,
        nombreArchivo: a.nombreArchivo,
        dataUrl: a.dataUrl,
        subidaPorId: actorId,
        subidaEn: nowIso(),
      };
      this.evidencias.push(ev);
      linea.evidenciaIds.push(ev.id);
      ids.push(ev.id);
    }
    this.registrarEvento("evidencia_adjuntada", linea.inventarioId, actorId, {
      archivo: archivos[0].nombreArchivo,
      elemento: this.nombreDeElemento(linea.elementoId),
    }, { elementoId: linea.elementoId, lineaId });
    return { ok: true, ids };
  }

  /** Quita una evidencia de su línea. */
  quitarEvidencia(evidenciaId: string, actorId: string): ResultadoMutacion {
    const i = this.evidencias.findIndex((e) => e.id === evidenciaId);
    if (i === -1) return { ok: false, motivo: "La evidencia no existe" };
    const ev = this.evidencias[i];
    const linea = this.lineaPorId(ev.lineaId);
    const inv = this.inventarioPorId(ev.inventarioId);
    if (!inv || !inventarioEditable(inv.estado)) {
      return { ok: false, motivo: "Este inventario ya no admite cambios" };
    }
    this.evidencias.splice(i, 1);
    if (linea) linea.evidenciaIds = linea.evidenciaIds.filter((id) => id !== evidenciaId);
    this.registrarEvento("linea_editada", ev.inventarioId, actorId, {
      elemento: this.nombreDeElemento(ev.elementoId),
      nota: "quitó una evidencia",
    }, { elementoId: ev.elementoId, lineaId: ev.lineaId });
    return { ok: true };
  }

  /**
   * Quita una línea del inventario.
   *
   * Solo en borrador o en curso. En un conteo en curso se permite: uno puede
   * darse cuenta de que el elemento no pertenece a esta ubicación, y obligar a
   * contar algo que no está sería forzar un dato falso.
   *
   * No se borra de verdad: la línea sale de `lineas` y queda el evento. Si el
   * inventario se finaliza, la ausencia queda registrada en el historial.
   */
  quitarLinea(lineaId: string, actorId: string): ResultadoMutacion {
    const linea = this.lineaPorId(lineaId);
    if (!linea) return { ok: false, motivo: "La línea no existe" };
    const inv = this.inventarioPorId(linea.inventarioId);
    if (!inv || !inventarioEditable(inv.estado)) {
      return { ok: false, motivo: "Este inventario ya no admite cambios" };
    }
    const elementoId = linea.elementoId;
    this.lineas = this.lineas.filter((l) => l.id !== lineaId);
    // Las evidencias de una línea que ya no está no se pueden consultar desde
    // ningún sitio; se van con ella para no dejar huérfanos que inflen el
    // recuento de evidencias del elemento.
    this.evidencias = this.evidencias.filter((e) => e.lineaId !== lineaId);
    this.registrarEvento("linea_eliminada", linea.inventarioId, actorId, {
      elemento: this.nombreDeElemento(elementoId),
    }, { elementoId });
    return { ok: true };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // MUTACIONES — ELEMENTOS
  // ═════════════════════════════════════════════════════════════════════════

  /** Alta de elemento. Comprueba R1 (código único) ignorando tildes y caja. */
  crearElemento(datos: DatosElemento): ResultadoMutacion {
    const codigo = datos.codigo.trim();
    const nombre = datos.nombre.trim();
    if (!codigo) return { ok: false, motivo: "El código es obligatorio" };
    if (!nombre) return { ok: false, motivo: "El nombre es obligatorio" };

    const repetido = codigoDuplicado(codigo, this.elementos);
    if (repetido) {
      return { ok: false, motivo: `El código ${codigo} ya lo usa «${repetido.nombre}»` };
    }

    const el: Elemento = {
      id: nuevoId("el"),
      codigo,
      nombre,
      categoria: datos.categoria.trim(),
      unidad: datos.unidad,
      descripcion: datos.descripcion?.trim() || undefined,
      estado: "activo",
      createdAt: nowIso(),
    };
    this.elementos.push(el);
    return { ok: true, ids: [el.id] };
  }

  /** Edición de elemento. El código se revalida contra los demás, no contra sí. */
  actualizarElemento(id: string, datos: DatosElemento): ResultadoMutacion {
    const el = this.elementoPorId(id);
    if (!el) return { ok: false, motivo: "El elemento no existe" };
    const codigo = datos.codigo.trim();
    const nombre = datos.nombre.trim();
    if (!codigo) return { ok: false, motivo: "El código es obligatorio" };
    if (!nombre) return { ok: false, motivo: "El nombre es obligatorio" };

    const repetido = codigoDuplicado(codigo, this.elementos, id);
    if (repetido) {
      return { ok: false, motivo: `El código ${codigo} ya lo usa «${repetido.nombre}»` };
    }

    el.codigo = codigo;
    el.nombre = nombre;
    el.categoria = datos.categoria.trim();
    el.unidad = datos.unidad;
    el.descripcion = datos.descripcion?.trim() || undefined;
    return { ok: true, ids: [id] };
  }

  /**
   * Baja lógica del elemento (R12). **Nunca se borra.**
   *
   * Un elemento con historial borrado dejaría líneas huérfanas apuntando a un
   * id que ya no existe, dentro de inventarios que son inmutables. Por eso el
   * único camino es `inactivo`: deja de aparecer en el selector y sigue siendo
   * consultable en su Detalle y en el Historial.
   */
  desactivarElemento(id: string): ResultadoMutacion {
    const el = this.elementoPorId(id);
    if (!el) return { ok: false, motivo: "El elemento no existe" };
    if (el.estado === "inactivo") return { ok: false, motivo: "Ya estaba desactivado" };
    el.estado = "inactivo";
    return { ok: true };
  }

  /** Reactiva un elemento dado de baja. Vuelve al selector. */
  activarElemento(id: string): ResultadoMutacion {
    const el = this.elementoPorId(id);
    if (!el) return { ok: false, motivo: "El elemento no existe" };
    if (el.estado === "activo") return { ok: false, motivo: "Ya estaba activo" };
    el.estado = "activo";
    return { ok: true };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // MUTACIONES — UBICACIONES
  // ═════════════════════════════════════════════════════════════════════════

  /** Alta de ubicación. Comprueba R14 (padre del nivel correcto, sin ciclos). */
  crearUbicacion(datos: DatosUbicacion): ResultadoMutacion {
    const nombre = datos.nombre.trim();
    if (!nombre) return { ok: false, motivo: "El nombre es obligatorio" };
    const jerarquia = validarJerarquia(datos, this.ubicaciones);
    if (!jerarquia.ok) return { ok: false, motivo: jerarquia.motivo ?? "La jerarquía no es válida" };

    const ub: Ubicacion = {
      id: nuevoId("ub"),
      padreId: datos.nivel === "cliente" ? null : datos.padreId,
      nivel: datos.nivel,
      nombre,
      estado: "activo",
      createdAt: nowIso(),
    };
    this.ubicaciones.push(ub);
    return { ok: true, ids: [ub.id] };
  }

  /** Edición de ubicación. Revalida el árbol porque el padre puede cambiar. */
  actualizarUbicacion(id: string, datos: DatosUbicacion): ResultadoMutacion {
    const ub = this.ubicacionPorId(id);
    if (!ub) return { ok: false, motivo: "La ubicación no existe" };
    const nombre = datos.nombre.trim();
    if (!nombre) return { ok: false, motivo: "El nombre es obligatorio" };
    const jerarquia = validarJerarquia({ ...datos, ubicacionId: id }, this.ubicaciones);
    if (!jerarquia.ok) return { ok: false, motivo: jerarquia.motivo ?? "La jerarquía no es válida" };

    ub.nombre = nombre;
    ub.nivel = datos.nivel;
    ub.padreId = datos.nivel === "cliente" ? null : datos.padreId;
    return { ok: true, ids: [id] };
  }

  /**
   * Desactiva una ubicación, previa comprobación de R13.
   *
   * A diferencia del elemento, aquí **sí hay un motivo para bloquear**: una
   * ubicación con hijas activas o con inventarios abiertos. Desactivarla
   * dejaría inventarios en curso apuntando a un espacio que ya no existe.
   */
  desactivarUbicacion(id: string): ResultadoMutacion {
    const ub = this.ubicacionPorId(id);
    if (!ub) return { ok: false, motivo: "La ubicación no existe" };
    if (ub.estado === "inactivo") return { ok: false, motivo: "Ya estaba desactivada" };
    const veredicto = validarBajaUbicacion(id, this.ubicaciones, this.inventarios);
    if (!veredicto.ok) return { ok: false, motivo: veredicto.motivo ?? "No se puede dar de baja" };
    ub.estado = "inactivo";
    return { ok: true };
  }

  /** Reactiva una ubicación. Vuelve al árbol y al selector de conteo. */
  activarUbicacion(id: string): ResultadoMutacion {
    const ub = this.ubicacionPorId(id);
    if (!ub) return { ok: false, motivo: "La ubicación no existe" };
    if (ub.estado === "activo") return { ok: false, motivo: "Ya estaba activa" };
    // Un hijo no puede estar activo bajo un padre inactivo: sería un nodo
    // alcanzable pero invisible en el selector de conteo.
    if (ub.padreId) {
      const padre = this.ubicacionPorId(ub.padreId);
      if (padre && padre.estado === "inactivo") {
        return { ok: false, motivo: `Activa primero «${padre.nombre}»` };
      }
    }
    ub.estado = "activo";
    return { ok: true };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // MUTACIONES — CONFIGURACIÓN
  // ═════════════════════════════════════════════════════════════════════════

  /** Guarda la configuración. Valida el único valor que puede romper algo. */
  guardarConfig(patch: Partial<ConfigInventarios>): ResultadoMutacion {
    if (patch.diasInventarioEstancado !== undefined) {
      const dias = Number(patch.diasInventarioEstancado);
      if (!Number.isFinite(dias) || dias < 1) {
        return { ok: false, motivo: "Los días de estancamiento deben ser al menos 1" };
      }
      this.config.diasInventarioEstancado = Math.trunc(dias);
    }
    if (patch.unidadPorDefecto !== undefined) {
      this.config.unidadPorDefecto = patch.unidadPorDefecto;
    }
    if (patch.categoriasSugeridas !== undefined) {
      this.config.categoriasSugeridas = patch.categoriasSugeridas
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
    }
    return { ok: true };
  }

  /** Restaura el estado de fábrica. Es la única operación destructiva. */
  reiniciar(): ResultadoMutacion {
    this.elementos = ELEMENTOS_SEED.map((e) => ({ ...e }));
    this.ubicaciones = UBICACIONES_SEED.map((u) => ({ ...u }));
    this.inventarios = INVENTARIOS_SEED.map((i) => ({ ...i }));
    this.lineas = LINEAS_SEED.map((l) => ({ ...l, evidenciaIds: [...l.evidenciaIds] }));
    this.evidencias = EVIDENCIAS_SEED.map((e) => ({ ...e }));
    this.eventos = EVENTOS_SEED.map((e) => ({ ...e, detalle: e.detalle ? { ...e.detalle } : undefined }));
    this.config = { ...CONFIG_SEED, categoriasSugeridas: [...CONFIG_SEED.categoriasSugeridas] };
    this.relojSimulado = null;
    return { ok: true };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // INTERNO — historial
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Escribe un evento. **Toda mutación de línea pasa por aquí** (R10).
   *
   * El historial es la única fuente de «qué pasó», así que no puede haber un
   * camino que modifique una línea sin dejar rastro. Por eso es privado: si
   * fuera público, alguien lo llamaría desde fuera y el rastro dejaría de ser
   * sistemático.
   */
  private registrarEvento(
    tipo: TipoEvento,
    inventarioId: string,
    actorId: string,
    detalle?: Record<string, string | number>,
    refs?: { elementoId?: string; lineaId?: string },
  ) {
    this.eventos.push({
      id: nuevoId("hst"),
      tipo,
      inventarioId,
      elementoId: refs?.elementoId,
      lineaId: refs?.lineaId,
      detalle,
      actorId,
      fecha: nowIso(),
    });
  }

  /** Vacia inventarios y elementos para "Simular inicio desde 0" (sin datos previos). */
  iniciarDesdeCero() {
    this.elementos = [];
    this.ubicaciones = [];
    this.inventarios = [];
    this.lineas = [];
    this.evidencias = [];
    this.eventos = [];
  }

  /** Restaura los datos de prueba (seed) de Inventario. */
  restaurarSeed() {
    this.elementos = ELEMENTOS_SEED.map((e) => ({ ...e }));
    this.ubicaciones = UBICACIONES_SEED.map((u) => ({ ...u }));
    this.inventarios = INVENTARIOS_SEED.map((i) => ({ ...i }));
    this.lineas = LINEAS_SEED.map((l) => ({ ...l, evidenciaIds: [...l.evidenciaIds] }));
    this.evidencias = EVIDENCIAS_SEED.map((e) => ({ ...e }));
    this.eventos = EVENTOS_SEED.map((e) => ({ ...e, detalle: e.detalle ? { ...e.detalle } : undefined }));
  }
}

export const inventariosStore = new InventariosStore();

/** Estados posibles de una línea, en el orden en que se muestran los filtros. */
export const ORDEN_ESTADOS_LINEA = ["pendiente", "coincide", "sobra", "falta", "sin_esperado"] as const;

/** Estados posibles de un inventario, en el orden de los filtros. */
export const ORDEN_ESTADOS_INVENTARIO: EstadoInventario[] = [
  "borrador",
  "en_curso",
  "finalizado",
  "anulado",
];

/** Estados posibles de un elemento, para el filtro de la pantalla de Elementos. */
export const ORDEN_ESTADOS_ELEMENTO: EstadoElemento[] = ["activo", "inactivo"];
