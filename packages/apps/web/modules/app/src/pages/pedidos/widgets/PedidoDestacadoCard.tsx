import { useState } from "react";
import { observer } from "mobx-react-lite";
import { pedidosStore, type Modalidad, type Pedido } from "@/stores";
import { avanzarPedido } from "../pedidos.notificaciones";
import { money } from "./widgets.comunes";
import {
  BuildingStorefrontIcon,
  ChevronDownIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { Bike, UtensilsCrossed } from "lucide-react";

type FiltroModalidad = "todas" | Modalidad;

const MODALIDADES: { id: FiltroModalidad; label: string }[] = [
  { id: "todas", label: "Todas las modalidades" },
  { id: "retiro", label: "Retiro en local" },
  { id: "domicilio", label: "Envío a domicilio" },
  { id: "en_sitio", label: "Atención en sitio" },
];

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
 * PedidoDestacadoCard — Tarjeta de pedido prioritario en formato de alta visibilidad.
 * Sigue estrictamente la paleta de marca NECTO (#190088, #FF3F1A, #97D6DF).
 */
export const PedidoDestacadoCard = observer(({ onVerDetalle }: PedidoDestacadoCardProps) => {
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
  const labelLimpio = labelSiguiente.replace(/\s*\([^)]*\)/g, "").trim();

  const handleAvanzar = () => {
    if (!pedidoActivo) return;
    avanzarPedido(pedidoActivo.id);
  };

  const itemPrincipal = pedidoActivo?.items?.[0];
  const fotoItem =
    (itemPrincipal as { foto?: string })?.foto ||
    "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=300&q=80";

  return (
    <div className="relative overflow-hidden flex flex-col justify-between h-full rounded-3xl bg-[#190088] p-6 sm:p-8 lg:p-9 text-white shadow-xl min-h-[360px] font-sans border border-white/10">
      {/* Contenido en capa superior */}
      <div className="relative z-10 flex flex-col justify-between h-full gap-6">
        {pedidoActivo ? (
          <>
            {/* Sección principal: ocupa el espacio vertical con proporciones generosas */}
            <div className="my-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center py-2">
              {/* Columna Izquierda: Código gigante, Estado, Cliente y Total */}
              <div className="lg:col-span-5 flex flex-col justify-center gap-3 sm:gap-4 min-w-0">
                {/* Código principal prominente */}
                <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black font-mono tracking-tight text-white leading-none drop-shadow-md">
                  {pedidoActivo.numero}
                </h2>

                {/* Badge de prioridad y estado con punto naranja */}
                <div className="inline-flex items-center gap-2.5 self-start rounded-full bg-white/10 border border-white/20 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white/95 backdrop-blur-xs">
                  <span>
                    Pedido Prioritario ({pedidosStore.estadoLabel(pedidoActivo.estado)})
                  </span>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF3F1A] opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#FF3F1A]" />
                  </span>
                </div>

                {/* Cliente con icono de modalidad grande */}
                <div className="flex items-center gap-3 text-xl sm:text-2xl md:text-3xl font-bold text-white">
                  {pedidoActivo.modalidad === "domicilio" ? (
                    <Bike className="size-6 sm:size-7 md:size-8 text-[#97D6DF] shrink-0" />
                  ) : pedidoActivo.modalidad === "retiro" ? (
                    <BuildingStorefrontIcon className="size-6 sm:size-7 md:size-8 text-[#97D6DF] shrink-0" />
                  ) : (
                    <UtensilsCrossed className="size-6 sm:size-7 md:size-8 text-[#97D6DF] shrink-0" />
                  )}
                  <span className="truncate">{pedidoActivo.cliente}</span>
                </div>

                {/* Total en tipografía mono muy grande */}
                <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white font-mono tracking-tight leading-none">
                  {money(pedidosStore.totalPedido(pedidoActivo))}
                </div>

                {/* Píldora de tiempo */}
                <div className="inline-flex items-center gap-2 self-start rounded-xl bg-black/40 border border-white/20 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white/90">
                  <span className="text-white/70">Tiempo en estado:</span>
                  <span className="font-mono font-bold text-white">
                    {formatMinutos(pedidoActivo.estadoDesde || pedidoActivo.createdAt)}
                  </span>
                </div>
              </div>

              {/* Columna Derecha: Tarjeta de producto notablemente más larga y amplia */}
              <div className="lg:col-span-7 flex items-center justify-end w-full">
                <div className="w-full rounded-3xl border border-white/20 bg-white/10 p-5 sm:p-6 lg:p-7 flex flex-col sm:flex-row items-center gap-5 sm:gap-6 backdrop-blur-xs shadow-inner">
                  {/* Imagen grande del producto */}
                  <div className="relative size-32 sm:size-36 md:size-44 lg:size-48 rounded-2xl overflow-hidden bg-black/30 shrink-0 border border-white/20 shadow-md">
                    <img
                      src={fotoItem}
                      alt={itemPrincipal?.nombre || "Producto"}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Detalle y texto amplio para ocupar el largo de la tarjeta */}
                  <div className="min-w-0 flex-1 flex flex-col justify-between py-1 text-left w-full gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="text-base text-[#97D6DF] mt-0.5 shrink-0 font-bold">•</span>
                      <p className="text-base sm:text-lg md:text-xl font-black text-white leading-snug line-clamp-3">
                        {itemPrincipal
                          ? `${itemPrincipal.cantidad}× ${itemPrincipal.nombre}`
                          : "1× Ítem en pedido"}
                      </p>
                    </div>

                    {itemPrincipal?.precio ? (
                      <p className="text-xs sm:text-sm text-white/80 pl-4 font-semibold">
                        Valor unitario: {money(itemPrincipal.precio)}
                      </p>
                    ) : null}

                    {pedidoActivo.items.length > 1 && (
                      <p className="text-xs sm:text-sm text-[#97D6DF] pl-4 font-bold">
                        +{pedidoActivo.items.length - 1} producto(s) adicional(es) en esta orden
                      </p>
                    )}

                    <div className="mt-3 pl-4">
                      <button
                        type="button"
                        onClick={() => onVerDetalle(pedidoActivo.id)}
                        className="inline-flex items-center gap-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 px-4.5 py-2 text-xs sm:text-sm font-bold text-white transition-colors cursor-pointer"
                      >
                        <span>Más info.</span>
                        <ChevronDownIcon className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pie de acciones con mayor altura y presencia */}
            <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-3 border-t border-white/15">
              <button
                type="button"
                onClick={handleAvanzar}
                className="w-full sm:flex-[1.6] flex items-center justify-center gap-2.5 rounded-2xl bg-[#FF3F1A] hover:bg-[#e03514] px-6 py-4 text-base sm:text-lg font-bold text-white shadow-md transition-all active:scale-98 cursor-pointer border border-white/10"
              >
                <CheckCircleIcon className="size-5 shrink-0" />
                <span>Avanzar a: {labelLimpio}</span>
              </button>

              <button
                type="button"
                onClick={() => onVerDetalle(pedidoActivo.id)}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/25 px-6 py-4 text-base sm:text-lg font-bold text-white shadow-xs transition-all active:scale-98 cursor-pointer"
              >
                <span>Pausar / Reportar</span>
              </button>
            </div>
          </>
        ) : (
          <div className="my-auto py-12 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-white">Todos los pedidos al día</p>
            <p className="mt-2 text-sm sm:text-base text-white/80 font-normal">
              No hay pedidos que requieran atención inmediata en este momento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

export default PedidoDestacadoCard;
