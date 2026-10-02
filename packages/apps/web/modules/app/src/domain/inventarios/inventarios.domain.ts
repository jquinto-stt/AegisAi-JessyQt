/**
 * Domain: Inventarios — un inventario es un ACTO DE VERIFICACIÓN, no un almacén.
 *
 * ── Qué es este módulo ────────────────────────────────────────────────────
 *
 * No administra stock continuo. Administra **conteos**: «de esto que debería
 * haber, ¿qué se observó, dónde, quién y cuándo?». Un producto, un equipo, una
 * herramienta, un activo y un material se cuentan igual — se observa una
 * cantidad en un sitio. El modelo no sabe de perecederos, de precios ni de
 * reposición, y esa ignorancia es deliberada: es lo que lo hace universal.
 *
 * ── Qué NO hay aquí, y por qué ────────────────────────────────────────────
 *
 * Este archivo es 100 % puro: sin React, sin MobX, sin `localStorage`, sin
 * `Date.now()` dentro de las funciones exportadas (el instante entra como
 * parámetro o vive en los datos). Eso permite probar las reglas del negocio
 * sin montar un navegador.
 *
 * Tampoco hay **ningún campo de costo, valor o precio**. Un `costoUnitario`
 * obliga a decidir moneda, método de valorización y reposición — es decir,
 * contabilidad — y ese es exactamente el camino por el que un módulo de
 * conteos se convierte en un ERP. Aquí no se cruza esa puerta.
 *
 * Y no hay **categorías cerradas**. Una unión de categorías (`perecedero`,
 * `bebida`, `insumo`…) es asumir un rubro; `categoria` es texto libre y el
 * usuario nombra las suyas. `unidad` solo distingue «se cuenta de uno en uno»
 * de «se cuenta por conjunto», que es la distinción más neutra posible.
 *
 * ── El vocabulario del módulo anterior está PROHIBIDO ─────────────────────
 *
 * El repo tuvo un módulo de Inventario que se eliminó a propósito tras derivar
 * hacia ERP/WMS (compras, manufactura, KDS, valorización, listas de precios).
 * Sus nombres — `Articulo`, `bodega`, kárdex, lote, FEFO, `unidad: kg|g|l|ml` —
 * NO se reutilizan: arrastran el modelo mental que hizo fracasar al anterior.
 */

// ═══════════════════════════════════════════════════════════════════════════
// ELEMENTO — qué se cuenta
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cómo se cuenta un elemento. **No es una magnitud física.**
 *
 * `"unidad"` → se cuenta de uno en uno (una silla, un extintor, una caja).
 * `"grupo"`  → se cuenta por conjunto (un juego de llaves, un lote de cables).
 *
 * Un catálogo de magnitudes (`kg`, `g`, `l`, `ml`, `porcion`…) es asumir rubro:
 * esas siete unidades solo tienen sentido si el negocio vende alimentos. Un
 * negocio que cuenta activos fijos no sabría qué elegir.
 */
export type UnidadElemento = "unidad" | "grupo";

export type EstadoElemento = "activo" | "inactivo";

/**
 * Elemento — la cosa contable. Universal por construcción.
 *
 * Lo que se cuenta puede ser un producto, un equipo, una herramienta, un activo
 * o un material. El modelo no distingue: todos tienen código, nombre,
 * categoría y unidad.
 */
