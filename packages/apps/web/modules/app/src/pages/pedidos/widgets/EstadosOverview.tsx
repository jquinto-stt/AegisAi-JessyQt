import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { pedidosStore, type PedidoEstado } from "@/stores";
import { ArrowUpRightIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { cn } from "@/utils";
import { money } from "./widgets.comunes";

interface EtapaMeta {
  id: string;
  nombre: string;
  estados: PedidoEstado[];
}

const ETAPAS: EtapaMeta[] = [
  { id: "nuevos", nombre: "Nuevos y confirmados", estados: ["nuevo", "confirmado"] },
  { id: "preparacion", nombre: "En preparación", estados: ["en_preparacion"] },
  { id: "listos", nombre: "Listos para entrega/retiro", estados: ["listo"] },
  { id: "camino", nombre: "En ruta", estados: ["en_camino"] },
];

/**
 * EstadosOverview — Flujo de pedidos interactivo y limpio por etapa.
 */
export const EstadosOverview = observer(() => {
  const navigate = useNavigate();

  // Por defecto abrimos las etapas que tengan pedidos para visualización inmediata
  const [etapasAbiertas, setEtapasAbiertas] = useState<Record<string, boolean>>(() => {
    return { nuevos: true };
  });

  const toggleEtapa = (id: string) => {
    setEtapasAbiertas((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="flex flex-col justify-between h-full rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 min-h-[310px]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-ink-title dark:text-white">
            Flujo de pedidos
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Pedidos activos por etapa
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/pedidos")}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 cursor-pointer"
        >
          <span>Ver tablero</span>
          <ArrowUpRightIcon className="size-3.5" />
        </button>
      </div>

      {/* Lista de etapas desplegables sin redundancia */}
      <div className="space-y-2 flex-1 overflow-y-auto pr-1">
        {ETAPAS.map((etapa) => {
          const pedidosEtapa = pedidosStore.pedidos.filter((p) => etapa.estados.includes(p.estado));
          const cantidad = pedidosEtapa.length;
          const estaAbierta = !!etapasAbiertas[etapa.id];

          return (
            <div
              key={etapa.id}
              className="rounded-xl border border-gray-100 bg-gray-50/60 transition-colors dark:border-gray-800/80 dark:bg-gray-800/40"
            >
              {/* Fila cabecera de la etapa */}
              <button
                type="button"
                onClick={() => toggleEtapa(etapa.id)}
                className="w-full flex items-center justify-between p-3.5 text-left transition-colors hover:bg-gray-100/60 dark:hover:bg-gray-800/70 rounded-xl cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                    {etapa.nombre}
                  </span>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                    · {cantidad}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                  <ChevronDownIcon
                    className={cn(
                      "size-4 transition-transform duration-200",
                      estaAbierta && "rotate-180 text-gray-600 dark:text-gray-300"
                    )}
                  />
                </div>
              </button>

              {/* Contenido desplegable: lista de pedidos */}
              {estaAbierta && (
                <div className="px-3.5 pb-3.5 pt-1 border-t border-gray-100/80 dark:border-gray-800/60">
                  {cantidad === 0 ? (
                    <p className="py-2 text-xs text-gray-400 dark:text-gray-500 italic">
                      Sin pedidos en esta etapa
                    </p>
                  ) : (
                    <div className="space-y-1 mt-1">
                      {pedidosEtapa.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => navigate(`/pedidos?detalle=${p.id}`)}
                          className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors hover:bg-white hover:shadow-2xs dark:hover:bg-gray-800 cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono font-bold text-brand-600 dark:text-brand-400 group-hover:underline">
                              {p.numero}
                            </span>
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                            <span className="font-medium text-gray-700 dark:text-gray-200 truncate">
                              {p.cliente}
                            </span>
                          </div>
                          <span className="font-semibold text-gray-500 dark:text-gray-400 shrink-0 ml-2">
                            {money(pedidosStore.totalPedido(p))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default EstadosOverview;
