import React from "react";
import {
  X,
  Package,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  ArrowRightLeft,
  Edit3,
  History,
  TrendingUp,
  Percent,
} from "lucide-react";
import { InventoryProduct, StockMovement } from "../types/inventory.types";

interface PartDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: InventoryProduct | null;
  movements: StockMovement[];
  onOpenMovement: (initialMode?: "ENTRADA" | "SALIDA" | "AJUSTE" | "TRASLADO" | "CONTEO") => void;
  onEdit: () => void;
  onViewHistory?: (productId: string) => void;
}

export const PartDetailModal: React.FC<PartDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  movements,
  onOpenMovement,
  onEdit,
  onViewHistory,
}) => {
  if (!isOpen || !product) return null;

  const partMovements = movements
    .filter((m) => m.productId === product.id)
    .slice(0, 6);

  const cost = product.costPrice || 0;
  const price = product.salePrice || 0;
  const marginAmount = price - cost;
  const marginPercent = price > 0 ? (marginAmount / price) * 100 : 0;

  const isOutOfStock = product.stockActual <= 0;
  const isLowStock = !isOutOfStock && product.stockActual <= product.stockMinimo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 1. Clean Header ── */}
        <div className="p-5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-none">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-5 h-5 text-zinc-400" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#FF3F1A] bg-[#FF3F1A]/10 px-2 py-0.5 rounded-md">
                  {product.sku}
                </span>
                <span className="text-xs text-zinc-500">• {product.category || "General"}</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white mt-0.5 truncate">
                {product.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── 2. Body Scrollable ── */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Hero Stock Strip */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase text-zinc-400 block tracking-wider">
                Disponibilidad Física en Almacén
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  className={`text-3xl font-mono font-black ${
                    isOutOfStock
                      ? "text-rose-600 dark:text-rose-400"
                      : isLowStock
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-zinc-900 dark:text-white"
                  }`}
                >
                  {product.stockActual} {product.unit}
                </span>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                    isOutOfStock
                      ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                      : isLowStock
                      ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                  }`}
                >
                  {isOutOfStock ? "Agotado" : isLowStock ? "Bajo Mínimo" : "En Stock"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-500 mt-1">
                <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>{product.locationName || "Bodega Central"}</span>
                <span className="text-zinc-400">• Mínimo de seguridad: {product.stockMinimo} {product.unit}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMovement("ENTRADA");
                }}
                className="px-3.5 py-2 rounded-xl bg-[#FF3F1A] hover:bg-[#E03513] text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Registrar Movimiento</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>
            </div>
          </div>

          {/* Key Financial & Business Data Grid */}
          <div>
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Datos Comerciales & Valoración
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 font-mono">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Costo Unitario (PPP)</span>
                <span className="text-base font-black text-zinc-900 dark:text-white mt-0.5 block">
                  ${cost.toLocaleString("es-CO")}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 font-mono">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Precio de Venta (PVP)</span>
                <span className="text-base font-black text-zinc-900 dark:text-white mt-0.5 block">
                  ${price.toLocaleString("es-CO")}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 font-mono">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">Margen Unitario</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {marginPercent.toFixed(1)}%
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase font-mono font-bold block">Proveedor</span>
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 block truncate">
                  {product.supplier || "No asignado"}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Kardex Activity */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                Historial Reciente en Kardex
              </h3>
              {onViewHistory && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewHistory(product.id);
                  }}
                  className="text-[11px] font-semibold text-[#FF3F1A] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <History className="w-3 h-3" />
                  <span>Ver Kardex completo</span>
                </button>
              )}
            </div>

            <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden">
              {partMovements.length === 0 ? (
                <div className="p-6 text-center text-zinc-400">
                  <p className="font-semibold text-xs">Sin movimientos registrados para esta referencia</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-900/50 text-[10px] font-mono uppercase font-bold text-zinc-400">
                      <th className="py-2 px-3">Tipo</th>
                      <th className="py-2 px-3">Concepto / Motivo</th>
                      <th className="py-2 px-3 text-center">Cantidad</th>
                      <th className="py-2 px-3 text-right">Saldo</th>
                      <th className="py-2 px-3 text-right">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono">
                    {partMovements.map((m) => (
                      <tr key={m.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              m.type === "ENTRADA"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : m.type === "SALIDA"
                                ? "bg-rose-500/10 text-rose-600"
                                : m.type === "AJUSTE"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-indigo-500/10 text-indigo-600"
                            }`}
                          >
                            {m.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-zinc-700 dark:text-zinc-300 font-sans text-xs truncate max-w-[180px]">
                          {m.concept || "Movimiento"}
                        </td>
                        <td className="py-2 px-3 text-center font-bold">
                          <span className={m.type === "ENTRADA" ? "text-emerald-600" : "text-rose-600"}>
                            {m.type === "ENTRADA" ? "+" : "-"}{m.quantity}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-black text-zinc-900 dark:text-white">
                          {m.newStock ?? (m as any).finalBalance}
                        </td>
                        <td className="py-2 px-3 text-right text-zinc-400 text-[11px]">
                          {new Date(m.timestamp).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
