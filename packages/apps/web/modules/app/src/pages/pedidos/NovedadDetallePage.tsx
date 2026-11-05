import { Fragment, useState } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  InboxIcon,
  TruckIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

import { PageMeta } from "@/shell/meta";
import { novedadesStore, pedidosStore } from "@/stores";
import { transportadoraPorNombre } from "@/domain/pedidos/transportadoras.catalogo";
import {
  ETIQUETA_ESTADO_NOVEDAD,
  claseEstadoNovedad,
  diasEnNovedad,
  fechaCorta,
  horaDe,
  puedeGestionar,
  solucionPorId,
  type DatosSolucion,
  type Novedad,
} from "@/domain/pedidos/novedades.domain";
import { LogoTransportadora } from "./LogoTransportadora";
import { GestionarNovedadModal } from "./GestionarNovedadModal";
import { DetallePedidoModal } from "./DetallePedidoModal";

// ═══════════════════════════════════════════════════════════════════════════
// DETALLE DE UNA GUÍA CON NOVEDADES
// ═══════════════════════════════════════════════════════════════════════════
//
// Una guía puede acumular varias novedades: el primer intento falla por «no
// contesta», el segundo por «dirección incorrecta». La pantalla las junta porque
// la pregunta que trae al operador aquí es sobre el ENVÍO, no sobre una fila.
//
// ── Por qué es una ruta y no un panel lateral ──────────────────────────────
//
// El operador llega con un número de guía que le dictaron. Una ruta propia deja
// compartir el enlace y usar el botón «atrás» del navegador; un panel dentro de
// la lista se cierra al recargar y no se puede pasar a un compañero.
//
// ── Qué se pinta arriba y qué abajo ────────────────────────────────────────
//
// Arriba, las cuatro cosas que deciden si esto se resuelve hoy: quién recibe,
// con qué transportadora, cuánto lleva parado y cuál fue la última causal.
// Abajo, el histórico de novedades de esa guía, que es donde se actúa.
// ═══════════════════════════════════════════════════════════════════════════


/** Tarjeta del resumen: rótulo arriba, dato grande, icono a la derecha. */
function TarjetaResumen({
  rotulo,
  children,
  icono,
}: {
  rotulo: string;
  children: React.ReactNode;
  icono: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
          {rotulo}
        </div>
        <div className="mt-1.5">{children}</div>
      </div>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-400 dark:bg-white/[0.05] dark:text-gray-500">
        {icono}
      </span>
    </div>
  );
}

