// ═══════════════════════════════════════════════════════════════════════════
// blocks/index.ts — Barrel de las vistas de bloques de respuesta enriquecida
// ═══════════════════════════════════════════════════════════════════════════
//
// Reexporta el despachador `ResponseBlockView` y el helper `ResponseBlocks`, más
// las vistas individuales por si un consumidor quiere renderizar un tipo de
// bloque concreto directamente.
//
// ═══════════════════════════════════════════════════════════════════════════

export { ResponseBlockView, ResponseBlocks } from "./ResponseBlockView";
export { MetricsBlockView } from "./MetricsBlockView";
export { TableBlockView } from "./TableBlockView";
export { ComparisonBlockView } from "./ComparisonBlockView";
export { ListBlockView } from "./ListBlockView";
