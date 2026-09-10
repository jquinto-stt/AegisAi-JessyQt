import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  ArrowRightLeft,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Package,
} from "lucide-react";
import {
  InventoryProduct,
  MovementType,
  StockLocation,
  AdjustmentReason,
} from "../types/inventory.types";
import { Modal, Button } from "@/elements";

export type OperationMode = "ENTRADA" | "SALIDA" | "AJUSTE" | "TRASLADO" | "CONTEO";

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: InventoryProduct[];
  locations: StockLocation[];
  selectedProduct?: InventoryProduct | null;
  initialMode?: OperationMode;
  onMovement: (params: {
    productId: string;
    type: "ENTRADA" | "SALIDA";
    quantity: number;
    concept: string;
    referenceDoc?: string;
    notes?: string;
  }) => Promise<any>;
  onAdjustment?: (params: {
    productId: string;
    adjustmentType: "DISMINUCION" | "AUMENTO";
    quantity: number;
    reason: AdjustmentReason;
    author?: string;
    notes?: string;
  }) => Promise<any>;
  onTransfer?: (params: {
    productId: string;
    quantity: number;
    toLocationId: string;
    notes?: string;
  }) => Promise<any>;
  onCount?: (params: {
    productId: string;
    countedStock: number;
    notes?: string;
  }) => Promise<any>;
}

