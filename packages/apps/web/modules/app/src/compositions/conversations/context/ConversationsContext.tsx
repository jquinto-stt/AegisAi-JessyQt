/**
 * Conversaciones — Dominio del canal conversacional
 * =================================================
 *
 * Este dominio posee **el hilo**: los interlocutores, los mensajes y los no
 * leídos de **una** sede. Nada más.
 *
 * ── Qué NO hace este archivo, a propósito ───────────────────────────────────
 *
 *   · No administra la tienda                  → `businessId` como frontera (§2)
 *   · No administra pedidos                    → §9: el chat no es Pedidos
 *   · No administra contactos comerciales      → §10: el hilo no es un CRM
 *   · No habla con Meta                        → §8: no hay webhooks ni tokens
 *   · No implementa el asistente de IA         → el asistente es del canal, pero
 *                                                es otra capacidad (§7)
 *
 * Cada límite es deliberado. Si "para terminar la tarea" se metiera aquí una
 * orden, un contacto con etiquetas o una llamada a la API de Meta, el canal
 * dejaría de ser una capacidad reemplazable y pasaría a ser el "god module" que
 * §29 prohíbe.
 *
 * ── Relación con Pedidos ────────────────────────────────────────────────────
 *
 * Ninguna. Ni importa ni es importado. El canal **emite hechos** al bus
 * (`message.received`, `message.sent`) y un módulo futuro decidirá si le
 * interesan (§14). Es la misma dirección que usa Pedidos con
 * `pedidos.order.lifecycle`: el emisor no conoce a nadie.
 *
 * ── Persistencia ────────────────────────────────────────────────────────────
 *
 * `localStorage` bajo `necto_conversations_v1` (hilos) y `necto_messages_v1`
 * (mensajes), **cada registro con su `businessId` dentro**. Antes este proyecto
 * tenía almacenes planos y dos tiendas veían lo mismo; con el id dentro, cada sede
 * lee lo suyo y el registro podría vivir fuera del navegador sin cambiar el
 * contrato (mismo criterio que `Order.businessId` y `ChannelConnection.businessId`).
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import type {
  AssignedOperator,
  AttentionStatus,
  Conversation,
  ConversationEventPayload,
  ConversationMessage,
  ConversationMessageContent,
} from "@/contracts/conversation.contract";
import { eventBus } from "@/infrastructure/eventBus";
import {
  buildDemoConversations,
  buildDemoMessages,
  demoScriptIndex,
  shouldSeedDemoConversations,
} from "../mock-conversations";

const CONVERSATIONS_KEY = "necto_conversations_v1";
const MESSAGES_KEY = "necto_messages_v1";

/* ── Contrato del contexto ─────────────────────────────────────────────────── */

export interface ConversationsContextValue {
  /** Hilos de la sede activa, el más reciente primero. */
  conversations: Conversation[];
  /**
   * Mensajes de la sede activa.
   *
   * ⚠️ Se exponen **todos**, no uno por hilo. El consumidor deriva el hilo abierto
   * filtrando por `conversationId`, y eso es lo que hace imposible que la pantalla
   * pinte una versión del hilo distinta de la guardada: hay una sola colección y
   * todo lo que se ve sale de ella.
   */
  messages: ConversationMessage[];
  /** ¿Se están leyendo del almacén? Evita el parpadeo del vacío al cambiar de sede. */
  isLoading: boolean;
  /** Total de mensajes entrantes sin leer en esta sede (para el badge de la lista). */
  unreadTotal: number;
  /**
   * Marca un hilo como abierto: lo da por leído.
   *
   * ⚠️ **No devuelve el hilo.** Antes lo devolvía, y eso invitaba a guardarlo en un
   * estado local — que es exactamente el bug que tuvo esta pantalla: `sendMessage`
   * y la lectura posterior partían del mismo render, así que el hilo recién
   * enviado se pintaba con el estado anterior. Quien quiera el hilo lo **deriva**
   * de `conversations` + `messages`, que son la única fuente.
   */
  openThread: (conversationId: string) => void;
  /**
   * Envía un mensaje de la tienda.
   *
   * ⚠️ Es la **única** vía de escritura del hilo. Nadie añade mensajes al almacén
   * por su cuenta: así el último mensaje del hilo, su hora y la vista previa no
   * pueden divergir de los mensajes reales.
   */
  sendMessage: (conversationId: string, content: ConversationMessageContent) => ConversationMessage | null;
  /** Actualiza el estado de atención operativa del hilo. */
  updateAttentionStatus: (conversationId: string, status: AttentionStatus) => void;
  /** Asigna o desasigna un operador responsable de la atención. */
  assignOperator: (conversationId: string, operator: AssignedOperator | null) => void;
  /** Actualiza las notas operativas del hilo. */
  updateNotes: (conversationId: string, notes: string) => void;
}

