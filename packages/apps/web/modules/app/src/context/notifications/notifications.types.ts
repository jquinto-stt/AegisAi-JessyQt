/**
 * Necto Notification taxonomy.
 *
 * The shape is deliberately minimal: only what the shell bell actually paints.
 * The previous version carried `module`, `pedidosSection`, `pedidosOpTab`,
 * `targetOrderId`, `targetModal`, `targetProductId` and an `inventariosSubView`
 * — i.e. routing vocabulary of the deleted Pedidos module. Routing fields come
 * back when there is a module view to navigate to.
 */

export type NotificationType = "order" | "stock" | "alert" | "system";

/** A queued notification. `id` and `createdAt` are assigned by the store. */
export interface NotificationInput {
  title: string;
  desc: string;
  type: NotificationType;
  /** Optional stable key. Republishing the same `sourceKey` (within the
   *  dedupe window) updates the existing entry instead of stacking duplicates. */
  sourceKey?: string;
}

/** A persisted notification. */
export interface NotificationItem extends NotificationInput {
  id: string;
  /** Epoch millis. The rendered relative time is derived from this. */
  createdAt: number;
  read: boolean;
}

/** Anything the store needs to reconcile an incoming input with the queue. */
export type NotificationIdentity = Pick<NotificationItem, "sourceKey" | "type" | "title">;
