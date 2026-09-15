import type {
  ParsedInboundMessage,
  WhatsAppInboundKind,
  WhatsAppRawMessage,
  WhatsAppWebhookPayload,
} from "./types.js";

/** Tipos de Meta que se reconocen. Lo que no está aquí entra como `unknown`. */
const KIND_BY_TYPE: Record<string, WhatsAppInboundKind> = {
  text: "text",
  image: "image",
  audio: "audio",
  document: "document",
  interactive: "interactive",
};

/**
 * `timestamp` de Meta es **epoch en segundos**, como texto. Si no es un número se
 * usa el momento de recepción: es mejor que una fecha inventada, y el mensaje sigue
 * siendo ordenable.
 */
function sentAtOf(timestamp: string | undefined): string {
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || seconds <= 0) return new Date().toISOString();
  return new Date(seconds * 1000).toISOString();
}

function parseMessage(
  raw: WhatsAppRawMessage,
  phoneNumberId: string
): ParsedInboundMessage | undefined {
  // Sin `id` no hay clave de idempotencia y sin `from` no hay remitente: se
  // descarta en vez de guardar un mensaje que Meta duplicaría en cada reintento.
  if (!raw.id || !raw.from) return undefined;

  const type = raw.type ?? "";
  return {
    messageId: raw.id,
    from: raw.from,
    phoneNumberId,
    kind: KIND_BY_TYPE[type] ?? "unknown",
    text: raw.text?.body,
    sentAt: sentAtOf(raw.timestamp),
  };
}

/**
 * Normaliza el sobre de Meta en mensajes atribuibles a un número.
 *
 * Sólo se leen los cambios de tipo `messages`. Los `statuses` (entregado, leído)
 * son acuses de los mensajes que **Necto** envió, no mensajes entrantes: meterlos
 * aquí llenaría la bandeja con ruido que nadie puede contestar.
 *
 * ⚠️ Devuelve `[]` en lugar de lanzar. Meta reintenta la entrega ante un 5xx, así
 * que un sobre que no se entiende no puede convertirse en un error del servidor:
 * se ignora y se responde 200. Lo que **sí** debe fallar es la firma, y eso se
 * comprueba antes de llegar aquí.
 *
 * No resuelve la tienda: eso necesita el índice de canales y ocurre fuera, para que
 * esto siga siendo una función pura.
 */
export function parseInboundMessages(
  payload: WhatsAppWebhookPayload | undefined
): ParsedInboundMessage[] {
  const messages: ParsedInboundMessage[] = [];

  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      if (change?.field !== "messages") continue;

      const phoneNumberId = change.value?.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      for (const raw of change.value?.messages ?? []) {
        const parsed = parseMessage(raw ?? {}, phoneNumberId);
        if (parsed) messages.push(parsed);
      }
    }
  }

  return messages;
}
