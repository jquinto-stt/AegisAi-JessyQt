/**
 * Dashboard de la Tienda — la pantalla principal de una sede.
 *
 * El barrel es el **contrato** que un módulo consume para aportar su widget: el
 * tipo `StoreDashboardWidgetDef` (con el eje `source`), el catálogo donde se
 * declara y el selector que decide qué se pinta para una tienda dada.
 */
export { StoreDashboard } from "./StoreDashboard";
export type { StoreDashboardProps } from "./StoreDashboard";
export { STORE_DASHBOARD_WIDGETS } from "./dashboard-widgets";
export { dashboardWidgetsFor } from "./store-dashboard.utils";
export type {
  DashboardWidgetSource,
  DashboardWidgetSpan,
  StoreDashboardContext,
  StoreDashboardWidgetDef,
} from "./store-dashboard.types";
export { collectStoreActivity } from "./store-activity.utils";
export type { StoreActivityEntry, StoreActivityKind } from "./store-activity.utils";
