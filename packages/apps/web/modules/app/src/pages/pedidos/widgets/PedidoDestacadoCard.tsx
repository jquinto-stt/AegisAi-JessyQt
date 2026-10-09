import { useState } from "react";
import { observer } from "mobx-react-lite";
import { pedidosStore, sessionStore, puedeMoverA, type Modalidad, type Pedido } from "@/stores";
import { avanzarPedido } from "../pedidos.notificaciones";
import { money } from "./widgets.comunes";
import {
  BuildingStorefrontIcon,
  ChevronDownIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { Bike, UtensilsCrossed, Check } from "lucide-react";

type FiltroModalidad = "todas" | Modalidad;

function formatMinutos(isoString?: string): string {
  if (!isoString) return "Recién creado";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return "Recién creado";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}

export interface PedidoDestacadoCardProps {
  onVerDetalle: (id: string) => void;
}

/**
 * PedidoDestacadoCard — Tarjeta de pedido prioritario en formato Spotlight Hero de alta visibilidad.
 * Diseño refinado con fondo azul profundo (#0d0442), resplandores radiales y acciones de un clic.
 */
export const PedidoDestacadoCard = observer(({ onVerDetalle }: PedidoDestacadoCardProps) => {
  const [filtro] = useState<FiltroModalidad>("todas");

  // Filtrar pedidos activos no terminales
  const enCurso = pedidosStore
    .enCurso(filtro === "todas" ? undefined : filtro)
    .filter((p) => p.estado !== "cancelado" && p.estado !== "entregado");

  // Priorizar el pedido más urgente u operativo:
  // 1º listos para entrega/despacho, 2º en preparación, 3º nuevos/confirmados
  const pedidoActivo: Pedido | undefined =
    enCurso.find((p) => p.estado === "listo") ||
    enCurso.find((p) => p.estado === "en_preparacion") ||
    enCurso[0];

  const siguienteEstado = pedidoActivo ? pedidosStore.siguienteEstado(pedidoActivo) : null;
  const labelSiguiente = siguienteEstado ? pedidosStore.estadoLabel(siguienteEstado) : "Completar";
  const labelLimpio = labelSiguiente.replace(/\s*\([^)]*\)/g, "").trim();

  const puedeAvanzar = puedeMoverA(siguienteEstado);
  const puedeVerMontos = sessionStore.hasPermission("team.read");

  const handleAvanzar = () => {
    if (!pedidoActivo) return;
    avanzarPedido(pedidoActivo.id);
  };

  const itemPrincipal = pedidoActivo?.items?.[0];
  const fotoItem =
    (itemPrincipal as { foto?: string })?.foto ||
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80";

  const totalItemsCount = pedidoActivo
    ? pedidoActivo.items.reduce((acc, it) => acc + (it.cantidad || 1), 0)
    : 0;

  return (
    <section aria-label="Pedido activo en foco" className="flex flex-col h-full w-full">
      <div className="rounded-3xl bg-[#0d0442] text-white p-6 md:p-8 shadow-xl relative overflow-hidden border border-indigo-900/40 flex flex-col justify-between h-full min-h-[380px]">
        {/* Subtle decorative radial background glow */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        {pedidoActivo ? (
          <>
            {/* Top meta: Order number and Badge */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono">
                  {pedidoActivo.numero}
                </h2>
              </div>

              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-200 text-xs md:text-sm font-semibold tracking-wide backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                <span>
                  Pedido Prioritario ({pedidosStore.estadoLabel(pedidoActivo.estado)})
                </span>
              </div>
            </div>

            {/* Mid section: Customer info and item breakdown */}
            <div className="relative z-10 mt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center flex-1">
              {/* Left Info column: Customer & Total Amount */}
              <div className="md:col-span-5 space-y-4">
                {/* Customer / Repartidor */}
                <div className="flex items-center gap-3 text-slate-100">
                  <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur border border-white/10 text-white shrink-0">
                    {pedidoActivo.modalidad === "domicilio" ? (
                      <Bike className="w-6 h-6 text-indigo-200" />
                    ) : pedidoActivo.modalidad === "retiro" ? (
                      <BuildingStorefrontIcon className="w-6 h-6 text-indigo-200" />
                    ) : (
                      <UtensilsCrossed className="w-6 h-6 text-indigo-200" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-indigo-200 font-medium tracking-wide truncate">
                      {pedidoActivo.repartidor
                        ? "Repartidor asignado"
                        : `Cliente · ${pedidosStore.modalidadLabel(pedidoActivo.modalidad)}`}
                    </p>
                    <p className="text-xl md:text-2xl font-bold text-white tracking-tight truncate">
                      {pedidoActivo.repartidor || pedidoActivo.cliente}
                    </p>
                  </div>
                </div>

                {/* Total price or item count based on role */}
                <div>
                  <p className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">
                    {puedeVerMontos ? "Total a cobrar" : "Artículos en orden"}
                  </p>
                  <p className="text-4xl md:text-5xl font-black text-white tracking-tight mt-0.5 font-mono">
                    {puedeVerMontos
                      ? money(pedidosStore.totalPedido(pedidoActivo))
                      : `${totalItemsCount} ${totalItemsCount === 1 ? "artículo" : "artículos"}`}
                  </p>
                </div>

                {/* Time in current stage badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/30 border border-white/10 text-xs font-medium text-slate-200">
                  <ClockIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Tiempo en estado:{" "}
                    <strong className="text-white font-bold ml-1 font-mono">
                      {formatMinutos(pedidoActivo.estadoDesde || pedidoActivo.createdAt)}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Right Box: Food item presentation card */}
              <div className="md:col-span-7 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col sm:flex-row items-center gap-4">
                {/* Item Thumbnail */}
                <div className="relative w-full sm:w-36 h-36 flex-shrink-0 rounded-xl overflow-hidden shadow-md bg-slate-900 border border-white/10">
                  <img
                    alt={itemPrincipal?.nombre || "Producto"}
                    src={fotoItem}
                    className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Item info */}
                <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                    <h3 className="text-lg md:text-xl font-extrabold text-white leading-snug truncate">
                      {itemPrincipal
                        ? `${itemPrincipal.cantidad}× ${itemPrincipal.nombre}`
                        : "1× Ítem en pedido"}
                    </h3>
                  </div>

                  {puedeVerMontos && itemPrincipal?.precio ? (
                    <p className="text-sm text-indigo-200 font-medium">
                      Valor unitario:{" "}
                      <span className="text-white font-semibold font-mono">
                        {money(itemPrincipal.precio)}
                      </span>
                    </p>
                  ) : null}

                  {pedidoActivo.items.length > 1 && (
                    <p className="text-xs text-indigo-300 font-medium">
                      +{pedidoActivo.items.length - 1} producto(s) adicional(es)
                    </p>
                  )}

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => onVerDetalle(pedidoActivo.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/15 transition-colors cursor-pointer"
                    >
                      <span>Más info</span>
                      <ChevronDownIcon className="w-3.5 h-3.5 text-indigo-300" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Buttons Toolbar */}
            <div className="relative z-10 mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
              {puedeAvanzar && (
                <button
                  type="button"
                  onClick={handleAvanzar}
                  className="w-full sm:flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm tracking-wide shadow-[0_8px_24px_-4px_rgba(239,68,68,0.45)] hover:shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-[0.99] cursor-pointer"
                >
                  <Check className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                  <span>Avanzar a: {labelLimpio}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onVerDetalle(pedidoActivo.id)}
                className="w-full sm:w-auto min-w-[200px] py-3.5 px-6 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-700/60 text-slate-200 hover:text-white font-bold text-sm tracking-wide transition-all text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
              >
                Pausar / Reportar
              </button>
            </div>
          </>
        ) : (
          <div className="relative z-10 my-auto py-12 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-white">Todos los pedidos al día</p>
            <p className="mt-2 text-sm sm:text-base text-indigo-200 font-normal">
              No hay pedidos que requieran atención inmediata en este momento.
            </p>
          </div>
        )}
      </div>
    </section>
  );
});

export default PedidoDestacadoCard;
