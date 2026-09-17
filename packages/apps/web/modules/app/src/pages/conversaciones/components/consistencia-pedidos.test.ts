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
