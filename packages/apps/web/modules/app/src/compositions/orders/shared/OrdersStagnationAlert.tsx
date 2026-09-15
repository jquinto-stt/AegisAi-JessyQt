/**
 * Pedidos — Alerta de órdenes estancadas (§12).
 * ==============================================
 *
 * La franja que avisa de que hay órdenes que llevan **demasiado tiempo sin
 * moverse** en la fase que se está mirando.
 *
 * ── Por qué una alerta y no un color en la fila ─────────────────────────────
 *
 * ⚠️ La tabla ya marca la urgencia con un `Badge` por fila, y eso resuelve *cuál*
 * está atrasada. Lo que no resuelve es *cuántas hay*: en una lista de cuarenta
 * filas, el operador tendría que recorrerla entera para descubrir que hay tres
 * atrasadas. Esta franja da el titular —"3 órdenes llevan más de 25 min sin
 * moverse"— y nombra las órdenes, de modo que el problema se ve sin buscar.
 *
 * ── Por qué el `Alert` del catálogo y no un aviso propio ────────────────────
 *
 * `Alert` es exactamente "mensaje contextual persistente con severidad", que es
 * lo que esto es. Su límite conocido —no admite `role="status"` ni dos acciones
 * en línea— no estorba aquí: esto **informa**, no ofrece un camino, porque el
 * camino ya está en la propia tabla (las órdenes nombradas están listadas debajo).
 *
 * ⚠️ El umbral y las órdenes **llegan resueltos**. Si esta pieza contara por su
 * cuenta, "demorada" volvería a tener una definición por pantalla.
 */

import { Alert } from "@/elements";
import type { Order } from "@/contracts/order.contract";
import { formatDuration } from "../order-presentation.utils";
import { minutesInCurrentState } from "../operational/order-operations";

export interface OrdersStagnationAlertProps {
  /** Las órdenes estancadas de la fase, ya filtradas y ordenadas. */
  orders: readonly Order[];
  /** El umbral configurado en «Configuración del flujo» (§17). */
  thresholdMinutes: number;
  /** Qué se está mirando: "En bandeja", "En alistamiento"… */
  scopeLabel: string;
}

/** Cuántos números se nombran antes de resumir el resto. */
const NAMED_LIMIT = 6;

export function OrdersStagnationAlert({
  orders,
  thresholdMinutes,
  scopeLabel,
}: OrdersStagnationAlertProps) {
  if (orders.length === 0) return null;

  const longest = orders.reduce(
    (max, order) => Math.max(max, minutesInCurrentState(order)),
    0
  );

  const named = orders.slice(0, NAMED_LIMIT).map(order => order.number);
  const remaining = orders.length - named.length;
  const list = remaining > 0 ? `${named.join(", ")} y ${remaining} más` : named.join(", ");

  return (
    // ⚠️ El `Alert` del catálogo no reenvía props nativas, así que el ancla va en
    // un contenedor propio. Es el mismo recurso que usa el chip de estado.
    //
    // ⚠️ Y el contenedor cede el ancho cuando hay un segundo aviso al lado —en
    // Programados conviven éste y el de vencidas—: dos franjas a todo lo ancho
    // apiladas empujaban la tabla más de cien píxeles hacia abajo. En fila, cada
    // una ocupa la mitad y el conjunto pesa la mitad.
    <div data-orders-stagnation={orders.length} className="lg:min-w-0 lg:flex-1">
      <Alert
        variant="warning"
        title={
          orders.length === 1
            ? "1 orden lleva más de " + formatDuration(thresholdMinutes) + " sin moverse"
            : `${orders.length} órdenes llevan más de ${formatDuration(thresholdMinutes)} sin moverse`
        }
        /**
         * ⚠️ Una sola línea. Antes decía "…La más antigua lleva 50 min en su estado
         * actual.", y ese segundo dato ya está en la columna «Tiempo» de la fila,
         * junto al chip «Demorada»: repetirlo aquí engordaba el aviso sin añadir
         * nada que no se pudiera leer tres centímetros más abajo.
         */
        message={`${scopeLabel}: ${list} · la más antigua, ${formatDuration(longest)}`}
      />
    </div>
  );
}

export default OrdersStagnationAlert;
