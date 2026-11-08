import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { pedidosStore, type PedidoEstado } from "@/stores";
import { useConteoAnimado } from "@/hooks/useConteoAnimado";
import { useEntradaEscalonada } from "@/hooks/useEntradaEscalonada";
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
 * Mapeo de etapas alineado estrictamente a la paleta oficial de NECTO y tipografía DM Sans:
 * - #FF3F1A: Naranja NECTO
 * - #97D6DF: Cyan NECTO
 * - #ECECEC: Gris claro
 * - #190088: Azul profundo NECTO → Títulos y encabezados
 * - #212121: Dark → Texto general
 * - #EFE6D3: Cream / Complementario
 */
const ETAPAS: EtapaMeta[] = [
  {
    id: "nuevos",
    nombre: "Nuevos",
    estados: ["nuevo"],
    icon: InboxStackIcon,
    colorClases: {
      badgeBg: "bg-[#FF3F1A]/15 text-[#FF3F1A] dark:bg-[#FF3F1A]/20 dark:text-[#FF3F1A]",
      iconColor: "text-[#FF3F1A]",
      barColor: "bg-[#FF3F1A]",
      borderColor: "border-[#FF3F1A]/30",
    },
  },
  {
    id: "confirmados",
    nombre: "Confirmados",
    estados: ["confirmado"],
    icon: CheckBadgeIcon,
    colorClases: {
      badgeBg: "bg-[#97D6DF]/25 text-[#190088] dark:bg-[#97D6DF]/20 dark:text-[#97D6DF]",
      iconColor: "text-[#190088] dark:text-[#97D6DF]",
      barColor: "bg-[#97D6DF]",
      borderColor: "border-[#97D6DF]/40",
    },
  },
  {
    id: "preparacion",
    nombre: "En preparación",
    estados: ["en_preparacion"],
    icon: ClockIcon,
    colorClases: {
      badgeBg: "bg-[#EFE6D3] text-[#190088] dark:bg-[#EFE6D3]/20 dark:text-[#EFE6D3]",
      iconColor: "text-[#190088] dark:text-[#EFE6D3]",
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
      badgeBg: "bg-[#190088] text-white dark:bg-[#190088]/80 dark:text-white",
      iconColor: "text-white",
      barColor: "bg-[#190088]",
      borderColor: "border-[#190088]/40",
    },
  },
  {
    id: "camino",
    nombre: "En ruta / despacho",
    estados: ["en_camino"],
    icon: TruckIcon,
    colorClases: {
      badgeBg: "bg-[#97D6DF] text-[#190088] dark:bg-[#97D6DF]/30 dark:text-[#97D6DF]",
      iconColor: "text-[#190088] dark:text-[#97D6DF]",
      barColor: "bg-[#97D6DF]",
      borderColor: "border-[#97D6DF]/50",
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
      badgeBg: "bg-[#ECECEC] text-[#212121] dark:bg-white/10 dark:text-[#ECECEC]",
      iconColor: "text-[#212121] dark:text-[#ECECEC]",
      barColor: "bg-[#ECECEC]",
      borderColor: "border-[#ECECEC]",
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
        className="bg-white dark:bg-[#1E1E22] rounded-2xl p-4 border border-[#ECECEC] dark:border-white/10 shadow-theme-xs hover:border-[#190088]/30 dark:hover:border-white/20 transition-all flex flex-col justify-between group cursor-pointer font-sans"
      >
        <div className="flex items-center justify-between">
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold ${etapa.colorClases.badgeBg} transition-transform group-hover:scale-105`}
          >
            <Icon className="w-5 h-5" />
          </div>
          {porcentaje !== null ? (
            <span className="text-[12px] font-bold text-[#212121] dark:text-[#ECECEC] bg-[#ECECEC] dark:bg-white/10 px-2.5 py-0.5 rounded-full">
              {porcentaje}%
            </span>
          ) : (
            <span className="text-[12px] font-normal text-[#212121]/70 dark:text-[#ECECEC]/60 bg-[#ECECEC] dark:bg-white/10 px-2 py-0.5 rounded-full">
              Historial
            </span>
          )}
        </div>

        <div className="mt-3">
          <p className="text-[12px] font-bold text-[#190088] dark:text-[#97D6DF] uppercase tracking-wider truncate">
            {etapa.nombre}
          </p>
          <p className="text-[24px] font-bold text-[#190088] dark:text-white mt-0.5">
            {cantidad.toLocaleString()}
          </p>
          <p className="text-[12px] font-normal text-[#212121]/70 dark:text-[#ECECEC]/60 mt-0.5 truncate">
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

  // Las seis etapas entran en cascada, de izquierda a derecha y de arriba abajo
  // —el orden en que se leen—, con el mismo paso compartido de 40 ms que usa el
  // resto del producto.
  //
  // No es adorno: este bloque es lo primero que se ve en Inicio y su contenido es
  // un PIPELINE. La cascada recorre el flujo una vez y deja dicho cómo se lee la
  // pantalla, que es justo lo que un usuario nuevo no sabe al abrirla. Antes las
  // seis tarjetas aparecían de golpe.
  const refEtapas = useEntradaEscalonada<HTMLDivElement>({ desde: 16, duracionMs: 480 });

  return (
    <div
      ref={refEtapas}
      className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6"
    >
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
