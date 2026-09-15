import React from "react";
import { ArrowRight, CreditCard, Globe, MessageCircle } from "lucide-react";
import { Badge, Button, Card, CardBody, CardDescription, CardHeader, CardTitle, type BadgeColor } from "@/elements";
import {
  channelStatus,
  isDemoConnection,
  type ChannelConnectionStatus,
  type ChannelType,
} from "@/context/BusinessContext";
import type { StoreDashboardContext } from "../store-dashboard.types";

/* ── Canales: por dónde atiende la tienda ───────────────────────────────────
 * Los tres canales existen siempre como filas —una tienda que no ha conectado
 * nada tiene tres canales sin conectar, no cero canales—. Así el widget dice
 * el estado real de la tienda nueva en lugar de mostrar un hueco.
 *
 * ⚠️ El estado sale de `channelStatus`, que responde `not_connected` cuando no
 * hay conexión registrada: la ausencia de dato no es un "sí".
 *
 * ⚠️ **El canal conversacional es un destino, no una conexión.** Por eso la fila
 * de WhatsApp ofrece dos caminos distintos y ambos son válidos: "Conversaciones"
 * lleva a la pantalla del canal —que es propiedad de la sede (§5)— y "Configurar"
 * abre la conexión en Ajustes de Sede. Antes sólo existía el segundo, así que la
 * tienda tenía dónde conectar WhatsApp pero ningún sitio donde **atenderlo**.
 * ────────────────────────────────────────────────────────────────────────── */

/** El catálogo de canales y cómo se llama cada uno en pantalla. */
const CHANNELS: {
  type: ChannelType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { type: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { type: "web", label: "Tienda web", icon: Globe },
  { type: "pos", label: "Punto de venta", icon: CreditCard },
];

/** Cómo se pinta cada estado. Verde = conectado; ámbar = a medias; rojo = falló. */
const STATUS_VIEW: Record<
  ChannelConnectionStatus,
  { label: string; color: BadgeColor; tone: string; dot: string }
> = {
  connected: {
    label: "Conectado",
    color: "success",
    tone: "dark:text-success-400",
    dot: "bg-success-500",
  },
  pending: {
    label: "Pendiente",
    color: "warning",
    tone: "dark:text-warning-400",
    dot: "bg-warning-500",
  },
  error: {
    label: "Error",
    color: "error",
    tone: "dark:text-error-400",
    dot: "bg-error-500",
  },
  not_connected: {
    label: "No conectado",
    color: "light",
    tone: "text-gray-500 dark:bg-gray-800 dark:text-gray-400",
    dot: "bg-gray-400",
  },
};

export const StoreChannelsWidget: React.FC<{ ctx: StoreDashboardContext }> = ({ ctx }) => {
  const { business } = ctx;

  return (
    <Card className="flex h-full flex-col p-0 sm:p-0">
      <CardHeader>
        <div>
          <CardTitle className="text-base font-bold">Canales</CardTitle>
          <CardDescription className="mt-0.5">Por dónde atiende esta tienda.</CardDescription>
        </div>
      </CardHeader>

      <CardBody className="flex flex-1 flex-col justify-center gap-1">
        {CHANNELS.map(channel => {
          const status = channelStatus(business, channel.type);
          const view = STATUS_VIEW[status];
          const isDemo = isDemoConnection(business, channel.type);
          const Icon = channel.icon;

          return (
            <div
              key={channel.type}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 flex-none items-center justify-center rounded-[10.5px] bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <Icon className="size-4" />
                </span>
                <span className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
                  {channel.label}
                </span>
              </div>

              <span className="flex flex-none items-center gap-2">
                {/* La conexión de demostración se dice: aparentar una integración
                    real que todavía no existe es peor que no tenerla. */}
                {isDemo && (
                  <Badge
                    color="light"
                    size="xs"
                    className="px-2 font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  >
                    demo
                  </Badge>
                )}
                <Badge
                  color={view.color}
                  size="sm"
                  className={`gap-1.5 px-2.5 font-bold ${view.tone}`}
                >
                  <span className={`size-1.5 flex-none rounded-full ${view.dot}`} />
                  <span>{view.label}</span>
                </Badge>
                {/* Sólo WhatsApp tiene pantalla propia donde atender la conversación:
                    los otros dos canales no la necesitan y no se ofrece una puerta
                    que llevaría a ninguna parte. */}
                {channel.type === "whatsapp" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    title="Abrir las conversaciones de WhatsApp de esta sede"
                    onClick={() => ctx.onOpenConversations?.()}
                    endIcon={<ArrowRight className="size-3.5" aria-hidden />}
                    className="h-auto gap-1 rounded-full px-2 py-0.5 text-theme-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                  >
                    Conversaciones
                  </Button>
                )}
              </span>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
};

export default StoreChannelsWidget;
