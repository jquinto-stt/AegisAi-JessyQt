import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { MessageSquare, X, Check, Edit2, ArrowRight } from "lucide-react";
import { OrderItem } from "../types";
import { Button } from "@/elements";

export const AIInterpretationModal: React.FC = () => {
  const { aiModalOrder, setAiModalOrder, approveAIOrder, openWhatsAppConversation } = usePedidos();

  if (!aiModalOrder) return null;

  const [items, setItems] = useState<OrderItem[]>(aiModalOrder.items);
  const [isEditing, setIsEditing] = useState(false);

  const updateQty = (idx: number, delta: number) => {
    setItems(prev => {
      const next = [...prev];
      const newQ = next[idx].quantity + delta;
      if (newQ <= 0) return next.filter((_, i) => i !== idx);
      next[idx] = { ...next[idx], quantity: newQ };
      return next;
    });
  };

  const handleApprove = () => {
    approveAIOrder(aiModalOrder.id, items);
    setAiModalOrder(null);
  };

  const totalCalculated = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#212121]/60 backdrop-blur-xs transition-opacity"
        onClick={() => setAiModalOrder(null)}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#18181B] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 z-10 space-y-4 sm:space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#212121] dark:text-zinc-100">
                Revisión de Interpretación IA
              </h3>
              <p className="text-xs text-zinc-400">
                Pedido #{aiModalOrder.id} · Canal: <span className="capitalize">{aiModalOrder.channel}</span>
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            intent="ai-modal.close"
            onClick={() => setAiModalOrder(null)}
            className="w-8 h-8 p-0 text-zinc-400"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Original Message Quote */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
              Mensaje Original Recibido:
            </span>
            <button
              type="button"
              onClick={() => openWhatsAppConversation(aiModalOrder.id)}
              className="text-xs font-bold text-[#190088] dark:text-[#97D6DF] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Ver en WhatsApp</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-2xl text-xs text-zinc-800 dark:text-zinc-200 font-medium italic">
            "{aiModalOrder.aiRawMessage || "Sin mensaje de texto crudo disponible"}"
          </div>
        </div>

        {/* AI Confidence Notice */}
        <div className="flex items-center justify-between bg-[#190088]/10 dark:bg-[#190088]/20 border border-[#190088]/20 p-3 rounded-2xl text-xs text-[#190088] dark:text-[#97D6DF]">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#190088] dark:text-[#97D6DF] flex-none" />
            <span>
              Confianza de interpretación: <strong>{aiModalOrder.aiConfidence}</strong>
            </span>
          </div>
          <span className="text-[10px] font-bold bg-white dark:bg-zinc-800 text-[#190088] dark:text-[#97D6DF] px-2 py-0.5 rounded-full border border-[#190088]/20">
            Revisión Humana
          </span>
        </div>

        {/* Structured Products Proposal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
              Estructuración Propuesta:
            </span>
            <Button
              variant="ghost"
              intent="ai-modal.edit-toggle"
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs font-bold text-[#190088] dark:text-[#97D6DF] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3 h-3" /> {isEditing ? "Listo" : "Editar pedido"}
            </Button>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
            {items.map((it, idx) => (
              <div
                key={idx}
                className="p-3 bg-white dark:bg-[#18181B] flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-[#212121] dark:text-zinc-100">
                    {it.name} {it.option ? `(${it.option})` : ""}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    ${it.unitPrice.toLocaleString("es-CO")} c/u
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                      <Button
                        variant="ghost"
                        intent="ai-modal.qty.decrement"
                        onClick={() => updateQty(idx, -1)}
                        className="p-0 w-5 h-5 flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 rounded"
                      >
                        -
                      </Button>
                      <span className="font-mono font-extrabold px-1">{it.quantity}</span>
                      <Button
                        variant="ghost"
                        intent="ai-modal.qty.increment"
                        onClick={() => updateQty(idx, 1)}
                        className="p-0 w-5 h-5 flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 rounded"
                      >
                        +
                      </Button>
                    </div>
                  ) : (
                    <span className="font-mono font-extrabold text-sm text-[#190088] dark:text-[#97D6DF]">
                      ×{it.quantity}
                    </span>
                  )}
                  <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 w-20 text-right">
                    ${(it.unitPrice * it.quantity).toLocaleString("es-CO")}
                  </span>
                </div>
              </div>
            ))}

            <div className="p-3 bg-zinc-50 dark:bg-zinc-900 flex justify-between items-center text-xs font-bold">
              <span>Total calculado:</span>
              <span className="font-mono text-sm text-[#190088] dark:text-[#97D6DF]">
                ${totalCalculated.toLocaleString("es-CO")}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            intent="ai-modal.cancel"
            onClick={() => setAiModalOrder(null)}
            className="flex-1 py-2.5 px-4 text-xs"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            intent="ai-modal.approve"
            onClick={handleApprove}
            className="flex-2 py-2.5 px-4 text-xs bg-[#190088] hover:bg-[#14006e] text-white font-bold"
          >
            <Check className="w-4 h-4 text-white" /> Aprobar e Ingresar Pedido
          </Button>
        </div>
      </div>
    </div>
  );
};
