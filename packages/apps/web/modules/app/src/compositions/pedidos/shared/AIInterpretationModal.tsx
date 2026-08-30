import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { Sparkles, X, Check, Edit2, AlertTriangle, Plus, Trash2, ArrowRight } from "lucide-react";
import { OrderItem } from "../types";

export const AIInterpretationModal: React.FC = () => {
  const { aiModalOrder, setAiModalOrder, approveAIOrder, products } = usePedidos();

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
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => setAiModalOrder(null)}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#2C2D31] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#374151] p-5 sm:p-6 z-10 space-y-4 sm:space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#374151] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#FF3F1A] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-gray-100">
                Revisión de Interpretación IA
              </h3>
              <p className="text-xs text-gray-400">
                Pedido #{aiModalOrder.id} · Canal: <span className="capitalize">{aiModalOrder.channel}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setAiModalOrder(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Original Message Quote */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
            Mensaje Original Recibido:
          </span>
          <div className="bg-slate-50 dark:bg-gray-800/80 border border-slate-200 dark:border-[#374151] p-3.5 rounded-2xl text-xs text-gray-800 dark:text-gray-200 font-medium italic">
            "{aiModalOrder.aiRawMessage || "Sin mensaje de texto crudo disponible"}"
          </div>
        </div>

        {/* AI Confidence Notice */}
        <div className="flex items-center justify-between bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 p-3 rounded-2xl text-xs text-orange-900 dark:text-orange-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF3F1A] flex-none" />
            <span>
              Confianza de interpretación: <strong>{aiModalOrder.aiConfidence}</strong>
            </span>
          </div>
          <span className="text-[10px] font-bold bg-orange-200 dark:bg-orange-900 text-orange-900 dark:text-orange-100 px-2 py-0.5 rounded-full">
            Revisión Humana Obligatoria
          </span>
        </div>

        {/* Structured Products Proposal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
              Estructuración Propuesta:
            </span>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs font-bold text-[#FF3F1A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3 h-3" /> {isEditing ? "Listo" : "Editar pedido"}
            </button>
          </div>

          <div className="border border-slate-200 dark:border-[#374151] rounded-2xl divide-y divide-gray-100 dark:divide-[#374151] overflow-hidden">
            {items.map((it, idx) => (
              <div
                key={idx}
                className="p-3 bg-white dark:bg-[#2C2D31] flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100">
                    {it.name} {it.option ? `(${it.option})` : ""}
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono">
                    ${it.unitPrice.toLocaleString("es-CO")} c/u
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-gray-800 rounded-lg p-1">
                      <button
                        onClick={() => updateQty(idx, -1)}
                        className="w-5 h-5 flex items-center justify-center font-bold text-gray-700 dark:text-gray-200 hover:bg-slate-200 rounded"
                      >
                        -
                      </button>
                      <span className="font-mono font-extrabold px-1">{it.quantity}</span>
                      <button
                        onClick={() => updateQty(idx, 1)}
                        className="w-5 h-5 flex items-center justify-center font-bold text-gray-700 dark:text-gray-200 hover:bg-slate-200 rounded"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span className="font-mono font-extrabold text-sm text-[#FF3F1A]">
                      ×{it.quantity}
                    </span>
                  )}
                  <span className="font-mono font-bold text-gray-800 dark:text-gray-200 w-20 text-right">
                    ${(it.unitPrice * it.quantity).toLocaleString("es-CO")}
                  </span>
                </div>
              </div>
            ))}

            <div className="p-3 bg-slate-50 dark:bg-gray-800/60 flex justify-between items-center text-xs font-extrabold">
              <span>Total calculado:</span>
              <span className="font-mono text-sm text-[#FF3F1A]">
                ${totalCalculated.toLocaleString("es-CO")}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setAiModalOrder(null)}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-slate-100 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleApprove}
            className="flex-2 py-2.5 px-4 rounded-xl bg-[#FF3F1A] hover:bg-[#e03413] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Check className="w-4 h-4" /> Aprobar e Ingresar Pedido
          </button>
        </div>
      </div>
    </div>
  );
};
