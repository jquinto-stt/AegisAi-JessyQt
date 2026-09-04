import React, { useState, useEffect } from "react";
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  AlertTriangle,
  CheckCircle2,
  FileText,
  User,
} from "lucide-react";
import { InventoryProduct, MovementType } from "../types/inventory.types";

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: InventoryProduct[];
  selectedProduct?: InventoryProduct | null;
  initialType?: MovementType;
  onSubmit: (params: {
    productId: string;
    type: MovementType;
    quantity: number;
    concept: string;
    referenceDoc?: string;
    notes?: string;
  }) => Promise<void>;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  isOpen,
  onClose,
  products,
  selectedProduct: propProduct,
  initialType = "ENTRADA",
  onSubmit,
}) => {
  const [selectedId, setSelectedId] = useState<string>("");
  const [type, setType] = useState<MovementType>(initialType);
  const [quantity, setQuantity] = useState<string>("1");
  const [concept, setConcept] = useState<string>("");
  const [referenceDoc, setReferenceDoc] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (propProduct) {
      setSelectedId(propProduct.id);
    } else if (products.length > 0 && !selectedId) {
      setSelectedId(products[0].id);
    }
  }, [propProduct, products, selectedId]);

  useEffect(() => {
    setType(initialType);
    setConcept(initialType === "ENTRADA" ? "Compra Proveedor" : "Venta Mostrador / Pedido");
  }, [initialType, isOpen]);

  if (!isOpen) return null;

  const currentProduct = products.find((p) => p.id === selectedId) || propProduct;
  const numQuantity = parseFloat(quantity) || 0;
  const currentStock = currentProduct?.stockActual || 0;

  // Cálculo matemático en tiempo real
  const projectedStock =
    type === "ENTRADA"
      ? currentStock + numQuantity
      : currentStock - numQuantity;

  const isStockInsufficient = type === "SALIDA" && projectedStock < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedId) {
      setErrorMessage("Por favor selecciona un producto.");
      return;
    }

    if (numQuantity <= 0) {
      setErrorMessage("La cantidad debe ser mayor a 0.");
      return;
    }

    if (isStockInsufficient) {
      setErrorMessage(
        `Stock insuficiente. No puedes retirar ${numQuantity} ${currentProduct?.unit} porque solo hay ${currentStock} en inventario.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        productId: selectedId,
        type,
        quantity: numQuantity,
        concept: concept || (type === "ENTRADA" ? "Ajuste Manual (+)" : "Ajuste Manual (-)"),
        referenceDoc: referenceDoc.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Error al registrar el movimiento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultConceptsEntrada = [
    "Compra Proveedor",
    "Ajuste Manual (+)",
    "Devolución Cliente",
    "Producción / Armado",
    "Inventario Inicial",
  ];

  const defaultConceptsSalida = [
    "Venta Mostrador / Pedido",
    "Ajuste Manual (-)",
    "Merma / Daño",
    "Vencimiento",
    "Traslado entre Sucursales",
    "Muestra / Degustación",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                type === "ENTRADA"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-[#FF3F1A]/10 text-[#FF3F1A] border border-[#FF3F1A]/20"
              }`}
            >
              {type === "ENTRADA" ? (
                <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">
                Registrar Movimiento de Stock
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Afecta el saldo en tiempo real y genera registro en el historial
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-none" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Selector de Tipo (Entrada / Salida) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setType("ENTRADA");
                setConcept("Compra Proveedor");
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                type === "ENTRADA"
                  ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              ENTRADA (+)
            </button>
            <button
              type="button"
              onClick={() => {
                setType("SALIDA");
                setConcept("Venta Mostrador / Pedido");
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                type === "SALIDA"
                  ? "bg-white dark:bg-zinc-900 text-[#FF3F1A] shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              SALIDA (-)
            </button>
          </div>

          {/* Seleccionar Producto */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 font-mono uppercase">
              Producto / Ítem
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={!!propProduct}
              className="w-full text-xs sm:text-sm font-medium rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-[#190088] transition-colors font-mono"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.sku}] {p.name} (Stock: {p.stockActual} {p.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Previsualización matemática de Stock */}
          {currentProduct && (
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80 grid grid-cols-3 gap-2 text-center font-mono">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400">Stock Actual</span>
                <p className="text-sm font-black text-zinc-700 dark:text-zinc-200">
                  {currentStock} <span className="text-[10px] font-normal">{currentProduct.unit}</span>
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400">
                  {type === "ENTRADA" ? "+ Entrada" : "- Salida"}
                </span>
                <p
                  className={`text-sm font-black ${
                    type === "ENTRADA" ? "text-emerald-600" : "text-[#FF3F1A]"
                  }`}
                >
                  {type === "ENTRADA" ? "+" : "-"}
                  {numQuantity || 0}{" "}
                  <span className="text-[10px] font-normal">{currentProduct.unit}</span>
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400">Nuevo Saldo</span>
                <p
                  className={`text-sm font-black ${
                    isStockInsufficient
                      ? "text-[#FF3F1A] animate-pulse"
                      : "text-zinc-950 dark:text-white"
                  }`}
                >
                  {projectedStock < 0 ? "Negativo!" : projectedStock}{" "}
                  <span className="text-[10px] font-normal">{currentProduct.unit}</span>
                </p>
              </div>
            </div>
          )}

          {/* Cantidad & Concepto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 font-mono uppercase">
                Cantidad ({currentProduct?.unit || "Unidades"}) *
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ej. 10"
                className="w-full text-xs sm:text-sm font-mono font-bold rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-[#190088]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 font-mono uppercase">
                Concepto / Motivo *
              </label>
              <input
                type="text"
                list="conceptos-list"
                required
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Selecciona o escribe..."
                className="w-full text-xs sm:text-sm font-medium rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-[#190088]"
              />
              <datalist id="conceptos-list">
                {(type === "ENTRADA" ? defaultConceptsEntrada : defaultConceptsSalida).map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Documento de Referencia & Notas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 font-mono uppercase">
                N° Documento / Factura (Opcional)
              </label>
              <input
                type="text"
                value={referenceDoc}
                onChange={(e) => setReferenceDoc(e.target.value)}
                placeholder="Ej. FAC-2026-99"
                className="w-full text-xs sm:text-sm font-mono rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-[#190088]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 font-mono uppercase">
                Observaciones
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalles adicionales..."
                className="w-full text-xs sm:text-sm font-medium rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-[#190088]"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isStockInsufficient}
              className={`px-5 py-2 rounded-xl text-xs font-extrabold text-white transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 ${
                type === "ENTRADA"
                  ? "bg-emerald-600 hover:bg-emerald-700 active:scale-95"
                  : "bg-[#FF3F1A] hover:bg-[#E03513] active:scale-95"
              } ${isStockInsufficient ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isSubmitting ? (
                "Guardando..."
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar {type === "ENTRADA" ? "Entrada (+)" : "Salida (-)"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
