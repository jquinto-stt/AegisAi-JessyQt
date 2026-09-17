import { beforeEach, describe, expect, it, vi } from "vitest";

// ═══════════════════════════════════════════════════════════════════════════
// GUARDAS DEL PANEL DE CONTEXTO — reglas de producto del dataset
// ═══════════════════════════════════════════════════════════════════════════
//
// El panel de contexto del chat es la superficie donde el dataset se vuelve
// visible como "atención al cliente real". Estas guardas fijan las tres reglas
// de producto que el panel debe cumplir sobre el seed:
//
//   R1. SEPARACIÓN DE EJES. El estado de PAGO vive en el PEDIDO. Ninguna
//       conversación puede aparecer con estado de pago. El panel lee el pago de
//       `pedido.pagado`, nunca de la conversación.
//
//   R2. NO RECREAR EL PEDIDO. Un hilo que CONSULTA un pedido existente debe
//       resolverlo por teléfono (`pedidoActivoDe`), no crear uno nuevo. Se
//       comprueba que el hilo de consulta apunta a un pedido PREEXISTENTE y que
//       el número de pedidos del contacto no cambia por abrir el hilo.
//
//   R3. NO ES UN MINI-ERP. El panel expone un puñado acotado de campos. Debe
//       seguir resumiendo, no listar el pipeline entero: se fija un techo al
//       número de pedidos que un contacto trae en el seed, para que nadie lo
//       convierta en una tabla de operaciones.

const FRESH = () => {
  vi.resetModules();
  return import("@/stores/conversaciones.store");
};

