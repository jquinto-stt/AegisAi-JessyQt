import { describe, expect, it, vi } from "vitest";
import type {
  AssistantEngine,
  AssistantMessage,
  EngineContext,
} from "@/assistant";
import { AssistantStore } from "./assistant.store";

// ═══════════════════════════════════════════════════════════════════════════
// stores/assistant.store.multiconv.test.ts — Historial multi-conversación
// ═══════════════════════════════════════════════════════════════════════════
//
// Cubre el modelo nuevo de multi-chat del AssistantStore: arranque con una
// conversación vacía activa, alta/selección/eliminación de conversaciones,
// derivación de título del primer mensaje y agrupación por fecha. Igual que en
// los tests unitarios base, se inyectan motores FALSOS deterministas por
// constructor (invariante A3). En entorno node (sin localStorage) la
// persistencia es no-op → cada store arranca limpio.
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

describe("AssistantStore — arranque", () => {
  it("arranca con exactamente una conversación vacía activa y mensajes []", () => {
    const store = new AssistantStore(engineOk());

    expect(store.conversaciones).toHaveLength(1);
    expect(store.conversacionActivaId).not.toBeNull();
    expect(store.conversacionActiva).not.toBeNull();
    expect(store.conversacionActiva?.mensajes).toEqual([]);
    expect(store.conversacionActiva?.titulo).toBe("Nueva conversación");
    expect(store.mensajes).toEqual([]);
  });
});

describe("AssistantStore.nuevaConversacion", () => {
  it("crea y activa una conversación nueva sin borrar las existentes", async () => {
    const store = new AssistantStore(engineOk());
    await store.enviar("hola en la primera");

    const primeraId = store.conversacionActivaId;
    expect(store.conversaciones).toHaveLength(1);

    store.nuevaConversacion();

    expect(store.conversaciones).toHaveLength(2);
    expect(store.conversacionActivaId).not.toBe(primeraId);
    expect(store.mensajes).toEqual([]); // la nueva está vacía

    // La primera conversación sigue existiendo con su historial intacto.
    const primera = store.conversaciones.find((c) => c.id === primeraId);
    expect(primera?.mensajes).toHaveLength(2);
  });

  it("limpia el error al crear una conversación nueva", async () => {
    const engineFalla: AssistantEngine = {
      kind: "fake",
      ask: vi.fn(async () => {
        throw new Error("fallo");
      }),
    };
    const store = new AssistantStore(engineFalla);
    await store.enviar("algo");
    expect(store.error).toBeTruthy();

    store.nuevaConversacion();
    expect(store.error).toBeNull();
  });
});

describe("AssistantStore.seleccionarConversacion", () => {
  it("cambia la conversación activa a un id existente", async () => {
    const store = new AssistantStore(engineOk());
    await store.enviar("primera conversacion");
    const primeraId = store.conversacionActivaId!;

    store.nuevaConversacion();
    const segundaId = store.conversacionActivaId!;
    expect(segundaId).not.toBe(primeraId);

    store.seleccionarConversacion(primeraId);
    expect(store.conversacionActivaId).toBe(primeraId);
    expect(store.mensajes).toHaveLength(2);
  });

  it("ignora un id inexistente (no cambia la activa)", () => {
    const store = new AssistantStore(engineOk());
    const activaId = store.conversacionActivaId;

    store.seleccionarConversacion("no-existe");

    expect(store.conversacionActivaId).toBe(activaId);
  });
});

describe("AssistantStore.eliminarConversacion", () => {
  it("al eliminar la activa, activa la más reciente restante", async () => {
    const store = new AssistantStore(engineOk());
    await store.enviar("primera"); // conv 1
    const primeraId = store.conversacionActivaId!;

    store.nuevaConversacion();
    await store.enviar("segunda"); // conv 2 (más reciente)
    const segundaId = store.conversacionActivaId!;

    // Eliminamos la activa (segunda); debe activarse la primera.
    store.eliminarConversacion(segundaId);

    expect(store.conversaciones.some((c) => c.id === segundaId)).toBe(false);
    expect(store.conversacionActivaId).toBe(primeraId);
  });

  it("al eliminar la última conversación, crea una nueva vacía activa", async () => {
    const store = new AssistantStore(engineOk());
    await store.enviar("única");
    const unicaId = store.conversacionActivaId!;

    store.eliminarConversacion(unicaId);

    expect(store.conversaciones).toHaveLength(1);
    expect(store.conversacionActivaId).not.toBe(unicaId);
    expect(store.mensajes).toEqual([]);
    expect(store.conversacionActiva?.titulo).toBe("Nueva conversación");
  });

  it("eliminar una NO activa no cambia la conversación activa", async () => {
    const store = new AssistantStore(engineOk());
    await store.enviar("primera");
    const primeraId = store.conversacionActivaId!;
    store.nuevaConversacion();
    const segundaId = store.conversacionActivaId!;

    store.eliminarConversacion(primeraId);

    expect(store.conversacionActivaId).toBe(segundaId);
    expect(store.conversaciones).toHaveLength(1);
  });
});

