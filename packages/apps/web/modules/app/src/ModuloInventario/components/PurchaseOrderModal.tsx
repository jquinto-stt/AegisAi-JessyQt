import React, { useState, useEffect } from "react";
import {
  X,
  Truck,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  Supplier,
  StockLocation,
  InventoryProduct,
  PurchaseOrderItem,
} from "../types/inventory.types";
import { Modal, Button } from "@/elements";

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
  initialProduct?: InventoryProduct | null;
  initialSuggestedQty?: number;
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  locations,
  products,
  onSubmit,
  onCreateSupplier,
  initialProduct,
  initialSuggestedQty,
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
  const [newSupContact] = useState("");
  const [newSupEmail] = useState("");
  const [newSupPhone] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      let defaultSupId = suppliers[0]?.id || "";
      let defaultLocId = locations[0]?.id || "";

      if (initialProduct) {
        if (initialProduct.supplier) {
          const matchingSup = suppliers.find(
            (s) => s.name.toLowerCase() === (initialProduct.supplier || "").toLowerCase()
          );
          if (matchingSup) defaultSupId = matchingSup.id;
        }
        if (initialProduct.locationId) {
          defaultLocId = initialProduct.locationId;
        }
      }

      setSupplierId(defaultSupId);
      setTargetLocationId(defaultLocId);
      setAutoReceive(true);
      setNotes(initialProduct ? `Orden generada por sugerencia de reabastecimiento para ${initialProduct.sku}` : "");
      setErrorMessage(null);
      setShowAddSupplier(false);

      if (initialProduct) {
        setItems([
          {
            productId: initialProduct.id,
            quantity: initialSuggestedQty || Math.max(1, (initialProduct.stockMinimo * 2) - initialProduct.stockActual),
            unitPrice: initialProduct.costPrice || 10000,
          },
        ]);
      } else if (products.length > 0) {
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
  }, [isOpen, suppliers, locations, products, initialProduct, initialSuggestedQty]);

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8"
      showCloseButton={false}
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary-600/10 text-secondary-600 dark:text-secondary-400 border border-secondary-600/20 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Nueva Factura / Orden de Compra
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Ingreso de mercadería a bodegas con costo de adquisición
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            intent="purchaseorder.modal.close"
            onClick={onClose}
            className="w-8 h-8 p-0 text-gray-400"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-error-50 dark:bg-error-950/40 border border-error-200 dark:border-error-800/60 text-error-700 dark:text-error-400 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-none" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Supplier & Warehouse Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Proveedor *
                </label>
                {onCreateSupplier && (
                  <button
                    type="button"
                    onClick={() => setShowAddSupplier(!showAddSupplier)}
                    className="text-[11px] font-bold text-secondary-600 dark:text-secondary-400 hover:underline cursor-pointer"
                  >
                    {showAddSupplier ? "Cancelar" : "+ Nuevo Proveedor"}
                  </button>
                )}
              </div>

              {!showAddSupplier ? (
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:outline-hidden focus:border-brand-500 text-gray-900 dark:text-white"
                  required
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.taxId})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-2 text-xs">
                  <input
                    type="text"
                    placeholder="Nombre o Razón Social"
                    value={newSupName}
                    onChange={(e) => setNewSupName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:outline-hidden focus:border-brand-500"
                  />
                  <input
                    type="text"
                    placeholder="NIT / RUT"
                    value={newSupTaxId}
                    onChange={(e) => setNewSupTaxId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white font-mono focus:outline-hidden focus:border-brand-500"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    intent="purchaseorder.supplier.save"
                    onClick={handleQuickCreateSupplier}
                    className="w-full py-1.5 text-xs"
                  >
                    Guardar y Seleccionar
                  </Button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Bodega de Recepción / Destino *
              </label>
              <select
                value={targetLocationId}
                onChange={(e) => setTargetLocationId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:outline-hidden focus:border-brand-500 text-gray-900 dark:text-white"
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
          <div className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-none ${
                  autoReceive
                    ? "bg-success-50 text-success-600 dark:bg-success-950/40 dark:text-success-400 border border-success-200 dark:border-success-800"
                    : "bg-warning-50 text-warning-600 dark:bg-warning-950/40 dark:text-warning-400 border border-warning-200 dark:border-warning-800"
                }`}
              >
                {autoReceive ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">
                  {autoReceive
                    ? "Ingresar inmediatamente a stock"
                    : "Registrar como orden pendiente"}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
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
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-success-600"></div>
            </label>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase font-mono tracking-wider text-gray-400">
                Productos a Comprar ({items.length})
              </span>
              <Button
                type="button"
                variant="outline"
                intent="purchaseorder.item.add"
                onClick={handleAddItem}
                className="px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Renglón</span>
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                No has agregado productos. Haz clic en "Agregar Renglón".
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden divide-y divide-gray-200 dark:divide-gray-800">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/80 text-[10px] font-mono uppercase font-bold text-gray-400">
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
                      className="grid grid-cols-12 gap-2 px-3 py-2.5 items-center bg-white dark:bg-gray-900 text-xs"
                    >
                      <div className="col-span-5">
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemProductChange(idx, e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-900 dark:text-white truncate focus:outline-hidden focus:border-brand-500"
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
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-right font-mono font-bold text-gray-900 dark:text-white focus:outline-hidden focus:border-brand-500"
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
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-right font-mono text-gray-900 dark:text-white focus:outline-hidden focus:border-brand-500"
                        />
                      </div>

                      <div className="col-span-2 text-right font-mono font-bold text-gray-900 dark:text-white text-xs truncate">
                        ${subtotal.toLocaleString("es-CO")}
                      </div>

                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-gray-400 hover:text-error-500 transition-colors cursor-pointer"
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
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Notas / Referencia de Factura de Proveedor
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Factura Electrónica FE-9842, entregado por transportadora Servientrega"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:outline-hidden focus:border-brand-500 text-gray-900 dark:text-white"
            />
          </div>

          {/* Total Summary Footer Box */}
          <div className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-gray-500 dark:text-gray-400 font-bold block">
                Unidades a ingresar:
              </span>
              <strong className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                {totalUnits.toLocaleString("es-CO")} ítems
              </strong>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono uppercase text-gray-500 dark:text-gray-400 font-bold block">
                Total Factura de Compra:
              </span>
              <strong className="text-xl font-mono font-bold text-success-600 dark:text-success-400">
                ${totalAmount.toLocaleString("es-CO")}
              </strong>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              intent="purchaseorder.cancel"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              intent="purchaseorder.submit"
              disabled={isSubmitting || items.length === 0}
            >
              {isSubmitting
                ? "Procesando..."
                : autoReceive
                ? "Guardar e Ingresar a Stock"
                : "Guardar Orden de Compra"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
