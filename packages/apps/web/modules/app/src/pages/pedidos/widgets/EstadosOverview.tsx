import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { pedidosStore, type PedidoEstado } from "@/stores";
import {
  ArrowUpRightIcon,
  CheckBadgeIcon,
  ChevronRightIcon,
  ClockIcon,
  InboxStackIcon,
  ShoppingBagIcon,
  TruckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

interface EtapaMeta {
  id: string;
  nombre: string;
  estados: PedidoEstado[];
  icon: React.ComponentType<{ className?: string }>;
  /**
   * Si la etapa forma parte de la barra segmentada. `false` = se cuenta en su
   * tarjeta pero NO en la barra.
   *
   * Existe por `cancelado`: la barra está rotulada «Ingreso de órdenes →
   * Entrega final», o sea el avance del pipeline. Un pedido cancelado no avanzó
   * hasta el final, y meterlo en el total inflaría un denominador que se llama
   * «activos» con pedidos que ya no lo están.
   */
  enBarra?: boolean;
  /**
   * Ruta de la tarjeta. Por defecto, el tablero filtrado por `estados`.
   *
   * Existe por `cancelado`: NO es una columna del tablero (`componerColumnas`
   * pinta solo el pipeline activo, sin terminales), así que
   * `/pedidos?estado=cancelado` dejaría el tablero VACÍO. Los cancelados viven
   * en el Historial, y ahí es donde lleva su tarjeta.
   */
  destino?: string;
  colorClases: {
    badgeBg: string;
    iconColor: string;
    barColor: string;
    borderColor: string;
  };
}

/**
 * Mapeo de etapas alineado estrictamente a la paleta oficial de NECTO:
 * - #FF3F1A: Naranja NECTO
 * - #97D6DF: Cyan NECTO
 * - #ECECEC: Gris claro
 * - #190088: Azul profundo NECTO
 * - #212121: Dark (texto general)
 * - #EFE6D3: Cream / Complementario
 */
const ETAPAS: EtapaMeta[] = [
  {
    id: "nuevos",
    nombre: "Nuevos",
    estados: ["nuevo"],
    icon: InboxStackIcon,
    colorClases: {
      badgeBg: "bg-[#FF3F1A]/10",
      iconColor: "text-[#FF3F1A]",
      barColor: "bg-[#FF3F1A]",
      borderColor: "border-[#FF3F1A]/20",
    },
  },
  {
    // Mismo naranja que «Nuevos», un tono más claro: la pareja era UNA etapa
    // («Nuevos y confirmados») y sigue leyéndose como el bloque de ingreso, solo
    // que ahora en dos pasos. Se distinguen por glifo y rótulo, no por color.
    id: "confirmados",
    nombre: "Confirmados",
    estados: ["confirmado"],
    icon: CheckBadgeIcon,
    colorClases: {
      badgeBg: "bg-[#FF3F1A]/15",
      iconColor: "text-[#FF3F1A]",
      barColor: "bg-[#FF3F1A]/45",
      borderColor: "border-[#FF3F1A]/15",
    },
  },
  {
    id: "preparacion",
    nombre: "En preparación",
    estados: ["en_preparacion"],
    icon: ClockIcon,
    colorClases: {
      badgeBg: "bg-[#EFE6D3]",
      iconColor: "text-[#190088]",
      barColor: "bg-[#EFE6D3]",
      borderColor: "border-[#EFE6D3]",
    },
  },
  {
    id: "listos",
    nombre: "Listos para entrega",
    estados: ["listo"],
    icon: ShoppingBagIcon,
    colorClases: {
      badgeBg: "bg-[#97D6DF]/20",
      iconColor: "text-[#190088]",
      barColor: "bg-[#97D6DF]",
      borderColor: "border-[#97D6DF]/30",
    },
  },
  {
    id: "camino",
    nombre: "En ruta / despacho",
    estados: ["en_camino"],
    icon: TruckIcon,
    colorClases: {
      badgeBg: "bg-[#190088]/10",
      iconColor: "text-[#190088]",
      barColor: "bg-[#190088]",
      borderColor: "border-[#190088]/20",
    },
  },
  {
    // Última tarjeta y fuera de la barra: `cancelado` es terminal y no pertenece
    // al recorrido «ingreso → entrega final». Tinta oscura = estado apagado.
    id: "cancelados",
    nombre: "Cancelados",
    estados: ["cancelado"],
    icon: XCircleIcon,
    enBarra: false,
    destino: "/pedidos/historial",
    colorClases: {
      badgeBg: "bg-[#212121]/10 dark:bg-gray-700",
      iconColor: "text-[#212121] dark:text-gray-300",
      barColor: "bg-[#212121]",
      borderColor: "border-[#212121]/20",
    },
  },
];

/**
 * EstadosOverview — Distribución compacta del flujo operativo de pedidos.
 * Diseñado con tipografía DM Sans y la paleta cromática oficial de NECTO.
 */
export const EstadosOverview = observer(() => {
  const navigate = useNavigate();
  const [hoveredEtapa, setHoveredEtapa] = useState<string | null>(null);

  /** Destino de una etapa: el suyo propio, o el tablero filtrado por sus estados. */
  const destinoDe = (etapa: EtapaMeta) =>
    etapa.destino ?? `/pedidos?estado=${etapa.estados.join(",")}`;

  // Conteo de pedidos activos por etapa
  const etapasConteo = ETAPAS.map((etapa) => {
    const cantidad = pedidosStore.pedidos.filter((p) =>
      etapa.estados.includes(p.estado)
    ).length;
    return { ...etapa, cantidad };
  });

  // Denominador de la barra: solo las etapas que la barra dibuja.
  const totalActivos = etapasConteo.reduce(
    (acc, e) => acc + (e.enBarra === false ? 0 : e.cantidad),
    0,
  );

  return (
    <div className="flex flex-col justify-between h-full rounded-2xl border border-[#ECECEC] bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 min-h-[310px] font-sans">
      {/* Encabezado limpio sin contadores redundantes */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[16px] sm:text-[24px] font-bold text-[#190088] dark:text-[#97D6DF] leading-tight">
              Flujo de pedidos
            </h3>
            <p className="text-[12px] font-normal text-[#212121]/70 dark:text-gray-400 mt-0.5">
              Distribución operativa por etapa
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/pedidos")}
            className="inline-flex items-center gap-1 text-[12px] font-bold text-[#190088] hover:text-[#FF3F1A] dark:text-[#97D6DF] dark:hover:text-white cursor-pointer transition-colors"
          >
            <span>Ver tablero</span>
            <ArrowUpRightIcon className="size-3.5" />
          </button>
        </div>

        {/* Barra horizontal segmentada con gaps y animaciones al pasar el mouse */}
        <div className="mt-4 mb-3">
          <div className="flex h-7 w-full items-center gap-1.5 sm:gap-2">
            {totalActivos === 0 ? (
              <div
                className="h-full w-full rounded-md bg-[#ECECEC] dark:bg-gray-800 transition-colors"
                title="Sin pedidos activos"
              />
            ) : (
              etapasConteo.map((etapa) => {
                if (etapa.enBarra === false || etapa.cantidad === 0) return null;
                const porcentaje = (etapa.cantidad / totalActivos) * 100;
                const isHovered = hoveredEtapa === etapa.id;
                const isAnyHovered = hoveredEtapa !== null;

                return (
                  <div
                    key={etapa.id}
                    style={{ flex: `${etapa.cantidad} 1 0%` }}
                    className={`h-full rounded-md ${etapa.colorClases.barColor} transition-all duration-300 ease-out cursor-pointer ${
                      isHovered
                        ? "scale-y-115 -translate-y-0.5 shadow-md brightness-110 ring-2 ring-white/80 dark:ring-white/30 z-10"
                        : isAnyHovered
                        ? "opacity-50 scale-y-95"
                        : "hover:scale-y-110 hover:-translate-y-0.5 shadow-2xs"
                    }`}
                    title={`${etapa.nombre}: ${etapa.cantidad} (${Math.round(porcentaje)}%) — ${etapa.destino ? "Clic para ver en el historial" : "Clic para filtrar en tablero"}`}
                    onMouseEnter={() => setHoveredEtapa(etapa.id)}
                    onMouseLeave={() => setHoveredEtapa(null)}
                    onClick={() => navigate(destinoDe(etapa))}
                  />
                );
              })
            )}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[12px] font-light text-[#212121]/60 dark:text-gray-500">
            <span>Ingreso de órdenes</span>
            <span>Entrega final</span>
          </div>
        </div>
      </div>

      {/* Grid 2 columnas × 3 filas: 6 etapas (nuevos, confirmados, preparación,
          listos, en ruta y cancelados) con animación coordinada. */}
      <div className="my-2 grid grid-cols-2 gap-2.5 sm:gap-3">
        {etapasConteo.map((etapa) => {
          const Icon = etapa.icon;
          const isHovered = hoveredEtapa === etapa.id;

          return (
            <button
              key={etapa.id}
              type="button"
              onMouseEnter={() => setHoveredEtapa(etapa.id)}
              onMouseLeave={() => setHoveredEtapa(null)}
              onClick={() => navigate(destinoDe(etapa))}
              className={`group flex flex-col justify-between rounded-xl border p-3 text-left transition-all duration-200 ease-out cursor-pointer ${
                isHovered
                  ? "border-[#97D6DF] bg-white shadow-theme-sm -translate-y-0.5 dark:border-[#97D6DF]/80 dark:bg-gray-800"
                  : "border-[#ECECEC] bg-[#ECECEC]/30 hover:border-[#97D6DF] hover:bg-white hover:shadow-theme-xs hover:-translate-y-0.5 dark:border-gray-800 dark:bg-gray-800/40 dark:hover:border-[#97D6DF]/60 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${etapa.colorClases.badgeBg} ${etapa.colorClases.iconColor} transition-transform duration-200 ${
                    isHovered ? "scale-110 shadow-xs" : "group-hover:scale-110"
                  }`}
                >
                  <Icon className="size-4" />
                </div>
                <span className={`text-[24px] font-bold font-mono tracking-tight tabular-nums transition-colors ${
                  isHovered ? "text-[#FF3F1A] dark:text-[#97D6DF]" : "text-[#190088] dark:text-white"
                }`}>
                  {etapa.cantidad}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-1">
                <span className="text-[12px] sm:text-[14px] font-bold text-[#212121] dark:text-gray-200 truncate">
                  {etapa.nombre}
                </span>
                <ChevronRightIcon className={`size-3.5 transition-all shrink-0 ${
                  isHovered ? "text-[#FF3F1A] translate-x-0.5" : "text-[#212121]/30 group-hover:text-[#190088] group-hover:translate-x-0.5 dark:text-gray-600 dark:group-hover:text-[#97D6DF]"
                }`} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default EstadosOverview;
