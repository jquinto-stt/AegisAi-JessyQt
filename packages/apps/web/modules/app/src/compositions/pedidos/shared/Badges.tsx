import React from "react";
import { OrderStatus, UrgencyLevel, OrderChannel, AIConfidence, ConversationStatus, HandoffReason } from "../types";
import {
  Sparkles,
  Clock,
  CheckCircle,
  ChefHat,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Globe,
  Store,
  Phone,
  CheckCircle2,
  Flame,
  Bot,
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
      bg: "bg-zinc-100 dark:bg-zinc-800",
      text: "text-zinc-900 dark:text-zinc-100",
      border: "border-zinc-200 dark:border-zinc-700",
      icon: <Sparkles className="w-3 h-3 text-[#FF3F1A]" />,
    },
    CONFIRMADO: {
      label: "Confirmado",
      bg: "bg-zinc-100 dark:bg-zinc-800",
      text: "text-zinc-900 dark:text-zinc-100",
      border: "border-zinc-200 dark:border-zinc-700",
      icon: <CheckCircle className="w-3 h-3 text-zinc-600 dark:text-zinc-300" />,
    },
    EN_PREPARACION: {
      label: "En Cocina",
      bg: "bg-orange-50 dark:bg-orange-950/40",
      text: "text-[#FF3F1A]",
      border: "border-orange-200/80 dark:border-orange-900/60",
      icon: <ChefHat className="w-3 h-3 text-[#FF3F1A]" />,
    },
    LISTO: {
      label: "Listo",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      text: "text-emerald-700 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-800/60",
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-500" />,
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
      bg: "bg-red-50 dark:bg-red-950/40",
      text: "text-red-600 dark:text-red-400",
      border: "border-red-200 dark:border-red-900/40",
      icon: <XCircle className="w-3 h-3 text-red-500" />,
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
      className={`inline-flex items-center gap-1.5 font-mono font-medium rounded-md border ${padding} ${c.bg} ${c.text} ${c.border}`}
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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60">
        <Flame className="w-3 h-3 text-red-500" />
        <span>RETRASO {elapsedMin && estMin ? `(+${elapsedMin - estMin}m)` : ""}</span>
      </span>
    );
  }

  if (urgency === "PROXIMO") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60">
        <Clock className="w-3 h-3 text-amber-500" />
        <span>POR VENCER</span>
      </span>
    );
  }

  return null;
};

export const ChannelBadge: React.FC<{ channel: OrderChannel }> = ({ channel }) => {
  const configs: Record<OrderChannel, { label: string; icon: React.ReactNode; color: string }> = {
    whatsapp: {
      label: "WhatsApp",
      icon: <MessageSquare className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />,
      color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
    web: {
      label: "Web",
      icon: <Globe className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />,
      color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    },
    presencial: {
      label: "POS",
      icon: <Store className="w-2.5 h-2.5 text-zinc-500 dark:text-zinc-400" />,
      color: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
    },
    telefono: {
      label: "Teléfono",
      icon: <Phone className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />,
      color: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
  };

  const c = configs[channel] || configs.web;

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium select-none ${c.color}`}>
      {c.icon}
      <span>{c.label}</span>
    </span>
  );
};

/** Estado del control de una conversación HITL (IA / requiere / humano / resuelto). */
export const ConversationStatusBadge: React.FC<{ status: ConversationStatus; size?: "sm" | "md" }> = ({
  status,
  size = "md",
}) => {
  const configs: Record<
    ConversationStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode; pulse?: boolean }
  > = {
    IA_ATENDIENDO: {
      label: "IA atendiendo",
      bg: "bg-zinc-100 dark:bg-zinc-800",
      text: "text-zinc-700 dark:text-zinc-300",
      border: "border-zinc-200 dark:border-zinc-700",
      icon: <Bot className="w-3 h-3 text-[#FF3F1A]" />,
    },
    REQUIERE_INTERVENCION: {
      label: "Requiere intervención",
      bg: "bg-orange-50 dark:bg-orange-950/40",
      text: "text-[#FF3F1A]",
      border: "border-orange-200/80 dark:border-orange-900/60",
      icon: <Hand className="w-3 h-3 text-[#FF3F1A]" />,
      pulse: true,
    },
    HUMANO_ATENDIENDO: {
      label: "Humano atendiendo",
      bg: "bg-zinc-950 dark:bg-white",
      text: "text-white dark:text-zinc-950",
      border: "border-zinc-950 dark:border-white",
      icon: <UserCheck className="w-3 h-3 text-[#FF3F1A]" />,
    },
    RESUELTO: {
      label: "Resuelto",
      bg: "bg-zinc-100 dark:bg-zinc-800",
      text: "text-zinc-500 dark:text-zinc-400",
      border: "border-zinc-200 dark:border-zinc-700",
      icon: <CheckCircle className="w-3 h-3 text-emerald-500" />,
    },
  };

  const c = configs[status];
  const padding = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium rounded-md border ${padding} ${c.bg} ${c.text} ${c.border} ${c.pulse ? "animate-pulse" : ""}`}
    >
      {c.icon}
      <span>{c.label}</span>
    </span>
  );
};

/**
 * Indicador de estado de conversación MINIMALISTA para listas densas.
 * Un punto de color + etiqueta corta. Pensado para escanear rápido la bandeja
 * sin el peso visual del ConversationStatusBadge (fondo + borde + icono).
 */
export const ConversationStatusDot: React.FC<{ status: ConversationStatus }> = ({ status }) => {
  const configs: Record<ConversationStatus, { label: string; dot: string; text: string; pulse?: boolean }> = {
    IA_ATENDIENDO: { label: "IA", dot: "bg-zinc-300 dark:bg-zinc-600", text: "text-zinc-400" },
    REQUIERE_INTERVENCION: { label: "Requiere atención", dot: "bg-[#FF3F1A]", text: "text-[#FF3F1A]", pulse: true },
    HUMANO_ATENDIENDO: { label: "Humano", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
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

/** Motivo por el que una conversación requiere intervención humana. */
export const HandoffReasonBadge: React.FC<{ reason: HandoffReason }> = ({ reason }) => {
  const labels: Record<HandoffReason, string> = {
    AMBIGUO: "Pedido ambiguo",
    FUERA_DE_ALCANCE: "Fuera de alcance",
    MODIFICACION_ESPECIAL: "Modificación especial",
    CONFIRMAR_DATO: "Confirmar dato",
    CLIENTE_PIDE_HUMANO: "Pidió un humano",
    BAJA_CONFIANZA: "Baja confianza IA",
    VERIFICAR_PAGO_TRANSFERENCIA: "Comprobante Nequi / Bancolombia",
  };

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
      <HelpCircle className="w-3 h-3 text-amber-500" />
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
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-[#FF3F1A] transition-colors cursor-pointer"
      title="Procesado por Asistente IA"
    >
      <Bot className="w-3 h-3 text-[#FF3F1A]" />
      <span>IA {confidence ? `· ${confidence}` : ""}</span>
    </button>
  );
};
