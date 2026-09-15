/**
 * Pedidos → Canales de origen (§18, §26)
 * =======================================
 *
 * La pantalla más delicada del módulo, porque es donde la frontera se cruza con
 * más facilidad.
 *
 * ── Qué es esta pantalla (§26) ──────────────────────────────────────────────
 *
 * "Debe representar **solamente aquello que Pedidos necesita conocer o configurar
 * respecto al origen de órdenes**, respetando la propiedad global de Canales de la
 * Tienda. **No dupliques el dominio de Canales.**"
 *
 * ── Qué NO es ───────────────────────────────────────────────────────────────
 *
 * ⚠️ §18 — "**CANAL ≠ PEDIDO**. Un canal transporta/interactúa. Pedidos gestiona la
 * orden." Aquí no se conecta WhatsApp: no hay QR, ni Embedded Signup, ni tokens de
 * Meta, ni webhooks. Todo eso es del **canal**, propiedad de la Tienda.
 *
 * ⚠️ §20 — "Tampoco implementes WhatsApp dentro de Pedidos." WhatsApp se nombra
 * como un origen más, en la misma lista donde están POS y web.
 *
 * ⚠️ §28 — "La configuración de WhatsApp pertenece al canal/integración. No crees
 * una configuración completa de WhatsApp dentro de Pedidos."
 *
 * ── Cómo se resuelve la tensión ─────────────────────────────────────────────
 *
 * Pedidos necesita saber **qué orígenes puede esperar**, y ese dato ya existe: son
 * las `channelConnections` de la **tienda** (`ChannelConnection`), que Pedidos
 * **lee** a través de `useBusiness`. La pantalla es un espejo de sólo lectura con
 * un puente a la configuración real (Ajustes de Sede → Canales), de modo que el
 * operador entiende de dónde vienen sus órdenes sin que Pedidos se apropie del
 * canal.
 *
 * ⚠️ Lo que **sí** aporta esta pantalla y no existía: el **volumen real** de cada
 * origen, separando lo que sigue vivo de lo que ya se cerró. Es un dato de la
 * orden —su `source`—, así que Pedidos puede calcularlo sin poseer el canal, y es
 * lo que responde "¿por dónde me está entrando el trabajo?".
 */

import { useMemo } from "react";
import { ArrowUpRight, MessageSquare, Monitor, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Alert, Badge, Button, Card } from "@/elements";
import type { ChannelType } from "@/context/BusinessContext";
import { isChannelConnected } from "@/context/BusinessContext";
import { useBusiness } from "@/context/BusinessContext";
import type { Order } from "@/contracts/order.contract";
import { isOrderOpen } from "@/contracts/order.contract";
import { useOrders } from "../context/OrdersContext";
import { orderCountsBySource } from "../operational/order-operations";

/* ── Catálogo de canales que Pedidos reconoce ──────────────────────────────── */

/**
 * Presentación de cada tipo de canal.
 *
 * ⚠️ Es sólo **presentación** (icono, nombre, descripción). No hay lógica de canal
 * aquí: ni endpoints, ni credenciales, ni estado de conexión propio. El estado se
 * lee de la tienda.
 */
const CHANNEL_PRESENTATION: Record<
  ChannelType,
  { label: string; description: string; icon: LucideIcon }
> = {
  whatsapp: {
    label: "WhatsApp",
    description: "Las órdenes llegan desde las conversaciones atendidas por el asistente o un operador.",
    icon: MessageSquare,
  },
  web: {
    label: "Tienda web",
    description: "Órdenes creadas desde el catálogo público o el widget de la tienda.",
    icon: Monitor,
  },
  pos: {
    label: "POS / Mostrador",
    description: "Órdenes registradas en el punto de venta o directamente en el mostrador.",
    icon: ShoppingCart,
  },
};

/** Orígenes que Pedidos admite aunque la tienda no tenga el canal conectado. */
const PASSTHROUGH_SOURCES = [
  { type: "COUNTER", label: "Mostrador", description: "Órdenes cargadas directamente por un operador." },
  { type: "API", label: "API", description: "Órdenes integradas desde un sistema externo." },
];

/* ── Volumen por origen ────────────────────────────────────────────────────── */

interface SourceVolume {
  total: number;
  open: number;
  closed: number;
}

/**
 * Cuántas órdenes entraron por cada canal, separando lo vivo de lo cerrado.
 *
 * ⚠️ Se calcula sobre `order.source` —un dato **de la orden**— y no sobre el
 * canal: por eso Pedidos puede hacerlo sin poseer el canal (§18). La separación
 * importa porque "120 órdenes por WhatsApp" no dice lo mismo que "120, de las
 * cuales 8 siguen abiertas": la primera cifra mide el histórico, la segunda la
 * carga actual.
 */
