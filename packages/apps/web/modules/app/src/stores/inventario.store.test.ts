import { beforeEach, describe, expect, it } from "vitest";
import { InventarioStore } from "./inventario.store";
import { stockTotal } from "../domain/inventario/inventario.domain";

let s: InventarioStore;

beforeEach(() => {
  s = new InventarioStore(() => "Tester");
});

/** Artículo del seed con stock conocido en el almacén principal. */
const PAPEL = "art-ofi-1001";

describe("movimientos", () => {
  it("una salida válida descuenta y deja rastro con el responsable", () => {
    const antes = s.articulo(PAPEL)!.existencias["ub-principal"];
    const r = s.registrarMovimiento({ tipo: "salida", articuloId: PAPEL, cantidad: 5, origenId: "ub-principal", destinoId: null, motivo: "Prueba" });
    expect(r.ok).toBe(true);
    expect(s.articulo(PAPEL)!.existencias["ub-principal"]).toBe(antes - 5);
    expect(s.movimientosRecientes[0]).toMatchObject({ articuloId: PAPEL, responsable: "Tester", destinoId: null });
  });

  it("un movimiento inválido no cambia existencias ni el libro", () => {
    const antes = { ...s.articulo(PAPEL)!.existencias };
    const n = s.movimientos.length;
    const r = s.registrarMovimiento({ tipo: "salida", articuloId: PAPEL, cantidad: 99999, origenId: "ub-principal", destinoId: null, motivo: "Prueba" });
    expect(r.ok).toBe(false);
    expect(s.articulo(PAPEL)!.existencias).toEqual(antes);
    expect(s.movimientos.length).toBe(n);
  });

  it("exige motivo", () => {
    const r = s.registrarMovimiento({ tipo: "entrada", articuloId: PAPEL, cantidad: 1, origenId: null, destinoId: "ub-principal", motivo: "  " });
    expect(r.ok).toBe(false);
  });
});

describe("artículos", () => {
  it("rechaza un SKU duplicado sin importar mayúsculas", () => {
    const r = s.crearArticulo({
      sku: "ofi-1001",
      nombre: "Duplicado",
      categoria: "Suministros de oficina",
      unidad: "unidad",
      costoUnitario: 1,
      proveedorId: null,
      puntoReorden: 1,
      stockMaximo: 5,
    });
    expect(r.ok).toBe(false);
  });
});

describe("órdenes de compra", () => {
  function crear() {
    const r = s.crearOrdenCompra({
      proveedorId: "pv-papeleria",
      destinoId: "ub-principal",
      fechaEsperada: null,
      lineas: [
        { articuloId: PAPEL, cantidad: 10, costoUnitario: 14500 },
        { articuloId: "art-ofi-1002", cantidad: 4, costoUnitario: 9800 },
      ],
      notas: "",
    });
    if (!r.ok) throw new Error(r.error);
    return r.valor;
  }

  it("borrador → enviada → parcial → recibida, con entradas referenciadas", () => {
    const oc = crear();
    expect(oc.estado).toBe("borrador");
    expect(oc.numero).toBe("OC-0006");

    expect(s.enviarOrden(oc.id).ok).toBe(true);
    expect(s.orden(oc.id)!.estado).toBe("enviada");
    expect(s.orden(oc.id)!.fechaEsperada).not.toBeNull();

    const papelAntes = s.articulo(PAPEL)!.existencias["ub-principal"];
    expect(s.recibirOrden(oc.id, { [PAPEL]: 6 }).ok).toBe(true);
    expect(s.orden(oc.id)!.estado).toBe("parcial");
    expect(s.articulo(PAPEL)!.existencias["ub-principal"]).toBe(papelAntes + 6);

    expect(s.recibirOrden(oc.id, { [PAPEL]: 4, "art-ofi-1002": 4 }).ok).toBe(true);
    expect(s.orden(oc.id)!.estado).toBe("recibida");

    const entradas = s.movimientos.filter((m) => m.referencia === oc.numero);
    expect(entradas).toHaveLength(3);
    expect(entradas.every((m) => m.tipo === "entrada" && m.destinoId === "ub-principal")).toBe(true);
  });

  it("recibir más de lo pendiente falla sin efectos", () => {
    const oc = crear();
    s.enviarOrden(oc.id);
    const antes = { ...s.articulo(PAPEL)!.existencias };
    const n = s.movimientos.length;
    // La primera línea es válida y la segunda no: la orden no debe quedar a medias.
    const r = s.recibirOrden(oc.id, { [PAPEL]: 5, "art-ofi-1002": 5 });
    expect(r.ok).toBe(false);
    expect(s.articulo(PAPEL)!.existencias).toEqual(antes);
    expect(s.movimientos.length).toBe(n);
    expect(s.orden(oc.id)!.lineas.every((l) => l.recibida === 0)).toBe(true);
    expect(s.orden(oc.id)!.estado).toBe("enviada");
  });

  it("no se recibe un borrador", () => {
    const oc = crear();
    expect(s.recibirOrden(oc.id, { [PAPEL]: 1 }).ok).toBe(false);
  });
});

