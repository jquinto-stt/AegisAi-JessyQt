import React, { useEffect, useRef, useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { Conversation, ChatMessage } from "../types";
import {
  Send,
  Lock,
  Sparkles,
  ShieldCheck,
  Bot,
  User,
  CheckCheck,
  Smile,
  Paperclip,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Receipt,
  FileCheck2,
  AlertTriangle,
  Smartphone,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/elements";

export const ConversationThread: React.FC<{ conversation: Conversation }> = ({ conversation }) => {
  const {
    sendOperatorMessage,
    currentOperatorName,
    simulateCustomerMessage,
    simulateAIReply,
    takeControl,
    confirmOrder,
  } = usePedidos();
  const [draft, setDraft] = useState("");
  const [verifiedMessages, setVerifiedMessages] = useState<Record<string, "VERIFICADO_OK" | "RECHAZADO">>({});
  const endRef = useRef<HTMLDivElement | null>(null);

  const isMine =
    conversation.status === "HUMANO_ATENDIENDO" &&
    conversation.controlledBy === currentOperatorName;
  const isHumanByOther =
    conversation.status === "HUMANO_ATENDIENDO" && !isMine;
  const isAI = conversation.status === "IA_ATENDIENDO";

  // Auto-scroll to bottom on new message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.messages.length, conversation.id]);

  const handleSend = () => {
    if (!draft.trim() || !isMine) return;
    sendOperatorMessage(conversation.id, draft);
    setDraft("");
  };

  const handleValidateReceipt = (msgId: string, bank: string, amount: number, ref: string) => {
    // 1. Take control as Admin if not already
    if (conversation.status !== "HUMANO_ATENDIENDO") {
      takeControl(conversation.id);
    }
    // 2. Mark message receipt verified
    setVerifiedMessages(prev => ({ ...prev, [msgId]: "VERIFICADO_OK" }));

    // 3. Confirm associated order if exists
    if (conversation.orderId) {
      confirmOrder(conversation.orderId);
    }

    // 4. Send operator confirmation message
    const formattedAmount = `$${amount.toLocaleString("es-CO")} COP`;
    sendOperatorMessage(
      conversation.id,
      `¡Transferencia ${bank} por ${formattedAmount} (${ref}) verificada en cuenta bancaria! Tu pedido #${conversation.orderId || "PED-1021"} ha sido ingresado a cocina. ¡Muchas gracias!`
    );
  };

  const handleRejectReceipt = (msgId: string, bank: string) => {
    if (conversation.status !== "HUMANO_ATENDIENDO") {
      takeControl(conversation.id);
    }
    setVerifiedMessages(prev => ({ ...prev, [msgId]: "RECHAZADO" }));
    sendOperatorMessage(
      conversation.id,
      `Hola, revisamos los movimientos de la cuenta ${bank} y aún no se refleja la acreditación de la transferencia. Por favor valida el débito en tu app bancaria o envíanos un comprobante actualizado.`
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 flex-1 bg-[#EAE6DF] dark:bg-[#0B141A] relative overflow-hidden">
      {/* WhatsApp Wallpaper Texture Overlay */}
      <div
        className="absolute inset-0 opacity-[0.05] dark:opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#000 1.2px, transparent 1.2px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Messages Scroll Feed — with strict height bounds and native scrollbar */}
      <div className="flex-1 min-h-0 h-full overflow-y-auto p-4 sm:p-5 space-y-3 z-10 scrollbar-thin scrollbar-thumb-zinc-400/40 dark:scrollbar-thumb-zinc-600/40">
        {/* Encryption Notice Pill */}
        <div className="flex justify-center my-1.5">
          <div className="bg-[#FFEECD]/90 dark:bg-[#182229]/95 text-[#54656F] dark:text-[#8696A0] text-[11px] px-4 py-1.5 rounded-lg shadow-2xs border border-amber-200/50 dark:border-zinc-800 text-center max-w-md flex items-center justify-center gap-1.5 select-none">
            <Lock className="w-3.5 h-3.5 flex-none text-amber-700 dark:text-amber-400" />
            <span>
              Los mensajes están protegidos con cifrado de extremo a extremo. Canal oficial verificado.
            </span>
          </div>
        </div>

        {/* Date Divider */}
        <div className="flex justify-center my-2">
          <span className="bg-white/90 dark:bg-[#182229]/90 text-[#54656F] dark:text-[#8696A0] text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-md shadow-2xs border border-zinc-200/60 dark:border-zinc-800/60 select-none">
            Hoy
          </span>
        </div>

        {/* Message Bubbles */}
        {conversation.messages.map(msg => {
          const isCustomer = msg.sender === "cliente";
          const isBot = msg.sender === "ia";
          const isOperator = msg.sender === "humano";
          const receiptStatus = verifiedMessages[msg.id] || msg.attachmentMeta?.status || "PENDIENTE_VERIFICACION";

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isCustomer ? "justify-start" : "justify-end"}`}
            >
              {/* Customer Avatar Thumbnail */}
              {isCustomer && conversation.avatarUrl && (
                <img
                  src={conversation.avatarUrl}
                  alt={conversation.customerName}
                  className="w-7 h-7 rounded-full object-cover shadow-2xs border border-white dark:border-zinc-700 flex-none mb-1 hidden sm:block"
                />
              )}

              {/* Message Bubble Body */}
              <div
                className={`relative max-w-[88%] sm:max-w-[78%] px-3.5 py-2 rounded-2xl shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] text-xs leading-relaxed transition-all ${
                  isCustomer
                    ? "bg-[#FFFFFF] dark:bg-[#202C33] text-[#111B21] dark:text-[#E9EDEF] rounded-bl-xs border border-zinc-200/50 dark:border-zinc-700/50"
                    : isBot
                    ? "bg-[#D9FDD3] dark:bg-[#005C4B] text-[#111B21] dark:text-[#E9EDEF] rounded-br-xs border border-emerald-300/30 dark:border-emerald-600/20"
                    : "bg-[#D9FDD3] dark:bg-[#005C4B] text-[#111B21] dark:text-[#E9EDEF] rounded-br-xs border-2 border-[#00A884]"
                }`}
              >
                {/* Header Tag for Bot and Admin */}
                {isBot && (
                  <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-emerald-600/15 text-[10px] font-bold text-[#008069] dark:text-[#25D366]">
                    <Bot className="w-3.5 h-3.5" />
                    <span>Bot Asistente IA (WhatsApp)</span>
                  </div>
                )}

                {isOperator && (
                  <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-emerald-800/20 text-[10px] font-bold text-[#005C4B] dark:text-[#25D366]">
                    <ShieldCheck className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span className="text-rose-700 dark:text-rose-300">
                      {msg.authorName || conversation.controlledBy || "Administrador en Vivo"}
                    </span>
                  </div>
                )}

                {/* Message Text */}
                <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
                  {msg.text}
                </p>

                {/* Colombian Bank Transfer / Nequi / Bancolombia Receipt Card */}
                {msg.attachmentType === "comprobante" && msg.attachmentMeta && (
                  <div className="mt-2.5 p-3 rounded-xl bg-white/90 dark:bg-[#111B21]/90 border border-zinc-200 dark:border-zinc-700 shadow-sm space-y-2.5 text-left">
                    <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-purple-600 text-white flex items-center justify-center">
                          <Smartphone className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100">
                            Comprobante {msg.attachmentMeta.bank}
                          </span>
                          <span className="block text-[10px] text-zinc-500 font-mono">
                            Ref: {msg.attachmentMeta.reference}
                          </span>
                        </div>
                      </div>

                      <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                        ${msg.attachmentMeta.amount?.toLocaleString("es-CO")} COP
                      </span>
                    </div>

                    {/* Receipt Image Preview */}
                    {msg.attachmentUrl && (
                      <div className="relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 max-h-48 bg-zinc-100 dark:bg-zinc-800">
                        <img
                          src={msg.attachmentUrl}
                          alt="Comprobante Nequi"
                          className="w-full h-36 object-cover hover:opacity-95 transition-opacity"
                        />
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono flex items-center gap-1">
                          <Receipt className="w-3 h-3" /> Captura Transferencia
                        </div>
                      </div>
                    )}

                    {/* Financial Security Guard Banner */}
                    {receiptStatus === "PENDIENTE_VERIFICACION" ? (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs space-y-2">
                        <div className="flex items-start gap-1.5 text-[11px] leading-snug font-medium">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-none mt-0.5" />
                          <span>
                            <strong>Validación humana requerida:</strong> El Bot IA no puede certificar saldos bancarios. Un administrador debe corroborar el dinero en Nequi/Bancolombia antes de enviar a cocina.
                          </span>
                        </div>

                        {/* Administrator Action Buttons */}
                        <div className="flex items-center gap-2 pt-1 border-t border-amber-500/20">
                          <button
                            type="button"
                            onClick={() =>
                              handleValidateReceipt(
                                msg.id,
                                msg.attachmentMeta!.bank || "Nequi",
                                msg.attachmentMeta!.amount || 63900,
                                msg.attachmentMeta!.reference || "NQ-8941208B"
                              )
                            }
                            className="flex-1 py-1.5 px-3 rounded-md bg-[#00A884] hover:bg-[#008f70] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Validar en App Bancaria & Cocinar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRejectReceipt(msg.id, msg.attachmentMeta!.bank || "Nequi")}
                            className="py-1.5 px-2.5 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title="Rechazar comprobante"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Rechazar</span>
                          </button>
                        </div>
                      </div>
                    ) : receiptStatus === "VERIFICADO_OK" ? (
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1.5">
                        <FileCheck2 className="w-4 h-4 text-emerald-600" />
                        <span>Pago verificado en app bancaria por Administrador. Comanda enviada a KDS.</span>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] font-bold flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>Comprobante rechazado. No se encontró acreditación en la cuenta.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Timestamp & Delivery Checks */}
                <div
                  className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-mono leading-none ${
                    isCustomer
                      ? "text-[#667781] dark:text-[#8696A0]"
                      : "text-[#667781] dark:text-[#8696A0]"
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {!isCustomer && (
                    <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB] inline flex-none stroke-[2.5]" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* WhatsApp Business Quick Responses & Input Bar */}
      <div className="flex-none p-3 bg-[#F0F2F5] dark:bg-[#202C33] border-t border-zinc-200 dark:border-[#222E35] z-10 space-y-2.5">
        {/* Business Quick Response Templates */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[10px] font-mono font-bold uppercase text-[#54656F] dark:text-[#8696A0] flex items-center gap-1 mr-1 flex-none">
            <Zap className="w-3 h-3 text-[#008069] dark:text-[#00A884]" />
            Plantillas:
          </span>
          {[
            { label: "👨‍🍳 En Preparación", text: "¡Hola! Tu comanda ya ingresó a cocina y nuestro equipo la está preparando con el mayor cuidado." },
            { label: "💳 Solicitar Comprobante", text: "Hola, por favor compártenos el comprobante bancario para validar la acreditación de tu pago." },
            { label: "🛵 En Camino", text: "¡Tu pedido va en camino con nuestro repartidor! Te avisaremos apenas esté en tu puerta." },
            { label: "⭐ Gracias", text: "¡Muchas gracias por elegirnos! Esperamos que disfrutes tu pedido. Cualquier duda quedamos a tu orden." },
          ].map(tpl => (
            <button
              key={tpl.label}
              type="button"
              onClick={() => {
                if (!isMine) takeControl(conversation.id);
                setDraft(tpl.text);
              }}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#111B21] hover:bg-[#EFE6D3] dark:hover:bg-[#37332A] text-[#111B21] dark:text-zinc-200 hover:text-[#008069] dark:hover:text-[#00A884] border border-zinc-200/80 dark:border-zinc-700 text-[11px] font-bold flex-none transition-all cursor-pointer shadow-2xs"
            >
              {tpl.label}
            </button>
          ))}
        </div>

        {isMine ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-2 text-[#54656F] dark:text-[#AEBAC1] hover:text-[#111B21] dark:hover:text-white transition-colors cursor-pointer"
              title="Emojis"
            >
              <Smile className="w-5 h-5" />
            </button>
            <button
              type="button"
              className="p-2 text-[#54656F] dark:text-[#AEBAC1] hover:text-[#111B21] dark:hover:text-white transition-colors cursor-pointer"
              title="Adjuntar comprobante o archivo"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <div className="flex-1">
              <input
                type="text"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Escribe un mensaje oficial como Administrador..."
                className="w-full px-4 py-2.5 text-xs rounded-xl bg-white dark:bg-[#2A3942] text-[#111B21] dark:text-[#E9EDEF] placeholder-[#54656F] dark:placeholder-[#8696A0] focus:outline-none shadow-2xs"
              />
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={!draft.trim()}
              className="w-10 h-10 rounded-full bg-[#00A884] hover:bg-[#008f70] text-white flex items-center justify-center shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-none cursor-pointer"
              title="Enviar mensaje"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        ) : isHumanByOther ? (
          <div className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-[#54656F] dark:text-[#8696A0]">
            <Lock className="w-4 h-4 text-amber-500" />
            <span>Atendido en vivo por {conversation.controlledBy}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white/80 dark:bg-[#2A3942]/80 rounded-xl text-xs text-[#54656F] dark:text-[#AEBAC1]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00A884] flex-none" />
              <span className="text-[11px] font-medium">
                {isAI
                  ? "El Bot IA está respondiendo automáticamente. Si el cliente envía comprobante, transferirá a humano."
                  : "Esta conversación requiere atención. Haz clic en 'Tomar Control' para escribir."}
              </span>
            </div>
            {!isMine && (
              <button
                type="button"
                onClick={() => takeControl(conversation.id)}
                className="px-3 py-1 rounded-lg bg-[#008069] text-white font-bold text-xs hover:bg-[#006e5a] transition-colors cursor-pointer flex-none"
              >
                Tomar Control
              </button>
            )}
          </div>
        )}

        {/* Demo Simulator Quick Actions */}
        <div className="flex items-center gap-2 pt-1 text-[10px] text-[#54656F] dark:text-[#8696A0]">
          <span className="font-bold uppercase tracking-wider font-mono">Simulador:</span>
          <button
            type="button"
            onClick={() => {
              const samples = [
                "¿Me confirman si el repartidor puede llevar cambio de $50.000?",
                "¿Tienen chimichurri suave o solo picante?",
                "Por favor manden servilletas extra que estamos en la oficina.",
                "¿El pedido ya salió del local hacia la Calle 72?",
              ];
              const randomMsg = samples[Math.floor(Math.random() * samples.length)];
              simulateCustomerMessage(conversation.id, randomMsg);
            }}
            className="font-bold text-[#008069] dark:text-[#00A884] hover:underline cursor-pointer inline-flex items-center gap-1"
          >
            <User className="w-3 h-3 inline" />
            <span>+ Mensaje Cliente</span>
          </button>
          <span className="opacity-40">·</span>
          {isAI && (
            <button
              type="button"
              onClick={() => {
                const botSamples = [
                  "¡Claro que sí! He avisado al cadete para que lleve cambio exacto en efectivo.",
                  "¡Anotado! Agregamos salsa criolla suave y servilletas extra a tu paquete.",
                  "Tu pedido #PED-1021 está en fase final de horneado (KDS). En 5 minutos sale con el cadete.",
                ];
                const randomBot = botSamples[Math.floor(Math.random() * botSamples.length)];
                simulateAIReply(conversation.id, randomBot);
              }}
              className="font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              <Bot className="w-3 h-3 inline" />
              <span>+ Respuesta Bot</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
