/**
 * Pedidos — Barra de filtros operativos.
 * =======================================
 *
 * Dos filas, y cada una con un trabajo distinto:
 *
 *   1. **La barra de trabajo** — buscar, filtrar, contar y limpiar, todo en la
 *      misma línea. La búsqueda va siempre a la vista porque es la forma más
 *      directa de llegar a una orden concreta; los filtros **secundarios** (canal
 *      de origen §18 y modalidad §8) viven detrás de un botón que abre un panel,
 *      porque no se usan en cada consulta y ocupaban la pantalla de forma
 *      permanente.
 *   2. **La fase del trabajo** — el eje primario de la pantalla, en su propia
 *      línea y **siempre visible**. Aquí no se colapsa nada: es lo que responde
 *      "¿qué estoy mirando?", y esconderlo obligaría a abrir un panel para saber
 *      en qué pantalla estás.
 *
 * ── Por qué los filtros se pliegan y la fase no ─────────────────────────────
 *
 * ⚠️ Una barra de filtros permanente ocupa la franja más valiosa de la pantalla
 * con controles que se tocan una vez cada veinte consultas. Pero "plegar los
 * filtros" no puede significar plegarlos todos: la fase no es un filtro más, es
 * la identidad de la pantalla —"Por validar" y "Confirmadas" son dos trabajos
 * distintos, no dos recortes del mismo—. Por eso el eje que se pliega es el de los
 * atributos de la orden, y el eje del flujo se queda a la vista.
 *
 * ── Por qué la fase lleva conteo ────────────────────────────────────────────
 *
 * ⚠️ Sin el número, aplicar un filtro es a ciegas: el operador ve la lista
 * encogerse sin saber si quedan 3 o 30 detrás. Y —peor— cuando una orden sale de
 * un grupo por avanzar de estado, el movimiento es **invisible**: parece que se
 * perdió. El conteo es lo que hace que el paso de una orden de "Por validar" a
 * "Confirmadas" se lea en la propia barra.
 *
 * ── Por qué los filtros activos se anuncian con fichas ──────────────────────
 *
 * ⚠️ Plegar un filtro sin decir que está puesto es la peor versión de un filtro:
 * la lista sale recortada y nada en pantalla explica por qué. Por eso cada filtro
 * activo se nombra junto al botón, en una ficha que además lo quita de un clic. El
 * número del botón cuenta **sólo los filtros plegados** —los que el operador no
 * puede ver—, que es la información que de verdad falta.
 *
 * ── Sobre los controles del catálogo ────────────────────────────────────────
 *
 * `Popover` (panel de filtros), `SegmentedControl` (fase), `Select` (canal y
 * modalidad), `SearchInput` (búsqueda) y `Badge` (fichas) son las piezas del
 * sistema para estas tareas; no hay ninguna reimplementación local. El conteo se
 * inyecta **dentro del rótulo** de cada segmento, porque `SegmentOption.label`
 * acepta `ReactNode`: es la vía para enriquecer el componente del catálogo sin
 * reescribirlo.
 *
 * ⚠️ `Select` del catálogo es **no controlado** (guarda su valor en estado
 * interno, inicializado desde `defaultValue`). Para poder reiniciar los filtros
 * desde fuera, la barra recibe un `resetToken`: al cambiar, los `Select` se
 * remontan y vuelven a su valor por defecto. Es la única forma de resetear un
 * control no controlado sin reescribirlo.
 *
 * ── Contrato con la guarda ─────────────────────────────────────────────────
 *
 * ⚠️ Tres cosas de esta pieza están fijadas por `scripts/verify-orders-module.mjs`
 * y no se pueden mover sin actualizarla:
 *
 *   · El contenedor `[data-orders-filters]` existe y su **primer `<p>`** dice
 *     "N órdenes en bandeja" (la cifra que confirma que el filtro hizo lo que se
 *     esperaba). Por eso el contenido del panel emergente no usa `<p>`.
 *   · Los segmentos de fase siguen **montados** con `[data-order-filter]` y
 *     `[data-order-filter-count]` aunque el panel de filtros esté cerrado.
 *   · La búsqueda conserva su `data-node-id` (`necto.el.search.input`).
 */

import { useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";

import { Badge, Popover, SearchInput, SegmentedControl, Select } from "@/elements";
import type { SegmentOption, SelectOption } from "@/elements";
import { cn } from "@/utils";
import { FILTER_ALL } from "../operational/order-operations";

/** Un filtro activo, ya resuelto para pintarse como ficha. */
interface ActiveFilterChip {
  key: "channel" | "mode";
  /** Qué se filtró: "Canal", "Entrega". */
  label: string;
  /** Con qué: "WhatsApp", "Envío con transporte". */
  value: string;
  onRemove: () => void;
}

export interface OrdersFilterBarProps<Phase extends string = string> {
  /** Sub-filtro de fase de la pantalla. */
  phaseOptions: SegmentOption<Phase>[];
  phase: Phase;
  onPhaseChange: (phase: Phase) => void;

  /** Canal de origen (§18). Siempre incluye una opción "all". */
  channelOptions: SelectOption[];
  channel: string;
  onChannelChange: (channel: string) => void;

  /** Modalidad de entrega (§8). Siempre incluye una opción "all". */
  modeOptions: SelectOption[];
  mode: string;
  onModeChange: (mode: string) => void;

  /** Búsqueda instantánea por número, solicitante o ítem. */
  query: string;
  onQueryChange: (query: string) => void;
  onClearQuery: () => void;

  /** Cuántas órdenes quedaron tras aplicar todos los filtros. */
  resultCount: number;
  /** Rótulo de lo contado: "órdenes en bandeja", "órdenes programadas"… */
  resultLabel: string;

  /** ¿Hay algún filtro activo aparte de la fase por defecto? */
  isFiltered: boolean;
  onReset: () => void;
  /** Cambia para remontar los `Select` y devolverlos a su valor por defecto. */
  resetToken: number;
}

/** El rótulo visible de un valor de filtro, buscado en sus propias opciones. */
function labelOfValue(options: SelectOption[], value: string): string {
  return options.find(option => option.value === value)?.label ?? value;
}

export function OrdersFilterBar<Phase extends string = string>({
  phaseOptions,
  phase,
  onPhaseChange,
  channelOptions,
  channel,
  onChannelChange,
  modeOptions,
  mode,
  onModeChange,
  query,
  onQueryChange,
  onClearQuery,
  resultCount,
  resultLabel,
  isFiltered,
  onReset,
  resetToken,
}: OrdersFilterBarProps<Phase>) {
  // ⚠️ El `Popover` del catálogo **no tiene modo controlado**: su apertura es
  // estado interno. `onOpenChange` es la única lectura disponible, y se usa aquí
  // sólo para girar el chevron y publicar `aria-expanded` — la apertura la sigue
  // gobernando el componente.
  const [filtersOpen, setFiltersOpen] = useState(false);

  /**
   * Los filtros plegados que están puestos.
   *
   * ⚠️ La fase no entra aquí aunque esté activa: no está plegada, se ve en su
   * propia línea. Contarla inflaría el número del botón con un filtro que el
   * operador ya tiene delante, y el número dejaría de significar "esto no lo ves".
   */
  const activeChips: ActiveFilterChip[] = [];
  if (channel !== FILTER_ALL) {
    activeChips.push({
      key: "channel",
      label: "Canal",
      value: labelOfValue(channelOptions, channel),
      onRemove: () => onChannelChange(FILTER_ALL),
    });
  }
  if (mode !== FILTER_ALL) {
    activeChips.push({
      key: "mode",
      label: "Entrega",
      value: labelOfValue(modeOptions, mode),
      onRemove: () => onModeChange(FILTER_ALL),
    });
  }

  return (
    <div data-orders-filters className="flex flex-col gap-3">
      {/* ── 1. La barra de trabajo ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={event => onQueryChange(event.target.value)}
          onClear={onClearQuery}
          placeholder="Buscar por número, solicitante o ítem"
          aria-label="Buscar órdenes"
          className="w-full sm:w-72"
        />

        <Popover
          position="bottom"
          onOpenChange={setFiltersOpen}
          trigger={
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={filtersOpen}
              data-intent="orders.filters.open"
              className={cn(
                "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-theme-xs font-semibold transition-colors",
                activeChips.length > 0
                  ? "border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-400"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:text-white"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              Filtros
              {/* ⚠️ El número sólo aparece si hay algo plegado que no se ve. Un
                  "Filtros 0" permanente sería un contador que nunca cuenta nada. */}
              {activeChips.length > 0 && (
                <span
                  data-orders-filter-badge={activeChips.length}
                  className="rounded-full bg-brand-500 px-1.5 text-[10px] font-bold tabular-nums text-white"
                >
                  {activeChips.length}
                </span>
              )}
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform", filtersOpen && "rotate-180")}
                aria-hidden
              />
            </button>
          }
        >
          {/*
           * ⚠️ Sin `<p>` dentro del panel: la guarda lee el **primer** `<p>` del
           * contenedor de filtros como la cifra de resultados, y un párrafo aquí
           * —con el panel abierto— se colaría en su lugar.
           */}
          <div className="flex flex-col gap-3.5 p-4">
            <span className="text-theme-xs font-semibold text-gray-800 dark:text-white/90">
              Acotar la lista
            </span>

            <label className="flex flex-col gap-1.5">
              <span className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                Canal de origen
              </span>
              {/* ⚠️ El `key` con el `resetToken` es lo que hace reiniciables estos
                  dos `Select`: son no controlados, así que remontarlos es la única
                  forma de devolverlos a "Todos" desde el botón de limpiar. */}
              <Select
                key={`channel-${resetToken}`}
                options={channelOptions}
                defaultValue={channel}
                onChange={onChannelChange}
                aria-label="Filtrar por canal de origen"
                className="h-9 w-full py-0 text-theme-xs"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                Modalidad de entrega
              </span>
              <Select
                key={`mode-${resetToken}`}
                options={modeOptions}
                defaultValue={mode}
                onChange={onModeChange}
                aria-label="Filtrar por modalidad de entrega"
                className="h-9 w-full py-0 text-theme-xs"
              />
            </label>
          </div>
        </Popover>

        {/* ── Los filtros puestos, dichos en voz alta ──────────────────────── */}
        {activeChips.length > 0 && (
          <ul className="flex flex-wrap items-center gap-1.5">
            {activeChips.map(chip => (
              <li key={chip.key}>
                <button
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={`Quitar el filtro ${chip.label}: ${chip.value}`}
                  data-intent={`orders.filters.chip.${chip.key}`}
                  className="cursor-pointer"
                >
                  <Badge color="light" size="sm" endIcon={<X className="h-3 w-3" aria-hidden />}>
                    {chip.label}: {chip.value}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* La cuenta va **siempre**, no sólo al filtrar: es la cifra que confirma
            que el filtro hizo lo que el operador esperaba. */}
        <p className="ml-auto whitespace-nowrap text-theme-xs text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-700 dark:text-gray-200">{resultCount}</span>{" "}
          {resultLabel}
        </p>

        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            data-intent="orders.filters.reset"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-theme-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            Limpiar
            <X className="h-3 w-3" aria-hidden />
          </button>
        )}
      </div>

      {/* ── 2. La fase: el eje de la pantalla, siempre a la vista ──────────── */}
      {/*
       * ⚠️ Nunca dentro del panel emergente. Además de ser el eje que responde
       * "¿qué estoy mirando?", sus segmentos llevan el conteo por fase y una
       * guarda los lee del DOM: si se plegaran, la pantalla dejaría de poder
       * comprobarse —y, sobre todo, el operador tendría que abrir un panel para
       * saber dónde está—.
       */}
      <SegmentedControl
        options={phaseOptions}
        value={phase}
        onValueChange={onPhaseChange}
        tone="panel"
        intent="orders.filters.phase"
        className="max-w-full overflow-x-auto"
      />
    </div>
  );
}

export default OrdersFilterBar;
