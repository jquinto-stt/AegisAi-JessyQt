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
      border: "border-zinc-300 dark:border-zinc-700",
      icon: <Sparkles className="w-3.5 h-3.5 text-[#FF3F1A]" />,
    },
    CONFIRMADO: {
      label: "Confirmado",
      bg: "bg-zinc-100 dark:bg-zinc-800",
      text: "text-zinc-900 dark:text-zinc-100",
      border: "border-zinc-300 dark:border-zinc-700",
      icon: <CheckCircle className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />,
    },
    EN_PREPARACION: {
      label: "En Preparación",
      bg: "bg-orange-50 dark:bg-orange-950/60",
      text: "text-[#FF3F1A]",
      border: "border-orange-200 dark:border-orange-900/60",
      icon: <ChefHat className="w-3.5 h-3.5 text-[#FF3F1A]" />,
    },
    LISTO: {
      label: "Listo para Entrega",
      bg: "bg-zinc-900 dark:bg-zinc-100",
      text: "text-white dark:text-zinc-900",
      border: "border-zinc-900 dark:border-zinc-100",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#FF3F1A]" />,
    },
    FINALIZADO: {
      label: "Entregado",
      bg: "bg-slate-100 dark:bg-gray-800",
      text: "text-slate-600 dark:text-gray-400",
      border: "border-slate-200 dark:border-gray-700",
      icon: <CheckCircle className="w-3.5 h-3.5 text-slate-500" />,
    },
    RECHAZADO: {
      label: "Rechazado",
      bg: "bg-slate-100 dark:bg-gray-800",
      text: "text-red-600 dark:text-red-400",
      border: "border-red-200 dark:border-red-900/40",
      icon: <XCircle className="w-3.5 h-3.5 text-red-500" />,
    },
    CANCELADO: {
      label: "Cancelado",
      bg: "bg-slate-100 dark:bg-gray-800",
      text: "text-red-600 dark:text-red-400",
      border: "border-red-200 dark:border-red-900/40",
      icon: <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
    },
  };

  const c = configs[status];
  const padding = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-full border shadow-xs ${padding} ${c.bg} ${c.text} ${c.border}`}
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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
        <Flame className="w-3 h-3 text-red-500" />
        <span>RETRASO {elapsedMin && estMin ? `(+${elapsedMin - estMin}m)` : ""}</span>
      </span>
    );
  }
  if (urgency === "PROXIMO") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-gray-800 text-[#FF3F1A] border border-slate-200 dark:border-gray-700">
        <Clock className="w-3 h-3 text-[#FF3F1A]" />
        <span>Próximo</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-gray-800 text-zinc-700 dark:text-zinc-300 border border-slate-200 dark:border-gray-700">
      <Clock className="w-3 h-3 text-zinc-500" />
      <span>A tiempo</span>
    </span>
  );
};

export const ChannelBadge: React.FC<{ channel: OrderChannel }> = ({ channel }) => {
  const configs: Record<OrderChannel, { label: string; icon: React.ReactNode; color: string }> = {
    whatsapp: {
      label: "WhatsApp",
      icon: <MessageSquare className="w-3 h-3 text-zinc-700 dark:text-zinc-300" />,
      color: "text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
    },
    web: {
      label: "Web",
      icon: <Globe className="w-3 h-3 text-zinc-700 dark:text-zinc-300" />,
      color: "text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
    },
    presencial: {
      label: "Mostrador",
      icon: <Store className="w-3 h-3 text-zinc-700 dark:text-zinc-300" />,
      color: "text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
    },
    telefono: {
      label: "Teléfono",
      icon: <Phone className="w-3 h-3 text-zinc-700 dark:text-zinc-300" />,
      color: "text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
    },
  };

  const c = configs[channel];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${c.color}`}>
      {c.icon}
      <span>{c.label}</span>
    </span>
  );
};

export const AIBadge: React.FC<{
  confidence?: AIConfidence;
  onClick?: (e: React.MouseEvent) => void;
}> = ({
  confidence = "Alta",
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:border-[#FF3F1A] transition-colors cursor-pointer shadow-xs"
      title="Interpretado por Necto IA. Requiere confirmación humana."
    >
      <Sparkles className="w-3 h-3 text-[#FF3F1A]" />
      <span>IA · {confidence}</span>
    </button>
  );
};
