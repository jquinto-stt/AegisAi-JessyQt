/**
 * Pedidos — Origen de la orden (§18, §20)
 * =======================================
 *
 * Pieza **única** para pintar de dónde vino una orden, en la tabla, el detalle y
 * el widget. Antes cada superficie pintaba su propio `Badge color="light"` con el
 * rótulo del canal, y eso producía exactamente el problema que el operador
 * reportó: **no se entiende cómo llegó la orden**.
 *
 * ── Por qué un componente y no un `Badge` suelto ────────────────────────────
 *
 * Un `Badge` gris que dice "WhatsApp" informa del canal y nada más: no dice *por
 * dónde entró*, no permite volver a la conversación y se lee igual que "POS" o
 * "Tienda web". El canal es la respuesta a una pregunta operativa —*"¿tengo que
 * contestarle a alguien?"*— y por eso el origen se pinta con:
 *
 *   1. **su icono** (canal reconocible sin leer);
 *   2. **su referencia** cuando existe (`wa_conv_8812`), que es el hilo concreto
 *      del que salió la orden y lo que hace el origen **trazable**;
 *   3. **una acción** cuando el canal es conversacional (WhatsApp): volver a la
 *      conversación para responder.
 *
 * ── La frontera que NO se cruza (§18, §20) ──────────────────────────────────
 *
 * ⚠️ Esto **no** implementa WhatsApp. No hay envío de mensajes, ni plantillas, ni
 * webhooks, ni Embedded Signup: sólo se ofrece un enlace a la conversación, que es
 * propiedad del canal. Pedidos **nombra** el origen y ofrece el puente; quien
 * conversa es Canales.
 *
 * ⚠️ Cuando el canal no es conversacional (POS, mostrador, web, API) no hay nada
 * a lo que volver, así que no se pinta acción: se pinta el canal, y ya.
 */

import { MessageSquare, Monitor, ShoppingCart, Store, Webhook } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button, Card } from "@/elements";
import type { OrderSource } from "@/contracts/order.contract";
import { formatSourceLabel } from "../order-presentation.utils";

/* ── Catálogo de presentación ──────────────────────────────────────────────── */

interface SourcePresentation {
  icon: LucideIcon;
  /** Clases del icono cuando el origen está en primer plano. */
  iconClasses: string;
  /**
   * ¿El canal es una conversación a la que se puede volver?
   *
   * ⚠️ Sólo `WHATSAPP` hoy. La web y el POS son canales de entrada, no hilos de
   * conversación: ofrecer "Responder" en ellos llevaría a una pantalla que no
   * existe.
   */
  isConversational: boolean;
}

const SOURCE_PRESENTATION: Record<string, SourcePresentation> = {
  WHATSAPP: {
    icon: MessageSquare,
    // El color de canal acordado del proyecto (`whatsapp-*`), no un color de
    // estado: verde de canal ≠ verde de "logrado".
    iconClasses: "bg-whatsapp-50 text-whatsapp-700 dark:bg-whatsapp-500/15 dark:text-whatsapp-500",
    isConversational: true,
  },
  WEB: {
    icon: Monitor,
    iconClasses: "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300",
    isConversational: false,
  },
  POS: {
    icon: ShoppingCart,
    iconClasses: "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300",
    isConversational: false,
  },
  COUNTER: {
    icon: Store,
    iconClasses: "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300",
    isConversational: false,
  },
  API: {
    icon: Webhook,
    iconClasses: "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300",
    isConversational: false,
  },
};

const FALLBACK_PRESENTATION: SourcePresentation = {
  icon: Webhook,
  iconClasses: "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300",
  isConversational: false,
};

/** La presentación de un origen, con respaldo para canales no catalogados (§18). */
export function sourcePresentation(source: OrderSource): SourcePresentation {
  return SOURCE_PRESENTATION[source.type.toUpperCase()] ?? FALLBACK_PRESENTATION;
}

/** ¿Se puede volver a la conversación de la que salió esta orden? */
export function canReplyToSource(source: OrderSource): boolean {
  return sourcePresentation(source).isConversational && Boolean(source.reference);
}

/* ── Origen compacto: la celda de la tabla ─────────────────────────────────── */

/**
 * El origen en una celda de tabla.
 *
 * ⚠️ Compacto a propósito: en la tabla el origen es **una columna**, no una
 * tarjeta. Se pinta icono + rótulo, y la referencia sólo si cabe — la referencia
 * completa vive en el detalle, que es donde se opera sobre ella.
 */