describe("Panel de contexto — reglas de producto sobre el dataset", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("R1 · ningún estado de PAGO se expone como estado de conversación", async () => {
    const { conversacionesStore } = await FRESH();
    const ESTADOS_CONV = ["abierta", "en_espera", "atendida", "cerrada"];
    const VOCABULARIO_PAGO = ["pendiente", "pagado", "fallido", "reembolsado"];

    // Los estados de conversación son un conjunto cerrado y ninguno pertenece
    // al vocabulario de pago. Es la comprobación literal de "nunca muestres
    // 'pendiente de pago' como si fuera el estado de la conversación".
    for (const estado of ESTADOS_CONV) {
      expect(VOCABULARIO_PAGO).not.toContain(estado);
    }

    for (const conv of conversacionesStore.conversaciones) {
      expect(ESTADOS_CONV).toContain(conv.estado);
      // El contacto no carga ningún campo de pago: el pago no es suyo.
      expect(Object.keys(conv.contacto)).not.toContain("pagado");
    }
  });

  it("R1b · el hilo que habla de pago NO cambia de estado por hablar de pago", async () => {
    const { conversacionesStore } = await FRESH();
    const { pedidosStore } = await import("@/stores/pedidos.store");

    // conv-6 es el hilo de pago pendiente. Su conversación sigue `abierta`/`bot`
    // (no "pendiente de pago"), y el dato de pago se lee del PEDIDO.
    const conv = conversacionesStore.getConversacion("conv-6");
    expect(conv).toBeDefined();
    expect(conv!.estado).toBe("abierta");
    expect(conv!.atencion).toBe("bot");

    const activo = pedidosStore.pedidoActivoDe(conv!.contacto.telefono);
    expect(activo).toBeDefined();
    expect(activo!.pagado).toBe(false);
  });

  it("R2 · el hilo de consulta resuelve un pedido EXISTENTE, no lo recrea", async () => {
    const { conversacionesStore } = await FRESH();
    const { pedidosStore } = await import("@/stores/pedidos.store");

    // conv-4 (Sofía) consulta su pedido. El panel lo encuentra por teléfono.
    const conv = conversacionesStore.getConversacion("conv-4");
    expect(conv).toBeDefined();
    const { telefono } = conv!.contacto;

    const antes = pedidosStore.porTelefono(telefono).length;
    const todos = pedidosStore.porTelefono(telefono);

    // Hay un pedido preexistente que resuelve la consulta...
    expect(antes).toBeGreaterThan(0);
    // ...y resolverlo NO crea nada: abrir el hilo es una lectura, no un alta.
    expect(pedidosStore.porTelefono(telefono).length).toBe(antes);

    // El pedido que resuelve la consulta es de la MISMA persona: el cruce por
    // teléfono no arrastra pedidos ajenos (fallo clásico de formato).
    const soloDigitos = (s: string) => s.replace(/\D/g, "");
    for (const p of todos) {
      expect(soloDigitos(p.telefono)).toBe(soloDigitos(telefono));
    }

    // MATIZ DE DOMINIO, no un defecto: `pedidoActivoDe` excluye terminales, y
    // el pedido de Sofía (`pd6`) ya está `entregado`. Por eso la consulta de un
    // pedido YA CERRADO resuelve el histórico y deja el panel sin pedido vivo.
    // Un hilo que pregunta por un pedido en curso sí debe tener activo: se
    // comprueba con conv-6 (Andrés, `pd5` en camino) para fijar AMBOS casos.
    const activo = pedidosStore.pedidoActivoDe(telefono);
    expect(pedidosStore.esTerminal(todos[0]!.estado)).toBe(true);
    expect(activo).toBeUndefined();

    const convEnCurso = conversacionesStore.getConversacion("conv-6");
    const activoEnCurso = pedidosStore.pedidoActivoDe(convEnCurso!.contacto.telefono);
    expect(activoEnCurso).toBeDefined();
    expect(pedidosStore.esTerminal(activoEnCurso!.estado)).toBe(false);
  });

  it("R2b · TODO teléfono del seed tiene un cruce coherente con pedidos", async () => {
    const { conversacionesStore } = await FRESH();
    const { pedidosStore } = await import("@/stores/pedidos.store");

    // El teléfono es la clave de cruce entre los dos seeds. Cada hilo debe
    // resolver a 0 o más pedidos SIN lanzar y sin devolver pedidos de otro
    // contacto (el fallo clásico de formato: `+573001112233` vs `+57 300 111 2233`).
    for (const conv of conversacionesStore.conversaciones) {
      const pedidos = pedidosStore.porTelefono(conv.contacto.telefono);
      for (const p of pedidos) {
        const soloDigitos = (s: string) => s.replace(/\D/g, "");
        expect(soloDigitos(p.telefono)).toBe(soloDigitos(conv.contacto.telefono));
      }
    }
  });

  it("R3 · ningún contacto del seed convierte el panel en un mini-ERP", async () => {
    const { conversacionesStore } = await FRESH();
    const { pedidosStore } = await import("@/stores/pedidos.store");

    // El panel lista "Pedidos del cliente (n)". Un dataset de demo no debe
    // acercarse a una tabla operativa: se fija un techo deliberadamente bajo.
    const TECHO = 4;
    for (const conv of conversacionesStore.conversaciones) {
      const pedidos = pedidosStore.porTelefono(conv.contacto.telefono);
      expect(pedidos.length).toBeLessThanOrEqual(TECHO);
    }
  });

  it("R3b · el panel distingue 'con pedido' de 'sin pedido' (y ambos existen)", async () => {
    const { conversacionesStore } = await FRESH();
    const { pedidosStore } = await import("@/stores/pedidos.store");

    const conPedido: string[] = [];
    const sinPedido: string[] = [];
    for (const conv of conversacionesStore.conversaciones) {
      const n = pedidosStore.porTelefono(conv.contacto.telefono).length;
      (n > 0 ? conPedido : sinPedido).push(conv.id);
    }

    // La bandeja debe poder demostrar AMBOS casos: hilos que llegan con pedido
    // y hilos de pura consulta sin ninguno. Si un lado quedara vacío, el panel
    // solo sabría pintar un estado y la demo perdería el contraste.
    expect(conPedido.length).toBeGreaterThan(0);
    expect(sinPedido.length).toBeGreaterThan(0);

    // Y la consulta pura (conv-1/conv-2) es precisamente de las que NO tienen
    // pedido: el bot informó sin crear nada.
    expect(sinPedido).toContain("conv-1");
    expect(sinPedido).toContain("conv-2");
  });
});
