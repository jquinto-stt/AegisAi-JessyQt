/**
 * Cola de reorden.
 *
 * Pregunta de la pantalla: «¿qué pido, a quién y cuánto cuesta?».
 *
 * La unidad es el artículo, no el proveedor: una fila con foto, estado,
 * existencia, punto de reorden, cantidad sugerida y costo. El plan de
 * reposición es una regla explícita, no una caja negra: con presupuesto,
 * prioriza agotados y luego stock bajo en el orden de la cola; sin presupuesto,
 * selecciona toda la cola pedible. La acción final sigue agrupando por
 * proveedor en el store y crea un borrador por cada uno.
 */
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { Package, ShoppingCart } from "lucide-react";
import {
  inventarioStore,
  formatearEntero,
  formatearMoneda,
  type ItemReorden,
} from "@/stores";
import {
  Aviso,
  Boton,
  cx,
  DistintivoStock,
  PaginaInventario,
  useAviso,
  Vacio,
} from "./inventario.ui";
import { fotoDeProducto } from "./productos.fotos";
import "./reorden-cola.css";

type Motivo = "sin-proveedor" | "proveedor-inactivo" | "cubierto";

const TEXTO_MOTIVO: Record<Motivo, string> = {
  "sin-proveedor": "No tiene proveedor asignado",
  "proveedor-inactivo": "Su proveedor está desactivado",
  cubierto: "Lo que viene en camino ya cubre el faltante",
};

/** La misma regla con la que el store omite artículos al generar órdenes. */
function motivoBloqueo(i: ItemReorden): Motivo | null {
  const pid = i.articulo.proveedorId;
  if (!pid) return "sin-proveedor";
  if (!inventarioStore.proveedor(pid)?.activo) return "proveedor-inactivo";
  if (i.sugerido <= 0) return "cubierto";
  return null;
}

function FotoProducto({ item }: { item: ItemReorden }) {
  const foto = fotoDeProducto(item.articulo.id);
  return (
    <span className="rq-thumb" aria-hidden>
      {foto ? (
        <img src={foto.src} alt="" loading="lazy" decoding="async" />
      ) : (
        <Package className="rq-thumb__fallback" />
      )}
    </span>
  );
}

