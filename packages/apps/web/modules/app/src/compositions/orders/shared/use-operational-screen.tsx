/**
 * Pedidos — Estado compartido de una pantalla operativa.
 * =======================================================
 *
 * Las cinco pantallas de trabajo (Bandeja, Alistamiento, Despacho, Programados e
 * Historial) hacen exactamente la misma secuencia: recortar el universo que les
 * toca, contar las fases, aplicar los filtros y calcular las métricas de su
 * cabecera. Este hook es esa secuencia, escrita **una vez**.
 *
 * ── Qué se comparte y qué no ────────────────────────────────────────────────
 *
 * ⚠️ Se comparte el **cableado**, no el diseño. Cada pantalla sigue declarando
 * sus propias fases, sus propias columnas y su propio cuerpo; lo que no declara
 * es cómo se conecta un `SegmentedControl` a un `Select` a una búsqueda. Sin
 * esto, la quinta pantalla acababa con el orden de los filtros cambiado y sin
 * limpiar la búsqueda al reiniciar — los defectos clásicos de la duplicación.
 *
 * ⚠️ **No decide qué estados mira cada pantalla.** El universo y las fases
 * entran por parámetro desde la vista, y las fases se definen con predicados
 * sobre `OrderStatus` ya declarados. Aquí no hay ni un estado literal: si
 * apareciera uno, sería una segunda máquina de estados escondida.
 *
 * ── Sobre el universo ──────────────────────────────────────────────────────
 *
 * ⚠️ `universe` debe ser una función **estable** (declarada en el módulo, no un
 * arrow en el `render`). Se pasa así —en vez de pasar el array ya recortado—
 * porque el recorte tiene que hacerse sobre las órdenes **vivas** del contexto:
 * al cerrar una orden desde el detalle, la lista se repinta sola porque el
 * universo se recalcula, y no porque la vista se acuerde de volver a filtrar.
 */

import { useCallback, useMemo } from "react";

import type { Order } from "@/contracts/order.contract";
import type { SegmentOption, SelectOption } from "@/elements";
import { useBusiness } from "@/context/BusinessContext";
import { useOrders } from "../context/OrdersContext";
import {
  MODE_FILTER_OPTIONS,
  applyOperationalFilters,
  channelFilterOptions,
  stagnantOrders,
} from "../operational/order-operations";
import { useFlowSettings } from "../operational/flow-settings";
import { formatMoney, formatSourceLabel } from "../order-presentation.utils";
import { useScreenFilters } from "./use-screen-filters";
import type { ScreenFiltersValue } from "./use-screen-filters";

/**
 * Una fase de trabajo: un sub-filtro de la pantalla y su predicado.
 *
 * ⚠️ El predicado recibe la `Order` entera y no una lista de estados: la fase de
 * "Espera larga" del triaje o la de "Por vencer" de Programados **no** son
 * conjuntos de estados —son juicios sobre el tiempo—, y forzarlas a expresarse
 * como `OrderStatus[]` habría obligado a inventar estados que el contrato no
 * tiene.
 */
export interface OperationalPhase<P extends string> {
  key: P;
  label: string;
  /** Qué órdenes caen en esta fase. */
  match: (order: Order) => boolean;
}

export interface UseOperationalScreenOptions<P extends string> {
  /**
   * Las fases de la pantalla, en el orden en que se muestran.
   *
   * ⚠️ Es una **función** de los umbrales configurados, no un array ya hecho, y
   * esa diferencia importa: dos pantallas tienen fases que son juicios sobre el
   * tiempo ("Espera larga" en el triaje, "Demoradas" en alistamiento). Si las
   * fases se declararan con el umbral por defecto escrito dentro, cambiar el
   * umbral en «Configuración del flujo» repintaría la cabecera pero **no** los
   * filtros, y la pestaña "Demoradas" seguiría contando con el número viejo.
   * Recibiéndolos, el umbral tiene un solo valor en toda la pantalla.
   *
   * ⚠️ Debe ser una función **estable** (declarada en el módulo, no un arrow en
   * el `render`).
   */
  buildPhases: (thresholds: {
    stagnationMinutes: number;
    inboxWaitMinutes: number;
  }) => readonly OperationalPhase<P>[];
  /**
   * Fase activa al entrar.
   *
   * ⚠️ Es también el punto por donde entra el **deep-link del Panel de Pedidos**:
   * cuando el operador pulsa «3 demoradas» en el panel, la vista destino recibe
   * esa fase como `defaultPhase` y aterriza ya filtrada. Sin esto la cifra sería
   * decorativa —contaría un problema y dejaría al operador buscarlo a mano—.
   */
  defaultPhase: P;
  /**
   * El subconjunto de órdenes que le toca mirar a la pantalla.
   *
   * ⚠️ Función estable: se declara en el módulo (p. ej. `inboxOrders`), no en
   * línea dentro del componente.
   */
  universe: (orders: readonly Order[]) => Order[];
  /** Rótulo de lo contado tras filtrar: "órdenes en bandeja", "cierre…". */
  resultLabel: string;
}

