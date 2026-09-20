import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ModuloDestino } from "@/stores/conversaciones.types";

// ═══════════════════════════════════════════════════════════════════════════
// conversaciones.clasificacion.test.ts — Eje de INTENCIÓN
// ═══════════════════════════════════════════════════════════════════════════
//
// Estos tests blindan la tabla de derivación contra los 8 hilos del seed. La
// tabla NO es una opinión: sale de los timestamps reales de los dos seeds.
//
//   Hilo  1er mensaje   pedido referenciado   createdAt del pedido   estado
//   conv-1  45 min  —                          —                    abierta
//   conv-2  54 min  —                          —                    abierta
//   conv-3  45 min  pd1                        39 min               atendida
//   conv-4  20 min  pd6                      1500 min               abierta
//   conv-5  13 min  pd4                       140 min               en_espera
//   conv-6   8 min  pd5                        60 min               abierta
//   conv-7 105 min  (pd7, mismo teléfono)     300 min               atendida
//   conv-8 1030 min —                          —                    cerrada
//
// La fila que decide la PRECEDENCIA es conv-5: tiene a la vez un pedido anterior
// al hilo (pd4, 140 min > 13 min ⟹ "seguir_pedido" por la regla del pedido) y un
// escalamiento (`en_espera` + evento `handoff_solicitado`). Su intención debe ser
// `reclamar`. Si alguien reordena las guardas, este test cae.
//
// ═══════════════════════════════════════════════════════════════════════════

type StoreMod = typeof import("@/stores/conversaciones.store");
type PedidosMod = typeof import("@/stores/pedidos.store");
type ClasifMod = typeof import("./conversaciones.clasificacion");

describe("intencionDe — derivación por efectos observables", () => {
  let conversacionesStore: StoreMod["conversacionesStore"];
  let pedidosStore: PedidosMod["pedidosStore"];
  let intencionDe: ClasifMod["intencionDe"];

  beforeEach(async () => {
    // Entorno `node` sin localStorage: los stores arrancan con su seed.
    // `resetModules` + import dinámico garantizan que la clasificación se
    // enlaza a los MISMOS singletons frescos que usan los tests.
    vi.resetModules();
    conversacionesStore = (await import("@/stores/conversaciones.store"))
      .conversacionesStore;
    pedidosStore = (await import("@/stores/pedidos.store")).pedidosStore;
    intencionDe = (await import("./conversaciones.clasificacion")).intencionDe;
  });

  describe("los 8 hilos del seed clasifican según la tabla del diseño", () => {
    const TABLA: Array<[string, string]> = [
      ["conv-1", "consultar"], // consulta de producto, sin pedido
      ["conv-2", "consultar"], // disponibilidad, sin pedido
      ["conv-3", "comprar"], // el pedido pd1 nació en este hilo
      ["conv-4", "seguir_pedido"], // pd6 ya existía (entregado)
      ["conv-5", "reclamar"], // escalamiento gana a "seguir_pedido"
      ["conv-6", "seguir_pedido"], // pd5 ya existía (en camino)
      ["conv-7", "reclamar"], // handoff_solicitado + el cliente pidió persona
      ["conv-8", "consultar"], // horarios, cerrada sin pedido
    ];

    it.each(TABLA)("%s → %s", (convId, esperada) => {
      expect(intencionDe(convId)).toBe(esperada);
    });
  });

  describe("precedencia: reclamar gana a seguir_pedido", () => {
    it("conv-5 tiene pedido anterior Y escalamiento, y se clasifica como reclamar", () => {
      // Evidencia de que el pedido existe y es ANTERIOR al hilo: si la guarda de
      // escalamiento no fuera la primera, esta línea daría "seguir_pedido".
      expect(pedidosStore.getPedido("pd4")).toBeDefined();
      expect(intencionDe("conv-5")).toBe("reclamar");
    });

    it("conv-7 ya está `atendida` y sigue siendo reclamar: lo decide el EVENTO", () => {
      // El estado por sí solo no lo explicaría —Camila ya la tomó—, así que este
      // caso prueba la SEGUNDA vía de `reclamar`: el evento `handoff_solicitado`
      // sobrevive a la resolución del hilo, y saber que fue un reclamo sigue
      // siendo información útil aunque ya esté atendido.
      const conv = conversacionesStore.getConversacion("conv-7");
      expect(conv?.estado).toBe("atendida");
      expect(
        conversacionesStore
          .lineaDeTiempo("conv-7")
          .some(
            (it) =>
              it.clase === "evento" && it.data.tipo === "handoff_solicitado",
          ),
      ).toBe(true);
      expect(intencionDe("conv-7")).toBe("reclamar");
    });

    it("conv-5 es reclamar por ESTADO `en_espera`, sin necesidad del evento", () => {
      expect(conversacionesStore.getConversacion("conv-5")?.estado).toBe(
        "en_espera",
      );
      expect(intencionDe("conv-5")).toBe("reclamar");
    });
  });

  describe("el hilo cambia de intención SOLO cuando avanza", () => {
    it("pasa de consultar a comprar en cuanto nace un pedido, sin intervención", () => {
      // conv-2 (Carlos Mendoza) empieza como consulta de existencias.
      expect(intencionDe("conv-2")).toBe("consultar");

      // El cliente se decide y el pedido se registra AHORA: su `createdAt` es
      // posterior al primer mensaje del hilo ⟹ el pedido nació aquí.
      pedidosStore.crearPedido({
        cliente: "Carlos Mendoza",
        telefono: "+573012223344",
        origen: "whatsapp",
        modalidad: "retiro",
        items: [{ nombre: "Combo personal", cantidad: 1, precio: 18000 }],
      });

      // Nadie notificó nada, nadie guardó un campo: la intención se re-derivó.
      expect(intencionDe("conv-2")).toBe("comprar");
    });

    it("un pedido ANTERIOR al hilo no lo convierte en venta (conv-6)", () => {
      expect(intencionDe("conv-6")).toBe("seguir_pedido");
    });
  });

  describe("fail-closed", () => {
    it("una conversación inexistente es consultar, no un throw", () => {
      expect(intencionDe("conv-no-existe")).toBe("consultar");
    });

    it("no depende del orden de los mensajes dentro del hilo", () => {
      // El primer mensaje de conv-4 es a los 20 min y pd6 es de hace 1500 min:
      // el orden temporal es lo que decide, no la posición en el array.
      const items = conversacionesStore.lineaDeTiempo("conv-4");
      const primerMensaje = items.find((it) => it.clase === "mensaje");
      expect(primerMensaje).toBeDefined();
      expect(pedidosStore.getPedido("pd6")!.createdAt < primerMensaje!.data.timestamp)
        .toBe(true);
      expect(intencionDe("conv-4")).toBe("seguir_pedido");
    });
  });

  describe("catálogo de presentación", () => {
    it("toda intención tiene etiqueta y color", async () => {
      const { INTENCION_LABEL, INTENCION_BADGE } = await import(
        "./conversaciones.clasificacion"
      );
      const intenciones = [
        "consultar",
        "comprar",
        "seguir_pedido",
        "reclamar",
      ] as const;

      for (const i of intenciones) {
        expect(INTENCION_LABEL[i]).toBeTruthy();
        expect(INTENCION_BADGE[i]).toBeTruthy();
      }
    });
  });
});

