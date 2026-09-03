import React, { useEffect, useRef, useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { Conversation, ChatMessage } from "../types";
import {
  Send,
  Lock,
  MessageSquare,
  ShieldCheck,
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
  Activity,
  ShoppingBag,
  CreditCard,
  ChefHat,
  Bike,
  Sparkles,
  Plus,
  MapPin,
  FileText,
  Clock,
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
    confirmDraftOrder,
  } = usePedidos();
  const [draft, setDraft] = useState("");
  const [customerDraft, setCustomerDraft] = useState("");
  const [verifiedMessages, setVerifiedMessages] = useState<
    Record<string, "VERIFICADO_OK" | "RECHAZADO" | "PENDIENTE_VERIFICACION">
  >({});
  const endRef = useRef<HTMLDivElement | null>(null);

  const handleSendCustomerSimulated = (textToSend?: string) => {
    const text = textToSend || customerDraft;
    if (!text.trim()) return;
    simulateCustomerMessage(conversation.id, text);
    if (!textToSend) setCustomerDraft("");
  };

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

    // 3. Confirm draft order and deposit into live Kanban queue!
    const effectiveOrderId = confirmDraftOrder(conversation.id) || conversation.orderId || "PED-1025";

    // 4. Send operator confirmation message
    const formattedAmount = `$${amount.toLocaleString("es-CO")} COP`;
    sendOperatorMessage(
      conversation.id,
      `¡Transferencia ${bank} por ${formattedAmount} (${ref}) verificada en cuenta bancaria! Tu pedido #${effectiveOrderId} ha sido ingresado al horno y está en preparación. ¡Muchas gracias!`
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

        {/* Active Draft Order Floating Banner */}
        {conversation.draftOrder && !conversation.orderId && (
          <div className="mx-2 my-1 p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 text-xs flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <ShoppingBag className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-none" />
              <div className="truncate">
                <span className="font-bold text-amber-900 dark:text-amber-200">
                  Borrador en Chat:
                </span>{" "}
                <span className="text-amber-800 dark:text-amber-300">
                  {conversation.draftOrder.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-none">
              <span className="font-mono font-extrabold text-amber-700 dark:text-amber-300">
                ${conversation.draftOrder.total.toLocaleString("es-CO")} COP
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full font-bold">
                Sin ingresar a Cocina
              </span>
            </div>
          </div>
        )}

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
                {/* Header Tag for Auto and Admin */}
                {isBot && (
                  <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-emerald-600/15 text-[10px] font-bold text-[#008069] dark:text-[#25D366]">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Auto-Respuesta (WhatsApp)</span>
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
            <MessageSquare className="w-3 h-3 text-[#008069] dark:text-[#00A884]" />
            Plantillas:
          </span>
          {[
            { icon: <ChefHat className="w-3.5 h-3.5" />, label: "En Preparación", text: "¡Hola! Tu comanda ya ingresó a cocina y nuestro equipo la está preparando con el mayor cuidado." },
            { icon: <CreditCard className="w-3.5 h-3.5" />, label: "Solicitar Comprobante", text: "Hola, por favor compártenos el comprobante bancario para validar la acreditación de tu pago." },
            { icon: <Bike className="w-3.5 h-3.5" />, label: "En Camino", text: "¡Tu pedido va en camino con nuestro repartidor! Te avisaremos apenas esté en tu puerta." },
            { icon: <Sparkles className="w-3.5 h-3.5" />, label: "Agradecimiento", text: "¡Muchas gracias por elegirnos! Esperamos que disfrutes tu pedido. Cualquier duda quedamos a tu orden." },
          ].map(tpl => (
            <button
              key={tpl.label}
              type="button"
              onClick={() => {
                if (!isMine) takeControl(conversation.id);
                setDraft(tpl.text);
              }}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#111B21] hover:bg-[#EFE6D3] dark:hover:bg-[#37332A] text-[#111B21] dark:text-zinc-200 hover:text-[#008069] dark:hover:text-[#00A884] border border-zinc-200/80 dark:border-zinc-700 text-[11px] font-bold flex items-center gap-1.5 flex-none transition-all cursor-pointer shadow-2xs"
            >
              {tpl.icon}
              <span>{tpl.label}</span>
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
          <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-300 text-xs">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              <span>La IA está atendiendo esta conversación. Toma el control para responder.</span>
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

        {/* Demo Simulator Interactive Multi-Turn Panel */}
        <div className="p-2.5 rounded-2xl bg-[#ECECEC] dark:bg-[#182229] border border-zinc-200 dark:border-zinc-700/80 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-500 uppercase">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#008069] dark:text-[#00A884]" />
              <span>Simulador de Cliente</span>
            </span>
            <span className="text-zinc-400 lowercase font-normal">escribe libremente o usa los escenarios:</span>
          </div>

          {/* Free-text customer input */}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={customerDraft}
              onChange={e => setCustomerDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSendCustomerSimulated();
                }
              }}
              placeholder='Escribe como el cliente (ej: "Agrega salsa", "¿Tienen queso?", "Enviar a Calle 72")...'
              className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#202C33] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-[#00A884]"
            />
            <button
              type="button"
              onClick={() => handleSendCustomerSimulated()}
              disabled={!customerDraft.trim()}
              className="px-3 py-1.5 rounded-xl bg-[#008069] hover:bg-[#006e5a] text-white font-bold text-xs shadow-2xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 flex-none"
            >
              <span>Enviar como Cliente</span>
              <Send className="w-3 h-3" />
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-700/60 pb-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => setSimCategory("flujo")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                simCategory === "flujo"
                  ? "bg-[#008069] text-white shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700/50"
              }`}
            >
              <ShoppingBag className="w-3 h-3" />
              <span>Flujo de Pedido (Paso 1-4)</span>
            </button>

            <button
              type="button"
              onClick={() => setSimCategory("hitl")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                simCategory === "hitl"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700/50"
              }`}
            >
              <User className="w-3 h-3" />
              <span>Casos HITL / Humano</span>
            </button>

            <button
              type="button"
              onClick={() => setSimCategory("faq")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                simCategory === "faq"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700/50"
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Consultas IA / FAQ</span>
            </button>
          </div>

          {/* Action Buttons for active category */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 text-[11px]">
            {simCategory === "flujo" && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    handleSendCustomerSimulated(
                      "¡Hola! Quiero pedir 6 empanadas de carne a cuchillo al horno y 2 gaseosas cola porfa."
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#202C33] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 font-bold flex items-center gap-1.5 flex-none cursor-pointer shadow-2xs transition-all"
                  title="Paso 1: El cliente pide empanadas -> La IA genera la comanda y ofrece upsells"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#008069] dark:text-[#00A884]" />
                  <span>1. Pedir 6 Empanadas</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSendCustomerSimulated(
                      "Sí porfa, agrégale 1 salsa chimichurri especial de la casa a la comanda."
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#202C33] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 font-bold flex items-center gap-1.5 flex-none cursor-pointer shadow-2xs transition-all"
                  title="Paso 2: El cliente acepta upsell -> La IA actualiza la comanda y recalcula montos"
                >
                  <Plus className="w-3.5 h-3.5 text-[#008069] dark:text-[#00A884]" />
                  <span>2. Agregar Chimichurri</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSendCustomerSimulated(
                      "Es para enviar a Calle 72 # 11-45 (Apto 402). Voy a pagar por Nequi."
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#202C33] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 font-bold flex items-center gap-1.5 flex-none cursor-pointer shadow-2xs transition-all"
                  title="Paso 3: El cliente da dirección y pago -> La IA brinda datos de transferencia"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#008069] dark:text-[#00A884]" />
                  <span>3. Dirección & Pago</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    simulateCustomerMessage(
                      conversation.id,
                      "Listo! Ya les transferí los $45.500 por Nequi. Aquí les adjunto la captura del comprobante.",
                      { isReceipt: true }
                    );
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#202C33] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 font-bold flex items-center gap-1.5 flex-none cursor-pointer shadow-2xs transition-all"
                  title="Paso 4: El cliente manda comprobante -> La IA pide verificación humana y genera tarjeta de seguridad"
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#008069] dark:text-[#00A884]" />
                  <span>4. Enviar Comprobante</span>
                </button>
              </>
            )}

            {simCategory === "hitl" && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    handleSendCustomerSimulated("Necesito hablar con una persona real o asesor, por favor.")
                  }
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#202C33] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 font-bold flex items-center gap-1.5 flex-none cursor-pointer shadow-2xs transition-all"
                  title="Disparador HITL: Cliente pide explícitamente ser atendido por un humano"
                >
                  <User className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pedir Operador Humano</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSendCustomerSimulated("¡Mi pedido está muy demorado! Ya pasaron 45 minutos y no llega nada.")
                  }
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#202C33] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 font-bold flex items-center gap-1.5 flex-none cursor-pointer shadow-2xs transition-all"
                  title="Disparador HITL: Reclamo por demora o incidencia de servicio"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Reclamo / Incidencia</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSendCustomerSimulated("Hola, necesitamos cotización para un evento corporativo de 50 personas con Factura Electrónica y RUT.")
                  }
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#202C33] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 font-bold flex items-center gap-1.5 flex-none cursor-pointer shadow-2xs transition-all"
                  title="Disparador HITL: Pedido corporativo fuera de alcance o facturación especial"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  <span>Factura / Evento Especial</span>
                </button>
              </>
            )}

            {simCategory === "faq" && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    handleSendCustomerSimulated(
                      "¿Las empanadas de carne tienen cebolla o queso? Tengo intolerancia alimentaria."
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#202C33] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 font-medium flex items-center gap-1.5 flex-none cursor-pointer shadow-2xs transition-all"
                  title="Pregunta sobre alérgenos e ingredientes"
                >
                  <Shield className="w-3.5 h-3.5 text-sky-500" />
                  <span>Alérgenos e Ingredientes</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSendCustomerSimulated("¿Cuánto tiempo demora el delivery a la Calle 72?")
                  }
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#202C33] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 font-medium flex items-center gap-1.5 flex-none cursor-pointer shadow-2xs transition-all"
                  title="Pregunta sobre tiempos y horas de entrega"
                >
                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                  <span>Tiempos de Entrega</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
