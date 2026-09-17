// ═══════════════════════════════════════════════════════════════════════════
// conversaciones-bot.adapter.ts — Adaptador delgado Conversaciones → AssistantEngine
// ═══════════════════════════════════════════════════════════════════════════
//
// Traduce entre el dominio de Conversaciones y el núcleo del asistente ("Necto
// Intelligence"). Vive en el MÓDULO de conversaciones (`pages/conversaciones/bot`),
// NO en `src/assistant/**`: el núcleo sigue agnóstico de dominio (invariante A1)
// y el adaptador es quien conoce ambos lados (invariante D4).
//
// Responsabilidad única: dado el texto del cliente (+ historial opcional),
//   1. derivar el `AssistantAccessContext` de la sesión con `buildAccessContext()`
//      (filtro módulos ∩ capacidades, fail-closed; NO se reimplementa aquí),
//   2. preguntar al `AssistantEngine` inyectado vía `ask(texto, { access, history })`,
//   3. mapear el `AssistantMessage` a `{ texto, payload?, modulo? }` para
//      `agregarMensajeBot` — incluido el DOMINIO que declaró la tool que
//      respondió (`ToolResult.sources[].module`), que es lo que permite
//      clasificar el hilo por módulo sin inferir nada del texto.
//
// El engine se INYECTA: el adaptador depende SOLO de la interfaz `AssistantEngine`
// (invariante A3/D4), nunca de una implementación concreta. La instancia por
// defecto usa `LocalRuleEngine` (motor rule-based del MVP) con el `toolRegistry`
// singleton, igual que el `AssistantStore`.
//
// _Requirements: 5.1, 5.2, 5.4, 5.5, 5.6, 5.7, 10.7_
// ═══════════════════════════════════════════════════════════════════════════

import type { AssistantEngine, AssistantMessage, ToolResult } from "@/assistant";
import { buildAccessContext } from "@/assistant/bootstrap";
import { LocalRuleEngine } from "@/assistant/engine/local-rule-engine";
import type { Modulo } from "@/stores/session.store";
import type { Mensaje, ModuloDestino } from "@/stores/conversaciones.types";

/**
 * Tiempo máximo (ms) que el adaptador espera al engine antes de devolver el
 * mensaje de fallback (Requirement 5.6).
 */
export const BOT_TIMEOUT_MS = 30_000;

/**
 * Texto del mensaje de fallback cuando el engine falla, rechaza o no responde
 * dentro de `BOT_TIMEOUT_MS`. Indica que un asesor humano atenderá al cliente.
 */
export const MENSAJE_FALLBACK =
  "En este momento no puedo responder automáticamente. Un asesor te atenderá en breve.";

/**
 * Resultado que el adaptador entrega al store para `agregarMensajeBot`.
 *
 * - `texto` vacío/whitespace ⟹ el store NO agrega mensaje de bot (Requirement
 *   5.7); el store (tarea 3.12) ya contempla no agregar si el texto está vacío.
 * - `payload` opcional con referencias de dominio (solo ids/primitivos).
 * - `modulo` opcional con el DOMINIO que originó la respuesta, copiado de la
 *   fuente (`ToolResult.sources[].module`) y NO inferido del texto. Es opcional
 *   y aditivo ⟹ retrocompatible. Ausente cuando no hay evidencia utilizable
 *   (fallback, timeout, respuesta vacía o módulo sin destino conocido): en ese
 *   caso el mensaje no se etiqueta, que es preferible a etiquetarlo mal.
 */
export interface RespuestaBot {
  texto: string;
  payload?: Mensaje["payload"];
  modulo?: ModuloDestino;
}

/** Entrada de `responder`: texto del cliente + historial reciente opcional. */
export interface EntradaBot {
  textoCliente: string;
  history?: AssistantMessage[];
}

/**
 * Adaptador que resuelve la respuesta automática del bot delegando en el
 * `AssistantEngine`. No contiene lógica de intención propia (Requirement 5.2):
 * todo pasa por el engine / tool registry.
 */
export interface ConversacionesBotAdapter {
  /**
   * Resuelve la respuesta automática para el texto del cliente.
   *
   * - Deriva el `AssistantAccessContext` de la sesión (`buildAccessContext()`),
   *   que ya aplica el filtro módulos ∩ capacidades fail-closed (Req 5.4, 5.5).
   * - Llama `engine.ask(textoCliente, { access, history })`.
   * - Mapea `AssistantMessage → { texto, payload?, modulo? }` (Req 5.3, 5.7).
   * - Ante rechazo/error o timeout de `BOT_TIMEOUT_MS`, devuelve el mensaje de
   *   fallback SIN lanzar (Req 5.6).
   */
  responder(input: EntradaBot): Promise<RespuestaBot>;
}

/**
 * Extrae un `payload` de dominio opcional de la evidencia (`ToolResult`) que el
 * engine adjunta a su respuesta. En el MVP solo se rescata un `pedidoId` si
 * algún `Fact` lo expone (label que contiene "pedido" + "id" o exactamente
 * "pedidoId"). Si no hay datos utilizables, devuelve `undefined` (Req 5.3, 5.7).
 *
 * Se mantiene defensivo: solo primitivos/ids, nunca la entidad Pedido
 * (encapsulamiento, invariante D2 / Req 10.6).
 */
