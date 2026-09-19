import { describe, it, expect } from "vitest";
import { toOrderCore, toLegacyPedido } from "./pedidos.adapters.js";
import type { Pedido } from "../../stores/pedidos.store.js";

describe("Domain Adapters: Pedidos Strangler Fig", () => {
  const sampleLegacyPedido: Pedido = {
    id: "ped-test-1",
    numero: "P-042",
    cliente: "Santiago Bernabéu",
    telefono: "+573123456789",
    modalidad: "domicilio",
    items: [
      { nombre: "Pizza Margarita", cantidad: 1, precio: 32000 },
      { nombre: "Gaseosa 1.5L", cantidad: 2, precio: 6000 },
    ],
    notas: "Timbre malo, llamar.",
    estado: "en_preparacion",
    origen: "whatsapp",
    pagado: true,
    createdAt: "2026-09-19T10:00:00.000Z",
    estadoDesde: "2026-09-19T10:15:00.000Z",
    direccionEntrega: {
      calle: "Calle 10 # 40-20",
      barrio: "Poblado",
      referencia: "Apto 302",
      indicaciones: "Dejar en portería si no contesta",
    },
    costoEnvio: 5000,
    metodoPago: "transferencia",
    repartidor: "Mateo Moto 01",
  };

  it("convierte un Pedido legacy a OrderCore mapeando dimensiones ortogonales", () => {
    const core = toOrderCore(sampleLegacyPedido);

    expect(core.id).toBe("ped-test-1");
    expect(core.number).toBe("P-042");
    expect(core.customer.name).toBe("Santiago Bernabéu");
    expect(core.customer.phone).toBe("+573123456789");

    // Ítems convertidos a snapshots
    expect(core.items).toHaveLength(2);
    expect(core.items[0].nameSnapshot).toBe("Pizza Margarita");
    expect(core.items[0].unitPrice).toBe(32000);
    expect(core.items[0].quantity).toBe(1);

    // Pago mapeado
    expect(core.payment.status).toBe("paid");
    expect(core.payment.method).toBe("transfer");

    // Fulfillment mapeado
    expect(core.fulfillment.type).toBe("local_delivery");
    expect(core.fulfillment.status).toBe("in_preparation");
    expect(core.fulfillment.destination?.street).toBe("Calle 10 # 40-20");
    expect(core.fulfillment.courier).toBe("Mateo Moto 01");
    expect(core.fulfillment.shippingCost).toBe(5000);

    // Lifecycle
    expect(core.lifecycle).toBe("open");
    expect(core.origin).toBe("whatsapp");
  });

  it("convierte de OrderCore hacia Pedido legacy sin perder integridad", () => {
    const core = toOrderCore(sampleLegacyPedido);
    const roundtrip = toLegacyPedido(core);

    expect(roundtrip.id).toBe(sampleLegacyPedido.id);
    expect(roundtrip.numero).toBe(sampleLegacyPedido.numero);
    expect(roundtrip.cliente).toBe(sampleLegacyPedido.cliente);
    expect(roundtrip.telefono).toBe(sampleLegacyPedido.telefono);
    expect(roundtrip.modalidad).toBe("domicilio");
    expect(roundtrip.estado).toBe("en_preparacion");
    expect(roundtrip.pagado).toBe(true);
    expect(roundtrip.metodoPago).toBe("transferencia");
    expect(roundtrip.direccionEntrega?.calle).toBe("Calle 10 # 40-20");
    expect(roundtrip.repartidor).toBe("Mateo Moto 01");
  });
});
