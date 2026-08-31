import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { Printer, X, Check, Copy, Sliders, QrCode } from "lucide-react";
import { Button } from "@/elements";

export const ThermalTicketModal: React.FC = () => {
  const { printTicketOrder, setPrintTicketOrder } = usePedidos();
  const [paperWidth, setPaperWidth] = useState<"80mm" | "58mm">("80mm");
  const [copied, setCopied] = useState(false);

  if (!printTicketOrder) return null;

  const order = printTicketOrder;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const textLines = [
      "================================",
      "       NECTO RESTAURANTE        ",
      "        TICKET DE PEDIDO        ",
      "================================",
      `TURNO: #${order.turnNumber || "00"}`,
      `ORDEN: ${order.id}`,
      `FECHA: ${order.createdAt} hs`,
      `CANAL: ${order.channel.toUpperCase()}`,
      `CLIENTE: ${order.customerName}`,
      `TEL: ${order.customerPhone || "N/A"}`,
      "--------------------------------",
      "ITEMS:",
      ...order.items.map(
        i =>
          `  ${i.quantity}x ${i.name.padEnd(20, " ")} $${(i.unitPrice * i.quantity).toLocaleString("es-CL")}` +
          (i.notes ? `\n     * ${i.notes}` : "")
      ),
      "--------------------------------",
      `TOTAL: $${order.total.toLocaleString("es-CL")}`,
      `PAGO: ${(order.paymentMethod || "Efectivo").toUpperCase()}`,
      "================================",
    ].join("\n");

    navigator.clipboard.writeText(textLines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 print:p-0 print:static print:inset-auto">
      {/* Backdrop (hidden in print) */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity print:hidden"
        onClick={() => setPrintTicketOrder(null)}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#2C2D31] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#374151] z-10 flex flex-col max-h-[92vh] overflow-hidden print:border-none print:shadow-none print:max-w-none print:w-full print:rounded-none print:p-0">
        
        {/* Header Actions (hidden in print) */}
        <div className="p-4 border-b border-gray-100 dark:border-[#374151] flex items-center justify-between bg-slate-50 dark:bg-gray-800/80 flex-none print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#FF3F1A] flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-gray-100">
                Impresión de Ticket Térmico
              </h3>
              <p className="text-[11px] text-gray-400">
                Formateado para impresora POS y cocina
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper Size Switcher */}
            <div className="flex bg-slate-200/80 dark:bg-gray-700 p-0.5 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setPaperWidth("80mm")}
                className={`px-2 py-1 rounded-lg transition-all ${
                  paperWidth === "80mm"
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500"
                }`}
              >
                80mm
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth("58mm")}
                className={`px-2 py-1 rounded-lg transition-all ${
                  paperWidth === "58mm"
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500"
                }`}
              >
                58mm
              </button>
            </div>

            <Button
              variant="ghost"
              intent="ticket.close"
              onClick={() => setPrintTicketOrder(null)}
              className="w-7 h-7 p-0 rounded-lg text-gray-400"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-gray-900/60 flex justify-center print:bg-white print:p-0">
          
          {/* Thermal Receipt Paper */}
          <div
            id="thermal-receipt"
            className={`bg-white text-black p-5 shadow-md border border-slate-200 transition-all font-mono text-xs leading-tight print:shadow-none print:border-none print:p-2 ${
              paperWidth === "80mm" ? "w-[340px]" : "w-[260px] text-[11px]"
            }`}
            style={{
              fontFamily: "'Courier New', Courier, monospace",
            }}
          >
            {/* Restaurant Brand Header */}
            <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-black">
              <h2 className="text-base font-black tracking-wider uppercase">NECTO COCINA</h2>
              <p className="text-[11px]">SISTEMA CENTRAL DE PEDIDOS</p>
              <p className="text-[10px] text-gray-600">Canal: {order.channel.toUpperCase()} · {order.createdAt} hs</p>
            </div>

            {/* Giant Turn Number */}
            <div className="my-3 py-2 text-center bg-black text-white rounded-md">
              <span className="text-[10px] uppercase font-bold tracking-widest block">TURNO ASIGNADO</span>
              <span className="text-3xl font-black font-sans tracking-tight">
                #{order.turnNumber || "00"}
              </span>
            </div>

            {/* Order Meta */}
            <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="font-bold">ORDEN:</span>
                <span>{order.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">CLIENTE:</span>
                <span className="font-bold truncate max-w-[170px]">{order.customerName}</span>
              </div>
              {order.customerPhone && (
                <div className="flex justify-between">
                  <span className="font-bold">TEL:</span>
                  <span>{order.customerPhone}</span>
                </div>
              )}
              {(order.deliveryAddress || order.customerAddress) && (
                <div className="pt-1 text-[10px]">
                  <span className="font-bold block">ENTREGA EN:</span>
                  <span className="italic">{order.deliveryAddress || order.customerAddress}</span>
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="py-3 border-b-2 border-dashed border-black space-y-2.5">
              <div className="flex justify-between font-black text-[11px] pb-1 border-b border-black">
                <span>CANT / PRODUCTO</span>
                <span>TOTAL</span>
              </div>

              {order.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between items-start font-bold">
                    <span className="flex-1 pr-2">
                      <span className="font-black underline">{item.quantity}x</span> {item.name}
                    </span>
                    <span className="flex-none font-bold font-sans text-xs">
                      ${(item.unitPrice * item.quantity).toLocaleString("es-CL")}
                    </span>
                  </div>

                  {item.notes && (
                    <div className="pl-4 text-[10px] text-gray-800 font-bold bg-slate-100 p-1 rounded">
                      * NOTA: {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Totals & Payment */}
            <div className="py-3 border-b-2 border-dashed border-black space-y-1.5 font-sans">
              <div className="flex justify-between font-bold text-xs">
                <span>Subtotal:</span>
                <span>${order.total.toLocaleString("es-CL")}</span>
              </div>
              <div className="flex justify-between text-base font-black pt-1 border-t border-black">
                <span>TOTAL A COBRAR:</span>
                <span>${order.total.toLocaleString("es-CL")}</span>
              </div>
              <div className="flex justify-between text-xs font-bold pt-0.5 text-gray-700">
                <span>MÉTODO DE PAGO:</span>
                <span className="uppercase">{order.paymentMethod || "Efectivo"}</span>
              </div>
            </div>

            {/* Footer QR / Barcode & Notice */}
            <div className="pt-3 text-center space-y-2">
              <div className="inline-flex flex-col items-center justify-center p-2 border border-black rounded">
                <QrCode className="w-12 h-12 text-black" />
                <span className="text-[9px] font-mono tracking-widest mt-0.5">{order.id}</span>
              </div>
              <p className="text-[10px] font-bold italic">
                ¡Gracias por su preferencia! · Necto POS
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions Bar (hidden in print) */}
        <div className="p-4 border-t border-gray-100 dark:border-[#374151] bg-slate-50 dark:bg-gray-800/80 flex items-center justify-between gap-3 flex-none print:hidden">
          <Button
            variant="outline"
            intent="ticket.copy"
            onClick={handleCopyText}
            className="py-2.5 px-3.5 text-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copiado al portapapeles" : "Copiar Texto"}</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              intent="ticket.cancel"
              onClick={() => setPrintTicketOrder(null)}
              className="py-2.5 px-4 text-xs"
            >
              Cerrar
            </Button>
            <button
              type="button"
              onClick={handlePrint}
              className="py-2.5 px-5 rounded-xl bg-[#190088] hover:bg-[#140070] text-white text-xs font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir en Ticketera</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