export interface OperationalScreenValue<P extends string> {
  /** El estado de filtros, tal cual lo consume `OrdersFilterBar`. */
  filters: ScreenFiltersValue<P>;
  /** Opciones de fase **con su conteo**, listas para el `SegmentedControl`. */
  phaseOptions: SegmentOption<P>[];
  channelOptions: SelectOption[];
  modeOptions: SelectOption[];
  /** Órdenes tras aplicar fase, canal, modalidad y búsqueda. */
  visible: Order[];
  /**
   * El universo de la pantalla, **antes** de filtrar.
   *
   * ⚠️ Se expone porque hay juicios que se hacen sobre el universo y no sobre lo
   * filtrado: la alerta de demora del triaje mide con `inboxWaitMinutes`, un
   * umbral distinto del de alistamiento, así que no puede salir de `stagnant`
   * —que usa el de demora— y necesita el universo para calcularse.
   */
  universe: Order[];
  /** Cuántas órdenes tiene la pantalla antes de filtrar. */
  universeCount: number;
  /** Cuántas hay en cada fase, por clave. */
  phaseCounts: Record<string, number>;
  /** Órdenes del universo que llevan demasiado tiempo sin moverse. */
  stagnant: Order[];
  /** El umbral de demora configurado, ya resuelto (§17). */
  stagnationMinutes: number;
  /** El umbral de espera en triaje, ya resuelto (§17). */
  inboxWaitMinutes: number;
  /**
   * ¿La operación debe señalar las órdenes demoradas? (§17)
   *
   * ⚠️ Se expone aquí y no se lee en cada vista porque `useFlowSettings` es la
   * fuente única de los ajustes del flujo: con cada vista leyéndolo por su cuenta,
   * un aviso nuevo tendría que acordarse de consultarlo, y el que se olvidara
   * seguiría avisando con el interruptor apagado.
   */
  alertOnStagnation: boolean;
  /** ¿La operación debe señalar las programadas vencidas? (§17) */
  alertOnScheduledOverdue: boolean;
  /** Importe en la moneda de la tienda activa. */
  formatMoneyFor: (amount: number) => string;
  resultLabel: string;
}

export function useOperationalScreen<P extends string>({
  buildPhases,
  defaultPhase,
  universe: selectUniverse,
  resultLabel,
}: UseOperationalScreenOptions<P>): OperationalScreenValue<P> {
  const { orders } = useOrders();
  const { activeBusiness } = useBusiness();
  const { settings } = useFlowSettings();
  const filters = useScreenFilters<P>(defaultPhase);

  const { stagnationMinutes, inboxWaitMinutes } = settings;
  const { alertOnStagnation, alertOnScheduledOverdue } = settings;

  const universe = useMemo(() => selectUniverse(orders), [orders, selectUniverse]);

  // Las fases se derivan de los umbrales **vivos**: cambiar el ritmo de trabajo en
  // «Configuración del flujo» reencuadra los filtros de esta pantalla a la vez que
  // sus métricas, sin recargar.
  const phases = useMemo(
    () => buildPhases({ stagnationMinutes, inboxWaitMinutes }),
    [buildPhases, stagnationMinutes, inboxWaitMinutes]
  );

  /**
   * ⚠️ La moneda se lee de la **tienda**, no de la orden (§5). Sin esto, la
   * cabecera de Historial mostraría un ticket promedio sin saber en qué moneda.
   */
  const formatMoneyFor = useCallback(
    (amount: number) => formatMoney(amount, activeBusiness?.currency ?? "COP"),
    [activeBusiness?.currency]
  );

  const phaseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const phase of phases) {
      counts[phase.key] = universe.filter(phase.match).length;
    }
    return counts;
  }, [phases, universe]);

  /**
   * Las fases, con su conteo inyectado en el **slot de badge** del control.
   *
   * ⚠️ El conteo va en el `badge` y no pegado al rótulo porque el `SegmentOption`
   * del catálogo declara ese hueco justo para esto, y así el número se pinta con
   * el lenguaje visual del control en vez de con un `<span>` suelto.
   *
   * ⚠️ `data-order-filter` y `data-order-filter-count` viajan en el propio
   * contador: el control del catálogo no reenvía props arbitrarias a sus botones,
   * así que el único sitio donde el conteo puede ser legible por una guarda es el
   * nodo que lo contiene. El ancla describe **el filtro**, no el control.
   */
  const phaseOptions = useMemo<SegmentOption<P>[]>(
    () =>
      phases.map(phase => {
        const count = phaseCounts[phase.key] ?? 0;
        return {
          value: phase.key,
          label: phase.label,
          badge: (
            <span
              data-order-filter={phase.key}
              data-order-filter-count={count}
              className="ml-0.5 rounded-full bg-black/10 px-1.5 text-[10px] font-bold tabular-nums dark:bg-white/15"
            >
              {count}
            </span>
          ),
        };
      }),
    [phases, phaseCounts]
  );

  const channelOptions = useMemo<SelectOption[]>(
    () => channelFilterOptions(orders, formatSourceLabel),
    [orders]
  );

  const visible = useMemo(() => {
    const activePhase = phases.find(phase => phase.key === filters.phase);
    const inPhase = activePhase ? universe.filter(activePhase.match) : universe;
    return applyOperationalFilters(inPhase, {
      channel: filters.channel,
      mode: filters.mode,
      query: filters.query,
    });
  }, [phases, universe, filters.phase, filters.channel, filters.mode, filters.query]);

  const stagnant = useMemo(
    () => stagnantOrders(universe, stagnationMinutes),
    [universe, stagnationMinutes]
  );

  return {
    filters,
    phaseOptions,
    channelOptions,
    modeOptions: MODE_FILTER_OPTIONS,
    visible,
    universe,
    universeCount: universe.length,
    phaseCounts,
    stagnant,
    stagnationMinutes,
    inboxWaitMinutes,
    alertOnStagnation,
    alertOnScheduledOverdue,
    formatMoneyFor,
    resultLabel,
  };
}
