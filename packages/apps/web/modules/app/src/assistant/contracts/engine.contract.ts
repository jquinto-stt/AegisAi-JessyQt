// ═══════════════════════════════════════════════════════════════════════════
// contracts/engine.contract.ts
// ═══════════════════════════════════════════════════════════════════════════
//
// Contratos del motor del asistente ("Necto Intelligence"). Estos tipos son la
// frontera pública entre la UI/store y cualquier implementación de motor.
//
// ═══════════════════════════════════════════════════════════════════════════

import type { ToolResult } from "./tool.contract";
import type { AssistantAccessContext } from "../registry/tool-registry";

/** Un mensaje del hilo del asistente. */
export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Evidencia (ToolResult) adjunta a una respuesta del asistente (para el FactsPanel). */
  evidence?: ToolResult;
  /** Momento de creación del mensaje, como ISO string. */
  createdAt: string;
}

/** Contexto que la UI/store pasa al engine en cada pregunta. */
export interface EngineContext {
  access: AssistantAccessContext;
  /** Historial reciente, por si el engine quiere usarlo (el MVP puede ignorarlo). */
  history?: AssistantMessage[];
}

/**
 * Contrato del motor del asistente. La UI y el `AssistantStore` dependen SOLO
 * de esta interfaz (invariante A3), nunca de una implementación concreta como
 * `LocalRuleEngine`.
 *
 * Sustituir la implementación (`LocalRuleEngine` → `RemoteLLMEngine`) no debe
 * requerir cambios aguas arriba (invariante A5): la firma pública del store y
 * la UI permanecen sin cambios.
 */
export interface AssistantEngine {
  /** Identificador del motor, para diagnóstico. */
  readonly kind: string;
  ask(question: string, ctx: EngineContext): Promise<AssistantMessage>;
}
