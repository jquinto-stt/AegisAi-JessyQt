/**
 * Necto Event Bus Contract
 * Strongly typed events for cross-module decoupled communication.
 *
 * ⚠️ `draftOrderConfirmed` y `orderStateChanged` se retiraron: su único emisor vivía
 * en el módulo Pedidos ya borrado y las importaciones de `order.contract` que los
 * tipaban quedaron huérfanas con él. Se recuperan cuando exista el flujo de pedidos.
 *
 * ⚠️ `necto_navigate_pedidos` y `necto_whatsapp_config_changed` también se retiraron
 * (verificado con grep en todo `src/`):
 *  - `necto_navigate_pedidos`: cero publicadores; su único suscriptor en `NectoApp`
 *    navegaba a secciones del módulo Pedidos ya borrado. La navegación por
 *    `searchParams` lo sustituyó.
 *  - `necto_whatsapp_config_changed`: cinco publicadores y **cero suscriptores**. Se
 *    publicaba al vacío desde el hook de configuración y las pestañas de Canales y
 *    del bot. El aviso al operador va por `necto_notification_created`.
 *
 * ⚠️ `necto_store_pace_changed` también se retiró, junto con el dominio de ritmo
 * (`useStorePace`): `storePace` solo se copiaba al contexto y **ninguna UI lo
 * leía**, `setStorePace` no tenía llamador y su único efecto observable era una
 * notificación que afirmaba un cambio de ritmo que nunca ocurría. Sin emisor ni
 * receptor, el evento sobraba.
 *
 * `necto_open_settings` se conserva aunque hoy no tenga publicador: es un punto de
 * extensión del shell, no un residuo de un módulo borrado.
 */

import type { ConversationEventPayload } from "./conversation.contract";
import type { OrderEventPayload } from "./order.contract";

export interface NectoEventsMap {
  necto_open_settings: { tab?: string };
  /**
   * Enqueues an item in the shell notification bell.
   * Consumed by `useNotifications` (src/context/notifications). `sourceKey` is
   * optional: a repeated key refreshes the existing entry instead of stacking a
   * duplicate (see NOTIFICATION_DEDUPE_WINDOW_MS).
   */
  necto_notification_created: {
    title: string;
    desc: string;
    type: "order" | "stock" | "alert" | "system";
    sourceKey?: string;
  };
  /**
   * Hecho del ciclo de vida de una orden, publicado por el módulo **Pedidos**.
   *
   * ── Por qué un solo evento y no diez (§23) ──────────────────────────────────
   *
   * El pedido enumera diez hechos (`OrderCreated`, `OrderConfirmed`,
   * `OrderPreparationStarted`, `OrderReady`, `OrderShipped`, `OrderDelivered`,
   * `OrderCompleted`, `OrderCancelled`, `OrderReturned`…). Un evento de bus por
   * cada uno obligaría a tocar este mapa cada vez que el ciclo de vida gane un
   * paso, y a que cada consumidor futuro (un inventario que reserva, un canal que
   * notifica) declarase diez suscripciones.
   *
   * En su lugar, **el nombre del hecho viaja en el payload** (`OrderEventName`) y
   * el consumidor filtra por `name`. El mapa del bus queda estable y el
   * vocabulario de hechos vive junto al contrato de dominio, que es su casa.
   *
   * ⚠️ `pedidos.order.*` **sólo** lo publica Pedidos, y sólo describe hechos: no
   * transporta lógica de otros módulos (§23). Un inventario futuro escucha
   * `name === "order.confirmed"` y decide por su cuenta (§19); Pedidos no sabe que
   * existe.
   *
   * ⚠️ Hoy este evento puede no tener suscriptores —ningún otro módulo está
   * implementado—. Se declara porque es la **puerta** por la que se integrarán
   * (§7 de la orden de implementación), no porque haya alguien escuchando.
   */
  "pedidos.order.lifecycle": OrderEventPayload;
  /**
   * Hecho del **canal conversacional**, publicado por el canal (§14).
   *
   * Es la dirección inversa a la de Pedidos: aquí el canal es el **emisor** y los
   * módulos son los consumidores. Un Pedidos futuro escuchará `message.received`
   * y decidirá por su cuenta si esa conversación es una orden; el canal no lo
   * llama ni sabe que existe (§9, §14).
   *
   * ⚠️ Igual que `pedidos.order.lifecycle`, hoy puede no tener suscriptores. Se
   * declara porque es la **puerta** por la que un módulo consumirá el canal, no
   * porque haya alguien escuchando.
   *
   * ⚠️ El canal **no publica aquí el contenido del mensaje**: un hecho describe
   * que algo pasó y quién lo protagoniza, no transporta el dato. Quien necesite el
   * hilo lo lee del canal, que es su dueño.
   */
  "canal.conversation.lifecycle": ConversationEventPayload;
}

export type NectoEventType = keyof NectoEventsMap;

export type NectoEventPayload<T extends NectoEventType> = NectoEventsMap[T];
