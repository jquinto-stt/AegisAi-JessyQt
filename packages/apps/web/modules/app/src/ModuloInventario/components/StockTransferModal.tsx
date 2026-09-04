import React, { useState, useEffect } from "react";
import { X, ArrowRightLeft, MapPin, AlertTriangle, CheckCircle2 } from "lucide-react";
import { InventoryProduct, StockLocation } from "../types/inventory.types";

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: InventoryProduct | null;
  locations: StockLocation[];
  onSubmit: (params: {
    productId: string;
    toLocationId: string;
    quantity: number;
    notes?: string;
  }) => Promise<void>;
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({
  isOpen,
  onClose,
  product,
  locations,
  onSubmit,
}) => {
  const [targetLocationId, setTargetLocationId] = useState("");
  const [quantity, setQuantity] = useState<string>("1");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      // Por defecto seleccionar una ubicación distinta a la actual
      const otherLoc = locations.find((l) => l.id !== product.locationId);
      setTargetLocationId(otherLoc ? otherLoc.id : (locations[0]?.id || ""));
      setQuantity(String(product.stockActual > 0 ? 1 : 0));
      setNotes("");
      setErrorMessage(null);
    }
  }, [product, locations, isOpen]);

  if (!isOpen || !product) return null;

  const numQty = parseFloat(quantity) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLocationId) {
      setErrorMessage("Por favor selecciona una ubicación de destino.");
      return;
    }
    if (targetLocationId === product.locationId) {
      setErrorMessage("La ubicación de destino debe ser diferente a la ubicación actual.");
      return;
    }
    if (numQty <= 0) {
      setErrorMessage("La cantidad a trasladar debe ser mayor a 0.");
      return;
    }
    if (numQty > product.stockActual) {
      setErrorMessage(
        `Stock insuficiente para trasladar. Stock disponible: ${product.stockActual} ${product.unit}`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        productId: product.id,
        toLocationId: targetLocationId,
        quantity: numQty,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Error al registrar el traslado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetLocationObj = locations.find((l) => l.id === targetLocationId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#190088]/10 dark:bg-[#190088]/20 text-[#190088] dark:text-[#97D6DF] border border-[#190088]/20 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">
                Traslado de Ubicación
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Transferencia física de stock entre almacenes
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

          {/* Product Info */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80 space-y-1">
            <span className="font-mono text-xs font-bold text-[#190088] dark:text-[#97D6DF]">{product.sku}</span>
            <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{product.name}</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              Stock total disponible: <span className="font-bold text-zinc-800 dark:text-zinc-200">{product.stockActual} {product.unit}</span>
            </p>
          </div>

          {/* Route Visualizer (Origin -> Target) */}
          <div className="p-3.5 rounded-xl bg-[#190088]/5 dark:bg-[#190088]/10 border border-[#190088]/20 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              <span className="font-bold text-zinc-500 dark:text-zinc-400">Origen:</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{product.locationName}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#FF3F1A] animate-ping" />
              <span className="font-bold text-[#FF3F1A]">Destino:</span>
              <span className="font-bold text-zinc-900 dark:text-white">
                {targetLocationObj?.name || "Selecciona ubicación..."}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 font-mono uppercase">
              Ubicación de Destino *
            </label>
            <select
              value={targetLocationId}
              onChange={(e) => setTargetLocationId(e.target.value)}
              className="w-full text-xs sm:text-sm font-medium rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-[#190088]"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id} disabled={loc.id === product.locationId}>
                  {loc.name} {loc.id === product.locationId ? "(Actual)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 font-mono uppercase">
              Cantidad a Trasladar ({product.unit}) *
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              max={product.stockActual}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full text-sm font-mono font-bold rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-[#190088]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 font-mono uppercase">
              Notas / Motivo del Traslado
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Reabastecimiento de mostrador / Acomodo en bodega"
              className="w-full text-xs sm:text-sm font-medium rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-[#190088]"
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
                "Trasladando..."
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar Traslado
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
