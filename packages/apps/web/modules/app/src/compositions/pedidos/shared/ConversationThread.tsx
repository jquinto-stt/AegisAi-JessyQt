import React, { useEffect, useRef, useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { Conversation } from "../types";
import { Bot, User, Send, Lock, Sparkles } from "lucide-react";
import { Button } from "@/elements";

/**
 * Hilo de chat de una conversación WhatsApp/IA (Human-in-the-Loop).
 *
 * Renderiza las burbujas por remitente (cliente / IA / humano) y una barra de
 * entrada CONTEXTUAL según el estado del control:
 *  - HUMANO_ATENDIENDO + soy el dueño → caja de texto habilitada.
 *  - HUMANO_ATENDIENDO + otro operador → bloqueado ("Atendida por …").
 *  - IA_ATENDIENDO / REQUIERE_INTERVENCION / RESUELTO → input deshabilitado con
 *    la pista de que hay que "Tomar control" (esto lo ofrece la ControlBar).
 *
 * La exclusión mutua (IA vs humano) la garantiza el contexto: sendOperatorMessage
 * sólo agrega el mensaje si status === HUMANO_ATENDIENDO.
 */
export const ConversationThread: React.FC<{ conversation: Conversation }> = ({ conversation }) => {
  const { sendOperatorMessage, currentOperatorName, simulateCustomerMessage, simulateAIReply } = usePedidos();
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const isMine =
    conversation.status === "HUMANO_ATENDIENDO" &&
    conversation.controlledBy === currentOperatorName;
  const isHumanByOther =
    conversation.status === "HUMANO_ATENDIENDO" && !isMine;
  const isAI = conversation.status === "IA_ATENDIENDO";

  // Auto-scroll al último mensaje.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.messages.length, conversation.id]);

  const handleSend = () => {
    if (!draft.trim() || !isMine) return;
    sendOperatorMessage(conversation.id, draft);
    setDraft("");
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Mensajes */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-slate-50/60 dark:bg-gray-900/40">
        {conversation.messages.map(msg => {
          const isCustomer = msg.sender === "cliente";
          const isBot = msg.sender === "ia";
          return (
            <div
              key={msg.id}
              className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}
            >
              <div className={`max-w-[78%] ${isCustomer ? "" : "text-right"}`}>
                <div
                  className={[
                    "inline-block px-3.5 py-2 rounded-2xl text-xs font-medium leading-relaxed",
                    isCustomer
                      ? "bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] text-gray-800 dark:text-gray-200 rounded-tl-sm"
                      : isBot
                        ? "bg-orange-50 dark:bg-orange-950/40 border border-orange-200/70 dark:border-orange-900/50 text-orange-900 dark:text-orange-100 rounded-tr-sm"
                        : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-tr-sm",
                  ].join(" ")}
                >
                  {msg.text}
                </div>
                <div className={`flex items-center gap-1 mt-1 text-[10px] text-gray-400 ${isCustomer ? "" : "justify-end"}`}>
                  {isBot && <Bot className="w-3 h-3 text-[#FF3F1A]" />}
                  {msg.sender === "humano" && <User className="w-3 h-3" />}
                  <span>
                    {isCustomer
                      ? conversation.customerName
                      : isBot
                        ? "Asistente IA"
                        : msg.authorName || "Operador"}
                    {" · "}
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Barra de entrada contextual */}
      <div className="flex-none border-t border-slate-200 dark:border-[#374151] p-3 bg-white dark:bg-[#2C2D31]">
        {isMine ? (
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder="Escribe un mensaje al cliente…"
              className="flex-1 resize-none text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#374151] bg-slate-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#FF3F1A] max-h-28"
            />
            <Button
              variant="accent"
              intent="conversation.message.send"
              onClick={handleSend}
              disabled={!draft.trim()}
              className="py-2.5 px-4 text-xs"
            >
              <Send className="w-4 h-4" /> Enviar
            </Button>
          </div>
        ) : isHumanByOther ? (
          <div className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-gray-400">
            <Lock className="w-4 h-4" />
            <span>Atendida por {conversation.controlledBy}</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-gray-400">
            <Sparkles className="w-4 h-4 text-[#FF3F1A]" />
            <span>
              {isAI
                ? "La IA está atendiendo. Toma el control para escribir."
                : "Toma el control para intervenir en esta conversación."}
            </span>
          </div>
        )}

        {/* Controles de demo (sólo mockup): simular mensajes entrantes */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dashed border-slate-200 dark:border-gray-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300 dark:text-gray-600">Demo:</span>
          <Button
            variant="ghost"
            intent="conversation.demo.customer-message"
            onClick={() => simulateCustomerMessage(conversation.id, "Mensaje de prueba del cliente.")}
            className="text-[10px] font-bold text-gray-400 hover:text-[#FF3F1A] transition-colors cursor-pointer"
          >
            + Mensaje cliente
          </Button>
          {isAI && (
            <Button
              variant="ghost"
              intent="conversation.demo.ai-reply"
              onClick={() => simulateAIReply(conversation.id, "Respuesta automática del asistente IA.")}
              className="text-[10px] font-bold text-gray-400 hover:text-[#FF3F1A] transition-colors cursor-pointer"
            >
              + Respuesta IA
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
