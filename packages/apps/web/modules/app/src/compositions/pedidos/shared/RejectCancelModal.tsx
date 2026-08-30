import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { X, AlertTriangle, XCircle, Check } from "lucide-react";

export const RejectCancelModal: React.FC = () => {
  const {
    rejectModalOrder,
    setRejectModalOrder,
    cancelModalOrder,
    setCancelModalOrder,
    rejectOrder,
    cancelOrder,
  } = usePedidos();

  const isReject = Boolean(rejectModalOrder);
  const isCancel = Boolean(cancelModalOrder);
  const targetOrder = rejectModalOrder || cancelModalOrder;

  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  if (!targetOrder) return null;

  const reasons = isReject
    ? [
        "Insumos de receta no disponibles",
        "Capacidad de cocina desbordada",
        "Fuera de horario de reparto",
        "Dirección fuera del radio de cobertura",
        "Otro motivo",
      ]
    : [
        "Solicitud explícita del cliente",
        "Retraso excesivo en cocina",
        "Error en el pedido",
        "Falta de insumos críticos",
        "Corrección operativa",
        "Otro motivo",
      ];

  const handleClose = () => {
    setRejectModalOrder(null);
    setCancelModalOrder(null);
    setSelectedReason("");
    setCustomReason("");
  };

  const handleSubmit = () => {
    const finalReason = selectedReason === "Otro motivo" ? customReason.trim() : selectedReason;
    if (!finalReason) return;

    if (isReject) {
      rejectOrder(targetOrder.id, finalReason);
    } else {
      cancelOrder(targetOrder.id, finalReason);
    }
    handleClose();
  };

  const isFormValid =
    Boolean(selectedReason) && (selectedReason !== "Otro motivo" || Boolean(customReason.trim()));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#2C2D31] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#374151] p-5 sm:p-6 z-10 space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#374151] pb-3">
          <div className="flex items-center gap-2">
            {isReject ? (
              <XCircle className="w-5 h-5 text-rose-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            )}
            <h3 className="font-extrabold text-base text-gray-900 dark:text-gray-100">
              {isReject ? "Rechazar Pedido" : "Cancelar Pedido"} #{targetOrder.id}
            </h3>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Debe seleccionar obligatoriamente un motivo para registrar en el log de auditoría.
        </p>

        {/* Reason selector */}
        <div className="flex flex-col gap-2">
          {reasons.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedReason(r)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-xs text-left font-semibold transition-all cursor-pointer ${
                selectedReason === r
                  ? "border-red-400 bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300"
                  : "border-slate-200 dark:border-[#374151] text-gray-700 dark:text-gray-300 hover:border-slate-300"
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full border flex-none flex items-center justify-center ${
                  selectedReason === r ? "border-red-500 bg-red-500" : "border-gray-300"
                }`}
              >
                {selectedReason === r && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
              <span>{r}</span>
            </button>
          ))}
        </div>

        {selectedReason === "Otro motivo" && (
          <input
            type="text"
            placeholder="Escriba el motivo detallado..."
            value={customReason}
            onChange={e => setCustomReason(e.target.value)}
            className="w-full border border-slate-200 dark:border-[#374151] rounded-xl px-3.5 py-2 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-red-400"
          />
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-slate-100 cursor-pointer"
          >
            Volver
          </button>
          <button
            disabled={!isFormValid}
            onClick={handleSubmit}
            className={`flex-1 py-2.5 px-4 rounded-xl text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer ${
              isFormValid
                ? "bg-red-600 hover:bg-red-700 active:scale-95"
                : "bg-gray-300 dark:bg-gray-700 cursor-not-allowed opacity-60"
            }`}
          >
            Confirmar {isReject ? "Rechazo" : "Cancelación"}
          </button>
        </div>
      </div>
    </div>
  );
};
