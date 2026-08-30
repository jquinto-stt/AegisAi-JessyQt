import React from "react";
import { OrderStatus, UrgencyLevel, OrderChannel, AIConfidence } from "../types";
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
      bg: "bg-zinc-950 dark:bg-white",
      text: "text-white dark:text-zinc-950",
      border: "border-zinc-950 dark:border-white",
      icon: <CheckCircle2 className="w-3 h-3 text-[#FF3F1A]" />,
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

  if (urgency === "URGENTE") {
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
      icon: <MessageSquare className="w-3 h-3 text-emerald-500" />,
      color: "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300",
    },
    web: {
      label: "Web",
      icon: <Globe className="w-3 h-3 text-blue-500" />,
      color: "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300",
    },
    presencial: {
      label: "POS",
      icon: <Store className="w-3 h-3 text-zinc-500" />,
      color: "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300",
    },
    telefono: {
      label: "Teléfono",
      icon: <Phone className="w-3 h-3 text-amber-500" />,
      color: "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300",
    },
  };

  const c = configs[channel];

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border bg-zinc-50 dark:bg-zinc-900 ${c.color}`}>
      {c.icon}
      <span>{c.label}</span>
    </span>
  );
};

export const AIBadge: React.FC<{ confidence: AIConfidence; onClick?: (e: any) => void }> = ({
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
      <span>IA {confidence}%</span>
    </button>
  );
};
