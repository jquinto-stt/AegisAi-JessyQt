/**
 * Pedidos — Dominio de órdenes (estado, transiciones, historial).
 * ==============================================================
 *
 * Este módulo posee **el ciclo de vida de la orden** (§1). Nada más.
 *
 * ── Qué NO hace este archivo, a propósito ────────────────────────────────────
 *
 *   · No administra catálogo ni productos      → `productRef` en el ítem
 *   · No administra inventario ni existencias  → §19: no hay stock aquí
 *   · No administra clientes como dominio      → `OrderRequester` de esta orden
 *   · No administra canales ni WhatsApp        → `OrderSource` normalizado (§18)
 *   · No administra la tienda                  → `businessId` como referencia (§2)
 *   · No implementa IA conversacional          → §21
 *   · No implementa pagos como módulo          → estado del pago de la orden (§14)
 *
 * Cada uno de esos límites es deliberado: si una capacidad se metiera aquí "para
 * terminar la tarea", el módulo dejaría de ser reemplazable y pasaría a ser el
 * "god module" que §29 prohíbe.
 *
 * ── Alcance de persistencia ─────────────────────────────────────────────────
 *
 * Se guarda en `localStorage` bajo `necto_orders_v1`, **con el `businessId` dentro
 * de cada orden**. Antes el almacén era una lista plana: dos tiendas veían las
 * mismas órdenes. Con el id dentro, cada sede lee las suyas y el registro podría
 * vivir fuera de este navegador (igual criterio que `ChannelConnection.businessId`).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import type {
  Order,
  OrderActor,
  OrderStatus,
  OrderStatusHistoryEntry,
} from "@/contracts/order.contract";
import { isOrderOpen } from "@/contracts/order.contract";
import { eventBus } from "@/infrastructure/eventBus";
import { canTransition, SYSTEM_ACTOR } from "../order-status.constants";
import { buildDemoOrders, shouldSeedDemoOrders } from "../mock-orders";

const STORAGE_KEY = "necto_orders_v1";

/* ── Contrato del contexto ─────────────────────────────────────────────────── */

export interface OrdersContextValue {
  /** Órdenes de la tienda activa, más recientes primero. */
  orders: Order[];
  /** ¿Hay órdenes cargadas para esta sede? (evita el parpadeo del vacío). */
  isLoading: boolean;
  /**
   * Ejecuta una transición de estado.
   *
   * ⚠️ Es la **única** vía de escritura del estado de una orden. Valida contra la
   * máquina de estados (`canTransition`, que además filtra por modalidad) y
   * registra la entrada de historial. Ninguna pantalla asigna `status` a mano.
   *
   * Devuelve `false` si la transición no era válida o la orden no existe: el
   * llamador puede informar sin asumir éxito.
   */
  transitionOrder: (
    orderId: string,
    to: OrderStatus,
    options?: { reason?: string; actor?: OrderActor; metadata?: OrderStatusHistoryEntry["metadata"] }
  ) => boolean;
  /** Una orden por id (para el detalle). */
  orderById: (orderId: string) => Order | undefined;
}

const OrdersContext = createContext<OrdersContextValue | undefined>(undefined);

/* ── Persistencia ──────────────────────────────────────────────────────────── */

/**
 * Lee el almacén y lo filtra por sede.
 *
 * ⚠️ El filtro va **aquí** y no en el consumidor: si cada pantalla filtrara, una
 * que lo olvidara mostraría órdenes de otra sede. La colección que expone el
 * contexto ya es la de la tienda activa.
 */
function loadOrders(businessId: string): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Order[])
      .filter(o => o && typeof o === "object" && o.businessId === businessId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch (e) {
    console.warn("Error reading orders from storage", e);
    return [];
  }
}

/** Escribe **todas** las órdenes conocidas, preservando las de otras sedes. */
function persistOrders(all: Order[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn("Error writing orders to storage", e);
  }
}

function readAllOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Order[]) : [];
  } catch {
    return [];
  }
}

/* ── Provider ──────────────────────────────────────────────────────────────── */

