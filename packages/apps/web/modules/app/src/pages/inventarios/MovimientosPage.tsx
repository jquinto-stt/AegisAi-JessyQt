/**
 * Entradas y salidas — el libro de movimientos.
 *
 * Pregunta de la pantalla: «¿qué entró, qué salió y quién lo movió?». La lista
 * va agrupada por día porque así se recuerda el trabajo de bodega («lo de
 * ayer»), y el registro de un movimiento es un solo formulario para los cuatro
 * tipos: el usuario elige qué pasó y el formulario pide solo lo que aplica.
 */
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { observer } from "mobx-react-lite";
import { X } from "lucide-react";
import {
  inventarioStore,
  deltaTotal,
  formatearDelta,
  formatearEntero,
  formatearHora,
  ETIQUETA_TIPO_MOVIMIENTO,
  type Articulo,
  type Movimiento,
  type TipoMovimiento,
} from "@/stores";
import {
  Aviso,
  BarraHerramientas,
  Boton,
  Buscador,
  Campo,
  CeldaDoble,
  CONTROL,
  cx,
  Filtro,
  FilaMovil,
  MensajeError,
  MenuBoton,
  OpcionesTarjeta,
  PaginaInventario,
  PanelLateral,
  Pestanas,
  TABLA,
  useAviso,
  Vacio,
  OPCIONES_MOVIMIENTO,
} from "./inventario.ui";

type PestanaTipo = "todos" | TipoMovimiento;
type Periodo = "hoy" | "7" | "30" | "todo";

const ETIQUETA_PERIODO: Record<Periodo, string> = {
  hoy: "Hoy",
  "7": "Últimos 7 días",
  "30": "Últimos 30 días",
  todo: "Todo el historial",
};

const TIPOS: TipoMovimiento[] = ["entrada", "salida", "transferencia", "ajuste"];

function desdePeriodo(p: Periodo): number {
  if (p === "todo") return -Infinity;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (p !== "hoy") d.setDate(d.getDate() - (Number(p) - 1));
  return d.getTime();
}

