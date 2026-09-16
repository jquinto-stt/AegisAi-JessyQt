import type { Modulo } from "@/stores/session.store";
import type { Capacidad } from "@/stores/roles.store";

// ═══════════════════════════════════════════════════════════════════════════
// CONTRATOS DEL NÚCLEO — TOOLS
// ═══════════════════════════════════════════════════════════════════════════
//
// Tipos base del asistente ("Necto Intelligence"). Este archivo es parte del
// núcleo agnóstico de dominio (`src/assistant/**`, invariante A1): NO importa
// stores de dominio ni `SessionStore` como valores; `Modulo` y `Capacidad`
// entran SOLO como **tipos** (`import type`), de modo que no se crea ninguna
// dependencia de ejecución con esos stores.
//
// La distinción HECHO / INFERENCIA vive aquí y es la piedra angular del
// asistente: los `Fact` son datos objetivos leídos de un store, y las
// `Inference` son interpretaciones heurísticas que NUNCA afirman causalidad.
//
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Nivel de capacidad de una tool. Determina cuánto "poder" ejerce.
 *
 * MVP implementa solo `query` y `analyze`; `recommend` y `execute` quedan
 * reservados para fases futuras (interfaces listas, sin implementación).
 */
export type ToolCapabilityLevel = "query" | "analyze" | "recommend" | "execute";

/**
 * HECHO — dato objetivo leído de un store. Nunca es una interpretación.
 *
 * Un `value` numérico es el número tal cual sale del store: sin texto
 * interpretativo, comparativo ni causal. El `label` es la clave estable por la
 * que una `Inference` puede referirlo desde su `basedOn`.
 */
export interface Fact {
  label: string;
  value: number | string;
  unit?: string;
  /** Periodo al que aplica el dato (ej. "hoy", "2024-01-01..2024-01-07"). */
  period?: string;
}

/**
 * INFERENCIA — interpretación heurística. SIEMPRE marcada con su tipo y
 * confianza.
 *
 * NUNCA afirma causalidad: el vocabulario de `kind` está deliberadamente
 * limitado a `correlation | pattern | hypothesis` (jamás "causa"/"causalidad").
 * Además siempre lleva `confidence` y un `basedOn` **no vacío** cuyos elementos
 * referencian los `label` de `Fact` presentes en el mismo `ToolResult`.
 */
export interface Inference {
  statement: string;
  kind: "correlation" | "pattern" | "hypothesis";
  confidence: "baja" | "media" | "alta";
  /** Labels de los Facts en los que se apoya la inferencia (no vacío). */
  basedOn: string[];
}

/** Fuente consultada por una tool (para trazabilidad en el FactsPanel). */
export interface ToolSource {
  toolId: string;
  module: Modulo;
  /** Descripción legible de qué se consultó. */
  detail: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOQUES DE RESPUESTA ENRIQUECIDA
// ═══════════════════════════════════════════════════════════════════════════
//
// Bloques de PRESENTACIÓN que una tool adjunta a su `ToolResult` y que el chat
// renderiza INLINE dentro de la burbuja del asistente (NO en un panel aparte).
// Son genéricos y agnósticos de dominio, y la unión `ResponseBlock` está ABIERTA
// para extenderse por `kind` (ej. `chart`, `record`) sin romper nada existente.
//
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BLOQUE DE MÉTRICAS — tarjeta de KPIs embebida en la respuesta del chat. Cada
 * métrica es un dato objetivo que se muestra inline dentro de la burbuja del
 * asistente, no en un panel separado.
 */
export interface MetricsBlock {
  kind: "metrics";
  title?: string;
  items: { label: string; value: number | string; unit?: string; hint?: string }[];
}

/**
 * BLOQUE DE TABLA — filas/columnas embebidas en la respuesta del chat, con
 * exportación opcional a CSV. Se renderiza inline dentro de la burbuja del
 * asistente.
 */
export interface TableBlock {
  kind: "table";
  title?: string;
  columns: string[];
  rows: (string | number)[][];
  /** Si true, la UI ofrece descargar la tabla como CSV. */
  exportable?: boolean;
}

/**
 * BLOQUE DE COMPARATIVA — pares de valores (ej. periodo A vs B) con variación,
 * embebidos en la respuesta del chat y renderizados inline dentro de la burbuja
 * del asistente.
 */
export interface ComparisonBlock {
  kind: "comparison";
  title?: string;
  /** Unidad común de los valores (ej. "COP", "pedidos"). */
  unit?: string;
  items: {
    label: string;          // ej. "Ventas"
    valueA: number;         // periodo A (referencia)
    valueB: number;         // periodo B (actual)
    labelA?: string;        // ej. "semana pasada"
    labelB?: string;        // ej. "esta semana"
  }[];
}

/**
 * BLOQUE DE LISTADO — lista compacta de ítems (ej. pedidos pendientes),
 * embebida en la respuesta del chat y renderizada inline dentro de la burbuja
 * del asistente.
 */
export interface ListBlock {
  kind: "list";
  title?: string;
  items: { primary: string; secondary?: string; trailing?: string }[];
}

/**
 * Un bloque de respuesta enriquecida que una tool adjunta y el chat renderiza
 * inline dentro de la burbuja del asistente. Unión discriminada por `kind`,
 * ABIERTA para añadir en el futuro `chart`, `record`, etc., sin romper nada.
 */
export type ResponseBlock = MetricsBlock | TableBlock | ComparisonBlock | ListBlock;

/** Resultado de ejecutar una tool: hechos, inferencias opcionales y fuentes. */
export interface ToolResult {
  facts: Fact[];
  inferences?: Inference[];
  sources: ToolSource[];
  /**
   * Bloques visuales embebidos que el chat renderiza INLINE dentro de la
   * respuesta del asistente (tarjetas de métricas, tablas, comparativas,
   * listados, etc.). Es OPCIONAL para no romper tools ni tests existentes: una
   * tool que no adjunta presentación enriquecida simplemente omite este campo.
   */
  blocks?: ResponseBlock[];
}

/** Especificación de un parámetro de entrada de una tool. */
export interface ToolParamSpec {
  name: string;
  type: "string" | "number" | "date" | "enum";
  required: boolean;
  description: string;
  /** Valores válidos cuando `type === "enum"`. */
  options?: string[];
}

/**
 * Una tool que un módulo expone al asistente.
 *
 * El `id` es **namespaced por `module`** (ej. `pedidos.getResumenHoy`) y único
 * entre las tools registradas; el prefijo debe corresponder al `module` de la
 * tool. El `ToolRegistry` solo la considera visible/ejecutable si el usuario
 * posee todas las `requiredCapabilities`.
 */
export interface AssistantTool {
  /** Namespaced por módulo, ej. "pedidos.getResumenHoy". */
  id: string;
  module: Modulo;
  name: string;
  description: string;
  level: ToolCapabilityLevel;
  /** Capacidades que el usuario debe tener para que la tool sea visible/ejecutable. */
  requiredCapabilities: Capacidad[];
  params: ToolParamSpec[];
  run(input: Record<string, unknown>): Promise<ToolResult>;
}