function extraerPayload(evidence?: ToolResult): Mensaje["payload"] | undefined {
  if (!evidence?.facts?.length) return undefined;

  const factPedido = evidence.facts.find((f) => {
    const label = f.label?.toLowerCase() ?? "";
    return label === "pedidoid" || (label.includes("pedido") && label.includes("id"));
  });

  if (factPedido == null) return undefined;

  const pedidoId = String(factPedido.value).trim();
  if (pedidoId === "") return undefined;

  return { pedidoId };
}

/**
 * Traducción `Modulo` (núcleo del asistente) → `ModuloDestino` (Conversaciones).
 *
 * Son dos tipos de CAPAS DISTINTAS y con propósitos distintos, y por eso no se
 * unifican: `Modulo` es el dominio que un proveedor de tools declara al núcleo
 * agnóstico, y `ModuloDestino` es la etiqueta que el canal de atención usa para
 * clasificar un hilo. Hoy `Modulo` colapsa a `"pedidos"`, pero cuando Inventario
 * registre su provider esto dejará de ser una identidad.
 *
 * Este mapa es el ÚNICO punto de fricción entre ambos vocabularios: al ser un
 * `Record<Modulo, ModuloDestino>`, añadir un módulo al núcleo SIN darle destino
 * en Conversaciones es un error de compilación — no una etiqueta que falta en
 * silencio.
 */
const MODULO_A_DESTINO: Record<Modulo, ModuloDestino> = {
  pedidos: "pedidos",
};

/**
 * Extrae el DOMINIO de la respuesta a partir de la evidencia (`ToolResult`) que
 * el engine adjunta. Es la simétrica de `extraerPayload`: si existe el getter de
 * payload, el de módulo también debe existir.
 *
 * El dominio NO se adivina ni se clasifica a partir del texto del cliente: lo
 * DECLARA la herramienta que respondió (`ToolSource.module`, contrato de tools).
 * La verdad la produce quien la posee, y aquí solo se copia.
 *
 * FAIL-CLOSED: sin fuentes, sin `module` o con un módulo que no tenga destino
 * conocido, devuelve `undefined` ⟹ el mensaje no se etiqueta. Es preferible un
 * mensaje sin etiqueta que un mensaje con una etiqueta inventada.
 */
function extraerModulo(evidence?: ToolResult): ModuloDestino | undefined {
  const modulo = evidence?.sources?.[0]?.module;
  if (modulo == null) return undefined;

  // El índice va tipado como `Modulo`, pero el valor llega en runtime desde el
  // provider: el `?? undefined` cubre un módulo no mapeado sin romper el tipo.
  return MODULO_A_DESTINO[modulo] ?? undefined;
}


/**
 * Promesa que se resuelve tras `ms` milisegundos con un valor sentinela, para
 * competir con `engine.ask` mediante `Promise.race` (Req 5.6).
 */
function timeout(ms: number): Promise<typeof TIMEOUT_SENTINEL> {
  return new Promise((resolve) => setTimeout(() => resolve(TIMEOUT_SENTINEL), ms));
}

/** Sentinela único para distinguir "ganó el timeout" del resultado del engine. */
const TIMEOUT_SENTINEL = Symbol("bot-timeout");

/**
 * Crea un `ConversacionesBotAdapter` con el `AssistantEngine` inyectado.
 *
 * El adaptador depende SOLO de la interfaz `AssistantEngine`, de modo que en
 * tests se puede inyectar un doble sin tocar el núcleo (invariante A3/D4).
 *
 * @param engine implementación del motor a usar (p. ej. `LocalRuleEngine`).
 */
export function crearConversacionesBotAdapter(
  engine: AssistantEngine,
): ConversacionesBotAdapter {
  return {
    async responder({ textoCliente, history }: EntradaBot): Promise<RespuestaBot> {
      // Fail-closed: el access se deriva de la sesión. Sin sesión válida,
      // `buildAccessContext()` devuelve un contexto sin módulos cuya
      // `hasCapability` es siempre false → el registry no expone tools (Req 5.4, 5.5).
      const access = buildAccessContext();

      try {
        const resultado = await Promise.race([
          engine.ask(textoCliente, { access, history }),
          timeout(BOT_TIMEOUT_MS),
        ]);

        // Timeout: el engine no respondió a tiempo → fallback (Req 5.6).
        if (resultado === TIMEOUT_SENTINEL) {
          return { texto: MENSAJE_FALLBACK };
        }

        const msg = resultado as AssistantMessage;

        // Respuesta sin contenido → el store no agregará mensaje de bot (Req 5.7).
        if (msg.text == null || msg.text.trim() === "") {
          return { texto: "" };
        }

        return {
          texto: msg.text,
          payload: extraerPayload(msg.evidence),
          modulo: extraerModulo(msg.evidence),
        };
      } catch {
        // Rechazo/error del engine → fallback, nunca se propaga (Req 5.6).
        return { texto: MENSAJE_FALLBACK };
      }
    },
  };
}

/**
 * Instancia por defecto del adaptador, cableada con `LocalRuleEngine` (motor
 * rule-based del MVP) sobre el `toolRegistry` singleton — el mismo default que
 * usa el `AssistantStore`, sin acoplarse a rutas internas del núcleo más allá
 * de la implementación de motor del MVP.
 *
 * El store de conversaciones (tarea 3.12) consume esta instancia.
 */
export const conversacionesBotAdapter: ConversacionesBotAdapter =
  crearConversacionesBotAdapter(new LocalRuleEngine());