/** «Hoy», «Ayer» o «lunes 19 de octubre». */
function etiquetaDia(clave: string): string {
  const [y, m, d] = clave.split("-").map(Number);
  const dia = new Date(y, m - 1, d);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dias = Math.round((hoy.getTime() - dia.getTime()) / 86_400_000);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  const texto = dia.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function claveDia(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Cantidad con el signo que le deja al stock; la transferencia no cambia el total. */
function Cantidad({ m }: { m: Movimiento }) {
  if (m.tipo === "transferencia") return <span className="font-bold tabular-nums text-ink-body dark:text-white">{formatearEntero(m.cantidad)}</span>;
  const d = deltaTotal(m);
  return (
    <span className={cx("font-bold tabular-nums", d > 0 ? "text-success-700 dark:text-success-400" : "text-ink-body dark:text-white")}>
      {formatearDelta(d)}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMULARIO
// ═══════════════════════════════════════════════════════════════════════════

interface Borrador {
  tipo: TipoMovimiento;
  articuloId: string;
  cantidad: string;
  sentido: "sumar" | "restar";
  origenId: string;
  destinoId: string;
  motivo: string;
  referencia: string;
}

function borradorNuevo(tipo: TipoMovimiento, articuloId = ""): Borrador {
  const s = inventarioStore;
  const recepcion = s.ubicacionRecepcion?.id ?? "";
  return {
    tipo,
    articuloId,
    cantidad: "",
    sentido: "restar",
    origenId: "",
    destinoId: tipo === "entrada" ? recepcion : "",
    motivo: s.config.motivos[tipo][0] ?? "",
    referencia: "",
  };
}

const PanelRegistro = observer(function PanelRegistro({
  abierto,
  tipoInicial,
  articuloInicial,
  onCerrar,
  onRegistrado,
}: {
  abierto: boolean;
  tipoInicial: TipoMovimiento;
  articuloInicial: string;
  onCerrar: () => void;
  onRegistrado: (texto: string) => void;
}) {
  const s = inventarioStore;
  const [b, setB] = useState<Borrador>(() => borradorNuevo(tipoInicial, articuloInicial));
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (abierto) {
      setB(borradorNuevo(tipoInicial, articuloInicial));
      setBusqueda("");
      setError(null);
    }
  }, [abierto, tipoInicial, articuloInicial]);

  const cambiar = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setB((x) => ({ ...x, [k]: v }));

  const cambiarTipo = (tipo: TipoMovimiento) =>
    setB((x) => {
      const nuevo = borradorNuevo(tipo, x.articuloId);
      return { ...nuevo, cantidad: x.cantidad };
    });

  const articulo = b.articuloId ? s.articulo(b.articuloId) : undefined;
  const q = busqueda.trim().toLowerCase();
  const candidatos = s.articulosActivos
    .filter((a) => !q || a.nombre.toLowerCase().includes(q) || a.sku.toLowerCase().includes(q))
    .slice()
    .sort((x, y) => x.nombre.localeCompare(y.nombre));

  const hay = (a: Articulo | undefined, ubicacionId: string) => (a && ubicacionId ? a.existencias[ubicacionId] ?? 0 : 0);
  const cantidad = Number(b.cantidad);
  const cantidadValida = b.cantidad.trim() !== "" && Number.isInteger(cantidad) && cantidad > 0;

  // Línea de ayuda calculada en vivo: lo que hay y lo que quedará.
  let ayudaStock: string | null = null;
  if (articulo) {
    if ((b.tipo === "salida" || b.tipo === "transferencia") && b.origenId) {
      const n = hay(articulo, b.origenId);
      ayudaStock = `Hay ${formatearEntero(n)} en ${s.nombreUbicacion(b.origenId)}`;
      if (cantidadValida) ayudaStock += cantidad > n ? `; no alcanza para ${formatearEntero(cantidad)}.` : `; quedarán ${formatearEntero(n - cantidad)}.`;
      else ayudaStock += ".";
    } else if ((b.tipo === "entrada" || b.tipo === "ajuste") && b.destinoId) {
      const n = hay(articulo, b.destinoId);
      ayudaStock = `Hay ${formatearEntero(n)} en ${s.nombreUbicacion(b.destinoId)}`;
      if (cantidadValida) {
        const resultado = b.tipo === "ajuste" && b.sentido === "restar" ? n - cantidad : n + cantidad;
        ayudaStock += resultado < 0 ? `; no se pueden restar ${formatearEntero(cantidad)}.` : `; quedarán ${formatearEntero(resultado)}.`;
      } else ayudaStock += ".";
    }
  }

  const referenciaObligatoria = b.tipo === "salida" && s.config.referenciaObligatoriaSalidas;

  const guardar = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!articulo) return setError("Elige el artículo.");
    if (!cantidadValida) return setError("La cantidad debe ser un número entero mayor que cero.");
    const conSigno = b.tipo === "ajuste" && b.sentido === "restar" ? -cantidad : cantidad;
    const r = s.registrarMovimiento({
      tipo: b.tipo,
      articuloId: articulo.id,
      cantidad: conSigno,
      origenId: b.tipo === "salida" || b.tipo === "transferencia" ? b.origenId || null : null,
      destinoId: b.tipo === "salida" ? null : b.destinoId || null,
      motivo: b.motivo,
      referencia: b.referencia,
    });
    if (!r.ok) return setError(r.error);
    onRegistrado(`${ETIQUETA_TIPO_MOVIMIENTO[b.tipo]} de ${formatearEntero(cantidad)} ${articulo.nombre} ${b.tipo === "ajuste" ? "registrado" : "registrada"}`);
  };

  // Opciones de origen: solo donde hay unidades, con la cifra a la vista.
  const opcionesOrigen = s.ubicacionesActivas.map((u) => ({ u, n: hay(articulo, u.id) }));
  const selectUbicacion = (valor: string, onChange: (v: string) => void, conStock: boolean, excluir?: string) => (
    <select className={CONTROL} value={valor} onChange={(e) => onChange(e.target.value)}>
      <option value="">Elige una ubicación</option>
      {opcionesOrigen
        .filter(({ u }) => u.id !== excluir)
        .map(({ u, n }) => (
          <option key={u.id} value={u.id} disabled={conStock && articulo !== undefined && n === 0}>
            {u.nombre}
            {articulo ? ` (${formatearEntero(n)})` : ""}
          </option>
        ))}
    </select>
  );

  return (
    <PanelLateral
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Registrar movimiento"
      subtitulo="Cada unidad que entra, sale o cambia de lugar queda en el historial."
      pie={
        <>
          <Boton variante="texto" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="principal" onClick={() => guardar()}>
            Registrar {ETIQUETA_TIPO_MOVIMIENTO[b.tipo].toLowerCase()}
          </Boton>
        </>
      }
    >
      <form onSubmit={guardar} className="space-y-6">
        <div>
          <p className="mb-2 text-theme-sm font-bold text-ink-body dark:text-gray-200">¿Qué pasó?</p>
          <OpcionesTarjeta<TipoMovimiento>
            valor={b.tipo}
            onCambio={cambiarTipo}
            columnas={4}
            opciones={OPCIONES_MOVIMIENTO.map((o) => ({ valor: o.tipo, etiqueta: o.etiqueta, descripcion: o.descripcion }))}
          />
        </div>

        <div>
          <p className="mb-2 text-theme-sm font-bold text-ink-body dark:text-gray-200">Artículo</p>
          {articulo ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3.5 py-2.5 dark:border-white/10">
              <CeldaDoble principal={articulo.nombre} secundaria={articulo.sku} />
              <Boton variante="texto" onClick={() => cambiar("articuloId", "")}>
                Cambiar
              </Boton>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                className={CONTROL}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Busca por nombre o código"
                aria-label="Buscar artículo"
                autoFocus
              />
              <ul className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 dark:border-white/10" role="listbox" aria-label="Artículos">
                {candidatos.length === 0 ? (
                  <li className="px-3.5 py-3 text-gray-600 dark:text-gray-400">Ningún artículo coincide.</li>
                ) : (
                  candidatos.slice(0, 30).map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() => cambiar("articuloId", a.id)}
                        className="flex w-full items-center justify-between gap-3 border-t border-gray-100 px-3.5 py-2.5 text-left first:border-t-0 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/[0.03]"
                      >
                        <CeldaDoble principal={a.nombre} secundaria={a.sku} />
                        <span className="shrink-0 tabular-nums text-gray-600 dark:text-gray-400">
                          {formatearEntero(Object.values(a.existencias).reduce((t, n) => t + n, 0))}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        {b.tipo === "ajuste" && (
          <div>
            <p className="mb-2 text-theme-sm font-bold text-ink-body dark:text-gray-200">¿Sobra o falta?</p>
            <OpcionesTarjeta<"sumar" | "restar">
              valor={b.sentido}
              onCambio={(v) => cambiar("sentido", v)}
              opciones={[
                { valor: "sumar", etiqueta: "Sumar", descripcion: "Apareció mercancía que no estaba registrada" },
                { valor: "restar", etiqueta: "Restar", descripcion: "Falta, se dañó o se venció" },
              ]}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Cantidad">
            <input
              className={CONTROL}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={b.cantidad}
              onChange={(e) => cambiar("cantidad", e.target.value)}
              placeholder="0"
            />
          </Campo>

          {(b.tipo === "salida" || b.tipo === "transferencia") && (
            <Campo etiqueta={b.tipo === "salida" ? "Sale de" : "Desde"}>{selectUbicacion(b.origenId, (v) => cambiar("origenId", v), true)}</Campo>
          )}
          {b.tipo === "entrada" && (
            <Campo etiqueta="Entra a">{selectUbicacion(b.destinoId, (v) => cambiar("destinoId", v), false)}</Campo>
          )}
          {b.tipo === "ajuste" && (
            <Campo etiqueta="Ubicación">{selectUbicacion(b.destinoId, (v) => cambiar("destinoId", v), false)}</Campo>
          )}
          {b.tipo === "transferencia" && (
            <Campo etiqueta="Hacia" className="sm:col-start-2">
              {selectUbicacion(b.destinoId, (v) => cambiar("destinoId", v), false, b.origenId)}
            </Campo>
          )}
        </div>

        {ayudaStock && (
          <p className="rounded-xl bg-gray-50 px-3.5 py-3 text-theme-sm text-gray-700 dark:bg-white/[0.03] dark:text-gray-300">{ayudaStock}</p>
        )}

        <div>
          <Campo etiqueta="Motivo">
            <input className={CONTROL} value={b.motivo} onChange={(e) => cambiar("motivo", e.target.value)} placeholder="Escribe el motivo" />
          </Campo>
          <div className="mt-2 flex flex-wrap gap-2">
            {s.config.motivos[b.tipo].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => cambiar("motivo", m)}
                className={cx(
                  "rounded-full border px-3 py-1 text-theme-xs transition-colors",
                  b.motivo === m
                    ? "border-ink-title bg-ink-title text-white dark:border-white dark:bg-white dark:text-gray-900"
                    : "border-gray-300 text-gray-700 hover:border-gray-400 dark:border-white/15 dark:text-gray-300",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <Campo
          etiqueta={referenciaObligatoria ? "Documento de referencia" : "Documento de referencia (opcional)"}
          ayuda={referenciaObligatoria ? "Obligatorio en las salidas: número de pedido o remisión." : "Número de pedido, remisión u orden de compra."}
        >
          <input className={CONTROL} value={b.referencia} onChange={(e) => cambiar("referencia", e.target.value)} placeholder="PED-2301" />
        </Campo>

        <MensajeError>{error}</MensajeError>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </PanelLateral>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA
// ═══════════════════════════════════════════════════════════════════════════

export const MovimientosPage = observer(function MovimientosPage() {
  const s = inventarioStore;
  const [params, setParams] = useSearchParams();
  const { aviso, mostrar } = useAviso();

  const [pestana, setPestana] = useState<PestanaTipo>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [ubicacionId, setUbicacionId] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>("30");
  const [formulario, setFormulario] = useState<{ abierto: boolean; tipo: TipoMovimiento; articuloId: string }>({
    abierto: false,
    tipo: "entrada",
    articuloId: "",
  });

  const articuloFiltro = params.get("articulo") ?? "";
  const articuloFiltrado = articuloFiltro ? s.articulo(articuloFiltro) : undefined;

  // `?nuevo=<tipo>` abre el formulario una vez y se limpia de la URL, para que
  // recargar la página no lo vuelva a abrir.
  useEffect(() => {
    const nuevo = params.get("nuevo") as TipoMovimiento | null;
    if (nuevo && TIPOS.includes(nuevo)) {
      setFormulario({ abierto: true, tipo: nuevo, articuloId: articuloFiltro });
      const p = new URLSearchParams(params);
      p.delete("nuevo");
      setParams(p, { replace: true });
    }
  }, [params, setParams, articuloFiltro]);

  const quitarArticulo = () => {
    const p = new URLSearchParams(params);
    p.delete("articulo");
    setParams(p, { replace: true });
  };

  // Base: todo menos el tipo, para que las cuentas de las pestañas reflejen
  // el periodo y la búsqueda.
  const desde = desdePeriodo(periodo);
  const q = busqueda.trim().toLowerCase();
  const base = s.movimientosRecientes.filter((m) => {
    if (new Date(m.fecha).getTime() < desde) return false;
    if (articuloFiltro && m.articuloId !== articuloFiltro) return false;
    if (ubicacionId && m.origenId !== ubicacionId && m.destinoId !== ubicacionId) return false;
    if (q) {
      const a = s.articulo(m.articuloId);
      if (!`${a?.nombre ?? ""} ${a?.sku ?? ""} ${m.referencia ?? ""}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const cuentas: Record<TipoMovimiento, number> = { entrada: 0, salida: 0, transferencia: 0, ajuste: 0 };
  let entraron = 0;
  let salieron = 0;
  for (const m of base) {
    cuentas[m.tipo]++;
    if (m.tipo === "entrada") entraron += m.cantidad;
    if (m.tipo === "salida") salieron += m.cantidad;
  }
  const visibles = pestana === "todos" ? base : base.filter((m) => m.tipo === pestana);

  const grupos: { clave: string; movimientos: Movimiento[] }[] = [];
  for (const m of visibles) {
    const clave = claveDia(m.fecha);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.clave === clave) ultimo.movimientos.push(m);
    else grupos.push({ clave, movimientos: [m] });
  }

  const abrir = (tipo: TipoMovimiento) => setFormulario({ abierto: true, tipo, articuloId: articuloFiltro });
  const hayFiltros = Boolean(busqueda || ubicacionId || articuloFiltro || periodo !== "30");

  const deA = (m: Movimiento) => {
    const de = m.origenId ? s.nombreUbicacion(m.origenId) : null;
    const a = m.destinoId ? s.nombreUbicacion(m.destinoId) : null;
    if (m.tipo === "transferencia") return `${de} → ${a}`;
    if (m.tipo === "salida") return `Sale de ${de}`;
    if (m.tipo === "entrada") return `Entra a ${a}`;
    return a ?? "—";
  };

  return (
    <PaginaInventario
      titulo="Entradas y salidas"
      resumen={
        base.length === 0
          ? `${ETIQUETA_PERIODO[periodo]}: sin movimientos.`
          : `${ETIQUETA_PERIODO[periodo]}: entraron ${formatearEntero(entraron)} unidades y salieron ${formatearEntero(salieron)}.`
      }
      acciones={
        <MenuBoton
          etiqueta="Registrar movimiento"
          opciones={OPCIONES_MOVIMIENTO.map((o) => ({ etiqueta: o.etiqueta, descripcion: o.descripcion, onSelect: () => abrir(o.tipo) }))}
        />
      }
      pestanas={
        <Pestanas<PestanaTipo>
          valor={pestana}
          onCambio={setPestana}
          opciones={[
            { valor: "todos", etiqueta: "Todos", cuenta: base.length },
            { valor: "entrada", etiqueta: "Entradas", cuenta: cuentas.entrada },
            { valor: "salida", etiqueta: "Salidas", cuenta: cuentas.salida },
            { valor: "transferencia", etiqueta: "Transferencias", cuenta: cuentas.transferencia },
            { valor: "ajuste", etiqueta: "Ajustes", cuenta: cuentas.ajuste },
          ]}
        />
      }
    >
      <BarraHerramientas
        extremo={
          <span className="tabular-nums">
            {formatearEntero(visibles.length)} {visibles.length === 1 ? "movimiento" : "movimientos"}
          </span>
        }
      >
        <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Artículo, código o referencia" />
        <Filtro
          etiqueta="Ubicación"
          valor={ubicacionId}
          onCambio={setUbicacionId}
          opciones={[{ valor: "", etiqueta: "Todas las ubicaciones" }, ...s.ubicaciones.map((u) => ({ valor: u.id, etiqueta: u.nombre }))]}
        />
        <Filtro
          etiqueta="Periodo"
          valor={periodo}
          onCambio={(v) => setPeriodo(v as Periodo)}
          opciones={(Object.keys(ETIQUETA_PERIODO) as Periodo[]).map((p) => ({ valor: p, etiqueta: ETIQUETA_PERIODO[p] }))}
        />
        {articuloFiltrado && (
          <button
            type="button"
            onClick={quitarArticulo}
            className="inline-flex h-9 max-w-full items-center gap-2 rounded-full border border-gray-300 px-3 text-theme-sm text-ink-body hover:bg-gray-50 dark:border-white/15 dark:text-white dark:hover:bg-white/5"
          >
            <span className="truncate">Solo: {articuloFiltrado.nombre}</span>
            <X className="h-4 w-4 shrink-0 text-gray-500" aria-label="Quitar filtro" />
          </button>
        )}
      </BarraHerramientas>

      {visibles.length === 0 ? (
        <Vacio
          accion={
            hayFiltros ? (
              <Boton
                variante="texto"
                onClick={() => {
                  setBusqueda("");
                  setUbicacionId("");
                  setPeriodo("30");
                  if (articuloFiltro) quitarArticulo();
                }}
              >
                Quitar filtros
              </Boton>
            ) : undefined
          }
        >
          {hayFiltros ? "Ningún movimiento coincide con los filtros." : "No hay movimientos en este periodo."}
        </Vacio>
      ) : (
        <>
          {/* Escritorio y tableta: una tabla, con una fila de encabezado por día. */}
          <table className={cx(TABLA.tabla, "hidden sm:table")}>
            <thead>
              <tr>
                <th className={cx(TABLA.th, "w-16")}>Hora</th>
                <th className={TABLA.th}>Artículo</th>
                <th className={TABLA.th}>Movimiento</th>
                <th className={cx(TABLA.th, "hidden lg:table-cell")}>Ubicación</th>
                <th className={cx(TABLA.th, "hidden md:table-cell")}>Responsable</th>
                <th className={TABLA.thNum}>Cantidad</th>
              </tr>
            </thead>
            {grupos.map((g) => (
              <tbody key={g.clave}>
                <tr>
                  <th colSpan={6} scope="colgroup" className="pb-1.5 pt-5 text-left text-theme-xs font-bold text-gray-600 dark:text-gray-400">
                    {etiquetaDia(g.clave)}
                  </th>
                </tr>
                {g.movimientos.map((m) => {
                  const a = s.articulo(m.articuloId);
                  return (
                    <tr key={m.id} className={TABLA.fila}>
                      <td className={cx(TABLA.td, "whitespace-nowrap tabular-nums text-gray-600 dark:text-gray-400")}>{formatearHora(m.fecha)}</td>
                      <td className={cx(TABLA.td, "max-w-[260px]")}>
                        <CeldaDoble principal={a?.nombre ?? "Artículo eliminado"} secundaria={a?.sku} />
                      </td>
                      <td className={cx(TABLA.td, "max-w-[240px]")}>
                        <p className="truncate text-ink-body dark:text-white">{ETIQUETA_TIPO_MOVIMIENTO[m.tipo]}</p>
                        <p className="mt-0.5 truncate text-theme-xs text-gray-600 dark:text-gray-400">
                          {m.motivo}
                          {m.referencia && ` · ${m.referencia}`}
                        </p>
                      </td>
                      <td className={cx(TABLA.td, "hidden text-gray-600 lg:table-cell dark:text-gray-400")}>{deA(m)}</td>
                      <td className={cx(TABLA.td, "hidden text-gray-600 md:table-cell dark:text-gray-400")}>{m.responsable}</td>
                      <td className={TABLA.tdNum}>
                        <Cantidad m={m} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>

          {/* Móvil: lista de dos líneas agrupada por día. */}
          <div className="sm:hidden">
            {grupos.map((g) => (
              <section key={g.clave} className="mt-4 first:mt-0">
                <h2 className="mb-1 text-theme-xs font-bold text-gray-600 dark:text-gray-400">{etiquetaDia(g.clave)}</h2>
                {g.movimientos.map((m) => {
                  const a = s.articulo(m.articuloId);
                  return (
                    <FilaMovil
                      key={m.id}
                      titulo={a?.nombre ?? "Artículo eliminado"}
                      detalle={`${ETIQUETA_TIPO_MOVIMIENTO[m.tipo]} · ${m.motivo} · ${formatearHora(m.fecha)} · ${m.responsable}`}
                      cifra={<Cantidad m={m} />}
                    />
                  );
                })}
              </section>
            ))}
          </div>
        </>
      )}

      <PanelRegistro
        abierto={formulario.abierto}
        tipoInicial={formulario.tipo}
        articuloInicial={formulario.articuloId}
        onCerrar={() => setFormulario((f) => ({ ...f, abierto: false }))}
        onRegistrado={(texto) => {
          setFormulario((f) => ({ ...f, abierto: false }));
          mostrar(texto);
        }}
      />

      <Aviso texto={aviso} />
    </PaginaInventario>
  );
});

export default MovimientosPage;
