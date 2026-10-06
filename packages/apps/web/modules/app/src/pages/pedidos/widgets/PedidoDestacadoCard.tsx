import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { pedidosStore, type Modalidad, type Pedido } from "@/stores";
import { avanzarPedido } from "../pedidos.notificaciones";
import { money } from "./widgets.comunes";
import {
  ArrowUpRightIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
// Heroicons no tiene equivalente para estos glifos del dominio
// (cocina / reparto / salón): se quedan en lucide.
import { Bike, UtensilsCrossed } from "lucide-react";

type FiltroModalidad = "todas" | Modalidad;

const MODALIDADES: { id: FiltroModalidad; label: string }[] = [
  { id: "todas", label: "Todas las modalidades" },
  { id: "retiro", label: "Retiro en local / tienda" },
  { id: "domicilio", label: "Envío a domicilio" },
  { id: "en_sitio", label: "Atención en local" },
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
 * PedidoDestacadoCard — Tarjeta de pedido prioritario en formato universal.
 */
export const PedidoDestacadoCard = observer(() => {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<FiltroModalidad>("todas");

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
  // Quitar etiquetas técnicas o paréntesis como (en guía)
  const labelLimpio = labelSiguiente.replace(/\s*\([^)]*\)/g, "").trim();

  const handleAvanzar = () => {
    if (!pedidoActivo) return;
    avanzarPedido(pedidoActivo.id);
  };

  return (
    <div className="relative overflow-hidden flex flex-col justify-between h-full rounded-2xl bg-[#190088] p-5 sm:p-6 text-white shadow-theme-md min-h-[310px] font-sans">
      {/* Círculos decorativos de marca idénticos a la imagen de referencia */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden="true">
        {/* Anillo púrpura superior izquierdo */}
        <div className="absolute -left-12 -top-12 h-44 w-44 rounded-full border-[18px] border-[#97D6DF]/20" />

        {/* Anillo púrpura inferior derecho */}
        <div className="absolute -bottom-14 right-14 sm:right-28 h-56 w-56 rounded-full border-[20px] border-[#97D6DF]/20" />

        {/* Anillo naranja NECTO prominente lateral derecho (#FF3F1A) */}
        <div className="absolute -right-12 top-1/2 -translate-y-1/2 h-60 w-60 sm:h-68 sm:w-68 rounded-full border-[26px] border-[#FF3F1A]" />
      </div>

      {/* Contenido en capa superior */}
      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* Encabezado de la tarjeta */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF3F1A] opacity-80" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF3F1A]" />
              </span>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[12px] font-bold uppercase tracking-wider text-[#FF3F1A] shadow-2xs">
                Pedido Prioritario
              </span>
            </div>
            <h2 className="mt-1.5 text-[16px] sm:text-[24px] font-bold text-white leading-tight">
              {pedidoActivo ? "Atención inmediata requerida" : "Sin pedidos pendientes"}
            </h2>
          </div>

          {/* Selector de modalidad */}
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as FiltroModalidad)}
            aria-label="Filtrar por modalidad"
            className="max-w-[55%] truncate rounded-xl border border-white/30 bg-white/15 px-3 py-1.5 text-[12px] sm:text-[14px] font-semibold text-white outline-none backdrop-blur-sm transition-colors hover:bg-white/25 focus:border-white [&>option]:text-[#212121] cursor-pointer"
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
          <div className="my-4 space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[36px] sm:text-[48px] font-bold tracking-tight text-white drop-shadow-sm font-mono leading-none">
                {pedidoActivo.numero}
              </span>
              <span className="rounded-full bg-white/20 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-white backdrop-blur-sm border border-white/20">
                {pedidosStore.estadoLabel(pedidoActivo.estado)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[14px] text-white">
              <span className="font-bold text-[16px] text-white">{pedidoActivo.cliente}</span>
              <span className="text-white/60">·</span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-0.5 text-[12px] font-medium text-white backdrop-blur-sm border border-white/10">
                {pedidoActivo.modalidad === "retiro" && <BuildingStorefrontIcon className="size-3.5" />}
                {pedidoActivo.modalidad === "domicilio" && <Bike className="size-3.5" />}
                {pedidoActivo.modalidad === "en_sitio" && <BuildingStorefrontIcon className="size-3.5" />}
                <span>{pedidosStore.modalidadLabel(pedidoActivo.modalidad)}</span>
              </span>
              <span className="text-white/60">·</span>
              <span className="font-bold text-[16px] text-white">
                {money(pedidosStore.totalPedido(pedidoActivo))}
              </span>
              {Boolean(pedidoActivo.estadoDesde || pedidoActivo.createdAt) && (
                <>
                  <span className="text-white/60">·</span>
                  <span className="text-[12px] font-mono font-bold text-white bg-black/30 px-2 py-0.5 rounded-md">
                    {formatMinutos(pedidoActivo.estadoDesde || pedidoActivo.createdAt)}
                  </span>
                </>
              )}
            </div>

            {/* Resumen de items con alto contraste */}
            <div className="rounded-xl bg-black/25 border border-white/15 p-3 text-[12px] text-white backdrop-blur-xs font-normal">
              <p className="truncate text-white/95">
                {pedidoActivo.items.map((it) => `${it.cantidad}× ${it.nombre}`).join("  •  ")}
              </p>
            </div>
          </div>
        ) : (
          <div className="my-6 text-center sm:text-left">
            <p className="text-[24px] font-bold text-white">Todos los pedidos al día</p>
            <p className="mt-1 text-[12px] text-white/85 font-normal">
              No hay pedidos activos que requieran atención en esta modalidad.
            </p>
          </div>
        )}

        {/* Pie de tarjeta con acciones rápidas para el pedido prioritario */}
        <div className="border-t border-white/20 pt-3.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAvanzar}
              disabled={!pedidoActivo}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#FF3F1A] px-4 py-2.5 text-[14px] font-bold text-white shadow-md transition-all hover:bg-[#e5351a] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer border border-white/10"
            >
              <CheckCircleIcon className="size-4" />
              <span>{pedidoActivo ? `Avanzar a: ${labelLimpio}` : "Sin acción"}</span>
            </button>
            {pedidoActivo && (
              <button
                type="button"
                onClick={() => navigate(`/pedidos?detalle=${pedidoActivo.id}`)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-[14px] font-bold text-[#212121] shadow-xs transition-colors hover:bg-[#ECECEC] cursor-pointer"
              >
                <span>Ver detalle</span>
                <ArrowUpRightIcon className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default PedidoDestacadoCard;