describe("moduloPrincipalDe — dominio del hilo", () => {
  let conversacionesStore: StoreMod["conversacionesStore"];

  beforeEach(async () => {
    vi.resetModules();
    conversacionesStore = (await import("@/stores/conversaciones.store"))
      .conversacionesStore;
  });

  it("devuelve el módulo del ÚLTIMO mensaje etiquetado, no el primero", () => {
    // conv-2 toca `inventario` y su último mensaje NO está etiquetado: el
    // principal sigue siendo inventario (el último etiquetado), no "general".
    expect(conversacionesStore.moduloPrincipalDe("conv-2")).toBe("inventario");
    expect(conversacionesStore.modulosDe("conv-2")).toEqual(["inventario"]);
  });

  it("devuelve 'general' cuando ningún mensaje tiene dominio", () => {
    expect(conversacionesStore.moduloPrincipalDe("conv-8")).toBe("general");
    expect(conversacionesStore.modulosDe("conv-8")).toEqual([]);
  });

  it("es la simétrica de un solo valor de modulosDe", () => {
    // Para todo hilo, el principal está contenido en la lista de tocados.
    for (const conv of conversacionesStore.conversaciones) {
      const principal = conversacionesStore.moduloPrincipalDe(conv.id);
      if (principal === "general") continue;
      expect(conversacionesStore.modulosDe(conv.id)).toContain(principal);
    }
  });

  it("una conversación inexistente cae a 'general'", () => {
    expect(conversacionesStore.moduloPrincipalDe("conv-no-existe")).toBe(
      "general",
    );
  });
});

describe("MODULO_DESTINO_LABEL — catálogo de dominio", () => {
  let MODULO_DESTINO_LABEL: StoreMod["MODULO_DESTINO_LABEL"];

  beforeEach(async () => {
    vi.resetModules();
    MODULO_DESTINO_LABEL = (await import("@/stores/conversaciones.store"))
      .MODULO_DESTINO_LABEL;
  });

  /**
   * Lista COMPLETA de `ModuloDestino`, afirmada por el compilador.
   *
   * Antes esto era un array de literales dentro del test, que es una copia del
   * tipo: añadir un miembro a `ModuloDestino` no rompía nada y el test seguía
   * verde sin cubrirlo. Con un `Record<ModuloDestino, true>` el compilador
   * exige la entrada nueva, y entonces el `for` sí comprueba que tenga etiqueta.
   */
  const TODOS_LOS_DESTINOS: Record<ModuloDestino, true> = {
    pedidos: true,
    inventario: true,
    general: true,
  };

  it("todo ModuloDestino tiene etiqueta", () => {
    for (const m of Object.keys(TODOS_LOS_DESTINOS) as ModuloDestino[]) {
      expect(MODULO_DESTINO_LABEL[m].etiqueta).toBeTruthy();
    }
  });

  it("solo `pedidos` y `general` están disponibles: no se promete un módulo sin datos", () => {
    expect(MODULO_DESTINO_LABEL.pedidos.disponible).toBe(true);
    expect(MODULO_DESTINO_LABEL.general.disponible).toBe(true);
    expect(MODULO_DESTINO_LABEL.inventario.disponible).toBe(false);
  });

  it("no queda rastro de los módulos retirados", () => {
    // Guarda de la retirada: `turnos` y `agendamiento` salieron del vocabulario
    // de dominio. Si alguien los reintroduce en el catálogo, este test lo dice
    // por su nombre en vez de dejar una etiqueta que nadie lee.
    expect(Object.keys(MODULO_DESTINO_LABEL).sort()).toEqual([
      "general",
      "inventario",
      "pedidos",
    ]);
  });
});
