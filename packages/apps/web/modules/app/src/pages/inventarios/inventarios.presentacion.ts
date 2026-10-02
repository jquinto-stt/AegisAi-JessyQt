import {
  caminoDeUbicacion,
  codigoDuplicado,
  estadoDeLinea,
  puedeFinalizar,
  validarCondicion,
  validarJerarquia,
  type Alerta,
  type CondicionElemento,
  type Elemento,
  type EstadoLinea,
  type Inventario,
  type LineaInventario,
  type Ubicacion,
  type UnidadElemento,
} from "@/domain/inventarios/inventarios.domain";

// ═══════════════════════════════════════════════════════════════════════════
// PRESENTACIÓN DE INVENTARIOS — formateo y validación de formularios
// ═══════════════════════════════════════════════════════════════════════════
//
// **Nada de React aquí.** Este archivo es lógica que las pantallas necesitan
// antes de pintar: cómo se escribe una fecha, si un formulario se puede enviar y
// qué le falta si no.
//
// ── La regla que lo gobierna ──────────────────────────────────────────────
//
// Una validación de formulario **no reemplaza** la invariante del modelo: la
// repite para poder pintar el error antes de enviar. La fuente sigue siendo
// `validarCondicion` / `validarJerarquia` del dominio, y estas funciones las
// llaman en vez de reimplementarlas. Si mañana cambia el dominio, cambia aquí
// solo; si se escribiera una segunda vez, el formulario dejaría pasar algo que
// el store rechaza y el usuario vería un error que el botón decía que no habría.

// ── Formato de cifras y fechas ────────────────────────────────────────────

/** Entero con separador de miles local. */
export function formatearEntero(n: number): string {
  return Math.round(n).toLocaleString("es-CO");
}

/** Fecha legible corta: `30 sep 2026`. Sin hora, para tablas. */
export function formatearFechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

/** Fecha con hora: `30 sep 2026, 14:32`. Para el detalle y el historial. */
export function formatearFechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Antigüedad relativa: `hoy`, `ayer`, `hace 5 días`, `hace 3 meses`.
 *
 * Se prefiere a una fecha absoluta en las listas donde lo que importa es
 * «¿esto está viejo?» y no «¿qué día exacto fue?». Por debajo de una semana se
 * cuenta en días porque es la unidad con la que se decide si algo urge; a
 * partir de ahí se redondea a semanas, meses o años, donde el día concreto ya
 * no cambia ninguna decisión.
 *
 * `ahora` entra como parámetro para que la salida sea determinista.
 */
export function antiguedad(iso: string | null | undefined, ahora: Date = new Date()): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";

  const dias = Math.floor((ahora.getTime() - t) / 86_400_000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;
  if (dias < 30) {
    const s = Math.floor(dias / 7);
    return `hace ${s} ${s === 1 ? "semana" : "semanas"}`;
  }
  if (dias < 365) {
    const m = Math.floor(dias / 30);
    return `hace ${m} ${m === 1 ? "mes" : "meses"}`;
  }
  const a = Math.floor(dias / 365);
  return `hace ${a} ${a === 1 ? "año" : "años"}`;
}

/**
 * Pie de una alerta: nombra el HECHO fechado que la sostiene.
 *
 * Las alertas son **derivadas**, no registros: `inventariosStore.alertas` se
 * recalcula en cada lectura a partir de conteos, líneas y configuración. Un
 * rótulo «Registrado el …» afirmaba por tanto algo que nunca ocurrió — que
 * alguien guardó una alerta ese día. Lo que sí tiene fecha es el hecho del que
 * la alerta nace, y cada tipo tiene el suyo:
 *
 *   · `linea_danada`          → cuándo se contó la línea y se vio el daño.
 *   · `inventario_pendiente`  → cuándo se creó el conteo que espera inicio.
 *   · `inventario_estancado`  → nada: su propio título ya dice «lleva N días»,
 *     y repetir la fecha del último movimiento al pie es contar lo mismo dos
 *     veces. Devuelve `null` y la tarjeta omite la línea.
 *
 * Devuelve `null` cuando no hay nada honesto que añadir, en vez de una cadena
 * vacía: así quien pinta decide, y no queda una línea en blanco ocupando sitio.
 */
