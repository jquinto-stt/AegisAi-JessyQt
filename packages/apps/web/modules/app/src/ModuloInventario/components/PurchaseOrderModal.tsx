import React, { useState, useEffect } from "react";
import {
  X,
  Truck,
  Plus,
  Trash2,
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  MapPin,
} from "lucide-react";
import {
  Supplier,
  StockLocation,
  InventoryProduct,
  PurchaseOrderItem,
  PurchaseOrderStatus,
} from "../types/inventory.types";

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  locations: StockLocation[];
  products: InventoryProduct[];
  onSubmit: (data: {
    supplierId: string;
    supplierName: string;
    targetLocationId: string;
    targetLocationName: string;
    items: PurchaseOrderItem[];
    totalAmount: number;
    notes?: string;
    autoReceive: boolean;
  }) => Promise<void>;
  onCreateSupplier?: (supplierData: {
    name: string;
    taxId: string;
    contactPerson: string;
    email: string;
    phone: string;
    leadTimeDays: number;
  }) => Promise<Supplier>;
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  locations,
  products,
  onSubmit,
  onCreateSupplier,
}) => {
  const [supplierId, setSupplierId] = useState("");
  const [targetLocationId, setTargetLocationId] = useState("");
  const [autoReceive, setAutoReceive] = useState(true);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<
    Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>
  >([]);

  // Sub-modal inline para crear proveedor si no existe
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupName, setNewSupName] = useState("");
  const [newSupTaxId, setNewSupTaxId] = useState("");
  const [newSupContact, setNewSupContact] = useState("");
  const [newSupEmail, setNewSupEmail] = useState("");
  const [newSupPhone, setNewSupPhone] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSupplierId(suppliers[0]?.id || "");
      setTargetLocationId(locations[0]?.id || "");
      setAutoReceive(true);
      setNotes("");
      setErrorMessage(null);
      setShowAddSupplier(false);

      // Pre-cargar 1 ítem inicial si hay productos
      if (products.length > 0) {
        setItems([
          {
            productId: products[0].id,
            quantity: 10,
            unitPrice: products[0].costPrice || 10000,
          },
        ]);
      } else {
        setItems([]);
      }
    }
  }, [isOpen, suppliers, locations, products]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    const defaultProduct = products[0];
    if (!defaultProduct) return;
    setItems([
      ...items,
      {
        productId: defaultProduct.id,
        quantity: 1,
        unitPrice: defaultProduct.costPrice || 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemProductChange = (index: number, newProductId: string) => {
    const prod = products.find((p) => p.id === newProductId);
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId: newProductId,
      unitPrice: prod?.costPrice || updated[index].unitPrice,
    };
    setItems(updated);
  };

  const handleItemQuantityChange = (index: number, qty: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], quantity: Math.max(1, qty) };
    setItems(updated);
  };

  const handleItemPriceChange = (index: number, price: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], unitPrice: Math.max(0, price) };
    setItems(updated);
  };

  const totalAmount = items.reduce(
    (acc, it) => acc + (it.quantity || 0) * (it.unitPrice || 0),
    0
  );

  const totalUnits = items.reduce((acc, it) => acc + (it.quantity || 0), 0);

  const handleQuickCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim() || !onCreateSupplier) return;

    try {
      const created = await onCreateSupplier({
        name: newSupName.trim(),
        taxId: newSupTaxId.trim() || `NIT-900${Math.floor(100000 + Math.random() * 900000)}`,
        contactPerson: newSupContact.trim() || "Contacto Principal",
        email: newSupEmail.trim() || "proveedor@empresa.com",
        phone: newSupPhone.trim() || "+57 300 000 0000",
        leadTimeDays: 3,
      });
      setSupplierId(created.id);
      setShowAddSupplier(false);
      setNewSupName("");
      setNewSupTaxId("");
    } catch (err: any) {
      setErrorMessage(err?.message || "Error al crear proveedor rápido.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setErrorMessage("Debes seleccionar un proveedor.");
      return;
    }
    if (!targetLocationId) {
      setErrorMessage("Debes seleccionar la bodega de destino.");
      return;
    }
    if (items.length === 0) {
      setErrorMessage("Debes agregar al menos un ítem a la factura de compra.");
      return;
    }

    const supplierObj = suppliers.find((s) => s.id === supplierId);
    const locationObj = locations.find((l) => l.id === targetLocationId);

    const fullItems: PurchaseOrderItem[] = items.map((it) => {
      const prod = products.find((p) => p.id === it.productId);
      return {
        productId: it.productId,
        productSku: prod?.sku || "SKU-DESCONOCIDO",
        productName: prod?.name || "Producto sin nombre",
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        unit: prod?.unit || "UND",
      };
    });

    try {
      setIsSubmitting(true);
      await onSubmit({
        supplierId,
        supplierName: supplierObj?.name || "Proveedor General",
        targetLocationId,
        targetLocationName: locationObj?.name || "Almacén Central",
        items: fullItems,
        totalAmount,
        notes: notes.trim() || undefined,
        autoReceive,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Error al registrar la compra.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#18181B] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col my-8 animate-scale-up max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex-none">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#190088]/10 dark:bg-[#190088]/20 text-[#190088] dark:text-[#97D6DF] border border-[#190088]/20 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-zinc-900 dark:text-white">
                Nueva Factura / Orden de Compra
              </h3>
              <p className="text-xs text-zinc-500">
                Ingreso de mercadería a bodegas con costo de adquisición
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-none" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Supplier & Warehouse Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Proveedor *
                </label>
                {onCreateSupplier && (
                  <button
                    type="button"
                    onClick={() => setShowAddSupplier(!showAddSupplier)}
                    className="text-[11px] font-bold text-[#190088] dark:text-[#97D6DF] hover:underline cursor-pointer"
                  >
                    {showAddSupplier ? "Cancelar" : "+ Nuevo Proveedor"}
                  </button>
                )}
              </div>

              {!showAddSupplier ? (
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 focus:outline-hidden focus:ring-2 focus:ring-[#190088] text-zinc-900 dark:text-white"
                  required
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.taxId})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 space-y-2 text-xs">
                  <input
                    type="text"
                    placeholder="Nombre o Razón Social"
                    value={newSupName}
                    onChange={(e) => setNewSupName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="NIT / RUT"
                    value={newSupTaxId}
                    onChange={(e) => setNewSupTaxId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleQuickCreateSupplier}
                    className="w-full py-1.5 bg-[#190088] text-white font-bold rounded-lg text-xs"
                  >
                    Guardar y Seleccionar
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Bodega de Recepción / Destino *
              </label>
              <select
                value={targetLocationId}
                onChange={(e) => setTargetLocationId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 focus:outline-hidden focus:ring-2 focus:ring-[#190088] text-zinc-900 dark:text-white"
                required
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode switch: Auto-receive vs Pending */}
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-none ${
                  autoReceive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                }`}
              >
                {autoReceive ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white">
                  {autoReceive
                    ? "Ingresar inmediatamente a stock"
                    : "Registrar como orden pendiente"}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {autoReceive
                    ? "Suma el stock al instante en la bodega seleccionada y registra entrada en Kardex."
                    : "Quedará en espera de llegada para que el bodeguero la reciba luego."}
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer flex-none">
              <input
                type="checkbox"
                checked={autoReceive}
                onChange={(e) => setAutoReceive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-hidden rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase font-mono tracking-wider text-zinc-400">
                Productos a Comprar ({items.length})
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 rounded-xl bg-[#190088]/10 hover:bg-[#190088]/20 text-[#190088] dark:text-[#97D6DF] border border-[#190088]/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Renglón</span>
              </button>
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                No has agregado productos. Haz clic en "Agregar Renglón".
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-900 text-[10px] font-mono uppercase font-bold text-zinc-400">
                  <div className="col-span-5">Producto / SKU</div>
                  <div className="col-span-2 text-right">Cantidad</div>
                  <div className="col-span-2 text-right">Costo Unit.</div>
                  <div className="col-span-2 text-right">Subtotal</div>
                  <div className="col-span-1 text-center"></div>
                </div>

                {items.map((item, idx) => {
                  const subtotal = (item.quantity || 0) * (item.unitPrice || 0);
                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 px-3 py-2.5 items-center bg-white dark:bg-[#18181B] text-xs"
                    >
                      <div className="col-span-5">
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemProductChange(idx, e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white truncate"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemQuantityChange(idx, parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs text-right font-mono font-bold text-zinc-900 dark:text-white"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemPriceChange(idx, parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs text-right font-mono text-zinc-900 dark:text-white"
                        />
                      </div>

                      <div className="col-span-2 text-right font-mono font-black text-zinc-900 dark:text-white text-xs truncate">
                        ${subtotal.toLocaleString("es-CO")}
                      </div>

                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Eliminar fila"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Notas / Referencia de Factura de Proveedor
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Factura Electrónica FE-9842, entregado por transportadora Servientrega"
              className="w-full px-3.5 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 focus:outline-hidden focus:ring-2 focus:ring-[#190088] text-zinc-900 dark:text-white"
            />
          </div>

          {/* Total Summary Footer Box */}
          <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
                Unidades a ingresar:
              </span>
              <strong className="text-sm font-mono font-black text-zinc-900 dark:text-white">
                {totalUnits.toLocaleString("es-CO")} ítems
              </strong>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">
                Total Factura de Compra:
              </span>
              <strong className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400">
                ${totalAmount.toLocaleString("es-CO")}
              </strong>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="px-5 py-2 rounded-xl bg-[#190088] hover:bg-[#150073] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting
                ? "Procesando..."
                : autoReceive
                ? "Guardar e Ingresar a Stock"
                : "Guardar Orden de Compra"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
