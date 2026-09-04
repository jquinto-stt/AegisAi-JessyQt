import React, { useState } from "react";
import {
  MapPin,
  Package,
  Building2,
  ArrowRightLeft,
  Boxes,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { StockLocation, InventoryProduct } from "../types/inventory.types";
import { NectoBanner } from "@/compositions/pedidos/shared/NectoBanner";
import { Button } from "@/elements";

interface StockLocationsViewProps {
  locations: StockLocation[];
  products: InventoryProduct[];
  onOpenTransfer: (product: InventoryProduct) => void;
  onOpenCount: (product: InventoryProduct) => void;
  onOpenMovement: (product: InventoryProduct, type: "ENTRADA" | "SALIDA") => void;
  onSelectProduct: (product: InventoryProduct) => void;
}

export const StockLocationsView: React.FC<StockLocationsViewProps> = ({
  locations,
  products,
  onOpenTransfer,
  onOpenCount,
  onOpenMovement,
  onSelectProduct,
}) => {
  const [selectedLocId, setSelectedLocId] = useState<string>("all");

  const activeLocations =
    selectedLocId === "all" ? locations : locations.filter((l) => l.id === selectedLocId);

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Official Clean Necto Banner */}
      <NectoBanner
        icon={<Building2 className="w-6 h-6 text-[#FF3F1A]" />}
        title="Almacenes & Ubicaciones Multialmacén"
        description="Gestión espacial de inventario, capacidades de almacenamiento y transferencias entre depósitos."
      />

      {/* Warehouse Selector Filter Pills */}
      <div className="bg-white dark:bg-[#151518] rounded-2xl p-2.5 sm:p-3 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedLocId("all")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            selectedLocId === "all"
              ? "bg-[#190088] text-white border border-[#190088] shadow-2xs font-bold"
              : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/60 hover:text-[#190088] dark:hover:text-[#97D6DF] hover:bg-blue-50/70 dark:hover:bg-[#190088]/20"
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Todos los Almacenes</span>
          <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md ${
            selectedLocId === "all" ? "bg-white/20 text-white" : "bg-zinc-200/80 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold"
          }`}>
            {locations.length}
          </span>
        </button>

        {locations.map((loc) => {
          const count = products.filter((p) => p.locationId === loc.id).length;
          const isSelected = selectedLocId === loc.id;
          return (
            <button
              key={loc.id}
              type="button"
              onClick={() => setSelectedLocId(loc.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                isSelected
                  ? "bg-[#190088] text-white border border-[#190088] shadow-2xs font-bold"
                  : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/60 hover:text-[#190088] dark:hover:text-[#97D6DF] hover:bg-blue-50/70 dark:hover:bg-[#190088]/20"
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-[#FF3F1A]" />
              <span>{loc.name}</span>
              <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md ${
                isSelected ? "bg-white/20 text-white" : "bg-zinc-200/80 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Warehouse Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {activeLocations.map((loc) => {
          const locProducts = products.filter((p) => p.locationId === loc.id);
          const totalUnits = locProducts.reduce((acc, p) => acc + p.stockActual, 0);
          const totalValue = locProducts.reduce((acc, p) => acc + p.costPrice * p.stockActual, 0);

          return (
            <div
              key={loc.id}
              className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-2xs hover:shadow-md hover:border-[#190088]/60 dark:hover:border-[#190088]/80 transition-all flex flex-col justify-between space-y-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[#190088]/10 dark:bg-[#190088]/20 border border-[#190088]/20 text-[#190088] dark:text-[#97D6DF] flex items-center justify-center flex-none">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white">
                      {loc.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {loc.description || "Depósito operativo de almacenamiento"}
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/60">
                  {locProducts.length} {locProducts.length === 1 ? "ítem" : "ítems"}
                </span>
              </div>

              {/* Minimalist Summary Bar */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block font-mono">
                    Unidades Totales
                  </span>
                  <strong className="text-base font-black text-zinc-900 dark:text-white font-mono">
                    {totalUnits.toLocaleString("es-CO")}
                  </strong>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block font-mono">
                    Valorización en Depósito
                  </span>
                  <strong className="text-base font-black text-zinc-900 dark:text-white font-mono">
                    ${totalValue.toLocaleString("es-CO")}
                  </strong>
                </div>
              </div>

              {/* Products List Inside Warehouse */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase font-mono tracking-wider text-zinc-400">
                  Existencias en este almacén
                </h4>

                {locProducts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    No hay productos asignados a este almacén.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin pr-1">
                    {locProducts.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p
                            onClick={() => onSelectProduct(p)}
                            className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-[#190088] dark:hover:text-[#97D6DF] transition-colors cursor-pointer truncate"
                          >
                            {p.name}
                          </p>
                          <span className="font-mono text-[11px] text-zinc-400">SKU: {p.sku}</span>
                        </div>

                        <div className="flex items-center gap-3 flex-none">
                          <span className="font-black font-mono text-zinc-900 dark:text-white text-sm">
                            {p.stockActual} {p.unit}
                          </span>

                          <button
                            type="button"
                            onClick={() => onOpenTransfer(p)}
                            className="px-3 py-1.5 rounded-xl bg-[#190088]/10 hover:bg-[#190088]/20 text-[#190088] dark:text-[#97D6DF] border border-[#190088]/20 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Transferir a otro depósito"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Transferir</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
