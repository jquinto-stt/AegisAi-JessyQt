import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { pedidosStore } from "@/stores";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { money } from "./widgets.comunes";

/**
 * EstadoPagoDonutCard — Gráfico de dona de pagos (Pagados vs. Pendientes de cobro).
 * Diseñado fielmente al patrón de Donut Chart with Legend con la paleta oficial NECTO:
 * - #97D6DF (Cyan NECTO) para Pagados
 * - #FF3F1A (Naranja NECTO) para Pendientes
 * - #190088 (Azul profundo NECTO) para títulos y cifras principales
 * - #212121 (Dark) para textos generales
 * - #ECECEC (Gris claro) para riel y bordes
 */
export const EstadoPagoDonutCard = observer(() => {
  const navigate = useNavigate();
  const [hoveredSegment, setHoveredSegment] = useState<"pagados" | "pendientes" | null>(null);

  const pedidos = pedidosStore.pedidos;
  const pagados = pedidos.filter((p) => p.pagado);
  const pendientes = pedidos.filter((p) => !p.pagado);

  const countPagados = pagados.length;
  const countPendientes = pendientes.length;
  const totalPedidos = countPagados + countPendientes;

  const montoPagados = pagados.reduce((sum, p) => sum + pedidosStore.totalPedido(p), 0);
  const montoPendientes = pendientes.reduce((sum, p) => sum + pedidosStore.totalPedido(p), 0);
  const totalMonto = montoPagados + montoPendientes;

  const pctPagado = totalPedidos > 0 ? (countPagados / totalPedidos) * 100 : 0;
  const pctPendiente = totalPedidos > 0 ? (countPendientes / totalPedidos) * 100 : 0;

  // Parámetros de geometría del Donut SVG
  const size = 190;
  const baseStroke = 24;
  const radius = (size - baseStroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const dashPagado = (pctPagado / 100) * circumference;
  const dashPendiente = (pctPendiente / 100) * circumference;

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-[#ECECEC] bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 font-sans">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <h2 className="text-[16px] sm:text-[24px] font-bold text-[#190088] dark:text-[#97D6DF] leading-tight">
            Estado de pago
          </h2>
          <p className="text-[12px] font-normal text-[#212121]/70 dark:text-gray-400 mt-0.5">
            Balance entre pedidos pagados y pendientes
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/pedidos")}
          className="inline-flex items-center gap-1 text-[12px] font-bold text-[#190088] hover:text-[#FF3F1A] dark:text-[#97D6DF] dark:hover:text-white cursor-pointer transition-colors"
        >
          <span>Ver detalle</span>
          <ArrowUpRightIcon className="size-3.5" />
        </button>
      </div>

      {/* Donut Chart con animación fluida y KPI central interactivo */}
      <div className="relative my-4 flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rotate-[-90deg] transition-all overflow-visible"
        >
          {/* Riel base */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#ECECEC"
            className="dark:stroke-gray-800"
            strokeWidth={baseStroke}
          />

          {totalPedidos > 0 && (
            <>
              {/* Segmento Pagados (#97D6DF Cyan NECTO) */}
              {countPagados > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke="#97D6DF"
                  strokeWidth={hoveredSegment === "pagados" ? 30 : hoveredSegment === "pendientes" ? 20 : baseStroke}
                  strokeDasharray={`${dashPagado} ${circumference - dashPagado}`}
                  strokeDashoffset={0}
                  opacity={hoveredSegment === "pendientes" ? 0.35 : 1}
                  style={{
                    filter: hoveredSegment === "pagados" ? "drop-shadow(0 2px 8px rgba(151, 214, 223, 0.7))" : "none",
                  }}
                  className="transition-all duration-300 ease-out cursor-pointer"
                  onMouseEnter={() => setHoveredSegment("pagados")}
                  onMouseLeave={() => setHoveredSegment(null)}
                  onClick={() => navigate("/pedidos?pago=pagados")}
                >
                  <title>{`Pagados: ${countPagados} pedidos (${money(montoPagados)}) — Clic para filtrar`}</title>
                </circle>
              )}

              {/* Segmento Pendientes de pago (#FF3F1A Naranja NECTO) */}
              {countPendientes > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke="#FF3F1A"
                  strokeWidth={hoveredSegment === "pendientes" ? 30 : hoveredSegment === "pagados" ? 20 : baseStroke}
                  strokeDasharray={`${dashPendiente} ${circumference - dashPendiente}`}
                  strokeDashoffset={-dashPagado}
                  opacity={hoveredSegment === "pagados" ? 0.35 : 1}
                  style={{
                    filter: hoveredSegment === "pendientes" ? "drop-shadow(0 2px 8px rgba(255, 63, 26, 0.6))" : "none",
                  }}
                  className="transition-all duration-300 ease-out cursor-pointer"
                  onMouseEnter={() => setHoveredSegment("pendientes")}
                  onMouseLeave={() => setHoveredSegment(null)}
                  onClick={() => navigate("/pedidos?pago=pendientes")}
                >
                  <title>{`Pendientes: ${countPendientes} pedidos (${money(montoPendientes)}) — Clic para filtrar`}</title>
                </circle>
              )}
            </>
          )}
        </svg>

        {/* Texto central del Donut (Cifra grande + Etiqueta explicativa dinámica al hacer hover) */}
        <button
          type="button"
          onClick={() => {
            if (hoveredSegment === "pagados") navigate("/pedidos?pago=pagados");
            else if (hoveredSegment === "pendientes") navigate("/pedidos?pago=pendientes");
            else navigate("/pedidos");
          }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 cursor-pointer group select-none transition-transform duration-200 hover:scale-105"
          title="Ver en tablero de pedidos"
        >
          <span
            className={`text-[20px] sm:text-[24px] font-bold tracking-tight tabular-nums leading-tight transition-colors duration-200 ${
              hoveredSegment === "pagados"
                ? "text-[#190088] dark:text-[#97D6DF]"
                : hoveredSegment === "pendientes"
                ? "text-[#FF3F1A]"
                : "text-[#190088] group-hover:text-[#FF3F1A] dark:text-white"
            }`}
          >
            {hoveredSegment === "pagados"
              ? money(montoPagados)
              : hoveredSegment === "pendientes"
              ? money(montoPendientes)
              : money(totalMonto)}
          </span>
          <span className="text-[12px] font-normal text-[#212121]/70 group-hover:text-[#212121] dark:text-gray-400 mt-0.5 transition-colors duration-200">
            {hoveredSegment === "pagados"
              ? `Pagados (${Math.round(pctPagado)}%)`
              : hoveredSegment === "pendientes"
              ? `Pendientes (${Math.round(pctPendiente)}%)`
              : "Total en pedidos"}
          </span>
        </button>
      </div>

      {/* Leyenda horizontal inferior con botones interactivos con puntos de color y hover coordinado */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:gap-4 border-t border-[#ECECEC] pt-4 dark:border-gray-800 text-[12px]">
        {/* Item Pagados */}
        <button
          type="button"
          onMouseEnter={() => setHoveredSegment("pagados")}
          onMouseLeave={() => setHoveredSegment(null)}
          onClick={() => navigate("/pedidos?pago=pagados")}
          className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-all duration-200 active:scale-95 cursor-pointer text-left ${
            hoveredSegment === "pagados"
              ? "bg-[#97D6DF]/25 scale-105 shadow-xs"
              : "hover:bg-[#97D6DF]/15"
          }`}
          title="Filtrar pedidos pagados"
        >
          <span className="size-3 rounded-full bg-[#97D6DF] shrink-0" />
          <span className="font-bold text-[#212121] dark:text-gray-200">
            Pagados
          </span>
          <span className="text-[#212121]/60 dark:text-gray-400 font-normal">
            ({countPagados} · {Math.round(pctPagado)}%)
          </span>
        </button>

        {/* Item Pendientes de pago */}
        <button
          type="button"
          onMouseEnter={() => setHoveredSegment("pendientes")}
          onMouseLeave={() => setHoveredSegment(null)}
          onClick={() => navigate("/pedidos?pago=pendientes")}
          className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-all duration-200 active:scale-95 cursor-pointer text-left ${
            hoveredSegment === "pendientes"
              ? "bg-[#FF3F1A]/20 scale-105 shadow-xs"
              : "hover:bg-[#FF3F1A]/10"
          }`}
          title="Filtrar pedidos pendientes de cobro"
        >
          <span className="size-3 rounded-full bg-[#FF3F1A] shrink-0" />
          <span className="font-bold text-[#212121] dark:text-gray-200">
            Pendientes
          </span>
          <span className="text-[#212121]/60 dark:text-gray-400 font-normal">
            ({countPendientes} · {Math.round(pctPendiente)}%)
          </span>
        </button>
      </div>
    </div>
  );
});

export default EstadoPagoDonutCard;
