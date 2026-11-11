import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Seguimiento Pipeline — coherencia entre etapas, pedidos y mensajes", () => {
  let conversacionesStore: import("@/stores/conversaciones.store").ConversacionesStore;
  let pedidosStore: import("@/stores/pedidos.store").PedidosStore;
  let etapaDe: typeof import("./seguimiento.etapas").etapaDe;

  beforeEach(async () => {
    vi.resetModules();
    conversacionesStore = (await import("@/stores/conversaciones.store")).conversacionesStore;
    pedidosStore = (await import("@/stores/pedidos.store")).pedidosStore;
    etapaDe = (await import("./seguimiento.etapas")).etapaDe;
  });

  it("1. cada conversación de CONVERSACIONES_SEED cae en su etapa esperada del pipeline", () => {
    const porEtapa: Record<string, string[]> = {
      contacto_inicial: [],
      oferta_enviada: [],
      seguimiento: [],
      en_cierre: [],
      validacion_pago: [],
      null: [],
    };

    for (const conv of conversacionesStore.conversaciones) {
      const etapa = etapaDe(conv);
      porEtapa[etapa ?? "null"].push(conv.id);
    }

    expect(porEtapa.contacto_inicial.sort()).toEqual(
      ["conv-1", "conv-2", "conv-26", "conv-27"].sort(),
    );
    expect(porEtapa.oferta_enviada.sort()).toEqual(
      ["conv-28", "conv-34", "conv-35", "conv-36"].sort(),
    );
    expect(porEtapa.seguimiento.sort()).toEqual(
      ["conv-29", "conv-30", "conv-31", "conv-32"].sort(),
    );
    expect(porEtapa.en_cierre.sort()).toEqual(
      ["conv-3", "conv-12", "conv-20", "conv-33"].sort(),
    );
    expect(porEtapa.validacion_pago.sort()).toEqual(
      ["conv-6", "conv-10", "conv-11", "conv-19", "conv-22"].sort(),
    );
    expect(porEtapa.null.sort()).toEqual(
      [
        "conv-4",
        "conv-5",
        "conv-7",
        "conv-8",
        "conv-9",
        "conv-13",
        "conv-14",
        "conv-15",
        "conv-16",
        "conv-17",
        "conv-18",
        "conv-21",
        "conv-23",
        "conv-24",
        "conv-25",
        "conv-37",
      ].sort(),
    );
  });

  it("2. ningún hilo en contacto_inicial, oferta_enviada, seguimiento ni en_cierre tiene pedido pagado ni afirma estar en preparación", () => {
    const etapasPreviasACocina = new Set([
      "contacto_inicial",
      "oferta_enviada",
      "seguimiento",
      "en_cierre",
    ]);

    for (const conv of conversacionesStore.conversaciones) {
      const etapa = etapaDe(conv);
      if (!etapa || !etapasPreviasACocina.has(etapa)) continue;

      const pedido = pedidosStore.pedidoActivoDe(conv.contacto.telefono);
      if (etapa === "contacto_inicial" || etapa === "oferta_enviada" || etapa === "seguimiento") {
        expect(pedido, `${conv.id} en ${etapa} no debe tener pedido activo`).toBeUndefined();
      }

      if (pedido) {
        expect(pedido.pagado, `${conv.id} (${pedido.numero}) en ${etapa} no debe figurar pagado`).toBe(false);
        expect(pedido.cliente, `${conv.id} y ${pedido.numero} deben coincidir en nombre de cliente`).toBe(
          conv.contacto.nombre,
        );
      }

      const mensajes = conversacionesStore
        .lineaDeTiempo(conv.id)
        .filter((it) => it.clase === "mensaje");

      for (const m of mensajes) {
        if (m.clase !== "mensaje") continue;
        const txt = m.data.contenido.texto.toLowerCase();
        expect(txt, `${conv.id} (${m.data.id}) no debe afirmar que ya está en preparación`).not.toContain(
          "en preparación",
        );
        expect(txt, `${conv.id} (${m.data.id}) no debe afirmar que ya realizó el pago`).not.toContain(
          "ya realicé el pago",
        );
      }
    }
  });

  it("3. el primer nombre del contacto coincide con el saludo en los mensajes y ultimaActividad coincide con el último ítem", () => {
    for (const conv of conversacionesStore.conversaciones) {
      const items = conversacionesStore.lineaDeTiempo(conv.id);
      expect(items.length, `${conv.id} debe tener ítems en línea de tiempo`).toBeGreaterThan(0);

      const ultimo = items[items.length - 1]!;
      expect(conv.ultimaActividad, `${conv.id} ultimaActividad debe coincidir con último ítem`).toBe(
        ultimo.data.timestamp,
      );

      const primerNombre = conv.contacto.nombre.split(" ")[0]!;
      const textosBotONegocio = items
        .filter((it) => it.clase === "mensaje" && it.data.autor !== "cliente")
        .map((it) => (it.clase === "mensaje" ? it.data.contenido.texto : ""))
        .join(" ");

      expect(
        textosBotONegocio,
        `El hilo ${conv.id} (${conv.contacto.nombre}) debe mencionar a ${primerNombre} en las respuestas del bot/asesor`,
      ).toContain(primerNombre);
    }
  });

  it("4. todo pedido con origen 'whatsapp' tiene conversación vinculada en conversacionesStore, y viceversa", () => {
    for (const pedido of pedidosStore.pedidos) {
      const conv = conversacionesStore.porTelefono(pedido.telefono);
      if (pedido.origen === "whatsapp") {
        expect(conv, `El pedido ${pedido.id} (${pedido.numero}) con origen whatsapp debe tener conversación`).toBeDefined();
        expect(conv!.contacto.nombre).toBe(pedido.cliente);
      } else {
        expect(conv, `El pedido ${pedido.id} (${pedido.numero}) con origen operador no debe tener conversación huérfana`).toBeUndefined();
      }
    }

    for (const conv of conversacionesStore.conversaciones) {
      const pedidos = pedidosStore.porTelefono(conv.contacto.telefono);
      for (const p of pedidos) {
        expect(p.origen, `Pedido ${p.id} asociado a ${conv.id} debe tener origen whatsapp`).toBe("whatsapp");
      }
    }
  });

  it("5. al pasar un pedido a 'entregado' o 'cancelado', su conversación sale del embudo (null) y no rebota a contacto_inicial ni oferta_enviada", () => {
    // Caso 1: conv-3 (estado 'atendida', pedido pd1 en 'nuevo') -> al cancelar pd1 debe dar null, no 'oferta_enviada'
    const conv3 = conversacionesStore.getConversacion("conv-3")!;
    expect(etapaDe(conv3)).toBe("en_cierre");
    pedidosStore.cancelar("pd1");
    expect(pedidosStore.pedidoActivoDe(conv3.contacto.telefono)).toBeUndefined();
    expect(etapaDe(conv3)).toBeNull();

    // Caso 2: conv-20 (estado 'abierta', pedido pd14 en 'nuevo') -> al entregar pd14 debe dar null, no 'contacto_inicial'
    const conv20 = conversacionesStore.getConversacion("conv-20")!;
    expect(etapaDe(conv20)).toBe("en_cierre");
    while (pedidosStore.avanzar("pd14") !== null) {
      // avanzar hasta entregado
    }
    expect(pedidosStore.getPedido("pd14")!.estado).toBe("entregado");
    expect(pedidosStore.pedidoActivoDe(conv20.contacto.telefono)).toBeUndefined();
    expect(etapaDe(conv20)).toBeNull();
  });
});
