/**
 * Pedidos — Estado de los filtros de una pantalla operativa.
 * ===========================================================
 *
 * Las cinco pantallas de trabajo comparten el mismo trío de filtros —fase, canal y
 * modalidad— más la búsqueda instantánea. Este hook guarda ese estado para que
 * ninguna vista tenga que repetir cuatro `useState` y un `reset` a mano (y, sobre
 * todo, para que la cuarta no se olvide de limpiar la búsqueda).
 *
 * ⚠️ **La fase es genérica a propósito.** Cada pantalla declara sus fases como una
 * unión `as const`, y el hook se tipa contra esa unión: escribir un filtro de fase
 * que la pantalla no tiene no compila. Un `string` suelto habría dejado pasar
 * `"pendientes"` en una pantalla donde la clave es `"pending"`, y el filtro
 * simplemente no habría filtrado nada —en silencio—.
 *
 * ⚠️ El `resetToken` existe por una limitación real del catálogo: el `Select` es
 * **no controlado** (guarda su valor en estado interno), así que la única forma de
 * devolverlo a "Todos" desde el botón de limpiar es remontarlo. El token es la
 * señal de remonte; la barra de filtros lo usa como `key`.
 */

import { useCallback, useMemo, useState } from "react";

import { FILTER_ALL } from "../operational/order-operations";

export interface ScreenFiltersValue<Phase extends string> {
  phase: Phase;
  channel: string;
  mode: string;
  query: string;
  /** Cambia cuando se limpian los filtros; alimenta el `key` de los `Select`. */
  resetToken: number;
  setPhase: (phase: Phase) => void;
  setChannel: (channel: string) => void;
  setMode: (mode: string) => void;
  setQuery: (query: string) => void;
  clearQuery: () => void;
  /** Devuelve todos los filtros a su valor por defecto. */
  reset: () => void;
  /** ¿Hay algún filtro activo aparte de la fase por defecto? */
  isFiltered: boolean;
}

export function useScreenFilters<Phase extends string>(
  defaultPhase: Phase
): ScreenFiltersValue<Phase> {
  const [phase, setPhase] = useState<Phase>(defaultPhase);
  const [channel, setChannel] = useState<string>(FILTER_ALL);
  const [mode, setMode] = useState<string>(FILTER_ALL);
  const [query, setQuery] = useState("");
  const [resetToken, setResetToken] = useState(0);

  const clearQuery = useCallback(() => setQuery(""), []);

  const reset = useCallback(() => {
    setPhase(defaultPhase);
    setChannel(FILTER_ALL);
    setMode(FILTER_ALL);
    setQuery("");
    // El token cambia para que los `Select` no controlados se remonten.
    setResetToken(token => token + 1);
  }, [defaultPhase]);

  const isFiltered = useMemo(
    () =>
      phase !== defaultPhase ||
      channel !== FILTER_ALL ||
      mode !== FILTER_ALL ||
      query.trim() !== "",
    [phase, defaultPhase, channel, mode, query]
  );

  return {
    phase,
    channel,
    mode,
    query,
    resetToken,
    setPhase,
    setChannel,
    setMode,
    setQuery,
    clearQuery,
    reset,
    isFiltered,
  };
}
