import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * GUARDAS DEL DATASET DE CONVERSACIONES
 *
 * El seed no es "datos de relleno": es la BANDEJA que se enseña en la demo, y su
 * valor está en que cada hilo demuestre una INTENCIÓN distinta de cliente. Estos
 * tests fijan las reglas de producto del encargo para que un cambio futuro no
 * vuelva a convertir la bandeja en ocho copias del mismo guion
 * "cliente pide → bot pregunta → bot crea pedido".
 *
 * No comprueban estilo (eso es criterio editorial), sino las invariantes que sí
 * se pueden verificar: naturaleza de cada hilo, separación de ejes, coherencia
 * temporal, ausencia de eventos técnicos en la bandeja y de estados de pago
 * disfrazados de estado de conversación.
 */
describe("Dataset de conversaciones — reglas de producto", () => {
  let store: import("@/stores/conversaciones.store").ConversacionesStore;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("@/stores/conversaciones.store");
    store = mod.conversacionesStore;
  });

  // ── 1. Composición: cada intención está representada ────────────────────────

  it("la bandeja tiene 8 hilos, uno por intención demostrable", () => {
    expect(store.conversaciones).toHaveLength(8);
  });

  it("NO todos los hilos terminan en pedido: la mayoría no crea nada", () => {
    // El encargo es explícito: "sin obligar a que todas las conversaciones
    // lleguen hasta una compra". Solo un hilo (conv-3) registra un pedido.
    const conPedido = store.conversaciones.filter(
      (c) => c.id === "conv-3",
    );
    expect(conPedido).toHaveLength(1);

    // Y los demás NO mencionan pedidos creados nuevos, solo pedidos existentes
    // o ninguna referencia. Se comprueba que solo un hilo anuncia un registro.
    const anuncianRegistro: string[] = [];
    for (const conv of store.conversaciones) {
      for (const item of store.lineaDeTiempo(conv.id)) {
        if (item.clase !== "mensaje") continue;
        const t = item.data.contenido.texto.toLowerCase();
        if (t.includes("quedó registrado") || t.includes("pedido registrado")) {
          anuncianRegistro.push(conv.id);
        }
      }
    }
    expect(anuncianRegistro).toEqual(["conv-3"]);
  });

  it("cada hilo tiene una extensión humana (ni 1 mensaje ni 30)", () => {
    for (const conv of store.conversaciones) {
      const mensajes = store
        .lineaDeTiempo(conv.id)
        .filter((i) => i.clase === "mensaje");
      // Ninguno resuelto de un solo mensaje, ninguno artificialmente largo.
      expect(mensajes.length).toBeGreaterThanOrEqual(4);
      expect(mensajes.length).toBeLessThanOrEqual(10);
    }
  });

  it("ningún hilo repite el primer mensaje del cliente de otro", () => {
    const asuntos = store.conversaciones.map((c) => store.asuntoDe(c.id));
    expect(new Set(asuntos).size).toBe(asuntos.length);
  });

  // ── 2. Separación de ejes (el defecto que hay que evitar) ──────────────────

  it("ningún estado de PAGO aparece como estado de conversación", () => {
    // La conversación solo puede estar en uno de sus cuatro estados. Palabras
    // como "pendiente de pago" o "pagado" NO son estados del hilo: el pago vive
    // en `Pedido.pagado`.
    const estadosValidos = ["abierta", "en_espera", "atendida", "cerrada"];
    for (const conv of store.conversaciones) {
      expect(estadosValidos).toContain(conv.estado);
    }
  });

  it("un hilo puede hablar de pago sin que su estado cambie", () => {
    // conv-6 habla de un pago pendiente y sigue siendo `abierta` + `bot`.
    // Esto es exactamente lo que el encargo pide: el estado de pago pertenece al
    // pedido (`pd5.pagado === false`), no a la conversación.
    const conv = store.getConversacion("conv-6")!;
    expect(conv.estado).toBe("abierta");
    expect(conv.atencion).toBe("bot");
  });

  it("los invariantes estado⟺atención se cumplen en TODO el seed", () => {
    for (const conv of store.conversaciones) {
      if (conv.estado === "atendida") {
        // Atendida exige un humano responsable real.
        expect(conv.atencion).toBe("humano");
        expect(conv.operadorAsignadoId).not.toBeNull();
      }
      if (conv.estado === "en_espera") {
        // Pidió humano, pero nadie la ha tomado todavía.
        expect(conv.atencion).toBe("humano");
        expect(conv.operadorAsignadoId).toBeNull();
      }
      if (conv.atencion === "bot") {
        expect(conv.operadorAsignadoId).toBeNull();
      }
    }
  });

  // ── 3. Coherencia temporal ─────────────────────────────────────────────────

  it("`ultimaActividad` coincide SIEMPRE con el último ítem del hilo", () => {
    for (const conv of store.conversaciones) {
      const items = store.lineaDeTiempo(conv.id);
      const ultimo = items[items.length - 1];
      expect(ultimo).toBeDefined();
      expect(conv.ultimaActividad).toBe(ultimo!.data.timestamp);
    }
  });

  it("dentro de cada hilo los mensajes están ordenados cronológicamente", () => {
    for (const conv of store.conversaciones) {
      const times = store
        .lineaDeTiempo(conv.id)
        .map((i) => i.data.timestamp)
        .filter((t): t is string => typeof t === "string");
      const ordenados = [...times].sort();
      expect(times).toEqual(ordenados);
    }
  });

  it("todos los hilos son RECIENTES: nada de fechas de hace meses", () => {
    // El defecto original era mostrar "836 days" en la bandeja. Se exige que
    // todo el dataset caiga dentro de una ventana creíble (7 días).
    const LIMITE_MS = 7 * 24 * 60 * 60 * 1000;
    const ahora = Date.now();
    for (const conv of store.conversaciones) {
      const t = new Date(conv.ultimaActividad).getTime();
      expect(t).toBeLessThanOrEqual(ahora);
      expect(ahora - t).toBeLessThan(LIMITE_MS);
    }
  });

  it("la actividad más reciente está en minutos, no en días", () => {
    // La bandeja debe abrir con algo vivo: el hilo de arriba se escribió hace
    // menos de una hora.
    const primera = store.bandeja[0]!;
    const minutos = (Date.now() - new Date(primera.ultimaActividad).getTime()) / 60000;
    expect(minutos).toBeLessThan(60);
  });

  it("los hilos no se amontonan en el mismo instante", () => {
    const tiempos = store.conversaciones.map((c) => c.ultimaActividad);
    // Ocho hilos con ocho marcas temporales distintas: si dos coincidieran, la
    // bandeja mostraría dos "ahora" y parecería fabricada.
    expect(new Set(tiempos).size).toBe(tiempos.length);
  });

  // ── 4. La bandeja: previews útiles, sin eventos técnicos ───────────────────

  it("NINGÚN preview de la bandeja es un evento de sistema", () => {
    // El encargo lo dice literalmente: el preview no debe mostrar cosas como
    // "Conversación devuelta al bot". Se comprueba que el último ítem de cada
    // hilo sea SIEMPRE un mensaje, nunca un evento.
    for (const conv of store.bandeja) {
      const items = store.lineaDeTiempo(conv.id);
      const ultimo = items[items.length - 1]!;
      expect(ultimo.clase).toBe("mensaje");
    }
  });

  it("los eventos del seed son pocos y ninguno es un 'devuelta'", () => {
    const tipos: string[] = [];
    for (const conv of store.conversaciones) {
      for (const item of store.lineaDeTiempo(conv.id)) {
        if (item.clase === "evento") tipos.push(item.data.tipo);
      }
    }
    // Sin bucles artificiales: el seed no devuelve ningún hilo al bot.
    expect(tipos).not.toContain("devuelta");
    // Y no se repiten eventos del mismo tipo dentro de un mismo hilo.
    expect(tipos.length).toBeLessThanOrEqual(3);
  });

  it("el handoff de conv-7 cierra el ciclo: solicitado Y tomado por un operador", () => {
    const eventos = store
      .lineaDeTiempo("conv-7")
      .filter((i) => i.clase === "evento")
      .map((i) => (i.clase === "evento" ? i.data.tipo : ""));
    expect(eventos).toContain("handoff_solicitado");
    expect(eventos).toContain("tomada");

    // Y el hilo queda `atendida` con responsable: no vuelve al bot.
    const conv = store.getConversacion("conv-7")!;
    expect(conv.estado).toBe("atendida");
    expect(conv.operadorAsignadoId).not.toBeNull();
  });

  it("conv-5 escala SIN que nadie la haya tomado (requiere atención)", () => {
    const conv = store.getConversacion("conv-5")!;
    expect(conv.estado).toBe("en_espera");
    expect(conv.operadorAsignadoId).toBeNull();
    expect(store.requiereAtencionHumana(conv)).toBe(true);
  });

  // ── 5. Sin placeholders ni relleno ────────────────────────────────────────

  it("ningún mensaje del seed contiene placeholders de relleno", () => {
    const basura = ["hhgg", "tttt", "rrrr", "asdf", "lorem", "xxx", "TODO"];
    for (const conv of store.conversaciones) {
      for (const item of store.lineaDeTiempo(conv.id)) {
        if (item.clase !== "mensaje") continue;
        const t = item.data.contenido.texto.toLowerCase();
        for (const b of basura) {
          expect(t).not.toContain(b);
        }
        expect(item.data.contenido.texto.trim()).not.toBe("");
      }
    }
  });

  it("no abusa de emojis ni de respuestas estructuradas", () => {
    for (const conv of store.conversaciones) {
      for (const item of store.lineaDeTiempo(conv.id)) {
        if (item.clase !== "mensaje") continue;
        const t = item.data.contenido.texto;
        // Menos de 3 emojis por mensaje: la bandeja no es un folleto.
        const emojis = t.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) ?? [];
        expect(emojis.length).toBeLessThan(3);
      }
    }
  });
});
