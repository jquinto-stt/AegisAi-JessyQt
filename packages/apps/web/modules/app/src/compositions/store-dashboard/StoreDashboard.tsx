import React from "react";
import type { BusinessInstance, NectoModuleKey } from "@/context/BusinessContext";
import { STORE_DASHBOARD_WIDGETS } from "./dashboard-widgets";
import { dashboardWidgetsFor } from "./store-dashboard.utils";
import type { DashboardWidgetSpan, StoreDashboardContext } from "./store-dashboard.types";

/* ── El shell del Dashboard de tienda ───────────────────────────────────────
 * No sabe qué es un pedido ni un inventario: sabe pintar una rejilla de widgets
 * y preguntar al catálogo cuáles puede honrar esta tienda. Toda la inteligencia
 * de "qué se ve" vive en `source` (el catálogo) y en `activeModules` (la tienda).
 * ────────────────────────────────────────────────────────────────────────── */

/** Rejilla de 6 columnas: el widget declara cuánto ocupa, no cómo se pinta. */
const SPAN_CLASS: Record<DashboardWidgetSpan, string> = {
  full: "lg:col-span-6",
  half: "lg:col-span-3",
  third: "lg:col-span-2",
};

export interface StoreDashboardProps {
  business: BusinessInstance;
  /** Abre Ajustes de la sede en la pestaña indicada. */
  onOpenSettings: (tab?: string) => void;
  /** Lleva al catálogo de módulos, donde se acoplan y desacoplan. */
  onOpenModules: () => void;
  /** Abre la vista de un módulo acoplado (lo pide el widget; lo ejecuta el shell). */
  onOpenModuleView?: (moduleKey: NectoModuleKey, section?: string) => void;
  /** Abre el canal conversacional de la sede (lo pide el widget; lo ejecuta el shell). */
  onOpenConversations?: () => void;
}

export const StoreDashboard: React.FC<StoreDashboardProps> = ({
  business,
  onOpenSettings,
  onOpenModules,
  onOpenModuleView,
  onOpenConversations,
}) => {
  // ⚠️ La lista se **deriva**, no se guarda en estado ni se corrige con un
  // `useEffect`: así no hay un fotograma con los widgets de la tienda anterior
  // al cambiar de sede, ni con los de un módulo que se acaba de desacoplar.
  const ctx: StoreDashboardContext = {
    business,
    onOpenSettings,
    onOpenModules,
    onOpenModuleView,
    onOpenConversations,
  };
  const widgets = dashboardWidgetsFor(STORE_DASHBOARD_WIDGETS, business.activeModules);

  return (
    <div className="pb-16">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-6">
        {widgets.map(widget => (
          <div key={widget.id} className={SPAN_CLASS[widget.span]}>
            {widget.render(ctx)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoreDashboard;
