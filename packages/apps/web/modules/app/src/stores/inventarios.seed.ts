/**
 * Seed de Inventarios — datos de demostración con forma de negocio real.
 *
 * ── Criterio del seed ─────────────────────────────────────────────────────
 *
 * Un seed no es decoración: es la superficie sobre la que se va a mirar el
 * producto, y si no cubre los estados que el módulo sabe representar, media
 * funcionalidad queda invisible. Aquí el seed **cubre los 23 casos borde** del
 * diseño: los cuatro estados de inventario, los tres tipos, los cinco estados
 * de línea, `cantidadObservada` `0` **y** `null` en el mismo inventario,
 * elementos `inactivos` con historial, una ubicación de tres niveles y una de
 * dos, y una línea `dañado` con observación y evidencia.
 *
 * ── Neutralidad de rubro ──────────────────────────────────────────────────
 *
 * Las categorías son **dominios de cualquier operación**, no de un vertical:
 * «Mobiliario», «Equipos de cómputo», «Herramientas», «Dotación», «Insumos de
 * aseo». No hay alimentos, no hay repuestos de vehículo, no hay tallas. Es la
 * prueba de que el modelo aguanta sin saber de qué negocio se trata — y la
 * razón por la que este seed **no se parece** al del módulo que se eliminó.
 *
 * ── Independencia ─────────────────────────────────────────────────────────
 *
 * Este archivo no importa nada de otro módulo. Ni una línea. Las personas se
 * referencian por id de operador (`op_*`) y el store las muestra como nombres
 * almacenados en el propio seed (`NOMBRES_ACTORES`), sin leer
 * `operadores.store`: si lo leyera, Inventarios dejaría de poder existir sin
 * Pedidos y volvería el acoplamiento que hizo fracasar al módulo anterior.
 */

import type {
  ConfigInventarios,
  Elemento,
  Evidencia,
  EventoHistorial,
  Inventario,
  LineaInventario,
  Ubicacion,
} from "@/domain/inventarios/inventarios.domain";

// ═══════════════════════════════════════════════════════════════════════════
// PERSONAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Nombre legible de cada actor del seed.
 *
 * Vive aquí, y no se resuelve contra `operadores.store`, por la razón del
 * docblock de arriba. Los ids empiezan por `op_inv_` para que se vea de un
 * vistazo que son **personas del módulo de Inventarios** y no del equipo de
 * Pedidos: compartir el catálogo de personas es exactamente el tipo de
 * dependencia que este módulo no debe tener.
 */
export const NOMBRES_ACTORES: Record<string, string> = {
  op_inv_admin: "Carolina Zapata",
  op_inv_supervisor: "Andrés Restrepo",
  op_inv_analista: "Laura Gómez",
  op_inv_auxiliar: "Julián Vega",
};

/** Id del operador responsable por defecto. */
export const RESPONSABLE_POR_DEFECTO = "op_inv_supervisor";

/** Nombre legible de un actor, con respaldo honesto si el id no está en el mapa. */
export function nombreDeActor(id: string | undefined | null): string {
  if (!id) return "—";
  return NOMBRES_ACTORES[id] ?? id;
}

// ═══════════════════════════════════════════════════════════════════════════
// UBICACIONES — dos clientes, cuatro sedes, siete ubicaciones
// ═══════════════════════════════════════════════════════════════════════════