export function pieDeAlerta(
  alerta: Alerta,
  formatear: (iso: string | null | undefined) => string,
): string | null {
  if (!alerta.fechaReferencia) return null;
  switch (alerta.tipo) {
    case "linea_danada":
      return `Daño observado en el conteo del ${formatear(alerta.fechaReferencia)}`;
    case "inventario_pendiente":
      return `Conteo creado el ${formatear(alerta.fechaReferencia)}`;
    case "inventario_estancado":
      return null;
    default:
      return null;
  }
}

/** «5 unidades», «1 grupo». La unidad del elemento en plural cuando toca. */
export function etiquetaCantidad(cantidad: number, unidad: UnidadElemento): string {
  if (unidad === "grupo") return cantidad === 1 ? "1 grupo" : `${cantidad} grupos`;
  return cantidad === 1 ? "1 unidad" : `${cantidad} unidades`;
}

/** Iniciales para el avatar del actor (`Andrés Restrepo` → `AR`). */
export function inicialesDe(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "—";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

// ── Camino de la ubicación, resuelto contra el store ──────────────────────

/**
 * «Carolina Zapata › Sede Norte › Almacén 1».
 *
 * Se resuelve contra el índice `porId` que ya tiene el store en vez de recorrer
 * el array de ubicaciones por id: es un `Map`, así que resolver cien filas de
 * una tabla es cien `get`, no cien `.find()` sobre la colección entera.
 */
export function caminoDe(
  ubicacionId: string | null | undefined,
  porId: ReadonlyMap<string, Ubicacion>,
): string {
  if (!ubicacionId) return "Sin ubicación";
  const camino = caminoDeUbicacion(ubicacionId, porId);
  return camino || "Ubicación desconocida";
}

// ── Resultado de validación de formulario ─────────────────────────────────

/**
 * Resultado de validar un formulario antes de enviarlo.
 *
 * `errores` va por campo y no como una lista suelta: el formulario necesita
 * saber **dónde** pintar el borde rojo. Una lista de mensajes obligaría a
 * adivinar a qué campo corresponde cada uno.
 */
export interface ValidacionFormulario {
  ok: boolean;
  /** Mensaje por nombre de campo. Vacío cuando `ok`. */
  errores: Record<string, string>;
}

const OK: ValidacionFormulario = { ok: false, errores: {} };

function valido(errores: Record<string, string>): ValidacionFormulario {
  return { ok: Object.keys(errores).length === 0, errores };
}

// ── Validación: crear/editar elemento ─────────────────────────────────────

export interface BorradorElemento {
  codigo: string;
  nombre: string;
  categoria: string;
  unidad: UnidadElemento;
  descripcion?: string;
}

/**
 * Valida el alta de un elemento.
 *
 * R1 (código único) se comprueba aquí **y** en el store. Aquí es lo que permite
 * decir «Ya existe un elemento con este código: Silla ergonómica» mientras se
 * escribe; en el store es lo que impide que dos pestañas abiertas lo dupliquen.
 * La comprobación de UI es una comodidad, no la garantía.
 */
export function validarElemento(
  borrador: BorradorElemento,
  elementos: readonly Elemento[],
  exceptoId?: string,
): ValidacionFormulario {
  const errores: Record<string, string> = {};

  const codigo = borrador.codigo.trim();
  const nombre = borrador.nombre.trim();
  const categoria = borrador.categoria.trim();

  if (!codigo) errores.codigo = "El código es obligatorio";
  else if (codigo.length > 40) errores.codigo = "Máximo 40 caracteres";
  else {
    const dup = codigoDuplicado(codigo, elementos, exceptoId);
    if (dup) errores.codigo = `Ya existe un elemento con este código: ${dup.nombre}`;
  }

  if (!nombre) errores.nombre = "El nombre es obligatorio";
  else if (nombre.length > 80) errores.nombre = "Máximo 80 caracteres";

  if (!categoria) errores.categoria = "La categoría es obligatoria";

  if (borrador.descripcion && borrador.descripcion.length > 400) {
    errores.descripcion = "Máximo 400 caracteres";
  }

  return valido(errores);
}

// ── Validación: crear/editar ubicación ────────────────────────────────────

export interface BorradorUbicacion {
  nombre: string;
  nivel: Ubicacion["nivel"];
  padreId: string | null;
  ubicacionId?: string;
}

/**
 * Valida el alta de una ubicación. Delega la jerarquía en `validarJerarquia`
 * (R14) para que el formulario y el modelo no puedan discrepar sobre qué padre
 * es legal.
 */
export function validarUbicacion(
  borrador: BorradorUbicacion,
  ubicaciones: readonly Ubicacion[],
): ValidacionFormulario {
  const errores: Record<string, string> = {};

  const nombre = borrador.nombre.trim();
  if (!nombre) errores.nombre = "El nombre es obligatorio";
  else if (nombre.length > 60) errores.nombre = "Máximo 60 caracteres";

  const jerarquia = validarJerarquia(
    { nivel: borrador.nivel, padreId: borrador.padreId, ubicacionId: borrador.ubicacionId },
    ubicaciones,
  );
  if (!jerarquia.ok) errores.padreId = jerarquia.motivo ?? "El nivel superior no es válido";

  return valido(errores);
}

// ── Validación: crear inventario ──────────────────────────────────────────

export interface BorradorInventario {
  nombre: string;
  tipo: Inventario["tipo"];
  ubicacionId: string;
  responsableId: string;
}

/** Valida la creación de un inventario. Todos los campos son obligatorios. */
export function validarInventario(
  borrador: BorradorInventario,
  ubicaciones: readonly Ubicacion[],
): ValidacionFormulario {
  const errores: Record<string, string> = {};

  const nombre = borrador.nombre.trim();
  if (!nombre) errores.nombre = "Ponle un nombre al conteo";
  else if (nombre.length > 80) errores.nombre = "Máximo 80 caracteres";

  if (!borrador.ubicacionId) {
    errores.ubicacionId = "Elige dónde se va a contar";
  } else {
    const u = ubicaciones.find((x) => x.id === borrador.ubicacionId);
    if (!u) errores.ubicacionId = "La ubicación ya no existe";
    // R3: solo se cuenta en el nivel hoja. Una sede no es un espacio físico.
    else if (u.nivel !== "ubicacion") errores.ubicacionId = "Debes elegir una ubicación, no una sede";
    else if (u.estado !== "activo") errores.ubicacionId = "Esa ubicación está inactiva";
  }

  if (!borrador.responsableId) errores.responsableId = "Asigna un responsable";

  return valido(errores);
}

// ── Validación: contar una línea ──────────────────────────────────────────

export interface BorradorConteo {
  cantidadObservada: number | null;
  condicion: CondicionElemento;
  observacion?: string;
  evidenciaIds: readonly string[];
}

/**
 * Valida el registro de un conteo.
 *
 * R11 —«dañado» exige observación y evidencia— la decide `validarCondicion` del
 * dominio. Aquí solo se le pasan los datos con el `observacion` ya recortado,
 * porque un `"   "` no es una observación y el dominio, con razón, no se
 * encarga de recortar.
 */
export function validarConteo(borrador: BorradorConteo): ValidacionFormulario {
  const errores: Record<string, string> = {};
  const observacion = borrador.observacion?.trim() || undefined;

  const req = validarCondicion({
    condicion: borrador.condicion,
    observacion,
    evidenciaIds: [...borrador.evidenciaIds],
  });

  if (!req.ok) {
    // El motivo del dominio se dirige al campo que falta según su texto; se
    // prefiere eso a devolver un error global que el usuario no sabe dónde
    // mirar. `validarCondicion` solo tiene dos motivos posibles, así que el
    // reparto no es una heurística frágil.
    const campo = req.motivo?.toLowerCase().includes("evidencia") ? "evidenciaIds" : "observacion";
    errores[campo] = req.motivo ?? "La condición no es válida";
  }

  if (borrador.observacion && borrador.observacion.length > 400) {
    errores.observacion = "Máximo 400 caracteres";
  }

  return valido(errores);
}

// ── Filtros de la tabla de líneas ─────────────────────────────────────────

/** Sentinelas de filtro. Coinciden con las de `inventarios.constants`. */
export const FILTRO_TODOS = "__todos__";

export type FiltroEstadoLinea = EstadoLinea | typeof FILTRO_TODOS;

/**
 * Filtra líneas por estado derivado y por texto libre.
 *
 * El estado se **deriva** aquí con `estadoDeLinea` en vez de recibirlo: si la
 * tabla pasara el estado ya calculado desde fuera, existirían dos formas de
 * decidir si una línea «falta» y el filtro podría enseñar filas que el badge de
 * la misma fila contradice.
 */
export function filtrarLineas(
  lineas: readonly LineaInventario[],
  opciones: {
    filtroEstado?: FiltroEstadoLinea;
    consulta?: string;
    nombreDeElemento?: (elementoId: string) => string;
    codigoDeElemento?: (elementoId: string) => string;
  } = {},
): LineaInventario[] {
  const { filtroEstado = FILTRO_TODOS, consulta = "", nombreDeElemento, codigoDeElemento } = opciones;
  const q = consulta.trim();

  return lineas.filter((l) => {
    if (filtroEstado !== FILTRO_TODOS && estadoDeLinea(l) !== filtroEstado) return false;
    if (!q) return true;
    const nombre = nombreDeElemento?.(l.elementoId) ?? "";
    // El CÓDIGO entra en la búsqueda. Antes solo se miraban nombre y observación,
    // así que teclear «ACT-6001» —lo que se lee en la etiqueta del estante y lo
    // que la gente escribe en una bodega— no encontraba nada aunque la línea
    // estuviera ahí. Un buscador que ignora el identificador principal es peor
    // que no tenerlo: hace creer que el elemento no está en el conteo.
    const codigo = codigoDeElemento?.(l.elementoId) ?? "";
    return buscarCoincidencia(q, l.observacion, nombre, codigo);
  });
}

/**
 * Búsqueda con plegado de tildes, contra los campos que se le pasen.
 *
 * Envuelve la comparación para no obligar a cada pantalla a saber que existe
 * `normalizarTexto`. La implementación real es la del dominio: aquí solo se
 * evita que alguien escriba un `.includes()` sin normalizar y rompa el caso
 * «cafe» → «Café» en una pantalla y no en las demás.
 */
export function buscarCoincidencia(consulta: string, ...campos: (string | undefined)[]): boolean {
  const q = normalizarLocal(consulta);
  if (!q) return true;
  return campos.some((c) => c !== undefined && normalizarLocal(c).includes(q));
}

function normalizarLocal(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// ── Resumen de finalización, listo para pintar ────────────────────────────

export interface EstadoFinalizacionUI {
  /** El botón «Finalizar» se puede pulsar (y el usuario tiene la capacidad). */
  habilitado: boolean;
  /** Motivo del bloqueo, siempre presente cuando `!habilitado`. */
  motivo: string;
}

/**
 * Estado del botón «Finalizar conteo», con el motivo ya redactado.
 *
 * Combina las dos preguntas que lo gobiernan y que **no** son la misma:
 *
 *   · ¿El usuario puede firmar? → capacidad `inventory.finalize`.
 *   · ¿El inventario es finalizable? → R8, líneas sin contar bloquean.
 *
 * Se separan porque los motivos son distintos y el usuario merece saber cuál de
 * los dos le está frenando: «no tienes permiso» y «faltan 7 por contar» exigen
 * acciones opuestas — pedir acceso a alguien, o ir a contar—. Un solo «no se
 * puede» obligaría a adivinar.
 */
export function estadoBotonFinalizar(
  inventario: Pick<Inventario, "estado">,
  lineas: readonly LineaInventario[],
  puedeFirmar: boolean,
): EstadoFinalizacionUI {
  const r = puedeFinalizar(inventario, lineas);
  if (r.puede && !puedeFirmar) {
    return { habilitado: false, motivo: "Requiere el permiso «Finalizar inventarios»." };
  }
  return { habilitado: r.puede, motivo: r.motivo ?? "" };
}

// ── Métricas de una lista de inventarios ──────────────────────────────────

/**
 * Cuenta de inventarios por estado, para los segmentos de filtro.
 *
 * Se calcula sobre la lista que se filtra, no sobre el total del módulo: un
 * segmento que dijera «En curso (3)» y al pulsarlo enseñara 1 fila porque hay
 * otro filtro activo es el tipo de contador que hace desconfiar de toda la
 * pantalla.
 */
export function conteoPorEstado(inventarios: readonly Inventario[]): Record<string, number> {
  const acc: Record<string, number> = { borrador: 0, en_curso: 0, finalizado: 0, anulado: 0 };
  for (const i of inventarios) acc[i.estado] = (acc[i.estado] ?? 0) + 1;
  return acc;
}
