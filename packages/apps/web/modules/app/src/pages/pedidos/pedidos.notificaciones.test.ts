import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Tests del PUENTE Pedido → Conversaciones (`pedidos.notificaciones.ts`).
 *
 * El puente es la única pieza que conecta las plantillas de WhatsApp
 * (`pedidosStore.config.plantillas`, hasta ahora guardadas y nunca enviadas) con
 * el hilo real del cliente en `conversacionesStore`. Vive en la capa de UI
 * porque los dos stores no pueden importarse entre sí (invariante D2), así que
 * aquí se verifica que ese cruce hace exactamente lo que promete — y nada más.
 *
 * Bootstrap: `vi.resetModules()` antes de importar deja los módulos y sus
 * SINGLETONS recién creados (`pedidosStore`, `conversacionesStore`). El puente
 * captura esos mismos singletons al importarse, así que basta con importar el
 * puente DESPUÉS del reset y operar sobre los singletons — sin instanciar
 * stores sueltos que el puente no vería.
 */
describe("Puente Pedido → Conversaciones (notificaciones)", () => {
  let pedidosStore: import("@/stores/pedidos.store").PedidosStore;
  let conversacionesStore: import("@/stores/conversaciones.store").ConversacionesStore;
  let bridge: typeof import("./pedidos.notificaciones");

  beforeEach(async () => {
    vi.resetModules();
    const modPedidos = await import("@/stores/pedidos.store");
    const modConv = await import("@/stores/conversaciones.store");
    pedidosStore = modPedidos.pedidosStore;
    conversacionesStore = modConv.conversacionesStore;
    bridge = await import("./pedidos.notificaciones");
  });

  /**
   * Crea un pedido con el teléfono de un contacto que SÍ tiene hilo
   * (`conv-1` = "+57 300 555 1122", con espacios en el seed). Se usa el formato
   * compacto a propósito: prueba que el cruce normaliza.
   */
  const pedidoDeConv1 = () => {
    const p = pedidosStore.crearPedido({
      cliente: "Juan Carlos",
      telefono: "+573005551122",
      modalidad: "domicilio",
      items: [{ nombre: "Combo clásico", cantidad: 1, precio: 25000 }],
    });
    return pedidosStore.getPedido(p.id)!;
  };

  const conv1 = () => conversacionesStore.porTelefono("+573005551122")!;

  /** Nº de mensajes (no eventos) del hilo de conv-1. */
  const mensajesDeConv1 = () =>
    conversacionesStore
      .lineaDeTiempo("conv-1")
      .filter((i) => i.clase === "mensaje")
      .map((i) => i.data);

  /** El último mensaje del hilo, leído por la misma vía que usa la UI. */
  const ultimoMensajeDe = () => {
    const mensajes = mensajesDeConv1();
    return mensajes[mensajes.length - 1];
  };

  it("envía la plantilla del estado nuevo al avanzar, y el mensaje queda en el hilo", () => {
    const pedido = pedidoDeConv1();
    // `nuevo` → `confirmado`: el estado destino SÍ tiene plantilla.
    const resultado = bridge.avanzarPedido(pedido.id);

    expect(resultado).toBe("confirmado");
    const ultimo = ultimoMensajeDe();
    expect(ultimo.autor).toBe("bot");
    expect(ultimo.contenido.texto).toBe("Tu pedido fue confirmado y pronto entra en preparación.");
    expect(ultimo.payload?.pedidoId).toBe(pedido.id);
  });

  it("avanzar un pedido SIN conversación no rompe y no inventa un hilo", () => {
    const p = pedidosStore.crearPedido({
      cliente: "Sin Hilo",
      telefono: "+57 300 999 8888", // no existe en el seed
      modalidad: "retiro",
      items: [{ nombre: "Bebida 350ml", cantidad: 1, precio: 4000 }],
    });
    const antes = conversacionesStore.conversaciones.length;

    const resultado = bridge.avanzarPedido(p.id);

    expect(resultado).toBe("confirmado"); // el pedido SÍ avanzó
    expect(conversacionesStore.conversaciones.length).toBe(antes); // pero no se creó hilo
  });

  it("un estado de ENTRADA (nuevo) no tiene plantilla: fail-closed", () => {
    const pedido = pedidoDeConv1();
    const antes = mensajesDeConv1().length;

    // `nuevo` y `programado` no están en el mapa a propósito.
    const resultado = bridge.notificarCambioDeEstado(pedido);

    expect(resultado).toBe("sin_plantilla");
    expect(mensajesDeConv1().length).toBe(antes);
  });

  it("una plantilla vaciada en Configuración no envía un mensaje vacío", () => {
    const pedido = pedidoDeConv1();
    pedidosStore.updateConfig({
      plantillas: { ...pedidosStore.config.plantillas, confirmado: "   " },
    });
    const antes = mensajesDeConv1().length;

    const resultado = bridge.avanzarPedido(pedido.id);

    expect(resultado).toBe("confirmado");
    expect(mensajesDeConv1().length).toBe(antes);
  });

  it("lee la plantilla en el momento del envío: un cambio en Configuración se refleja", () => {
    const pedido = pedidoDeConv1();
    const textoCustom = "Aviso personalizado del negocio.";
    pedidosStore.updateConfig({
      plantillas: { ...pedidosStore.config.plantillas, confirmado: textoCustom },
    });

    bridge.avanzarPedido(pedido.id);

    expect(ultimoMensajeDe().contenido.texto).toBe(textoCustom);
  });

  it("cancelarPedido avisa con la plantilla de cancelación", () => {
    const pedido = pedidoDeConv1();

    const aplicado = bridge.cancelarPedido(pedido.id);

    expect(aplicado).toBe(true);
    expect(ultimoMensajeDe().contenido.texto).toBe(
      "Tu pedido fue cancelado. Si tienes dudas, escríbenos.",
    );
  });

  it("moverPedidoA notifica solo si el movimiento se aplicó (transición inválida = sin aviso)", () => {
    const pedido = pedidoDeConv1();
    const antes = mensajesDeConv1().length;

    // `nuevo` → `entregado` no es un salto válido del pipeline.
    const aplicado = bridge.moverPedidoA(pedido.id, "entregado");

    expect(aplicado).toBe(false);
    expect(mensajesDeConv1().length).toBe(antes);
  });

  it("el mensaje del bot NO incrementa los no leídos del hilo", () => {
    const pedido = pedidoDeConv1();
    const noLeidosAntes = conv1().noLeidos;

    bridge.avanzarPedido(pedido.id);

    expect(conv1().noLeidos).toBe(noLeidosAntes);
  });

  it("el mensaje publicado queda etiquetado con el módulo Pedidos", () => {
    const pedido = pedidoDeConv1();

    bridge.avanzarPedido(pedido.id);

    // `moduloContexto` es lo que permite al filtro transversal reconocer que este
    // hilo fue tocado por Pedidos, sin que el store de conversaciones sepa nada
    // del dominio de pedidos (invariante D2).
    expect(ultimoMensajeDe().moduloContexto).toBe("pedidos");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// NOVEDAD DE ENTREGA — nota + estado + aviso en una operación
// ═══════════════════════════════════════════════════════════════════════════
//
// Se prueba aquí, y no en el modal, porque el cruce Pedido→Conversaciones solo
// puede verificarse con los dos singletons vivos — que es exactamente lo que
// este archivo monta. El modal es un `.tsx` y va por arnés de navegador.
describe("Puente — reportarNovedadEntrega", () => {
  let pedidosStore: import("@/stores/pedidos.store").PedidosStore;
  let conversacionesStore: import("@/stores/conversaciones.store").ConversacionesStore;
  let bridge: typeof import("./pedidos.notificaciones");

  beforeEach(async () => {
    vi.resetModules();
    const modPedidos = await import("@/stores/pedidos.store");
    const modConv = await import("@/stores/conversaciones.store");
    pedidosStore = modPedidos.pedidosStore;
    conversacionesStore = modConv.conversacionesStore;
    bridge = await import("./pedidos.notificaciones");
  });

  /** Pedido de domicilio con hilo abierto, llevado hasta `en_camino`. */
  const pedidoEnCamino = () => {
    const p = pedidosStore.crearPedido({
      cliente: "Juan Carlos",
      telefono: "+573005551122",
      modalidad: "domicilio",
      items: [{ nombre: "Combo clásico", cantidad: 1, precio: 25000 }],
      // Explícito: `crearPedido` por defecto marca los pedidos como `"operador"`
      // (los crea el negocio). Sin esto el aviso no se intenta siquiera, y la
      // prueba del envío pasaría a medir la guarda de origen en vez del envío.
      origen: "whatsapp",
    });
    const id = p.id;
    pedidosStore.avanzar(id); // confirmado
    pedidosStore.avanzar(id); // en_preparacion
    pedidosStore.avanzar(id); // listo
    pedidosStore.avanzar(id); // en_camino
    expect(pedidosStore.getPedido(id)!.estado).toBe("en_camino");
    return pedidosStore.getPedido(id)!;
  };

  const mensajesDeConv1 = () =>
    conversacionesStore
      .lineaDeTiempo("conv-1")
      .filter((i) => i.clase === "mensaje")
      .map((i) => i.data);

  const ultimoMensajeDe = () => {
    const m = mensajesDeConv1();
    return m[m.length - 1];
  };

  const BLOQUE = "[Novedad Logística 15:30] Cliente no responde en el domicilio. Intento fallido.";

  it("cancelar: anexa la nota, deja el pedido cancelado y avisa al cliente", () => {
    const pedido = pedidoEnCamino();
    const antes = mensajesDeConv1().length;

    const r = bridge.reportarNovedadEntrega(pedido.id, BLOQUE, "cancelar");

    expect(r).toEqual({ nota: true, estado: true, aviso: "enviado" });
    const p = pedidosStore.getPedido(pedido.id)!;
    expect(p.notas).toBe(BLOQUE);
    expect(p.estado).toBe("cancelado");
    expect(p.finishedAt).toBeTruthy();
    expect(mensajesDeConv1().length).toBe(antes + 1);
    expect(ultimoMensajeDe().contenido.texto).toBe(
      "Tu pedido fue cancelado. Si tienes dudas, escríbenos.",
    );
    expect(ultimoMensajeDe().payload?.pedidoId).toBe(pedido.id);
  });

  it("reintentar: devuelve el pedido a 'listo' y NO manda la plantilla de cancelación", () => {
    // Mandarle «tu pedido fue cancelado» a un cliente al que le vamos a llevar
    // el pedido mañana sería una mentira; el reintento no avisa.
    const pedido = pedidoEnCamino();
    const antes = mensajesDeConv1().length;

    const r = bridge.reportarNovedadEntrega(pedido.id, BLOQUE, "reintentar");

    expect(r.nota).toBe(true);
    expect(r.estado).toBe(true);
    const p = pedidosStore.getPedido(pedido.id)!;
    expect(p.estado).toBe("listo");
    expect(p.notas).toBe(BLOQUE);
    expect(mensajesDeConv1().length).toBe(antes);
  });

  it("NO pisa las notas que ya traía el pedido", () => {
    // La regresión que motiva que la nota se anexe: el patrón anterior del
    // Tablero (`pedido.notas = \`Cancelado: ${motivo}\``) borraba lo del cliente.
    const pedido = pedidoEnCamino();
    pedidosStore.anexarNota(pedido.id, "Sin cebolla en uno.");

    bridge.reportarNovedadEntrega(pedido.id, BLOQUE, "cancelar");

    const p = pedidosStore.getPedido(pedido.id)!;
    expect(p.notas).toBe(`Sin cebolla en uno.\n${BLOQUE}`);
    expect(p.notas).toContain("Sin cebolla en uno.");
  });

  it("un pedido de origen «operador» no inventa hilo y lo declara", () => {
    const p = pedidosStore.crearPedido({
      cliente: "Mostrador",
      telefono: "+573005551122", // MISMO teléfono con hilo: la guarda es el origen, no el cruce
      modalidad: "domicilio",
      items: [{ nombre: "Combo", cantidad: 1, precio: 1000 }],
      origen: "operador",
    });
    const id = p.id;
    for (let i = 0; i < 4; i++) pedidosStore.avanzar(id);
    const antes = mensajesDeConv1().length;

    const r = bridge.reportarNovedadEntrega(id, BLOQUE, "cancelar");

    // Sin la guarda de origen, el cruce por teléfono habría encontrado el hilo
    // y habría avisado «a Juan Carlos» de un pedido de mostrador que no es suyo.
    expect(r.aviso).toBe("sin_conversacion");
    expect(mensajesDeConv1().length).toBe(antes);
    expect(pedidosStore.getPedido(id)!.notas).toBe(BLOQUE);
  });

  it("un pedido de WhatsApp sin hilo no revienta: el estado se aplica igual", () => {
    const p = pedidosStore.crearPedido({
      cliente: "Sin Hilo",
      telefono: "+57 300 999 8888",
      modalidad: "domicilio",
      items: [{ nombre: "Bebida", cantidad: 1, precio: 4000 }],
      origen: "whatsapp",
    });
    const id = p.id;
    for (let i = 0; i < 4; i++) pedidosStore.avanzar(id);
    const hilosAntes = conversacionesStore.conversaciones.length;

    const r = bridge.reportarNovedadEntrega(id, BLOQUE, "cancelar");

    expect(r.aviso).toBe("sin_conversacion");
    expect(pedidosStore.getPedido(id)!.estado).toBe("cancelado");
    expect(conversacionesStore.conversaciones.length).toBe(hilosAntes);
  });

  it("si el estado no aplica, la nota NO afirma una novedad que no se registró", () => {
    // `moverEstado` rechaza desde un terminal. La nota se escribe primero, así
    // que el resultado tiene que REPORTAR que el estado no se aplicó en vez de
    // fingir éxito.
    const pedido = pedidoEnCamino();
    pedidosStore.cancelar(pedido.id);
    expect(pedidosStore.getPedido(pedido.id)!.estado).toBe("cancelado");

    const r = bridge.reportarNovedadEntrega(pedido.id, BLOQUE, "reintentar");

    // `reintentarEntrega` no acepta un terminal: la bandera lo dice.
    expect(r.estado).toBe(false);
    expect(pedidosStore.getPedido(pedido.id)!.estado).toBe("cancelado");
  });

  it("un bloque vacío no escribe nota pero sí mueve el estado", () => {
    const pedido = pedidoEnCamino();

    const r = bridge.reportarNovedadEntrega(pedido.id, "   ", "cancelar");

    expect(r.nota).toBe(false);
    expect(r.estado).toBe(true);
    expect(pedidosStore.getPedido(pedido.id)!.notas).toBeUndefined();
  });

  it("deja el hilo etiquetado con el módulo Pedidos", () => {
    const pedido = pedidoEnCamino();

    bridge.reportarNovedadEntrega(pedido.id, BLOQUE, "cancelar");

    expect(ultimoMensajeDe().moduloContexto).toBe("pedidos");
    expect(ultimoMensajeDe().autor).toBe("bot");
  });
});
