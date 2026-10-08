import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { pedidosStore, type PedidoEstado } from "@/stores";
import {
  CheckBadgeIcon,
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
 * EstadosOverview — Distribución del flujo operativo de pedidos en 6 tarjetas
 * individuales en una sola línea horizontal.
 */
export const EstadosOverview = observer(() => {
  const navigate = useNavigate();

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

  // Denominador: solo las etapas activas en el flujo
  const totalActivos = etapasConteo.reduce(
    (acc, e) => acc + (e.enBarra === false ? 0 : e.cantidad),
    0,
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
      {etapasConteo.map((etapa) => {
        const Icon = etapa.icon;
        const porcentaje =
          totalActivos > 0 && etapa.enBarra !== false
            ? Math.round((etapa.cantidad / totalActivos) * 100)
            : null;

        return (
          <div
            key={etapa.id}
            onClick={() => navigate(destinoDe(etapa))}
            className="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-4 shadow-theme-xs transition-all duration-200 hover:shadow-theme-md hover:border-secondary-200 dark:border-gray-800 dark:bg-gray-900 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2">
              <div
                className={`flex size-9 sm:size-10 items-center justify-center rounded-xl ${etapa.colorClases.badgeBg} ${etapa.colorClases.iconColor} transition-transform duration-200 group-hover:scale-105`}
              >
                <Icon className="size-4.5 sm:size-5" />
              </div>
              {porcentaje !== null ? (
                <span className="inline-flex items-center rounded-full bg-accent-50 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-accent-700 dark:bg-accent-950/50 dark:text-accent-400">
                  {porcentaje}%
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  Historial
                </span>
              )}
            </div>

            <div className="mt-3">
              <p className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">
                {etapa.nombre}
              </p>
              <p className="mt-0.5 text-xl sm:text-2xl font-bold tracking-tight text-ink-title dark:text-white">
                {etapa.cantidad.toLocaleString()}
              </p>
              <p className="mt-0.5 text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 truncate">
                {etapa.id === "nuevos" && "Por gestionar"}
                {etapa.id === "confirmados" && "Verificados"}
                {etapa.id === "preparacion" && "En cocina / armado"}
                {etapa.id === "listos" && "Por entregar"}
                {etapa.id === "camino" && "En ruta"}
                {etapa.id === "cancelados" && "Cerrados"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default EstadosOverview;