describe("generarOrdenesDesdeReorden", () => {
  it("agrupa por proveedor y omite los que no tienen proveedor", () => {
    const sinProveedor = s.crearArticulo({
      sku: "TMP-1",
      nombre: "Sin proveedor",
      categoria: "Repuestos",
      unidad: "unidad",
      costoUnitario: 100,
      proveedorId: null,
      puntoReorden: 5,
      stockMaximo: 20,
    });
    if (!sinProveedor.ok) throw new Error(sinProveedor.error);

    const cola = s.colaReorden;
    expect(cola.some((i) => i.articulo.id === sinProveedor.valor.id)).toBe(true);

    const ids = cola.map((i) => i.articulo.id);
    const antes = s.ordenes.length;
    const r = s.generarOrdenesDesdeReorden(ids);
    if (!r.ok) throw new Error(r.error);

    const proveedores = r.valor.ordenes.map((o) => o.proveedorId);
    expect(new Set(proveedores).size).toBe(proveedores.length);
    expect(s.ordenes.length).toBe(antes + r.valor.ordenes.length);
    expect(r.valor.omitidos).toBeGreaterThanOrEqual(1);
    expect(r.valor.ordenes.flatMap((o) => o.lineas).some((l) => l.articuloId === sinProveedor.valor.id)).toBe(false);
    expect(r.valor.ordenes.every((o) => o.estado === "borrador")).toBe(true);
  });
});

describe("conteos", () => {
  it("con revisión obligatoria, aplicar exige pasar por en_revision", () => {
    s.guardarConfig({ requiereRevisionConteos: true });
    const r = s.crearConteo("ub-12c");
    if (!r.ok) throw new Error(r.error);
    const c = r.valor;
    for (const l of c.lineas) s.registrarConteoLinea(c.id, l.articuloId, l.esperado);

    expect(s.aplicarConteo(c.id).ok).toBe(false);
    expect(s.enviarConteoARevision(c.id).ok).toBe(true);
    expect(s.aplicarConteo(c.id).ok).toBe(true);
    expect(s.conteo(c.id)!.estado).toBe("aplicado");
  });

  it("no se envía a revisión con líneas sin contar", () => {
    const r = s.crearConteo("ub-12c");
    if (!r.ok) throw new Error(r.error);
    expect(s.enviarConteoARevision(r.valor.id).ok).toBe(false);
  });

  it("aplicar deja la ubicación en lo contado aunque haya habido un movimiento intermedio", () => {
    s.guardarConfig({ requiereRevisionConteos: false });
    const r = s.crearConteo("ub-12c");
    if (!r.ok) throw new Error(r.error);
    const c = r.valor;
    const objetivo = c.lineas[0].articuloId;
    for (const l of c.lineas) s.registrarConteoLinea(c.id, l.articuloId, l.articuloId === objetivo ? 1 : l.esperado);

    // Mientras se contaba, entraron 3 unidades del artículo objetivo.
    s.registrarMovimiento({ tipo: "entrada", articuloId: objetivo, cantidad: 3, origenId: null, destinoId: "ub-12c", motivo: "Intermedio" });

    const ap = s.aplicarConteo(c.id);
    expect(ap.ok).toBe(true);
    expect(s.articulo(objetivo)!.existencias["ub-12c"]).toBe(1);
    for (const l of c.lineas) {
      if (l.articuloId !== objetivo) expect(s.articulo(l.articuloId)!.existencias["ub-12c"]).toBe(l.esperado);
    }
    expect(s.movimientos.filter((m) => m.referencia === c.numero && m.tipo === "ajuste")).toHaveLength(1);
  });

  it("no abre dos conteos en la misma ubicación", () => {
    expect(s.crearConteo("ub-12c").ok).toBe(true);
    expect(s.crearConteo("ub-12c").ok).toBe(false);
  });

  it("el seed ya tiene un conteo abierto en el almacén principal", () => {
    expect(s.crearConteo("ub-principal").ok).toBe(false);
  });
});

