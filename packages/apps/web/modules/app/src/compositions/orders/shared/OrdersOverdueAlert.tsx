/**
 * Pedidos — Alerta de programadas vencidas (§15).
 * ================================================
 *
 * La franja que avisa de que hay órdenes cuya **hora comprometida con el cliente
 * ya pasó** y siguen sin ejecutarse.
 *
 * ── Por qué es una alerta distinta de la de demora ──────────────────────────
 *
 * ⚠️ No se puede reutilizar `OrdersStagnationAlert` cambiándole el texto, porque
 * miden cosas distintas y el número que cada una destaca también lo es:
 *
 *   · La de **demora** mide tiempo **en el estado actual** —cuánto lleva la orden
 *     sin moverse—, y su titular es "la más antigua lleva X".
 *   · Ésta mide tiempo **contra una hora pactada** —cuánto se ha pasado—, y su
 *     titular es "la más retrasada lleva X de retraso".
 *
 * Una orden puede estar `CONFIRMED` (perfectamente viva, sin demora) y llevar dos
 * horas de retraso sobre su ventana comprometida. Confundir las dos métricas haría
 * que la alerta dijera "sin moverse" de algo que sí se movió, o que no dijera nada
 * de una orden que incumplió una promesa.
 *
 * ── Por qué existe ─────────────────────────────────────────────────────────
 *
 * ⚠️ El ajuste «Avisar de programadas vencidas» (§17) llevaba tiempo en
 * Configuración **sin ningún consumidor**: guardaba su valor y ninguna pantalla lo
 * leía. Un interruptor que no cambia nada es peor que no tenerlo, porque promete
 * un control que no existe. Esta pieza es su efecto.
 */

import { Alert } from "@/elements";
import type { Order } from "@/contracts/order.contract";
import { formatDuration } from "../order-presentation.utils";
import { scheduleStateOf } from "../operational/order-operations";

export interface OrdersOverdueAlertProps {
  /** Las órdenes programadas **ya vencidas**, sin filtrar por nada más. */
  orders: readonly Order[];
}

/** Cuántos números se nombran antes de resumir el resto. */
const NAMED_LIMIT = 6;

/** Minutos de retraso de una orden vencida, respecto a su ventana comprometida. */
function minutesOverdue(order: Order): number {
  const scheduledFor = order.schedule?.scheduledFor;
  if (!scheduledFor) return 0;
  return Math.max(0, Math.round((Date.now() - Date.parse(scheduledFor)) / 60_000));
}

export function OrdersOverdueAlert({ orders }: OrdersOverdueAlertProps) {
  // ⚠️ Se vuelve a comprobar el estado de programación aunque quien llame ya deba
  // haber filtrado: si la lista llegara con una orden futura dentro, el titular
  // diría "vencidas" sobre algo que no lo está. Filtrar aquí es la única forma de
  // que el texto y el dato no puedan discrepar.
  const overdue = orders.filter(order => scheduleStateOf(order) === "overdue");
  if (overdue.length === 0) return null;

  const worst = overdue.reduce(
    (max, order) => Math.max(max, minutesOverdue(order)),
    0
  );

  const named = overdue.slice(0, NAMED_LIMIT).map(order => order.number);
  const remaining = overdue.length - named.length;
  const list = remaining > 0 ? `${named.join(", ")} y ${remaining} más` : named.join(", ");

  return (
    // ⚠️ El `Alert` del catálogo no reenvía props nativas, así que el ancla va en
    // un contenedor propio. Es el mismo recurso que usa la alerta de demora.
    //
    // ⚠️ Y cede el ancho cuando comparte fila con la de demora —es lo que pasa en
    // Programados—: ver el porqué en `OrdersStagnationAlert`.
    <div data-orders-overdue={overdue.length} className="lg:min-w-0 lg:flex-1">
      <Alert
        variant="error"
        title={
          overdue.length === 1
            ? "1 orden pasó su hora comprometida"
            : `${overdue.length} órdenes pasaron su hora comprometida`
        }
        /**
         * ⚠️ Una sola línea: el retraso peor ya lo dice la columna «Ventana
         * comprometida» de la fila, con su chip «Vencida». La frase que lo repetía
         * aquí —"sobre la ventana pactada con el cliente"— además explicaba la
         * propia interfaz (§8).
         */
        message={`${list} · la más retrasada, ${formatDuration(worst)}`}
      />
    </div>
  );
}

export default OrdersOverdueAlert;
