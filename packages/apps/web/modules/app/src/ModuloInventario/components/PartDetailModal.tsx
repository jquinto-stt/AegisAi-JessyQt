import React from "react";
import {
  Package,
  Building2,
  Edit3,
  History,
} from "lucide-react";
import { InventoryProduct, StockMovement } from "../types/inventory.types";
import { Modal, Button, Badge } from "@/elements";

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl p-6 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xl"
    >
      {/* ── 1. Clean Header ── */}
      <div className="pb-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-none">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package className="w-5 h-5 text-gray-400" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-brand-500 bg-brand-50 dark:bg-brand-950/50 px-2 py-0.5 rounded-md">
                {product.sku}
              </span>
              <span className="text-xs text-gray-500">• {product.category || "General"}</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-0.5 truncate">
              {product.name}
            </h2>
          </div>
        </div>
      </div>

      {/* ── 2. Body Scrollable ── */}
      <div className="pt-5 space-y-5 text-xs">
        {/* Hero Stock Strip */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 block tracking-wider">
              Disponibilidad Física en Almacén
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-3xl font-mono font-bold ${
                  isOutOfStock
                    ? "text-red-600 dark:text-red-400"
                    : isLowStock
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                {product.stockActual} {product.unit}
              </span>

              <Badge
                variant="light"
                color={isOutOfStock ? "error" : isLowStock ? "warning" : "success"}
                size="sm"
              >
                {isOutOfStock ? "Agotado" : isLowStock ? "Bajo Mínimo" : "En Stock"}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mt-1">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              <span>{product.locationName || "Bodega Central"}</span>
              <span className="text-gray-400">• Mínimo de seguridad: {product.stockMinimo} {product.unit}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onOpenMovement("ENTRADA");
              }}
            >
              Registrar Movimiento
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onEdit();
              }}
            >
              <Edit3 className="w-3.5 h-3.5 mr-1" />
              Editar
            </Button>
          </div>
        </div>

        {/* Key Financial & Business Data Grid */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Datos Comerciales & Valoración
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 font-mono">
              <span className="text-[10px] text-gray-500 uppercase font-semibold block">Costo Unitario (PPP)</span>
              <span className="text-base font-bold text-gray-900 dark:text-white mt-0.5 block">
                ${cost.toLocaleString("es-CO")}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 font-mono">
              <span className="text-[10px] text-gray-500 uppercase font-semibold block">Precio de Venta (PVP)</span>
              <span className="text-base font-bold text-gray-900 dark:text-white mt-0.5 block">
                ${price.toLocaleString("es-CO")}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 font-mono">
              <span className="text-[10px] text-gray-500 uppercase font-semibold block">Margen Unitario</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                {marginPercent.toFixed(1)}%
              </span>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800">
              <span className="text-[10px] text-gray-500 uppercase font-semibold block">Proveedor</span>
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 block truncate">
                {product.supplier || "No asignado"}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Kardex Activity */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Historial Reciente en Kardex
            </h3>
            {onViewHistory && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewHistory(product.id);
                }}
                className="text-xs font-semibold text-brand-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>Ver Kardex completo</span>
              </button>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {partMovements.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <p className="font-semibold text-xs">Sin movimientos registrados para esta referencia</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/80 text-[10px] font-mono uppercase font-semibold text-gray-500">
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Concepto / Motivo</th>
                    <th className="py-2.5 px-3 text-center">Cantidad</th>
                    <th className="py-2.5 px-3 text-right">Saldo</th>
                    <th className="py-2.5 px-3 text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
                  {partMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="py-2.5 px-3">
                        <Badge
                          variant="light"
                          color={
                            m.type === "ENTRADA"
                              ? "success"
                              : m.type === "SALIDA"
                              ? "error"
                              : m.type === "AJUSTE"
                              ? "warning"
                              : "brand"
                          }
                          size="sm"
                        >
                          {m.type}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300 font-sans text-xs truncate max-w-[180px]">
                        {m.concept || "Movimiento"}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        <span className={m.type === "ENTRADA" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                          {m.type === "ENTRADA" ? "+" : "-"}{m.quantity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-900 dark:text-white">
                        {m.newStock ?? (m as any).finalBalance}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-400 text-[11px]">
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
    </Modal>
  );
};