describe("ubicaciones", () => {
  it("no se desactiva una ubicación con stock", () => {
    expect(s.alternarUbicacionActiva("ub-principal").ok).toBe(false);
    expect(s.ubicacion("ub-principal")!.activa).toBe(true);
  });

  it("una ubicación vacía sí se desactiva", () => {
    const r = s.agregarUbicacion({ nombre: "Bodega Sur", tipo: "bodega" });
    if (!r.ok) throw new Error(r.error);
    expect(s.alternarUbicacionActiva(r.valor.id).ok).toBe(true);
    expect(s.ubicacion(r.valor.id)!.activa).toBe(false);
  });
});

describe("restablecer", () => {
  it("vuelve al seed", () => {
    const total = stockTotal(s.articulo(PAPEL)!);
    s.registrarMovimiento({ tipo: "salida", articuloId: PAPEL, cantidad: 1, origenId: "ub-principal", destinoId: null, motivo: "x" });
    s.restablecer();
    expect(stockTotal(s.articulo(PAPEL)!)).toBe(total);
  });
});

describe("guardarConfig — validaciones nuevas", () => {
  it.each([
    ["múltiplo cero", { multiploPedido: 0 }],
    ["múltiplo decimal", { multiploPedido: 2.5 }],
    ["umbral sobre 100", { umbralDiferenciaPct: 120 }],
    ["hora mal escrita", { horaResumen: "7:00" }],
    ["WhatsApp sin número", { alertaWhatsapp: true, whatsappDestino: "" }],
    ["máximo por defecto igual al punto", { puntoReordenPorDefecto: 20, stockMaximoPorDefecto: 20 }],
    ["ubicación de recepción inexistente", { ubicacionRecepcionId: "no-existe" }],
  ])("rechaza %s y no cambia nada", (_n, parcial) => {
    const antes = JSON.stringify(s.config);
    expect(s.guardarConfig(parcial).ok).toBe(false);
    expect(JSON.stringify(s.config)).toBe(antes);
  });

  it("rechaza una ubicación de recepción inactiva", () => {
    const vacia = s.agregarUbicacion({ nombre: "Vacía", tipo: "bodega" });
    if (!vacia.ok) throw new Error(vacia.error);
    s.alternarUbicacionActiva(vacia.valor.id);
    expect(s.guardarConfig({ ubicacionRecepcionId: vacia.valor.id }).ok).toBe(false);
  });

  it("acepta WhatsApp con indicativo y lo guarda recortado", () => {
    const r = s.guardarConfig({ alertaWhatsapp: true, whatsappDestino: " +57 300 123 4567 " });
    expect(r.ok).toBe(true);
    expect(s.config.whatsappDestino).toBe("+57 300 123 4567");
  });
});

