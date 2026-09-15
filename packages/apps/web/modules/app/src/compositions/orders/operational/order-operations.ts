/**
 * Pedidos — Operación por pantalla (OMS).
 * ========================================
 *
 * Este archivo es la **capa operativa** del módulo: traduce el dominio (una orden
 * y su ciclo de vida) en lo que cada pantalla de la suite necesita saber.
 *
 * ── Qué es y qué no es ──────────────────────────────────────────────────────
 *
 * ⚠️ **No es una segunda máquina de estados.** Las transiciones válidas siguen
 * viviendo sólo en `order-status.constants.ts`; aquí no hay ni un mapa de
 * estados destino. Lo que sí vive aquí es lo que el dominio no tiene por qué
 * saber: qué subconjunto de estados mira cada pantalla, cuánto lleva una orden
 * sin moverse, y qué cifras de cabecera resumen esa fase.
 *
 * ⚠️ **No inventa estados.** Cada selector trabaja sobre `OrderStatus` ya
 * declarados. Si una pantalla necesitara un estado que no existe, el error está
 * en la pantalla, no en el contrato (§4).
 *
 * ── Por qué centralizado y no dentro de cada vista ─────────────────────────
 *
 * Cinco pantallas preguntan "¿qué está demorado?". Si cada una lo calculara con
 * su propio `Date.now()`, el mismo operador vería tres umbrales distintos según
 * dónde mirara, y "demorada" dejaría de significar una cosa. Aquí hay **una**
 * definición de cada concepto operativo, y las pantallas la consumen.
 */

import type { Order, OrderStatus } from "@/contracts/order.contract";
import { isOrderOpen, modeUsesTransit } from "@/contracts/order.contract";
import type { BadgeColor } from "@/elements";
import { minutesBetween, minutesSince } from "../order-presentation.utils";

/* ══════════════════════════════════════════════════════════════════════════
 * 1. Vocabulario de pantallas operativas
 * ════════════════════════════════════════════════════════════════════════ */

/**
 * Las pantallas de la suite que **operan** sobre órdenes.
 *
 * ⚠️ Quedan fuera `canales` y `configuracion` a propósito: no son pantallas de
 * trabajo sobre órdenes —una explica de dónde vienen, la otra cómo se comporta el
 * flujo— así que no llevan ni métricas de fase ni filtros operativos. Meterlas
 * aquí les daría una cabecera de métricas que no mide nada.
 */
export const OPERATIONAL_SCREENS = [
  "bandeja",
  "alistamiento",
  "despacho",
  "programados",
  "historial",
] as const;

export type OperationalScreen = (typeof OPERATIONAL_SCREENS)[number];

/* ══════════════════════════════════════════════════════════════════════════
 * 2. Tiempo y urgencia
 * ════════════════════════════════════════════════════════════════════════ */

/** Umbral de demora por defecto, en minutos. Configurable en «Configuración del flujo». */
export const DEFAULT_STAGNATION_MINUTES = 25;

/** Umbral de espera en triaje por defecto: una orden sin validar no debe envejecer. */
export const DEFAULT_INBOX_WAIT_MINUTES = 15;

/**
 * Cuánto lleva la orden **en su estado actual**.
 *
 * ⚠️ Se mide desde la última entrada del historial, no desde `updatedAt`: el
 * historial es parte del dominio (§10) y dice *cuándo entró al estado*, que es la
 * pregunta que la operación hace. `updatedAt` cambia por cualquier edición, así
 * que una nota añadida reiniciaría el contador de demora en silencio.
 */
export function minutesInCurrentState(order: Order): number {
  const lastEntry = order.history[order.history.length - 1];
  return minutesSince(lastEntry ? lastEntry.at : order.updatedAt);
}

/** Niveles de urgencia de una orden dentro de una fase. */
export type UrgencyLevel = "fresh" | "working" | "late";

/**
 * La urgencia se **deriva del umbral configurado**, no de constantes sueltas.
 *
 * ⚠️ Antes eran `10` y `25` escritos dentro de la vista de Preparación: el día
 * que la tienda necesitara otro ritmo, el número estaba en dos sitios y sólo uno
 * se cambiaría. Ahora el umbral entra por parámetro desde los ajustes del flujo.
 */
