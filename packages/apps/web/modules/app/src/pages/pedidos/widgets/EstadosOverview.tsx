import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { pedidosStore, type PedidoEstado } from "@/stores";
import { ArrowUpRight } from "lucide-react";

interface EtapaMeta {
  id: string;
  nombre: string;
  estados: PedidoEstado[];
  umbralAlerta: number;
}

const ETAPAS: EtapaMeta[] = [
  { id: "nuevos", nombre: "Nuevos / Confirmados", estados: ["nuevo", "confirmado"], umbralAlerta: 5 },
  { id: "preparacion", nombre: "En Preparación", estados: ["en_preparacion"], umbralAlerta: 4 },
  { id: "listos", nombre: "Listos para Retiro", estados: ["listo"], umbralAlerta: 6 },
  { id: "camino", nombre: "En Camino (Domicilios)", estados: ["en_camino"], umbralAlerta: 5 },
];

/**
 * EstadosOverview — Resumen de flujo operativo en tiempo real por etapa.
 * Equivalente de QueuesOverview para pedidos, con semáforo de saturación.
 */
export const EstadosOverview = observer(() => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col justify-between h-full rounded-2xl border border-gray-200/90 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 min-h-[310px]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white/90">
            Flujo de Cocina & Despacho
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Estado en vivo por cada etapa del pipeline</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/pedidos")}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 cursor-pointer"
        >
          <span>Ver Tablero Kanban</span>
          <ArrowUpRight className="size-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 flex-1">
        {ETAPAS.map((etapa) => {
          const pedidosEtapa = pedidosStore.pedidos.filter((p) => etapa.estados.includes(p.estado));
          const cantidad = pedidosEtapa.length;
          const ultimo = pedidosEtapa[0];

          let satDot = "bg-success-500";
          let satLabel = "Fluyendo";

          if (cantidad >= etapa.umbralAlerta) {
            satDot = "bg-error-500 animate-pulse";
            satLabel = "Saturado";
          } else if (cantidad >= Math.ceil(etapa.umbralAlerta / 2)) {
            satDot = "bg-warning-500";
            satLabel = "Acumulándose";
          }

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
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
                  <span className={`h-2 w-2 rounded-full ${satDot}`} />
                  {satLabel}
                </span>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-gray-800 dark:text-white/95">
                    {cantidad}
                  </p>
                  <p className="text-[11px] text-gray-400">pedidos activos</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-brand-600 dark:text-brand-400">
                    {ultimo ? ultimo.numero : "—"}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate max-w-[90px]">
                    {ultimo ? ultimo.cliente : "al día"}
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