describe("categorías y ubicaciones", () => {
  it("renombrar una categoría la cambia en sus artículos", () => {
    const r = s.renombrarCategoria("Embalaje", "Empaques");
    expect(r.ok).toBe(true);
    expect(s.config.categorias).toContain("Empaques");
    expect(s.articulos.some((a) => a.categoria === "Embalaje")).toBe(false);
    expect(s.articulos.filter((a) => a.categoria === "Empaques").length).toBe(5);
  });

  it("no renombra a un nombre que ya existe", () => {
    expect(s.renombrarCategoria("Embalaje", "repuestos").ok).toBe(false);
  });

  it("actualizarUbicacion cambia nombre y tipo, y rechaza duplicados", () => {
    expect(s.actualizarUbicacion("ub-norte", { nombre: "Bodega Norte 2", tipo: "almacen" }).ok).toBe(true);
    expect(s.ubicacion("ub-norte")).toMatchObject({ nombre: "Bodega Norte 2", tipo: "almacen" });
    expect(s.actualizarUbicacion("ub-norte", { nombre: "estante 12-c", tipo: "bodega" }).ok).toBe(false);
  });

  it("no desactiva la ubicación de recepción aunque esté vacía", () => {
    const u = s.agregarUbicacion({ nombre: "Recepción nueva", tipo: "muelle" });
    if (!u.ok) throw new Error(u.error);
    expect(s.guardarConfig({ ubicacionRecepcionId: u.valor.id }).ok).toBe(true);
    expect(s.alternarUbicacionActiva(u.valor.id).ok).toBe(false);
  });
});

describe("referencia obligatoria en salidas", () => {
  it("con la opción activa, una salida sin referencia falla y con referencia pasa", () => {
    s.guardarConfig({ referenciaObligatoriaSalidas: true });
    const base = { tipo: "salida" as const, articuloId: PAPEL, cantidad: 1, origenId: "ub-principal", destinoId: null, motivo: "Despacho" };
    expect(s.registrarMovimiento(base).ok).toBe(false);
    expect(s.registrarMovimiento({ ...base, referencia: "PED-1" }).ok).toBe(true);
  });
});

describe("generarOrdenesDesdeReorden con cantidades editadas", () => {
  it("usa la cantidad editada en lugar de la sugerida", () => {
    const item = s.colaReorden.find((i) => i.articulo.proveedorId && i.sugerido > 0)!;
    const r = s.generarOrdenesDesdeReorden([item.articulo.id], { [item.articulo.id]: 7 });
    if (!r.ok) throw new Error(r.error);
    const linea = r.valor.ordenes[0].lineas.find((l) => l.articuloId === item.articulo.id)!;
    expect(linea.cantidad).toBe(7);
    expect(r.valor.ordenes[0].destinoId).toBe(s.config.ubicacionRecepcionId);
  });

  it("una cantidad editada a cero se omite", () => {
    const item = s.colaReorden.find((i) => i.articulo.proveedorId && i.sugerido > 0)!;
    const r = s.generarOrdenesDesdeReorden([item.articulo.id], { [item.articulo.id]: 0 });
    expect(r.ok).toBe(false);
  });
});

