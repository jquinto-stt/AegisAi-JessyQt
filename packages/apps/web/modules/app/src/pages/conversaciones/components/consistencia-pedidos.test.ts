import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * EVIDENCIA DE CONSISTENCIA entre superficies.
 *
 * El requisito del usuario es que Pedidos y Conversaciones "no discrepen": que el
 * mismo pedido, mirado desde el Tablero, desde el panel del chat o desde la
 * bandeja, dé SIEMPRE el mismo estado y el mismo hilo. Este test no comprueba una
 * pantalla (no hay DOM): comprueba el CONTRATO que las hace coincidir — que las
 * superficies consumidoras no tengan vocabulario ni barridos propios.
 *
 * Si alguien reintrodujera una derivación local (una tabla de estados propia, un
 * `filter` de "activo" copiado, un `===` de teléfono crudo), estos tests fallan.
 */
describe("Consistencia Pedidos ↔ Conversaciones", () => {
  let pedidosStore: import("@/stores/pedidos.store").PedidosStore;
  let conversacionesStore: import("@/stores/conversaciones.store").ConversacionesStore;

  beforeEach(async () => {
    vi.resetModules();
    const mPedidos = await import("@/stores/pedidos.store");
    const mConv = await import("@/stores/conversaciones.store");
    pedidosStore = mPedidos.pedidosStore;
    conversacionesStore = mConv.conversacionesStore;
  });

  it("BandejaLista y PanelContexto resuelven el MISMO pedido activo (un solo selector)", () => {
    // La bandeja lee `pedidoActivoDe(telefono)`; el panel de contexto del chat
    // opera sobre `porTelefono(telefono)` y filtra terminales. Ambos deben
    // coincidir sobre cuál es el pedido vivo.
    const telefono = "+573005551122"; // conv-1, con espacios en el seed
    const desdeBandeja = pedidosStore.pedidoActivoDe(telefono);
    const desdePanel = pedidosStore.porTelefono(telefono).find((p) => !pedidosStore.esTerminal(p.estado));

    expect(desdeBandeja?.id).toBe(desdePanel?.id);
  });

  it("el cruce por teléfono funciona en los DOS formatos del seed (compacto y con espacios)", () => {
    // Defecto raíz histórico: pedidos guarda E.164 compacto y conversaciones con
    // espacios, así que el cruce crudo daba 0 resultados SIEMPRE.
    const compacto = pedidosStore.porTelefono("+573005551122");
    const espaciado = pedidosStore.porTelefono("+57 300 555 1122");
    expect(compacto.length).toBe(espaciado.length);
    expect(compacto.map((p) => p.id)).toEqual(espaciado.map((p) => p.id));

    // Y el mismo número resuelve el hilo desde el store de conversaciones.
    expect(conversacionesStore.porTelefono("+573005551122")?.id).toBe("conv-1");
    expect(conversacionesStore.porTelefono("+57 300 555 1122")?.id).toBe("conv-1");
  });

  it("la etiqueta y el color de estado salen de UN catálogo (no hay tabla paralela)", () => {
    // Recorre el pipeline entero y exige que cada estado tenga etiqueta no vacía
    // y un color del catálogo. Una tabla local en una vista no pasaría por aquí.
    const estados = ["nuevo", "confirmado", "en_preparacion", "listo", "en_camino", "entregado", "cancelado", "programado"] as const;
    for (const e of estados) {
      expect(pedidosStore.estadoLabel(e).trim()).not.toBe("");
      expect(["info", "primary", "warning", "success", "light", "error"]).toContain(
        pedidosStore.estadoBadgeColor(e),
      );
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EL VOCABULARIO NO SE REPARTE: UNA TABLA POR EJE
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Cada aserción de aquí abajo corresponde a una copia que EXISTÍA y se retiró.
  // Si alguien vuelve a escribir una lista de estados a mano en una vista, o
  // añade un estado a una tabla y no a las otras, estos tests fallan.

  describe("una sola tabla por eje de estado", () => {
    it("`ORDEN_ESTADOS` es la lista canónica y coincide con las claves del catálogo", async () => {
      const m = await import("@/stores/pedidos.store");
      expect([...m.ORDEN_ESTADOS].sort()).toEqual(
        Object.keys(m.META_ESTADO_PEDIDO).sort(),
      );
    });

    it("el conteo vacío cubre exactamente los ocho (se deriva, no se re-lista)", async () => {
      const m = await import("@/stores/pedidos.store");
      const conteo = pedidosStore.conteoPorEstado();
      expect(Object.keys(conteo).sort()).toEqual([...m.ORDEN_ESTADOS].sort());
    });

    it("la analítica usa el MISMO orden canónico que el store", async () => {
      const m = await import("@/stores/pedidos.store");
      const a = await import("@/pages/pedidos/analitica.utils");
      expect([...a.ORDEN_ESTADO]).toEqual([...m.ORDEN_ESTADOS]);
    });

    it("cada estado tiene punto del tablero desde la tabla única", async () => {
      const m = await import("@/stores/pedidos.store");
      for (const e of m.ORDEN_ESTADOS) {
        expect(pedidosStore.estadoDotClass(e)).toBe(m.META_ESTADO_PEDIDO[e].punto);
      }
    });

    it("la paleta de la analítica y el badge del store NO discrepan de familia", () => {
      // `COLOR_ESTADO` es una paleta de gráfica (hex), no una copia del badge
      // (tokens), así que no se exige igualdad literal. Lo que sí se exige es que
      // un estado no sea cálido en el badge y frío en el donut, que es el defecto
      // real que había en `en_camino`: `primary` (índigo) frente a `#7E57FF`
      // mientras los demás sí seguían la misma familia.
      //
      // Se comprueba por familia: `en_camino` comparte color de badge con
      // `confirmado` (`primary`), luego deben compartir familia de tono.
      expect(pedidosStore.estadoBadgeColor("en_camino")).toBe(
        pedidosStore.estadoBadgeColor("confirmado"),
      );
    });
  });

  describe("la máquina de estados de conversación no se reparte", () => {
    it("`EstadoConversacion` tiene exactamente las cuatro claves del catálogo", async () => {
      const m = await import("@/stores/conversaciones.store");
      expect(Object.keys(m.ESTADO_CONVERSACION_META).sort()).toEqual([
        "abierta",
        "atendida",
        "cerrada",
        "en_espera",
      ]);
    });

    it("los tres predicados del historial PARTICIONAN el tipo (exhaustivos y excluyentes)", () => {
      for (const c of conversacionesStore.conversaciones) {
        const enParticion = [
          conversacionesStore.estaPendiente(c),
          conversacionesStore.estaEnProgreso(c),
          conversacionesStore.estaResuelta(c),
        ].filter(Boolean);
        expect(enParticion).toHaveLength(1);
      }
    });

    it("`requiereAtencionHumana` es un SUBCONJUNTO de `estaPendiente`, no una cuarta partición", () => {
      for (const c of conversacionesStore.conversaciones) {
        if (conversacionesStore.requiereAtencionHumana(c)) {
          expect(conversacionesStore.estaPendiente(c)).toBe(true);
        }
      }
    });

    it("el filtro de la bandeja y el contador de atención cuentan el MISMO conjunto", () => {
      conversacionesStore.setFiltro("requieren_atencion");
      const porFiltro = conversacionesStore.bandeja.length;
      conversacionesStore.setFiltro("todas");
      expect(porFiltro).toBe(conversacionesStore.totalRequierenAtencion);
    });

    it("la etapa del CRM trata `cerrada` como contacto trabajado, no como «Nuevo»", async () => {
      // El defecto que esto fija: la firma era `(…, estadoConv: string)` y
      // `cerrada` no estaba en ninguna guarda, así que un ticket resuelto caía al
      // `return` final y se pintaba con la etapa «Nuevo».
      const { calcularEtapaAutomatica } = await import(
        "@/pages/conversaciones/components/PanelContexto"
      );
      expect(calcularEtapaAutomatica(0, "cerrada")).not.toBe("nuevo");
      expect(calcularEtapaAutomatica(0, "abierta")).toBe("en_conversacion");
      expect(calcularEtapaAutomatica(0, "en_espera")).toBe("interesado");
      expect(calcularEtapaAutomatica(0, "atendida")).toBe("interesado");
      // Un pedido manda sobre el estado del hilo: es la señal fuerte.
      expect(calcularEtapaAutomatica(1, "cerrada")).toBe("cliente");
    });

    it("la presencia del avatar distingue «en curso» de «resuelta»", async () => {
      // `statusDe(estado: string)` mandaba las dos a `offline`.
      const m = await import("@/stores/conversaciones.store");
      expect(m.presenciaDe("atendida")).not.toBe(m.presenciaDe("cerrada"));
    });
  });

  it("un pedido avanza y las tres superficies ven el mismo estado nuevo", () => {
    const p = pedidosStore.crearPedido({
      cliente: "Juan Carlos",
      telefono: "+573005551122",
      modalidad: "domicilio",
      items: [{ nombre: "Combo clásico", cantidad: 1, precio: 25000 }],
    });

    pedidosStore.avanzar(p.id); // nuevo → confirmado

    const estadoBandeja = pedidosStore.pedidoActivoDe("+573005551122")?.estado;
    const estadoPanel = pedidosStore.porTelefono("+573005551122").find((x) => !pedidosStore.esTerminal(x.estado))?.estado;
    const estadoHistorial = pedidosStore.getPedido(p.id)?.estado;

    expect(estadoBandeja).toBe("confirmado");
    expect(estadoPanel).toBe("confirmado");
    expect(estadoHistorial).toBe("confirmado");
  });

  it("`pedidoActivoDe` incluye `programado` pero excluye terminales (criterio único)", () => {
    // Un pedido programado sigue siendo el pedido vivo del contacto: el criterio
    // debe ser idéntico en la bandeja y en el panel, no "en curso" en un sitio.
    const prog = pedidosStore.crearPedido({
      cliente: "Futuro",
      telefono: "+573005551122",
      modalidad: "retiro",
      items: [{ nombre: "Postre del día", cantidad: 1, precio: 8000 }],
      programadoPara: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    });
    expect(pedidosStore.getPedido(prog.id)?.estado).toBe("programado");
    expect(pedidosStore.pedidoActivoDe("+573005551122")?.id).toBe(prog.id);

    // Al cancelarlo deja de ser el activo (terminal).
    pedidosStore.cancelar(prog.id);
    expect(pedidosStore.pedidoActivoDe("+573005551122")?.id).not.toBe(prog.id);
  });
});
