import React from "react";
import { Activity, Boxes, Package, Plug, ShoppingBag } from "lucide-react";
import { Button, Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/elements";
import { isChannelConnected, type ChannelType } from "@/context/BusinessContext";
import { formatRelativeTime } from "@/context/notifications/notifications.constants";
import { collectStoreActivity, type StoreActivityKind } from "../store-activity.utils";
import type { StoreDashboardContext } from "../store-dashboard.types";

/* ── Actividad reciente ─────────────────────────────────────────────────────
 * "¿Qué está pasando en mi tienda?" es la pregunta que el Dashboard existe para
 * responder, y este widget es su respuesta.
 *
 * ⚠️ **No fabrica sucesos.** La lista sale de `collectStoreActivity`, que hoy
 * devuelve la vacía porque ningún módulo está implementado. El estado vacío no
 * es un hueco que haya que rellenar con cifras de ejemplo: es la respuesta
 * correcta —"todavía no hay actividad"— y viene con la acción que la desbloquea.
 * ────────────────────────────────────────────────────────────────────────── */

/** Icono por clase de suceso. El productor declara la clase, no el icono. */
const KIND_ICON: Record<StoreActivityKind, React.ComponentType<{ className?: string }>> = {
  order: ShoppingBag,
  stock: Package,
  system: Activity,
};

const CHANNEL_TYPES: ChannelType[] = ["whatsapp", "web", "pos"];

export const StoreActivityWidget: React.FC<{ ctx: StoreDashboardContext }> = ({ ctx }) => {
  const { business, onOpenSettings, onOpenModules } = ctx;

  const activity = collectStoreActivity(business);
  const hasChannel = CHANNEL_TYPES.some(type => isChannelConnected(business, type));

  // La acción del estado vacío es la que de verdad desbloquea la actividad: sin
  // canal no entra nada, y sin capacidades acopladas no hay nada que contar.
  const cta = hasChannel
    ? {
        label: business.activeModules.length > 0 ? "Ver módulos" : "Acoplar módulo",
        icon: Boxes,
        run: onOpenModules,
      }
    : { label: "Conectar canal", icon: Plug, run: () => onOpenSettings("channels") };

  const CtaIcon = cta.icon;

  return (
    <Card className="flex h-full flex-col p-0 sm:p-0">
      <CardHeader>
        <div>
          <CardTitle className="text-base font-bold">Actividad</CardTitle>
          <CardDescription className="mt-0.5">
            Lo último que ha pasado en esta tienda.
          </CardDescription>
        </div>
      </CardHeader>

      {activity.length === 0 ? (
        <CardBody className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-[10.5px] bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
            <Activity className="size-6" />
          </span>
          <p className="mt-4 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            Todavía no hay actividad en esta tienda.
          </p>
          <p className="mt-1 max-w-sm text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {hasChannel
              ? "Los sucesos de tu tienda aparecerán aquí a medida que ocurran."
              : "Conecta un canal para empezar a recibir pedidos y conversaciones."}
          </p>
          <Button
            variant="primary"
            size="sm"
            startIcon={<CtaIcon className="size-4" />}
            onClick={cta.run}
            className="mt-6 rounded-full px-5"
          >
            {cta.label}
          </Button>
        </CardBody>
      ) : (
        <CardBody className="flex-1">
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {activity.map(entry => {
              const Icon = KIND_ICON[entry.kind];

              return (
                <li key={entry.id} className="flex items-center gap-3 py-3">
                  <span className="flex size-9 flex-none items-center justify-center rounded-[10.5px] bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-theme-sm text-gray-800 dark:text-white/90">
                    {entry.title}
                  </span>
                  <span className="flex-none font-mono text-theme-xs text-gray-400 dark:text-gray-500">
                    {formatRelativeTime(entry.at)}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardBody>
      )}
    </Card>
  );
};

export default StoreActivityWidget;
