/**
 * Selectores de atención de Conversaciones — la verdad única de
 * "¿este cliente necesita un asesor?".
 *
 * Contexto del defecto que estos tests protegen: la tarjeta "Clientes" de Inicio
 * construía su lista desde `pedidosStore.enCurso()` y rotulaba "Requiere
 * atención" con `pedidosStore.esUrgente` (el pedido tardó demasiado). El módulo
 * Conversaciones usaba el MISMO rótulo para otra cosa (`estado === "en_espera"`:
 * el cliente pidió un humano). Dos definiciones del mismo texto.
 *
 * La definición canónica pasa a ser la de conversación, y aquí se fija:
 *   requiere atención  ⟺  el cliente pidió un humano y nadie lo ha tomado.
 */
import { describe, it, expect, vi } from "vitest";

/**
 * Store fresco por test.
 *
 * `resetModules()` NO basta en este entorno: el store se hidrata de
 * `localStorage` en el constructor, así que una mutación de un test anterior
 * vuelve a entrar en el siguiente (el "store fresco" rehidrata el estado
 * persistido, no el seed). Limpiar la clave antes de importar es lo que
 * garantiza que cada test arranque del seed.
 *
 * En `environment: 'node'` no existe `localStorage`; la guarda de existencia
 * mantiene el helper válido en ambos entornos.
 */
async function storeFresco() {
  vi.resetModules();
  const mod = await import("./conversaciones.store");
  // Instancia NUEVA, no el singleton: el singleton se comparte entre imports
  // aunque se llame a `resetModules()`, así que mutarlo en un test contamina el
  // siguiente. Es el mismo patrón que `conversaciones.store.test.ts`.
  return { conversacionesStore: new mod.ConversacionesStore() };
}

describe("Atención — definición única de 'requiere atención'", () => {
  it("`en_espera` es el ÚNICO estado que requiere atención humana", async () => {
    const { conversacionesStore } = await storeFresco();

    for (const conv of conversacionesStore.conversaciones) {
      const esperado = conv.estado === "en_espera";
      expect(conversacionesStore.requiereAtencionHumana(conv)).toBe(esperado);
    }
  });

  it("sobre el seed, el que pidió humano es exactamente conv-5", async () => {
    const { conversacionesStore } = await storeFresco();

    // conv-5 es el único hilo `en_espera` del dataset (8 hilos, 8 intenciones).
    const requieren = conversacionesStore.requierenAtencion;
    expect(requieren.map((c) => c.id)).toEqual(["conv-5"]);
    expect(conversacionesStore.totalRequierenAtencion).toBe(1);
  });

  it("`noLeidos` NO implica requerir atención (son ejes distintos)", async () => {
    const { conversacionesStore } = await storeFresco();

    // Un hilo lo lleva el bot, con mensajes sin leer. Sigue sin necesitar humano:
    // "sin leer" es actividad, no una petición.
    const conv = conversacionesStore.getConversacion("conv-1");
    if (!conv) throw new Error("sin conv-1");
    conv.noLeidos = 5;

    expect(conversacionesStore.requiereAtencionHumana(conv)).toBe(false);
  });

  it("la antigüedad de `ultimaActividad` NO implica requerir atención", async () => {
    const { conversacionesStore } = await storeFresco();

    const conv = conversacionesStore.getConversacion("conv-1");
    if (!conv) throw new Error("sin conv-1");
    conv.ultimaActividad = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();

    // Lleva 5 h sin actividad y lo lleva el bot: no requiere a nadie.
    expect(conversacionesStore.requiereAtencionHumana(conv)).toBe(false);
  });

  it("tomar() saca el hilo de la cola de atención", async () => {
    const { conversacionesStore } = await storeFresco();
    expect(conversacionesStore.totalRequierenAtencion).toBe(1);

    conversacionesStore.tomar("conv-5", "ope-1");

    expect(conversacionesStore.totalRequierenAtencion).toBe(0);
  });

  it("solicitarHumano() mete el hilo en la cola de atención", async () => {
    const { conversacionesStore } = await storeFresco();
    expect(conversacionesStore.totalRequierenAtencion).toBe(1);

    conversacionesStore.solicitarHumano("conv-1");

    expect(conversacionesStore.totalRequierenAtencion).toBe(2);
    expect(conversacionesStore.requiereAtencionHumana(
      conversacionesStore.getConversacion("conv-1")!,
    )).toBe(true);
  });
});

describe("Atención — orden de la cola", () => {

  it("quien lleva MÁS tiempo esperando va PRIMERO (orden inverso al de la bandeja)", async () => {
    const { conversacionesStore } = await storeFresco();

    conversacionesStore.solicitarHumano("conv-1");
    conversacionesStore.solicitarHumano("conv-4");

    const requieren = conversacionesStore.requierenAtencion;
    expect(requieren.length).toBe(3);

    // Ascendente por ultimaActividad: el más antiguo primero.
    for (let i = 1; i < requieren.length; i++) {
      const prev = requieren[i - 1];
      const cur = requieren[i];
      expect(prev.ultimaActividad <= cur.ultimaActividad).toBe(true);
    }
  });

  it("no muta el array observable al ordenar", async () => {
    const { conversacionesStore } = await storeFresco();

    const antes = conversacionesStore.conversaciones.map((c) => c.id);
    conversacionesStore.requierenAtencion;
    const despues = conversacionesStore.conversaciones.map((c) => c.id);

    expect(despues).toEqual(antes);
  });
});

describe("Atención — el eje de atención y el de estado son independientes", () => {

  it("`laLlevaElBot` lee `atencion`, no `estado`", async () => {
    const { conversacionesStore } = await storeFresco();

    const conv = conversacionesStore.getConversacion("conv-5");
    if (!conv) throw new Error("sin conv-5");

    // conv-5 espera humano (`en_espera`) y su modo ya es "humano". Es el caso
    // que demuestra que el eje de atención NO se deriva del estado: un hilo
    // `atendida` también tiene atención "humano", y `abierta` puede ser bot.
    expect(conv.estado).toBe("en_espera");
    expect(conversacionesStore.laLlevaElBot(conv)).toBe(false);
  });

  it("`devolver()` deja estado abierta + atención bot, y el bot pasa a llevarlo", async () => {
    const { conversacionesStore } = await storeFresco();

    conversacionesStore.tomar("conv-5", "ope-1");
    expect(conversacionesStore.laLlevaElBot(
      conversacionesStore.getConversacion("conv-5")!,
    )).toBe(false);

    conversacionesStore.devolver("conv-5");

    const conv = conversacionesStore.getConversacion("conv-5")!;
    expect(conv.estado).toBe("abierta");
    expect(conversacionesStore.laLlevaElBot(conv)).toBe(true);
  });
});

describe("Atención — minutosEsperando", () => {

  it("mide desde `ultimaActividad` y nunca devuelve negativos", async () => {
    const { conversacionesStore } = await storeFresco();

    const conv = conversacionesStore.getConversacion("conv-5");
    if (!conv) throw new Error("sin conv-5");

    // Hace exactamente 90 minutos.
    conv.ultimaActividad = new Date(Date.now() - 90 * 60 * 1000).toISOString();
    const min = conversacionesStore.minutosEsperando(conv);
    expect(min).toBeGreaterThanOrEqual(89);
    expect(min).toBeLessThanOrEqual(91);

    // Una fecha futura (reloj desajustado) se satura a 0, no a un negativo.
    conv.ultimaActividad = new Date(Date.now() + 60_000).toISOString();
    expect(conversacionesStore.minutosEsperando(conv)).toBe(0);
  });
});
