/**
 * Channel & HITL Domain Contract
 * Pure domain types for WhatsApp conversations, messages, handoff state, and operator control.
 */

import type { OrderChannel, AIConfidence, DraftOrder } from "./order.contract";

/** States of conversation control (HITL state machine). */
export type ConversationStatus =
  | "IA_ATENDIENDO"          // AI handles conversation
  | "REQUIERE_INTERVENCION"  // AI requested help; waiting in queue
  | "HUMANO_ATENDIENDO"      // Operator took control (AI paused)
  | "RESUELTO";              // Closed by human operator

/** Reason why AI or customer requested human intervention. */
export type HandoffReason =
  | "AMBIGUO"                     // Ambiguous message
  | "FUERA_DE_ALCANCE"            // Out of AI scope
  | "MODIFICACION_ESPECIAL"       // Special modification request
  | "CONFIRMAR_DATO"              // Data confirmation needed
  | "CLIENTE_PIDE_HUMANO"         // Customer requested human explicitly
  | "BAJA_CONFIANZA"              // Low AI confidence
  | "VERIFICAR_PAGO_TRANSFERENCIA" // Payment proof attached (Nequi/Bancolombia/QR)
  | "RECLAMO_INCIDENCIA";         // Complaint or delay issue

/** Message sender role. */
export type MessageSender = "cliente" | "ia" | "humano";

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  /** Operator name when sender = "humano". */
  authorName?: string;
  text: string;
  timestamp: string;
  attachmentUrl?: string;
  attachmentType?: "image" | "comprobante" | "audio";
  attachmentMeta?: {
    bank?: "Nequi" | "Bancolombia" | "Daviplata" | "QR Interbancario" | "Transferencia";
    amount?: number;
    reference?: string;
    status?: "PENDIENTE_VERIFICACION" | "VERIFICADO_OK" | "RECHAZADO";
  };
}

/** Audit event for conversation control transitions. */
export interface ConversationEvent {
  timestamp: string;
  fromStatus?: ConversationStatus;
  toStatus: ConversationStatus;
  user: string;
  note?: string;
}

export interface Conversation {
  id: string;
  customerName: string;
  customerPhone: string;
  avatarUrl?: string;
  channel: OrderChannel;
  status: ConversationStatus;
  /** Operator holding control (mutex lock source of truth). */
  controlledBy: string | null;
  /** Reason for handoff when status = REQUIERE_INTERVENCION. */
  requiresHandoffReason?: HandoffReason;
  aiConfidence?: AIConfidence;
  /** Associated order ID (if confirmed into Kanban). */
  orderId?: string;
  /** Draft order built inside chat before payment confirmation. */
  draftOrder?: DraftOrder;
  messages: ChatMessage[];
  handoffHistory: ConversationEvent[];
  lastMessageAt: string;
  /** Visual unread flag for human operator. */
  unreadForOperator: boolean;
}
