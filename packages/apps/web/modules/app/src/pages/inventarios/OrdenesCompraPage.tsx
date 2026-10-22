/**
 * Órdenes de compra.
 *
 * Pregunta de la pantalla: «¿qué está por llegar y qué está atrasado?». Por eso
 * la pestaña por defecto es «En curso» y la columna Llegada dice en palabras
 * cuándo llega o cuánto lleva de retraso.
 */
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { observer } from "mobx-react-lite";
import { Plus, Trash2 } from "lucide-react";
import {
  inventarioStore,
  fechaRelativa,
  formatearEntero,
  formatearFecha,
  formatearMoneda,
  ordenAbierta,
  stockTotal,
  totalOrden,
  unidadesPendientes,
  type EstadoOrdenCompra,
  type OrdenCompra,
} from "@/stores";
import {
  Aviso,
  BarraAvance,
  BarraHerramientas,
  Boton,
  Buscador,
  Campo,
  CeldaDoble,
  Confirmar,
  ContactoProveedor,
  CONTROL,
  cx,
  DistintivoOrden,
  Falta,
  FilaMovil,
  ListaDatos,
  MensajeError,
  PaginaInventario,
  PanelLateral,
  Pestanas,
  Subtitulo,
  TABLA,
  useAviso,
  useUltimo,
  Vacio,
} from "./inventario.ui";

type Pestana = "curso" | "borradores" | "recibidas" | "canceladas" | "todas";

const PESTANAS: Pestana[] = ["curso", "borradores", "recibidas", "canceladas", "todas"];

const EN_PESTANA: Record<Pestana, (e: EstadoOrdenCompra) => boolean> = {
  curso: (e) => e === "enviada" || e === "parcial",
  borradores: (e) => e === "borrador",
  recibidas: (e) => e === "recibida",
  canceladas: (e) => e === "cancelada",
  todas: () => true,
};

/** Una orden abierta cuya fecha esperada ya pasó (por día de calendario). */
function atrasada(oc: OrdenCompra): boolean {
  if (!ordenAbierta(oc) || !oc.fechaEsperada) return false;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return new Date(oc.fechaEsperada).getTime() < hoy.getTime();
}

function unidades(oc: OrdenCompra) {
  return oc.lineas.reduce(
    (t, l) => ({ pedidas: t.pedidas + l.cantidad, recibidas: t.recibidas + l.recibida }),
    { pedidas: 0, recibidas: 0 },
  );
}

/** «Caja de cartón 40x30x30 y 1 más»: qué se pidió, sin abrir la orden. */
function resumenArticulos(oc: OrdenCompra): string {
  const primero = inventarioStore.articulo(oc.lineas[0]?.articuloId ?? "")?.nombre ?? "Sin artículos";
  const resto = oc.lineas.length - 1;
  return resto > 0 ? `${primero} y ${resto} más` : primero;
}

function Llegada({ oc }: { oc: OrdenCompra }) {
  if (oc.estado === "recibida") {
    const f = oc.fechaRecepcion ?? oc.fechaEsperada;
    return f ? <span className="text-gray-600 dark:text-gray-400">Llegó {fechaRelativa(f)}</span> : <Falta />;
  }
  if (!oc.fechaEsperada) return <Falta />;
  if (atrasada(oc)) return <span className="text-error-700 dark:text-error-400">Atrasada · {fechaRelativa(oc.fechaEsperada)}</span>;
  if (oc.estado === "cancelada") return <span className="text-gray-600 dark:text-gray-400">{formatearFecha(oc.fechaEsperada)}</span>;
  return <span>{fechaRelativa(oc.fechaEsperada)}</span>;
}

const ETAPAS: { estado: EstadoOrdenCompra; etiqueta: string }[] = [
  { estado: "borrador", etiqueta: "Borrador" },
  { estado: "enviada", etiqueta: "Enviada" },
  { estado: "parcial", etiqueta: "Llegando" },
  { estado: "recibida", etiqueta: "Recibida" },
];

