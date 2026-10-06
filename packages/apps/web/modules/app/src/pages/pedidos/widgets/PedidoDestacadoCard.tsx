import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { pedidosStore, type Modalidad, type Pedido } from "@/stores";
import { avanzarPedido } from "../pedidos.notificaciones";
import { money } from "./widgets.comunes";
import { ArrowUpRight, CheckCircle2, Store, Bike, UtensilsCrossed } from "lucide-react";

type FiltroModalidad = "todas" | Modalidad;

const MODALIDADES: { id: FiltroModalidad; label: string }[] = [
  { id: "todas", label: "Todas las modalidades" },
  { id: "retiro", label: "Para Retirar" },
  { id: "domicilio", label: "A Domicilio" },
  { id: "en_sitio", label: "En Mesa / Sitio" },
];

function formatMinutos(isoString?: string): string {
  if (!isoString) return "";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return "Recién creado";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

/**
 * PedidoDestacadoCard — Tarjeta hero de atención y despacho prioritario en color azul de la marca.
 */
export const PedidoDestacadoCard = observer(() => {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<FiltroModalidad>("todas");

  // Filtrar pedidos activos no terminales
  const enCurso = pedidosStore
    .enCurso(filtro === "todas" ? undefined : filtro)
    .filter((p) => p.estado !== "cancelado" && p.estado !== "entregado");

  // Priorizar el pedido más urgente u operativo:
  // 1º listos para despacho/retiro, 2º en preparación, 3º nuevos/confirmados
  const pedidoActivo: Pedido | undefined =
    enCurso.find((p) => p.estado === "listo") ||
    enCurso.find((p) => p.estado === "en_preparacion") ||
    enCurso[0];

  const siguienteEstado = pedidoActivo ? pedidosStore.siguienteEstado(pedidoActivo) : null;
  const labelSiguiente = siguienteEstado ? pedidosStore.estadoLabel(siguienteEstado) : "Completar";

  const handleAvanzar = () => {
    if (!pedidoActivo) return;
    avanzarPedido(pedidoActivo.id);
  };

  return (
    <div className="flex flex-col justify-between h-full rounded-2xl bg-brand-500 p-6 text-white shadow-theme-md min-h-[310px]">
      {/* Encabezado de la tarjeta */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-white/90">
              Despacho & Cocina
            </span>
          </div>
          <p className="mt-1 text-xs text-white/75 font-medium">
            {pedidoActivo ? "Orden prioritaria en atención" : "Sin pedidos activos"}
          </p>
        </div>

        {/* Selector de modalidad */}
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as FiltroModalidad)}
          aria-label="Filtrar por modalidad"
          className="max-w-[55%] truncate rounded-xl border border-white/30 bg-white/20 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white outline-none focus:border-white/60 [&>option]:text-gray-800 cursor-pointer"
        >
          {MODALIDADES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Cuerpo principal con datos del pedido */}
      {pedidoActivo ? (
        <div className="my-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-sm font-mono">
              {pedidoActivo.numero}
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              {pedidosStore.estadoLabel(pedidoActivo.estado)}
            </span>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm text-white/95">
            <span className="font-extrabold text-lg text-white">{pedidoActivo.cliente}</span>
            <span className="text-white/60">·</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium text-white">
              {pedidoActivo.modalidad === "retiro" && <Store className="size-3" />}
              {pedidoActivo.modalidad === "domicilio" && <Bike className="size-3" />}
              {pedidoActivo.modalidad === "en_sitio" && <UtensilsCrossed className="size-3" />}
              <span>{pedidosStore.modalidadLabel(pedidoActivo.modalidad)}</span>
            </span>
            <span className="text-white/60">·</span>
            <span className="font-bold text-white">
              {money(pedidosStore.totalPedido(pedidoActivo))}
            </span>
            {Boolean(pedidoActivo.estadoDesde || pedidoActivo.createdAt) && (
              <>
                <span className="text-white/60">·</span>
                <span className="text-xs text-white/90 font-mono">
                  {formatMinutos(pedidoActivo.estadoDesde || pedidoActivo.createdAt)}
                </span>
              </>
            )}
          </div>

          {/* Resumen de items */}
          <div className="mt-2.5 rounded-lg bg-black/15 px-3 py-1.5 text-xs text-white/90">
            <p className="truncate font-medium">
              {pedidoActivo.items.map((it) => `${it.cantidad}× ${it.nombre}`).join("  •  ")}
            </p>
          </div>
        </div>
      ) : (
        <div className="my-6 text-center sm:text-left">
          <p className="text-xl font-bold text-white">No hay pedidos pendientes</p>
          <p className="mt-1 text-xs sm:text-sm text-white/75">
            No tienes pedidos en preparación o listos para esta modalidad.
          </p>
        </div>
      )}

      {/* Pie de tarjeta con acciones rápidas */}
      <div className="border-t border-white/20 pt-3.5">
        <div className="flex items-center justify-between mb-3 text-xs text-white/80">
          <span>
            {enCurso.length} {enCurso.length === 1 ? "pedido en curso" : "pedidos en curso"}
          </span>
          {pedidoActivo && (
            <button
              type="button"
              onClick={() => navigate(`/pedidos?detalle=${pedidoActivo.id}`)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-white hover:underline cursor-pointer"
            >
              <span>Ver comanda</span>
              <ArrowUpRight className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleAvanzar}
            disabled={!pedidoActivo}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs sm:text-sm font-extrabold text-brand-600 shadow-sm transition-all hover:bg-white/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="size-4" />
            <span>{pedidoActivo ? `Avanzar a: ${labelSiguiente}` : "Sin acción"}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/pedidos")}
            className="rounded-xl border border-white/40 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-white/10 cursor-pointer"
          >
            Ver tablero
          </button>
        </div>
      </div>
    </div>
  );
});

export default PedidoDestacadoCard;
