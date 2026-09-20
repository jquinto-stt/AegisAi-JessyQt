import { describe, expect, it, vi } from "vitest";
import type {
  AssistantEngine,
  AssistantMessage,
  EngineContext,
} from "@/assistant";
import { AssistantStore } from "./assistant.store";

// ═══════════════════════════════════════════════════════════════════════════
// stores/assistant.store.test.ts — Tests unitarios del AssistantStore
// ═══════════════════════════════════════════════════════════════════════════
//
// El store depende SOLO de la interfaz `AssistantEngine`, inyectada por
// constructor (invariante A3). Inyectamos motores FALSOS deterministas que no
// tocan el registry ni la sesión, de modo que los tests no dependan de
// `sessionStore` ni de tools reales. `buildAccessContext()` se sigue llamando
// dentro de `enviar`, pero es fail-closed (usa optional chaining) y el fake
// ignora el `ctx`.
//
// _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 1.8, 1.9, 12.3, 14.1, 14.2, 14.3, 14.4_
// ═══════════════════════════════════════════════════════════════════════════

/** Construye una respuesta `assistant` de prueba. */
function respuestaFake(text = "respuesta"): AssistantMessage {
  return {
    id: "fake-assistant-id",
    role: "assistant",
    text,
    createdAt: new Date().toISOString(),
  };
}

/** Fake engine que siempre responde OK con un mensaje fijo. */
function engineOk(text = "respuesta"): AssistantEngine {
  return {
    kind: "fake",
    ask: vi.fn(async (_q: string, _ctx: EngineContext) => respuestaFake(text)),
  };
}