export function OrderSourceCell({ source }: { source: OrderSource }) {
  const presentation = sourcePresentation(source);
  const Icon = presentation.icon;
  const label = formatSourceLabel(source);

  return (
    <span
      data-order-source={source.type.toUpperCase()}
      title={source.reference ? `${label} · ${source.reference}` : label}
      className="inline-flex items-center gap-2"
    >
      <span
        className={`flex h-6 w-6 flex-none items-center justify-center rounded-md ${presentation.iconClasses}`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="min-w-0 text-theme-sm text-gray-700 dark:text-gray-200">{label}</span>
    </span>
  );
}

/* ── Origen del detalle: con referencia y acción ───────────────────────────── */

export interface OrderOriginPanelProps {
  source: OrderSource;
  /**
   * Vuelve a la conversación del canal.
   *
   * ⚠️ El puente lo **recibe** el componente: Pedidos no sabe cómo se abre una
   * conversación (eso es de Canales). Hoy el shell no ofrece el enlace, así que la
   * acción aparece deshabilitada con su explicación, en vez de fingir que
   * funciona.
   */
  onReply?: () => void;
  /** Si el puente no está disponible, por qué (se muestra al operador). */
  replyUnavailableHint?: string;
}

/**
 * El origen en el detalle: canal, referencia del hilo y acción de respuesta.
 *
 * ⚠️ Es la pieza que responde *"¿cómo llegó esta orden?"* — la pregunta que el
 * operador dijo que no podía contestar. Dice el canal, el hilo exacto
 * (`wa_conv_8812`) y desde cuándo, y ofrece volver a él.
 */
export function OrderOriginPanel({
  source,
  onReply,
  replyUnavailableHint,
}: OrderOriginPanelProps) {
  const presentation = sourcePresentation(source);
  const Icon = presentation.icon;
  const label = formatSourceLabel(source);
  const canReply = canReplyToSource(source);

  return (
    // ⚠️ `Card` es el único componente del catálogo que **reenvía props nativas**
    // (`CardProps extends HTMLAttributes<HTMLDivElement>` y hace spread), así que
    // el ancla `data-order-origin` viaja con el componente y la guarda sigue
    // pudiendo leer de qué canal salió la orden (§18). Se conserva el relleno
    // `p-4` —más denso que el `p-5 sm:p-6` por defecto— porque el panel vive
    // dentro del drawer, donde el espacio es escaso.
    <Card
      data-order-origin={source.type.toUpperCase()}
      className="flex flex-col gap-3 rounded-xl p-4"
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${presentation.iconClasses}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">{label}</p>
          <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
            {canReply
              ? "La orden se creó a partir de esta conversación."
              : "La orden entró por este canal."}
          </p>
        </div>
      </div>

      {source.reference && (
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          Referencia del hilo{" "}
          <span className="font-mono text-gray-700 dark:text-gray-200">{source.reference}</span>
        </p>
      )}

      {canReply &&
        (onReply ? (
          // ⚠️ El ancla va en un `<span className="contents">` **nativo**, no en el
          // `Button`: el catálogo no reenvía props nativas, así que un
          // `data-order-reply` puesto en el `Button` desaparecería del DOM en
          // silencio. Es el mismo recurso que el pie del detalle usa para
          // `data-order-action`.
          <span data-order-reply className="contents">
            <Button
              size="sm"
              variant="primary"
              onClick={onReply}
              // El verde es del **canal**, no de un estado: el acento de marca está
              // reservado para la acción principal, y "verde de logrado" es otra
              // cosa. Por eso se conserva el token `whatsapp-*`.
              className="self-start gap-1.5 rounded-full bg-whatsapp-500 px-3.5 py-2 text-theme-xs font-semibold hover:bg-whatsapp-700"
              startIcon={<MessageSquare className="h-3.5 w-3.5" aria-hidden />}
            >
              Responder por WhatsApp
            </Button>
          </span>
        ) : (
          <p
            data-order-reply-unavailable
            className="rounded-lg bg-gray-50 px-3 py-2 text-theme-xs text-gray-500 dark:bg-white/[0.02] dark:text-gray-400"
          >
            {replyUnavailableHint ??
              "Responder desde aquí llegará cuando el canal exponga el enlace a la conversación."}
          </p>
        ))}
    </Card>
  );
}
