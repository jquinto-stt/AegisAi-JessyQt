import { describe, it, expect, beforeEach } from "vitest";
import { PedidosStore, type Pedido, type Modalidad } from "./pedidos.store";

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Crea un store limpio y le añade un pedido nuevo, devolviendo ambos. */
function nuevoStoreConPedido(modalidad: Modalidad = "domicilio"): { store: PedidosStore; pedido: Pedido } {
  const store = new PedidosStore();
  // Empezamos desde una lista vacía para aislar el pedido bajo prueba del seed.
  store.pedidos = [];
  const pedido = store.crearPedido({
    cliente: "Test Cliente",
    telefono: "+573000000000",
    modalidad,
    items: [{ nombre: "Item", cantidad: 1, precio: 1000 }],
    origen: "whatsapp",
  });
  return { store, pedido };
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("PedidosStore — creación", () => {
  it("crea un pedido en estado 'nuevo'", () => {
    const { pedido } = nuevoStoreConPedido();
    expect(pedido.estado).toBe("nuevo");
    expect(pedido.numero).toMatch(/^P-\d{3}$/);
    expect(pedido.createdAt).toBeTruthy();
    expect(pedido.estadoDesde).toBe(pedido.createdAt);
  });

  it("respeta el origen indicado (whatsapp/operador)", () => {
    const store = new PedidosStore();
    store.pedidos = [];
    const p1 = store.crearPedido({ cliente: "A", telefono: "+1", modalidad: "retiro", items: [] });
    const p2 = store.crearPedido({ cliente: "B", telefono: "+2", modalidad: "retiro", items: [], origen: "whatsapp" });
    expect(p1.origen).toBe("operador"); // default
    expect(p2.origen).toBe("whatsapp");
  });
});

describe("PedidosStore — avance por el pipeline (domicilio, config completa)", () => {
  let store: PedidosStore;
  let pedido: Pedido;

  beforeEach(() => {
    ({ store, pedido } = nuevoStoreConPedido("domicilio"));
  });

  it("avanza nuevo → confirmado → en_preparacion → listo → en_camino → entregado", () => {
    expect(store.avanzar(pedido.id)).toBe("confirmado");
    expect(store.avanzar(pedido.id)).toBe("en_preparacion");
    expect(store.avanzar(pedido.id)).toBe("listo");
    expect(store.avanzar(pedido.id)).toBe("en_camino");
    expect(store.avanzar(pedido.id)).toBe("entregado");
    // Ya es terminal: no avanza más.
    expect(store.avanzar(pedido.id)).toBeNull();
    expect(store.getPedido(pedido.id)!.estado).toBe("entregado");
  });

  it("marca finishedAt al llegar a entregado", () => {
    for (let i = 0; i < 5; i++) store.avanzar(pedido.id);
    const p = store.getPedido(pedido.id)!;
    expect(p.estado).toBe("entregado");
    expect(p.finishedAt).toBeTruthy();
  });
});

describe("PedidosStore — modalidad y estados opcionales", () => {
  it("un pedido de retiro salta 'en_camino' (listo → entregado)", () => {
    const { store, pedido } = nuevoStoreConPedido("retiro");
    expect(store.avanzar(pedido.id)).toBe("confirmado");
    expect(store.avanzar(pedido.id)).toBe("en_preparacion");
    expect(store.avanzar(pedido.id)).toBe("listo");
    expect(store.avanzar(pedido.id)).toBe("entregado"); // sin en_camino
  });

  it("con 'confirmado' desactivado en config, salta ese estado", () => {
    const { store, pedido } = nuevoStoreConPedido("retiro");
    store.updateConfig({ usarConfirmado: false });
    expect(store.avanzar(pedido.id)).toBe("en_preparacion"); // salta confirmado
  });

  it("con 'en_camino' desactivado en config, un domicilio no lo usa", () => {
    const { store, pedido } = nuevoStoreConPedido("domicilio");
    store.updateConfig({ usarEnCamino: false });
    store.avanzar(pedido.id); // confirmado
    store.avanzar(pedido.id); // en_preparacion
    store.avanzar(pedido.id); // listo
    expect(store.avanzar(pedido.id)).toBe("entregado"); // sin en_camino
  });
});

describe("PedidosStore — transiciones inválidas", () => {
  it("rechaza saltarse estados (nuevo → listo)", () => {
    const { store, pedido } = nuevoStoreConPedido("domicilio");
    expect(store.moverEstado(pedido.id, "listo")).toBe(false);
    expect(store.getPedido(pedido.id)!.estado).toBe("nuevo");
  });

  it("rechaza retroceder (en_preparacion → nuevo)", () => {
    const { store, pedido } = nuevoStoreConPedido("domicilio");
    store.avanzar(pedido.id); // confirmado
    store.avanzar(pedido.id); // en_preparacion
    expect(store.moverEstado(pedido.id, "nuevo")).toBe(false);
    expect(store.getPedido(pedido.id)!.estado).toBe("en_preparacion");
  });

  it("rechaza cualquier transición desde un estado terminal", () => {
    const { store, pedido } = nuevoStoreConPedido("retiro");
    store.cancelar(pedido.id);
    expect(store.getPedido(pedido.id)!.estado).toBe("cancelado");
    expect(store.avanzar(pedido.id)).toBeNull();
    expect(store.moverEstado(pedido.id, "nuevo")).toBe(false);
  });

  it("moverEstado devuelve false si el pedido no existe", () => {
    const store = new PedidosStore();
    expect(store.moverEstado("inexistente", "confirmado")).toBe(false);
  });
});

describe("PedidosStore — cancelación", () => {
  const estadosDePrueba: Array<() => { store: PedidosStore; pedido: Pedido }> = [];

  it("cancela desde 'nuevo'", () => {
    const { store, pedido } = nuevoStoreConPedido("domicilio");
    expect(store.cancelar(pedido.id)).toBe(true);
    expect(store.getPedido(pedido.id)!.estado).toBe("cancelado");
  });

  it("cancela desde un estado intermedio (en_preparacion)", () => {
    const { store, pedido } = nuevoStoreConPedido("domicilio");
    store.avanzar(pedido.id); // confirmado
    store.avanzar(pedido.id); // en_preparacion
    expect(store.cancelar(pedido.id)).toBe(true);
    const p = store.getPedido(pedido.id)!;
    expect(p.estado).toBe("cancelado");
    expect(p.finishedAt).toBeTruthy();
  });

  it("no puede cancelar un pedido ya entregado", () => {
    const { store, pedido } = nuevoStoreConPedido("retiro");
    for (let i = 0; i < 4; i++) store.avanzar(pedido.id); // hasta entregado
    expect(store.getPedido(pedido.id)!.estado).toBe("entregado");
    expect(store.cancelar(pedido.id)).toBe(false);
  });

  // Evita el lint de "estadosDePrueba" sin uso manteniendo semántica clara.
  void estadosDePrueba;
});

describe("PedidosStore — KPIs y agrupación", () => {
  it("agrupa por estado y cuenta correctamente", () => {
    const store = new PedidosStore();
    store.pedidos = [];
    const a = store.crearPedido({ cliente: "A", telefono: "+1", modalidad: "domicilio", items: [] });
    const b = store.crearPedido({ cliente: "B", telefono: "+2", modalidad: "retiro", items: [] });
    store.crearPedido({ cliente: "C", telefono: "+3", modalidad: "retiro", items: [] });

    // a → en_preparacion, b → listo, C queda en nuevo
    store.avanzar(a.id); // confirmado
    store.avanzar(a.id); // en_preparacion
    store.avanzar(b.id); // confirmado
    store.avanzar(b.id); // en_preparacion
    store.avanzar(b.id); // listo

    expect(store.totalNuevos).toBe(1);
    expect(store.totalEnPreparacion).toBe(1);
    expect(store.totalListos).toBe(1);
    expect(store.porEstado("nuevo").length).toBe(1);
    expect(store.totalEnCurso).toBe(3);
  });

  it("historial contiene solo estados terminales", () => {
    const store = new PedidosStore();
    store.pedidos = [];
    const a = store.crearPedido({ cliente: "A", telefono: "+1", modalidad: "retiro", items: [] });
    const b = store.crearPedido({ cliente: "B", telefono: "+2", modalidad: "retiro", items: [] });
    store.cancelar(a.id);
    for (let i = 0; i < 4; i++) store.avanzar(b.id); // entregado

    const hist = store.historial;
    expect(hist.length).toBe(2);
    expect(hist.every((p) => p.estado === "entregado" || p.estado === "cancelado")).toBe(true);
  });

  it("columnasTablero excluye 'entregado' y respeta la config", () => {
    const store = new PedidosStore();
    // Config completa: nuevo, confirmado, en_preparacion, listo, en_camino
    expect(store.columnasTablero).toEqual(["nuevo", "confirmado", "en_preparacion", "listo", "en_camino"]);
    store.updateConfig({ usarConfirmado: false, usarEnCamino: false });
    expect(store.columnasTablero).toEqual(["nuevo", "en_preparacion", "listo"]);
  });

  it("totalPedido suma precio × cantidad", () => {
    const store = new PedidosStore();
    store.pedidos = [];
    const p = store.crearPedido({
      cliente: "A", telefono: "+1", modalidad: "retiro",
      items: [{ nombre: "X", cantidad: 2, precio: 1000 }, { nombre: "Y", cantidad: 1, precio: 500 }],
    });
    expect(store.totalPedido(p)).toBe(2500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FIX #1 — MIGRACIÓN DE DRIFT: config cambiada con pedidos vivos
// ═══════════════════════════════════════════════════════════════════════════

describe("PedidosStore — migración al desactivar estados (config con pedidos vivos)", () => {
  it("empuja un pedido en 'confirmado' al desactivar usarConfirmado (→ en_preparacion)", () => {
    const { store, pedido } = nuevoStoreConPedido("retiro");
    store.avanzar(pedido.id); // confirmado
    expect(store.getPedido(pedido.id)!.estado).toBe("confirmado");

    store.updateConfig({ usarConfirmado: false });

    // No queda varado: pasa al siguiente estado activo del pipeline.
    expect(store.getPedido(pedido.id)!.estado).toBe("en_preparacion");
    // Sigue siendo accionable y cuenta en curso.
    expect(store.totalEnCurso).toBe(1);
    expect(store.avanzar(pedido.id)).toBe("listo");
  });

  it("empuja un domicilio en 'en_camino' al desactivar usarEnCamino (→ entregado)", () => {
    const { store, pedido } = nuevoStoreConPedido("domicilio");
    store.avanzar(pedido.id); // confirmado
    store.avanzar(pedido.id); // en_preparacion
    store.avanzar(pedido.id); // listo
    store.avanzar(pedido.id); // en_camino
    expect(store.getPedido(pedido.id)!.estado).toBe("en_camino");

    store.updateConfig({ usarEnCamino: false });

    // 'en_camino' era el último paso antes de entregado: al desactivarlo, migra a entregado.
    const p = store.getPedido(pedido.id)!;
    expect(p.estado).toBe("entregado");
    expect(p.finishedAt).toBeTruthy();
    // Ya no cuenta en curso.
    expect(store.totalEnCurso).toBe(0);
  });

  it("no toca pedidos cuyo estado sigue siendo válido tras cambiar config", () => {
    const { store, pedido } = nuevoStoreConPedido("retiro");
    store.avanzar(pedido.id); // confirmado
    store.avanzar(pedido.id); // en_preparacion
    store.updateConfig({ usarEnCamino: false }); // no afecta a un retiro en preparación
    expect(store.getPedido(pedido.id)!.estado).toBe("en_preparacion");
  });

  it("no migra pedidos terminales ni programados", () => {
    const store = new PedidosStore();
    store.pedidos = [];
    const cancelado = store.crearPedido({ cliente: "A", telefono: "+1", modalidad: "retiro", items: [] });
    store.cancelar(cancelado.id);
    const prog = store.crearPedido({
      cliente: "B", telefono: "+2", modalidad: "retiro", items: [],
      programadoPara: new Date(Date.now() + 3600_000).toISOString(),
    });

    store.updateConfig({ usarConfirmado: false });

    expect(store.getPedido(cancelado.id)!.estado).toBe("cancelado");
    expect(store.getPedido(prog.id)!.estado).toBe("programado");
  });
});

describe("PedidosStore — modalidadesTablero (drift de modalidad)", () => {
  it("incluye modalidades de config y las presentes en pedidos activos", () => {
    const store = new PedidosStore();
    store.pedidos = [];
    // Pedido a domicilio en curso.
    store.crearPedido({ cliente: "A", telefono: "+1", modalidad: "domicilio", items: [] });
    // Desactivamos domicilio en config (solo retiro).
    store.updateConfig({ modalidades: ["retiro"] });

    // El tablero sigue mostrando 'domicilio' porque hay un pedido activo con esa modalidad.
    expect(store.modalidadesTablero).toContain("domicilio");
    expect(store.modalidadesTablero).toContain("retiro");
  });

  it("no incluye una modalidad desactivada si no hay pedidos activos con ella", () => {
    const store = new PedidosStore();
    store.pedidos = [];
    store.updateConfig({ modalidades: ["retiro"] });
    expect(store.modalidadesTablero).toEqual(["retiro"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE — PEDIDOS PROGRAMADOS
// ═══════════════════════════════════════════════════════════════════════════

describe("PedidosStore — pedidos programados", () => {
  const enUnaHora = () => new Date(Date.now() + 3600_000).toISOString();
  const haceUnaHora = () => new Date(Date.now() - 3600_000).toISOString();

  it("crea un pedido 'programado' si programadoPara es futuro", () => {
    const store = new PedidosStore();
    store.pedidos = [];
    const p = store.crearPedido({
      cliente: "A", telefono: "+1", modalidad: "retiro", items: [],
      programadoPara: enUnaHora(),
    });
    expect(p.estado).toBe("programado");
    expect(p.programadoPara).toBeTruthy();
  });

  it("crea un pedido 'nuevo' si programadoPara es pasado o no se indica", () => {
    const store = new PedidosStore();
    store.pedidos = [];
    const pasado = store.crearPedido({
      cliente: "A", telefono: "+1", modalidad: "retiro", items: [], programadoPara: haceUnaHora(),
    });
    const sinFecha = store.crearPedido({ cliente: "B", telefono: "+2", modalidad: "retiro", items: [] });
    expect(pasado.estado).toBe("nuevo");
    expect(pasado.programadoPara).toBeUndefined();
    expect(sinFecha.estado).toBe("nuevo");
  });

  it("un programado NO cuenta en 'en curso' ni entra al historial", () => {
    const store = new PedidosStore();
    store.pedidos = [];
    store.crearPedido({
      cliente: "A", telefono: "+1", modalidad: "retiro", items: [], programadoPara: enUnaHora(),
    });
    expect(store.totalEnCurso).toBe(0);
    expect(store.totalProgramados).toBe(1);
    expect(store.enCurso()).toHaveLength(0);
    expect(store.historial).toHaveLength(0);
  });

  it("activarAhora pasa el pedido de 'programado' a 'nuevo' y arranca el pipeline", () => {
    const store = new PedidosStore();
    store.pedidos = [];
    const p = store.crearPedido({
      cliente: "A", telefono: "+1", modalidad: "retiro", items: [], programadoPara: enUnaHora(),
    });
    expect(store.activarAhora(p.id)).toBe(true);
    expect(store.getPedido(p.id)!.estado).toBe("nuevo");
    expect(store.totalProgramados).toBe(0);
    expect(store.totalEnCurso).toBe(1);
    // Ya en pipeline: avanza normal.
    expect(store.avanzar(p.id)).toBe("confirmado");
  });

  it("activarAhora sobre un pedido no programado devuelve false", () => {
    const { store, pedido } = nuevoStoreConPedido("retiro");
    expect(store.activarAhora(pedido.id)).toBe(false); // ya es 'nuevo'
  });

  it("activarProgramadosVencidos activa solo los cuya hora ya llegó", () => {
    const store = new PedidosStore();
    store.pedidos = [];
    const vencido = store.crearPedido({ cliente: "A", telefono: "+1", modalidad: "retiro", items: [] });
    // Forzamos manualmente el estado programado con hora pasada (simula tick pendiente).
    // Mutamos la instancia observable a través de getPedido para asegurar persistencia en MobX.
    const vencidoObs = store.getPedido(vencido.id)!;
    vencidoObs.estado = "programado";
    vencidoObs.programadoPara = haceUnaHora();
    const futuro = store.crearPedido({
      cliente: "B", telefono: "+2", modalidad: "retiro", items: [], programadoPara: enUnaHora(),
    });

    const activados = store.activarProgramadosVencidos();
    expect(activados).toBe(1);
    expect(store.getPedido(vencido.id)!.estado).toBe("nuevo");
    expect(store.getPedido(futuro.id)!.estado).toBe("programado");
  });

  it("un programado es cancelable (cancelado es válido desde no terminal)", () => {
    const store = new PedidosStore();
    store.pedidos = [];
    const p = store.crearPedido({
      cliente: "A", telefono: "+1", modalidad: "retiro", items: [], programadoPara: enUnaHora(),
    });
    expect(store.cancelar(p.id)).toBe(true);
    expect(store.getPedido(p.id)!.estado).toBe("cancelado");
  });

  it("programadosDelDia / countProgramadosDia agrupan por día local", () => {
    const store = new PedidosStore();
    store.pedidos = [];
    // Dos programados el mismo día a horas distintas, uno futuro en otro día.
    const base = new Date(Date.now() + 24 * 3600_000); // mañana
    const dia = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
    const a = new Date(base); a.setHours(10, 0, 0, 0);
    const b = new Date(base); b.setHours(15, 0, 0, 0);
    const c = new Date(Date.now() + 48 * 3600_000); // pasado mañana

    store.crearPedido({ cliente: "A", telefono: "+1", modalidad: "retiro", items: [], programadoPara: a.toISOString() });
    store.crearPedido({ cliente: "B", telefono: "+2", modalidad: "retiro", items: [], programadoPara: b.toISOString() });
    store.crearPedido({ cliente: "C", telefono: "+3", modalidad: "retiro", items: [], programadoPara: c.toISOString() });

    expect(store.countProgramadosDia(dia)).toBe(2);
    expect(store.programadosDelDia(dia).map((p) => p.cliente)).toEqual(["A", "B"]);
  });

  it("reprogramar cambia la fecha mientras el pedido siga 'programado'", () => {
    const store = new PedidosStore();
    store.pedidos = [];
    const nueva = new Date(Date.now() + 2 * 3600_000).toISOString();
    const p = store.crearPedido({
      cliente: "A", telefono: "+1", modalidad: "retiro", items: [], programadoPara: enUnaHora(),
    });
    expect(store.reprogramar(p.id, nueva)).toBe(true);
    expect(store.getPedido(p.id)!.programadoPara).toBe(nueva);
  });

  it("reprogramar devuelve false si el pedido ya no está 'programado'", () => {
    const store = new PedidosStore();
    store.pedidos = [];
    const p = store.crearPedido({
      cliente: "A", telefono: "+1", modalidad: "retiro", items: [], programadoPara: enUnaHora(),
    });
    store.activarAhora(p.id); // ahora es 'nuevo'
    expect(store.reprogramar(p.id, enUnaHora())).toBe(false);
  });

  it("un programado no avanza por el pipeline (siguienteEstado = null)", () => {
    const store = new PedidosStore();
    store.pedidos = [];
    const p = store.crearPedido({
      cliente: "A", telefono: "+1", modalidad: "retiro", items: [], programadoPara: enUnaHora(),
    });
    expect(store.siguienteEstado(store.getPedido(p.id)!)).toBeNull();
    expect(store.avanzar(p.id)).toBeNull();
  });

  it("iniciarTick es idempotente y detenerTick lo limpia", () => {
    const store = new PedidosStore();
    store.pedidos = [];
    const p = store.crearPedido({ cliente: "A", telefono: "+1", modalidad: "retiro", items: [] });
    p.estado = "programado";
    p.programadoPara = haceUnaHora();

    // El barrido inmediato de iniciarTick activa el vencido.
    store.iniciarTick(60000);
    store.iniciarTick(60000); // segunda llamada no duplica el intervalo
    expect(store.getPedido(p.id)!.estado).toBe("nuevo");
    store.detenerTick();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG AVANZADA: alias, tiempos objetivo, horario
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// ANALÍTICA — distribuciones e ingresos (getters/métodos puros)
// ═══════════════════════════════════════════════════════════════════════════

describe("PedidosStore — analítica sobre el seed", () => {
  /** ymd local de un Date (mismo formato que usan los métodos del store). */
  const ymdLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  it("conteoPorEstado cuenta cada estado y suma al total de pedidos", () => {
    const store = new PedidosStore();
    const conteo = store.conteoPorEstado();
    // El seed tiene exactamente uno en cada uno de estos 7 estados y ninguno programado.
    expect(conteo).toEqual({
      programado: 0,
      nuevo: 1,
      confirmado: 1,
      en_preparacion: 1,
      listo: 1,
      en_camino: 1,
      entregado: 1,
      cancelado: 1,
    });
    const suma = Object.values(conteo).reduce((s, n) => s + n, 0);
    expect(suma).toBe(store.pedidos.length);
  });

  it("porModalidad respeta el orden canónico y suma al total", () => {
    const store = new PedidosStore();
    const dist = store.porModalidad();
    expect(dist.map((d) => d.modalidad)).toEqual(["retiro", "domicilio", "en_sitio"]);
    // Seed: retiro (pd2, pd6) = 2, domicilio (pd1, pd4, pd5, pd7) = 4, en_sitio (pd3) = 1.
    expect(dist).toEqual([
      { modalidad: "retiro", total: 2 },
      { modalidad: "domicilio", total: 4 },
      { modalidad: "en_sitio", total: 1 },
    ]);
    const suma = dist.reduce((s, d) => s + d.total, 0);
    expect(suma).toBe(store.pedidos.length);
  });

  it("porOrigen cuenta whatsapp/operador y suma al total", () => {
    const store = new PedidosStore();
    const dist = store.porOrigen();
    expect(dist.map((d) => d.origen)).toEqual(["whatsapp", "operador"]);
    // Seed: whatsapp = 6, operador = 1 (pd3).
    expect(dist).toEqual([
      { origen: "whatsapp", total: 6 },
      { origen: "operador", total: 1 },
    ]);
    const suma = dist.reduce((s, d) => s + d.total, 0);
    expect(suma).toBe(store.pedidos.length);
  });

  it("ingresoTotalEntregados suma el total de los pedidos entregados", () => {
    const store = new PedidosStore();
    // En el seed solo pd6 está entregado: 1× Combo (25000).
    expect(store.ingresoTotalEntregados()).toBe(25000);
  });

  it("tasaCancelacion es el % de cancelados sobre el total (1 decimal)", () => {
    const store = new PedidosStore();
    // Seed: 1 cancelado (pd7) de 7 → 1/7 = 14.285… → 14.3
    expect(store.tasaCancelacion()).toBe(14.3);
  });

  it("ticketPromedioEntregado es el ingreso medio por entregado (redondeado)", () => {
    const store = new PedidosStore();
    // Un solo entregado con total 25000 → promedio 25000.
    expect(store.ticketPromedioEntregado()).toBe(25000);
  });

  it("ingresosEntre acumula el total de entregados por día (finishedAt)", () => {
    const store = new PedidosStore();
    // pd6 (único entregado) tiene finishedAt ~50 min atrás → hoy (local).
    const hoy = ymdLocal(new Date());
    const serie = store.ingresosEntre(hoy, hoy);
    expect(serie).toEqual([{ fecha: hoy, total: 25000 }]);
  });
});

describe("PedidosStore — analítica: casos borde y pureza", () => {
  const ymdLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  it("con lista vacía, las distribuciones son 0 y los KPIs neutros", () => {
    const store = new PedidosStore();
    store.pedidos = [];
    expect(store.conteoPorEstado()).toEqual({
      programado: 0, nuevo: 0, confirmado: 0, en_preparacion: 0,
      listo: 0, en_camino: 0, entregado: 0, cancelado: 0,
    });
    expect(store.porModalidad()).toEqual([
      { modalidad: "retiro", total: 0 },
      { modalidad: "domicilio", total: 0 },
      { modalidad: "en_sitio", total: 0 },
    ]);
    expect(store.porOrigen()).toEqual([
      { origen: "whatsapp", total: 0 },
      { origen: "operador", total: 0 },
    ]);
    expect(store.ingresoTotalEntregados()).toBe(0);
    expect(store.tasaCancelacion()).toBe(0);
    expect(store.ticketPromedioEntregado()).toBe(0);
  });

  it("ingresosEntre devuelve [] con rango inválido (desde > hasta o vacío)", () => {
    const store = new PedidosStore();
    expect(store.ingresosEntre("2026-01-10", "2026-01-01")).toEqual([]);
    expect(store.ingresosEntre("", "2026-01-01")).toEqual([]);
    expect(store.ingresosEntre("2026-01-01", "")).toEqual([]);
  });

  it("ingresosEntre rellena con 0 los días sin ingresos y respeta el rango inclusive", () => {
    const store = new PedidosStore();
    store.pedidos = [];
    // Un entregado hoy con total conocido.
    const p = store.crearPedido({
      cliente: "A", telefono: "+1", modalidad: "retiro",
      items: [{ nombre: "X", cantidad: 2, precio: 1000 }],
    });
    for (let i = 0; i < 4; i++) store.avanzar(p.id); // retiro → entregado
    expect(store.getPedido(p.id)!.estado).toBe("entregado");

    const hoy = new Date();
    const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
    const serie = store.ingresosEntre(ymdLocal(ayer), ymdLocal(hoy));
    expect(serie).toHaveLength(2);
    expect(serie[0]).toEqual({ fecha: ymdLocal(ayer), total: 0 });
    expect(serie[1]).toEqual({ fecha: ymdLocal(hoy), total: 2000 });
  });

  it("los métodos de analítica son puros (no mutan this.pedidos)", () => {
    const store = new PedidosStore();
    const antes = store.pedidos.map((p) => ({ id: p.id, estado: p.estado }));
    store.conteoPorEstado();
    store.porModalidad();
    store.porOrigen();
    store.ingresoTotalEntregados();
    store.tasaCancelacion();
    store.ticketPromedioEntregado();
    store.ingresosEntre(ymdLocal(new Date()), ymdLocal(new Date()));
    const despues = store.pedidos.map((p) => ({ id: p.id, estado: p.estado }));
    expect(despues).toEqual(antes);
    expect(store.pedidos).toHaveLength(7);
  });

  it("tasaCancelacion y ticketPromedioEntregado con varios pedidos", () => {
    const store = new PedidosStore();
    store.pedidos = [];
    // 2 entregados (1000 y 3000) + 2 cancelados de 4 pedidos totales.
    const e1 = store.crearPedido({ cliente: "A", telefono: "+1", modalidad: "retiro", items: [{ nombre: "X", cantidad: 1, precio: 1000 }] });
    const e2 = store.crearPedido({ cliente: "B", telefono: "+2", modalidad: "retiro", items: [{ nombre: "Y", cantidad: 3, precio: 1000 }] });
    const c1 = store.crearPedido({ cliente: "C", telefono: "+3", modalidad: "retiro", items: [] });
    const c2 = store.crearPedido({ cliente: "D", telefono: "+4", modalidad: "retiro", items: [] });
    for (let i = 0; i < 4; i++) store.avanzar(e1.id);
    for (let i = 0; i < 4; i++) store.avanzar(e2.id);
    store.cancelar(c1.id);
    store.cancelar(c2.id);

    expect(store.ingresoTotalEntregados()).toBe(4000);
    expect(store.ticketPromedioEntregado()).toBe(2000); // 4000 / 2
    expect(store.tasaCancelacion()).toBe(50); // 2/4 → 50.0
  });
});

describe("PedidosStore — alias de estados y modalidades (C)", () => {
  it("estadoLabel/modalidadLabel usan el alias si existe", () => {
    const store = new PedidosStore();
    store.updateConfig({
      aliasEstados: { en_camino: "En reparto" },
      aliasModalidades: { en_sitio: "Comer aquí" },
    });
    expect(store.estadoLabel("en_camino")).toBe("En reparto");
    expect(store.modalidadLabel("en_sitio")).toBe("Comer aquí");
    // Sin alias, cae en la etiqueta por defecto.
    expect(store.estadoLabel("nuevo")).toBe("Nuevo");
    expect(store.modalidadLabel("retiro")).toBe("Retiro");
  });
});

describe("PedidosStore — tiempos objetivo por estado (B)", () => {
  it("objetivoDe usa el tiempo del estado si existe; si no, el umbral global", () => {
    const store = new PedidosStore();
    store.updateConfig({ umbralUrgencia: 15, tiemposObjetivo: { en_preparacion: 30 } });
    expect(store.objetivoDe("en_preparacion")).toBe(30);
    expect(store.objetivoDe("nuevo")).toBe(15); // sin objetivo propio → umbral
  });

  it("esUrgente respeta el tiempo objetivo por estado", () => {
    const { store, pedido } = nuevoStoreConPedido("retiro");
    store.updateConfig({ umbralUrgencia: 15, tiemposObjetivo: { nuevo: 5 } });
    // Forzamos 6 min en estado 'nuevo' (objetivo 5 → urgente).
    store.getPedido(pedido.id)!.estadoDesde = new Date(Date.now() - 6 * 60000).toISOString();
    expect(store.esUrgente(store.getPedido(pedido.id)!)).toBe(true);
  });
});

describe("PedidosStore — horario de atención (A)", () => {
  it("estaAbierto: siempre true si el horario no está activo", () => {
    const store = new PedidosStore();
    expect(store.estaAbierto(new Date("2026-09-15T03:00:00"))).toBe(true);
  });

  it("estaAbierto: respeta día laboral y franja apertura–cierre", () => {
    const store = new PedidosStore();
    // Martes (2026-09-15 es martes), 08:00–20:00, Lun–Vie.
    store.updateConfig({ horario: { activo: true, dias: [1, 2, 3, 4, 5], apertura: "08:00", cierre: "20:00" } });
    expect(store.estaAbierto(new Date("2026-09-15T10:00:00"))).toBe(true);  // dentro
    expect(store.estaAbierto(new Date("2026-09-15T21:00:00"))).toBe(false); // fuera de hora
    expect(store.estaAbierto(new Date("2026-09-13T10:00:00"))).toBe(false); // domingo (no laboral)
  });
});
