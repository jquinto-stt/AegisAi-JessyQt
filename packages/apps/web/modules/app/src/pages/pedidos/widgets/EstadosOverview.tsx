import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { pedidosStore, type PedidoEstado } from "@/stores";
import { useConteoAnimado } from "@/hooks/useConteoAnimado";
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
      badgeBg: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
      iconColor: "text-rose-600 dark:text-rose-400",
      barColor: "bg-rose-500",
      borderColor: "border-rose-200/60",
    },
  },
  {
    id: "confirmados",
    nombre: "Confirmados",
    estados: ["confirmado"],
    icon: CheckBadgeIcon,
    colorClases: {
      badgeBg: "bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400",
      iconColor: "text-red-500 dark:text-red-400",
      barColor: "bg-red-500",
      borderColor: "border-red-200/60",
    },
  },
  {
    id: "preparacion",
    nombre: "En preparación",
    estados: ["en_preparacion"],
    icon: ClockIcon,
    colorClases: {
      badgeBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
      iconColor: "text-amber-600 dark:text-amber-400",
      barColor: "bg-amber-500",
      borderColor: "border-amber-200/60",
    },
  },
  {
    id: "listos",
    nombre: "Listos para entrega",
    estados: ["listo"],
    icon: ShoppingBagIcon,
    colorClases: {
      badgeBg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      barColor: "bg-indigo-500",
      borderColor: "border-indigo-200/60",
    },
  },
  {
    id: "camino",
    nombre: "En ruta / despacho",
    estados: ["en_camino"],
    icon: TruckIcon,
    colorClases: {
      badgeBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
      iconColor: "text-blue-600 dark:text-blue-400",
      barColor: "bg-blue-500",
      borderColor: "border-blue-200/60",
    },
  },
  {
    id: "cancelados",
    nombre: "Cancelados",
    estados: ["cancelado"],
    icon: XCircleIcon,
    enBarra: false,
    destino: "/pedidos/historial",
    colorClases: {
      badgeBg: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
      iconColor: "text-slate-500 dark:text-slate-400",
      barColor: "bg-slate-400",
      borderColor: "border-slate-200/60",
    },
  },
];

/**
 * Una tarjeta de etapa con animación de conteo numérico y proporciones del diseño.
 */
const EtapaCard = observer(
  ({
    etapa,
    porcentaje,
    onAbrir,
  }: {
    etapa: EtapaMeta & { cantidad: number };
    porcentaje: number | null;
    onAbrir: () => void;
  }) => {
    const Icon = etapa.icon;
    const cantidad = Math.round(useConteoAnimado(etapa.cantidad));

    return (
      <article
        onClick={onAbrir}
        className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold ${etapa.colorClases.badgeBg} transition-transform group-hover:scale-105`}
          >
            <Icon className="w-5 h-5" />
          </div>
          {porcentaje !== null ? (
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100/90 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {porcentaje}%
            </span>
          ) : (
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              Historial
            </span>
          )}
        </div>

        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            {etapa.nombre}
          </p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
            {cantidad.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium truncate">
            {etapa.id === "nuevos" && "Por gestionar"}
            {etapa.id === "confirmados" && "Verificados"}
            {etapa.id === "preparacion" && "En cocina / armado"}
            {etapa.id === "listos" && "Por entregar"}
            {etapa.id === "camino" && "En ruta"}
            {etapa.id === "cancelados" && "Cerrados"}
          </p>
        </div>
      </article>
    );
  },
);

/**
 * EstadosOverview — Distribución del flujo operativo de pedidos en 6 tarjetas
 * individuales en una sola línea horizontal.
 *
 * Los números de las tarjetas **cuentan** hasta su valor en vez de aparecer ya
 * puestos: al aterrizar en Inicio, ver subir seis cifras dice de un vistazo que
 * la pantalla está viva y cuánto pesa cada etapa, cosa que un número fijo no
 * dice. Es la única animación de esta pantalla —las tarjetas no escalonan su
 * entrada— para no encadenar dos movimientos sobre lo mismo.
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
        const porcentaje =
          totalActivos > 0 && etapa.enBarra !== false
            ? Math.round((etapa.cantidad / totalActivos) * 100)
            : null;

        return (
          <EtapaCard
            key={etapa.id}
            etapa={etapa}
            porcentaje={porcentaje}
            onAbrir={() => navigate(destinoDe(etapa))}
          />
        );
      })}
    </div>
  );
});

export default EstadosOverview;