describe("AssistantStore.enviar — título derivado", () => {
  it("deriva el título del primer mensaje user (colapsa espacios)", async () => {
    const store = new AssistantStore(engineOk());

    await store.enviar("  ¿Cómo   van\nlas ventas?  ");

    expect(store.conversacionActiva?.titulo).toBe("¿Cómo van las ventas?");
  });

  it("recorta títulos largos a ~40 caracteres con elipsis", async () => {
    const store = new AssistantStore(engineOk());
    const largo = "a".repeat(80);

    await store.enviar(largo);

    const titulo = store.conversacionActiva!.titulo;
    expect(titulo.endsWith("…")).toBe(true);
    // 40 caracteres + la elipsis.
    expect(titulo.length).toBeLessThanOrEqual(41);
  });

  it("no reescribe el título en el segundo mensaje", async () => {
    const store = new AssistantStore(engineOk());
    await store.enviar("primer mensaje");
    const titulo = store.conversacionActiva!.titulo;

    await store.enviar("segundo mensaje distinto");

    expect(store.conversacionActiva!.titulo).toBe(titulo);
  });
});

describe("AssistantStore.conversacionesAgrupadas", () => {
  it("agrupa por fecha local de updatedAt en secciones y omite las vacías", () => {
    const store = new AssistantStore(engineOk());

    // Anclado a la medianoche LOCAL de hoy en vez de a `now - N días`. Las
    // fronteras reales del agrupador son `inicioDelDia`, `-24h` y `-7d`, todas
    // relativas a esa medianoche; partir de `now` desplazaba cada bucket un
    // poco y "Ayer" podía caer dentro de "Hoy" (o al revés) según la hora.
    const ahora = new Date();
    const inicioHoy = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate(),
    ).getTime();
    const iso = (offsetDias: number) =>
      new Date(inicioHoy - offsetDias * 24 * 60 * 60 * 1000).toISOString();

    // Sembramos conversaciones directamente con distintas fechas de updatedAt.
    store.conversaciones = [
      { id: "hoy", titulo: "Hoy", mensajes: [], createdAt: iso(0), updatedAt: iso(0) },
      { id: "ayer", titulo: "Ayer", mensajes: [], createdAt: iso(1), updatedAt: iso(1) },
      { id: "semana", titulo: "Semana", mensajes: [], createdAt: iso(4), updatedAt: iso(4) },
      { id: "viejo", titulo: "Viejo", mensajes: [], createdAt: iso(30), updatedAt: iso(30) },
    ];
    store.conversacionActivaId = "hoy";

    const grupos = store.conversacionesAgrupadas;
    const labels = grupos.map((g) => g.label);

    expect(labels).toEqual(["Hoy", "Ayer", "Últimos 7 días", "Anteriores"]);
    expect(grupos.find((g) => g.label === "Hoy")?.items[0].id).toBe("hoy");
    expect(grupos.find((g) => g.label === "Ayer")?.items[0].id).toBe("ayer");
    expect(grupos.find((g) => g.label === "Últimos 7 días")?.items[0].id).toBe("semana");
    expect(grupos.find((g) => g.label === "Anteriores")?.items[0].id).toBe("viejo");
  });

  it("ordena cada grupo por updatedAt descendente", () => {
    const store = new AssistantStore(engineOk());
    // Frontera inferior de "Hoy": `conversacionesAgrupadas` usa `t >= inicioDelDia`,
    // que es una medianoche LOCAL, no `now - 24h`. Restar horas desde `now`
    // cruzaba esa frontera cuando la suite corría de madrugada (p. ej. a las
    // 00:30, "3 horas atrás" ya era el día anterior) y el grupo "Hoy" quedaba
    // vacío. Estos tres instantes se construyen desde el inicio del día hacia
    // ADENTRO, así que nunca salen de "Hoy" y el orden sigue siendo inequívoco.
    const base = new Date();
    const inicioHoy = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
    ).getTime();
    const iso = (minutos: number) =>
      new Date(inicioHoy + minutos * 60 * 1000).toISOString();

    store.conversaciones = [
      { id: "a", titulo: "A", mensajes: [], createdAt: iso(60), updatedAt: iso(60) },
      { id: "b", titulo: "B", mensajes: [], createdAt: iso(180), updatedAt: iso(180) },
      { id: "c", titulo: "C", mensajes: [], createdAt: iso(120), updatedAt: iso(120) },
    ];
    store.conversacionActivaId = "a";

    const grupos = store.conversacionesAgrupadas;
    expect(grupos.map((g) => g.label)).toEqual(["Hoy"]);
    // Descendente por updatedAt: 180 (b) → 120 (c) → 60 (a).
    expect(grupos[0].items.map((c) => c.id)).toEqual(["b", "c", "a"]);
  });
});