export const NovedadDetallePage = observer(() => {
  const { guia = "" } = useParams();
  const navigate = useNavigate();

  const [gestionandoId, setGestionandoId] = useState<string | null>(null);
  const [detallePedido, setDetallePedido] = useState(false);
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const novedades = novedadesStore.novedades.filter((n) => n.guia === guia);
  const primera = novedades[0];
  const gestionando = gestionandoId ? (novedadesStore.porId(gestionandoId) ?? null) : null;

  // El pedido se cruza por número: es el único dato que comparten los dos
  // catálogos, y el que el operador tiene a mano cuando llama.
  const pedido = primera
    ? pedidosStore.pedidos.find((p) => p.numero === primera.ordenNumero)
    : undefined;

  // La novedad más reciente manda en «última novedad» y en los días parados.
  const ultima = [...novedades].sort(
    (a, b) => new Date(b.creadaEn).getTime() - new Date(a.creadaEn).getTime(),
  )[0];
  const masAntigua = [...novedades].sort(
    (a, b) => new Date(a.creadaEn).getTime() - new Date(b.creadaEn).getTime(),
  )[0];

  const volver = () => navigate("/pedidos/novedades");

  const solucionar = (id: string, datos: DatosSolucion) => {
    const res = novedadesStore.gestionar(id, datos);
    if (!res.ok) return res.error;
    setGestionandoId(null);
    setAviso(`Novedad solucionada · ${solucionPorId(res.valor.solucion!)?.label ?? ""}`);
    window.setTimeout(() => setAviso(null), 4200);
    return null;
  };

  if (!primera) {
    return (
      <>
        <PageMeta title="Guía sin novedades" description="No hay novedades para esta guía" />
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <InboxIcon className="size-7 text-gray-300 dark:text-gray-600" />
          <p className="text-theme-sm font-bold text-ink-title dark:text-white">
            Esta guía no tiene novedades registradas
          </p>
          <p className="max-w-sm text-theme-xs text-gray-500 dark:text-gray-400">
            Puede que ya se hayan resuelto o que el número esté mal escrito.
          </p>
          <button
            type="button"
            onClick={volver}
            className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-theme-xs font-bold text-ink-body transition-colors hover:bg-gray-50 cursor-pointer dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <ArrowLeftIcon className="size-3.5" />
            Volver a novedades
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={`Guía ${guia}`}
        description="Novedades de esta guía y su solución"
      />

      <div className="flex flex-col gap-4 font-sans">
        {/* ── Volver ── */}
        <button
          type="button"
          onClick={volver}
          className="inline-flex h-8 w-fit items-center gap-1.5 rounded-lg bg-gray-100 px-3 text-theme-xs font-medium text-ink-body transition-colors hover:bg-gray-200 cursor-pointer dark:bg-white/[0.06] dark:text-gray-200 dark:hover:bg-white/[0.1]"
        >
          <ArrowLeftIcon className="size-3.5" />
          Volver a novedades
        </button>

        {/* ── Cabecera ── */}
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-mono text-theme-2xl font-bold tracking-tight text-ink-title dark:text-white">
              Guía #{guia}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-theme-xs text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="font-bold text-gray-400 dark:text-gray-500">Estado:</span>
                {pedido ? (
                  <span className="inline-flex h-6 items-center rounded-full bg-estado-azul px-2.5 text-[10.5px] font-bold text-ink-body dark:bg-estado-azul/15 dark:text-estado-azul">
                    {pedidosStore.estadoLabel(pedido.estado)}
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ClipboardDocumentListIcon className="size-3.5 text-gray-400" />
                <span className="font-bold text-gray-400 dark:text-gray-500">Id:</span>
                <span className="font-mono text-[11.5px]">{pedido?.id ?? primera.ordenNumero}</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDetallePedido(true)}
            disabled={!pedido}
            title={pedido ? undefined : "El pedido de esta guía no está en el tablero"}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink-body px-4 text-theme-xs font-bold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-ink-body dark:hover:bg-gray-200"
          >
            <ClipboardDocumentListIcon className="size-4" />
            Detalle de orden
          </button>
        </header>

        {/* ── Cuatro datos que deciden si esto se resuelve hoy ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <TarjetaResumen rotulo="Cliente" icono={<UserIcon className="size-4" />}>
            <div className="text-theme-sm font-bold text-ink-body dark:text-gray-100">
              {primera.cliente}
            </div>
            <div className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
              Tel. {primera.telefono}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">{primera.ciudad}</div>
          </TarjetaResumen>

          <TarjetaResumen rotulo="Transportadora" icono={<TruckIcon className="size-4" />}>
            <div className="flex items-center gap-2.5">
              <LogoTransportadora
                transportadora={transportadoraPorNombre(primera.transportadora)}
                nombre={primera.transportadora}
                tamano="md"
              />
              <span className="text-theme-xs font-bold text-ink-body dark:text-gray-100">
                {primera.transportadora}
              </span>
            </div>
          </TarjetaResumen>

          <TarjetaResumen rotulo="Días en novedad" icono={<CalendarDaysIcon className="size-4" />}>
            <div className="text-theme-md font-bold tabular-nums text-ink-body dark:text-gray-100">
              {masAntigua ? diasEnNovedad(masAntigua.creadaEn) : "—"}
            </div>
            <div className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
              {novedades.length} {novedades.length === 1 ? "novedad" : "novedades"} en esta guía
            </div>
          </TarjetaResumen>

          <TarjetaResumen rotulo="Última novedad" icono={<ClockIcon className="size-4" />}>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              Causal de novedad:
            </div>
            <div className="mt-0.5 text-theme-xs font-medium text-ink-body dark:text-gray-100">
              {ultima?.causal ?? "—"}
            </div>
          </TarjetaResumen>
        </div>

        {/* ── Histórico de la guía ── */}
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 dark:border-gray-800 dark:bg-white/[0.02]">
                {[
                  "Id de novedad",
                  "Fecha de creación",
                  "Estado",
                  "Causal de novedad",
                  "Días en novedad",
                  "Solución",
                  "Detalles",
                  "",
                ].map((c, i) => (
                  <th
                    key={c + i}
                    className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {novedades.map((n) => {
                const expandida = abiertaId === n.id;
                return (
                  <Fragment key={n.id}>
                    <tr
                      className="border-b border-gray-100 transition-colors hover:bg-gray-50/70 dark:border-gray-800 dark:hover:bg-gray-800/40"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11.5px] text-ink-body dark:text-gray-200">
                          {n.id.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-theme-xs text-ink-body dark:text-gray-200">
                          {fechaCorta(n.creadaEn)}
                        </div>
                        <div className="font-mono text-[10.5px] text-gray-400">
                          {horaDe(n.creadaEn)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${
                            claseEstadoNovedad(n.estado)
                          }`}
                        >
                          {ETIQUETA_ESTADO_NOVEDAD[n.estado]}
                        </span>
                      </td>
                      <td className="max-w-[260px] px-4 py-3">
                        <span className="text-[11.5px] leading-snug text-gray-600 dark:text-gray-300">
                          {n.causal}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="font-mono text-[11px] tabular-nums text-gray-600 dark:text-gray-300">
                          {diasEnNovedad(n.creadaEn)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {n.solucion ? (
                          <span className="text-[11.5px] font-medium text-ink-body dark:text-gray-200">
                            {solucionPorId(n.solucion)?.label ?? "—"}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setAbiertaId(expandida ? null : n.id)}
                          aria-expanded={expandida}
                          className="inline-flex items-center gap-1 text-[11.5px] font-medium text-brand-500 underline decoration-brand-200 underline-offset-4 transition-colors hover:text-brand-600 cursor-pointer dark:decoration-brand-500/40"
                        >
                          {expandida ? "Ocultar" : "Ver detalles"}
                          <ChevronDownIcon
                            className={`size-3 transition-transform ${expandida ? "rotate-180" : ""}`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {puedeGestionar(n) ? (
                          <button
                            type="button"
                            onClick={() => {
                              novedadesStore.abrir(n.id);
                              setGestionandoId(n.id);
                            }}
                            className="inline-flex h-8 items-center rounded-lg border border-brand-500 px-3 text-[11.5px] font-bold text-brand-500 transition-colors hover:bg-brand-500 hover:text-white cursor-pointer"
                          >
                            Gestionar
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                    </tr>

                    {/* Detalle en línea: lo que se sabe de la novedad sin salir de
                        la tabla ni abrir otra capa. */}
                    {expandida && (
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td colSpan={8} className="bg-gray-50/70 px-4 py-4 dark:bg-white/[0.02]">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                                Dirección de la guía
                              </div>
                              <p className="mt-1 text-[11.5px] text-ink-body dark:text-gray-200">
                                {n.direccion}, {n.ciudad}
                              </p>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                                Observaciones enviadas
                              </div>
                              <p className="mt-1 text-[11.5px] text-ink-body dark:text-gray-200">
                                {n.observaciones ?? (
                                  <span className="text-gray-400">Todavía sin observaciones.</span>
                                )}
                              </p>
                            </div>
                            {n.fechaReintento && (
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                                  Fecha de reintento
                                </div>
                                <p className="mt-1 text-[11.5px] text-ink-body dark:text-gray-200">
                                  {fechaCorta(n.fechaReintento)}
                                </p>
                              </div>
                            )}
                            {(n.direccionNueva || n.ciudadNueva) && (
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                                  Dirección nueva
                                </div>
                                <p className="mt-1 text-[11.5px] text-ink-body dark:text-gray-200">
                                  {n.ciudadNueva ?? n.direccionNueva}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          {novedades.length} {novedades.length === 1 ? "novedad" : "novedades"} · Orden{" "}
          {primera.ordenNumero}
          {pedido ? ` · ${pedidosStore.estadoLabel(pedido.estado)}` : ""}
        </p>
      </div>

      <GestionarNovedadModal
        novedad={gestionando}
        onCerrar={() => setGestionandoId(null)}
        onSolucionar={solucionar}
      />

      {detallePedido && pedido && (
        <DetallePedidoModal
          pedido={pedido}
          onClose={() => setDetallePedido(false)}
          onChat={() => {
            setDetallePedido(false);
            navigate("/conversaciones");
          }}
        />
      )}

      {aviso && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3.5 py-2.5 text-theme-xs text-ink-body shadow-theme-lg animate-entrada-aviso dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
            <CheckCircleIcon className="size-4 text-success-500" />
            {aviso}
          </div>
        </div>
      )}
    </>
  );
});

export default NovedadDetallePage;
