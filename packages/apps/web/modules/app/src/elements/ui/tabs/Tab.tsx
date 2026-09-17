import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/utils";

/**
 * Visual style of the Tab bar.
 *
 * - `"default"` — Pill/rounded tabs inside a gray container. Active tab
 *   gets a white card with shadow. Best for content switching. *(default)*
 * - `"underline"` — Horizontal tabs with a bottom border indicator.
 *   Active tab shows a brand-colored underline. Supports `badge` counts.
 * - `"vertical"` — Stacked tabs for sidebar navigation. Active tab gets
 *   a tinted brand background.
 * @kgId 19343c22686d
 */
export type TabVariant = "default" | "underline" | "vertical";

/**
 * Definition of a single tab within the `Tab` component.
 * @kgId 6a2f2fba601e
 */
export interface TabItem {
  /** Unique identifier for the tab — used in `activeTab` and `onTabChange` */
  key: string;
  /** Display text for the tab */
  label: string;
  /** Optional icon rendered before the label */
  icon?: ReactNode;
  /** Optional count badge — only visible in `"underline"` variant */
  badge?: number;
}

/**
 * Props for the **Tab** component.
 * @kgId f0193259b133
 */
export interface TabProps {
  /**
   * Array of tab definitions. Each item needs a unique `key` and a `label`.
   *
   * @example
   * ```tsx
   * <Tab
   *   items={[
   *     { key: "overview", label: "Overview" },
   *     { key: "settings", label: "Settings" },
   *   ]}
   *   activeTab="overview"
   *   onTabChange={setActiveTab}
   * />
   * ```
   */
  items: TabItem[];

  /**
   * The `key` of the currently active tab. Must match one of the
   * items' `key` values. There must always be one active tab.
   */
  activeTab: string;

  /**
   * Callback fired when the user clicks a tab. Receives the `key`
   * of the clicked tab.
   */
  onTabChange: (key: string) => void;

  /**
   * Visual style of the tab bar.
   *
   * @default `"default"`
   *
   * @example
   * ```tsx
   * <Tab items={tabs} activeTab={active} onTabChange={setActive} variant="underline" />
   * ```
   */
  variant?: TabVariant;

  /**
   * Additional CSS classes for the tab container.
   *
   * @default `""`
   */
  className?: string;

  /**
   * Additional CSS classes for each individual tab button.
   *
   * @default `""`
   */
  itemClassName?: string;
}

