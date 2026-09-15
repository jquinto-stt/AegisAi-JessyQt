import { useState } from "react";
import {
  Bell,
  Package,
  ShieldAlert,
  ShoppingBag,
  X,
} from "lucide-react";
import { Badge, Button } from "@/elements";
import { formatRelativeTime } from "@/context/notifications/notifications.constants";
import type { NotificationQueue } from "@/context/notifications/hooks/useNotifications";
import type { NotificationType } from "@/context/notifications/notifications.types";

/* ── Shell notification bell ───────────────────────────────────────────
 * Purely presentational: the queue (state, persistence, event subscription)
 * lives in `useNotifications`. This component only paints it.
 *
 * Navigation on click was removed along with the Pedidos module — there is no
 * destination view yet. When one exists, route from `handleClick` here.
 * ──────────────────────────────────────────────────────────────────── */

/** Exhaustive by type: adding a notification type breaks the build here. */
const ICONS: Record<NotificationType, JSX.Element> = {
  order: <ShoppingBag className="w-4 h-4 text-brand-500" />,
  stock: <Package className="w-4 h-4 text-brand-500" />,
  alert: <ShieldAlert className="w-4 h-4 text-warning-500" />,
  system: <Bell className="w-4 h-4 text-gray-400" />,
};

export const NotificationBellDropdown: React.FC<{ queue: NotificationQueue }> = ({ queue }) => {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markRead, markAllRead } = queue;

  const handleClick = (id: string) => {
    markRead(id);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Notificaciones de Necto IA"
        aria-expanded={open}
        className="relative flex h-10 w-10 sm:h-11 sm:w-11 aspect-square flex-none items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-all hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white shadow-theme-xs hover:scale-105 active:scale-95 cursor-pointer"
      >
        <Bell className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-500 border-2 border-white dark:border-gray-900"></span>
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-3 w-[calc(100vw-32px)] max-w-sm sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-theme-lg z-50 overflow-hidden space-y-2 animate-scale-up">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/70 dark:bg-gray-800/40">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-theme-sm text-gray-900 dark:text-gray-100">Notificaciones</h4>
                {unreadCount > 0 && (
                  <Badge variant="light" color="error" size="sm">
                    {unreadCount} nuevas
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button variant="ghost" intent="shell.notifications.markAllRead" onClick={markAllRead} className="p-0 text-theme-xs font-semibold text-brand-500 hover:underline cursor-pointer">
                    Marcar leídas
                  </Button>
                )}
                <Button
                  variant="ghost"
                  intent="shell.notifications.close"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar notificaciones"
                  className="w-7 h-7 p-0 rounded-lg text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                // The queue used to render nothing at all when empty, leaving a
                // header, an invisible body and a footer floating in the panel.
                <div className="px-4 py-10 text-center space-y-1.5">
                  <Bell className="w-6 h-6 mx-auto text-gray-300 dark:text-gray-600" />
                  <p className="text-theme-xs font-semibold text-gray-500 dark:text-gray-400">
                    Sin notificaciones por ahora
                  </p>
                  <p className="text-theme-xs text-gray-400 dark:text-gray-500">
                    Aquí verás los avisos de tu operación.
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n.id)}
                    className={`p-3.5 flex gap-3 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer ${n.read ? "" : "bg-brand-50/40 dark:bg-brand-500/[0.08]"}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-none text-brand-500 border border-gray-200 dark:border-gray-700">
                      {ICONS[n.type]}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-theme-xs text-gray-900 dark:text-gray-100 truncate">{n.title}</p>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-brand-500 flex-none" />}
                      </div>
                      <p className="text-theme-xs text-gray-500 dark:text-gray-400 leading-snug">{n.desc}</p>
                      <p className="text-theme-xs font-mono text-gray-400">{formatRelativeTime(n.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-gray-100 dark:border-gray-800 text-center bg-gray-50/50 dark:bg-gray-800/30">
              <Button variant="ghost" intent="shell.notifications.viewAll" onClick={() => setOpen(false)} className="p-0 text-theme-xs font-semibold text-brand-500 dark:text-brand-400 hover:underline cursor-pointer">
                Ver todas las notificaciones
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