const ConversationsContext = createContext<ConversationsContextValue | undefined>(undefined);

/* ── Persistencia ──────────────────────────────────────────────────────────── */

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (e) {
    console.warn(`Error reading ${key} from storage`, e);
    return [];
  }
}

function writeArray<T>(key: string, value: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error writing ${key} to storage`, e);
  }
}

/**
 * Lee los hilos de una sede.
 *
 * ⚠️ El filtro por `businessId` va **aquí** y no en el consumidor: si cada
 * pantalla filtrara, una que lo olvidara enseñaría el inbox de otra tienda (§6).
 * La colección que expone el contexto ya es la de la sede activa.
 */
function loadConversations(businessId: string): Conversation[] {
  return readArray<Conversation>(CONVERSATIONS_KEY)
    .filter(c => c && typeof c === "object" && c.businessId === businessId)
    .map((c, idx) => ({
      ...c,
      counterpart: {
        ...c.counterpart,
        avatar: c.counterpart?.avatar || `/images/user/user-0${(idx % 6) + 1}.jpg`,
        role: c.counterpart?.role || "Cliente",
      },
    }))
    .sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
}

/** Lee **todos** los mensajes de la sede activa. */
function loadMessages(businessId: string): ConversationMessage[] {
  const ids = new Set(loadConversations(businessId).map(c => c.id));
  return readArray<ConversationMessage>(MESSAGES_KEY).filter(m => m && ids.has(m.conversationId));
}

/** Escribe un subconjunto preservando los registros de **otras** sedes. */
function mergeWithOtherStores<T extends { businessId?: string; conversationId?: string }>(
  key: string,
  currentStore: T[],
  belongsToStore: (record: T) => boolean
): void {
  const others = readArray<T>(key).filter(r => !belongsToStore(r));
  writeArray(key, [...others, ...currentStore]);
}

/* ── Provider ──────────────────────────────────────────────────────────────── */

export interface ConversationsProviderProps {
  /**
   * Sede activa. `null` cuando la cuenta aún no tiene ninguna: sin tienda no hay
   * canal conversacional (§2 — el canal pertenece a una sede).
   */
  businessId: string | null;
  children: ReactNode;
}

export function ConversationsProvider({ businessId, children }: ConversationsProviderProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Al cambiar de sede se recarga el subconjunto de esa tienda. Depender de
  // `businessId` (y no cargar una sola vez) es lo que impide que al cambiar de
  // sede se sigan viendo las conversaciones de la anterior.
  useEffect(() => {
    if (!businessId) {
      setConversations([]);
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let loaded = loadConversations(businessId);

    // La demostración se siembra **sólo** si esta sede no tiene nada, y sólo
    // entonces se escribe: una sede con conversaciones no las recibe encima.
    if (shouldSeedDemoConversations(loaded)) {
      loaded = buildDemoConversations(businessId);
      const seededMessages = loaded.flatMap(c => buildDemoMessages(businessId, demoScriptIndex(c.id)));

      mergeWithOtherStores<Conversation>(CONVERSATIONS_KEY, loaded, r => r.businessId === businessId);
      mergeWithOtherStores<ConversationMessage>(MESSAGES_KEY, seededMessages, r =>
        loaded.some(c => c.id === r.conversationId)
      );

      setConversations(loaded);
      setMessages(seededMessages);
    } else {
      setConversations(loaded);
      setMessages(loadMessages(businessId));
    }

    setIsLoading(false);
  }, [businessId]);

  /** Publica el hecho en el bus. El canal **emite**; no ejecuta efectos de terceros (§6). */
  const publish = useCallback(
    (name: ConversationEventPayload["name"], conversationId: string) => {
      if (!businessId) return;
      eventBus.publish("canal.conversation.lifecycle", {
        name,
        conversationId,
        businessId,
        channelType: "whatsapp",
        at: new Date().toISOString(),
      });
    },
    [businessId]
  );

  const openThread = useCallback<ConversationsContextValue["openThread"]>(
    conversationId => {
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) return;

      publish("conversation.opened", conversationId);

      // Marcar como leído es parte de abrir: el operador ya lo está viendo. Si el
      // hilo no tenía nada pendiente, no se escribe nada — el almacén no se toca
      // para reafirmar lo que ya decía.
      if (conversation.unreadCount === 0) return;

      setConversations(prev => {
        const next = prev.map(c => (c.id === conversationId ? { ...c, unreadCount: 0 } : c));
        mergeWithOtherStores<Conversation>(CONVERSATIONS_KEY, next, r => r.businessId === businessId);
        return next;
      });
    },
    [conversations, businessId, publish]
  );

  const sendMessage = useCallback<ConversationsContextValue["sendMessage"]>(
    (conversationId, content) => {
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) return null;

      const at = new Date().toISOString();
      const message: ConversationMessage = {
        id: `msg_${conversationId}_${Date.parse(at)}_${Math.random().toString(36).slice(2, 7)}`,
        conversationId,
        direction: "outgoing",
        author: "store",
        content,
        sentAt: at,
        // Recién salido: todavía en camino. Es el único estado honesto en el
        // instante del envío — no hay transporte que pueda confirmar más.
        status: "sending",
      };

      setConversations(prev => {
        const next = prev
          .map(c =>
            c.id === conversationId
              ? {
                  ...c,
                  lastMessagePreview: previewOf(content),
                  lastMessageAt: at,
                }
              : c
          )
          .sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
        mergeWithOtherStores<Conversation>(CONVERSATIONS_KEY, next, r => r.businessId === businessId);
        return next;
      });

      setMessages(prev => {
        const next = [...prev, message];
        mergeWithOtherStores<ConversationMessage>(
          MESSAGES_KEY,
          next.filter(m => conversations.some(c => c.id === m.conversationId)),
          r => conversations.some(c => c.id === r.conversationId)
        );
        return next;
      });

      publish("message.sent", conversationId);

      return message;
    },
    [conversations, businessId, publish]
  );

  const updateAttentionStatus = useCallback<ConversationsContextValue["updateAttentionStatus"]>(
    (conversationId, status) => {
      setConversations(prev => {
        const next = prev.map(c => (c.id === conversationId ? { ...c, attentionStatus: status } : c));
        mergeWithOtherStores<Conversation>(CONVERSATIONS_KEY, next, r => r.businessId === businessId);
        return next;
      });
    },
    [businessId]
  );

  const assignOperator = useCallback<ConversationsContextValue["assignOperator"]>(
    (conversationId, operator) => {
      setConversations(prev => {
        const next = prev.map(c => (c.id === conversationId ? { ...c, assignedTo: operator } : c));
        mergeWithOtherStores<Conversation>(CONVERSATIONS_KEY, next, r => r.businessId === businessId);
        return next;
      });
    },
    [businessId]
  );

  const updateNotes = useCallback<ConversationsContextValue["updateNotes"]>(
    (conversationId, notes) => {
      setConversations(prev => {
        const next = prev.map(c => (c.id === conversationId ? { ...c, notes } : c));
        mergeWithOtherStores<Conversation>(CONVERSATIONS_KEY, next, r => r.businessId === businessId);
        return next;
      });
    },
    [businessId]
  );

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations]
  );

  const value = useMemo<ConversationsContextValue>(
    () => ({
      conversations,
      messages,
      isLoading,
      unreadTotal,
      openThread,
      sendMessage,
      updateAttentionStatus,
      assignOperator,
      updateNotes,
    }),
    [
      conversations,
      messages,
      isLoading,
      unreadTotal,
      openThread,
      sendMessage,
      updateAttentionStatus,
      assignOperator,
      updateNotes,
    ]
  );

  return <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>;
}

/* ── Selectores derivados ──────────────────────────────────────────────────── */

/**
 * Vista previa de un mensaje para la lista.
 *
 * ⚠️ Un adjunto **no** se resume con su texto interno: "📷 Foto" dice más que el
 * nombre del archivo, y "📄 Lista-precios.pdf" dice ambas cosas. Se resuelve aquí
 * para que la lista y el encabezado no inventen cada uno su forma de resumir.
 */
export function previewOf(content: ConversationMessageContent): string {
  switch (content.kind) {
    case "text":
      return content.body;
    case "image":
      return content.caption ? `📷 ${content.caption}` : "📷 Foto";
    case "document":
      return `📄 ${content.fileName}`;
    case "audio":
      return `🎤 Audio (${content.durationLabel})`;
  }
}

/**
 * Filtra los hilos por texto libre.
 *
 * Busca en lo que el operador tiene delante —nombre, teléfono y último
 * mensaje—, que es exactamente lo que se ve en la lista. Buscar en el cuerpo de
 * todos los mensajes devolvería hilos cuyo resultado no se puede señalar en
 * pantalla, que es peor que no encontrarlos.
 */
export function filterConversations(
  conversations: readonly Conversation[],
  query: string
): Conversation[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...conversations];

  return conversations.filter(c => {
    const name = c.counterpart.name.toLowerCase();
    const phone = c.counterpart.phone.toLowerCase();
    const preview = c.lastMessagePreview.toLowerCase();
    return name.includes(q) || phone.includes(q) || preview.includes(q);
  });
}

export function useConversations(): ConversationsContextValue {
  const context = useContext(ConversationsContext);
  if (!context) {
    throw new Error("useConversations must be used within a ConversationsProvider");
  }
  return context;
}