/**
 * Tab — Organizes related content into switchable sections.
 *
 * A fully controlled component that renders a set of tabs where
 * exactly one is always active. The parent manages which tab is
 * selected via `activeTab` and `onTabChange`.
 *
 * @remarks
 * **When to use Tab vs related components:**
 * - Use `Tab` to switch between related content panels within the
 *   same page — settings sections, dashboard views, data categories.
 * - Use **Pagination** to navigate between pages of a data set.
 * - Use **Breadcrumb** to show hierarchical navigation position.
 * - Use **ButtonsGroup** for toggling between modes or filters
 *   that don't have associated content panels.
 *
 * **Variant guide:**
 * - `"default"` — Pill style. Best for content area switching.
 * - `"underline"` — Border indicator. Supports `badge` counts for
 *   showing item quantities per tab.
 * - `"vertical"` — Sidebar navigation. Best for settings pages
 *   or multi-section forms.
 *
 * **Icons:**
 * - Any variant can include `icon` per tab item to reinforce
 *   the label visually, improving scan-ability in dense UIs.
 *
 * **Animation:**
 * - In the `"underline"` variant the active marker **slides** to the newly
 *   selected tab (200 ms) instead of jumping. The marker is measured with
 *   `offsetLeft`/`offsetWidth` in a layout effect, so it is repositioned
 *   before paint and re-measured on resize via `ResizeObserver`.
 * - `"default"` and `"vertical"` keep an instant state change on purpose:
 *   their active state is a background painted by the button itself, and
 *   neither variant has a consumer today.
 * - Respects `prefers-reduced-motion` (`motion-reduce:transition-none`).
 *
 * **Limitations:**
 * - `badge` only renders in `"underline"` variant.
 * - No lazy rendering of tab content — parent must handle
 *   conditional rendering based on `activeTab`.
 * - No keyboard navigation (arrow keys between tabs).
 * - The sliding marker needs a real layout engine. Under jsdom (tests)
 *   `offsetWidth` is `0`, so the marker simply renders nothing — assert on
 *   the buttons, never on the marker.
 * - If no tab matches `activeTab`, no marker is drawn at all (fail-closed):
 *   a marker on the wrong tab would lie about which section is active.
 *
 * @example Basic pill tabs
 * ```tsx
 * <Tab
 *   items={[
 *     { key: "overview", label: "Overview" },
 *     { key: "analytics", label: "Analytics" },
 *     { key: "reports", label: "Reports" },
 *   ]}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 * />
 * ```
 *
 * @example Underline with badges
 * ```tsx
 * <Tab
 *   variant="underline"
 *   items={[
 *     { key: "all", label: "All", badge: 42 },
 *     { key: "active", label: "Active", badge: 12 },
 *     { key: "archived", label: "Archived", badge: 30 },
 *   ]}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 * />
 * ```
 *
 * @example Vertical sidebar tabs with icons
 * ```tsx
 * <Tab
 *   variant="vertical"
 *   items={[
 *     { key: "profile", label: "Profile", icon: <UserIcon /> },
 *     { key: "security", label: "Security", icon: <LockIcon /> },
 *   ]}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 * />
 * ```
 *
 * @see {@link Pagination} — For navigating data pages.
 * @see {@link Breadcrumb} — For hierarchical navigation.
 * @see {@link ButtonsGroup} — For mode/filter toggles.
 * @kgId c3b7dc43c8ba
 */
