import React from "react";
import { ArrowRight, Boxes, Plug, Settings2 } from "lucide-react";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/elements";
import type { StoreDashboardContext } from "../store-dashboard.types";

/* ── Acciones principales ───────────────────────────────────────────────────
 * Las tres puertas que tiene una tienda recién creada: por dónde atiende, qué
 * capacidades acopla y cómo se configura. Son las mismas para cualquier tienda
 * —no dependen de ningún módulo— y por eso viven en el widget base.
 * ────────────────────────────────────────────────────────────────────────── */

const ACTIONS: {
  id: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  run: (ctx: StoreDashboardContext) => void;
}[] = [
  {
    id: "channel",
    label: "Conectar canal",
    hint: "WhatsApp, tienda web o punto de venta",
    icon: Plug,
    run: ctx => ctx.onOpenSettings("channels"),
  },
  {
    id: "module",
    label: "Acoplar módulo",
    hint: "Suma una capacidad operativa a la tienda",
    icon: Boxes,
    run: ctx => ctx.onOpenModules(),
  },
  {
    id: "settings",
    label: "Configurar tienda",
    hint: "Identidad, marca y operación",
    icon: Settings2,
    run: ctx => ctx.onOpenSettings("general"),
  },
];

export const StoreActionsWidget: React.FC<{ ctx: StoreDashboardContext }> = ({ ctx }) => (
  <Card className="flex h-full flex-col p-0 sm:p-0">
    <CardHeader>
      <div>
        <CardTitle className="text-base font-bold">Acciones</CardTitle>
        <CardDescription className="mt-0.5">Lo que puedes hacer con esta tienda.</CardDescription>
      </div>
    </CardHeader>

    <CardBody className="flex flex-1 flex-col justify-center gap-1">
      {ACTIONS.map(action => {
        const Icon = action.icon;

        return (
          <button
            key={action.id}
            type="button"
            onClick={() => action.run(ctx)}
            className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]"
          >
            <span className="flex size-9 flex-none items-center justify-center rounded-[10.5px] bg-brand-50 text-brand-500 transition-colors group-hover:bg-brand-500 group-hover:text-white dark:bg-brand-500/10 dark:text-brand-400 dark:group-hover:bg-brand-500 dark:group-hover:text-white">
              <Icon className="size-4" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                {action.label}
              </span>
              <span className="block truncate text-theme-xs text-gray-500 dark:text-gray-400">
                {action.hint}
              </span>
            </span>

            <ArrowRight className="size-4 flex-none text-gray-300 transition-colors group-hover:text-brand-500 dark:text-gray-600 dark:group-hover:text-brand-400" />
          </button>
        );
      })}
    </CardBody>
  </Card>
);

export default StoreActionsWidget;