const ADJUSTMENT_REASONS: Array<{ value: AdjustmentReason; label: string; defaultType: "DISMINUCION" | "AUMENTO" }> = [
  { value: "MERMA", label: "Merma natural / Desperdicio", defaultType: "DISMINUCION" },
  { value: "ROTURA", label: "Rotura / Daño físico en almacén", defaultType: "DISMINUCION" },
  { value: "VENCIMIENTO", label: "Producto vencido / Caducado", defaultType: "DISMINUCION" },
  { value: "FALTANTE", label: "Faltante en inventario", defaultType: "DISMINUCION" },
  { value: "CONSUMO_INTERNO", label: "Consumo interno / Muestra", defaultType: "DISMINUCION" },
  { value: "SOBRANTE", label: "Sobrante de stock no registrado", defaultType: "AUMENTO" },
  { value: "AUDITORIA", label: "Ajuste por auditoría periódica", defaultType: "DISMINUCION" },
  { value: "OTRO", label: "Otro motivo justificado", defaultType: "DISMINUCION" },
];

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  isOpen,
  onClose,
  products,
  locations,
  selectedProduct: propProduct,
  initialMode = "ENTRADA",
  onMovement,
  onAdjustment,
  onTransfer,
  onCount,
}) => {
  const [mode, setMode] = useState<OperationMode>(initialMode);
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  // Input states
  const [quantity, setQuantity] = useState<string>("1");
  const [concept, setConcept] = useState<string>("");
  const [referenceDoc, setReferenceDoc] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Adjustment specifics
  const [adjustmentType, setAdjustmentType] = useState<"DISMINUCION" | "AUMENTO">("DISMINUCION");
  const [adjustmentReason, setAdjustmentReason] = useState<AdjustmentReason>("MERMA");

  // Transfer specifics
  const [toLocationId, setToLocationId] = useState<string>("");

  // Count specifics
  const [countedStock, setCountedStock] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial product and mode when opening
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setQuantity("1");
      setReferenceDoc("");
      setNotes("");

      const initialProd = propProduct || (products.length > 0 ? products[0] : null);
      if (initialProd) {
        setSelectedProductId(initialProd.id);
        setCountedStock(String(initialProd.stockActual));
      }

      // Default destination location for transfers
      const availableLocs = locations.filter((l) => l.id !== initialProd?.locationId);
      setToLocationId(availableLocs[0]?.id || "");

      if (initialMode === "ENTRADA") {
        setConcept("Ingreso de mercadería / Compra");
      } else if (initialMode === "SALIDA") {
        setConcept("Salida manual / Despacho");
      }
    }
  }, [isOpen, propProduct, initialMode, products, locations]);

  const currentProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || propProduct || null;
  }, [products, selectedProductId, propProduct]);

  // Update target locations when product changes
  useEffect(() => {
    if (currentProduct) {
      const otherLocs = locations.filter((l) => l.id !== currentProduct.locationId);
      if (otherLocs.length > 0 && (!toLocationId || toLocationId === currentProduct.locationId)) {
        setToLocationId(otherLocs[0].id);
      }
      setCountedStock(String(currentProduct.stockActual));
    }
  }, [currentProduct, locations, toLocationId]);

  if (!isOpen) return null;

  const currentStock = currentProduct?.stockActual || 0;
  const numQuantity = Math.max(0, parseFloat(quantity) || 0);
  const numCounted = parseFloat(countedStock) || 0;
  const unitCost = currentProduct?.costPrice || 0;

  // Real-time projection
  let projectedStock = currentStock;
  let costImpact = 0;

  if (mode === "ENTRADA") {
    projectedStock = currentStock + numQuantity;
    costImpact = numQuantity * unitCost;
  } else if (mode === "SALIDA") {
    projectedStock = currentStock - numQuantity;
    costImpact = numQuantity * unitCost;
  } else if (mode === "AJUSTE") {
    projectedStock = adjustmentType === "AUMENTO" ? currentStock + numQuantity : currentStock - numQuantity;
    costImpact = numQuantity * unitCost;
  } else if (mode === "TRASLADO") {
    projectedStock = currentStock - numQuantity;
  } else if (mode === "CONTEO") {
    projectedStock = numCounted;
    costImpact = Math.abs(numCounted - currentStock) * unitCost;
  }

  const isInsufficient =
    (mode === "SALIDA" || mode === "TRASLADO" || (mode === "AJUSTE" && adjustmentType === "DISMINUCION")) &&
    numQuantity > currentStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedProductId) {
      setErrorMessage("Por favor selecciona un producto.");
      return;
    }

    if (mode !== "CONTEO" && numQuantity <= 0) {
      setErrorMessage("La cantidad debe ser mayor a 0.");
      return;
    }

    if (isInsufficient) {
      setErrorMessage(
        `Stock insuficiente. No puedes retirar ${numQuantity} ${currentProduct?.unit} porque solo hay ${currentStock} disponibles.`
      );
      return;
    }

    if (mode === "TRASLADO" && !toLocationId) {
      setErrorMessage("Por favor selecciona una bodega de destino.");
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === "ENTRADA" || mode === "SALIDA") {
        await onMovement({
          productId: selectedProductId,
          type: mode,
          quantity: numQuantity,
          concept: concept.trim() || (mode === "ENTRADA" ? "Ingreso manual" : "Salida manual"),
          referenceDoc: referenceDoc.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      } else if (mode === "AJUSTE" && onAdjustment) {
        await onAdjustment({
          productId: selectedProductId,
          adjustmentType,
          quantity: numQuantity,
          reason: adjustmentReason,
          notes: notes.trim() || undefined,
        });
      } else if (mode === "TRASLADO" && onTransfer) {
        await onTransfer({
          productId: selectedProductId,
          quantity: numQuantity,
          toLocationId,
          notes: notes.trim() || undefined,
        });
      } else if (mode === "CONTEO" && onCount) {
        await onCount({
          productId: selectedProductId,
          countedStock: numCounted,
          notes: notes.trim() || undefined,
        });
      }

      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Ocurrió un error al procesar el movimiento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-lg p-6 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xl"
    >
      {/* ── 1. Clean Modal Header ── */}
      <div className="pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Registrar Movimiento de Inventario
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Actualización física y trazabilidad contable inmediata en Kardex.
          </p>
        </div>
      </div>

        {/* ── 2. Mode Selector (Segmented Control) ── */}
        <div className="p-4 sm:px-5 pb-2">
          <div className="grid grid-cols-5 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl gap-1 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => {
                setMode("ENTRADA");
                setConcept("Ingreso de mercadería / Compra");
              }}
              className={`py-1.5 px-1 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
                mode === "ENTRADA"
                  ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-2xs font-black"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Entrada</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("SALIDA");
                setConcept("Salida manual / Despacho");
              }}
              className={`py-1.5 px-1 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
                mode === "SALIDA"
                  ? "bg-white dark:bg-zinc-800 text-[#FF3F1A] shadow-2xs font-black"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Salida</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("AJUSTE")}
              className={`py-1.5 px-1 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
                mode === "AJUSTE"
                  ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-2xs font-black"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Ajuste</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("TRASLADO")}
              className={`py-1.5 px-1 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
                mode === "TRASLADO"
                  ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-black"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Traslado</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("CONTEO")}
              className={`py-1.5 px-1 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer ${
                mode === "CONTEO"
                  ? "bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 shadow-2xs font-black"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Conteo</span>
            </button>
          </div>
        </div>

        {/* ── 3. Form Body ── */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 pt-2 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Product Picker */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1 font-mono">
              Producto / Referencia:
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold focus:outline-none focus:border-[#FF3F1A] cursor-pointer"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — Stock: {p.stockActual} {p.unit}
                </option>
              ))}
            </select>
          </div>

          {/* Current Stock & Location Context */}
          {currentProduct && (
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-zinc-600 dark:text-zinc-300 font-medium">
                  {currentProduct.locationName || "Bodega Central"}
                </span>
              </div>
              <div className="font-mono">
                <span className="text-zinc-400 text-[11px]">Stock Actual: </span>
                <strong className="text-zinc-900 dark:text-white">
                  {currentStock} {currentProduct.unit}
                </strong>
              </div>
            </div>
          )}

          {/* Mode Specific Inputs */}
          {mode === "AJUSTE" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase font-mono mb-1">
                  Sentido del Ajuste:
                </label>
                <div className="grid grid-cols-2 p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg gap-1 font-bold text-[11px]">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType("DISMINUCION")}
                    className={`py-1 rounded-md cursor-pointer transition-colors ${
                      adjustmentType === "DISMINUCION"
                        ? "bg-rose-500 text-white shadow-2xs"
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    Disminución (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType("AUMENTO")}
                    className={`py-1 rounded-md cursor-pointer transition-colors ${
                      adjustmentType === "AUMENTO"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    Aumento (+)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase font-mono mb-1">
                  Motivo Contable:
                </label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => {
                    const r = e.target.value as AdjustmentReason;
                    setAdjustmentReason(r);
                    const meta = ADJUSTMENT_REASONS.find((m) => m.value === r);
                    if (meta) setAdjustmentType(meta.defaultType);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-medium cursor-pointer"
                >
                  {ADJUSTMENT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {mode === "TRASLADO" && (
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase font-mono mb-1">
                Bodega Destino:
              </label>
              <select
                value={toLocationId}
                onChange={(e) => setToLocationId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold cursor-pointer"
              >
                {locations
                  .filter((l) => l.id !== currentProduct?.locationId)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Quantity or Count Input */}
          {mode === "CONTEO" ? (
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase font-mono mb-1">
                Stock Físico Real Contado ({currentProduct?.unit || "UND"}):
              </label>
              <input
                type="number"
                step="any"
                value={countedStock}
                onChange={(e) => setCountedStock(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-base font-mono font-bold focus:outline-none focus:border-[#FF3F1A]"
                placeholder="0"
                autoFocus
              />
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase font-mono mb-1">
                Cantidad a {mode === "ENTRADA" ? "Ingresar" : mode === "SALIDA" ? "Retirar" : mode === "TRASLADO" ? "Trasladar" : "Ajustar"} ({currentProduct?.unit || "UND"}):
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-base font-mono font-bold focus:outline-none focus:border-[#FF3F1A]"
                placeholder="1"
                autoFocus
              />
            </div>
          )}

          {/* Real-Time Stock Balance & Valuation Impact Strip */}
          <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 space-y-1 font-mono">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-medium">Balance Resultante:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">{currentStock}</span>
                <span className="text-zinc-400">→</span>
                <strong
                  className={`text-sm font-black ${
                    projectedStock < 0
                      ? "text-rose-600"
                      : projectedStock <= (currentProduct?.stockMinimo || 0)
                      ? "text-amber-600"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {projectedStock} {currentProduct?.unit}
                </strong>
              </div>
            </div>

            {costImpact > 0 && mode !== "TRASLADO" && (
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-200 dark:border-zinc-700">
                <span className="text-zinc-400">Impacto Económico en Costo:</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  ${costImpact.toLocaleString("es-CO")}
                </span>
              </div>
            )}
          </div>

          {/* Reference & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase font-mono mb-1">
                Documento / Ref:
              </label>
              <input
                type="text"
                placeholder="Ej. Factura #4012, Remisión"
                value={referenceDoc}
                onChange={(e) => setReferenceDoc(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-none focus:border-[#FF3F1A]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase font-mono mb-1">
                Motivo / Justificación:
              </label>
              <input
                type="text"
                placeholder="Observación breve..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs focus:outline-none focus:border-[#FF3F1A]"
              />
            </div>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-none" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isInsufficient}
              className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                mode === "ENTRADA"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : mode === "SALIDA"
                  ? "bg-[#FF3F1A] hover:bg-[#E03513]"
                  : mode === "AJUSTE"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : mode === "TRASLADO"
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-cyan-600 hover:bg-cyan-700"
              }`}
            >
              <span>
                {isSubmitting
                  ? "Procesando..."
                  : mode === "ENTRADA"
                  ? "Confirmar Entrada (+)"
                  : mode === "SALIDA"
                  ? "Confirmar Salida (-)"
                  : mode === "AJUSTE"
                  ? "Registrar Ajuste Contable"
                  : mode === "TRASLADO"
                  ? "Confirmar Traslado"
                  : "Actualizar Conteo Físico"}
              </span>
            </button>
          </div>
        </form>
    </Modal>
  );
};
