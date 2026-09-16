import { describe, expect, it } from "vitest";
import type {
  AssistantEngine,
  AssistantMessage,
  EngineContext,
} from "@/assistant";
import { RemoteLLMEngine } from "@/assistant/engine/remote-llm-engine";
import { AssistantStore } from "./assistant.store";

// ═══════════════════════════════════════════════════════════════════════════
// stores/assistant.store.engine-swap.test.ts
// ═══════════════════════════════════════════════════════════════════════════
//
// Property 6: Intercambiabilidad del engine.
//
// Validates: Requirements 17.1, 17.2, 17.3
//
// Estos tests demuestran que sustituir la implementación de `AssistantEngine`
// inyectada en `AssistantStore` (invariante A3/A5):
//   - no cambia la firma pública del store (`enviar`, `limpiar`, `mensajes`,
//     `pensando`, `error`, `puedeEnviar`),
//   - no requiere tocar la UI ni el resto del código aguas arriba,
//   - permite incluso inyectar un stub que lanza (`RemoteLLMEngine`), que es
//     intercambiable a nivel de tipo aunque no esté implementado en el MVP.
//
// Los engines fake NO tocan el registry ni la sesión: controlan `ask`
// directamente. `buildAccessContext()` se sigue llamando dentro de `enviar`,
// pero es fail-closed y el fake ignora el `ctx`.
// ═══════════════════════════════════════════════════════════════════════════

/** Construye una respuesta `assistant` con un texto dado. */
function respuesta(text: string): AssistantMessage {
  return {
    id: `msg-${text}`,
    role: "assistant",
    text,
    createdAt: new Date().toISOString(),
  };
}

/**
 * EngineA — primera implementación de `AssistantEngine`.
 * `kind = "engine-a"`; siempre responde "respuesta A".
 */
class EngineA implements AssistantEngine {
  readonly kind = "engine-a";
  async ask(_question: string, _ctx: EngineContext): Promise<AssistantMessage> {
    return respuesta("respuesta A");
  }
}

/**
 * EngineB — segunda implementación de `AssistantEngine`, distinta de EngineA.
 * `kind = "engine-b"`; siempre responde "respuesta B".
 */
class EngineB implements AssistantEngine {
  readonly kind = "engine-b";
  async ask(_question: string, _ctx: EngineContext): Promise<AssistantMessage> {
    return respuesta("respuesta B");
  }
}

/** Texto del último mensaje `assistant` del hilo, o `undefined` si no hay. */
function ultimoAssistant(store: AssistantStore): string | undefined {
  const assistants = store.mensajes.filter((m) => m.role === "assistant");
  return assistants.at(-1)?.text;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: mismo flujo, distinto engine → distinta respuesta, misma API pública.
// ─────────────────────────────────────────────────────────────────────────────
describe("Property 6 — el store funciona idénticamente con cualquier AssistantEngine (Req 17.1, 17.2)", () => {
  it("con EngineA la última respuesta assistant es la de A", async () => {
    const store = new AssistantStore(new EngineA());

    await store.enviar("hola");

    expect(ultimoAssistant(store)).toBe("respuesta A");
  });

  it("con EngineB, mismo flujo, la última respuesta assistant es la de B", async () => {
    const store = new AssistantStore(new EngineB());

    await store.enviar("hola");

    expect(ultimoAssistant(store)).toBe("respuesta B");
  });

  it("el flujo público (enviar → user + assistant) es idéntico para ambos engines", async () => {
    const storeA = new AssistantStore(new EngineA());
    const storeB = new AssistantStore(new EngineB());

    await storeA.enviar("hola");
    await storeB.enviar("hola");

    // Misma forma del hilo: primero user, luego assistant.
    for (const store of [storeA, storeB]) {
      expect(store.mensajes).toHaveLength(2);
      expect(store.mensajes[0].role).toBe("user");
      expect(store.mensajes[0].text).toBe("hola");
      expect(store.mensajes[1].role).toBe("assistant");
      expect(store.pensando).toBe(false);
      expect(store.error).toBeNull();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: la superficie pública del store es estable sin importar el engine.
// ─────────────────────────────────────────────────────────────────────────────
describe("Property 6 — la firma pública del store es estable para cualquier engine (Req 17.2)", () => {
  it("expone la misma API pública (enviar, limpiar, mensajes, pensando, error, puedeEnviar) para EngineA y EngineB", () => {
    for (const engine of [new EngineA(), new EngineB()]) {
      const store = new AssistantStore(engine);

      // Métodos públicos.
      expect(typeof store.enviar).toBe("function");
      expect(typeof store.limpiar).toBe("function");

      // Estado observable.
      expect(Array.isArray(store.mensajes)).toBe(true);
      expect(typeof store.pensando).toBe("boolean");
      expect(store.error === null || typeof store.error === "string").toBe(true);

      // Getter derivado.
      expect(typeof store.puedeEnviar).toBe("boolean");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 3 (documenta A5): un engine puede ser un stub que lanza (RemoteLLMEngine).
// Es intercambiable a nivel de tipo aunque no esté implementado; el store maneja
// el error sin cambiar su API.
// ─────────────────────────────────────────────────────────────────────────────
describe("Property 6 — un engine que lanza (RemoteLLMEngine) es intercambiable sin tocar la API del store (Req 17.3)", () => {
  it("inyectar RemoteLLMEngine (stub que lanza) hace que el store maneje el error: error != null, pensando false", async () => {
    // RemoteLLMEngine implementa AssistantEngine pero su ask() siempre lanza.
    const store = new AssistantStore(new RemoteLLMEngine());

    await store.enviar("x");

    // El store maneja el error sin romper el hilo ni cambiar su API pública.
    expect(store.error).not.toBeNull();
    expect(typeof store.error).toBe("string");
    expect(store.pensando).toBe(false);

    // El mensaje del usuario se conserva; no se agrega respuesta assistant.
    expect(store.mensajes).toHaveLength(1);
    expect(store.mensajes[0].role).toBe("user");
    expect(store.mensajes.some((m) => m.role === "assistant")).toBe(false);
  });
});
