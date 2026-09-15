import { AlertCircle, Check, CheckCheck, Clock } from "lucide-react";

import type { MessageStatus } from "@/contracts/conversation.contract";
import { cn } from "@/utils";

/* ── Estado de entrega de un mensaje saliente ────────────────────────────────
 *
 * El pie de la burbuja saliente dice **en qué punto va** el mensaje. Es la única
 * parte del chat que responde a "¿le llegó?", así que la escala tiene que ser
 * exactamente la que el operador ya sabe leer de WhatsApp:
 *
 *   · `sending`   → reloj      (salió del compositor, todavía no hay acuse)
 *   · `sent`      → un check   (el servidor lo tiene)
 *   · `delivered` → dos checks (llegó al teléfono)
 *   · `read`      → dos checks marcados (lo leyó)
 *   · `failed`    → alerta     (no salió; necesita texto, no sólo icono)
 *
 * ⚠️ Entrante **no** lleva estado: el cliente ya lo escribió y no hay entrega que
 * confirmar. Por eso `status` es opcional en el contrato y este componente no se
 * pinta cuando falta — en lugar de inventar un estado "ninguno" que cada
 * consumidor tendría que estar recordando ignorar.
 *
 * ⚠️ El color sigue el **tema del contenedor**, no un color propio: marca gris
 * sobre el fondo claro del hilo, marca clara sobre el relleno de la burbuja
 * saliente (`onDark`). Un gris fijo se volvería ilegible en una de las dos.
 * ─────────────────────────────────────────────────────────────────────────── */

const LABELS: Record<MessageStatus, string> = {
  sending: "Enviando",
  sent: "Enviado",
  delivered: "Entregado",
  read: "Leído",
  failed: "No enviado",
};

export interface MessageStatusIconProps {
  status?: MessageStatus;
  /** Escribe sobre el relleno de la burbuja saliente en lugar del lienzo del hilo. */
  onDark?: boolean;
  /** Motivo del fallo, cuando lo hay. Se muestra en el `title` y como texto aparte. */
  failureReason?: string;
  className?: string;
}

export function MessageStatusIcon({
  status,
  onDark = false,
  failureReason,
  className,
}: MessageStatusIconProps) {
  if (!status) return null;

  const base = onDark ? "text-white/70" : "text-gray-400 dark:text-gray-500";
  const read = onDark ? "text-white" : "text-accent-600 dark:text-accent-300";

  const icon = (() => {
    switch (status) {
      case "sending":
        return <Clock className={cn("h-3 w-3", base)} aria-hidden />;
      case "sent":
        return <Check className={cn("h-3 w-3", base)} aria-hidden />;
      case "delivered":
        return <CheckCheck className={cn("h-3 w-3", base)} aria-hidden />;
      case "read":
        return <CheckCheck className={cn("h-3 w-3", read)} aria-hidden />;
      case "failed":
        return <AlertCircle className="h-3 w-3 text-error-500" aria-hidden />;
    }
  })();

  return (
    <span
      data-message-status={status}
      title={failureReason ? `${LABELS[status]} — ${failureReason}` : LABELS[status]}
      className={cn("inline-flex flex-none items-center", className)}
    >
      {icon}
      {/* El estado se dice también en texto para quien no ve el icono: dos checks
          no significan nada leídos por un lector de pantalla. */}
      <span className="sr-only">{LABELS[status]}</span>
    </span>
  );
}

export default MessageStatusIcon;