export interface OrdersProviderProps {
  /**
   * Sede activa. `null` cuando la cuenta aún no tiene ninguna: sin tienda no hay
   * órdenes que mostrar (§2 — Pedidos pertenece a una tienda existente).
   */
  businessId: string | null;
  children: ReactNode;
}

export function OrdersProvider({ businessId, children }: OrdersProviderProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Espejo síncrono de `orders`.
   *
   * ⚠️ Existe porque `transitionOrder` **devuelve un booleano**, y un valor de
   * retorno no puede depender de que React decida invocar un actualizador de
   * estado. El espejo da a la transición una lectura determinista del estado
   * actual y, además, hace que dos transiciones encadenadas en el mismo tick se
   * vean la una a la otra (el estado de React no se ha vuelto a renderizar entre
   * ambas).
   *
   * Se mantiene en dos puntos: aquí, al recargar la sede, y dentro de
   * `transitionOrder`, inmediatamente después de calcular la orden nueva.
   */
  const ordersRef = useRef<Order[]>([]);

  // Cualquier otro camino que cambie `orders` (hoy: la recarga por sede) queda
  // reflejado sin tener que acordarse de escribir el espejo a mano en cada sitio.
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // Al cambiar de sede se recarga el subconjunto de esa tienda. Depender de
  // `businessId` (y no cargar una vez) es lo que impide que al cambiar de sede se
  // sigan viendo las órdenes de la anterior.
  useEffect(() => {
    if (!businessId) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const loaded = loadOrders(businessId);

    // La demostración se siembra **sólo** si esta sede no tiene ninguna orden, y
    // sólo entonces se escribe: una tienda con órdenes reales nunca las recibe
    // encima. `shouldSeedDemoOrders` es el predicado, no un `length === 0` suelto,
    // para que la regla viva en un solo sitio.
    if (shouldSeedDemoOrders(loaded)) {
      const seeded = buildDemoOrders(businessId);
      persistOrders(mergeWithOtherStores(seeded, businessId));
      setOrders(seeded.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
    } else {
      setOrders(loaded);
    }

    setIsLoading(false);
  }, [businessId]);

  /**
   * Publica el hecho en el bus (§23).
   *
   * ⚠️ Pedidos **emite**; no ejecuta efectos de terceros (§6). Este `publish` es
   * toda la integración que Pedidos conoce: no hay llamadas a inventario, ni a
   * canales, ni a IA.
   */
  const publishLifecycle = useCallback(
    (
      order: Order,
      status: OrderStatus,
      previousStatus: OrderStatus,
      reason?: string,
      metadata?: OrderStatusHistoryEntry["metadata"]
    ) => {
      const nameByStatus: Record<string, string> = {
        CONFIRMED: "order.confirmed",
        IN_PREPARATION: "order.preparation_started",
        READY: "order.ready",
        IN_TRANSIT: "order.shipped",
        DELIVERED: "order.delivered",
        COMPLETED: "order.completed",
        CANCELLED: "order.cancelled",
        RETURNED: "order.returned",
      };

      eventBus.publish("pedidos.order.lifecycle", {
        name: (nameByStatus[status] ?? "order.status_changed") as any,
        orderId: order.id,
        orderNumber: order.number,
        businessId: order.businessId,
        status,
        previousStatus,
        at: new Date().toISOString(),
        reason,
        metadata,
      });
    },
    []
  );

  const transitionOrder = useCallback<OrdersContextValue["transitionOrder"]>(
    (orderId, to, options) => {
      /**
       * ⚠️ La transición se **calcula aquí**, fuera del actualizador de estado.
       *
       * Antes el valor de retorno se asignaba *dentro* de `setOrders(prev => …)`, y
       * eso es un canal lateral que React no promete: el actualizador no tiene por
       * qué invocarse de forma síncrona. Con la cola de render limpia sí lo hacía
       * —la evaluación anticipada de React— así que todo *parecía* funcionar; pero
       * en cuanto había **otra** actualización en vuelo, la evaluación anticipada se
       * omitía, el actualizador corría sólo durante el render y esta función
       * devolvía `false` con la orden **ya movida**.
       *
       * El efecto medido: dos movimientos encadenados (`IN_TRANSIT → DELIVERED →
       * COMPLETED`) y la franja de confirmación anunciaba únicamente el primero.
       * Reaparecía, palabra por palabra, el defecto que esa franja existe para
       * corregir: la orden se movía y la pantalla no lo decía.
       *
       * Leyendo el espejo `ordersRef` el resultado es determinista y, además, dos
       * transiciones seguidas en el mismo tick se ven la una a la otra.
       */
      const current = ordersRef.current;
      const index = current.findIndex(o => o.id === orderId);
      if (index === -1) return false;

      const order = current[index];

      // ⚠️ Validación **única**: `canTransition` mira el mapa de estados *y* la
      // modalidad de entrega. Una recogida no puede saltar a `IN_TRANSIT`
      // aunque el mapa lo permita, porque esa orden no tiene transporte (§8).
      if (!canTransition(order, to)) return false;

      const at = new Date().toISOString();
      const actor = options?.actor ?? SYSTEM_ACTOR;

      const entry: OrderStatusHistoryEntry = {
        id: `hist_${order.id}_${Date.parse(at)}_${Math.random().toString(36).slice(2, 7)}`,
        from: order.status,
        to,
        at,
        actor,
        reason: options?.reason,
        metadata: options?.metadata,
      };

      const updated: Order = {
        ...order,
        status: to,
        updatedAt: at,
        // El historial es **parte del dominio** (§10): se añade en el mismo
        // paso que el cambio de estado, para que no puedan divergir.
        history: [...order.history, entry],
      };

      const next = current.slice();
      next[index] = updated;

      // ⚠️ El espejo se actualiza **antes** de despachar el estado: si el llamador
      // encadena otra transición en el mismo tick, debe partir del estado nuevo.
      ordersRef.current = next;
      setOrders(next);

      persistOrders(mergeWithOtherStores(next, businessId));

      // El hecho se publica aquí, ya validada la transición.
      publishLifecycle(order, to, order.status, options?.reason, options?.metadata);

      return true;
    },
    [businessId, publishLifecycle]
  );

  const orderById = useCallback(
    (orderId: string) => orders.find(o => o.id === orderId),
    [orders]
  );

  const value = useMemo<OrdersContextValue>(
    () => ({ orders, isLoading, transitionOrder, orderById }),
    [orders, isLoading, transitionOrder, orderById]
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

/**
 * Reescribe el almacén completo preservando las órdenes de **otras** sedes.
 *
 * ⚠️ Sin esto, guardar las órdenes de la tienda A borraría las de la tienda B:
 * el almacén es uno solo y el contexto expone un subconjunto filtrado. Es el
 * mismo cuidado que `upsertChannelConnection` tiene con las conexiones.
 */
function mergeWithOtherStores(currentStore: Order[], businessId: string | null): Order[] {
  const all = readAllOrders();
  const others = all.filter(o => o.businessId !== businessId);
  return [...others, ...currentStore];
}

export function useOrders(): OrdersContextValue {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error("useOrders must be used within an OrdersProvider");
  }
  return context;
}

/* ── Selectores derivados (§12, §13, §15, §16, §25) ───────────────────────── */

/** Órdenes abiertas (en operación), para la bandeja principal. */
export function openOrders(orders: readonly Order[]): Order[] {
  return orders.filter(isOrderOpen);
}

/** Órdenes programadas, ordenadas por cuándo deben ejecutarse (§15). */
export function scheduledOrders(orders: readonly Order[]): Order[] {
  return orders
    .filter(o => o.schedule !== undefined)
    .sort((a, b) => (a.schedule!.scheduledFor < b.schedule!.scheduledFor ? -1 : 1));
}

/** Órdenes inmediatas (no programadas). */
export function immediateOrders(orders: readonly Order[]): Order[] {
  return orders.filter(o => o.schedule === undefined);
}

/** Órdenes que requieren alistamiento/ejecución ahora (§16). */
export function ordersInPreparation(orders: readonly Order[]): Order[] {
  return orders.filter(o => o.status === "IN_PREPARATION");
}