export default function Tab({
  items,
  activeTab,
  onTabChange,
  variant = "default",
  className = "",
  itemClassName = "",
}: TabProps) {
  // ═══════════════════════════════════════════════════════════════════════════
  // INDICADOR DESLIZANTE (solo variante "underline")
  // ═══════════════════════════════════════════════════════════════════════════
  // El subrayado del tab activo deja de ser un `border-b-2` del propio botón
  // (que aparecía y desaparecía de golpe al cambiar de pestaña) y pasa a ser un
  // elemento aparte que se DESPLAZA hasta el botón activo. Para eso hay que medir
  // el botón: no existe ninguna clase de Tailwind que exprese "ponte donde está
  // el hermano activo", así que la posición se calcula en un efecto de layout
  // (antes del pintado, para que no se vea un fotograma en la posición anterior).
  //
  // Las otras dos variantes NO lo llevan, y es deliberado:
  // · "default" y "vertical" marcan el activo con un FONDO en el propio botón.
  //   Deslizarlo obligaría a extraer ese fondo a un elemento posicionado y a
  //   reescribir el estilo de las tres variantes para que el botón activo
  //   dejase de pintarse a sí mismo.
  // · Ninguna de las dos tiene hoy un solo consumidor (la única pantalla que usa
  //   `Tab` es `EquipoPage`, con `variant="underline"`). Sería código que nadie
  //   ejecuta y que nadie puede verificar.
  const navRef = useRef<HTMLElement | null>(null);
  const [indicador, setIndicador] = useState<{ x: number; w: number } | null>(null);
  // Proyección ESTABLE de `items`: una cadena que solo cambia si cambian las claves
  // o su orden. Es lo que puede usarse como dependencia sin provocar un bucle.
  const claves = items.map((i) => i.key).join("|");

  useLayoutEffect(() => {
    if (variant !== "underline") return;

    const medir = () => {
      // Se consulta el DOM vivo en lugar de guardar refs por índice: así la medida
      // nunca queda obsoleta si el consumidor reordena o sustituye `items`.
      const activo = navRef.current?.querySelector<HTMLElement>('[data-activo="true"]');
      if (!activo) {
        setIndicador(null);
        return;
      }
      const x = activo.offsetLeft;
      const w = activo.offsetWidth;
      // Devolver `prev` cuando la medida no ha cambiado evita un render de más. Es
      // también lo que hace imposible un bucle: los consumidores pasan `items` como
      // literal (`items={[{…},{…}]}`), así que su identidad cambia en cada render.
      setIndicador((prev) => (prev && prev.x === x && prev.w === w ? prev : { x, w }));
    };

    medir();

    // Re-medir cuando cambie el tamaño de un botón: al cargar la tipografía, al
    // cambiar el ancho de la ventana, o al cambiar el número de un `badge` (que
    // ensancha su pestaña). Sin esto el subrayado quedaría desalineado.
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(medir);
    navRef.current?.querySelectorAll("button").forEach((b) => ro.observe(b));
    return () => ro.disconnect();
    // `items` se omite a propósito (ver arriba): es un literal nuevo en cada render.
    // Lo que de verdad importa de él —qué pestañas hay y en qué orden— está en `claves`.
  }, [variant, activeTab, claves]);

  if (variant === "vertical") {
    return (
      <div className="overflow-x-auto pb-2 sm:w-[200px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-100 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-track]:bg-white dark:[&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-1.5">
        <nav className={cn("flex flex-row w-full sm:flex-col sm:space-y-2", className)}>
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ease-in-out sm:p-3",
                activeTab === item.key
                  ? "text-brand-500 dark:bg-brand-400/20 dark:text-brand-400 bg-brand-50"
                  : "bg-transparent text-gray-500 border-transparent hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                itemClassName
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    );
  }

  if (variant === "underline") {
    return (
      <div className="border-b border-gray-200/70 dark:border-white/5">
        <nav
          ref={navRef}
          className={cn(
            // `relative` es el contexto de posicionamiento del indicador.
            "relative -mb-px flex space-x-2 overflow-x-auto [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 dark:[&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-1.5",
            className
          )}
        >
          {items.map((item) => (
            <button
              key={item.key}
              data-activo={activeTab === item.key ? "true" : undefined}
              onClick={() => onTabChange(item.key)}
              className={cn(
                // El borde inferior se mantiene TRANSPARENTE en todos los botones: ya no
                // es el marcador, solo reserva los 2 px de alto para que al cambiar de
                // pestaña nada salte de sitio. El marcador lo dibuja el indicador.
                "inline-flex items-center gap-2 border-b-2 border-transparent px-2.5 py-2 text-sm font-medium transition-colors duration-200 ease-in-out",
                activeTab === item.key
                  ? "text-brand-500 dark:text-brand-400"
                  : "bg-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                itemClassName
              )}
            >
              {item.icon}
              {item.label}
              {item.badge !== undefined && (
                <span className="inline-block items-center justify-center rounded-full bg-brand-50 px-2 py-0.5 text-center text-xs font-medium text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          {/* Marcador deslizante. `h-0.5` = 2 px, exactamente el alto del `border-b-2`
              que antes llevaba el botón, y `bottom-0` cae sobre esa misma línea.
              No se pinta hasta tener medida: sin medición preferimos ningún subrayado
              antes que uno mal colocado. */}
          {indicador && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-brand-500 transition-transform duration-200 ease-out motion-reduce:transition-none dark:bg-brand-400"
              style={{
                width: `${indicador.w}px`,
                transform: `translateX(${indicador.x}px)`,
              }}
            />
          )}
        </nav>
      </div>
    );
  }

  // variant === "default" (pill/rounded)
  const hasGridLayout = className.includes("grid");
  return (
    <nav
      className={cn(
        `${hasGridLayout ? "" : "flex "}overflow-x-auto rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-white dark:[&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600`,
        className
      )}
    >
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onTabChange(item.key)}
          className={cn(
            "text-theme-sm inline-flex items-center gap-2 rounded-md px-4 py-2 font-medium transition-colors duration-200 ease-in-out whitespace-nowrap",
            activeTab === item.key
              ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
              : "bg-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
            itemClassName
          )}
        >
          {item.label}
          {item.icon}
        </button>
      ))}
    </nav>
  );
}
