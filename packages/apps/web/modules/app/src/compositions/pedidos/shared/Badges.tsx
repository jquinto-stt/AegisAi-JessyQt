import React from "react";
import { OrderStatus, UrgencyLevel, OrderChannel, AIConfidence, ConversationStatus, HandoffReason } from "../types";
import {
  ShoppingBag,
  Clock,
  CheckCircle,
  ChefHat,
  XCircle,
  AlertTriangle,
  MessageSquare,
  MessageSquareText,
  Globe,
  Store,
  Phone,
  CheckCircle2,
  Flame,
  Hand,
  UserCheck,
  HelpCircle,
} from "lucide-react";

export const OrderStatusBadge: React.FC<{ status: OrderStatus; size?: "sm" | "md" }> = ({
  status,
  size = "md",
}) => {
  const configs: Record<
    OrderStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    NUEVO: {
      label: "Nuevo",
      bg: "bg-[#ECECEC] dark:bg-zinc-800",
      text: "text-[#212121] dark:text-[#ECECEC]",
      border: "border-zinc-200 dark:border-zinc-700",
      icon: <ShoppingBag className="w-3 h-3 text-[#190088] dark:text-[#97D6DF]" />,
    },
    CONFIRMADO: {
      label: "Confirmado",
      bg: "bg-[#190088]/10 dark:bg-[#190088]/25",
      text: "text-[#190088] dark:text-[#97D6DF]",
      border: "border-[#190088]/20 dark:border-[#190088]/40",
      icon: <CheckCircle className="w-3 h-3 text-[#190088] dark:text-[#97D6DF]" />,
    },
    EN_PREPARACION: {
      label: "En Cocina",
      bg: "bg-[#190088]/10 dark:bg-[#190088]/25",
      text: "text-[#190088] dark:text-[#97D6DF]",
      border: "border-[#190088]/20 dark:border-[#190088]/40",
      icon: <ChefHat className="w-3 h-3 text-[#190088] dark:text-[#97D6DF]" />,
    },
    LISTO: {
      label: "Listo",
      bg: "bg-[#97D6DF]/20 dark:bg-[#97D6DF]/15",
      text: "text-[#190088] dark:text-[#97D6DF]",
      border: "border-[#97D6DF]/40",
      icon: <CheckCircle2 className="w-3 h-3 text-[#190088] dark:text-[#97D6DF]" />,
    },
    FINALIZADO: {
      label: "Entregado",
      bg: "bg-zinc-100 dark:bg-zinc-800",
      text: "text-zinc-500 dark:text-zinc-400",
      border: "border-zinc-200 dark:border-zinc-700",
      icon: <CheckCircle className="w-3 h-3 text-zinc-400" />,
    },
    RECHAZADO: {
      label: "Rechazado",
      bg: "bg-zinc-100 dark:bg-zinc-800",
      text: "text-zinc-600 dark:text-zinc-300",
      border: "border-zinc-300 dark:border-zinc-700",
      icon: <XCircle className="w-3 h-3 text-zinc-500" />,
    },
    CANCELADO: {
      label: "Cancelado",
      bg: "bg-zinc-100 dark:bg-zinc-800",
      text: "text-zinc-500 dark:text-zinc-400",
      border: "border-zinc-200 dark:border-zinc-700",
      icon: <AlertTriangle className="w-3 h-3 text-zinc-400" />,
    },
  };

  const c = configs[status];
  const padding = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-bold rounded-md border ${padding} ${c.bg} ${c.text} ${c.border}`}
    >
      {c.icon}
      <span>{c.label}</span>
    </span>
  );
};

export const UrgencyBadge: React.FC<{ urgency: UrgencyLevel; elapsedMin?: number; estMin?: number }> = ({
  urgency,
  elapsedMin,
  estMin,
}) => {
  if (urgency === "RETRASADO") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#190088]/15 text-[#190088] dark:text-[#97D6DF] border border-[#190088]/30">
        <Flame className="w-3 h-3 text-[#190088] dark:text-[#97D6DF]" />
        <span>RETRASO {elapsedMin && estMin ? `(+${elapsedMin - estMin}m)` : ""}</span>
      </span>
    );
  }

  if (urgency === "PROXIMO") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] border border-[#190088]/20">
        <Clock className="w-3 h-3 text-[#190088] dark:text-[#97D6DF]" />
        <span>POR VENCER</span>
      </span>
    );
  }

  return null;
};

export const ChannelBadge: React.FC<{ channel: OrderChannel }> = ({ channel }) => {
  const configs: Record<OrderChannel, { label: string; icon: React.ReactNode; color: string; border: string }> = {
    whatsapp: {
      label: "WhatsApp",
      icon: <MessageSquare className="w-2.5 h-2.5 text-[#190088] dark:text-[#97D6DF]" />,
      color: "bg-[#97D6DF]/20 text-[#190088] dark:text-[#97D6DF]",
      border: "border border-[#97D6DF]/40",
    },
    web: {
      label: "Web",
      icon: <Globe className="w-2.5 h-2.5 text-[#190088] dark:text-[#97D6DF]" />,
      color: "bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF]",
      border: "border border-[#190088]/20 dark:border-[#190088]/40",
    },
    presencial: {
      label: "POS",
      icon: <Store className="w-2.5 h-2.5 text-[#212121] dark:text-[#ECECEC]" />,
      color: "bg-[#ECECEC] dark:bg-zinc-800 text-[#212121] dark:text-[#ECECEC]",
      border: "border border-zinc-200 dark:border-zinc-700",
    },
    telefono: {
      label: "Teléfono",
      icon: <Phone className="w-2.5 h-2.5 text-[#FF3F1A]" />,
      color: "bg-[#EFE6D3]/60 dark:bg-[#EFE6D3]/15 text-[#212121] dark:text-[#ECECEC]",
      border: "border border-[#EFE6D3] dark:border-[#EFE6D3]/30",
    },
  };

  const c = configs[channel] || configs.web;

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold select-none ${c.color} ${c.border}`}>
      {c.icon}
      <span>{c.label}</span>
    </span>
  );
};

