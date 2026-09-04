import React, { useState, useEffect } from "react";
import { X, Calculator, AlertTriangle, CheckCircle2 } from "lucide-react";
import { InventoryProduct } from "../types/inventory.types";

interface StockCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: InventoryProduct | null;
  onSubmit: (params: {
    productId: string;
    countedStock: number;
    notes?: string;
  }) => Promise<void>;
}

export const StockCountModal: React.FC<StockCountModalProps> = ({
  isOpen,
  onClose,
  product,
  onSubmit,
}) => {
  const [countedStock, setCountedStock] = useState<string>("0");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setCountedStock(String(product.stockActual));
      setNotes("");
      setErrorMessage(null);
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const numCounted = parseFloat(countedStock) || 0;
  const diff = numCounted - product.stockActual;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numCounted < 0) {
      setErrorMessage("El conteo no puede ser un valor negativo.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        productId: product.id,
        countedStock: numCounted,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Error al registrar el conteo físico.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#190088]/10 dark:bg-[#190088]/20 text-[#190088] dark:text-[#97D6DF] border border-[#190088]/20 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">
                Ajuste por Conteo Físico
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Conciliación y ajuste de existencias físicas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-none" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Product Overview */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80 space-y-1">
            <span className="font-mono text-xs font-bold text-[#190088] dark:text-[#97D6DF]">{product.sku}</span>
            <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{product.name}</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              📍 Ubicación: <span className="font-medium text-zinc-700 dark:text-zinc-300">{product.locationName}</span>
            </p>
          </div>

          {/* Current vs Counted Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/60 text-center font-mono">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-400">Stock Registrado</span>
              <p className="text-base font-black text-zinc-700 dark:text-zinc-300">
                {product.stockActual} <span className="text-xs font-normal">{product.unit}</span>
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-400">Diferencia Neta</span>
              <p
                className={`text-base font-black ${
                  diff === 0
                    ? "text-zinc-500"
                    : diff > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-[#FF3F1A]"
                }`}
              >
                {diff > 0 ? `+${diff}` : diff} <span className="text-xs font-normal">{product.unit}</span>
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 font-mono uppercase">
              Nuevo Conteo Físico Real ({product.unit}) *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={countedStock}
              onChange={(e) => setCountedStock(e.target.value)}
              className="w-full text-sm font-mono font-black rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-[#190088]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 font-mono uppercase">
              Motivo o Justificación del Ajuste
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Conteo cíclico mensual / Cuadre de merma"
              className="w-full text-xs sm:text-sm font-medium rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-[#190088]"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#190088] hover:bg-[#150073] text-xs font-extrabold text-white transition-all shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                "Ajustando..."
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar Conteo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
