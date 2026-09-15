import type { NotificationItem, NotificationType } from "./notifications.types";

/** Persistence key. Kept under the same `necto_*` namespace as the rest of the app. */
export const NOTIFICATIONS_STORAGE_KEY = "necto_notifications";

/** Hard cap on the queue. Oldest read entries are dropped first. */
export const MAX_NOTIFICATIONS = 30;

/**
 * Window during which a repeated `sourceKey` refreshes the existing entry
 * instead of appending a duplicate. Keeps a chatty emitter (e.g. dragging a
 * pace slider) from flooding the bell while staying honest for real events.
 */
export const NOTIFICATION_DEDUPE_WINDOW_MS = 60_000;

/**
 * ⚠️ `time` used to be a hardcoded string ("Hace 5 min", "Hace 1 h") stored in
 * state: it never aged, so a notification stayed "Hace 5 min" forever. It is now
 * derived from `createdAt` at render time.
 */
export function formatRelativeTime(createdAt: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - createdAt);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days} d`;
  return new Date(createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

/* ── Hydration ───────────────────────────────────────────────────────── */

const TYPES: NotificationType[] = ["order", "stock", "alert", "system"];

/**
 * Reads the persisted queue. Everything that is not a well-formed notification
 * is dropped rather than rendered — a corrupt localStorage entry must never put
 * a malformed object in front of the bell's icon switch.
 */
export function readStoredNotifications(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object")
      .filter(
        (entry) =>
          typeof entry.id === "string" &&
          typeof entry.title === "string" &&
          typeof entry.desc === "string" &&
          typeof entry.createdAt === "number" &&
          !Number.isNaN(entry.createdAt) &&
          TYPES.includes(entry.type as NotificationType)
      )
      .map((entry) => ({
        id: entry.id as string,
        title: entry.title as string,
        desc: entry.desc as string,
        type: entry.type as NotificationType,
        createdAt: entry.createdAt as number,
        read: entry.read === true,
        sourceKey: typeof entry.sourceKey === "string" ? entry.sourceKey : undefined,
      }))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_NOTIFICATIONS);
  } catch {
    return [];
  }
}

export function writeStoredNotifications(items: NotificationItem[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* storage full or unavailable — the in-memory queue keeps working */
  }
}