/**
 * En qué punto va la orden, de borrador a recibida. Una orden enviada que aún
 * no recibe nada salta directo de «Enviada» a «Recibida» si llega completa; por
 * eso «Llegando» solo se marca cuando de verdad hubo una llegada parcial.
 */
function EtapasOrden({ oc }: { oc: OrdenCompra }) {
  if (oc.estado === "cancelada") {
    return (
      <p className="rounded-xl bg-gray-50 px-4 py-3 text-theme-sm text-gray-700 dark:bg-white/[0.03] dark:text-gray-300">
        Orden cancelada: ya no se espera nada de ella.
      </p>
    );
  }
  const actual = ETAPAS.findIndex((e) => e.estado === oc.estado);
  const fecha: Partial<Record<EstadoOrdenCompra, string>> = {
    borrador: `Creada ${fechaRelativa(oc.fechaCreacion)}`,
    recibida: oc.fechaRecepcion ? `Llegó ${fechaRelativa(oc.fechaRecepcion)}` : undefined,
  };
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Etapas de la orden">
      {ETAPAS.map((e, i) => {
        const hecha = i <= actual;
        return (
          <li key={e.estado} aria-current={i === actual ? "step" : undefined} className="min-w-0">
            <span className={cx("block h-1.5 rounded-full", hecha ? "bg-ink-title dark:bg-accent-300" : "bg-gray-200 dark:bg-white/10")} />
            <span className={cx("mt-2 block truncate text-theme-xs", i === actual ? "font-bold text-ink-body dark:text-white" : hecha ? "text-ink-body dark:text-gray-300" : "text-gray-500")}>
              {e.etiqueta}
            </span>
            {fecha[e.estado] && hecha && <span className="block truncate text-theme-xs text-gray-600 dark:text-gray-400">{fecha[e.estado]}</span>}
          </li>
        );
      })}
    </ol>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DETALLE Y RECEPCIÓN
// ═══════════════════════════════════════════════════════════════════════════

const PanelDetalle = observer(function PanelDetalle({
  orden,
  onCerrar,
  mostrar,
}: {
  orden: OrdenCompra | null;
  onCerrar: () => void;
  mostrar: (t: string) => void;
}) {
  const s = inventarioStore;
  const { valor: ultima, abierto } = useUltimo(orden);
  const [recibiendo, setRecibiendo] = useState(false);
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);

  // Al cambiar de orden se sale del modo recepción.
  useEffect(() => {
    setRecibiendo(false);
    setError(null);
  }, [ultima?.id]);

  if (!ultima) return null;
  const oc = ultima;

  const empezarRecepcion = () => {
    setCantidades(Object.fromEntries(oc.lineas.map((l) => [l.articuloId, String(unidadesPendientes(l))])));
    setError(null);
    setRecibiendo(true);
  };

  const confirmarRecepcion = () => {
    const recepcion: Record<string, number> = {};
    for (const [id, v] of Object.entries(cantidades)) {
      if (v.trim() === "") continue;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0) return setError("Las cantidades recibidas deben ser enteros de cero o más.");
      if (n > 0) recepcion[id] = n;
    }
    const r = s.recibirOrden(oc.id, recepcion);
    if (!r.ok) return setError(r.error);
    setRecibiendo(false);
    mostrar(r.valor.estado === "recibida" ? `${oc.numero} recibida completa` : `Llegada registrada en ${oc.numero}; queda saldo pendiente`);
  };

  const enviar = () => {
    const r = s.enviarOrden(oc.id);
    if (!r.ok) return setError(r.error);
    mostrar(`${oc.numero} enviada a ${s.nombreProveedor(oc.proveedorId)}`);
  };

  const cancelar = () => {
    setCancelando(false);
    const r = s.cancelarOrden(oc.id);
    if (!r.ok) return setError(r.error);
    mostrar(`${oc.numero} cancelada`);
  };

  const u = unidades(oc);
  const proveedor = s.proveedor(oc.proveedorId);
  const cerrable = oc.estado !== "recibida" && oc.estado !== "cancelada";

  const pie = recibiendo ? (
    <>
      <Boton variante="texto" onClick={() => setRecibiendo(false)}>
        Volver
      </Boton>
      <Boton variante="principal" onClick={confirmarRecepcion}>
        Confirmar llegada
      </Boton>
    </>
  ) : (
    <>
      {cerrable && (
        <Boton variante="texto" onClick={() => setCancelando(true)}>
          Cancelar orden
        </Boton>
      )}
      {oc.estado === "borrador" && (
        <Boton variante="principal" onClick={enviar}>
          Enviar al proveedor
        </Boton>
      )}
      {ordenAbierta(oc) && (
        <Boton variante="principal" onClick={empezarRecepcion}>
          Registrar llegada
        </Boton>
      )}
    </>
  );

  return (
    <PanelLateral
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={oc.numero}
      subtitulo={
        <span className="flex flex-wrap items-center gap-2">
          {s.nombreProveedor(oc.proveedorId)}
          <DistintivoOrden estado={oc.estado} />
        </span>
      }
      ancho="sm:max-w-2xl"
      pie={pie}
    >
      {!recibiendo && <EtapasOrden oc={oc} />}

      {!recibiendo && atrasada(oc) && oc.fechaEsperada && (
        <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-theme-sm text-error-800 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
          <p className="font-bold">Se esperaba {fechaRelativa(oc.fechaEsperada)} y faltan {formatearEntero(u.pedidas - u.recibidas)} unidades.</p>
          <p className="mt-0.5">Confirma con el proveedor cuándo llega el saldo.</p>
          {proveedor && (
            <div className="mt-3">
              <ContactoProveedor proveedor={proveedor} mensaje={`Sobre la orden ${oc.numero}`} />
            </div>
          )}
        </div>
      )}

      {!recibiendo && (
        <ListaDatos
          items={[
            { etiqueta: "Llega a", valor: s.nombreUbicacion(oc.destinoId) },
            { etiqueta: "Llegada esperada", valor: <Llegada oc={oc} /> },
            { etiqueta: "Creada", valor: formatearFecha(oc.fechaCreacion) },
            { etiqueta: "Recibido", valor: <span className="tabular-nums">{formatearEntero(u.recibidas)} de {formatearEntero(u.pedidas)} unidades</span> },
          ]}
        />
      )}

      {recibiendo ? (
        <section>
          <Subtitulo
            accion={
              <button
                type="button"
                onClick={() => setCantidades(Object.fromEntries(oc.lineas.map((l) => [l.articuloId, String(unidadesPendientes(l))])))}
                className="text-theme-sm font-bold text-ink-title hover:underline dark:text-white"
              >
                Recibir todo lo pendiente
              </button>
            }
          >
            ¿Qué llegó?
          </Subtitulo>
          <p className="mb-3 text-theme-sm text-gray-600 dark:text-gray-400">
            Escribe cuántas unidades llegaron hoy de cada artículo. Entran a {s.nombreUbicacion(oc.destinoId)}.
          </p>
          <ul>
            {oc.lineas.map((l) => {
              const a = s.articulo(l.articuloId);
              const pendiente = unidadesPendientes(l);
              return (
                <li key={l.articuloId} className="flex items-center justify-between gap-3 border-t border-gray-100 py-3 first:border-t-0 dark:border-white/5">
                  <CeldaDoble principal={a?.nombre ?? "Artículo eliminado"} secundaria={pendiente > 0 ? `Pendiente: ${formatearEntero(pendiente)}` : "Ya recibido completo"} />
                  <input
                    className={cx(CONTROL.replace("w-full ", ""), "w-24 shrink-0 text-right tabular-nums")}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={pendiente}
                    step={1}
                    disabled={pendiente === 0}
                    aria-label={`Unidades recibidas de ${a?.nombre ?? "artículo"}`}
                    value={cantidades[l.articuloId] ?? ""}
                    onChange={(e) => setCantidades((c) => ({ ...c, [l.articuloId]: e.target.value }))}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <section>
          <Subtitulo>
            {oc.lineas.length} {oc.lineas.length === 1 ? "artículo" : "artículos"}
          </Subtitulo>
          <ul>
            {oc.lineas.map((l) => {
              const a = s.articulo(l.articuloId);
              const pendiente = unidadesPendientes(l);
              return (
                <li key={l.articuloId} className="border-t border-gray-100 py-3 first:border-t-0 dark:border-white/5">
                  <div className="flex items-start justify-between gap-4">
                    <CeldaDoble principal={a?.nombre ?? "Artículo eliminado"} secundaria={`${a?.sku ?? ""} · ${formatearEntero(l.cantidad)} × ${formatearMoneda(l.costoUnitario)}`} />
                    <span className="shrink-0 font-bold tabular-nums text-ink-body dark:text-white">{formatearMoneda(l.cantidad * l.costoUnitario)}</span>
                  </div>
                  {oc.estado !== "borrador" && oc.estado !== "cancelada" && (
                    <div className="mt-2 flex items-center gap-3">
                      <BarraAvance valor={l.recibida} total={l.cantidad} ancho="flex-1" />
                      <span className="shrink-0 text-theme-xs tabular-nums text-gray-600 dark:text-gray-400">
                        {pendiente > 0 ? `${formatearEntero(l.recibida)} de ${formatearEntero(l.cantidad)} · faltan ${formatearEntero(pendiente)}` : "Completo"}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-white/10">
            <span className="font-bold">Total</span>
            <span className="font-bold tabular-nums text-ink-title dark:text-white">{formatearMoneda(totalOrden(oc))}</span>
          </div>
        </section>
      )}

      {!recibiendo && oc.notas && (
        <section>
          <Subtitulo>Notas</Subtitulo>
          <p className="whitespace-pre-line text-gray-700 dark:text-gray-300">{oc.notas}</p>
        </section>
      )}

      {!recibiendo && proveedor && !atrasada(oc) && (
        <section>
          <Subtitulo>Proveedor</Subtitulo>
          <ContactoProveedor proveedor={proveedor} mensaje={`Sobre la orden ${oc.numero}`} />
        </section>
      )}

      <MensajeError>{error}</MensajeError>

      <Confirmar
        abierto={cancelando}
        titulo={`¿Cancelar ${oc.numero}?`}
        textoConfirmar="Cancelar orden"
        peligro
        onConfirmar={cancelar}
        onCancelar={() => setCancelando(false)}
      >
        {u.recibidas > 0
          ? `Lo ya recibido (${formatearEntero(u.recibidas)} unidades) se queda en bodega; el saldo pendiente deja de esperarse.`
          : `La orden a ${s.nombreProveedor(oc.proveedorId)} deja de esperarse. No se puede deshacer.`}
      </Confirmar>
    </PanelLateral>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// NUEVA ORDEN
// ═══════════════════════════════════════════════════════════════════════════

interface LineaBorrador {
  clave: number;
  articuloId: string;
  cantidad: string;
  costo: string;
}

let claveLinea = 0;
const lineaVacia = (): LineaBorrador => ({ clave: claveLinea++, articuloId: "", cantidad: "", costo: "" });

const PanelNuevaOrden = observer(function PanelNuevaOrden({
  abierto,
  proveedorInicial,
  onCerrar,
  onCreada,
}: {
  abierto: boolean;
  proveedorInicial: string;
  onCerrar: () => void;
  onCreada: (oc: OrdenCompra) => void;
}) {
  const s = inventarioStore;
  const [proveedorId, setProveedorId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [fechaEsperada, setFechaEsperada] = useState("");
  const [notas, setNotas] = useState("");
  const [lineas, setLineas] = useState<LineaBorrador[]>([lineaVacia()]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    const valido = s.proveedoresActivos.some((p) => p.id === proveedorInicial);
    setProveedorId(valido ? proveedorInicial : "");
    setDestinoId(s.ubicacionRecepcion?.id ?? "");
    setFechaEsperada("");
    setNotas(s.config.notasOrdenPorDefecto);
    setLineas([lineaVacia()]);
    setError(null);
  }, [abierto, proveedorInicial, s]);

  // Los artículos del proveedor primero: es lo que casi siempre se le pide.
  const activos = [...s.articulosActivos].sort((a, b) => a.nombre.localeCompare(b.nombre));
  const delProveedor = activos.filter((a) => a.proveedorId === proveedorId);
  const otros = activos.filter((a) => a.proveedorId !== proveedorId);

  const enReorden = s.colaReorden.filter(
    (i) => proveedorId && i.articulo.proveedorId === proveedorId && i.sugerido > 0 && !lineas.some((l) => l.articuloId === i.articulo.id),
  );

  const actualizar = (clave: number, cambio: Partial<LineaBorrador>) =>
    setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, ...cambio } : l)));

  const elegirArticulo = (clave: number, articuloId: string) => {
    const a = s.articulo(articuloId);
    actualizar(clave, { articuloId, costo: a ? String(a.costoUnitario) : "" });
  };

  const agregarReorden = () => {
    const nuevas = enReorden.map((i) => ({ ...lineaVacia(), articuloId: i.articulo.id, cantidad: String(i.sugerido), costo: String(i.articulo.costoUnitario) }));
    // Una línea vacía sobrante se reemplaza en lugar de quedar colgando.
    setLineas((ls) => [...ls.filter((l) => l.articuloId), ...nuevas]);
  };

  const total = lineas.reduce((t, l) => t + (Number(l.cantidad) || 0) * (Number(l.costo) || 0), 0);

  const crear = () => {
    const usadas = lineas.filter((l) => l.articuloId);
    const ids = usadas.map((l) => l.articuloId);
    if (new Set(ids).size !== ids.length) return setError("Hay un artículo repetido; súmalo en una sola línea.");
    for (const l of usadas) {
      const n = Number(l.cantidad);
      const c = Number(l.costo);
      if (!Number.isInteger(n) || n <= 0) return setError("Cada artículo necesita una cantidad entera mayor que cero.");
      if (!Number.isFinite(c) || c < 0 || l.costo.trim() === "") return setError("Revisa los costos: deben ser cero o más.");
    }
    const r = s.crearOrdenCompra({
      proveedorId,
      destinoId,
      fechaEsperada: fechaEsperada ? new Date(`${fechaEsperada}T12:00:00`).toISOString() : null,
      lineas: usadas.map((l) => ({ articuloId: l.articuloId, cantidad: Number(l.cantidad), costoUnitario: Number(l.costo) })),
      notas,
    });
    if (!r.ok) return setError(r.error);
    onCreada(r.valor);
  };

  const proveedor = s.proveedor(proveedorId);

  return (
    <PanelLateral
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Nueva orden de compra"
      subtitulo="Se guarda como borrador; la envías al proveedor cuando esté lista."
      ancho="sm:max-w-2xl"
      pie={
        <>
          <span className="mr-auto text-theme-sm text-gray-600 dark:text-gray-400">
            Total <span className="font-bold tabular-nums text-ink-title dark:text-white">{formatearMoneda(total)}</span>
          </span>
          <Boton variante="texto" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="principal" onClick={crear}>
            Crear borrador
          </Boton>
        </>
      }
    >
      <fieldset className="space-y-4">
        <legend className="mb-1 text-theme-md font-bold text-ink-title dark:text-white">A quién y adónde</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Proveedor" ayuda={proveedor ? `Entrega en ${proveedor.plazoEntregaDias} días · ${proveedor.condicionesPago}` : undefined}>
            <select className={CONTROL} value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} autoFocus>
              <option value="">Elige un proveedor</option>
              {s.proveedoresActivos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Llega a">
            <select className={CONTROL} value={destinoId} onChange={(e) => setDestinoId(e.target.value)}>
              {s.ubicacionesActivas.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo etiqueta="Llegada esperada (opcional)" ayuda="Si la dejas vacía se calcula con el plazo del proveedor al enviarla.">
          <input className={CONTROL} type="date" value={fechaEsperada} onChange={(e) => setFechaEsperada(e.target.value)} />
        </Campo>
      </fieldset>

      <section>
        <Subtitulo>Qué se pide</Subtitulo>
        {enReorden.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3.5 py-3 dark:bg-white/[0.03]">
            <p className="text-theme-sm text-gray-700 dark:text-gray-300">
              {enReorden.length === 1 ? "1 artículo de este proveedor está por reponer." : `${enReorden.length} artículos de este proveedor están por reponer.`}
            </p>
            <button type="button" onClick={agregarReorden} className="text-theme-sm font-bold text-ink-title hover:underline dark:text-white">
              Agregarlos
            </button>
          </div>
        )}
        <div className="space-y-3">
          {lineas.map((l) => {
            const subtotal = (Number(l.cantidad) || 0) * (Number(l.costo) || 0);
            return (
              <div key={l.clave} className="grid grid-cols-[1fr_auto] gap-2 border-t border-gray-100 pt-3 first:border-t-0 first:pt-0 sm:grid-cols-[1fr_88px_120px_auto] dark:border-white/5">
                <select
                  className={cx(CONTROL, "col-span-2 sm:col-span-1")}
                  value={l.articuloId}
                  onChange={(e) => elegirArticulo(l.clave, e.target.value)}
                  aria-label="Artículo"
                >
                  <option value="">Elige un artículo</option>
                  {delProveedor.length > 0 && (
                    <optgroup label="De este proveedor">
                      {delProveedor.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre} ({formatearEntero(stockTotal(a))} en stock)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label={delProveedor.length > 0 ? "Otros artículos" : "Artículos"}>
                    {otros.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre} ({formatearEntero(stockTotal(a))} en stock)
                      </option>
                    ))}
                  </optgroup>
                </select>
                <div className="col-span-2 grid grid-cols-[88px_1fr_auto] gap-2 sm:contents">
                  <input
                    className={cx(CONTROL, "text-right tabular-nums")}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    placeholder="Cant."
                    aria-label="Cantidad"
                    value={l.cantidad}
                    onChange={(e) => actualizar(l.clave, { cantidad: e.target.value })}
                  />
                  <input
                    className={cx(CONTROL, "text-right tabular-nums")}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="Costo c/u"
                    aria-label="Costo por unidad"
                    value={l.costo}
                    onChange={(e) => actualizar(l.clave, { costo: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setLineas((ls) => (ls.length > 1 ? ls.filter((x) => x.clave !== l.clave) : [lineaVacia()]))}
                    aria-label="Quitar línea"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-gray-500 hover:bg-gray-100 hover:text-error-700 dark:hover:bg-white/5"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {subtotal > 0 && (
                  <p className="col-span-2 text-right text-theme-xs tabular-nums text-gray-600 sm:col-span-4 dark:text-gray-400">Subtotal {formatearMoneda(subtotal)}</p>
                )}
              </div>
            );
          })}
        </div>
        <Boton variante="texto" className="mt-3 -ml-3" icono={<Plus className="h-4 w-4" />} onClick={() => setLineas((ls) => [...ls, lineaVacia()])}>
          Agregar artículo
        </Boton>
      </section>

      <Campo etiqueta="Notas para el proveedor">
        <textarea className={cx(CONTROL, "h-auto min-h-[88px] py-2.5")} value={notas} onChange={(e) => setNotas(e.target.value)} />
      </Campo>

      <MensajeError>{error}</MensajeError>
    </PanelLateral>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA
// ═══════════════════════════════════════════════════════════════════════════

export const OrdenesCompraPage = observer(function OrdenesCompraPage() {
  const s = inventarioStore;
  const [params, setParams] = useSearchParams();
  const { aviso, mostrar } = useAviso();
  const tabUrl = params.get("tab") as Pestana | null;
  const [pestana, setPestana] = useState<Pestana>(tabUrl && PESTANAS.includes(tabUrl) ? tabUrl : "curso");
  const [busqueda, setBusqueda] = useState("");

  // `?tab=` llega desde la cola de reorden; se aplica una vez y se limpia.
  useEffect(() => {
    if (!tabUrl) return;
    if (PESTANAS.includes(tabUrl)) setPestana(tabUrl);
    const p = new URLSearchParams(params);
    p.delete("tab");
    setParams(p, { replace: true });
  }, [tabUrl, params, setParams]);

  const detalleId = params.get("oc");
  const detalle = detalleId ? s.orden(detalleId) ?? null : null;
  const nueva = params.get("nueva") === "1";
  const proveedorInicial = params.get("proveedor") ?? "";

  const cambiarParams = (cambios: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(cambios)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    setParams(p, { replace: true });
  };

  const q = busqueda.trim().toLowerCase();
  const filtradas = s.ordenes.filter(
    (o) => !q || o.numero.toLowerCase().includes(q) || s.nombreProveedor(o.proveedorId).toLowerCase().includes(q),
  );
  const cuenta = (p: Pestana) => filtradas.filter((o) => EN_PESTANA[p](o.estado)).length;
  const visibles = filtradas
    .filter((o) => EN_PESTANA[pestana](o.estado))
    .sort((a, b) => {
      // En curso: lo atrasado y lo más próximo primero; el resto, lo más reciente primero.
      if (pestana === "curso") return (a.fechaEsperada ?? "9").localeCompare(b.fechaEsperada ?? "9");
      return b.fechaCreacion.localeCompare(a.fechaCreacion);
    });
  const totalVisible = visibles.reduce((t, o) => t + totalOrden(o), 0);

  const abiertas = s.ordenes.filter(ordenAbierta);
  const atrasadas = abiertas.filter(atrasada).length;
  const borradores = s.ordenes.filter((o) => o.estado === "borrador").length;

  return (
    <PaginaInventario
      titulo="Órdenes de compra"
      resumen={
        abiertas.length === 0 ? (
          "No hay órdenes en camino."
        ) : (
          <>
            {abiertas.length === 1 ? "1 orden en camino" : `${formatearEntero(abiertas.length)} órdenes en camino`} por {formatearMoneda(s.resumen.valorEnTransito)} pendientes de llegar
            {atrasadas > 0 && (
              <>
                {" · "}
                <span className="font-bold text-error-700 dark:text-error-400">{atrasadas === 1 ? "1 atrasada" : `${atrasadas} atrasadas`}</span>
              </>
            )}
            {borradores > 0 && ` · ${borradores === 1 ? "1 borrador sin enviar" : `${borradores} borradores sin enviar`}`}
          </>
        )
      }
      acciones={
        <Boton variante="principal" icono={<Plus className="h-4 w-4" />} onClick={() => cambiarParams({ nueva: "1", oc: null })}>
          Nueva orden
        </Boton>
      }
      pestanas={
        <Pestanas<Pestana>
          valor={pestana}
          onCambio={setPestana}
          opciones={[
            { valor: "curso", etiqueta: "En curso", cuenta: cuenta("curso") },
            { valor: "borradores", etiqueta: "Borradores", cuenta: cuenta("borradores") },
            { valor: "recibidas", etiqueta: "Recibidas", cuenta: cuenta("recibidas") },
            { valor: "canceladas", etiqueta: "Canceladas", cuenta: cuenta("canceladas") },
            { valor: "todas", etiqueta: "Todas", cuenta: cuenta("todas") },
          ]}
        />
      }
    >
      <BarraHerramientas
        extremo={
          <span className="tabular-nums">
            {formatearEntero(visibles.length)} {visibles.length === 1 ? "orden" : "órdenes"} · {formatearMoneda(totalVisible)}
          </span>
        }
      >
        <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Buscar por número o proveedor" />
      </BarraHerramientas>

      {visibles.length === 0 ? (
        <Vacio
          accion={
            pestana === "curso" || pestana === "borradores" ? (
              <Boton variante="texto" onClick={() => cambiarParams({ nueva: "1" })}>
                Crear una orden
              </Boton>
            ) : undefined
          }
        >
          {q
            ? "Ninguna orden coincide con la búsqueda."
            : pestana === "curso"
              ? "Nada en camino: no hay órdenes enviadas pendientes de llegar."
              : pestana === "borradores"
                ? "No hay borradores sin enviar."
                : "No hay órdenes en esta pestaña."}
        </Vacio>
      ) : (
        <>
          <table className={cx(TABLA.tabla, "hidden sm:table")}>
            <thead>
              <tr>
                <th className={TABLA.th}>Orden</th>
                <th className={cx(TABLA.th, "hidden xl:table-cell")}>Artículos</th>
                <th className={TABLA.th}>Estado</th>
                <th className={TABLA.th}>Llegada</th>
                <th className={cx(TABLA.th, "hidden md:table-cell")}>Recibido</th>
                <th className={TABLA.thNum}>Total</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((o) => {
                const u = unidades(o);
                return (
                  <tr
                    key={o.id}
                    className={TABLA.filaClic}
                    tabIndex={0}
                    onClick={() => cambiarParams({ oc: o.id })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        cambiarParams({ oc: o.id });
                      }
                    }}
                  >
                    <td className={cx(TABLA.td, "max-w-[300px]")}>
                      <CeldaDoble principal={o.numero} secundaria={s.nombreProveedor(o.proveedorId)} />
                    </td>
                    <td className={cx(TABLA.td, "hidden max-w-[320px] text-gray-600 xl:table-cell dark:text-gray-400")}>
                      <span className="block truncate">{resumenArticulos(o)}</span>
                    </td>
                    <td className={TABLA.td}>
                      <DistintivoOrden estado={o.estado} />
                    </td>
                    <td className={cx(TABLA.td, "whitespace-nowrap")}>
                      <Llegada oc={o} />
                    </td>
                    <td className={cx(TABLA.td, "hidden md:table-cell")}>
                      <div className="flex items-center gap-3">
                        <span className="w-24 whitespace-nowrap text-right tabular-nums text-gray-700 dark:text-gray-300">
                          {formatearEntero(u.recibidas)} de {formatearEntero(u.pedidas)}
                        </span>
                        <BarraAvance valor={u.recibidas} total={u.pedidas} />
                      </div>
                    </td>
                    <td className={TABLA.tdNum}>{formatearMoneda(totalOrden(o))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="sm:hidden">
            {visibles.map((o) => (
              <FilaMovil
                key={o.id}
                onClick={() => cambiarParams({ oc: o.id })}
                titulo={`${o.numero} · ${s.nombreProveedor(o.proveedorId)}`}
                detalle={
                  <span className="flex flex-wrap items-center gap-2">
                    <DistintivoOrden estado={o.estado} />
                    <Llegada oc={o} />
                  </span>
                }
                cifra={<span className="font-bold text-ink-body dark:text-white">{formatearMoneda(totalOrden(o))}</span>}
              />
            ))}
          </div>
        </>
      )}

      <PanelDetalle orden={detalle && !nueva ? detalle : null} onCerrar={() => cambiarParams({ oc: null })} mostrar={mostrar} />

      <PanelNuevaOrden
        abierto={nueva}
        proveedorInicial={proveedorInicial}
        onCerrar={() => cambiarParams({ nueva: null, proveedor: null })}
        onCreada={(oc) => {
          mostrar(`${oc.numero} creada como borrador`);
          setPestana("borradores");
          cambiarParams({ nueva: null, proveedor: null, oc: oc.id });
        }}
      />

      <Aviso texto={aviso} />
    </PaginaInventario>
  );
});

export default OrdenesCompraPage;
