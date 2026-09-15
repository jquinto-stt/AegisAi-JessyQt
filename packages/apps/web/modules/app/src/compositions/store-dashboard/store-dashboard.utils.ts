import type { NectoModuleKey } from "@/context/BusinessContext";
import type {
  DashboardWidgetSource,
  StoreDashboardWidgetDef,
} from "./store-dashboard.types";

/**
 * ¿Esta tienda puede honrar la fuente de un widget?
 *
 * `"store"` siempre —el widget base no depende de nada—; el widget de un módulo
 * sólo si la tienda lo tiene acoplado.
 *
 * ⚠️ Predicado **único**: cualquier superficie que necesite preguntarlo lo hace
 * aquí, no con un `activeModules.includes(...)` suelto que pueda discrepar. Es
 * el mismo patrón que `isCapabilitySourceAvailable` en `business-settings`.
 */
export function isWidgetSourceAvailable(
  source: DashboardWidgetSource,
  activeModules: readonly NectoModuleKey[]
): boolean {
  return source === "store" || activeModules.includes(source);
}

/**
 * Los widgets que esta tienda debe pintar, en orden.
 *
 * ⚠️ Que hoy no salga ningún widget de módulo **no es un caso especial**: es el
 * mismo filtro devolviendo menos, porque ningún módulo existe todavía. El día
 * que uno aterrice y declare `source: "pedidos"`, aparece aquí sin tocar esto.
 *
 * No muta el catálogo (devuelve una lista nueva).
 */
export function dashboardWidgetsFor(
  catalogue: readonly StoreDashboardWidgetDef[],
  activeModules: readonly NectoModuleKey[]
): StoreDashboardWidgetDef[] {
  return catalogue
    .filter(widget => isWidgetSourceAvailable(widget.source, activeModules))
    .slice()
    .sort((a, b) => a.order - b.order);
}