export interface Elemento {
  id: string;
  /** Único por organización (R1). Es como el cliente cita el elemento. */
  codigo: string;
  nombre: string;
  /**
   * **Texto libre**, nunca una unión cerrada. El usuario nombra sus categorías.
   * `ConfigInventarios.categoriasSugeridas` ofrece chips, no un catálogo.
   */
  categoria: string;
  unidad: UnidadElemento;
  descripcion?: string;
  /**
   * Baja **lógica**, nunca física (R12). Un elemento con historial no se borra:
   * borrarlo dejaría líneas huérfanas dentro de inventarios que son inmutables.
   */
  estado: EstadoElemento;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// UBICACIÓN — dónde se cuenta
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Nivel de la jerarquía. Tres y solo tres: `cliente → sede → ubicacion`.
 *
 * El nivel se declara en vez de deducirse de la profundidad del árbol: un árbol
 * auto-referente sin nivel explícito admite ciclos silenciosos, y el nivel 4
 * aparecería sin que nadie lo declare. Con `nivel` se puede validar el salto
 * (R14) y pintar el árbol con un componente recursivo que sabe dónde está.
 */
export type NivelUbicacion = "cliente" | "sede" | "ubicacion";

export type EstadoUbicacion = "activo" | "inactivo";

export interface Ubicacion {
  id: string;
  /** `null` SOLO en nivel `"cliente"`. En cualquier otro nivel, obligatorio. */
  padreId: string | null;
  nivel: NivelUbicacion;
  nombre: string;
  estado: EstadoUbicacion;
  createdAt: string;
}

/**
 * Orden canónico de los niveles: padre → hijo. Es el orden en el que se valida
 * que un `padreId` apunta al nivel inmediatamente superior.
 */
export const ORDEN_NIVELES: NivelUbicacion[] = ["cliente", "sede", "ubicacion"];

/** Nivel inmediatamente superior, o `null` si `nivel` es el raíz. */
export function nivelPadre(nivel: NivelUbicacion): NivelUbicacion | null {
  const i = ORDEN_NIVELES.indexOf(nivel);
  return i <= 0 ? null : ORDEN_NIVELES[i - 1];
}

// ═══════════════════════════════════════════════════════════════════════════
// INVENTARIO — el acto
// ═══════════════════════════════════════════════════════════════════════════

export type TipoInventario = "inicial" | "periodico" | "final";

/**
 * Ciclo de vida del acto. **Solo tres transiciones existen:**
 *
 *     borrador ──iniciar──▶ en_curso ──finalizar──▶ finalizado
 *        │                     │
 *        └──────anular─────────┴──────────────▶  anulado
 *
 * `finalizado` **no** vuelve a `en_curso`. Un acto verificado no se deshace: si
 * el conteo estaba mal, se crea uno correctivo o se anula. Desfinalizar sería
 * reescribir un hecho firmado.
 */
export type EstadoInventario = "borrador" | "en_curso" | "finalizado" | "anulado";

export interface Inventario {
  id: string;
  /** Correlativo legible: `INV-2026-0007`. Es como lo cita el cliente. */
  numero: string;
  nombre: string;
  tipo: TipoInventario;
  /**
   * UNA ubicación por inventario (D1/R3). Contar se hace espacio por espacio:
   * una persona recorre un sitio y anota lo que ve. Con la ubicación fijada
   * arriba, la esperada es un único número por elemento y el mismo elemento en
   * dos sitios son **dos inventarios**, no dos líneas.
   */
  ubicacionId: string;
  estado: EstadoInventario;
  responsableId: string;
  iniciadoEn?: string;
  /**
   * Se congela al finalizar y no se reescribe nunca (R9). Es la fecha de la
   * firma, no la de creación.
   */
  finalizadoEn?: string;
  /** Quien firma. Puede no ser el responsable: firmar es una capacidad aparte. */
  finalizadoPorId?: string;
  notas?: string;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// LÍNEA — el hecho observado
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Condición observada. **Eje independiente de la cantidad** (D7).
 *
 * Una nevera puede estar **completa** (la cantidad coincide) y **dañada** (la
 * condición). Si la condición fuese un valor del estado de línea, marcar
 * «dañado» borraría «coincide» y el reporte perdería la mitad del hecho.
 *
 * `"no_aplica"` existe para que «no lo miré» no tenga que mentir: no es
 * «bueno» por omisión.
 */
export type CondicionElemento = "bueno" | "regular" | "dañado" | "no_aplica";

/** Estado de una línea, **siempre derivado**. Nunca se almacena (R5-adyacente). */
export type EstadoLinea =
  | "pendiente"    // observada === null → no se ha contado
  | "sin_esperado" // esperada === null → inventario inicial, no hay referencia
  | "coincide"     // observada === esperada
  | "sobra"        // observada > esperada
  | "falta";       // observada < esperada

export interface LineaInventario {
  id: string;
  inventarioId: string;
  elementoId: string;
  /**
   * `null` significa **no contada**. `0` significa **contada y no había nada**.
   *
   * La distinción es el corazón del módulo: confundirlas hace que un elemento
   * olvidado parezca contado y que el campo «no contados» mienta. Por eso el
   * tipo es `number | null` y no `number` con un centinela.
   */
  cantidadObservada: number | null;
  /**
   * **Foto congelada** al iniciar el inventario (D2), no una consulta viva.
   *
   * `inicial` → `null`: no hay conteo previo que sirva de referencia.
   * `periodico` / `final` → el resultado del **último finalizado de esa misma
   * ubicación**, copiado en el instante de iniciar.
   *
   * Congelada y no viva porque una consulta viva haría que un cambio producido
   * durante el conteo desfigurara la discrepancia: el operador dejaría de
   * reconocer el número que vio y la diferencia no sería auditable.
   */
  cantidadEsperada: number | null;
  condicion: CondicionElemento;
  observacion?: string;
  evidenciaIds: string[];
  contadaEn?: string;
  contadoPorId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCIA — el respaldo
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evidencia — cuelga de la **LÍNEA**, no del elemento (D9).
 *
 * El mismo elemento tiene evidencias distintas en cada inventario: la foto de
 * la caja rota de marzo no describe el conteo de septiembre. Colgarla del
 * elemento convertiría una prueba fechada en una galería sin fecha.
 *
 * `dataUrl` es una imagen embebida. **Sin backend, se pierde al recargar**, y
 * la UI lo dice en texto secundario en vez de fingir persistencia.
 */
export interface Evidencia {
  id: string;
  lineaId: string;
  elementoId: string;
  inventarioId: string;
  nombreArchivo: string;
  dataUrl: string;
  subidaPorId: string;
  subidaEn: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HISTORIAL — qué pasó
// ═══════════════════════════════════════════════════════════════════════════

export type TipoEvento =
  | "inventario_creado"
  | "inventario_iniciado"
  | "linea_agregada"
  | "linea_contada"
  | "linea_editada"
  | "linea_eliminada"
  | "evidencia_adjuntada"
  | "inventario_finalizado"
  | "inventario_anulado";

/**
 * Evento de historial.
 *
 * Guarda el `tipo` y los **datos crudos**; la frase legible se genera en el
 * render con `fraseDeEvento()`, nunca se almacena como texto. Así el historial
 * no puede contener una frase que contradiga su propio dato: si se guardara
 * «Agregó 5 unidades» y la cantidad cambiara, quedaría una mentira con fecha.
 */
export interface EventoHistorial {
  id: string;
  tipo: TipoEvento;
  inventarioId: string;
  elementoId?: string;
  lineaId?: string;
  /** Datos crudos para la frase. Valores simples, nunca objetos anidados. */
  detalle?: Record<string, string | number>;
  actorId: string;
  fecha: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ALERTAS — lo que exige atención
// ═══════════════════════════════════════════════════════════════════════════

export type TipoAlerta = "linea_danada" | "inventario_estancado" | "inventario_pendiente";

export type SeveridadAlerta = "alta" | "media" | "baja";

/**
 * Alerta **derivada**, no almacenada.
 *
 * Las tres que existen se calculan sobre los datos actuales. Las reglas
 * configurables (avisar cuando una ubicación lleve N días sin contarse, o
 * cuando un elemento supere un umbral de faltantes) pertenecen a la versión con
 * servidor: la pantalla lo declara en vez de pintar un motor gris fingiendo que
 * existe.
 */
export interface Alerta {
  id: string;
  tipo: TipoAlerta;
  severidad: SeveridadAlerta;
  titulo: string;
  descripcion: string;
  inventarioId?: string;
  elementoId?: string;
  /** Fecha que sitúa la alerta (última actividad, o el conteo dañado). */
  fechaReferencia: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN — lo que se ajusta UNA VEZ
// ═══════════════════════════════════════════════════════════════════════════

export interface ConfigInventarios {
  /** Unidad preseleccionada al crear un elemento. El usuario puede cambiarla. */
  unidadPorDefecto: UnidadElemento;
  /**
   * **Sugerencias**, no catálogo. Se pintan como chips al crear un elemento;
   * escribir una categoría nueva siempre está permitido.
   */
  categoriasSugeridas: string[];
  /** Días sin actividad tras los cuales un `en_curso` se considera estancado. */
  diasInventarioEstancado: number;
}

export const CONFIG_INVENTARIOS_INICIAL: ConfigInventarios = {
  unidadPorDefecto: "unidad",
  categoriasSugeridas: [],
  diasInventarioEstancado: 7,
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES PURAS — el comportamiento del modelo
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estado derivado de una línea. Es la ÚNICA definición de `EstadoLinea`.
 *
 * Orden de las comprobaciones, que no es intercambiable:
 *   1. `null` primero → una línea sin contar está pendiente aunque el inventario
 *      sea inicial. Si se comprobara `esperada === null` antes, una línea de un
 *      inicial sin contar se leería `sin_esperado`, que describe un hecho
 *      (no hay referencia) distinto de «falta contarla».
 *   2. `esperada === null` → `sin_esperado`, sin comparar nada.
 *   3/4/5. Comparación estricta, con `sobra`/`falta` explícitas.
 */
export function estadoDeLinea(linea: Pick<LineaInventario, "cantidadObservada" | "cantidadEsperada">): EstadoLinea {
  const { cantidadObservada: obs, cantidadEsperada: esp } = linea;
  if (obs === null) return "pendiente";
  if (esp === null) return "sin_esperado";
  if (obs === esp) return "coincide";
  return obs > esp ? "sobra" : "falta";
}

/**
 * Diferencia observado − esperado, o `null` si no es computable.
 *
 * Devuelve `null` cuando falta cualquiera de los dos operandos. **Nunca
 * devuelve `0` por defecto**: un `0` silencioso haría que una línea sin contar
 * se leyera como «cuadra exactamente», que es el peor error posible en un
 * módulo cuyo trabajo es distinguir lo contado de lo no contado.
 */
export function diferenciaDe(
  linea: Pick<LineaInventario, "cantidadObservada" | "cantidadEsperada">,
): number | null {
  if (linea.cantidadObservada === null || linea.cantidadEsperada === null) return null;
  return linea.cantidadObservada - linea.cantidadEsperada;
}

/** Progreso de un inventario: cuántas líneas hay, cuántas se contaron y el %. */
export interface Progreso {
  total: number;
  contadas: number;
  pendientes: number;
  /** Entero 0–100. `0` cuando no hay líneas (no es un error, es un vacío). */
  porcentaje: number;
}

export function progresoDe(lineas: readonly LineaInventario[]): Progreso {
  const total = lineas.length;
  const contadas = lineas.filter((l) => l.cantidadObservada !== null).length;
  const pendientes = total - contadas;
  return {
    total,
    contadas,
    pendientes,
    porcentaje: total === 0 ? 0 : Math.round((contadas / total) * 100),
  };
}

/**
 * ¿Se puede editar este inventario?
 *
 * `finalizado` y `anulado` son **solo lectura, sin excepción** (R7). No hay un
 * parámetro de rol: ni el administrador edita un acto firmado. Es deliberado —
 * «el admin puede todo» convertiría la firma en decoración.
 */
export function inventarioEditable(estado: EstadoInventario): boolean {
  return estado === "borrador" || estado === "en_curso";
}

/** ¿Se puede añadir o quitar líneas? Solo antes de firmar. */
export function inventarioMutable(estado: EstadoInventario): boolean {
  return inventarioEditable(estado);
}

/**
 * Motivo por el que un inventario no se puede editar, listo para el `hint` de
 * la UI. Devuelve `null` cuando sí se puede.
 *
 * Existe para que el texto del bloqueo sea **el mismo** en todas las pantallas:
 * escrito a mano en cada sitio, «Solo lectura» y «Finalizado» empezarían a
 * discrepar sin que nadie lo note.
 */
export function motivoSoloLectura(estado: EstadoInventario): string | null {
  if (estado === "finalizado") return "Inventario finalizado · solo lectura";
  if (estado === "anulado") return "Inventario anulado · solo lectura";
  return null;
}

/**
 * ¿Se puede finalizar? Es la comprobación de R8, en una sola función.
 *
 * `lineasPendientes > 0` bloquea el cierre porque finalizar un conteo a medias
 * produce un acto que **parece** completo y no lo está — el error que el módulo
 * existe para hacer imposible. El motivo lleva el número para que el bloqueo
 * sea accionable («Faltan contar 7 elementos»), no un «no se puede» seco.
 */
export interface ResultadoFinalizacion {
  puede: boolean;
  motivo: string | null;
}

export function puedeFinalizar(
  inventario: Pick<Inventario, "estado">,
  lineas: readonly LineaInventario[],
): ResultadoFinalizacion {
  if (inventario.estado === "finalizado") {
    return { puede: false, motivo: "Este inventario ya está finalizado" };
  }
  if (inventario.estado === "anulado") {
    return { puede: false, motivo: "Un inventario anulado no se finaliza" };
  }
  if (inventario.estado === "borrador") {
    return { puede: false, motivo: "Inicia el inventario antes de finalizarlo" };
  }
  const { pendientes, total } = progresoDe(lineas);
  if (total === 0) {
    return { puede: false, motivo: "No hay elementos que contar" };
  }
  if (pendientes > 0) {
    return {
      puede: false,
      motivo: `Faltan contar ${pendientes} ${pendientes === 1 ? "elemento" : "elementos"}`,
    };
  }
  return { puede: true, motivo: null };
}

/** ¿Este inventario cuenta como «referencia» para un periódico/final futuro? */
export function sirveDeReferencia(inventario: Pick<Inventario, "estado">): boolean {
  return inventario.estado === "finalizado";
}

/**
 * Construye la foto de `cantidadEsperada` al iniciar (D2).
 *
 * Toma el **último finalizado de la misma ubicación** y copia sus cantidades
 * observadas. Las líneas del origen que no estén en el destino, y las del
 * destino que no estén en el origen, se ignoran: la foto cubre la intersección,
 * que es lo único comparable.
 *
 * Devuelve un `Map<elementoId, cantidad>` para que el store lo aplique sin
 * volver a recorrer nada.
 */
export function fotoEsperada(
  origen: readonly LineaInventario[],
): Map<string, number> {
  const foto = new Map<string, number>();
  for (const l of origen) {
    // Una línea sin contar no puede ser referencia: «no sé cuánto había» no es
    // un número que se pueda heredar.
    if (l.cantidadObservada === null) continue;
    foto.set(l.elementoId, l.cantidadObservada);
  }
  return foto;
}

// ── Alertas derivadas ─────────────────────────────────────────────────────

/** Milisegundos de un día. Se usa para medir estancamiento y antigüedad. */
const MS_DIA = 24 * 60 * 60 * 1000;

/** Fecha más reciente entre las dadas (ISO). `null` si no hay ninguna válida. */
export function fechaMasReciente(fechas: readonly (string | undefined)[]): string | null {
  let max: number | null = null;
  let elegida: string | null = null;
  for (const f of fechas) {
    if (!f) continue;
    const t = Date.parse(f);
    if (Number.isNaN(t)) continue;
    if (max === null || t > max) {
      max = t;
      elegida = f;
    }
  }
  return elegida;
}

/**
 * Deriva las alertas que el módulo puede calcular hoy (D11).
 *
 * Tres, y solo tres. Ninguna se almacena. `ahora` entra como parámetro para que
 * la función sea determinista y comprobable sin congelar el reloj del sistema.
 *
 * El **estancamiento** se mide contra la actividad más reciente del inventario
 * (última línea contada, o `iniciadoEn` si no hay ninguna). Sin esa última
 * parte, un inventario iniciado y nunca tocado —el caso que más urge— no
 * generaría alerta, que es justo al revés de lo que se quiere.
 */
export function alertasDe(
  inventarios: readonly Inventario[],
  lineas: readonly LineaInventario[],
  elementos: readonly Elemento[],
  config: Pick<ConfigInventarios, "diasInventarioEstancado">,
  ahora: string,
): Alerta[] {
  const alertas: Alerta[] = [];
  const ahoraMs = Date.parse(ahora);
  const nombreElemento = (id: string) =>
    elementos.find((e) => e.id === id)?.nombre ?? "Elemento desconocido";

  // 1 · Elemento dañado — severidad alta. Es el único hecho irreversible.
  for (const l of lineas) {
    if (l.condicion !== "dañado") continue;
    const inv = inventarios.find((i) => i.id === l.inventarioId);
    alertas.push({
      id: `alerta-danado-${l.id}`,
      tipo: "linea_danada",
      severidad: "alta",
      titulo: `${nombreElemento(l.elementoId)} reportado como dañado`,
      descripcion:
        l.observacion?.trim() ||
        "Se registró daño sin observación. Revisa la línea para añadir el detalle.",
      inventarioId: l.inventarioId,
      elementoId: l.elementoId,
      fechaReferencia: l.contadaEn ?? inv?.iniciadoEn ?? inv?.createdAt ?? ahora,
    });
  }

  // 2 · Inventario estancado — en curso y sin actividad reciente.
  for (const inv of inventarios) {
    if (inv.estado !== "en_curso") continue;
    const suyas = lineas.filter((l) => l.inventarioId === inv.id);
    const ultima = fechaMasReciente([
      ...suyas.map((l) => l.contadaEn),
      inv.iniciadoEn,
    ]);
    if (!ultima) continue;
    const dias = Math.floor((ahoraMs - Date.parse(ultima)) / MS_DIA);
    if (dias < config.diasInventarioEstancado) continue;
    const { pendientes } = progresoDe(suyas);
    alertas.push({
      id: `alerta-estancado-${inv.id}`,
      tipo: "inventario_estancado",
      severidad: "media",
      titulo: `${inv.numero} lleva ${dias} días sin avance`,
      descripcion:
        pendientes > 0
          ? `Quedan ${pendientes} ${pendientes === 1 ? "elemento" : "elementos"} por contar desde el último movimiento.`
          : "No se registró actividad reciente en este conteo.",
      inventarioId: inv.id,
      fechaReferencia: ultima,
    });
  }

  // 3 · Inventario sin iniciar — borrador que ya tiene líneas cargadas.
  for (const inv of inventarios) {
    if (inv.estado !== "borrador" || inv.iniciadoEn) continue;
    const total = lineas.filter((l) => l.inventarioId === inv.id).length;
    if (total === 0) continue;
    alertas.push({
      id: `alerta-pendiente-${inv.id}`,
      tipo: "inventario_pendiente",
      severidad: "baja",
      titulo: `${inv.numero} está listo y sin iniciar`,
      descripcion: `Tiene ${total} ${total === 1 ? "elemento cargado" : "elementos cargados"} esperando a que se inicie el conteo.`,
      inventarioId: inv.id,
      fechaReferencia: inv.createdAt,
    });
  }

  // Orden: severidad primero, y dentro de cada una lo más reciente arriba.
  const peso: Record<SeveridadAlerta, number> = { alta: 0, media: 1, baja: 2 };
  return alertas.sort((a, b) => {
    const s = peso[a.severidad] - peso[b.severidad];
    if (s !== 0) return s;
    return Date.parse(b.fechaReferencia) - Date.parse(a.fechaReferencia);
  });
}

// ── Frases del historial ──────────────────────────────────────────────────

/**
 * Convierte un evento en la frase que se lee en el Historial (D10).
 *
 * Derivada y no almacenada, por la razón del docblock de `EventoHistorial`.
 * Recibe los nombres ya resueltos en vez de los catálogos completos: así esta
 * función no necesita saber qué es un `Elemento`.
 */
export function fraseDeEvento(
  evento: Pick<EventoHistorial, "tipo" | "detalle">,
  nombres: { elemento?: string; inventario?: string } = {},
): string {
  const d = evento.detalle ?? {};
  const elemento = nombres.elemento ?? (typeof d.elemento === "string" ? d.elemento : "el elemento");
  const inventario = nombres.inventario ?? (typeof d.inventario === "string" ? d.inventario : "el inventario");
  const n = (v: string | number | undefined) => (typeof v === "number" ? v : Number(v));

  switch (evento.tipo) {
    case "inventario_creado":
      return `Creó ${inventario} como ${textoTipo(d.tipo)}`;
    case "inventario_iniciado":
      return `Inició ${inventario} y congeló la cantidad esperada de ${n(d.lineas) || 0} ${n(d.lineas) === 1 ? "elemento" : "elementos"}`;
    case "linea_agregada":
      return `Agregó ${elemento} a ${inventario}`;
    case "linea_contada":
      return d.cantidad === null || d.cantidad === undefined
        ? `Marcó ${elemento} como contado`
        : `Contó ${elemento}: ${d.cantidad}`;
    case "linea_editada":
      return `Editó el conteo de ${elemento}`;
    case "linea_eliminada":
      return `Quitó ${elemento} de ${inventario}`;
    case "evidencia_adjuntada":
      return `Adjuntó evidencia a ${elemento}`;
    case "inventario_finalizado":
      return `Finalizó ${inventario} con ${n(d.contadas) || 0} ${n(d.contadas) === 1 ? "elemento contado" : "elementos contados"}`;
    case "inventario_anulado":
      return `Anuló ${inventario}${d.motivo ? `: ${d.motivo}` : ""}`;
    default:
      return "Evento sin descripción";
  }
}

function textoTipo(tipo: string | number | undefined): string {
  if (tipo === "inicial") return "inventario inicial";
  if (tipo === "periodico") return "inventario periódico";
  if (tipo === "final") return "inventario final";
  return "inventario";
}

// ═══════════════════════════════════════════════════════════════════════════
// JERARQUÍA DE UBICACIONES
// ═══════════════════════════════════════════════════════════════════════════

/** Un nodo del árbol, con sus hijos. Lo que consume el componente recursivo. */
export interface NodoUbicacion {
  ubicacion: Ubicacion;
  hijos: NodoUbicacion[];
  /** Profundidad: 0 = cliente, 1 = sede, 2 = ubicación. Igual que el índice del nivel. */
  profundidad: number;
}

/**
 * Construye el árbol Cliente → Sede → Ubicación.
 *
 * **Tolera datos rotos sin lanzar**: un `padreId` que apunta a un id inexistente
 * se trata como raíz, y un ciclo se corta. Un módulo que revienta al pintar el
 * árbol por una fila mal formada es peor que uno que la muestra en el sitio
 * equivocado — pero si además hay `desconectadas` en la salida, el problema se
 * puede ver en vez de esconderse.
 */
export interface ArbolUbicaciones {
  raices: NodoUbicacion[];
  /** Ubicaciones que no colgaron de ninguna raíz. Señal de dato roto o ciclo. */
  desconectadas: Ubicacion[];
  /** Índice id → nodo, para resolver nombres sin recorrer el árbol. */
  porId: Map<string, NodoUbicacion>;
}

export function construirArbol(ubicaciones: readonly Ubicacion[]): ArbolUbicaciones {
  const porId = new Map<string, NodoUbicacion>();
  for (const u of ubicaciones) {
    porId.set(u.id, { ubicacion: u, hijos: [], profundidad: 0 });
  }

  const raices: NodoUbicacion[] = [];
  const desconectadas: Ubicacion[] = [];

  for (const u of ubicaciones) {
    const nodo = porId.get(u.id);
    if (!nodo) continue;

    const padre = u.padreId ? porId.get(u.padreId) : undefined;
    if (!padre || padre === nodo) {
      // Raíz declarada, o padre inexistente / auto-referencia: se trata como raíz.
      nodo.profundidad = 0;
      raices.push(nodo);
      if (u.padreId) desconectadas.push(u);
      continue;
    }
    padre.hijos.push(nodo);
    nodo.profundidad = padre.profundidad + 1;
  }

  // Recorte de ciclos: un nodo alcanzable desde sí mismo se saca del árbol y se
  // declara desconectado. Sin esto, se colgaría del padre y el render recursivo
  // no terminaría nunca.
  for (const u of ubicaciones) {
    let cursor: Ubicacion | undefined = u;
    const vistos = new Set<string>();
    while (cursor?.padreId) {
      if (vistos.has(cursor.id)) {
        const nodo = porId.get(u.id);
        if (nodo) {
          desconectadas.push(u);
          nodo.hijos = [];
          const idx = raices.indexOf(nodo);
          if (idx !== -1) raices.splice(idx, 1);
          for (const [, p] of porId) {
            const i = p.hijos.indexOf(nodo);
            if (i !== -1) p.hijos.splice(i, 1);
          }
        }
        break;
      }
      vistos.add(cursor.id);
      cursor = porId.get(cursor.padreId)?.ubicacion;
    }
  }

  desconectadas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return { raices, desconectadas, porId };
}

/**
 * Camino legible de una ubicación: «Cliente › Sede › Ubicación».
 *
 * Es lo que se pinta fijo en la cabecera del conteo (R3), para que el operador
 * nunca dude de dónde está contando. Se corta a `maxNiveles` para que un dato
 * roto con un ciclo no genere una cadena infinita — devuelve lo recorrido.
 */
export function caminoDeUbicacion(
  ubicacionId: string,
  porId: ReadonlyMap<string, Ubicacion>,
  separador = " › ",
  maxNiveles = ORDEN_NIVELES.length,
): string {
  const partes: string[] = [];
  const vistos = new Set<string>();
  let cursor = porId.get(ubicacionId);
  while (cursor && partes.length < maxNiveles && !vistos.has(cursor.id)) {
    vistos.add(cursor.id);
    partes.unshift(cursor.nombre);
    cursor = cursor.padreId ? porId.get(cursor.padreId) : undefined;
  }
  return partes.join(separador);
}

/** Todos los descendientes de una ubicación (sin incluirla). Para R13. */
export function descendientesDe(
  ubicacionId: string,
  ubicaciones: readonly Ubicacion[],
): Ubicacion[] {
  const salida: Ubicacion[] = [];
  const pendientes = [ubicacionId];
  const vistos = new Set<string>([ubicacionId]);
  while (pendientes.length > 0) {
    const actual = pendientes.pop() as string;
    for (const u of ubicaciones) {
      if (u.padreId !== actual || vistos.has(u.id)) continue;
      vistos.add(u.id);
      salida.push(u);
      pendientes.push(u.id);
    }
  }
  return salida;
}

// ═══════════════════════════════════════════════════════════════════════════
// BÚSQUEDA — el plegado de tildes que exige el caso borde 15
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normaliza texto para buscar: minúsculas, sin diacríticos, sin espacios
 * sobrantes.
 *
 * «cafe» tiene que encontrar «Café». Se usa `normalize("NFD")` + recorte del
 * rango de marcas combinantes, **no** una tabla de reemplazos a mano: la tabla
 * se olvida de la `ñ` o de la `ü` y nadie lo nota hasta que un usuario con ese
 * dato no encuentra nada.
 */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** ¿`consulta` está contenida en alguno de `campos`, ignorando tildes? */
export function coincideBusqueda(consulta: string, ...campos: (string | undefined)[]): boolean {
  const q = normalizarTexto(consulta);
  if (!q) return true;
  return campos.some((c) => c !== undefined && normalizarTexto(c).includes(q));
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDACIONES — reutilizables entre el formulario y el store
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sanea una cantidad capturada.
 *
 * `""` → `null` (sin contar). **No `0`.** Es el punto donde se decide la
 * distinción del módulo, y por eso es una función y no un `Number(x) || 0`
 * repartido por cada `onChange`: `Number("")` es `0`, y ese cero convertiría
 * cada campo vacío en «contado y sin existencia».
 *
 * Un valor no finito o negativo → `null` (fail-closed: se descarta el dato malo
 * en vez de inventar un cero). Los decimales se truncan porque la unidad de
 * conteo es discreta (`step=1`).
 */
export function sanearCantidad(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "string") {
    const limpio = valor.trim();
    if (limpio === "") return null;
    const n = Number(limpio);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.trunc(n);
  }
  if (!Number.isFinite(valor) || valor < 0) return null;
  return Math.trunc(valor);
}

/** ¿El código es válido para R1 (no vacío y sin espacios internos raros)? */
export function codigoValido(codigo: string): boolean {
  return codigo.trim().length > 0;
}

/**
 * Comprueba R11: `condicion === "dañado"` exige observación no vacía **y** al
 * menos una evidencia.
 *
 * Afirmar un daño sin respaldo no sirve de nada: nadie puede actuar sobre «se
 * rompió algo». Es la única condición que exige pruebas; exigirlas siempre
 * haría el conteo inusable y produciría fotos decorativas.
 */
export interface RequisitosCondicion {
  ok: boolean;
  motivo: string | null;
}

export function validarCondicion(
  linea: Pick<LineaInventario, "condicion" | "observacion" | "evidenciaIds">,
): RequisitosCondicion {
  if (linea.condicion !== "dañado") return { ok: true, motivo: null };
  if (!linea.observacion || linea.observacion.trim().length === 0) {
    return { ok: false, motivo: "Describe el daño en la observación" };
  }
  if (linea.evidenciaIds.length === 0) {
    return { ok: false, motivo: "Adjunta al menos una evidencia del daño" };
  }
  return { ok: true, motivo: null };
}

/**
 * Comprueba R14 en el alta de una ubicación: el padre debe existir, ser del
 * nivel inmediatamente superior, y no ser descendiente del nodo que se edita
 * (eso crearía el ciclo que `construirArbol` tiene que rescatar).
 *
 * `ubicacionId` es `undefined` al crear y el id real al editar.
 */
export function validarJerarquia(
  datos: { nivel: NivelUbicacion; padreId: string | null; ubicacionId?: string },
  ubicaciones: readonly Ubicacion[],
): RequisitosCondicion {
  const esperado = nivelPadre(datos.nivel);
  if (esperado === null) {
    if (datos.padreId !== null) {
      return { ok: false, motivo: "Un cliente no cuelga de ninguna ubicación" };
    }
    return { ok: true, motivo: null };
  }
  if (!datos.padreId) {
    return { ok: false, motivo: `Selecciona la ${esperado === "sede" ? "sede" : "ubicación"} a la que pertenece` };
  }
  const padre = ubicaciones.find((u) => u.id === datos.padreId);
  if (!padre) return { ok: false, motivo: "La ubicación superior ya no existe" };
  if (padre.nivel !== esperado) {
    return { ok: false, motivo: "El nivel superior no corresponde" };
  }
  if (datos.ubicacionId) {
    if (padre.id === datos.ubicacionId) {
      return { ok: false, motivo: "Una ubicación no puede depender de sí misma" };
    }
    const descendientes = descendientesDe(datos.ubicacionId, ubicaciones);
    if (descendientes.some((d) => d.id === padre.id)) {
      return { ok: false, motivo: "No puedes mover una ubicación dentro de sí misma" };
    }
  }
  return { ok: true, motivo: null };
}

/**
 * Comprueba R13: una ubicación con hijos o con líneas en inventarios abiertos
 * no se desactiva sin resolverlos.
 *
 * Devuelve el motivo concreto, no un booleano: «no se puede» sin decir qué
 * estorba obliga a investigar.
 */
export function validarBajaUbicacion(
  ubicacionId: string,
  ubicaciones: readonly Ubicacion[],
  inventarios: readonly Inventario[],
): RequisitosCondicion {
  const hijos = ubicaciones.filter((u) => u.padreId === ubicacionId && u.estado === "activo");
  if (hijos.length > 0) {
    return {
      ok: false,
      motivo: `Tiene ${hijos.length} ${hijos.length === 1 ? "ubicación" : "ubicaciones"} dentro. Desactívalas o muévelas primero.`,
    };
  }
  const abiertos = inventarios.filter(
    (i) => i.ubicacionId === ubicacionId && (i.estado === "borrador" || i.estado === "en_curso"),
  );
  if (abiertos.length > 0) {
    return {
      ok: false,
      motivo: `Hay ${abiertos.length} ${abiertos.length === 1 ? "inventario abierto" : "inventarios abiertos"} en esta ubicación.`,
    };
  }
  return { ok: true, motivo: null };
}

/**
 * Comprueba R1: el código de elemento es único por organización, ignorando
 * mayúsculas y tildes (dos códigos que solo difieren en `A-12` / `a-12` son el
 * mismo código para cualquiera que los lea).
 */
export function codigoDuplicado(
  codigo: string,
  elementos: readonly Elemento[],
  exceptoId?: string,
): Elemento | undefined {
  const clave = normalizarTexto(codigo);
  return elementos.find((e) => e.id !== exceptoId && normalizarTexto(e.codigo) === clave);
}

/**
 * Comprueba R2: una línea por elemento por inventario.
 *
 * Devuelve los ids ya presentes, para que la UI pueda pintar «Ya incluido» en
 * el selector en vez de descubrirlo al guardar.
 */
export function elementosYaIncluidos(
  lineas: readonly LineaInventario[],
  inventarioId: string,
): Set<string> {
  const set = new Set<string>();
  for (const l of lineas) {
    if (l.inventarioId === inventarioId) set.add(l.elementoId);
  }
  return set;
}

// ═══════════════════════════════════════════════════════════════════════════
// AGREGADOS — lo que suman las pantallas de Elemento y Reportes
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resumen de un elemento a través de todos los inventarios.
 *
 * `totalObservado` suma los conteos de **todos** los inventarios finalizados del
 * elemento (D1: el mismo elemento en tres sedes son tres inventarios, y «cuánto
 * tengo de X» se responde sumando). Los inventarios abiertos no suman: un
 * conteo a medias no es un total.
 */
export interface ResumenElemento {
  vecesContado: number;
  totalObservado: number;
  ultimaCondicion: CondicionElemento | null;
  ultimaFecha: string | null;
  /** Veces que se observó una cantidad distinta de la esperada. */
  discrepancias: number;
}

export function resumenDeElemento(
  elementoId: string,
  lineas: readonly LineaInventario[],
  inventarios: readonly Inventario[],
): ResumenElemento {
  const porInventario = new Map(inventarios.map((i) => [i.id, i]));
  const suyas = lineas
    .filter((l) => l.elementoId === elementoId)
    .map((l) => ({ linea: l, inventario: porInventario.get(l.inventarioId) }))
    .filter((p) => p.inventario !== undefined);

  const contadas = suyas.filter((p) => p.linea.cantidadObservada !== null);
  const finalizadas = contadas.filter((p) => p.inventario?.estado === "finalizado");

  const conFecha = contadas
    .filter((p) => p.linea.contadaEn)
    .sort((a, b) => Date.parse(b.linea.contadaEn as string) - Date.parse(a.linea.contadaEn as string));

  return {
    vecesContado: contadas.length,
    totalObservado: finalizadas.reduce((acc, p) => acc + (p.linea.cantidadObservada ?? 0), 0),
    ultimaCondicion: conFecha[0]?.linea.condicion ?? null,
    ultimaFecha: conFecha[0]?.linea.contadaEn ?? null,
    discrepancias: contadas.filter((p) => {
      const e = estadoDeLinea(p.linea);
      return e === "sobra" || e === "falta";
    }).length,
  };
}
