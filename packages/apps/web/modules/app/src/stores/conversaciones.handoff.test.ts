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
 *
 * ── Cambio del 22/09: el envío pasó a ser asíncrono y real ─────────────────
 *
 * `enviarComoNegocio` ya no escribe en `localStorage`: manda el mensaje al
 * servicio, que es el único que puede hablar con WhatsApp. Eso obliga a dos
 * cosas en estos tests:
 *
 *   1. `await` en todas las llamadas. Sin él, el test mide el estado ANTES de
 *      que la promesa resuelva y pasa por casualidad —«no se insertó» cuando en
 *      realidad «aún no se insertó»—, que es un falso verde.
 *   2. Un mock del repositorio de envío. Sin él, estos tests harían una llamada
 *      de red real: lentos, frágiles, y en CI fallarían por red en vez de por
 *      lógica. El mock permite además comprobar que la guarda de modo corta
 *      ANTES de intentar enviar, que es lo que de verdad se está midiendo.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Mock del envío. Se declara `vi.hoisted` porque `vi.mock` se eleva al principio
 * del archivo: una variable normal todavía no existiría cuando la fábrica corre.
 */
const { enviarMock } = vi.hoisted(() => ({
  enviarMock: vi.fn(async (_convId: string, texto: string) => ({
    ok: true as const,
    messageId: "wamid.TEST",
    mensajeId: "msg-test",
    enviadoEn: new Date().toISOString(),
    // `texto` se lee para que el mock no quede como parámetro muerto.
    _eco: texto,
  })),
}));

vi.mock("@/lib/envio.repo", () => ({
  enviarMensajeOperador: enviarMock,
}));

/** Stores frescos: el singleton se rehidrata de localStorage entre tests. */
async function storeFresco() {
  vi.resetModules();
  return import("./conversaciones.store");
}

describe("Handoff — el autor del mensaje debe corresponder a quien atiende", () => {
  beforeEach(() => {
    vi.resetModules();
    enviarMock.mockClear();
  });

  it("en modo bot, enviarComoNegocio NO inserta ningún mensaje (no-op)", async () => {
    const { conversacionesStore } = await storeFresco();
    const convId = "conv-1";
    const conv = conversacionesStore.getConversacion(convId);
    if (!conv) throw new Error(`sin ${convId}`);

    // conv-1 nace `abierta` + `atencion:"bot"` (el bot lo lleva).
    expect(conv.atencion).toBe("bot");

    const antes = conversacionesStore.lineaDeTiempo(convId).length;
    await conversacionesStore.enviarComoNegocio(convId, "ttttttt");
    const despues = conversacionesStore.lineaDeTiempo(convId);

    // La invariante: nada se agregó, y en particular ningún `autor:"negocio"`.
    expect(despues.length).toBe(antes);
    expect(despues.some((i) => i.clase === "mensaje" && i.data.autor === "negocio")).toBe(false);
    // Y lo importante: NO se intentó enviar nada a la red. La guarda corta antes
    // de gastar una llamada —y un mensaje real de WhatsApp— por un hilo del bot.
    expect(enviarMock).not.toHaveBeenCalled();
  });

  it("tras tomar(), el mismo envío SÍ entra como autor negocio (el bloqueo es por modo, no global)", async () => {
    const { conversacionesStore } = await storeFresco();
    const convId = "conv-1";

    conversacionesStore.tomar(convId, "ope-1");
    const conv = conversacionesStore.getConversacion(convId);
    expect(conv?.atencion).toBe("humano");

    await conversacionesStore.enviarComoNegocio(convId, "hola desde el asesor");

    const mensajes = conversacionesStore
      .lineaDeTiempo(convId)
      .filter((i) => i.clase === "mensaje");

    const ultimo = mensajes[mensajes.length - 1];
    expect(ultimo.clase).toBe("mensaje");
    if (ultimo.clase !== "mensaje") throw new Error("no es mensaje");
    expect(ultimo.data.autor).toBe("negocio");
    expect(ultimo.data.contenido.texto).toBe("hola desde el asesor");
    // Se comprobó que el mensaje sale de verdad: el store ya no se limita a
    // escribir en `localStorage` y pintar la burbuja.
    expect(enviarMock).toHaveBeenCalledTimes(1);
  });

  it("si el envío FALLA, la burbuja NO se pinta y se avisa (no se miente)", async () => {
    const { conversacionesStore } = await storeFresco();
    const convId = "conv-1";
    conversacionesStore.tomar(convId, "ope-1");

    enviarMock.mockResolvedValueOnce({
      ok: false as const,
      motivo: "no_enviado",
      detalle: "WhatsApp no aceptó el envío: HTTP 401: invalid key",
      reintentable: false,
      _eco: "",
    } as never);

    const antes = conversacionesStore.lineaDeTiempo(convId).length;
    await conversacionesStore.enviarComoNegocio(convId, "esto no debe aparecer");

    // El defecto que esto cierra: antes la burbuja se pintaba igual y el
    // operador creía haber respondido. Ahora el hilo no miente.
    expect(conversacionesStore.lineaDeTiempo(convId).length).toBe(antes);
    expect(conversacionesStore.ultimoErrorEnvio).toMatch(/no aceptó el envío/);
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
    await conversacionesStore.enviarComoNegocio(convId, "fffff");

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
    await conversacionesStore.enviarComoNegocio(convId, "no deberia entrar");
    expect(conversacionesStore.lineaDeTiempo(convId).length).toBe(antes);
  });
});