export const ReordenPage = observer(function ReordenPage() {
  const s = inventarioStore;
  const navigate = useNavigate();
  const { aviso, mostrar } = useAviso();

  const cola = s.colaReorden;
  const pedibles = cola.filter((i) => !motivoBloqueo(i));
  const bloqueados = cola.length - pedibles.length;

  const [seleccion, setSeleccion] = useState<Set<string>>(() => new Set());
  const [editadas, setEditadas] = useState<Record<string, string>>({});
  const [presupuesto, setPresupuesto] = useState("");
  const [notaPlan, setNotaPlan] = useState("");
  const [planMsg, setPlanMsg] = useState<string | null>(null);
  const refTodos = useRef<HTMLInputElement>(null);

  const cantidadDe = (i: ItemReorden): number => {
    const v = editadas[i.articulo.id];
    if (v === undefined) return i.sugerido;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  };

  const seleccionados = pedibles.filter(
    (i) => seleccion.has(i.articulo.id) && cantidadDe(i) > 0,
  );
  // Sin selección, el panel y el botón trabajan sobre toda la cola pedible.
  const haySeleccion = seleccion.size > 0;
  const efectivos = haySeleccion ? seleccionados : pedibles;
  const totalSeleccionado = seleccionados.reduce(
    (t, i) => t + cantidadDe(i) * i.articulo.costoUnitario,
    0,
  );
  const totalSugerido = pedibles.reduce((t, i) => t + i.sugerido * i.articulo.costoUnitario, 0);
  const totalEfectivo = haySeleccion ? totalSeleccionado : totalSugerido;
  const agotados = cola.filter((i) => i.estado === "agotado").length;
  const proveedoresParaCrear = new Set(
    efectivos.filter((i) => cantidadDe(i) > 0).map((i) => i.articulo.proveedorId).filter(Boolean),
  ).size;
  const todos = pedibles.length > 0 && pedibles.every((i) => seleccion.has(i.articulo.id));
  const algunos = pedibles.some((i) => seleccion.has(i.articulo.id));
  const tope = Number(presupuesto);
  const hayTope = Number.isFinite(tope) && tope > 0;
  const excede = hayTope && totalEfectivo > tope;

  // Una orden por proveedor: la cola se agrupa igual que los borradores que se van a crear.
  const grupos: { clave: string; nombre: string; plazo: number | null; pedible: boolean; items: ItemReorden[] }[] = [];
  for (const i of cola) {
    const prov = i.articulo.proveedorId ? s.proveedor(i.articulo.proveedorId) : undefined;
    const clave = prov?.activo ? prov.id : "sin-proveedor";
    let g = grupos.find((x) => x.clave === clave);
    if (!g) {
      g = prov?.activo
        ? { clave, nombre: prov.nombre, plazo: prov.plazoEntregaDias, pedible: true, items: [] }
        : { clave, nombre: "Sin proveedor activo", plazo: null, pedible: false, items: [] };
      grupos.push(g);
    }
    g.items.push(i);
  }
  grupos.sort((x, y) => Number(y.pedible) - Number(x.pedible));

  useEffect(() => {
    if (refTodos.current) refTodos.current.indeterminate = algunos && !todos;
  }, [algunos, todos]);

  const alternar = (id: string) => {
    setSeleccion((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  };

  const alternarTodos = () => {
    setSeleccion(todos ? new Set() : new Set(pedibles.map((i) => i.articulo.id)));
  };

  const sugerirPlan = () => {
    const candidatos = pedibles.filter((i) => cantidadDe(i) > 0);
    if (candidatos.length === 0) {
      setPlanMsg("No hay artículos con cantidad pedible.");
      return;
    }
    if (!hayTope) {
      setSeleccion(new Set(candidatos.map((i) => i.articulo.id)));
      const total = candidatos.reduce((t, i) => t + cantidadDe(i) * i.articulo.costoUnitario, 0);
      setPlanMsg(
        `Plan completo: ${formatearEntero(candidatos.length)} artículos por ${formatearMoneda(total)}.`,
      );
      return;
    }

    const elegidos: ItemReorden[] = [];
    let total = 0;
    for (const i of candidatos) {
      const costo = cantidadDe(i) * i.articulo.costoUnitario;
      if (total + costo > tope) break;
      elegidos.push(i);
      total += costo;
    }
    setSeleccion(new Set(elegidos.map((i) => i.articulo.id)));
    if (elegidos.length === 0) {
      const primero = cantidadDe(candidatos[0]) * candidatos[0].articulo.costoUnitario;
      setPlanMsg(
        `El presupuesto no cubre el primer artículo (${formatearMoneda(primero)}). Súbelo o ajusta cantidades.`,
      );
    } else {
      setPlanMsg(
        `Plan de ${formatearEntero(elegidos.length)} de ${formatearEntero(candidatos.length)} artículos: ${formatearMoneda(total)} de ${formatearMoneda(tope)}.`,
      );
    }
  };

  const crear = () => {
    if (efectivos.length === 0) {
      mostrar(
        haySeleccion
          ? "La selección no tiene cantidades por pedir."
          : "No hay artículos pedibles en la cola.",
      );
      return;
    }
    const ids = efectivos.map((i) => i.articulo.id);
    const cantidades = Object.fromEntries(
      efectivos.map((i) => [i.articulo.id, cantidadDe(i)]),
    );
    const r = s.generarOrdenesDesdeReorden(ids, cantidades, notaPlan);
    if (!r.ok) return mostrar(r.error);
    setEditadas((e) => {
      const siguiente = { ...e };
      for (const id of ids) delete siguiente[id];
      return siguiente;
    });
    const { ordenes, omitidos } = r.valor;
    if (ordenes.length === 0) {
      return mostrar("No se pudo crear ninguna orden con la selección actual.");
    }
    const extra = omitidos > 0 ? ` (${omitidos} omitidos)` : "";
    if (ordenes.length === 1) {
      mostrar(`${ordenes[0].numero} creada como borrador${extra}`);
      navigate(`/inventarios/ordenes-compra?oc=${ordenes[0].id}`);
    } else {
      mostrar(`${ordenes.length} órdenes creadas como borrador${extra}`);
      navigate("/inventarios/ordenes-compra?tab=borradores");
    }
  };

  const campoCantidad = (i: ItemReorden, bloqueo: Motivo | null) => (
    <input
      className="rq-qty"
      type="number"
      inputMode="numeric"
      min={0}
      step={s.config.multiploPedido}
      aria-label={`Cantidad a pedir de ${i.articulo.nombre}`}
      disabled={Boolean(bloqueo)}
      value={editadas[i.articulo.id] ?? String(i.sugerido)}
      onChange={(e) =>
        setEditadas((x) => ({ ...x, [i.articulo.id]: e.target.value }))
      }
    />
  );

  return (
    <PaginaInventario
      titulo="Cola de reorden"
      resumen={
        cola.length === 0 ? (
          "Nada por reponer: todos los artículos están sobre su punto de reorden."
        ) : (
          <>
            <strong>{formatearEntero(cola.length)} artículos</strong> necesitan atención
            {agotados > 0 && ` · ${formatearEntero(agotados)} agotados`} ·{" "}
            {formatearMoneda(totalSugerido)} sugeridos
          </>
        )
      }
      acciones={
        <Boton
          className="rq-primary"
          variante="principal"
          icono={<ShoppingCart className="h-4 w-4" />}
          onClick={crear}
          disabled={proveedoresParaCrear === 0}
        >
          {proveedoresParaCrear > 0
            ? `Crear ${proveedoresParaCrear} ${proveedoresParaCrear === 1 ? "orden" : "órdenes"}`
            : "Crear órdenes"}
        </Boton>
      }
    >
      <div className="rq-page">
        {cola.length > 0 && (
          <>
            <section className="rq-plan" aria-labelledby="rq-plan-title">
              <h2 id="rq-plan-title" className="rq-plan__title">Ajustar a un presupuesto</h2>
              <p className="rq-plan__intro">
                Opcional. Entran primero los agotados y luego los bajos, sin pasarse del tope.
              </p>
              <div className="rq-plan__fields">
                <label className="rq-field">
                  <span>Presupuesto</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    inputMode="numeric"
                    placeholder="Ej. 5000000"
                    value={presupuesto}
                    onChange={(e) => {
                      setPresupuesto(e.target.value);
                      setPlanMsg(null);
                    }}
                  />
                </label>
                <label className="rq-field">
                  <span>Nota para las órdenes</span>
                  <input
                    type="text"
                    placeholder="Se copia en cada orden"
                    value={notaPlan}
                    onChange={(e) => setNotaPlan(e.target.value)}
                  />
                </label>
                <Boton className="rq-plan__go" onClick={sugerirPlan} disabled={pedibles.length === 0}>
                  {hayTope ? "Seleccionar dentro del tope" : "Seleccionar todo lo pedible"}
                </Boton>
              </div>
              {planMsg && (
                <p className="rq-plan__msg" role="status">
                  {planMsg}
                </p>
              )}
            </section>

            <div className="rq-bar">
              <label className="rq-checkall">
                <input
                  ref={refTodos}
                  type="checkbox"
                  checked={todos}
                  onChange={alternarTodos}
                  disabled={pedibles.length === 0}
                />
                <span>
                  Seleccionar los {formatearEntero(pedibles.length)} pedibles
                  {bloqueados > 0 && ` (${formatearEntero(bloqueados)} sin proveedor o cubiertos)`}
                </span>
              </label>
              <span className={cx("rq-bar__sum", excede && "is-over")}>
                {haySeleccion ? (
                  <>
                    {formatearEntero(seleccionados.length)} de{" "}
                    {formatearEntero(pedibles.length)} · {formatearMoneda(totalSeleccionado)}
                    {excede && ` · excede ${formatearMoneda(totalSeleccionado - tope)}`}
                  </>
                ) : (
                  <>
                    Sin selección se pide toda la cola · {formatearMoneda(totalSugerido)}
                    {excede && ` · excede ${formatearMoneda(totalSugerido - tope)}`}
                  </>
                )}
              </span>
            </div>

            {grupos.map((g) => {
              const enOrden = g.items.filter((i) => efectivos.includes(i) && cantidadDe(i) > 0);
              const subtotal = enOrden.reduce((t, i) => t + cantidadDe(i) * i.articulo.costoUnitario, 0);
              return (
                <section key={g.clave} className="rq-group" aria-label={g.nombre}>
                  <header className="rq-group__head">
                    <div className="min-w-0">
                      <h3 className="rq-group__name">{g.nombre}</h3>
                      <p className="rq-group__meta">
                        {g.plazo !== null ? `Entrega en ${formatearEntero(g.plazo)} días · ` : ""}
                        {formatearEntero(g.items.length)} {g.items.length === 1 ? "artículo" : "artículos"}
                      </p>
                    </div>
                    {g.pedible && (
                      <p className="rq-group__sum">
                        <span>{enOrden.length > 0 ? "En la orden" : "Fuera de la orden"}</span>
                        <strong>{formatearMoneda(subtotal)}</strong>
                      </p>
                    )}
                  </header>
                  <div className="rq-cols" aria-hidden>
                    <span>Existencia</span>
                    <span>Mínimo</span>
                    <span>Pedir</span>
                    <span>Costo</span>
                  </div>
                  <ul className="rq-list">
                    {g.items.map((i) => {
                      const bloqueo = motivoBloqueo(i);
                      const qty = cantidadDe(i);
                      const estaSeleccionado = seleccion.has(i.articulo.id) && !bloqueo;
                      const esAgotado = i.estado === "agotado";
                      return (
                        <li
                          key={i.articulo.id}
                          className={cx(
                            "rq-row",
                            estaSeleccionado && "is-selected",
                            Boolean(bloqueo) && "is-blocked",
                          )}
                        >
                          <input
                            className="rq-check"
                            type="checkbox"
                            checked={estaSeleccionado}
                            disabled={Boolean(bloqueo)}
                            onChange={() => alternar(i.articulo.id)}
                            aria-label={`Seleccionar ${i.articulo.nombre}`}
                          />
                          <FotoProducto item={i} />
                          <div className="rq-main">
                            <p className="rq-name">{i.articulo.nombre}</p>
                            <p className="rq-meta">
                              <DistintivoStock estado={i.estado} />
                              <span className="rq-meta__text">
                                {i.articulo.sku} · {i.articulo.categoria} · máx {formatearEntero(i.articulo.stockMaximo)}
                              </span>
                            </p>
                            {bloqueo && <p className="rq-blocked">{TEXTO_MOTIVO[bloqueo]}</p>}
                          </div>
                          <div className="rq-stats">
                            <div className="rq-stat">
                              <span>Existencia</span>
                              <strong className={esAgotado ? "is-danger" : undefined}>
                                {formatearEntero(i.stock)}
                              </strong>
                            </div>
                            <div className="rq-stat">
                              <span>Mínimo</span>
                              <strong className="is-quiet">{formatearEntero(i.articulo.puntoReorden)}</strong>
                            </div>
                            <div className="rq-stat rq-stat--qty">
                              <span>Pedir</span>
                              {campoCantidad(i, bloqueo)}
                            </div>
                            <div className="rq-stat rq-stat--cost">
                              <span>Costo</span>
                              <strong>{formatearMoneda(qty * i.articulo.costoUnitario)}</strong>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </>
        )}

        {cola.length === 0 && (
          <Vacio
            accion={
              <Boton variante="texto" onClick={() => navigate("/inventarios/articulos")}>
                Ver catálogo
              </Boton>
            }
          >
            Cuando un artículo llegue a su punto de reorden aparecerá aquí, listo para pedir.
          </Vacio>
        )}

        <Aviso texto={aviso} />
      </div>
    </PaginaInventario>
  );
});

export default ReordenPage;
