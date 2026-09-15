/**
 * Pedidos — Configuración del flujo (§17).
 * =========================================
 *
 * Los parámetros **propios de Pedidos**: umbrales de demora y avisos.
 *
 * ── Por qué esto sí vive en Pedidos y no en Ajustes de Sede (§17) ───────────
 *
 * El principio de §17 es literal:
 *
 *     Configuración global en Tienda. Configuración específica en el módulo.
 *
 * El umbral de demora no configura la tienda: configura **el ritmo de trabajo de
 * las órdenes**. Una ferretería con órdenes de 4 líneas y una empresa de
 * instalaciones con servicios de 3 días no comparten umbral, y la misma sede
 * puede cambiarlo sin tocar su identidad. Por eso vive aquí, con almacén propio.
 *
 * ── Por qué un provider y no un hook con `localStorage` suelto ─────────────
 *
 * ⚠️ El umbral lo leen **cuatro** pantallas (Bandeja, Alistamiento, Despacho y el
 * detalle) y lo escribe una (Configuración del flujo). Si cada una leyera el
 * almacén por su cuenta, cambiar el umbral no repintaría las demás hasta
 * recargar, y el operador vería "Demoradas: 3" en Alistamiento y "Demoradas: 1"
 * en la cabecera de al lado. Un solo estado compartido hace que el cambio sea
 * inmediato y consistente.
 *
 * ⚠️ **Nunca** guarda nada del dominio: ni estados, ni transiciones, ni motivos.
 * Sólo preferencias de lectura y aviso. Si un ajuste pudiera cambiar *qué
 * transiciones son válidas*, dejaría de ser configuración y sería una segunda
 * máquina de estados — justo lo que `order-status.constants.ts` prohíbe.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

/* ── Forma de los ajustes ──────────────────────────────────────────────────── */

export interface OrdersFlowSettings {
  /**
   * Minutos que una orden puede permanecer en un estado antes de marcarse
   * demorada. Alimenta `isStagnant` y el nivel `late` de la urgencia.
   */
  stagnationMinutes: number;
  /**
   * Minutos que una orden puede esperar en la bandeja de triaje sin moverse.
   *
   * ⚠️ Es un umbral **distinto** del de demora a propósito: en triaje la orden no
   * se está trabajando (nadie la ha validado), así que el tiempo razonable es
   * mucho menor que el de un alistamiento en curso.
   */
  inboxWaitMinutes: number;
  /** Avisar en pantalla cuando hay órdenes estancadas. */
  alertOnStagnation: boolean;
  /** Avisar cuando una orden programada pasó su hora comprometida (§15). */
  alertOnScheduledOverdue: boolean;
  /** Agrupar Programados por día en lugar de listarlas en una sola tabla (§15). */
  groupScheduledByDay: boolean;
}

export const DEFAULT_FLOW_SETTINGS: OrdersFlowSettings = {
  stagnationMinutes: 25,
  inboxWaitMinutes: 15,
  alertOnStagnation: true,
  alertOnScheduledOverdue: true,
  groupScheduledByDay: true,
};

/** Límites de los umbrales, en minutos. */
export const STAGNATION_BOUNDS = { min: 5, max: 240, step: 5 } as const;
export const INBOX_WAIT_BOUNDS = { min: 5, max: 120, step: 5 } as const;

/* ── Persistencia ──────────────────────────────────────────────────────────── */

const STORAGE_KEY = "necto_orders_flow_v1";

/**
 * Lee los ajustes de una sede.
 *
 * ⚠️ La clave se guarda **por sede**, igual que las órdenes y las conexiones de
 * canal: el ritmo de trabajo de una sucursal no es el de otra, y un único objeto
 * global haría que ajustar la demora en una cambiara la otra en silencio.
 */
