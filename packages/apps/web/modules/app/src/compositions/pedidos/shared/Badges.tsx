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
      bg: "bg-blue-50 dark:bg-blue-950/50",
      text: "text-blue-700 dark:text-blue-300",
      border: "border-blue-200 dark:border-blue-800",
      icon: <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
    },
    CONFIRMADO: {
      label: "Confirmado",
      bg: "bg-indigo-50 dark:bg-indigo-950/50",
      text: "text-indigo-700 dark:text-indigo-300",
      border: "border-indigo-200 dark:border-indigo-800",
      icon: <CheckCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />,
    },
    EN_PREPARACION: {
      label: "En Preparación",
      bg: "bg-amber-50 dark:bg-amber-950/50",
      text: "text-amber-800 dark:text-amber-300",
      border: "border-amber-200 dark:border-amber-800",
      icon: <ChefHat className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />,
    },
    LISTO: {
      label: "Listo para Entrega",
      bg: "bg-emerald-50 dark:bg-emerald-950/50",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200 dark:border-emerald-800",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
    },
    FINALIZADO: {
      label: "Finalizado / Entregado",
      bg: "bg-slate-100 dark:bg-gray-800",
      text: "text-slate-700 dark:text-gray-300",
      border: "border-slate-200 dark:border-gray-700",
      icon: <CheckCircle className="w-3.5 h-3.5 text-slate-500" />,
    },
    RECHAZADO: {
      label: "Rechazado",
      bg: "bg-rose-50 dark:bg-rose-950/50",
      text: "text-rose-700 dark:text-rose-300",
      border: "border-rose-200 dark:border-rose-800",
      icon: <XCircle className="w-3.5 h-3.5 text-rose-500" />,
    },
    CANCELADO: {
      label: "Cancelado",
      bg: "bg-red-50 dark:bg-red-950/50",
      text: "text-red-700 dark:text-red-300",
      border: "border-red-200 dark:border-red-800",
      icon: <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
    },
  };

  const c = configs[status];
  const padding = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-extrabold rounded-full border shadow-xs ${padding} ${c.bg} ${c.text} ${c.border}`}
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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 animate-pulse">
        <Flame className="w-3 h-3 text-red-600" />
        <span>RETRASADO {elapsedMin && estMin ? `(+${elapsedMin - estMin}m)` : ""}</span>
      </span>
    );
  }
  if (urgency === "PROXIMO") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
        <Clock className="w-3 h-3 text-amber-600" />
        <span>Próximo a vencer</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
      <Clock className="w-3 h-3 text-emerald-600" />
      <span>A tiempo</span>
    </span>
  );
};

export const ChannelBadge: React.FC<{ channel: OrderChannel }> = ({ channel }) => {
  const configs: Record<OrderChannel, { label: string; icon: React.ReactNode; color: string }> = {
    whatsapp: {
      label: "WhatsApp",
      icon: <MessageSquare className="w-3 h-3 text-emerald-500" />,
      color: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
    },
    web: {
      label: "Web Necto",
      icon: <Globe className="w-3 h-3 text-blue-500" />,
      color: "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
    },
    presencial: {
      label: "Mostrador",
      icon: <Store className="w-3 h-3 text-purple-500" />,
      color: "text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800",
    },
    telefono: {
      label: "Teléfono",
      icon: <Phone className="w-3 h-3 text-slate-500" />,
      color: "text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-gray-800 border-slate-200 dark:border-gray-700",
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
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-blue-500/10 border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:scale-105 transition-transform cursor-pointer shadow-xs"
      title="Interpretado por Necto IA. Requiere confirmación humana."
    >
      <Sparkles className="w-3 h-3 text-[#FF3F1A] animate-pulse" />
      <span>IA · {confidence}</span>
    </button>
  );
};
