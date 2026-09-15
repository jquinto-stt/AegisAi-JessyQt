import type { ReactNode } from "react";
import type { BusinessInstance, NectoModuleKey } from "@/context/BusinessContext";

/* ── El Dashboard de la Tienda es un shell + widgets ─────────────────────────
 *
 * La tienda **existe primero**; después se le acoplan capacidades. Por eso el
 * Dashboard no es una pantalla cerrada con métricas fijas: es una rejilla que
 * pinta los widgets que la tienda **puede honrar**.
 *
 * ⚠️ `source` es el **único** sitio donde se declara de dónde sale un widget.
 * El shell no pregunta en ninguna parte "¿esta tienda tiene Pedidos?": filtra
 * por este eje. Así un módulo que aterrice mañana se suma con su propio widget
 * sin tocar el shell, ni los demás widgets, ni la pantalla de nadie.
 *
 * Hoy el catálogo sólo tiene widgets de la propia tienda (`"store"`): ningún
 * módulo existe todavía, así que ninguno aporta widget. La ausencia de widgets
 * de módulo **no** es un caso especial: es el mismo filtro devolviendo menos.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * De dónde sale un widget.
 *
 * - `"store"` — lo pinta la tienda misma; está siempre que haya tienda.
 * - Un `NectoModuleKey` — lo aporta ese módulo y **sólo se pinta si la tienda
 *   lo tiene acoplado** (`business.activeModules`).
 */
export type DashboardWidgetSource = "store" | NectoModuleKey;

/**
 * Franja de la rejilla de 6 columnas. Se traduce a `lg:col-span-*` en el shell,
 * que es quien posee la rejilla: el widget declara **cuánto ocupa**, no cómo se
 * pinta el contenedor.
 */
export type DashboardWidgetSpan = "full" | "half" | "third";

/** Lo que recibe un widget para pintarse. Nada más: un widget no lee el almacén. */
export interface StoreDashboardContext {
  /** La sede activa. El Dashboard no existe sin tienda. */
  business: BusinessInstance;
  /** Abre Ajustes de la sede en la pestaña indicada (`"channels"`, `"general"`…). */
  onOpenSettings: (tab?: string) => void;
  /** Lleva al catálogo de módulos, que es donde se acoplan y desacoplan. */
  onOpenModules: () => void;
  /**
   * Abre la vista de un módulo acoplado, opcionalmente en una sección concreta.
   *
   * ⚠️ Es **opcional** a propósito, y no una prop más del contrato base: un widget
   * de la tienda (`source: "store"`) no tiene módulo al que llevar, y obligarle a
   * declarar esta prop sería pedirle un dato que no posee. Sólo la usa el widget de
   * un módulo, que sí sabe cuál es su pantalla.
   *
   * ⚠️ El widget **pide la navegación**; no la ejecuta. Quien conoce la estructura
   * de destinos y la URL es el shell (`NectoApp`). Si el widget navegara por su
   * cuenta, habría dos sitios que saben a dónde lleva "ver pedidos" y podrían
   * divergir.
   */
  onOpenModuleView?: (moduleKey: NectoModuleKey, section?: string) => void;
  /**
   * Abre el **canal conversacional** de la sede (WhatsApp).
   *
   * ⚠️ Existe separado de `onOpenModuleView` por la misma razón por la que el §5
   * separa ambos conceptos: el canal conversacional **no es un módulo acoplable**,
   * es una capacidad de la tienda. Meterlo por `onOpenModuleView` obligaría a
   * declarar un `NectoModuleKey` que no existe, y el tipo estaría describiendo algo
   * que la tienda no acopla.
   *
   * ⚠️ Es **opcional** y el widget lo respeta: un Dashboard sin esta prop sigue
   * pintando la fila del canal, sólo que sin la puerta al chat. Un widget no debe
   * romperse porque su host no sepa navegar.
   */
  onOpenConversations?: () => void;
}

/** Un widget del Dashboard. */
export interface StoreDashboardWidgetDef {
  /** Clave estable y única dentro del catálogo. */
  id: string;
  source: DashboardWidgetSource;
  span: DashboardWidgetSpan;
  /** Orden en la rejilla (menor primero). Empates: orden del catálogo. */
  order: number;
  render: (ctx: StoreDashboardContext) => ReactNode;
}
