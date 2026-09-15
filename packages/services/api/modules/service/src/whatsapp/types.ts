/**
 * WhatsApp Cloud API — el sobre que Meta entrega y el mensaje ya normalizado.
 *
 * ⚠️ Este módulo es **transporte**. Describe lo que Meta manda y lo convierte en
 * algo atribuible; no decide qué se hace con ello. Quién atiende un mensaje (el
 * asistente, Pedidos, Clientes) es de otro dominio. WhatsApp no es dueño de nada
 * de eso — es el canal por el que llega.
 */

/** Tipos de mensaje que se normalizan. Lo que no se reconoce entra como `unknown`. */
export type WhatsAppInboundKind =
  | "text"
  | "image"
  | "audio"
  | "document"
  | "interactive"
  | "unknown";

/**
 * Mensaje entrante ya normalizado.
 *
 * `businessId` **no** lo manda Meta: se resuelve cruzando `phoneNumberId` con el
 * índice de canales (`keys.ts`). Sin ese paso un mensaje no se puede atribuir a
 * ninguna tienda — y por eso es obligatorio aquí: si no se resuelve, el mensaje no
 * se guarda en lugar de quedar huérfano.
 */
export interface InboundMessage {
  /** Tienda dueña del número que lo recibió. */
  businessId: string;
  /** Id de Meta del mensaje. Es la clave de **idempotencia**. */
  messageId: string;
  /** Número del cliente, tal como lo da Meta. */
  from: string;
  /** `phoneNumberId` del número de la tienda. */
  phoneNumberId: string;
  kind: WhatsAppInboundKind;
  /** Texto plano si `kind === "text"`; en cualquier otro caso, `undefined`. */
  text?: string;
  /** Envío según Meta, ya en ISO. */
  sentAt: string;
}

/**
 * Mensaje normalizado **antes** de resolver la tienda. Es lo que devuelve el
 * parser: normalizar el sobre y saber de quién es son dos pasos distintos, y
 * separarlos deja el parser puro (sin base de datos).
 */
export type ParsedInboundMessage = Omit<InboundMessage, "businessId">;

/**
 * Vínculo entre un número de Meta y la tienda que lo atiende.
 *
 * Es la respuesta a "¿de quién es este `phoneNumberId`?" — el único dato que
 * convierte un webhook anónimo en un mensaje atribuible.
 *
 * ⚠️ **Sin secretos.** Los tokens de Meta viven en el gestor de secretos del
 * backend; aquí sólo hay referencias que el servidor puede leer sin privilegios.
 */
export interface ChannelLink {
  phoneNumberId: string;
  businessId: string;
  wabaId?: string;
  displayPhoneNumber?: string;
  status: "connected" | "not_connected" | "error";
}

/** Un mensaje entrante tal como lo entrega Meta (sólo los campos que se leen). */
export interface WhatsAppRawMessage {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
}

/** Sobre del webhook. Todo opcional: es entrada de un tercero y no se confía en su forma. */
export interface WhatsAppWebhookPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string; display_phone_number?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: WhatsAppRawMessage[];
        /** Acuses de entrega/lectura de mensajes que **Necto** envió. No se leen. */
        statuses?: unknown[];
      };
    }>;
  }>;
}
