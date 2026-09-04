import React, { useState } from "react";
import {
  X,
  Package,
  Layers,
  MapPin,
  Tag,
  Hash,
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  ArrowRightLeft,
  Calendar,
  Clock,
  Sliders,
  History,
  Barcode,
  Truck,
} from "lucide-react";
import { InventoryProduct, StockMovement } from "../types/inventory.types";
import { DynamicMetadataBadge } from "./DynamicMetadataBadge";

interface PartDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: InventoryProduct | null;
  movements: StockMovement[];
  onOpenMovement: (type: "ENTRADA" | "SALIDA") => void;
  onOpenCount: () => void;
  onOpenTransfer: () => void;
  onEdit: () => void;
}

export const PartDetailModal: React.FC<PartDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  movements,
  onOpenMovement,
  onOpenCount,
  onOpenTransfer,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState<"general" | "parameters" | "tracking">("general");

  if (!isOpen || !product) return null;

  const partMovements = movements.filter((m) => m.productId === product.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with IPN & Status */}
        <div className="p-6 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 flex items-center justify-center flex-none shadow-xs">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] flex items-center justify-center font-bold">
                  <Package className="w-8 h-8" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-black text-[#190088] bg-[#190088]/10 dark:text-[#97D6DF] dark:bg-[#190088]/20 px-2.5 py-0.5 rounded-lg border border-[#190088]/20">
                  {product.sku}
                </span>
                {product.ipn && (
                  <span className="font-mono text-[11px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                    {product.ipn}
                  </span>
                )}
                <span className="text-xs font-bold text-zinc-500">· {product.category}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white mt-1">
                {product.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stock Action Toolbar */}
        <div className="px-6 py-3 bg-zinc-50/80 dark:bg-zinc-900/80 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
              Stock:
            </span>
            <span className="text-sm font-black font-mono text-zinc-900 dark:text-white">
              {product.stockActual} {product.unit}
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              (Mínimo: {product.stockMinimo})
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onOpenMovement("ENTRADA")}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Entrada (+)</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenMovement("SALIDA")}
              className="px-2.5 py-1.5 rounded-xl bg-[#FF3F1A]/10 text-[#FF3F1A] border border-[#FF3F1A]/20 hover:bg-[#FF3F1A]/20 text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Salida (-)</span>
            </button>
            <button
              type="button"
              onClick={onOpenCount}
              className="px-2.5 py-1.5 rounded-xl bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] border border-[#190088]/20 hover:bg-[#190088]/20 text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Conteo</span>
            </button>
            <button
              type="button"
              onClick={onOpenTransfer}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Traslado</span>
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-3 px-6 border-b border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181B]">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "general"
                ? "border-[#190088] text-[#190088] dark:text-[#97D6DF]"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Ficha General</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("parameters")}
            className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "parameters"
                ? "border-[#190088] text-[#190088] dark:text-[#97D6DF]"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Parámetros Dinámicos ({Object.keys(product.metadata || {}).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tracking")}
            className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "tracking"
                ? "border-[#190088] text-[#190088] dark:text-[#97D6DF]"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Historial del Ítem ({partMovements.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
          {activeTab === "general" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">Precio Costo</span>
                  <p className="text-sm font-black font-mono text-zinc-800 dark:text-zinc-200">
                    ${product.costPrice.toLocaleString("es-CO")}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">Precio Venta</span>
                  <p className="text-sm font-black font-mono text-zinc-800 dark:text-zinc-200">
                    ${product.salePrice.toLocaleString("es-CO")}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">Bodega</span>
                  <p className="text-xs font-bold text-[#190088] dark:text-[#97D6DF]">
                    🏢 {product.locationName}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">Proveedor</span>
                  <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {product.supplier || "No especificado"}
                  </p>
                </div>
              </div>

              {product.notes && (
                <div className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300">
                  <span className="font-bold block text-zinc-400 text-[10px] uppercase mb-1 font-mono">Notas:</span>
                  {product.notes}
                </div>
              )}
            </div>
          )}

          {activeTab === "parameters" && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">
                Parámetros y metadatos dinámicos JSONB asociados al ítem:
              </p>

              {Object.keys(product.metadata || {}).length === 0 ? (
                <div className="p-8 text-center text-zinc-400 text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                  Sin parámetros personalizados registrados.
                </div>
              ) : (
                <div className="border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                  {Object.entries(product.metadata).map(([k, v]) => (
                    <div key={k} className="p-3 flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-700 dark:text-zinc-300 capitalize">{k}</span>
                      <DynamicMetadataBadge fieldKey={k} value={v} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "tracking" && (
            <div className="space-y-3">
              {partMovements.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                  Sin historial de movimientos registrado para este ítem.
                </div>
              ) : (
                <div className="border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                  {partMovements.map((m) => (
                    <div key={m.id} className="p-3 flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-[10px] font-black px-2 py-0.5 rounded-md border ${
                              m.type === "ENTRADA"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : m.type === "SALIDA"
                                ? "bg-[#FF3F1A]/10 text-[#FF3F1A] border-[#FF3F1A]/20"
                                : m.type === "CONTEO"
                                ? "bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] border-[#190088]/20"
                                : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                            }`}
                          >
                            {m.type}
                          </span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{m.concept}</span>
                        </div>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          {new Date(m.timestamp).toLocaleDateString("es-CO")} · {m.author}
                        </span>
                      </div>

                      <div className="text-right font-mono font-bold">
                        <span className="text-zinc-400">{m.previousStock}</span> ➔{" "}
                        <span className="text-zinc-900 dark:text-white font-black">{m.newStock} {product.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Editar Producto
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#190088] text-white text-xs font-bold hover:bg-[#150073] transition-all shadow-2xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
