/**
 * Verificación del defecto de handoff: escribir estando el hilo devuelto al bot.
 *
 * Defecto reportado: tras «Tomar chat» → «Devolver al bot», al escribir desde la
 * consola el mensaje aparecía rotulado como "Asesor Humano" y la barra seguía
 * habilitada.
 *
 * Causa: `enviarComoNegocio` fijaba `autor:"negocio"` sin mirar el Modo_De_Atencion,
 * y el `Composer` solo se bloqueaba por capacidad (`channels.respond`), nunca por
 * modo.
 *
 * Estos tests fijan la invariante que las dos reparaciones protegen:
 *   atencion "bot"  ⟹  ningún mensaje con autor "negocio" puede entrar al hilo.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

/** Stores frescos: el singleton se rehidrata de localStorage entre tests. */
async function storeFresco() {
  vi.resetModules();
  return import("./conversaciones.store");
}

describe("Handoff — el autor del mensaje debe corresponder a quien atiende", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("en modo bot, enviarComoNegocio NO inserta ningún mensaje (no-op)", async () => {
    const { conversacionesStore } = await storeFresco();
    const convId = "conv-1";
    const conv = conversacionesStore.getConversacion(convId);
    if (!conv) throw new Error(`sin ${convId}`);

    // conv-1 nace `abierta` + `atencion:"bot"` (el bot lo lleva).
    expect(conv.atencion).toBe("bot");

    const antes = conversacionesStore.lineaDeTiempo(convId).length;
    conversacionesStore.enviarComoNegocio(convId, "ttttttt");
    const despues = conversacionesStore.lineaDeTiempo(convId);

    // La invariante: nada se agregó, y en particular ningún `autor:"negocio"`.
    expect(despues.length).toBe(antes);
    expect(despues.some((i) => i.clase === "mensaje" && i.data.autor === "negocio")).toBe(false);
  });

  it("tras tomar(), el mismo envío SÍ entra como autor negocio (el bloqueo es por modo, no global)", async () => {
    const { conversacionesStore } = await storeFresco();
    const convId = "conv-1";

    conversacionesStore.tomar(convId, "ope-1");
    const conv = conversacionesStore.getConversacion(convId);
    expect(conv?.atencion).toBe("humano");

    conversacionesStore.enviarComoNegocio(convId, "hola desde el asesor");

    const mensajes = conversacionesStore
      .lineaDeTiempo(convId)
      .filter((i) => i.clase === "mensaje");

    const ultimo = mensajes[mensajes.length - 1];
    expect(ultimo.clase).toBe("mensaje");
    if (ultimo.clase !== "mensaje") throw new Error("no es mensaje");
    expect(ultimo.data.autor).toBe("negocio");
    expect(ultimo.data.contenido.texto).toBe("hola desde el asesor");
  });

  it("reproduce el flujo del reporte: devolver al bot vuelve a cerrar la escritura", async () => {
    const { conversacionesStore } = await storeFresco();
    const convId = "conv-1";

    conversacionesStore.tomar(convId, "ope-1");
    expect(conversacionesStore.getConversacion(convId)?.atencion).toBe("humano");

    conversacionesStore.devolver(convId);
    const conv = conversacionesStore.getConversacion(convId);
    expect(conv?.atencion).toBe("bot");
    expect(conv?.operadorAsignadoId).toBeNull();

    const antes = conversacionesStore.lineaDeTiempo(convId).length;
    conversacionesStore.enviarComoNegocio(convId, "fffff");

    // El paso que antes corrompía el hilo ahora es no-op.
    expect(conversacionesStore.lineaDeTiempo(convId).length).toBe(antes);
  });

  it("la guarda de modo usa `humano` y no `estado`, para no acoplar atención y máquina de estados", async () => {
    const { conversacionesStore } = await storeFresco();
    const convId = "conv-1";

    // `devolver` deja estado `abierta` (mismo string que el estado inicial del
    // seed), así que `estado` NO distingue "el bot lo lleva" de "nadie lo tocó":
    // solo `atencion` lo hace. Este test fija que la guarda lee `atencion`.
    conversacionesStore.tomar(convId, "ope-1");
    conversacionesStore.devolver(convId);

    const conv = conversacionesStore.getConversacion(convId);
    expect(conv?.estado).toBe("abierta"); // indistinguible del inicial
    expect(conv?.atencion).toBe("bot"); // esto es lo que sí distingue

    const antes = conversacionesStore.lineaDeTiempo(convId).length;
    conversacionesStore.enviarComoNegocio(convId, "no deberia entrar");
    expect(conversacionesStore.lineaDeTiempo(convId).length).toBe(antes);
  });
});