export function urgencyOf(minutes: number, thresholdMinutes: number): UrgencyLevel {
  if (minutes >= thresholdMinutes) return "late";
  if (minutes >= Math.round(thresholdMinutes * 0.4)) return "working";
  return "fresh";
}

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  fresh: "Recién iniciada",
  working: "En curso",
  late: "Demorada",
};

/**
 * La urgencia, traducida al color del `Badge` del catálogo.
 *
 * ⚠️ `working` corrige el modo oscuro: el `Badge` del catálogo pinta su variante
 * `warning` con `dark:text-orange-400`, que no es un token semántico del
 * proyecto. "En curso" es `warning-*` aquí, y el mismo tono no puede leerse con
 * dos vocabularios de color según la pantalla.
 */
export const URGENCY_TO_BADGE: Record<UrgencyLevel, { color: BadgeColor; className?: string }> = {
  fresh: { color: "light" },
  working: { color: "warning", className: "dark:text-warning-500" },
  late: { color: "error" },
};

/** ¿La orden lleva demasiado tiempo sin moverse? (§12) */
export function isStagnant(order: Order, thresholdMinutes: number): boolean {
  return isOrderOpen(order) && minutesInCurrentState(order) >= thresholdMinutes;
}

/** Las órdenes estancadas, de la más antigua a la más reciente. */
export function stagnantOrders(
  orders: readonly Order[],
  thresholdMinutes: number
): Order[] {
  return orders
    .filter(order => isStagnant(order, thresholdMinutes))
    .sort((a, b) => minutesInCurrentState(b) - minutesInCurrentState(a));
}

/* ── Recorrido: cuánto estuvo la orden en cada estado (§10) ────────────────── */

/**
 * Un tramo del recorrido: el estado al que entró la orden y cuánto duró.
 *
 * ⚠️ La duración es `null` en el **último** tramo, y no cero. Un `0` diría "estuvo
 * cero minutos aquí", que es una afirmación sobre el pasado; `null` dice "aquí
 * sigue", que es la verdad. La diferencia importa porque el tramo abierto es
 * justamente el que se mide con `minutesInCurrentState` y el umbral vivo, no con
 * el historial.
 */
export interface OrderStateVisit {
  /** El estado en el que estuvo (o en el que está, si es el último tramo). */
  status: OrderStatus;
  /** Cuándo entró en él. */
  enteredAt: string;
  /** Cuánto duró, en minutos. `null` si es el tramo abierto. */
  minutes: number | null;
}

/**
 * El recorrido de la orden, tramo a tramo, **del más antiguo al más reciente**.
 *
 * ⚠️ Se deriva de los **huecos** del historial, no de un campo de duración: el
 * contrato guarda *cuándo* ocurrió cada cambio (§10) y la duración es la resta
 * entre un cambio y el siguiente. Guardar la duración además de los instantes
 * sería un dato redundante que puede contradecir a los instantes.
 *
 * ⚠️ Es la pieza que hace que el visor de auditoría pueda responder "¿cuánto
 * estuvo en alistamiento?" — la pregunta forense que una lista de cambios con
 * fecha no contesta. Sin esto, el visor enseña *qué* pasó pero no *cuánto costó*
 * cada paso, que es donde están los problemas.
 */
export function orderStateVisits(order: Order): OrderStateVisit[] {
  return order.history.map((entry, index) => {
    const next = order.history[index + 1];
    return {
      status: entry.to,
      enteredAt: entry.at,
      minutes: next ? minutesBetween(entry.at, next.at) : null,
    };
  });
}

/**
 * ¿Este tramo se pasó del ritmo de trabajo configurado?
 *
 * ⚠️ El tramo abierto nunca cuenta: no se ha salido de él, así que compararlo con
 * un umbral exigiría inventarle una duración. Su demora ya la dice la alerta de
 * la pantalla correspondiente, que mide contra **ahora**.
 */
export function isLongVisit(visit: OrderStateVisit, thresholdMinutes: number): boolean {
  return visit.minutes !== null && visit.minutes >= thresholdMinutes;
}

/** El ciclo completo de la orden: cuándo abrió, cuándo cerró y cuánto duró. */
export interface OrderCycle {
  openedAt: string;
  /** `null` mientras la orden siga viva. */
  closedAt: string | null;
  /** Minutos de ciclo. `null` mientras la orden siga viva. */
  minutes: number | null;
}