function volumesBySource(orders: readonly Order[]): Map<string, SourceVolume> {
  const totals = orderCountsBySource(orders);
  const volumes = new Map<string, SourceVolume>();

  for (const [key, total] of totals) {
    const open = orders.filter(
      order => order.source.type.toUpperCase() === key && isOrderOpen(order)
    ).length;
    volumes.set(key, { total, open, closed: total - open });
  }

  return volumes;
}

/* ── Tarjeta de origen ─────────────────────────────────────────────────────── */

interface SourceCardProps {
  anchor: string;
  icon: LucideIcon;
  label: string;
  description: string;
  /** `null` cuando el origen no depende de una conexión (mostrador, API). */
  connected: boolean | null;
  volume: SourceVolume;
}

function SourceCard({
  anchor,
  icon: Icon,
  label,
  description,
  connected,
  volume,
}: SourceCardProps) {
  return (
    <Card data-channel-card={anchor} className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        {/* ⚠️ `connected === null` es "no aplica", no "sin conectar": el mostrador
            y la API no dependen de una conexión, y pintarlos como desconectados
            sugeriría que falta hacer algo. */}
        {connected !== null && (
          <Badge color={connected ? "success" : "light"} size="sm">
            {connected ? "Conectado" : "Sin conectar"}
          </Badge>
        )}
      </div>

      <div>
        <h4 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">{label}</h4>
        <p className="mt-1 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>

      <div
        data-channel-volume={anchor}
        className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 pt-3 dark:border-gray-800"
      >
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-800 dark:text-white/90">{volume.total}</span>{" "}
          {volume.total === 1 ? "orden" : "órdenes"}
        </p>
        <p className="text-theme-xs text-gray-400 dark:text-gray-500">
          {volume.open} en curso · {volume.closed} cerradas
        </p>
      </div>
    </Card>
  );
}

/* ── Vista ─────────────────────────────────────────────────────────────────── */

export interface ChannelsViewProps {
  /** Puente a la configuración real de canales, que vive en la configuración de sede. */
  onOpenStoreChannels: () => void;
}

export function ChannelsView({ onOpenStoreChannels }: ChannelsViewProps) {
  const { activeBusiness } = useBusiness();
  const { orders } = useOrders();

  const volumes = useMemo(() => volumesBySource(orders), [orders]);
  const emptyVolume: SourceVolume = { total: 0, open: 0, closed: 0 };

  return (
    <div data-channels-view className="flex flex-col gap-6 pb-16">
      {/* Nota de frontera: se dice en pantalla de quién es la configuración, en
          lugar de aparentar que Pedidos la posee (§26, §28). */}
      <div data-channels-boundary className="flex flex-col gap-3">
        <Alert
          variant="info"
          title="Pedidos recibe órdenes ya normalizadas"
          message="La conexión de cada canal —credenciales, verificación, webhooks— se configura en la configuración de sede, que es donde vive el dominio de Canales. Aquí sólo se muestra de dónde están entrando las órdenes."
        />
        {/* ⚠️ `Button` sí acepta `intent`, así que el gancho `data-intent` viaja con
            el componente y no se pierde al dejar de ser un `<button>` nativo. */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenStoreChannels}
          intent="orders.channels.open_store"
          className="self-start"
          endIcon={<ArrowUpRight className="h-3.5 w-3.5" />}
        >
          Configurar en la configuración de sede
        </Button>
      </div>

      {/* Canales de la tienda, en modo lectura. */}
      <section className="flex flex-col gap-3">
        <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          Canales de la tienda
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(Object.keys(CHANNEL_PRESENTATION) as ChannelType[]).map(type => {
            const presentation = CHANNEL_PRESENTATION[type];
            // ⚠️ El estado de conexión lo resuelve el predicado de la **tienda**
            // (`isChannelConnected`, que recibe la tienda entera), no un `.find()`
            // escrito aquí: así esta pantalla no puede discrepar de Ajustes de Sede
            // sobre si hay conexión.
            return (
              <SourceCard
                key={type}
                anchor={type}
                icon={presentation.icon}
                label={presentation.label}
                description={presentation.description}
                connected={isChannelConnected(activeBusiness, type)}
                volume={volumes.get(type.toUpperCase()) ?? emptyVolume}
              />
            );
          })}
        </div>
      </section>

      {/* Orígenes que no dependen de un canal conectado. */}
      <section className="flex flex-col gap-3">
        <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          Otros orígenes admitidos
        </h3>
        <p className="max-w-3xl text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
          Estos orígenes no dependen de una conexión de canal: el vocabulario de origen de una
          orden es abierto (§18), así que una integración nueva aparece aquí sin tocar este
          módulo.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PASSTHROUGH_SOURCES.map(source => (
            <SourceCard
              key={source.type}
              anchor={source.type}
              icon={MessageSquare}
              label={source.label}
              description={source.description}
              connected={null}
              volume={volumes.get(source.type) ?? emptyVolume}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default ChannelsView;