describe("valoración del inventario", () => {
  function articuloLimpio() {
    const r = s.crearArticulo({
      sku: "VAL-1",
      nombre: "Prueba de costo",
      categoria: "Repuestos",
      unidad: "unidad",
      costoUnitario: 100,
      proveedorId: null,
      puntoReorden: 1,
      stockMaximo: 50,
    });
    if (!r.ok) throw new Error(r.error);
    return r.valor;
  }
  const entrada = (id: string, cantidad: number, costoUnitario: number) =>
    s.registrarMovimiento({ tipo: "entrada", articuloId: id, cantidad, origenId: null, destinoId: "ub-principal", motivo: "Compra", costoUnitario });
  const salida = (id: string, cantidad: number) =>
    s.registrarMovimiento({ tipo: "salida", articuloId: id, cantidad, origenId: "ub-principal", destinoId: null, motivo: "Prueba" });

  it("con promedio ponderado, una compra a otro precio promedia el costo", () => {
    const a = articuloLimpio();
    entrada(a.id, 10, 100);
    entrada(a.id, 10, 200);
    expect(s.articulo(a.id)!.costoUnitario).toBe(150);
    salida(a.id, 5);
    expect(s.articulo(a.id)!.costoUnitario).toBe(150);
  });

  it("con PEPS, lo que sale se lleva primero lo más antiguo", () => {
    s.guardarConfig({ metodoValoracion: "fifo" });
    const a = articuloLimpio();
    entrada(a.id, 10, 100);
    entrada(a.id, 10, 200);
    salida(a.id, 10);
    // Quedan las 10 de 200.
    expect(s.articulo(a.id)!.costoUnitario).toBe(200);
    expect(s.capasDeArticulo(a.id)).toEqual([{ cantidad: 10, costo: 200 }]);
  });

  it("recibir una orden usa el costo de la línea", () => {
    const a = articuloLimpio();
    entrada(a.id, 10, 100);
    const oc = s.crearOrdenCompra({ proveedorId: "pv-papeleria", destinoId: "ub-principal", fechaEsperada: null, lineas: [{ articuloId: a.id, cantidad: 10, costoUnitario: 300 }], notas: "" });
    if (!oc.ok) throw new Error(oc.error);
    expect(s.enviarOrden(oc.valor.id).ok).toBe(true);
    expect(s.recibirOrden(oc.valor.id, { [a.id]: 10 }).ok).toBe(true);
    expect(s.articulo(a.id)!.costoUnitario).toBe(200);
  });
});

describe("ajustes que antes no tenían efecto", () => {
  it("genera el SKU si se deja vacío", () => {
    const r = s.crearArticulo({ sku: "", nombre: "Nuevo", categoria: "Suministros de oficina", unidad: "unidad", costoUnitario: 1, proveedorId: null, puntoReorden: 1, stockMaximo: 5 });
    if (!r.ok) throw new Error(r.error);
    expect(r.valor.sku).toMatch(/^OFI-\d{4}$/);
  });

  it("sin SKU automático, el código es obligatorio", () => {
    s.guardarConfig({ skuAutomatico: false });
    const r = s.crearArticulo({ sku: "", nombre: "Nuevo", categoria: "Repuestos", unidad: "unidad", costoUnitario: 1, proveedorId: null, puntoReorden: 1, stockMaximo: 5 });
    expect(r.ok).toBe(false);
  });

  it("la tolerancia deja recibir un poco más de lo pedido", () => {
    s.guardarConfig({ toleranciaRecepcionPct: 10 });
    const oc = s.crearOrdenCompra({ proveedorId: "pv-papeleria", destinoId: "ub-principal", fechaEsperada: null, lineas: [{ articuloId: PAPEL, cantidad: 10, costoUnitario: 14500 }], notas: "" });
    if (!oc.ok) throw new Error(oc.error);
    s.enviarOrden(oc.valor.id);
    expect(s.recibirOrden(oc.valor.id, { [PAPEL]: 12 }).ok).toBe(false);
    expect(s.recibirOrden(oc.valor.id, { [PAPEL]: 11 }).ok).toBe(true);
  });

  it("los días de cobertura suben la sugerencia si el consumo lo pide", () => {
    const item = s.colaReorden.find((i) => i.consumoDiario > 0);
    if (!item) return;
    const antes = item.sugerido;
    s.guardarConfig({ diasCobertura: 365 });
    const despues = s.colaReorden.find((i) => i.articulo.id === item.articulo.id)!.sugerido;
    expect(despues).toBeGreaterThanOrEqual(antes);
    expect(despues).toBeGreaterThanOrEqual(Math.ceil(item.consumoDiario * 365) - item.stock - item.enTransito);
  });

  it("el aviso en pantalla se apaga desde la configuración", () => {
    const conAviso = s.alertas().filter((a) => a.id.startsWith("agotados") || a.id.startsWith("bajos"));
    expect(conAviso.length).toBeGreaterThan(0);
    s.guardarConfig({ alertaStockBajo: false });
    expect(s.alertas().some((a) => a.id.startsWith("agotados") || a.id.startsWith("bajos"))).toBe(false);
  });
});