/**
 * El ciclo de la orden.
 *
 * ⚠️ El cierre se lee del **historial** y sólo si la orden ya no está abierta
 * (`isOrderOpen`), no de `updatedAt` ni de "la última entrada": una orden viva
 * tiene una última entrada —la que la trajo a su estado actual— y tomarla por un
 * cierre daría un ciclo que termina ahora y crece cada vez que se mira.
 */
export function orderCycle(order: Order): OrderCycle | null {
  const first = order.history[0];
  if (!first) return null;

  const last = order.history[order.history.length - 1];
  const closedAt = isOrderOpen(order) ? null : last.at;

  return {
    openedAt: first.at,
    closedAt,
    minutes: closedAt ? minutesBetween(first.at, closedAt) : null,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 3. Selectores por pantalla
 * ════════════════════════════════════════════════════════════════════════ */

/**
 * Qué estados mira cada pantalla.
 *
 * ⚠️ Estos conjuntos son la **definición** de cada pantalla, y por eso están aquí
 * y no dentro de cada vista: dos pantallas que declararan su propia lista podrían
 * solaparse o dejar un estado huérfano —una orden `READY` invisible en todas las
 * pantallas— sin que nada lo detectara. Con las listas juntas, un estado nuevo en
 * el contrato obliga a decidir en qué pantalla se opera.
 */
export const INBOX_STATUSES: readonly OrderStatus[] = ["PENDING", "CONFIRMED"];
export const PREPARATION_STATUSES: readonly OrderStatus[] = ["IN_PREPARATION"];
/**
 * ⚠️ `DELIVERED` entra aquí, y es una decisión, no un descuido. Una orden
 * entregada **sigue siendo trabajo de despacho**: llegó a destino pero nadie la
 * ha cerrado, y ese cierre es un acto explícito del operador (`DELIVERED →
 * COMPLETED`), no un efecto automático de la entrega. Dejándola fuera, una orden
 * entregada no aparecería en ninguna pantalla de trabajo —ni en Despacho, que ya
 * la dio por salida, ni en Historial, que sólo mira lo cerrado— y se habría
 * vuelto invisible con trabajo pendiente encima.
 */
export const DISPATCH_STATUSES: readonly OrderStatus[] = ["READY", "IN_TRANSIT", "DELIVERED"];
export const HISTORY_STATUSES: readonly OrderStatus[] = ["COMPLETED", "CANCELLED", "RETURNED"];

/** Bandeja de entrada (Triaje): lo que aún no ha empezado a trabajarse. */
export function inboxOrders(orders: readonly Order[]): Order[] {
  return orders.filter(order => INBOX_STATUSES.includes(order.status));
}

/** Mesa de alistamiento: el trabajo en curso. */
export function preparationOrders(orders: readonly Order[]): Order[] {
  return orders.filter(order => PREPARATION_STATUSES.includes(order.status));
}

/** Despacho y entrega: lo terminado que aún no se cerró. */
export function dispatchOrders(orders: readonly Order[]): Order[] {
  return orders.filter(order => DISPATCH_STATUSES.includes(order.status));
}

/** Historial y auditoría: lo cerrado, en cualquiera de sus tres formas. */
export function historyOrders(orders: readonly Order[]): Order[] {
  return orders.filter(order => HISTORY_STATUSES.includes(order.status));
}

/** Todo lo que sigue vivo en operación. */
export function liveOrders(orders: readonly Order[]): Order[] {
  return orders.filter(isOrderOpen);
}

/**
 * En qué pantalla de trabajo vive una orden **según su estado actual**.
 *
 * ⚠️ Existe porque los conjuntos de arriba tienen que **cubrir todos los
 * estados**, y esta función es lo que lo hace comprobable: si alguien añadiera un
 * estado al contrato sin asignarlo a una pantalla, caería en el `return` final y
 * el error se vería como "aparece en Historial" en vez de como un estado
 * huérfano. Es además lo que permite que la confirmación de un movimiento diga
 * *dónde* ir a ver la orden que se acaba de mover (§27).
 */
export function screenForStatus(status: OrderStatus): OperationalScreen {
  if (INBOX_STATUSES.includes(status)) return "bandeja";
  if (PREPARATION_STATUSES.includes(status)) return "alistamiento";
  if (DISPATCH_STATUSES.includes(status)) return "despacho";
  return "historial";
}

/** El nombre visible de cada pantalla operativa. */
export const OPERATIONAL_SCREEN_LABELS: Record<OperationalScreen, string> = {
  bandeja: "Bandeja de entrada",
  alistamiento: "Mesa de alistamiento",
  despacho: "Despacho y entrega",
  programados: "Programados",
  historial: "Historial y auditoría",
};

/**
 * Separa las órdenes de despacho por **modalidad** (§8).
 *
 * ⚠️ La separación no es cosmética: `pickup` va de `READY` a `DELIVERED` sin
 * transporte, y `delivery` pasa por `IN_TRANSIT`. Son dos trabajos distintos —uno
 * se entrega en el mostrador, el otro sale a la calle— y mezclarlos en una sola
 * tabla obligaría al operador a leer la modalidad fila por fila para saber si
 * tiene que llamar a un mensajero.
 */
export function splitDispatchByMode(orders: readonly Order[]): {
  onSite: Order[];
  withTransit: Order[];
} {
  const onSite: Order[] = [];
  const withTransit: Order[] = [];
  for (const order of orders) {
    if (modeUsesTransit(order.fulfillment.mode)) withTransit.push(order);
    else onSite.push(order);
  }
  return { onSite, withTransit };
}

/* ── Programados (§15) ─────────────────────────────────────────────────────── */

/**
 * Órdenes programadas que **siguen vivas**.
 *
 * ⚠️ Excluye las cerradas a propósito, y no es un detalle: una orden completada
 * hace tres días conserva su `schedule` —es un hecho histórico suyo—, así que
 * listarla en Programados mostraría trabajo "pendiente" que ya se hizo. La
 * programación de lo cerrado pertenece al Historial, donde se lee como lo que
 * fue: una fecha que se cumplió.
 */
export function scheduledOpenOrders(orders: readonly Order[]): Order[] {
  return orders.filter(order => order.schedule !== undefined && isOrderOpen(order));
}

export type ScheduleState = "upcoming" | "due_soon" | "overdue";

/** Ventana por defecto para considerar una orden programada "por vencer". */
export const DUE_SOON_MINUTES = 120;

/**
 * Estado de una orden programada respecto a **su** momento.
 *
 * ⚠️ Es distinto del estado operativo y no lo sustituye: una orden puede estar
 * `CONFIRMED` (operativo) y `overdue` (programación) a la vez. La pantalla de
 * Programados muestra ambos, porque responden preguntas distintas —"¿en qué punto
 * del flujo está?" y "¿ya se pasó la hora comprometida?"—.
 */
export function scheduleStateOf(
  order: Order,
  dueSoonMinutes: number = DUE_SOON_MINUTES
): ScheduleState {
  const schedule = order.schedule;
  if (!schedule) return "upcoming";

  const diffMinutes = Math.round((Date.parse(schedule.scheduledFor) - Date.now()) / 60_000);
  if (diffMinutes < 0) return "overdue";
  if (diffMinutes <= dueSoonMinutes) return "due_soon";
  return "upcoming";
}

export const SCHEDULE_STATE_LABELS: Record<ScheduleState, string> = {
  upcoming: "Programada",
  due_soon: "Por vencer",
  overdue: "Vencida",
};

export const SCHEDULE_STATE_TO_BADGE: Record<
  ScheduleState,
  { color: BadgeColor; className?: string }
> = {
  upcoming: { color: "light" },
  due_soon: { color: "warning", className: "dark:text-warning-500" },
  overdue: { color: "error" },
};

/** Grupo de programación por día. */
export interface ScheduledDayGroup {
  /** Clave estable del día (`2026-09-14`), para `key` y para las guardas. */
  key: string;
  /** Rótulo humano: "Hoy", "Mañana", "12 sep". */
  label: string;
  orders: Order[];
}

/** Agrupa las órdenes programadas por día de ejecución, en orden ascendente (§15). */
export function groupScheduledByDay(
  orders: readonly Order[],
  dayKeyOf: (iso: string) => string,
  dayLabelOf: (iso: string) => string
): ScheduledDayGroup[] {
  const groups = new Map<string, ScheduledDayGroup>();

  for (const order of orders) {
    if (!order.schedule) continue;
    const key = dayKeyOf(order.schedule.scheduledFor);
    const existing = groups.get(key);
    if (existing) {
      existing.orders.push(order);
    } else {
      groups.set(key, {
        key,
        label: dayLabelOf(order.schedule.scheduledFor),
        orders: [order],
      });
    }
  }

  return [...groups.values()]
    .map(group => ({
      ...group,
      orders: group.orders.sort((a, b) =>
        a.schedule!.scheduledFor < b.schedule!.scheduledFor ? -1 : 1
      ),
    }))
    .sort((a, b) => (a.key < b.key ? -1 : 1));
}

/* ── Canales de origen (§18) ───────────────────────────────────────────────── */

/**
 * Cuántas órdenes entraron por cada canal.
 *
 * ⚠️ Es un dato **de la orden** (su `source`), no del canal: por eso Pedidos puede
 * calcularlo sin poseer el canal. Se cuenta sobre órdenes reales y nunca se
 * inventa un cero para un canal que no existe — eso lo decide quien pinta.
 */
export function orderCountsBySource(orders: readonly Order[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const order of orders) {
    const key = order.source.type.toUpperCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 4. Filtrado operativo
 * ════════════════════════════════════════════════════════════════════════ */

/** Valor de filtro que significa "sin acotar". */
export const FILTER_ALL = "all";

/**
 * Opciones de canal **derivadas de las órdenes reales**.
 *
 * ⚠️ No se ofrece un canal que no tenga órdenes: un desplegable con "WhatsApp"
 * cuando ninguna orden entró por ahí promete un resultado que no existe. Y al
 * revés —un canal nuevo en el vocabulario abierto de §18— aparece solo, sin tocar
 * esta pantalla.
 */
export function channelFilterOptions(
  orders: readonly Order[],
  labelOf: (source: { type: string; label?: string }) => string
): { value: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const order of orders) {
    const key = order.source.type.toUpperCase();
    if (!seen.has(key)) seen.set(key, labelOf(order.source));
  }

  return [
    { value: FILTER_ALL, label: "Todos los canales" },
    ...[...seen.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], "es"))
      .map(([value, label]) => ({ value, label })),
  ];
}

/** Opciones de modalidad de entrega (§8). Las cuatro del contrato. */
export const MODE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: FILTER_ALL, label: "Todas las modalidades" },
  { value: "pickup", label: "Recogida en local" },
  { value: "delivery", label: "Envío con transporte" },
  { value: "on_site", label: "Atención en sitio" },
  { value: "service", label: "Servicio en campo" },
];

