import { useState, useEffect } from "react";
import { 
  Phone, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Clock3, 
  X, 
  ShieldCheck, 
  FileText, 
  Store,
  UserCheck
} from "lucide-react";

import type { AttentionStatus, Conversation } from "@/contracts/conversation.contract";
import { Badge } from "@/elements";
import { STORE_OPERATORS } from "../mock-conversations";
import { formatTime } from "../conversation-time.utils";
import { CounterpartAvatar } from "../shared/CounterpartAvatar";
import { useBusiness } from "@/context/BusinessContext";

export interface ConversationAttentionPanelProps {
  conversation: Conversation;
  onUpdateStatus: (conversationId: string, status: AttentionStatus) => void;
  onAssignOperator: (
    conversationId: string, 
    operator: { id: string; name: string } | null
  ) => void;
  onUpdateNotes: (conversationId: string, notes: string) => void;
  onClose?: () => void;
}

export function ConversationAttentionPanel({
  conversation,
  onUpdateStatus,
  onAssignOperator,
  onUpdateNotes,
  onClose,
}: ConversationAttentionPanelProps) {
  const { activeBusiness } = useBusiness();
  const [notes, setNotes] = useState(conversation.notes || "");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setNotes(conversation.notes || "");
    setIsSaved(false);
  }, [conversation.id, conversation.notes]);

  const handleSaveNotes = () => {
    onUpdateNotes(conversation.id, notes);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const currentStatus: AttentionStatus = conversation.attentionStatus || "pending";

  const statusConfig: Record<
    AttentionStatus, 
    { label: string; icon: typeof Clock3; activeClass: string; badgeClass: string; textClass: string }
  > = {
    pending: {
      label: "Por atender",
      icon: AlertCircle,
      activeClass: "bg-[#FF3F1A] text-white shadow-sm",
      badgeClass: "bg-[#FF3F1A]/10 text-[#FF3F1A] border-[#FF3F1A]/30 dark:bg-[#FF3F1A]/20 dark:text-[#FF3F1A]",
      textClass: "text-[#FF3F1A]",
    },
    in_progress: {
      label: "En atención",
      icon: Clock3,
      activeClass: "bg-[#190088] text-white shadow-sm",
      badgeClass: "bg-[#190088]/10 text-[#190088] border-[#190088]/20 dark:bg-[#97D6DF]/15 dark:text-[#97D6DF] dark:border-[#97D6DF]/30",
      textClass: "text-[#190088] dark:text-[#97D6DF]",
    },
    resolved: {
      label: "Resuelta",
      icon: CheckCircle2,
      activeClass: "bg-emerald-600 text-white shadow-sm",
      badgeClass: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300",
      textClass: "text-emerald-600 dark:text-emerald-400",
    },
  };

  return (
    <div
      data-attention-panel
      className="flex h-full w-full flex-col border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-[#111827] sm:w-80"
    >
      {/* ── Encabezado del panel ────────────────────────────────────────────── */}
      <div className="flex flex-none items-center justify-between border-b border-gray-200 px-4 py-3.5 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#FF3F1A]" />
          <h3 className="text-theme-sm font-bold text-[#190088] dark:text-white">
            Atención Operativa
          </h3>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel de atención"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-[#EFE6D3]/40 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Contenido con scroll ───────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {/* Ficha del contacto */}
        <div className="flex flex-col items-center rounded-2xl border border-[#EFE6D3] bg-[#EFE6D3]/20 p-4 text-center dark:border-gray-800 dark:bg-gray-800/30">
          <div className="relative mb-2">
            <CounterpartAvatar
              initials={conversation.counterpart.initials}
              size={56}
              tone="brand"
            />
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#97D6DF] dark:border-gray-900 shadow-xs" />
          </div>
          <h4 className="text-theme-sm font-bold text-gray-900 dark:text-white">
            {conversation.counterpart.name}
          </h4>
          <span className="mt-0.5 inline-flex items-center gap-1 text-theme-xs text-gray-500 dark:text-gray-400">
            <Phone className="h-3 w-3" />
            {conversation.counterpart.phone}
          </span>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
            <Clock className="h-3 w-3" />
            Última actividad: {formatTime(conversation.lastMessageAt)}
          </div>
        </div>

        {/* Estado de la conversación */}
        <div className="space-y-2">
          <label className="text-theme-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Estado de atención
          </label>
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-gray-100/90 p-1 dark:bg-gray-800/80">
            {(["pending", "in_progress", "resolved"] as AttentionStatus[]).map(statusKey => {
              const conf = statusConfig[statusKey];
              const isActive = currentStatus === statusKey;
              return (
                <button
                  key={statusKey}
                  type="button"
                  onClick={() => onUpdateStatus(conversation.id, statusKey)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-lg py-2 px-1 text-center transition-all cursor-pointer ${
                    isActive
                      ? conf.activeClass
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5"
                  }`}
                >
                  <conf.icon className="h-4 w-4" />
                  <span className="text-[11px] font-medium leading-tight">{conf.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Persona asignada */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-theme-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Asesor asignado
            </label>
            {conversation.assignedTo && (
              <span className="text-[11px] text-[#190088] dark:text-[#97D6DF] font-semibold flex items-center gap-1">
                <UserCheck className="h-3 w-3" /> Activo
              </span>
            )}
          </div>
          <select
            value={conversation.assignedTo?.id || ""}
            onChange={e => {
              const val = e.target.value;
              if (!val) {
                onAssignOperator(conversation.id, null);
              } else {
                const op = STORE_OPERATORS.find(o => o.id === val);
                if (op) onAssignOperator(conversation.id, op);
              }
            }}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-theme-sm text-gray-800 shadow-sm focus:border-[#FF3F1A] focus:outline-none focus:ring-1 focus:ring-[#FF3F1A] dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">(Sin asignar - Cola general)</option>
            {STORE_OPERATORS.map(op => (
              <option key={op.id} value={op.id}>
                {op.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sede / Canal */}
        <div className="rounded-xl border border-[#EFE6D3]/60 bg-[#EFE6D3]/15 p-3 dark:border-gray-800 dark:bg-gray-800/20">
          <div className="flex items-center justify-between text-theme-xs">
            <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <Store className="h-3.5 w-3.5 text-[#FF3F1A]" /> Sede actual:
            </span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {activeBusiness?.name || "Sin sede"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-theme-xs border-t border-gray-200/50 pt-2 dark:border-gray-800">
            <span className="text-gray-500 dark:text-gray-400">Canal:</span>
            <Badge color="light" size="sm" className="bg-[#190088]/10 text-[#190088] dark:bg-white/10 dark:text-[#97D6DF] font-semibold border border-[#190088]/20 dark:border-transparent">
              WhatsApp Necto
            </Badge>
          </div>
        </div>

        {/* Notas operativas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-theme-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <FileText className="h-3.5 w-3.5 text-[#190088] dark:text-[#97D6DF]" />
              Notas de seguimiento
            </label>
            {isSaved && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Guardado ✓
              </span>
            )}
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Añade notas sobre el pedido, acuerdo o requerimiento especial de este cliente..."
            rows={3}
            className="w-full resize-none rounded-xl border border-gray-200 bg-white p-2.5 text-theme-xs text-gray-800 shadow-sm focus:border-[#FF3F1A] focus:outline-none focus:ring-1 focus:ring-[#FF3F1A] dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveNotes}
              className="rounded-xl bg-[#190088] hover:bg-[#190088]/90 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Guardar notas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
