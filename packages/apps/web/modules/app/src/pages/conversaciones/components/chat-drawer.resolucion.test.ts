import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Verifica el requisito de AGUAS ARRIBA del drawer: que las dos superficies que
 * lo invocan (Tablero Kanban e Inicio) no puedan discrepar sobre el mismo hilo.
 *
 * El drawer no recibe un teléfono ni un `convId`: recibe el PEDIDO y resuelve el
 * hilo por dentro con `conversacionesStore.porTelefono(pedido.telefono)`. Por eso
 * ambas superficies leen literalmente el mismo selector — no hay dos barridos
 * del array `conversaciones` que puedan divergir.
 *
 * Este test fija ese contrato: para cada pedido con hilo, el resolutor devuelve
 * SIEMPRE la misma conversación, sin importar el orden de las llamadas ni qué
 * superficie pregunte primero (el resolutor es puro y no muta estado).
 */
describe("ChatDrawer — una sola resolución de hilo para ambas superficies", () => {
  let store: import("@/stores/conversaciones.store").ConversacionesStore;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("@/stores/conversaciones.store");
    store = new mod.ConversacionesStore();
  });

  it("el mismo pedido resuelve idéntico hilo desde el tablero y desde inicio", () => {
    // Las dos superficies pasan el MISMO `pedido.telefono` al mismo selector.
    const desdeTablero = store.porTelefono("+573005551122");
    const desdeInicio = store.porTelefono("+573005551122");
    expect(desdeTablero?.id).toBe(desdeInicio?.id);
    expect(desdeTablero?.id).toBe("conv-1");
  });

  it("el orden de consulta no altera el resultado (el resolutor no muta estado)", () => {
    const primeroTablero = store.porTelefono("+573001112233");
    // Otra superficie consulta después: el resultado no debe cambiar.
    const luegoInicio = store.porTelefono("+573001112233");
    expect(luegoInicio).toEqual(primeroTablero);
    expect(luegoInicio?.id).toBe("conv-3");
  });

  it("un pedido con hilo cerrado resuelve ese mismo hilo (no lo oculta)", () => {
    // conv-8 (Diego Ramírez) está cerrada: el drawer debe resolverla y mostrar
    // el estado de solo-lectura, no un estado vacío que simule ausencia.
    const conv = store.porTelefono("+573021112233");
    expect(conv?.id).toBe("conv-8");
    expect(conv?.estado).toBe("cerrada");
  });

  it("un pedido sin hilo devuelve undefined en cualquier superficie", () => {
    // pd3 (+573003334455, Pedro Ramírez) no tiene conversación en el seed.
    expect(store.porTelefono("+573003334455")).toBeUndefined();
    expect(store.tieneConversacion("+573003334455")).toBe(false);
  });

  it("la resolución es estable entre los hilos del seed", () => {
    const esperado: Record<string, string> = {
      "+573005551122": "conv-1",
      "+573012223344": "conv-2",
      "+573001112233": "conv-3",
      "+573017773344": "conv-4",
    };
    for (const [telefono, id] of Object.entries(esperado)) {
      // Dos llamadas por teléfono, simulando las dos superficies.
      expect(store.porTelefono(telefono)?.id).toBe(id);
      expect(store.porTelefono(telefono)?.id).toBe(id);
    }
  });
});