export const ConversationStatusBadge: React.FC<{ status: ConversationStatus; size?: "sm" | "md" }> = ({
  status,
  size = "md",
}) => {
  const configs: Record<
    ConversationStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode; pulse?: boolean }
  > = {
    IA_ATENDIENDO: {
      label: "Auto-atendiendo",
      bg: "bg-[#190088]/10 dark:bg-[#190088]/25",
      text: "text-[#190088] dark:text-[#97D6DF]",
      border: "border-[#190088]/20 dark:border-[#190088]/40",
      icon: <MessageSquare className="w-3 h-3 text-[#190088] dark:text-[#97D6DF]" />,
    },
    REQUIERE_INTERVENCION: {
      label: "Requiere intervención",
      bg: "bg-[#FF3F1A]/10 dark:bg-[#FF3F1A]/20",
      text: "text-[#FF3F1A]",
      border: "border-[#FF3F1A]/25 dark:border-[#FF3F1A]/40",
      icon: <Hand className="w-3 h-3 text-[#FF3F1A]" />,
      pulse: true,
    },
    HUMANO_ATENDIENDO: {
      label: "Operador en vivo",
      bg: "bg-[#212121] dark:bg-zinc-800",
      text: "text-white dark:text-zinc-100",
      border: "border-[#212121] dark:border-zinc-700",
      icon: <UserCheck className="w-3 h-3 text-[#FF3F1A]" />,
    },
    RESUELTO: {
      label: "Resuelto",
      bg: "bg-[#97D6DF]/20 dark:bg-[#97D6DF]/15",
      text: "text-[#190088] dark:text-[#97D6DF]",
      border: "border-[#97D6DF]/40",
      icon: <CheckCircle className="w-3 h-3 text-[#190088] dark:text-[#97D6DF]" />,
    },
  };

  const c = configs[status];
  const padding = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-bold rounded-md border ${padding} ${c.bg} ${c.text} ${c.border} ${c.pulse ? "animate-pulse" : ""}`}
    >
      {c.icon}
      <span>{c.label}</span>
    </span>
  );
};

export const ConversationStatusDot: React.FC<{ status: ConversationStatus }> = ({ status }) => {
  const configs: Record<ConversationStatus, { label: string; dot: string; text: string; pulse?: boolean }> = {
    IA_ATENDIENDO: { label: "Auto", dot: "bg-[#190088]", text: "text-[#190088] dark:text-[#97D6DF]" },
    REQUIERE_INTERVENCION: { label: "Requiere atención", dot: "bg-[#FF3F1A]", text: "text-[#FF3F1A]", pulse: true },
    HUMANO_ATENDIENDO: { label: "Operador", dot: "bg-[#97D6DF]", text: "text-[#190088] dark:text-[#97D6DF]" },
    RESUELTO: { label: "Resuelto", dot: "bg-zinc-300 dark:bg-zinc-600", text: "text-zinc-400" },
  };
  const c = configs[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-none ${c.dot} ${c.pulse ? "animate-pulse" : ""}`} />
      {c.label}
    </span>
  );
};

export const HandoffReasonBadge: React.FC<{ reason: HandoffReason }> = ({ reason }) => {
  const labels: Record<HandoffReason, string> = {
    AMBIGUO: "Pedido ambiguo",
    FUERA_DE_ALCANCE: "Fuera de alcance",
    MODIFICACION_ESPECIAL: "Modificación especial",
    CONFIRMAR_DATO: "Confirmar dato",
    CLIENTE_PIDE_HUMANO: "Pidió un operador",
    BAJA_CONFIANZA: "Baja confianza",
    VERIFICAR_PAGO_TRANSFERENCIA: "Comprobante Nequi / Bancolombia",
    RECLAMO_INCIDENCIA: "Reclamo / Incidencia",
  };

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
      <HelpCircle className="w-3 h-3 text-[#FF3F1A]" />
      <span>{labels[reason]}</span>
    </span>
  );
};

export const AIBadge: React.FC<{ confidence?: AIConfidence; onClick?: (e: any) => void }> = ({
  confidence,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-[#FF3F1A] transition-colors cursor-pointer"
      title="Procesado automáticamente vía WhatsApp"
    >
      <MessageSquareText className="w-3 h-3 text-[#FF3F1A]" />
      <span>WhatsApp {confidence ? `· ${confidence}` : ""}</span>
    </button>
  );
};