/** Un diferido (deferred) para controlar cuándo resuelve/rechaza una promesa. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("AssistantStore.enviar — flujo feliz", () => {
  it("agrega mensaje user y luego assistant en orden con el contenido correcto (Req 1.1, 1.4)", async () => {
    const store = new AssistantStore(engineOk("hola desde el fake"));

    await store.enviar("¿cómo van las ventas?");

    expect(store.mensajes).toHaveLength(2);

    const [primero, segundo] = store.mensajes;
    expect(primero.role).toBe("user");
    expect(primero.text).toBe("¿cómo van las ventas?");

    expect(segundo.role).toBe("assistant");
    expect(segundo.text).toBe("hola desde el fake");
  });

  it("aplica trim al texto del mensaje user (Req 1.1)", async () => {
    const store = new AssistantStore(engineOk());

    await store.enviar("   con espacios alrededor   ");

    const user = store.mensajes.find((m) => m.role === "user");
    expect(user?.text).toBe("con espacios alrededor");
  });

  it("pasa el texto ya normalizado (trim) al engine (Req 1.1)", async () => {
    // El mock declara el primer parámetro de `AssistantEngine.ask` para que
    // `mock.calls[0]` sea una tupla con elemento 0 y la aserción tenga sentido.
    // Sin él, TS infiere `() => …` y `mock.calls[0][0]` no existe.
    const ask = vi.fn(async (_question: string) => respuestaFake());
    const engine: AssistantEngine = { kind: "fake", ask };
    const store = new AssistantStore(engine);

    await store.enviar("  pregunta  ");

    expect(ask).toHaveBeenCalledTimes(1);
    expect(ask.mock.calls[0][0]).toBe("pregunta");
  });
});

describe("AssistantStore.enviar — validación de entrada", () => {
  it("no muta mensajes ni llama al engine con texto vacío (Req 1.2)", async () => {
    const ask = vi.fn(async () => respuestaFake());
    const engine: AssistantEngine = { kind: "fake", ask };
    const store = new AssistantStore(engine);

    await store.enviar("");

    expect(store.mensajes).toHaveLength(0);
    expect(ask).not.toHaveBeenCalled();
  });

  it("no muta mensajes ni llama al engine con solo espacios (Req 1.2)", async () => {
    const ask = vi.fn(async () => respuestaFake());
    const engine: AssistantEngine = { kind: "fake", ask };
    const store = new AssistantStore(engine);

    await store.enviar("     ");

    expect(store.mensajes).toHaveLength(0);
    expect(ask).not.toHaveBeenCalled();
  });
});

describe("AssistantStore.enviar — estado pensando (Req 1.3, 1.8)", () => {
  it("está true durante el await y false al terminar; puedeEnviar refleja !pensando", async () => {
    const d = deferred<AssistantMessage>();
    const engine: AssistantEngine = {
      kind: "fake",
      ask: vi.fn(() => d.promise),
    };
    const store = new AssistantStore(engine);

    // Lanzamos sin await: el ask queda pendiente.
    const enVuelo = store.enviar("pregunta");

    expect(store.pensando).toBe(true);
    expect(store.puedeEnviar).toBe(false);

    // Liberamos la respuesta.
    d.resolve(respuestaFake());
    await enVuelo;

    expect(store.pensando).toBe(false);
    expect(store.puedeEnviar).toBe(true);
  });
});

describe("AssistantStore.enviar — guard de concurrencia (Req 1.9)", () => {
  it("ignora un segundo envío mientras hay uno en curso", async () => {
    const d = deferred<AssistantMessage>();
    const ask = vi.fn(() => d.promise);
    const engine: AssistantEngine = { kind: "fake", ask };
    const store = new AssistantStore(engine);

    // Primer envío: queda pendiente (pensando = true).
    const primero = store.enviar("primera");
    expect(store.pensando).toBe(true);
    expect(store.mensajes).toHaveLength(1); // solo el user de la primera

    // Segundo envío mientras pensando=true: debe ignorarse.
    await store.enviar("segunda");

    expect(ask).toHaveBeenCalledTimes(1); // el segundo no llamó al engine
    expect(store.mensajes).toHaveLength(1); // no agregó otro mensaje user
    expect(store.mensajes[0].text).toBe("primera");

    // Liberamos el primero.
    d.resolve(respuestaFake());
    await primero;

    expect(store.mensajes).toHaveLength(2);
    expect(store.pensando).toBe(false);
  });
});

describe("AssistantStore.enviar — manejo de error (Req 14.1, 14.2, 14.4)", () => {
  it("setea error, deja pensando en false, conserva el user y no agrega assistant", async () => {
    const engine: AssistantEngine = {
      kind: "fake",
      ask: vi.fn(async () => {
        throw new Error("fallo del motor");
      }),
    };
    const store = new AssistantStore(engine);

    await store.enviar("x");

    expect(store.error).toBeTruthy();
    expect(typeof store.error).toBe("string");
    expect((store.error as string).length).toBeGreaterThan(0);
    expect(store.pensando).toBe(false);

    // El historial conserva el mensaje user; sin respuesta assistant.
    expect(store.mensajes).toHaveLength(1);
    expect(store.mensajes[0].role).toBe("user");
    expect(store.mensajes.some((m) => m.role === "assistant")).toBe(false);
  });

  it("limpia el error en el siguiente envío exitoso (Req 14.3)", async () => {
    // Primer engine: falla.
    const engineFalla: AssistantEngine = {
      kind: "fake",
      ask: vi.fn(async () => {
        throw new Error("fallo");
      }),
    };
    const store = new AssistantStore(engineFalla);

    await store.enviar("primera");
    expect(store.error).toBeTruthy();

    // Sustituimos por un engine que responde OK y reenviamos.
    (store as unknown as { engine: AssistantEngine }).engine = engineOk("ok ahora");

    await store.enviar("segunda");

    expect(store.error).toBeNull();
    expect(store.mensajes.some((m) => m.role === "assistant")).toBe(true);
  });
});

describe("AssistantStore.limpiar (Req 1.7)", () => {
  it("vacía los mensajes y el error", async () => {
    const engine: AssistantEngine = {
      kind: "fake",
      ask: vi.fn(async () => {
        throw new Error("fallo");
      }),
    };
    const store = new AssistantStore(engine);

    await store.enviar("algo"); // deja un mensaje user y un error
    expect(store.mensajes.length).toBeGreaterThan(0);
    expect(store.error).toBeTruthy();

    store.limpiar();

    expect(store.mensajes).toHaveLength(0);
    expect(store.error).toBeNull();
  });
});
