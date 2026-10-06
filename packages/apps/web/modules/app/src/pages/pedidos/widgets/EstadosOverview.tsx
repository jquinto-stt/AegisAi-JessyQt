import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { pedidosStore, type PedidoEstado } from "@/stores";
import {
  ArrowUpRightIcon,
  ChevronRightIcon,
  ClockIcon,
  InboxStackIcon,
  ShoppingBagIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";

interface EtapaMeta {
  id: string;
  nombre: string;
  estados: PedidoEstado[];
  icon: React.ComponentType<{ className?: string }>;
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
    nombre: "Nuevos y confirmados",
    estados: ["nuevo", "confirmado"],
    icon: InboxStackIcon,
    colorClases: {
      badgeBg: "bg-[#FF3F1A]/10",
      iconColor: "text-[#FF3F1A]",
      barColor: "bg-[#FF3F1A]",
      borderColor: "border-[#FF3F1A]/20",
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
];

/**
 * EstadosOverview — Distribución compacta del flujo operativo de pedidos.
 * Diseñado con tipografía DM Sans y la paleta cromática oficial de NECTO.
 */
export const EstadosOverview = observer(() => {
  const navigate = useNavigate();

  // Conteo de pedidos activos por etapa
  const etapasConteo = ETAPAS.map((etapa) => {
    const cantidad = pedidosStore.pedidos.filter((p) =>
      etapa.estados.includes(p.estado)
    ).length;
    return { ...etapa, cantidad };
  });

  const totalActivos = etapasConteo.reduce((acc, e) => acc + e.cantidad, 0);

  return (
    <div className="flex flex-col justify-between h-full rounded-2xl border border-[#ECECEC] bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 min-h-[310px] font-sans">
      {/* Encabezado */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] sm:text-[24px] font-bold text-[#190088] dark:text-[#97D6DF] leading-tight">
                Flujo de pedidos
              </h3>
              <span className="rounded-full bg-[#FF3F1A]/10 px-2.5 py-0.5 text-[12px] font-bold text-[#FF3F1A] border border-[#FF3F1A]/20">
                {totalActivos} activos
              </span>
            </div>
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

        {/* Barra de progreso / distribución del pipeline */}
        <div className="mt-4 mb-2 space-y-1.5">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#ECECEC] dark:bg-gray-800">
            {totalActivos === 0 ? (
              <div className="w-full bg-[#ECECEC] dark:bg-gray-700" />
            ) : (
              etapasConteo.map((etapa) => {
                if (etapa.cantidad === 0) return null;
                const porcentaje = (etapa.cantidad / totalActivos) * 100;
                return (
                  <div
                    key={etapa.id}
                    style={{ width: `${porcentaje}%` }}
                    className={`${etapa.colorClases.barColor} transition-all duration-300 first:rounded-l-full last:rounded-r-full`}
                    title={`${etapa.nombre}: ${etapa.cantidad} (${Math.round(porcentaje)}%)`}
                  />
                );
              })
            )}
          </div>
          <div className="flex items-center justify-between text-[12px] font-light text-[#212121]/60 dark:text-gray-500">
            <span>Ingreso de órdenes</span>
            <span>Entrega final</span>
          </div>
        </div>
      </div>

      {/* Grid 2x2 de bloques de etapa (escalable, interactivo y con Heroicons) */}
      <div className="my-3 grid grid-cols-2 gap-2.5 sm:gap-3">
        {etapasConteo.map((etapa) => {
          const Icon = etapa.icon;
          return (
            <button
              key={etapa.id}
              type="button"
              onClick={() => navigate("/pedidos")}
              className="group flex flex-col justify-between rounded-xl border border-[#ECECEC] bg-[#ECECEC]/30 p-3 text-left transition-all hover:border-[#97D6DF] hover:bg-white hover:shadow-theme-xs dark:border-gray-800 dark:bg-gray-800/40 dark:hover:border-[#97D6DF]/60 dark:hover:bg-gray-800 cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${etapa.colorClases.badgeBg} ${etapa.colorClases.iconColor}`}
                >
                  <Icon className="size-4" />
                </div>
                <span className="text-[24px] font-bold font-mono tracking-tight text-[#190088] dark:text-white tabular-nums">
                  {etapa.cantidad}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-1">
                <span className="text-[12px] sm:text-[14px] font-bold text-[#212121] dark:text-gray-200 truncate">
                  {etapa.nombre}
                </span>
                <ChevronRightIcon className="size-3.5 text-[#212121]/30 group-hover:text-[#190088] dark:text-gray-600 dark:group-hover:text-[#97D6DF] transition-colors shrink-0" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Pie informativo: estado general del pipeline */}
      <div className="flex items-center justify-between border-t border-[#ECECEC] pt-3 text-[12px] text-[#212121]/80 dark:border-gray-800 dark:text-gray-400">
        <span className="font-normal">
          {totalActivos === 0
            ? "Sin pedidos en cola"
            : `${totalActivos} ${totalActivos === 1 ? "pedido en proceso" : "pedidos en proceso"}`}
        </span>
        <button
          type="button"
          onClick={() => navigate("/pedidos")}
          className="font-bold text-[#190088] hover:text-[#FF3F1A] dark:text-[#97D6DF] dark:hover:text-white cursor-pointer hover:underline"
        >
          Gestionar en tablero →
        </button>
      </div>
    </div>
  );
});

export default EstadosOverview;