function loadFlowSettings(businessId: string | null): OrdersFlowSettings {
  if (!businessId) return { ...DEFAULT_FLOW_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_FLOW_SETTINGS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_FLOW_SETTINGS };
    return { ...DEFAULT_FLOW_SETTINGS, ...(parsed[businessId] ?? {}) };
  } catch (e) {
    console.warn("Error reading orders flow settings", e);
    return { ...DEFAULT_FLOW_SETTINGS };
  }
}

function persistFlowSettings(businessId: string, settings: OrdersFlowSettings): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const all = parsed && typeof parsed === "object" ? parsed : {};
    // Se reescribe **sólo** la sede actual: preservar las demás es lo que impide
    // que ajustar una sucursal borre la configuración de las otras.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...all, [businessId]: settings }));
  } catch (e) {
    console.warn("Error writing orders flow settings", e);
  }
}

/** Recorta un umbral a su rango válido, para que un valor absurdo no rompa nada. */
function clampMinutes(value: number, bounds: { min: number; max: number }): number {
  if (!Number.isFinite(value)) return bounds.min;
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(value)));
}

/* ── Contexto ──────────────────────────────────────────────────────────────── */

export interface OrdersFlowSettingsValue {
  settings: OrdersFlowSettings;
  /**
   * Cambia un ajuste.
   *
   * ⚠️ Los umbrales se **recortan aquí**, no en el control que los edita: un
   * `input type="number"` acepta "0" o "99999" mientras se teclea, y validar en la
   * pantalla dejaría la puerta abierta a cualquier otro consumidor futuro. La
   * regla vive con el dato.
   */
  updateSetting: <K extends keyof OrdersFlowSettings>(
    key: K,
    value: OrdersFlowSettings[K]
  ) => void;
  /** Vuelve a los valores de fábrica de esta sede. */
  resetSettings: () => void;
}

const OrdersFlowSettingsContext = createContext<OrdersFlowSettingsValue | undefined>(undefined);

export interface OrdersFlowSettingsProviderProps {
  businessId: string | null;
  children: ReactNode;
}

export function OrdersFlowSettingsProvider({
  businessId,
  children,
}: OrdersFlowSettingsProviderProps) {
  const [settings, setSettings] = useState<OrdersFlowSettings>(() =>
    loadFlowSettings(businessId)
  );

  // Al cambiar de sede se relee: el ritmo de una sucursal no aplica a la otra.
  useEffect(() => {
    setSettings(loadFlowSettings(businessId));
  }, [businessId]);

  const updateSetting = useCallback<OrdersFlowSettingsValue["updateSetting"]>(
    (key, value) => {
      setSettings(prev => {
        let next: OrdersFlowSettings;

        if (key === "stagnationMinutes") {
          next = { ...prev, stagnationMinutes: clampMinutes(Number(value), STAGNATION_BOUNDS) };
        } else if (key === "inboxWaitMinutes") {
          next = { ...prev, inboxWaitMinutes: clampMinutes(Number(value), INBOX_WAIT_BOUNDS) };
        } else {
          next = { ...prev, [key]: value } as OrdersFlowSettings;
        }

        if (businessId) persistFlowSettings(businessId, next);
        return next;
      });
    },
    [businessId]
  );

  const resetSettings = useCallback(() => {
    const next = { ...DEFAULT_FLOW_SETTINGS };
    setSettings(next);
    if (businessId) persistFlowSettings(businessId, next);
  }, [businessId]);

  const value = useMemo<OrdersFlowSettingsValue>(
    () => ({ settings, updateSetting, resetSettings }),
    [settings, updateSetting, resetSettings]
  );

  return (
    <OrdersFlowSettingsContext.Provider value={value}>
      {children}
    </OrdersFlowSettingsContext.Provider>
  );
}

export function useFlowSettings(): OrdersFlowSettingsValue {
  const context = useContext(OrdersFlowSettingsContext);
  if (!context) {
    throw new Error("useFlowSettings must be used within an OrdersFlowSettingsProvider");
  }
  return context;
}
