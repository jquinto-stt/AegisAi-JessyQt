import { useCallback, useEffect, useState } from "react";
import { eventBus } from "@/infrastructure/eventBus";
import {
  MAX_NOTIFICATIONS,
  NOTIFICATION_DEDUPE_WINDOW_MS,
  readStoredNotifications,
  writeStoredNotifications,
} from "../notifications.constants";
import { isSameNotification, normalizeNotificationInput } from "../notifications.utils";
import type { NotificationInput, NotificationItem } from "../notifications.types";

/**
 * Notification queue for the shell.
 *
 * Owns the list, the read/unread state and persistence to `necto_notifications`.
 * Subscribes to `necto_notification_created` on the typed event bus so any
 * domain can publish a notification without importing this hook.
 *
 * Only one live instance exists (the shell bell in NectoApp), so the event
 * subscription is what keeps the queue in sync rather than a provider/context.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(readStoredNotifications);

  const persist = (next: NotificationItem[]) => {
    setNotifications(next);
    writeStoredNotifications(next);
  };

  /**
   * Enqueues a notification. Returns the resulting `id`.
   *
   * A repeated `sourceKey` (or the same type + title) inside the dedupe window
   * refreshes the existing entry — new description, back to unread, moved to the
   * top — instead of stacking a duplicate. Beyond the window it is a new event
   * and gets its own row.
   */
  const push = useCallback((input: NotificationInput): string => {
    const id = `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = Date.now();

    setNotifications((prev) => {
      const duplicateIndex = prev.findIndex((item) => isSameNotification(item, input));

      if (duplicateIndex >= 0 && createdAt - prev[duplicateIndex].createdAt < NOTIFICATION_DEDUPE_WINDOW_MS) {
        const existing = prev[duplicateIndex];
        const refreshed: NotificationItem = {
          ...existing,
          // `title` and `type` have to be refreshed as well, not just the
          // description. Two different events can share a `sourceKey` — linking
          // and unlinking WhatsApp both publish "whatsapp_connection" — and
          // keeping the old title made the row assert the opposite of its own
          // body ("WhatsApp vinculado" above "La sesión se cerró…"), while
          // silently downgrading the author's `alert` type to `system`.
          title: input.title,
          type: input.type,
          desc: input.desc || existing.desc,
          createdAt,
          read: false,
        };
        const rest = [refreshed, ...prev.slice(0, duplicateIndex), ...prev.slice(duplicateIndex + 1)];
        writeStoredNotifications(rest);
        return rest;
      }

      const next = [{ ...input, id, createdAt, read: false }, ...prev].slice(0, MAX_NOTIFICATIONS);
      writeStoredNotifications(next);
      return next;
    });

    return id;
  }, []);

  const markRead = (id: string) => {
    const next = notifications.map((item) => (item.id === id ? { ...item, read: true } : item));
    persist(next);
  };

  const markAllRead = () => {
    if (!notifications.some((item) => !item.read)) return;
    persist(notifications.map((item) => ({ ...item, read: true })));
  };

  const remove = (id: string) => {
    persist(notifications.filter((item) => item.id !== id));
  };

  const clear = () => {
    persist([]);
  };

  useEffect(() => {
    const unsub = eventBus.subscribe("necto_notification_created", (payload) => {
      const normalized = normalizeNotificationInput(payload);
      if (normalized) push(normalized);
      else if (import.meta.env.DEV) {
        console.warn("[notifications] evento ignorado: payload sin `title`", payload);
      }
    });
    return () => unsub();
  }, [push]);

  return {
    notifications,
    unreadCount: notifications.filter((item) => !item.read).length,
    push,
    markRead,
    markAllRead,
    remove,
    clear,
  };
}

export type NotificationQueue = ReturnType<typeof useNotifications>;
