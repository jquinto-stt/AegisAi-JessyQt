/**
 * Entradas y salidas — el libro de movimientos.
 *
 * Pregunta de la pantalla: «¿qué entró, qué salió y quién lo movió?». La lista
 * va agrupada por día porque así se recuerda el trabajo de bodega («lo de
 * ayer»), y el registro de un movimiento es un solo formulario para los cuatro
 * tipos: el usuario elige qué pasó y el formulario pide solo lo que aplica.
 */
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { observer } from "mobx-react-lite";
import { ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, SlidersHorizontal, X } from "lucide-react";
import {
  inventarioStore,
  deltaTotal,
  formatearDelta,
  formatearEntero,
  formatearFechaHora,
  formatearHora,
  formatearMoneda,
  stockTotal,
  ETIQUETA_TIPO_MOVIMIENTO,
  ETIQUETA_UNIDAD,
  type Articulo,
  type Movimiento,
  type TipoMovimiento,
  type UnidadMedida,
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
  Falta,
  Filtro,
  FilaMovil,
  MensajeError,
  MenuBoton,
  OpcionesTarjeta,
  PaginaInventario,
  PanelLateral,
  useAviso,
  useUltimo,
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

const UNIDAD_PLURAL: Record<UnidadMedida, string> = {
  unidad: "unidades",
  caja: "cajas",
  paquete: "paquetes",
  rollo: "rollos",
  litro: "litros",
  kg: "kg",
  resma: "resmas",
};

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
  if (m.tipo === "transferencia") return <span className="tabular-nums text-gray-600 dark:text-gray-400">{formatearEntero(m.cantidad)} movidas</span>;
  const d = deltaTotal(m);
  return (
    <span className={cx("font-bold tabular-nums", d > 0 ? "text-ink-title dark:text-accent-300" : "text-ink-body dark:text-white")}>
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
  /** Solo entradas: costo por unidad de lo que llega. Vacío = el costo actual del artículo. */
  costo: string;
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
    costo: "",
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
    const costo = b.costo.trim() === "" ? undefined : Number(b.costo);
    if (costo !== undefined && !(Number.isFinite(costo) && costo >= 0)) return setError("El costo por unidad debe ser un número de cero o más.");
    const r = s.registrarMovimiento({
      tipo: b.tipo,
      articuloId: articulo.id,
      cantidad: conSigno,
      origenId: b.tipo === "salida" || b.tipo === "transferencia" ? b.origenId || null : null,
      destinoId: b.tipo === "salida" ? null : b.destinoId || null,
      motivo: b.motivo,
      referencia: b.referencia,
      ...(b.tipo === "entrada" && costo !== undefined ? { costoUnitario: costo } : {}),
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
          {b.tipo === "entrada" && (
            <Campo
              etiqueta="Costo por unidad (opcional)"
              ayuda={
                articulo
                  ? `Hoy cuesta ${formatearMoneda(articulo.costoUnitario)}. Si llega a otro precio, escríbelo: el costo del artículo se recalcula con el método de valoración.`
                  : "Si llega a otro precio, escríbelo para recalcular el costo."
              }
            >
              <input
                className={CONTROL}
                type="number"
                inputMode="numeric"
                min={0}
                value={b.costo}
                onChange={(e) => cambiar("costo", e.target.value)}
                placeholder={articulo ? String(articulo.costoUnitario) : "0"}
              />
            </Campo>
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
// PIEZAS DE LA LISTA
// ═══════════════════════════════════════════════════════════════════════════

/** Un icono por tipo, del mismo trazo, para reconocer el movimiento sin leer. */
const ICONO_TIPO: Record<TipoMovimiento, React.FC<React.SVGProps<SVGSVGElement>>> = {
  entrada: ArrowDownLeft,
  salida: ArrowUpRight,
  transferencia: ArrowLeftRight,
  ajuste: SlidersHorizontal,
};

/** Entradas en azul (suman), salidas y ajustes en tinta, transferencias en gris (no cambian el total). */
const TONO_ICONO: Record<TipoMovimiento, string> = {
  entrada: "text-ink-title dark:text-accent-300",
  salida: "text-ink-body dark:text-white",
  transferencia: "text-gray-500 dark:text-gray-400",
  ajuste: "text-brand-700 dark:text-brand-400",
};

function TipoMovimientoCelda({ m }: { m: Movimiento }) {
  const Icono = ICONO_TIPO[m.tipo];
  return (
    <span className="flex min-w-0 items-start gap-2.5">
      <Icono className={cx("mt-0.5 h-4 w-4 shrink-0", TONO_ICONO[m.tipo])} aria-hidden />
      <span className="min-w-0">
        <span className="block truncate text-ink-body dark:text-white">{ETIQUETA_TIPO_MOVIMIENTO[m.tipo]}</span>
        <span className="block truncate text-theme-xs text-gray-600 dark:text-gray-400">{m.motivo}</span>
      </span>
    </span>
  );
}

/** El documento que originó el movimiento. Una orden de compra se puede abrir. */
function Referencia({ m, onAbrirOrden }: { m: Movimiento; onAbrirOrden: (id: string) => void }) {
  if (!m.referencia) return <Falta />;
  const orden = inventarioStore.ordenes.find((o) => o.numero === m.referencia);
  if (orden) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAbrirOrden(orden.id);
        }}
        className="rounded-md font-bold tabular-nums text-ink-title hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-white"
      >
        {m.referencia}
      </button>
    );
  }
  return <span className="tabular-nums text-ink-body dark:text-gray-300">{m.referencia}</span>;
}

// ═══════════════════════════════════════════════════════════════════════════
// DETALLE
// ═══════════════════════════════════════════════════════════════════════════

const PanelDetalle = observer(function PanelDetalle({
  movimiento,
  onCerrar,
  onVerArticulo,
  onVerHistorial,
  onAbrirOrden,
}: {
  movimiento: Movimiento | undefined;
  onCerrar: () => void;
  onVerArticulo: (id: string) => void;
  onVerHistorial: (id: string) => void;
  onAbrirOrden: (id: string) => void;
}) {
  const s = inventarioStore;
  const { valor: m, abierto } = useUltimo(movimiento);
  if (!m) return null;
  const a = s.articulo(m.articuloId);
  const Icono = ICONO_TIPO[m.tipo];
  const cifra = m.tipo === "transferencia" ? m.cantidad : deltaTotal(m);
  const unidad = a ? (Math.abs(cifra) === 1 ? ETIQUETA_UNIDAD[a.unidad].toLowerCase() : UNIDAD_PLURAL[a.unidad]) : "";
  const de = m.origenId ? s.nombreUbicacion(m.origenId) : null;
  const hacia = m.destinoId ? s.nombreUbicacion(m.destinoId) : null;

  const filas: { etiqueta: string; valor: React.ReactNode }[] = [
    { etiqueta: "Fecha", valor: formatearFechaHora(m.fecha) },
    ...(de ? [{ etiqueta: m.tipo === "transferencia" ? "Desde" : "Sale de", valor: de }] : []),
    ...(hacia ? [{ etiqueta: m.tipo === "transferencia" ? "Hacia" : m.tipo === "ajuste" ? "Ubicación" : "Entra a", valor: hacia }] : []),
    { etiqueta: "Motivo", valor: m.motivo || <Falta /> },
    ...(m.costoUnitario !== undefined ? [{ etiqueta: "Costo por unidad", valor: formatearMoneda(m.costoUnitario) }] : []),
    { etiqueta: "Referencia", valor: <Referencia m={m} onAbrirOrden={onAbrirOrden} /> },
    { etiqueta: "Responsable", valor: m.responsable },
  ];

  return (
    <PanelLateral
      abierto={abierto}
      onCerrar={onCerrar}
      ancho="sm:max-w-md"
      titulo={
        <span className="flex items-center gap-2.5">
          <Icono className={cx("h-6 w-6", TONO_ICONO[m.tipo])} aria-hidden />
          {ETIQUETA_TIPO_MOVIMIENTO[m.tipo]}
        </span>
      }
      subtitulo={etiquetaDia(claveDia(m.fecha)) + " · " + formatearHora(m.fecha)}
      pie={
        a && (
          <>
            <Boton variante="texto" onClick={() => onVerHistorial(a.id)}>
              Ver su historial
            </Boton>
            <Boton onClick={() => onVerArticulo(a.id)}>Abrir artículo</Boton>
          </>
        )
      }
    >
      <div className="rounded-2xl border border-gray-200 p-4 dark:border-white/10">
        <p className="font-bold text-ink-body dark:text-white">{a?.nombre ?? "Artículo eliminado"}</p>
        {a && <p className="text-theme-xs text-gray-600 dark:text-gray-400">{a.sku} · {a.categoria}</p>}
        <p className="mt-3 flex items-baseline gap-2">
          <span className="text-title-md font-bold tabular-nums tracking-tight text-ink-title dark:text-white">
            {m.tipo === "transferencia" ? formatearEntero(m.cantidad) : formatearDelta(deltaTotal(m))}
          </span>
          <span className="text-theme-sm text-gray-600 dark:text-gray-400">
            {unidad}
            {m.tipo === "transferencia" && " movidas, el total no cambia"}
          </span>
        </p>
        {a && (
          <p className="mt-1 text-theme-xs text-gray-600 dark:text-gray-400">
            Hoy hay {formatearEntero(stockTotal(a))} en total
          </p>
        )}
      </div>

      <dl className="divide-y divide-gray-100 dark:divide-white/5">
        {filas.map((f) => (
          <div key={f.etiqueta} className="flex items-start justify-between gap-4 py-2.5">
            <dt className="text-gray-600 dark:text-gray-400">{f.etiqueta}</dt>
            <dd className="text-right text-ink-body dark:text-white">{f.valor}</dd>
          </div>
        ))}
      </dl>
    </PanelLateral>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA
// ═══════════════════════════════════════════════════════════════════════════

export const MovimientosPage = observer(function MovimientosPage() {
  const s = inventarioStore;
  const navigate = useNavigate();
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
  const detalleId = params.get("movimiento");
  const detalle = detalleId ? s.movimientos.find((m) => m.id === detalleId) : undefined;

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

  const cambiarParam = (clave: string, valor: string | null) => {
    const p = new URLSearchParams(params);
    if (valor) p.set(clave, valor);
    else p.delete(clave);
    setParams(p, { replace: true });
  };
  const quitarArticulo = () => cambiarParam("articulo", null);
  const abrirDetalle = (id: string) => cambiarParam("movimiento", id);
  const cerrarDetalle = () => cambiarParam("movimiento", null);
  const abrirOrden = (id: string) => navigate(`/inventarios/ordenes-compra?oc=${id}`);

  // Base: todo menos el tipo, para que las cifras de los filtros reflejen el
  // periodo y la búsqueda.
  const desde = desdePeriodo(periodo);
  const q = busqueda.trim().toLowerCase();
  const base = s.movimientosRecientes.filter((m) => {
    if (new Date(m.fecha).getTime() < desde) return false;
    if (articuloFiltro && m.articuloId !== articuloFiltro) return false;
    if (ubicacionId && m.origenId !== ubicacionId && m.destinoId !== ubicacionId) return false;
    if (q) {
      const a = s.articulo(m.articuloId);
      if (!`${a?.nombre ?? ""} ${a?.sku ?? ""} ${m.referencia ?? ""} ${m.responsable}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const cuentas: Record<TipoMovimiento, number> = { entrada: 0, salida: 0, transferencia: 0, ajuste: 0 };
  const unidades: Record<TipoMovimiento, number> = { entrada: 0, salida: 0, transferencia: 0, ajuste: 0 };
  for (const m of base) {
    cuentas[m.tipo]++;
    unidades[m.tipo] += m.tipo === "transferencia" ? m.cantidad : deltaTotal(m);
  }
  const balance = unidades.entrada + unidades.salida + unidades.ajuste;
  const visibles = pestana === "todos" ? base : base.filter((m) => m.tipo === pestana);

  const grupos: { clave: string; movimientos: Movimiento[]; entra: number; sale: number }[] = [];
  for (const m of visibles) {
    const clave = claveDia(m.fecha);
    let g = grupos[grupos.length - 1];
    if (g?.clave !== clave) {
      g = { clave, movimientos: [], entra: 0, sale: 0 };
      grupos.push(g);
    }
    g.movimientos.push(m);
    const d = m.tipo === "transferencia" ? 0 : deltaTotal(m);
    if (d > 0) g.entra += d;
    else g.sale += d;
  }

  const abrir = (tipo: TipoMovimiento) => setFormulario({ abierto: true, tipo, articuloId: articuloFiltro });
  const hayFiltros = Boolean(busqueda || ubicacionId || articuloFiltro || periodo !== "30");

  /** Dónde pasó. El tipo ya dice si entra o sale; aquí basta la ubicación. */
  const lugar = (m: Movimiento) => {
    const de = m.origenId ? s.nombreUbicacion(m.origenId) : null;
    const a = m.destinoId ? s.nombreUbicacion(m.destinoId) : null;
    if (m.tipo === "transferencia") {
      return (
        <span className="inline-flex items-center gap-x-1.5">
          {de}
          <ArrowRight className="h-3.5 w-3.5 text-gray-400" aria-label="hacia" />
          {a}
        </span>
      );
    }
    return (m.tipo === "salida" ? de : a) ?? <Falta />;
  };

  // Filtros por tipo: la cifra que importa de cada uno (unidades) y cuántos movimientos.
  const filtrosTipo: { valor: PestanaTipo; etiqueta: string; cifra: string; detalle: string }[] = [
    { valor: "todos", etiqueta: "Todos", cifra: formatearEntero(base.length), detalle: base.length === 1 ? "movimiento" : "movimientos" },
    { valor: "entrada", etiqueta: "Entradas", cifra: formatearDelta(unidades.entrada), detalle: `uds · ${cuentas.entrada} mov.` },
    { valor: "salida", etiqueta: "Salidas", cifra: formatearDelta(unidades.salida), detalle: `uds · ${cuentas.salida} mov.` },
    { valor: "transferencia", etiqueta: "Transferencias", cifra: formatearEntero(unidades.transferencia), detalle: `uds movidas · ${cuentas.transferencia} mov.` },
    { valor: "ajuste", etiqueta: "Ajustes", cifra: formatearDelta(unidades.ajuste), detalle: `uds · ${cuentas.ajuste} mov.` },
  ];

  return (
    <PaginaInventario
      titulo="Entradas y salidas"
      resumen={
        base.length === 0
          ? `${ETIQUETA_PERIODO[periodo]}: sin movimientos.`
          : `${ETIQUETA_PERIODO[periodo]} · el stock ${balance >= 0 ? "creció" : "bajó"} ${formatearEntero(Math.abs(balance))} unidades en total`
      }
      acciones={
        <MenuBoton
          etiqueta="Registrar movimiento"
          opciones={OPCIONES_MOVIMIENTO.map((o) => ({ etiqueta: o.etiqueta, descripcion: o.descripcion, onSelect: () => abrir(o.tipo) }))}
        />
      }
    >
      {/* Filtro por tipo con su balance: elegir un tipo y leer cuánto movió es una sola acción. */}
      <div
        role="group"
        aria-label="Filtrar por tipo de movimiento"
        className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible"
      >
        {filtrosTipo.map((f) => {
          const activo = pestana === f.valor;
          const Icono = f.valor === "todos" ? null : ICONO_TIPO[f.valor];
          return (
            <button
              key={f.valor}
              type="button"
              aria-pressed={activo}
              onClick={() => setPestana(f.valor)}
              className={cx(
                "flex min-w-[148px] shrink-0 snap-start flex-col items-start rounded-2xl border px-4 py-3 text-left transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
                activo
                  ? "border-ink-title bg-ink-title text-white dark:border-white dark:bg-white dark:text-gray-900"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]",
              )}
            >
              <span className={cx("flex items-center gap-1.5 text-theme-xs", activo ? "text-white/80 dark:text-gray-700" : "text-gray-600 dark:text-gray-400")}>
                {Icono && <Icono className="h-3.5 w-3.5" aria-hidden />}
                {f.etiqueta}
              </span>
              <span className={cx("mt-0.5 text-theme-2xl font-bold tabular-nums tracking-tight", activo ? "" : "text-ink-title dark:text-white")}>
                {f.cifra}
              </span>
              <span className={cx("text-theme-xs", activo ? "text-white/80 dark:text-gray-700" : "text-gray-600 dark:text-gray-400")}>{f.detalle}</span>
            </button>
          );
        })}
      </div>

      <BarraHerramientas>
        <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Artículo, código, referencia o persona" />
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
                  setPestana("todos");
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
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10">
          {/* Escritorio y tableta: una tabla, con una franja por día que trae su balance. */}
          <table className="hidden w-full text-left text-theme-sm sm:table">
            <thead>
              <tr className="border-b border-gray-200 text-theme-xs text-gray-600 dark:border-white/10 dark:text-gray-400">
                <th className="w-20 px-5 py-2.5 font-normal">Hora</th>
                <th className="px-3 py-2.5 font-normal">Artículo</th>
                <th className="px-3 py-2.5 font-normal">Movimiento</th>
                <th className="hidden px-3 py-2.5 font-normal lg:table-cell">Ubicación</th>
                <th className="hidden px-3 py-2.5 font-normal xl:table-cell">Referencia</th>
                <th className="hidden px-3 py-2.5 font-normal md:table-cell">Responsable</th>
                <th className="px-5 py-2.5 text-right font-normal">Cantidad</th>
              </tr>
            </thead>
            {grupos.map((g) => (
              <tbody key={g.clave}>
                <tr className="bg-gray-50 dark:bg-white/[0.03]">
                  <th colSpan={4} scope="colgroup" className="px-5 py-2 text-left text-theme-xs font-bold text-ink-body dark:text-white">
                    {etiquetaDia(g.clave)}
                  </th>
                  <td colSpan={3} className="px-5 py-2 text-right text-theme-xs tabular-nums text-gray-600 dark:text-gray-400">
                    {g.entra > 0 && <span className="font-bold text-ink-title dark:text-accent-300">{formatearDelta(g.entra)} entraron</span>}
                    {g.entra > 0 && g.sale < 0 && " · "}
                    {g.sale < 0 && <span>{formatearDelta(g.sale)} salieron</span>}
                  </td>
                </tr>
                {g.movimientos.map((m) => {
                  const a = s.articulo(m.articuloId);
                  return (
                    <tr
                      key={m.id}
                      onClick={() => abrirDetalle(m.id)}
                      className="group cursor-pointer border-t border-gray-100 transition-colors hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/[0.03]"
                    >
                      <td className="whitespace-nowrap px-5 py-3 align-top tabular-nums text-gray-600 dark:text-gray-400">{formatearHora(m.fecha)}</td>
                      <td className="max-w-[240px] px-3 py-3 align-top">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirDetalle(m.id);
                          }}
                          className="block max-w-full truncate rounded-md text-left font-bold text-ink-body group-hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-white"
                        >
                          {a?.nombre ?? "Artículo eliminado"}
                        </button>
                        <span className="block text-theme-xs text-gray-600 dark:text-gray-400">{a?.sku}</span>
                      </td>
                      <td className="max-w-[220px] px-3 py-3 align-top">
                        <TipoMovimientoCelda m={m} />
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-3 align-top text-gray-600 lg:table-cell dark:text-gray-400">{lugar(m)}</td>
                      <td className="hidden whitespace-nowrap px-3 py-3 align-top xl:table-cell">
                        <Referencia m={m} onAbrirOrden={abrirOrden} />
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-3 align-top text-gray-600 md:table-cell dark:text-gray-400">{m.responsable}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right align-top">
                        <Cantidad m={m} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>

          {/* Móvil: lista de dos líneas agrupada por día; cada fila abre el detalle. */}
          <div className="sm:hidden">
            {grupos.map((g) => (
              <section key={g.clave}>
                <h2 className="flex items-baseline justify-between gap-3 bg-gray-50 px-4 py-2 text-theme-xs font-bold text-ink-body dark:bg-white/[0.03] dark:text-white">
                  {etiquetaDia(g.clave)}
                  <span className="font-normal tabular-nums text-gray-600 dark:text-gray-400">
                    {g.entra > 0 && formatearDelta(g.entra)}
                    {g.entra > 0 && g.sale < 0 && " · "}
                    {g.sale < 0 && formatearDelta(g.sale)}
                  </span>
                </h2>
                <div className="px-4">
                  {g.movimientos.map((m) => {
                    const a = s.articulo(m.articuloId);
                    return (
                      <FilaMovil
                        key={m.id}
                        onClick={() => abrirDetalle(m.id)}
                        titulo={a?.nombre ?? "Artículo eliminado"}
                        detalle={`${ETIQUETA_TIPO_MOVIMIENTO[m.tipo]} · ${formatearHora(m.fecha)} · ${m.responsable}`}
                        cifra={<Cantidad m={m} />}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}

      <PanelDetalle
        movimiento={detalle}
        onCerrar={cerrarDetalle}
        onVerArticulo={(id) => navigate(`/inventarios/articulos?articulo=${id}`)}
        onVerHistorial={(id) => {
          const p = new URLSearchParams(params);
          p.delete("movimiento");
          p.set("articulo", id);
          setParams(p, { replace: true });
          setPestana("todos");
        }}
        onAbrirOrden={abrirOrden}
      />

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
