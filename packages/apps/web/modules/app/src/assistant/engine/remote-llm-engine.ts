// ═══════════════════════════════════════════════════════════════════════════
// engine/remote-llm-engine.ts
// ═══════════════════════════════════════════════════════════════════════════
//
// STUB DOCUMENTADO — NO es una implementación real.
//
// ═══════════════════════════════════════════════════════════════════════════

import type {
  AssistantEngine,
  AssistantMessage,
  EngineContext,
} from "../contracts/engine.contract";

/**
 * `RemoteLLMEngine` es el **punto de crecimiento** del asistente: el motor que,
 * en una fase futura, delegaría el razonamiento en un LLM real a través de un
 * backend. En esta fase **NO se implementa** — es un stub deliberado que existe
 * únicamente para documentar cómo evolucionará el sistema sin romper nada.
 *
 * ── Por qué es solo un stub en esta fase ────────────────────────────────────
 * El MVP es **frontend-only**: no hay API key, no hay endpoint del LLM ni
 * backend que ejecute tools. El motor activo del MVP es `LocalRuleEngine`, que
 * resuelve las preguntas con reglas locales y las tools del `ToolRegistry`. Por
 * eso `ask()` aquí lanza un error explícito en lugar de simular una respuesta.
 *
 * ── Cómo funcionaría cuando exista backend ──────────────────────────────────
 * Al disponer de un LLM real, `ask(question, ctx)`:
 *
 *  1. Enviaría al endpoint del LLM un payload con:
 *       - `question`: la pregunta del usuario.
 *       - `history`: el historial reciente (`ctx.history`) para dar contexto.
 *       - `tool specs`: las especificaciones de las tools DISPONIBLES para este
 *         usuario, obtenidas del registry ya filtradas por módulos habilitados
 *         ∩ capacidades (`ctx.access`). El LLM nunca ve tools no autorizadas.
 *
 *  2. El LLM elegiría la(s) tool(s) a invocar mediante *function-calling*,
 *     decidiendo qué getters de dominio consultar según la intención.
 *
 *  3. El **backend** ejecutaría únicamente las tools PERMITIDAS (revalidando la
 *     autorización de forma fail-closed, nunca confiando solo en el LLM) y
 *     compondría la respuesta final, adjuntando la evidencia (`ToolResult`)
 *     correspondiente.
 *
 *  4. Devolvería un `AssistantMessage` idéntico en forma al que produce
 *     `LocalRuleEngine`: `role: "assistant"`, `text`, `evidence?` y `createdAt`.
 *
 * ── Por qué mantiene EXACTAMENTE el contrato `AssistantEngine` ───────────────
 * Esta clase implementa `AssistantEngine` sin añadir ni alterar su firma
 * pública (`kind` + `ask(question, ctx)`). Gracias a ello, cambiar el motor
 * (`LocalRuleEngine` → `RemoteLLMEngine`) es una simple sustitución de la
 * implementación inyectada: la **UI**, el **AssistantStore**, el
 * **ToolRegistry** y los **providers** permanecen INTACTOS. Esto materializa
 * las invariantes de arquitectura:
 *
 *   - **A3**: la UI/store dependen solo de la interfaz `AssistantEngine`, nunca
 *     de una implementación concreta.
 *   - **A5**: intercambiar el motor no requiere cambios aguas arriba; la
 *     frontera pública se conserva idéntica.
 */
export class RemoteLLMEngine implements AssistantEngine {
  /** Identificador del motor, para diagnóstico. */
  readonly kind = "remote-llm";

  /**
   * NO implementado en el MVP. Lanza siempre, para dejar claro que este motor
   * es un punto de crecimiento y que el flujo real requiere un backend + LLM
   * (ver el JSDoc de la clase para el diseño previsto).
   *
   * @param question Pregunta del usuario (ignorada en el stub).
   * @param ctx      Contexto del motor con acceso e historial (ignorado en el stub).
   * @throws {Error} Siempre: `"RemoteLLMEngine no implementado en el MVP"`.
   */
  async ask(question: string, ctx: EngineContext): Promise<AssistantMessage> {
    throw new Error("RemoteLLMEngine no implementado en el MVP");
  }
}