/** ¿La orden entra en el canal elegido? */
export function matchesChannel(order: Order, channel: string): boolean {
  return channel === FILTER_ALL || order.source.type.toUpperCase() === channel;
}

/** ¿La orden entra en la modalidad elegida? */
export function matchesMode(order: Order, mode: string): boolean {
  return mode === FILTER_ALL || order.fulfillment.mode === mode;
}

/**
 * Búsqueda instantánea: número, solicitante, ítem o referencia del canal.
 *
 * ⚠️ Busca sobre **datos de la orden** —número, quién la pidió, qué lleva, de qué
 * hilo salió—, nunca sobre catálogo o clientes: Pedidos no los tiene (§24). La
 * referencia del canal entra porque es lo que el operador tiene a mano cuando
 * viene de una conversación y dicta el identificador del hilo.
 */
export function matchesQuery(order: Order, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  const haystack = [
    order.number,
    order.requester.name,
    order.requester.phone ?? "",
    order.notes ?? "",
    order.source.reference ?? "",
    ...order.items.map(item => item.name),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

/** Aplica los tres filtros de una pantalla operativa a la vez. */
export function applyOperationalFilters(
  orders: readonly Order[],
  filters: { channel: string; mode: string; query: string }
): Order[] {
  return orders.filter(
    order =>
      matchesChannel(order, filters.channel) &&
      matchesMode(order, filters.mode) &&
      matchesQuery(order, filters.query)
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * 5. Panel de Pedidos — qué reclamar y a dónde mandar
 * ════════════════════════════════════════════════════════════════════════ */

/**
 * Los destinos que el Panel puede ofrecer.
 *
 * ⚠️ Es `OperationalScreen` **más** las dos pantallas de contexto. No se importa
 * `OrdersSectionKey` desde `OrdersModule` a propósito: ese módulo importa este
 * archivo, y traerlo aquí cerraría un ciclo. El vocabulario sigue siendo uno —el
 * del shell— y la guarda comprueba que ambos coinciden.
 */
export type DashboardTarget = OperationalScreen | "canales" | "configuracion";

/**
 * Las cuatro condiciones que pueden reclamar atención.
 *
 * ⚠️ El **orden del array es la prioridad**, y no es alfabético ni arbitrario: es
 * el orden del propio flujo de trabajo. Lo que aún no se ha validado bloquea todo
 * lo demás —una orden no puede alistarse sin haberse confirmado—, así que señalar
 * un síntoma antes que su causa haría que el operador trabajara en el sitio
 * equivocado. La vista pinta las que tienen cifra distinta de cero **en este
 * orden**, y ese orden es el mensaje.
 */
export type AttentionKey =
  | "staleInbox"
  | "latePreparation"
  | "unsentReady"
  | "overdueScheduled";

export interface AttentionItem {
  key: AttentionKey;
  /** Cuántas órdenes cumplen la condición ahora mismo. */
  count: number;
  /** La pantalla donde se resuelve. */
  target: DashboardTarget;
  /**
   * La fase que esa pantalla debe abrir **ya seleccionada**.
   *
   * ⚠️ Esto es lo que separa una cifra accionable de una decorativa. Si el
   * operador pulsa «3 demoradas» y aterriza en Alistamiento sin el filtro puesto,
   * tiene que volver a buscar a mano las tres que le acabamos de contar, y la
   * tarjeta no ha servido para nada. El valor tiene que ser una fase que la
   * pantalla destino declare de verdad.
   */
  phase: string;
  tone: "attention" | "danger";
  /**
   * Cómo se lee la condición, sin cifra: "Sin validar hace rato".
   *
   * ⚠️ Vive aquí y no en la vista porque la frase y la condición son **la misma
   * decisión**. Repartirlas es exactamente cómo se acaba con una condición nueva
   * que no tiene fila propia y no la pinta nadie.
   */
  label: string;
  /**
   * Qué está pasando, con el **umbral vivo** dentro: "Más de 15 min esperando a
   * que alguien las valide".
   *
   * ⚠️ Redactado **sin sujeto** a propósito —"más de 15 min esperando", no "3
   * órdenes llevan 15 min"—: la cifra se pinta aparte, y meterla en la frase
   * obligaría a concordar singular y plural en cuatro sitios a la vez.
   */
  detail: string;
}

export interface AttentionOptions {
  stagnationMinutes: number;
  inboxWaitMinutes: number;
}

/**
 * Las condiciones de atención con su cifra viva, siempre las cuatro.
 *
 * ⚠️ Devuelve las cuatro aunque valgan cero; **quien decide qué se pinta es la
 * vista**, no esta función. Filtrar aquí escondería la cifra y la guarda no
 * podría comprobar que el cero y la ausencia son cosas distintas.
 */
export function attentionItems(
  orders: readonly Order[],
  options: AttentionOptions
): AttentionItem[] {
  const { stagnationMinutes, inboxWaitMinutes } = options;

  const staleInbox = inboxOrders(orders).filter(
    order => minutesInCurrentState(order) >= inboxWaitMinutes
  ).length;
  const latePreparation = preparationOrders(orders).filter(order =>
    isStagnant(order, stagnationMinutes)
  ).length;
  // ⚠️ `READY` es «terminada y aún en el local»: existe trabajo pendiente —sacarla—
  // aunque la orden no esté demorada. Por eso es `attention` y no `danger`.
  const unsentReady = orders.filter(order => order.status === "READY").length;
  const overdueScheduled = scheduledOpenOrders(orders).filter(
    order => scheduleStateOf(order) === "overdue"
  ).length;

  return [
    {
      key: "staleInbox",
      count: staleInbox,
      target: "bandeja",
      phase: "waiting",
      tone: "danger",
      label: "Sin validar hace rato",
      detail: `Más de ${inboxWaitMinutes} min esperando a que alguien las valide.`,
    },
    {
      key: "latePreparation",
      count: latePreparation,
      target: "alistamiento",
      phase: "late",
      tone: "danger",
      label: "Alistamiento demorado",
      detail: `Más de ${stagnationMinutes} min en la mesa sin avanzar.`,
    },
    {
      key: "unsentReady",
      count: unsentReady,
      target: "despacho",
      phase: "ready",
      tone: "attention",
      label: "Listas y sin despachar",
      detail: "Terminadas y todavía en el local.",
    },
    {
      key: "overdueScheduled",
      count: overdueScheduled,
      target: "programados",
      phase: "overdue",
      tone: "danger",
      label: "Programadas vencidas",
      detail: "Se pasó la hora comprometida con el cliente.",
    },
  ];
}

export interface DestinationFigure {
  /** Ya formateado: la vista no vuelve a calcular nada. */
  value: string;
  /**
   * Qué cuenta la cifra: "órdenes", "canales", "min".
   *
   * ⚠️ Va **siempre**, incluso cuando son órdenes. Antes se omitía en ese caso
   * —"se sobreentiende"— y el resultado era un `6` a secas junto al nombre de un
   * destino que no dice "órdenes": Canales cuenta canales y Configuración muestra
   * minutos, así que un número sin unidad se lee como órdenes por defecto y el
   * atajo acaba afirmando algo falso. La palabra cuesta tres caracteres.
   */
  unit: string;
}

/**
 * La cifra viva de cada destino del módulo.
 *
 * ⚠️ Cada destino muestra **una sola** cifra, y es la que responde a «¿merece la
 * pena entrar aquí?». No se añaden segundas métricas por destino: esta pantalla
 * existe precisamente para que las cifras dejen de repetirse por todas partes, y
 * llenarla de números la devolvería al problema que viene a resolver.
 */
export function destinationFigures(
  orders: readonly Order[],
  options: { stagnationMinutes: number }
): Record<DashboardTarget, DestinationFigure> {
  const channels = new Set(orders.map(order => order.source.type.toUpperCase()));

  return {
    bandeja: { value: String(inboxOrders(orders).length), unit: "órdenes" },
    alistamiento: { value: String(preparationOrders(orders).length), unit: "órdenes" },
    despacho: { value: String(dispatchOrders(orders).length), unit: "órdenes" },
    programados: { value: String(scheduledOpenOrders(orders).length), unit: "órdenes" },
    historial: { value: String(historyOrders(orders).length), unit: "órdenes" },
    canales: { value: String(channels.size), unit: "canales" },
    configuracion: { value: String(options.stagnationMinutes), unit: "min" },
  };
}

/**
 * ¿La fecha cae en el día local del operador?
 *
 * ⚠️ Compara componentes locales, no cadenas ISO: una orden cerrada a las 23:50 y
 * otra a las 00:10 son de días distintos para quien trabaja en el mostrador, y
 * comparar el ISO las pondría en el mismo día UTC.
 */
function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

export interface TodayRhythm {
  entered: number;
  completed: number;
  cancelled: number;
}

/**
 * El pulso del día.
 *
 * ⚠️ Se mide sobre el **historial**, no sobre `updatedAt`: cuándo entró una orden
 * es `createdAt` (un hecho del dominio), y cuándo se cerró es el momento de su
 * última entrada en el historial. `updatedAt` cambia por cualquier edición, así
 * que una nota añadida a una orden cerrada ayer la contaría como cerrada hoy.
 */
export function todayRhythm(orders: readonly Order[]): TodayRhythm {
  const entered = orders.filter(order => isToday(order.createdAt)).length;
  const closedToday = orders.filter(order => {
    const last = order.history[order.history.length - 1];
    return last !== undefined && isToday(last.at);
  });

  return {
    entered,
    completed: closedToday.filter(order => order.status === "COMPLETED").length,
    cancelled: closedToday.filter(order => order.status === "CANCELLED").length,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 6. Métricas de cabecera por fase — RETIRADO
 * ════════════════════════════════════════════════════════════════════════ */

/*
 * ⚠️ Aquí vivían `metricsForScreen`, `ScreenMetric` y `METRIC_TONE_RING`: las
 * cuatro cifras que cada pantalla pintaba en su cabecera.
 *
 * Se retiraron porque **las cuatro eran las mismas en las cinco pantallas** —el
 * mismo "Por validar / Confirmadas / Espera larga / En bandeja" encima de
 * Alistamiento, de Despacho y de Programados—, así que no respondían a la pregunta
 * de ninguna fase. No eran las métricas de una pantalla: eran un Dashboard
 * embutido en cada pestaña.
 *
 * Lo que de verdad se acciona vive ahora en el **Panel de Pedidos** (§5), que es
 * una pantalla propia y donde cada cifra lleva a la lista que la resuelve. Lo que
 * sobrevivió de aquí es `isToday`, que sólo usaba `todayRhythm` y se mudó a §5.
 *
 * ⚠️ No reintroducir una cabecera de métricas «porque queda vacío»: si una
 * pantalla necesita una cifra, la necesita **accionable y con su lista debajo**,
 * y eso es lo que el Panel ya ofrece.
 */
