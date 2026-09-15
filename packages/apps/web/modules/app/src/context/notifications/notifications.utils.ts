import type { NotificationIdentity, NotificationInput } from "./notifications.types";

/**
 * Sanitizes a payload coming from the (untyped at the boundary) event bus.
 *
 * The bus is typed against `NectoEventsMap`, but `publish` accepts a plain
 * object and the underlying `window` CustomEvent carries no shape guarantee at
 * runtime — so a caller that drifts from the contract (missing `title`, bogus
 * `type`) would otherwise put `undefined` in front of the bell's icon switch.
 * Normalizing here means a stray emitter can never do that.
 */
export function normalizeNotificationInput(raw: unknown): NotificationInput | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Partial<NotificationInput>;

  const title = typeof source.title === "string" ? source.title.trim() : "";
  if (!title) return null;

  const type =
    source.type === "order" || source.type === "stock" || source.type === "alert"
      ? source.type
      : "system";

  return {
    title,
    desc: typeof source.desc === "string" ? source.desc.trim() : "",
    type,
    sourceKey: typeof source.sourceKey === "string" ? source.sourceKey : undefined,
  };
}

/** Two notifications describe the same thing when they share a key, or the same type + title. */
export function isSameNotification(a: NotificationIdentity, b: NotificationIdentity): boolean {
  if (a.sourceKey && b.sourceKey) return a.sourceKey === b.sourceKey;
  return a.type === b.type && a.title === b.title;
}
