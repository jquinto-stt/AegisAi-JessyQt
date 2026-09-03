import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { Conversation, OrderItem, OrderChannel } from "../types";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  X,
  ChefHat,
  MapPin,
  Phone,
  User,
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  Search,
} from "lucide-react";
import { Button } from "@/elements";

interface CreateOrderFromConversationModalProps {
  conversation: Conversation;
  isOpen: boolean;
  onClose: () => void;
}

export const CreateOrderFromConversationModal: React.FC<CreateOrderFromConversationModalProps> = ({
  conversation,
  isOpen,
  onClose,
}) => {
  const {
    products,
    createManualOrder,
    sendToKitchen,
    sendOperatorMessage,
    setSelectedOrderId,
  } = usePedidos();

  const [customerName, setCustomerName] = useState(conversation.customerName);
  const [customerPhone, setCustomerPhone] = useState(conversation.customerPhone);
  const [deliveryAddress, setDeliveryAddress] = useState(conversation.customerAddress || "");
  const [paymentMethod, setPaymentMethod] = useState<string>("transferencia");
  const [estimatedMinutes, setEstimatedMinutes] = useState(25);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [orderNotes, setOrderNotes] = useState("");

  const [searchProductQuery, setSearchProductQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>(() => {
    // Default initial item
    const firstProd = products[0];
    if (firstProd) {
      return [
        {
          productId: firstProd.id,
          name: firstProd.name,
          quantity: 1,
          unitPrice: firstProd.price,
          notes: "",
        },
      ];
    }
    return [];
  });

  if (!isOpen) return null;

  const filteredProducts = products.filter(
    p =>
      p.name.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchProductQuery.toLowerCase())
  );

  const handleAddItem = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const existingIdx = selectedItems.findIndex(i => i.productId === productId);
    if (existingIdx >= 0) {
      const updated = [...selectedItems];
      updated[existingIdx].quantity += 1;
      setSelectedItems(updated);
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          productId: prod.id,
          name: prod.name,
          quantity: 1,
          unitPrice: prod.price,
          notes: "",
        },
      ]);
    }
  };

  const handleUpdateQty = (idx: number, delta: number) => {
    const updated = [...selectedItems];
    const newQty = updated[idx].quantity + delta;
    if (newQty <= 0) {
      setSelectedItems(updated.filter((_, i) => i !== idx));
    } else {
      updated[idx].quantity = newQty;
      setSelectedItems(updated);
    }
  };

  const handleUpdateNotes = (idx: number, notes: string) => {
    const updated = [...selectedItems];
    updated[idx].notes = notes;
    setSelectedItems(updated);
  };

  const handleRemoveItem = (idx: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== idx));
  };

  const subtotal = selectedItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const total = subtotal + Number(deliveryFee || 0);

  const handleSubmit = (directToKitchen = false) => {
    if (selectedItems.length === 0) return;

    const newOrderData = {
      customerName: customerName.trim() || conversation.customerName,
      customerPhone: customerPhone.trim() || conversation.customerPhone,
      customerAddress: deliveryAddress.trim(),
      deliveryAddress: deliveryAddress.trim(),
      channel: "whatsapp" as OrderChannel,
      type: "inmediato" as const,
      paymentMethod,
      items: selectedItems,
      total,
      estimatedMinutes,
      notes: orderNotes.trim(),
    };

    createManualOrder(newOrderData);

    // If direct to kitchen was requested
    setTimeout(() => {
      // Send confirmation message to chat
      sendOperatorMessage(
        conversation.id,
        `🧾 ¡Comanda generada con éxito! Detalle: ${selectedItems
          .map(i => `${i.quantity}x ${i.name}`)
          .join(", ")} por un total de $${total.toLocaleString("es-CO")} COP. ${
          directToKitchen ? "Tu pedido ya está en preparación en cocina 🍳." : "Confirmado en cola de despacho."
        }`
      );
    }, 100);

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-[#18181B] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
        style={{ animation: "slideUp 200ms ease-out" }}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 flex items-center justify-between gap-4 flex-none">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FF3F1A]/10 text-[#FF3F1A] border border-[#FF3F1A]/20 flex items-center justify-center font-bold flex-none shadow-2xs">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                  WhatsApp Cloud Order
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span className="text-xs text-zinc-500">{conversation.customerPhone}</span>
              </div>
              <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 mt-0.5">
                Generar Comanda para {conversation.customerName}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Customer & Delivery Form Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#FF3F1A]" />
                <span>Nombre del Cliente</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Nombre completo"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#FF3F1A]" />
                <span>Teléfono WhatsApp</span>
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="+57 300 000 0000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#FF3F1A]" />
                <span>Dirección de Despacho (Domicilio)</span>
              </label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={e => setDeliveryAddress(e.target.value)}
                placeholder="Ej: Calle 72 # 11-45, Apto 402"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#FF3F1A]" />
                <span>Método de Pago</span>
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]"
              >
                <option value="transferencia">Transferencia Nequi / Bancolombia</option>
                <option value="efectivo">Efectivo contra entrega</option>
                <option value="pos">Datáfono / Tarjeta</option>
                <option value="mercadopago">Link de Pago MercadoPago</option>
              </select>
            </div>
          </div>

          {/* Product Items Selection Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#FF3F1A]" />
                <span>Ítems del Pedido ({selectedItems.length})</span>
              </h3>

              {/* Fast Product Quick Add */}
              <div className="relative w-48 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Agregar producto..."
                  value={searchProductQuery}
                  onChange={e => setSearchProductQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs focus:outline-none focus:ring-1 focus:ring-[#FF3F1A]"
                />
              </div>
            </div>

            {/* Quick Product Search Dropdown Results */}
            {searchProductQuery && filteredProducts.length > 0 && (
              <div className="p-2 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {filteredProducts.slice(0, 6).map(prod => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => {
                      handleAddItem(prod.id);
                      setSearchProductQuery("");
                    }}
                    className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 hover:border-[#FF3F1A] text-left flex items-center justify-between text-xs transition-colors cursor-pointer group"
                  >
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-white group-hover:text-[#FF3F1A]">
                        {prod.name}
                      </p>
                      <p className="text-[10px] text-zinc-500">${prod.price.toLocaleString("es-CO")} COP</p>
                    </div>
                    <Plus className="w-4 h-4 text-[#FF3F1A]" />
                  </button>
                ))}
              </div>
            )}

            {/* Selected Items List */}
            <div className="space-y-2">
              {selectedItems.map((item, idx) => (
                <div
                  key={`${item.productId}-${idx}`}
                  className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-zinc-950 dark:text-white truncate">
                        {item.name}
                      </p>
                      <span className="text-xs font-bold text-[#FF3F1A] font-mono">
                        ${(item.unitPrice * item.quantity).toLocaleString("es-CO")} COP
                      </span>
                    </div>

                    <input
                      type="text"
                      placeholder="Notas especiales (ej: sin cebolla, salsa aparte)"
                      value={item.notes || ""}
                      onChange={e => handleUpdateNotes(idx, e.target.value)}
                      className="mt-1 w-full text-[11px] bg-transparent border-b border-zinc-200 dark:border-zinc-700 focus:border-[#FF3F1A] focus:outline-none text-zinc-600 dark:text-zinc-300 py-0.5"
                    />
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-1 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(idx, -1)}
                        className="w-6 h-6 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold font-mono px-1 min-w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(idx, 1)}
                        className="w-6 h-6 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="w-7 h-7 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Logistics & Totals Breakdown */}
          <div className="p-4 rounded-2xl bg-[#ECECEC] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Tiempo Estimado de Entrega
                </label>
              </div>
              <div className="flex items-center gap-2">
                {[15, 25, 40, 60].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setEstimatedMinutes(mins)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      estimatedMinutes === mins
                        ? "bg-[#190088] text-white shadow-2xs"
                        : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 text-right">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Subtotal Ítems:</span>
                <span className="font-mono font-bold">${subtotal.toLocaleString("es-CO")} COP</span>
              </div>
              <div className="flex justify-between items-center text-xs text-zinc-500">
                <span>Costo Domicilio:</span>
                <input
                  type="number"
                  value={deliveryFee}
                  onChange={e => setDeliveryFee(Number(e.target.value) || 0)}
                  className="w-20 text-right px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-mono font-bold"
                />
              </div>
              <div className="flex justify-between text-sm font-extrabold text-zinc-950 dark:text-white pt-1 border-t border-zinc-200 dark:border-zinc-700">
                <span>Total Comanda:</span>
                <span className="text-[#FF3F1A] font-mono">${total.toLocaleString("es-CO")} COP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 flex-none">
          <Button
            variant="ghost"
            intent="modal.cancel"
            onClick={onClose}
            className="w-full sm:w-auto text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
          >
            Cancelar
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              intent="order.create.live"
              onClick={() => handleSubmit(false)}
              disabled={selectedItems.length === 0}
              className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl text-xs font-bold border-zinc-300 dark:border-zinc-700 cursor-pointer"
            >
              <span>Crear en Bandeja</span>
            </Button>

            <Button
              variant="primary"
              intent="order.create.kitchen"
              onClick={() => handleSubmit(true)}
              disabled={selectedItems.length === 0}
              className="flex-1 sm:flex-none py-2.5 px-5 rounded-xl text-xs font-bold bg-[#FF3F1A] hover:bg-[#e03412] text-white shadow-md flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95 transition-all"
            >
              <ChefHat className="w-4 h-4" />
              <span>Crear & Enviar a Cocina</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
