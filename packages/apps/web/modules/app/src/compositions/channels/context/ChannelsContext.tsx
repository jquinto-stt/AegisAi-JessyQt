import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import type {
  Conversation,
  ConversationStatus,
  HandoffReason,
  ChatMessage,
  ProductItem,
  OrderItem,
  OrderStatus,
  OrderChannel,
} from "@/contracts";
import { useBusiness } from "@/context/BusinessContext";
import { useAuth } from "@/auth/AuthContext";
import {
  INITIAL_CONVERSATIONS,
  getMockConversationsForBusiness,
} from "../../pedidos/mockData";
import { eventBus } from "@/infrastructure/eventBus";
import { playNewOrderSound } from "../../pedidos/utils/soundEffects";

interface ChannelsContextType {
  conversations: Conversation[];
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
  currentOperatorName: string;
  transitionConversation: (conversationId: string, toStatus: ConversationStatus, note?: string) => void;
  takeControl: (conversationId: string) => void;
  releaseToAI: (conversationId: string) => void;
  resolveConversation: (conversationId: string) => void;
  sendOperatorMessage: (conversationId: string, text: string) => void;
  flagForHandoff: (conversationId: string, reason: HandoffReason) => void;
  markConversationRead: (conversationId: string) => void;
  confirmDraftOrder: (conversationId: string) => string | undefined;
  simulateCustomerMessage: (
    conversationId: string,
    text: string,
    catalog?: ProductItem[],
    options?: { isOrder?: boolean; isReceipt?: boolean }
  ) => void;
  simulateAIReply: (conversationId: string, text: string) => void;
  openWhatsAppConversation: (orderIdOrConvId: string) => void;
  sendWhatsAppStatusAlert: (orderId: string, customMessage: string) => void;
}

const ChannelsContext = createContext<ChannelsContextType | null>(null);

function nowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export const ChannelsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { activeBusiness, semantics } = useBusiness();

  const [conversations, setConversations] = useState<Conversation[]>(() =>
    activeBusiness ? getMockConversationsForBusiness(activeBusiness) : INITIAL_CONVERSATIONS
  );
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Sync conversations when active business changes
  useEffect(() => {
    if (!activeBusiness) return;
    const newConversations = getMockConversationsForBusiness(activeBusiness);
    setConversations(newConversations);
    setSelectedConversationId(newConversations[0]?.id ?? null);
  }, [activeBusiness?.id]);

  const currentOperatorName = (() => {
    try {
      const uname = user?.getUsername?.();
      if (uname && !uname.includes("@")) return uname;
      if (uname) return uname.split("@")[0];
    } catch (e) {}
    return "Operador de Caja";
  })();

  // Subscribe to orderStateChanged to push status updates into WhatsApp thread
  useEffect(() => {
    const unsub = eventBus.subscribe("orderStateChanged", ({ orderId, newState }) => {
      const timeStr = nowTime();
      const orderNoun = semantics?.orderNoun?.toLowerCase() || "pedido";
      const stationNoun = semantics?.stationNoun?.toLowerCase() || "alistamiento y empaque";

      const statusMessages: Partial<Record<OrderStatus, string>> = {
        CONFIRMADO: semantics?.requiresKitchenDisplay
          ? `¡Tu pedido #${orderId} fue confirmado! En breve entra a preparación en cocina.`
          : `¡Tu ${orderNoun} #${orderId} fue confirmado! En breve inicia su ${stationNoun}.`,
        EN_PREPARACION: semantics?.requiresKitchenDisplay
          ? `Tu comanda #${orderId} ya ingresó al horno de cocina y se está preparando.`
          : `Tu ${orderNoun} #${orderId} ya se encuentra en ${stationNoun}.`,
        LISTO: `¡Tu ${orderNoun} #${orderId} está listo y empacado para retiro / entrega!`,
        ENTREGADO: `¡Tu ${orderNoun} #${orderId} ha sido entregado! Muchas gracias por tu compra.`,
        FINALIZADO: `¡Tu ${orderNoun} #${orderId} ha sido entregado! Muchas gracias por tu compra.`,
        CANCELADO: `Tu ${orderNoun} #${orderId} ha sido cancelado. Si tienes dudas, estamos a tu disposición.`,
      };

      const msgText = statusMessages[newState];
      if (msgText) {
        setConversations(prevConvs =>
          prevConvs.map(c => {
            if (c.orderId === orderId) {
              const newMsg: ChatMessage = {
                id: `m-auto-${Date.now()}`,
                sender: "ia",
                text: msgText,
                timestamp: timeStr,
              };
              return {
                ...c,
                lastMessageAt: timeStr,
                messages: [...c.messages, newMsg],
              };
            }
            return c;
          })
        );
      }
    });

    return () => unsub();
  }, [semantics]);

  const transitionConversation = (
    conversationId: string,
    toStatus: ConversationStatus,
    note?: string
  ) => {
    const timeStr = nowTime();
    setConversations(prev =>
      prev.map(c => {
        if (c.id !== conversationId) return c;
        const fromStatus = c.status;
        const newControlledBy =
          toStatus === "HUMANO_ATENDIENDO"
            ? currentOperatorName
            : toStatus === "IA_ATENDIENDO"
            ? null
            : c.controlledBy;
        return {
          ...c,
          status: toStatus,
          controlledBy: newControlledBy,
          unreadForOperator: false,
          handoffHistory: [
            ...c.handoffHistory,
            { timestamp: timeStr, fromStatus, toStatus, user: currentOperatorName, note },
          ],
        };
      })
    );
  };

  const takeControl = (conversationId: string) => {
    transitionConversation(
      conversationId,
      "HUMANO_ATENDIENDO",
      `Control tomado por ${currentOperatorName}`
    );
  };

  const releaseToAI = (conversationId: string) => {
    transitionConversation(
      conversationId,
      "IA_ATENDIENDO",
      `Control devuelto a Necto IA por ${currentOperatorName}`
    );
  };

  const resolveConversation = (conversationId: string) => {
    transitionConversation(
      conversationId,
      "RESUELTO",
      `Caso cerrado por ${currentOperatorName}`
    );
  };

  const sendOperatorMessage = (conversationId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const timeStr = nowTime();
    setConversations(prev =>
      prev.map(c => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          lastMessageAt: timeStr,
          messages: [
            ...c.messages,
            {
              id: `m-${Date.now()}`,
              sender: "humano",
              authorName: currentOperatorName,
              text: trimmed,
              timestamp: timeStr,
            },
          ],
        };
      })
    );
  };

  const flagForHandoff = (conversationId: string, reason: HandoffReason) => {
    const timeStr = nowTime();
    setConversations(prev =>
      prev.map(c => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          status: "REQUIERE_INTERVENCION",
          requiresHandoffReason: reason,
          unreadForOperator: true,
          handoffHistory: [
            ...c.handoffHistory,
            {
              timestamp: timeStr,
              fromStatus: c.status,
              toStatus: "REQUIERE_INTERVENCION",
              user: "Necto IA Engine",
              note: `Intervención requerida: ${reason}`,
            },
          ],
        };
      })
    );
  };

  const markConversationRead = (conversationId: string) => {
    setConversations(prev =>
      prev.map(c => (c.id === conversationId ? { ...c, unreadForOperator: false } : c))
    );
  };

  const confirmDraftOrder = (conversationId: string): string | undefined => {
    const targetConv = conversations.find(c => c.id === conversationId);
    if (!targetConv) return undefined;
    const draft = targetConv.draftOrder;

    const items: OrderItem[] = draft?.items && draft.items.length > 0
      ? draft.items
      : [
          { productId: "prod-01", name: "Empanada de Carne Cortada a Cuchillo", quantity: 6, unitPrice: 5500, option: "Horneada" },
          { productId: "prod-07", name: "Gaseosa Cola 354ml", quantity: 2, unitPrice: 4500 },
          { productId: "extra-01", name: "Salsa Chimichurri Especial (120ml)", quantity: 1, unitPrice: 3500 },
        ];
    const total = draft?.total || items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    const generatedOrderId = `PED-${Date.now().toString().slice(-4)}`;

    eventBus.publish("draftOrderConfirmed", {
      conversationId,
      items,
      channel: targetConv.channel || "whatsapp",
      customerName: targetConv.customerName,
      customerPhone: targetConv.customerPhone,
      notes: draft?.notes || "Comanda WhatsApp confirmada tras validación de pago.",
      total,
    });

    setConversations(prev =>
      prev.map(c => (c.id === conversationId ? { ...c, orderId: generatedOrderId } : c))
    );

    return generatedOrderId;
  };

  const simulateCustomerMessage = (
    conversationId: string,
    text: string,
    catalog: ProductItem[] = [],
    options?: { isOrder?: boolean; isReceipt?: boolean }
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const timeStr = nowTime();

    setConversations(prev =>
      prev.map(conv => {
        if (conv.id !== conversationId) return conv;
        return {
          ...conv,
          lastMessageAt: timeStr,
          unreadForOperator: conv.status !== "HUMANO_ATENDIENDO" ? true : conv.unreadForOperator,
          messages: [
            ...conv.messages,
            {
              id: `m-${Date.now()}`,
              sender: "cliente",
              text: trimmed,
              timestamp: timeStr,
              ...(options?.isReceipt
                ? {
                    attachmentType: "comprobante" as const,
                    attachmentUrl:
                      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=400&q=80",
                    attachmentMeta: {
                      bank: "Nequi",
                      amount: 45500,
                      reference: `NQ-${Math.floor(1000000 + Math.random() * 9000000)}`,
                      status: "PENDIENTE_VERIFICACION" as const,
                    },
                  }
                : {}),
            },
          ],
        };
      })
    );

    // AI simulation logic
    setTimeout(() => {
      setConversations(currentConvs => {
        const conv = currentConvs.find(c => c.id === conversationId);
        if (!conv || conv.status === "HUMANO_ATENDIENDO") return currentConvs;

        const replyTime = nowTime();
        const customerName = conv.customerName.split(" ")[0];
        const lower = trimmed.toLowerCase();

        if (options?.isReceipt || lower.includes("comprobante") || lower.includes("nequi") || lower.includes("transferí")) {
          return currentConvs.map(c => {
            if (c.id !== conversationId) return c;
            return {
              ...c,
              status: "REQUIERE_INTERVENCION" as const,
              requiresHandoffReason: "VERIFICAR_PAGO_TRANSFERENCIA" as const,
              unreadForOperator: true,
              lastMessageAt: replyTime,
              messages: [
                ...c.messages,
                {
                  id: `m-${Date.now()}`,
                  sender: "ia",
                  text: `¡Gracias, ${customerName}! Recibí tu comprobante de pago por $45.500 COP. Lo estoy pasando a nuestro operador para verificación inmediata del abono en cuenta.`,
                  timestamp: replyTime,
                },
              ],
            };
          });
        }

        const storeName = activeBusiness?.name || "nuestra tienda";
        const isOrderRequest =
          options?.isOrder ||
          lower.includes("quiero") ||
          lower.includes("pedir") ||
          lower.includes("comprar") ||
          lower.includes("precio");

        if (isOrderRequest) {
          const primaryItem = catalog[0] || { id: "p-01", name: "Producto de Catálogo", price: 50000 };

          return currentConvs.map(c => {
            if (c.id !== conversationId) return c;
            return {
              ...c,
              draftOrder: {
                items: [
                  { productId: primaryItem.id, name: primaryItem.name, quantity: 1, unitPrice: primaryItem.price },
                ],
                subtotal: primaryItem.price,
                deliveryFee: 0,
                total: primaryItem.price,
              },
              status: "IA_ATENDIENDO" as const,
              lastMessageAt: replyTime,
              messages: [
                ...c.messages,
                {
                  id: `m-${Date.now()}`,
                  sender: "ia",
                  text: `¡Hola ${customerName}! Con gusto te armé el borrador de tu pedido para ${storeName}:\n\n1x ${primaryItem.name} ($${primaryItem.price.toLocaleString("es-CO")})\nTotal: $${primaryItem.price.toLocaleString("es-CO")} COP.`,
                  timestamp: replyTime,
                },
              ],
            };
          });
        }

        return currentConvs.map(c => {
          if (c.id !== conversationId) return c;
          return {
            ...c,
            lastMessageAt: replyTime,
            messages: [
              ...c.messages,
              {
                id: `m-${Date.now()}`,
                sender: "ia",
                text: `¡Hola ${customerName}! Entendido tu mensaje. ¿En qué más podemos ayudarte hoy?`,
                timestamp: replyTime,
              },
            ],
          };
        });
      });
    }, 400);
  };

  const simulateAIReply = (conversationId: string, text: string) => {
    const timeStr = nowTime();
    setConversations(prev =>
      prev.map(c => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          lastMessageAt: timeStr,
          messages: [
            ...c.messages,
            { id: `m-${Date.now()}`, sender: "ia", text, timestamp: timeStr },
          ],
        };
      })
    );
  };

  const openWhatsAppConversation = (orderIdOrConvId: string) => {
    const targetConv = conversations.find(
      c => c.id === orderIdOrConvId || c.orderId === orderIdOrConvId
    );

    const convId = targetConv ? targetConv.id : orderIdOrConvId;
    setSelectedConversationId(convId);
    eventBus.publish("necto_navigate_pedidos", { section: "operacion" });
  };

  const sendWhatsAppStatusAlert = (orderId: string, customMessage: string) => {
    const timeStr = nowTime();
    setConversations(prevConvs =>
      prevConvs.map(c => {
        if (c.orderId === orderId) {
          const newMsg: ChatMessage = {
            id: `m-alert-${Date.now()}`,
            sender: "humano",
            authorName: currentOperatorName,
            text: customMessage,
            timestamp: timeStr,
          };
          return {
            ...c,
            lastMessageAt: timeStr,
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );
  };

  const value = useMemo(
    () => ({
      conversations,
      selectedConversationId,
      setSelectedConversationId,
      currentOperatorName,
      transitionConversation,
      takeControl,
      releaseToAI,
      resolveConversation,
      sendOperatorMessage,
      flagForHandoff,
      markConversationRead,
      confirmDraftOrder,
      simulateCustomerMessage,
      simulateAIReply,
      openWhatsAppConversation,
      sendWhatsAppStatusAlert,
    }),
    [conversations, selectedConversationId, currentOperatorName]
  );

  return <ChannelsContext.Provider value={value}>{children}</ChannelsContext.Provider>;
};

export function useChannels(): ChannelsContextType {
  const ctx = useContext(ChannelsContext);
  if (!ctx) {
    throw new Error("useChannels must be used within a ChannelsProvider");
  }
  return ctx;
}
