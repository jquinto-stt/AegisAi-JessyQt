import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { pedidosStore, type PedidoEstado } from "@/stores";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";

interface EtapaMeta {
  id: string;
  nombre: string;
  estados: PedidoEstado[];
}

const ETAPAS: EtapaMeta[] = [
  { id: "nuevos", nombre: "Nuevos y Confirmados", estados: ["nuevo", "confirmado"] },
  { id: "preparacion", nombre: "En Preparación", estados: ["en_preparacion"] },
  { id: "listos", nombre: "Listos para Entrega / Retiro", estados: ["listo"] },
  { id: "camino", nombre: "En Ruta / Domicilio", estados: ["en_camino"] },
];

/**
 * EstadosOverview — Resumen del pipeline operativo de pedidos por etapa.
 */
export const EstadosOverview = observer(() => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col justify-between h-full rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 min-h-[310px]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-ink-title dark:text-white">
            Flujo Operativo de Pedidos
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Distribución de pedidos activos según su etapa
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/pedidos")}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 cursor-pointer"
        >
          <span>Ver Tablero Kanban</span>
          <ArrowUpRightIcon className="size-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 flex-1">
        {ETAPAS.map((etapa) => {
          const pedidosEtapa = pedidosStore.pedidos.filter((p) => etapa.estados.includes(p.estado));
          const cantidad = pedidosEtapa.length;
          const ultimo = pedidosEtapa[0];

          return (
            <div
              key={etapa.id}
              onClick={() => navigate("/pedidos")}
              className="group cursor-pointer flex flex-col justify-between rounded-xl border border-gray-200/90 bg-gray-50/50 p-4 transition-all hover:border-brand-300 hover:bg-white hover:shadow-theme-xs dark:border-gray-800 dark:bg-gray-800/40 dark:hover:bg-gray-800"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">
                  {etapa.nombre}
                </span>
                <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                  {cantidad === 1 ? "1 pedido" : `${cantidad} pedidos`}
                </span>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-white/95">
                    {cantidad}
                  </p>
                  <p className="text-[11px] text-gray-400">activos</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-brand-600 dark:text-brand-400">
                    {ultimo ? ultimo.numero : "—"}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate max-w-[100px]">
                    {ultimo ? ultimo.cliente : "Al día"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default EstadosOverview;