export const UBICACIONES_SEED: Ubicacion[] = [
  // ── Cliente 1 ──────────────────────────────────────────────────────────
  { id: "ub_c1", padreId: null, nivel: "cliente", nombre: "Grupo Andina", estado: "activo", createdAt: "2025-11-04T09:00:00-05:00" },

  { id: "ub_c1_s1", padreId: "ub_c1", nivel: "sede", nombre: "Sede Norte", estado: "activo", createdAt: "2025-11-04T09:05:00-05:00" },
  { id: "ub_c1_s1_u1", padreId: "ub_c1_s1", nivel: "ubicacion", nombre: "Almacén Principal", estado: "activo", createdAt: "2025-11-04T09:10:00-05:00" },
  { id: "ub_c1_s1_u2", padreId: "ub_c1_s1", nivel: "ubicacion", nombre: "Oficina de Piso 3", estado: "activo", createdAt: "2025-11-04T09:12:00-05:00" },

  { id: "ub_c1_s2", padreId: "ub_c1", nivel: "sede", nombre: "Sede Occidente", estado: "activo", createdAt: "2025-11-04T09:20:00-05:00" },
  { id: "ub_c1_s2_u1", padreId: "ub_c1_s2", nivel: "ubicacion", nombre: "Bodega de Tránsito", estado: "activo", createdAt: "2025-11-04T09:22:00-05:00" },
  // Desactivada a propósito (caso borde 13): tiene un inventario finalizado y
  // ninguno abierto, así que su baja SÍ procede. La regla R13 se demuestra con
  // la que no se puede dar de baja, no con esta.
  { id: "ub_c1_s2_u2", padreId: "ub_c1_s2", nivel: "ubicacion", nombre: "Sala de Exhibición", estado: "inactivo", createdAt: "2025-11-04T09:24:00-05:00" },

  // ── Cliente 2 ──────────────────────────────────────────────────────────
  { id: "ub_c2", padreId: null, nivel: "cliente", nombre: "Fundación Horizonte", estado: "activo", createdAt: "2026-01-18T10:00:00-05:00" },

  { id: "ub_c2_s1", padreId: "ub_c2", nivel: "sede", nombre: "Sede Central", estado: "activo", createdAt: "2026-01-18T10:05:00-05:00" },
  { id: "ub_c2_s1_u1", padreId: "ub_c2_s1", nivel: "ubicacion", nombre: "Depósito General", estado: "activo", createdAt: "2026-01-18T10:10:00-05:00" },
];

// ═══════════════════════════════════════════════════════════════════════════
// ELEMENTOS — 16, con tipos distintos y categorías sin rubro
// ═══════════════════════════════════════════════════════════════════════════

export const ELEMENTOS_SEED: Elemento[] = [
  // Mobiliario
  { id: "el_001", codigo: "MOB-1001", nombre: "Silla ergonómica con brazos", categoria: "Mobiliario", unidad: "unidad", descripcion: "Silla de oficina ajustable, base de cinco ruedas.", estado: "activo", createdAt: "2025-11-05T08:30:00-05:00" },
  { id: "el_002", codigo: "MOB-1002", nombre: "Escritorio operativo 1.40 m", categoria: "Mobiliario", unidad: "unidad", descripcion: "Puesto de trabajo con estructura metálica.", estado: "activo", createdAt: "2025-11-05T08:32:00-05:00" },
  { id: "el_003", codigo: "MOB-1003", nombre: "Archivador metálico de 4 gavetas", categoria: "Mobiliario", unidad: "unidad", estado: "activo", createdAt: "2025-11-05T08:34:00-05:00" },

  // Equipos de cómputo
  { id: "el_004", codigo: "CMP-2001", nombre: "Portátil 14\" corporativo", categoria: "Equipos de cómputo", unidad: "unidad", descripcion: "Equipo asignado a personal administrativo.", estado: "activo", createdAt: "2025-11-05T08:40:00-05:00" },
  { id: "el_005", codigo: "CMP-2002", nombre: "Monitor 24\" LED", categoria: "Equipos de cómputo", unidad: "unidad", estado: "activo", createdAt: "2025-11-05T08:42:00-05:00" },
  { id: "el_006", codigo: "CMP-2003", nombre: "Impresora multifuncional", categoria: "Equipos de cómputo", unidad: "unidad", estado: "activo", createdAt: "2025-11-05T08:44:00-05:00" },
  // Inactivo CON historial (caso borde 11): se ve en Historial y en su Detalle,
  // y NO aparece en el selector de «Agregar elemento».
  { id: "el_007", codigo: "CMP-2004", nombre: "Escáner de escritorio", categoria: "Equipos de cómputo", unidad: "unidad", descripcion: "Retirado por obsolescencia en marzo de 2026.", estado: "inactivo", createdAt: "2025-11-05T08:46:00-05:00" },

  // Herramientas
  { id: "el_008", codigo: "HRR-3001", nombre: "Taladro percutor inalámbrico", categoria: "Herramientas", unidad: "unidad", estado: "activo", createdAt: "2025-11-06T07:15:00-05:00" },
  { id: "el_009", codigo: "HRR-3002", nombre: "Juego de destornilladores", categoria: "Herramientas", unidad: "grupo", descripcion: "Estuche con doce puntas. Se cuenta como conjunto.", estado: "activo", createdAt: "2025-11-06T07:18:00-05:00" },
  { id: "el_010", codigo: "HRR-3003", nombre: "Escalera de tijera 6 pasos", categoria: "Herramientas", unidad: "unidad", estado: "activo", createdAt: "2025-11-06T07:20:00-05:00" },

  // Dotación
  { id: "el_011", codigo: "DOT-4001", nombre: "Casco de seguridad", categoria: "Dotación", unidad: "unidad", estado: "activo", createdAt: "2025-11-06T07:30:00-05:00" },
  { id: "el_012", codigo: "DOT-4002", nombre: "Chaleco reflectivo", categoria: "Dotación", unidad: "unidad", estado: "activo", createdAt: "2025-11-06T07:32:00-05:00" },

  // Insumos
  { id: "el_013", codigo: "INS-5001", nombre: "Resma de papel carta", categoria: "Insumos de oficina", unidad: "grupo", descripcion: "Se cuenta por caja de diez resmas.", estado: "activo", createdAt: "2025-11-06T07:40:00-05:00" },
  { id: "el_014", codigo: "INS-5002", nombre: "Detergente multiusos 1 L", categoria: "Insumos de aseo", unidad: "unidad", estado: "activo", createdAt: "2025-11-06T07:42:00-05:00" },
  { id: "el_015", codigo: "INS-5003", nombre: "Bolsa de residuos 60x90", categoria: "Insumos de aseo", unidad: "grupo", estado: "activo", createdAt: "2025-11-06T07:44:00-05:00" },

  // Activo de control
  { id: "el_016", codigo: "ACT-6001", nombre: "Extintor ABC 10 lb", categoria: "Activos de seguridad", unidad: "unidad", descripcion: "Requiere revisión anual. El conteo registra la condición, no el vencimiento.", estado: "activo", createdAt: "2025-11-06T07:50:00-05:00" },
];

