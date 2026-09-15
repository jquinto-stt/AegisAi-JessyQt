/**
 * Pedidos — Barra de filtros operativos.
 * =======================================
 *
 * Los tres filtros que toda pantalla de trabajo necesita, en una sola fila:
 *
 *   1. **Fase** — en qué punto del trabajo está la orden (sub-filtro de la
 *      pantalla, con conteo por opción).
 *   2. **Canal de origen** (§18) — de dónde entró.
 *   3. **Modalidad** (§8) — recogida, envío, en sitio o servicio.
 *
 * más **búsqueda instantánea** por número de orden o identificador.
 *
 * ── Por qué la fase lleva conteo ────────────────────────────────────────────
 *
 * ⚠️ Sin el número, aplicar un filtro es a ciegas: el operador ve la lista
 * encogerse sin saber si quedan 3 o 30 detrás. Y —peor— cuando una orden sale de
 * un grupo por avanzar de estado, el movimiento es **invisible**: parece que se
 * perdió. El conteo es lo que hace que el paso de una orden de "Por validar" a
 * "Confirmadas" se lea en la propia barra.
 *
 * ── Sobre los controles del catálogo ────────────────────────────────────────
 *
 * `SegmentedControl` (fase), `Select` (canal y modalidad) y `SearchInput`
 * (búsqueda) son las piezas del sistema para estas tres tareas. El conteo se
 * inyecta **dentro del rótulo** de cada segmento, porque `SegmentOption.label`
 * acepta `ReactNode`; es la vía para enriquecer el componente del catálogo sin
 * reimplementarlo.
 *
 * ⚠️ `Select` del catálogo es **no controlado** (guarda su valor en estado
 * interno, inicializado desde `defaultValue`). Para poder reiniciar los filtros
 * desde fuera, la barra recibe un `resetToken`: al cambiar, los `Select` se
 * remontan y vuelven a su valor por defecto. Es la única forma de resetear un
 * control no controlado sin reescribirlo.
 */

import { SlidersHorizontal, X } from "lucide-react";

import { SearchInput, SegmentedControl, Select } from "@/elements";
import type { SegmentOption, SelectOption } from "@/elements";

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
  return (
    <div
      data-orders-filters
      className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3.5 dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Fase del trabajo. `tone="panel"` porque vive sobre una tarjeta blanca:
            el look "contrast" del control está pensado para fondos grises. */}
        <SegmentedControl
          options={phaseOptions}
          value={phase}
          onValueChange={onPhaseChange}
          tone="panel"
          intent="orders.filters.phase"
        />

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* ⚠️ El `key` con el `resetToken` es lo que hace reiniciables estos dos
              `Select`: son no controlados, así que remontarlos es la única forma
              de devolverlos a "Todos" desde el botón de limpiar. */}
          <Select
            key={`channel-${resetToken}`}
            options={channelOptions}
            defaultValue={channel}
            onChange={onChannelChange}
            aria-label="Filtrar por canal de origen"
            className="h-9 w-auto min-w-[10.5rem] py-0 text-theme-xs"
          />
          <Select
            key={`mode-${resetToken}`}
            options={modeOptions}
            defaultValue={mode}
            onChange={onModeChange}
            aria-label="Filtrar por modalidad de entrega"
            className="h-9 w-auto min-w-[10.5rem] py-0 text-theme-xs"
          />
          <SearchInput
            value={query}
            onChange={event => onQueryChange(event.target.value)}
            onClear={onClearQuery}
            placeholder="Buscar por número, solicitante o ítem"
            aria-label="Buscar órdenes"
            className="w-full sm:w-72"
          />
        </div>
      </div>

      {/* Resultado + limpiar. La cuenta va **siempre**, no sólo al filtrar: es la
          cifra que confirma que el filtro hizo lo que el operador esperaba. */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2.5 dark:border-gray-800">
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
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
            {isFiltered ? <SlidersHorizontal className="h-3 w-3" aria-hidden /> : null}
            Limpiar filtros
            <X className="h-3 w-3" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

export default OrdersFilterBar;