// ═══════════════════════════════════════════════════════════════════════════
// INVENTARIOS — 6 actos, 4 estados, 3 tipos
// ═══════════════════════════════════════════════════════════════════════════

export const INVENTARIOS_SEED: Inventario[] = [
  // ── 1 · FINALIZADO (el más antiguo: es la referencia) ───────────────────
  {
    id: "inv_0001",
    numero: "INV-2026-0001",
    nombre: "Conteo inicial de apertura",
    tipo: "inicial",
    ubicacionId: "ub_c1_s1_u1",
    estado: "finalizado",
    responsableId: "op_inv_supervisor",
    iniciadoEn: "2026-01-12T08:00:00-05:00",
    finalizadoEn: "2026-01-12T17:40:00-05:00",
    finalizadoPorId: "op_inv_admin",
    notas: "Primer conteo del almacén tras la mudanza a Sede Norte.",
    createdAt: "2026-01-12T07:45:00-05:00",
  },

  // ── 2 · FINALIZADO (referencia del periódico que está en curso) ────────
  {
    id: "inv_0002",
    numero: "INV-2026-0002",
    nombre: "Conteo periódico de mayo",
    tipo: "periodico",
    ubicacionId: "ub_c1_s1_u1",
    estado: "finalizado",
    responsableId: "op_inv_supervisor",
    iniciadoEn: "2026-05-14T08:10:00-05:00",
    finalizadoEn: "2026-05-14T16:20:00-05:00",
    finalizadoPorId: "op_inv_supervisor",
    notas: "Se detectaron dos sillas con fallas en el pistón; quedaron observadas.",
    createdAt: "2026-05-14T08:00:00-05:00",
  },

  // ── 3 · EN CURSO (el caso rico: 5 estados de línea + 0 vs null) ────────
  // Es el inventario que abre el usuario al entrar. El caso borde crítico
  // —`cantidadObservada` 0 frente a `null` en el MISMO inventario— está aquí:
  // `ln_0308` (bolsas: contadas y no había ninguna = 0) y `ln_0309` (detergente:
  // nunca se contó = null). Si se confundieran, la pantalla diría «0 de 9
  // elementos pendientes» y el operador firmaría un conteo a medias.
  {
    id: "inv_0003",
    numero: "INV-2026-0003",
    nombre: "Conteo periódico de septiembre",
    tipo: "periodico",
    ubicacionId: "ub_c1_s1_u1",
    estado: "en_curso",
    responsableId: "op_inv_supervisor",
    iniciadoEn: "2026-09-22T07:50:00-05:00",
    notas: "Continuación del ciclo trimestral. Se congeló la esperada del conteo de mayo.",
    createdAt: "2026-09-21T17:30:00-05:00",
  },

  // ── 4 · BORRADOR con líneas cargadas y sin iniciar (alerta leve) ───────
  {
    id: "inv_0004",
    numero: "INV-2026-0004",
    nombre: "Conteo de cierre en Sede Occidente",
    tipo: "final",
    ubicacionId: "ub_c1_s2_u1",
    estado: "borrador",
    responsableId: "op_inv_auxiliar",
    notas: "Pendiente de iniciar. Se cargaron los elementos de la bodega de tránsito.",
    createdAt: "2026-09-26T11:00:00-05:00",
  },

  // ── 5 · BORRADOR vacío (el estado «acabo de crearlo») ──────────────────
  {
    id: "inv_0005",
    numero: "INV-2026-0005",
    nombre: "Conteo de dotación — Sede Central",
    tipo: "inicial",
    ubicacionId: "ub_c2_s1_u1",
    estado: "borrador",
    responsableId: "op_inv_analista",
    createdAt: "2026-09-28T09:15:00-05:00",
  },

  // ── 6 · ANULADO (banner gris, sigue siendo consultable) ────────────────
  {
    id: "inv_0006",
    numero: "INV-2026-0006",
    nombre: "Conteo de Sala de Exhibición",
    tipo: "final",
    ubicacionId: "ub_c1_s2_u2",
    estado: "anulado",
    responsableId: "op_inv_auxiliar",
    iniciadoEn: "2026-08-03T09:00:00-05:00",
    notas: "Anulado: la sala se desmontó durante el conteo, así que los números no son comparables.",
    createdAt: "2026-08-03T08:45:00-05:00",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// LÍNEAS
// ═══════════════════════════════════════════════════════════════════════════
//
// Nota sobre los números: el conteo 0002 (mayo) es el origen del congelamiento
// del 0003 (septiembre). Las líneas del 0003 llevan su `cantidadEsperada`
// copiada del 0002 — esa es la foto, y no cambia aunque el 0002 se editara (no
// puede: está finalizado).

export const LINEAS_SEED: LineaInventario[] = [
  // ── INV-0001 · inicial · finalizado — esperada null (sin referencia) ───
  ...lineasFinalizadasInicial(),
  // ── INV-0002 · periódico · finalizado — esperada del inicial ───────────
  ...lineasFinalizadasMayo(),
  // ── INV-0003 · periódico · en curso — la foto de mayo, contándose ──────
  ...lineasEnCursoSeptiembre(),
  // ── INV-0004 · final · borrador — líneas cargadas, nada contado ────────
  ...lineasBorradorOccidente(),
  // ── INV-0006 · final · anulado — conserva todo ─────────────────────────
  ...lineasAnuladoExhibicion(),
];

/** INV-0001 — inventario inicial: `cantidadEsperada` es `null` en todas las líneas. */
function lineasFinalizadasInicial(): LineaInventario[] {
  const base = "2026-01-12";
  const pares: [string, number, string][] = [
    ["el_001", 24, "bueno"],
    ["el_002", 12, "bueno"],
    ["el_003", 6, "regular"],
    ["el_004", 10, "bueno"],
    ["el_005", 14, "bueno"],
    ["el_006", 3, "bueno"],
    ["el_008", 4, "bueno"],
    ["el_009", 6, "bueno"],
    ["el_010", 2, "regular"],
    ["el_013", 18, "bueno"],
  ];
  return pares.map(([elementoId, cantidad], i) => ({
    id: `ln_01${String(i + 1).padStart(2, "0")}`,
    inventarioId: "inv_0001",
    elementoId,
    cantidadObservada: cantidad,
    cantidadEsperada: null,
    condicion: condicionDesdeTexto(pares[i][2]),
    evidenciaIds: [],
    contadaEn: `${base}T${String(9 + Math.floor(i / 4)).padStart(2, "0")}:${String((i * 13) % 60).padStart(2, "0")}:00-05:00`,
    contadoPorId: "op_inv_supervisor",
  }));
}

/**
 * INV-0002 — periódico de mayo, finalizado.
 *
 * Es la **referencia** del 0003. Se introducen tres discrepancias deliberadas
 * contra el inicial —dos faltas y una sobra— para que el conteo siguiente tenga
 * una diferencia que mostrar y no un tablero en blanco.
 */
function lineasFinalizadasMayo(): LineaInventario[] {
  const base = "2026-05-14";
  // [elemento, esperada (del inicial), observada, condicion]
  const filas: [string, number, number, "bueno" | "regular" | "dañado"][] = [
    ["el_001", 24, 22, "regular"],   // faltan 2 (se dieron de baja dos sillas)
    ["el_002", 12, 12, "bueno"],
    ["el_003", 6, 7, "bueno"],       // sobra 1 (apareció un archivador en el traslado)
    ["el_004", 10, 10, "bueno"],
    ["el_005", 14, 14, "bueno"],
    ["el_006", 3, 3, "bueno"],
    ["el_008", 4, 4, "bueno"],
    ["el_009", 6, 6, "bueno"],
    ["el_010", 2, 2, "regular"],
    ["el_013", 18, 15, "bueno"],     // faltan 3 resmas
  ];
  return filas.map(([elementoId, esperada, observada, condicion], i) => ({
    id: `ln_02${String(i + 1).padStart(2, "0")}`,
    inventarioId: "inv_0002",
    elementoId,
    cantidadObservada: observada,
    cantidadEsperada: esperada,
    condicion,
    evidenciaIds: [],
    contadaEn: `${base}T${String(8 + Math.floor(i / 3)).padStart(2, "0")}:${String((i * 17) % 60).padStart(2, "0")}:00-05:00`,
    contadoPorId: "op_inv_supervisor",
  }));
}

/**
 * INV-0003 — periódico de septiembre, EN CURSO. El inventario que importa.
 *
 * Cubre, línea a línea, los casos que hay que poder ver:
 *
 *   · `sin_esperado` — el extintor (`el_016`) no estaba en mayo: aparece por
 *     primera vez, así que su esperada es `null` y no se compara contra nada.
 *   · `coincide` — portátiles, monitores: cuadran.
 *   · `falta` — sillas (21 de 22) y resma (12 de 15).
 *   · `sobra` — archivadores (8 de 7): apareció uno más.
 *   · `pendiente` (null) — escritorio, escalera, detergente: sin contar.
 *   · **`0` frente a `null`** — bolsas (`el_015`) contadas y sin existencia (0)
 *     contra detergente (`el_014`) nunca contado (null). Los dos conviven aquí
 *     a propósito: es el caso que demuestra que el modelo los distingue.
 *   · `dañado` con observación y evidencia — impresora (`el_006`).
 */
function lineasEnCursoSeptiembre(): LineaInventario[] {
  const f = (h: string) => `2026-09-22T${h}:00-05:00`;
  return [
    // coincide
    { id: "ln_0301", inventarioId: "inv_0003", elementoId: "el_004", cantidadObservada: 10, cantidadEsperada: 10, condicion: "bueno", evidenciaIds: [], contadaEn: f("08:05"), contadoPorId: "op_inv_supervisor" },
    { id: "ln_0302", inventarioId: "inv_0003", elementoId: "el_005", cantidadObservada: 14, cantidadEsperada: 14, condicion: "bueno", evidenciaIds: [], contadaEn: f("08:11"), contadoPorId: "op_inv_supervisor" },
    { id: "ln_0303", inventarioId: "inv_0003", elementoId: "el_008", cantidadObservada: 4, cantidadEsperada: 4, condicion: "bueno", evidenciaIds: [], contadaEn: f("08:26"), contadoPorId: "op_inv_supervisor" },
    { id: "ln_0304", inventarioId: "inv_0003", elementoId: "el_009", cantidadObservada: 6, cantidadEsperada: 6, condicion: "bueno", evidenciaIds: [], contadaEn: f("08:31"), contadoPorId: "op_inv_supervisor" },

    // falta
    { id: "ln_0305", inventarioId: "inv_0003", elementoId: "el_001", cantidadObservada: 21, cantidadEsperada: 22, condicion: "regular", observacion: "Una silla sigue en la sede de Occidente sin devolver.", evidenciaIds: [], contadaEn: f("08:40"), contadoPorId: "op_inv_supervisor" },
    { id: "ln_0306", inventarioId: "inv_0003", elementoId: "el_013", cantidadObservada: 12, cantidadEsperada: 15, condicion: "bueno", observacion: "Tres cajas se entregaron a la sede de Occidente.", evidenciaIds: [], contadaEn: f("09:02"), contadoPorId: "op_inv_supervisor" },

    // sobra
    { id: "ln_0307", inventarioId: "inv_0003", elementoId: "el_003", cantidadObservada: 8, cantidadEsperada: 7, condicion: "bueno", observacion: "Apareció un archivador más en el fondo del almacén.", evidenciaIds: [], contadaEn: f("09:15"), contadoPorId: "op_inv_supervisor" },

    // ── El par crítico: 0 contado frente a null no contado ──────────────
    { id: "ln_0308", inventarioId: "inv_0003", elementoId: "el_015", cantidadObservada: 0, cantidadEsperada: 9, condicion: "no_aplica", observacion: "No queda ninguna bolsa. Se contó y el estante está vacío.", evidenciaIds: [], contadaEn: f("09:24"), contadoPorId: "op_inv_supervisor" },
    { id: "ln_0309", inventarioId: "inv_0003", elementoId: "el_014", cantidadObservada: null, cantidadEsperada: 7, condicion: "no_aplica", evidenciaIds: [] },

    // dañado, con observación y evidencia (R11)
    { id: "ln_0310", inventarioId: "inv_0003", elementoId: "el_006", cantidadObservada: 3, cantidadEsperada: 3, condicion: "dañado", observacion: "La bandeja de salida no arrastra el papel y el panel marca error de rodillo.", evidenciaIds: ["ev_0001"], contadaEn: f("09:38"), contadoPorId: "op_inv_supervisor" },

    // sin_esperado: no estaba en el conteo de mayo
    { id: "ln_0311", inventarioId: "inv_0003", elementoId: "el_016", cantidadObservada: 4, cantidadEsperada: null, condicion: "bueno", observacion: "Se incorporaron cuatro extintores nuevos en julio.", evidenciaIds: [], contadaEn: f("09:50"), contadoPorId: "op_inv_supervisor" },

    // pendientes (null): nunca se contaron
    { id: "ln_0312", inventarioId: "inv_0003", elementoId: "el_002", cantidadObservada: null, cantidadEsperada: 12, condicion: "no_aplica", evidenciaIds: [] },
    { id: "ln_0313", inventarioId: "inv_0003", elementoId: "el_010", cantidadObservada: null, cantidadEsperada: 2, condicion: "no_aplica", evidenciaIds: [] },
  ];
}

/**
 * INV-0004 — final de Sede Occidente, BORRADOR con líneas sin contar.
 *
 * Demuestra que un borrador puede tener líneas: es el estado en el que el
 * operador carga el catálogo y todavía no ha empezado a recorrer.
 */
function lineasBorradorOccidente(): LineaInventario[] {
  const filas: [string, number][] = [
    ["el_001", 6],
    ["el_002", 4],
    ["el_011", 12],
    ["el_012", 12],
    ["el_015", 5],
  ];
  return filas.map(([elementoId, esperada], i) => ({
    id: `ln_04${String(i + 1).padStart(2, "0")}`,
    inventarioId: "inv_0004",
    elementoId,
    cantidadObservada: null,
    cantidadEsperada: esperada,
    condicion: "no_aplica",
    evidenciaIds: [],
  }));
}

/**
 * INV-0006 — final de Sala de Exhibición, ANULADO.
 *
 * Conserva sus líneas contadas: anular **no borra**. Es la prueba visible de
 * que un acto anulado sigue siendo consultable y desaparece solo de los
 * reportes activos.
 */
function lineasAnuladoExhibicion(): LineaInventario[] {
  const filas: [string, number, number][] = [
    ["el_001", 4, 3],
    ["el_002", 2, 2],
    ["el_003", 1, 1],
  ];
  return filas.map(([elementoId, esperada, observada], i) => ({
    id: `ln_06${String(i + 1).padStart(2, "0")}`,
    inventarioId: "inv_0006",
    elementoId,
    cantidadObservada: observada,
    cantidadEsperada: esperada,
    condicion: "bueno" as const,
    evidenciaIds: [],
    contadaEn: `2026-08-03T${String(9 + i).padStart(2, "0")}:30:00-05:00`,
    contadoPorId: "op_inv_auxiliar",
  }));
}

function condicionDesdeTexto(t: string): LineaInventario["condicion"] {
  if (t === "bueno" || t === "regular" || t === "dañado" || t === "no_aplica") return t;
  return "no_aplica";
}

// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCIAS — una sola, la del daño. Y es honesto que sea una.
// ═══════════════════════════════════════════════════════════════════════════
//
// El `dataUrl` es un PNG de 1×1 gris: no se inventa una fotografía. Lo que se
// demuestra es el **flujo** —que adjuntar produce una evidencia fechada, con
// autor, colgada de la línea correcta y con su nombre de archivo—, no que el
// producto traiga fotos. La UI dice en texto secundario que se conservan
// durante la sesión, que es la verdad sin backend.

/** PNG 1×1 opaco en gris. Suficiente para que el visor tenga algo que abrir. */
export const DATA_URL_EJEMPLO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export const EVIDENCIAS_SEED: Evidencia[] = [
  {
    id: "ev_0001",
    lineaId: "ln_0310",
    elementoId: "el_006",
    inventarioId: "inv_0003",
    nombreArchivo: "impresora-rodillo-danado.png",
    dataUrl: DATA_URL_EJEMPLO,
    subidaPorId: "op_inv_supervisor",
    subidaEn: "2026-09-22T09:39:00-05:00",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HISTORIAL — eventos tipados, en orden cronológico
// ═══════════════════════════════════════════════════════════════════════════

export const EVENTOS_SEED: EventoHistorial[] = [
  // INV-0001
  { id: "hst_0001", tipo: "inventario_creado", inventarioId: "inv_0001", detalle: { tipo: "inicial", lineas: 10 }, actorId: "op_inv_admin", fecha: "2026-01-12T07:45:00-05:00" },
  { id: "hst_0002", tipo: "inventario_iniciado", inventarioId: "inv_0001", detalle: { lineas: 10 }, actorId: "op_inv_supervisor", fecha: "2026-01-12T08:00:00-05:00" },
  { id: "hst_0003", tipo: "inventario_finalizado", inventarioId: "inv_0001", detalle: { contadas: 10 }, actorId: "op_inv_admin", fecha: "2026-01-12T17:40:00-05:00" },

  // INV-0002
  { id: "hst_0004", tipo: "inventario_creado", inventarioId: "inv_0002", detalle: { tipo: "periodico", lineas: 10 }, actorId: "op_inv_supervisor", fecha: "2026-05-14T08:00:00-05:00" },
  { id: "hst_0005", tipo: "inventario_iniciado", inventarioId: "inv_0002", detalle: { lineas: 10 }, actorId: "op_inv_supervisor", fecha: "2026-05-14T08:10:00-05:00" },
  { id: "hst_0006", tipo: "inventario_finalizado", inventarioId: "inv_0002", detalle: { contadas: 10 }, actorId: "op_inv_supervisor", fecha: "2026-05-14T16:20:00-05:00" },

  // INV-0003 — el que se está contando
  { id: "hst_0007", tipo: "inventario_creado", inventarioId: "inv_0003", detalle: { tipo: "periodico", lineas: 13 }, actorId: "op_inv_supervisor", fecha: "2026-09-21T17:30:00-05:00" },
  { id: "hst_0008", tipo: "inventario_iniciado", inventarioId: "inv_0003", detalle: { lineas: 13 }, actorId: "op_inv_supervisor", fecha: "2026-09-22T07:50:00-05:00" },
  { id: "hst_0009", tipo: "linea_contada", inventarioId: "inv_0003", elementoId: "el_004", lineaId: "ln_0301", detalle: { cantidad: 10, elemento: "Portátil 14\" corporativo" }, actorId: "op_inv_supervisor", fecha: "2026-09-22T08:05:00-05:00" },
  { id: "hst_0010", tipo: "linea_contada", inventarioId: "inv_0003", elementoId: "el_001", lineaId: "ln_0305", detalle: { cantidad: 21, elemento: "Silla ergonómica con brazos" }, actorId: "op_inv_supervisor", fecha: "2026-09-22T08:40:00-05:00" },
  { id: "hst_0011", tipo: "linea_contada", inventarioId: "inv_0003", elementoId: "el_003", lineaId: "ln_0307", detalle: { cantidad: 8, elemento: "Archivador metálico de 4 gavetas" }, actorId: "op_inv_supervisor", fecha: "2026-09-22T09:15:00-05:00" },
  { id: "hst_0012", tipo: "linea_contada", inventarioId: "inv_0003", elementoId: "el_015", lineaId: "ln_0308", detalle: { cantidad: 0, elemento: "Bolsa de residuos 60x90" }, actorId: "op_inv_supervisor", fecha: "2026-09-22T09:24:00-05:00" },
  { id: "hst_0013", tipo: "linea_contada", inventarioId: "inv_0003", elementoId: "el_006", lineaId: "ln_0310", detalle: { cantidad: 3, elemento: "Impresora multifuncional" }, actorId: "op_inv_supervisor", fecha: "2026-09-22T09:38:00-05:00" },
  { id: "hst_0014", tipo: "evidencia_adjuntada", inventarioId: "inv_0003", elementoId: "el_006", lineaId: "ln_0310", detalle: { archivo: "impresora-rodillo-danado.png" }, actorId: "op_inv_supervisor", fecha: "2026-09-22T09:39:00-05:00" },
  // El elemento inactivo sigue teniendo historial (caso borde 11): sus eventos
  // del conteo inicial se conservan aunque ya no aparezca en el selector.
  { id: "hst_0015", tipo: "linea_agregada", inventarioId: "inv_0003", elementoId: "el_016", lineaId: "ln_0311", detalle: { elemento: "Extintor ABC 10 lb" }, actorId: "op_inv_supervisor", fecha: "2026-09-22T09:45:00-05:00" },
  { id: "hst_0016", tipo: "linea_contada", inventarioId: "inv_0003", elementoId: "el_016", lineaId: "ln_0311", detalle: { cantidad: 4, elemento: "Extintor ABC 10 lb" }, actorId: "op_inv_supervisor", fecha: "2026-09-22T09:50:00-05:00" },

  // INV-0004
  { id: "hst_0017", tipo: "inventario_creado", inventarioId: "inv_0004", detalle: { tipo: "final", lineas: 5 }, actorId: "op_inv_auxiliar", fecha: "2026-09-26T11:00:00-05:00" },
  { id: "hst_0018", tipo: "linea_agregada", inventarioId: "inv_0004", elementoId: "el_011", lineaId: "ln_0403", detalle: { elemento: "Casco de seguridad" }, actorId: "op_inv_auxiliar", fecha: "2026-09-26T11:08:00-05:00" },

  // INV-0005 — creado y sin tocar
  { id: "hst_0019", tipo: "inventario_creado", inventarioId: "inv_0005", detalle: { tipo: "inicial", lineas: 0 }, actorId: "op_inv_analista", fecha: "2026-09-28T09:15:00-05:00" },

  // INV-0006 — anulado
  { id: "hst_0020", tipo: "inventario_creado", inventarioId: "inv_0006", detalle: { tipo: "final", lineas: 3 }, actorId: "op_inv_auxiliar", fecha: "2026-08-03T08:45:00-05:00" },
  { id: "hst_0021", tipo: "inventario_iniciado", inventarioId: "inv_0006", detalle: { lineas: 3 }, actorId: "op_inv_auxiliar", fecha: "2026-08-03T09:00:00-05:00" },
  { id: "hst_0022", tipo: "inventario_anulado", inventarioId: "inv_0006", detalle: { motivo: "La sala se desmontó durante el conteo" }, actorId: "op_inv_admin", fecha: "2026-08-03T15:10:00-05:00" },
];

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════
//
// Vacía a propósito. `categoriasSugeridas` arranca en `[]` y no con una lista
// de fábrica porque una lista prellenada con categorías de un vertical es
// exactamente el sesgo que este módulo debe evitar: las categorías reales las
// declara el negocio que las usa, no el producto que las siembra.

export const CONFIG_SEED: ConfigInventarios = {
  unidadPorDefecto: "unidad",
  categoriasSugeridas: [],
  diasInventarioEstancado: 7,
};
