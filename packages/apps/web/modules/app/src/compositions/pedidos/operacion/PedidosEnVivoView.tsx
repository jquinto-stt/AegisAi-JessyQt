import React, { useState, useEffect } from "react";
import { usePedidos } from "../context/PedidosContext";
import { OrderStatus, OrderChannel, UrgencyLevel, Pedido } from "../types";
import {
  Plus,
  ShoppingBag,
  CheckCircle2,
  CheckCheck,
  LayoutGrid,
  Kanban,
  AlertTriangle,
  X,
  SlidersHorizontal,
  Check,
  Package,
  Volume2,
  VolumeX,
  ShieldAlert,
  Search,
  ExternalLink,
  Smartphone,
  Globe,
  Store,
  Phone,
  MapPin,
  List,
  FileText,
  Bike,
  CreditCard,
  ArrowRight,
  Table2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react";

import { useBusiness } from "@/context/BusinessContext";
import { playOrderAlert } from "@/utils/audioAlerts";
import { OperacionTab } from "../types";
import { Badge, Button } from "@/elements";
import { ChannelBadge } from "../shared/Badges";

export type OperationalStageId = "NUEVO" | "CONFIRMADO" | "EN_PREPARACION" | "LISTO";

export interface OperationalStageConfig {
  id: OperationalStageId;
  title: string;
  shortLabel: string;
  colorBar: string;
  requiresPrep?: boolean;
}

export const ALL_OPERATIONAL_STAGES: OperationalStageConfig[] = [
  { id: "NUEVO", title: "Nuevas", shortLabel: "Nuevas", colorBar: "bg-brand-500" },
  { id: "CONFIRMADO", title: "Confirmadas", shortLabel: "Confirmadas", colorBar: "bg-blue-light-500" },
  { id: "EN_PREPARACION", title: "En preparación", shortLabel: "En preparación", colorBar: "bg-warning-500", requiresPrep: true },
  { id: "LISTO", title: "Listas para entrega", shortLabel: "Listas para entrega", colorBar: "bg-success-500" },
];

export const PedidosEnVivoView: React.FC<{
  onNavigateOpTab?: (t: OperacionTab) => void;
}> = () => {
  const {
    orders,
    setSelectedOrderId,
    createManualOrder,
    confirmOrder,
    sendToKitchen,
    markOrderReady,
    deliverOrder,
    isPreparacionEnabled,
    isSoundEnabled,
    toggleSound,
    incidencias,
    setIsIncidenciasOpen,
  } = usePedidos();
  const { activeBusiness } = useBusiness();

  // View Mode: Kanban (operacional) vs Tabla (gestión e historial)
  const [viewMode, setViewMode] = useState<"kanban" | "table">(() => {
    try {
      const saved = localStorage.getItem("necto_pedidos_view_mode");
      if (saved === "kanban" || saved === "table") return saved;
    } catch {}
    return "kanban";
  });

  useEffect(() => {
    try {
      localStorage.setItem("necto_pedidos_view_mode", viewMode);
    } catch {}
  }, [viewMode]);

  // Configurable operational stages for Kanban
  const stagesStorageKey = `necto_kanban_flow_${activeBusiness?.id || "default"}`;

  const getDefaultStages = (): OperationalStageId[] => {
    return isPreparacionEnabled
      ? ["NUEVO", "CONFIRMADO", "EN_PREPARACION", "LISTO"]
      : ["NUEVO", "CONFIRMADO", "LISTO"];
  };

  const [selectedStages, setSelectedStages] = useState<OperationalStageId[]>(() => {
    try {
      const saved = localStorage.getItem(stagesStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((id: any) =>
            ALL_OPERATIONAL_STAGES.some(s => s.id === id)
          );
          if (valid.length > 0) return valid;
        }
      }
    } catch {}
    return isPreparacionEnabled
      ? ["NUEVO", "CONFIRMADO", "EN_PREPARACION", "LISTO"]
      : ["NUEVO", "CONFIRMADO", "LISTO"];
  });

  useEffect(() => {
    try {
      localStorage.setItem(stagesStorageKey, JSON.stringify(selectedStages));
    } catch {}
  }, [selectedStages, stagesStorageKey]);

  const toggleStage = (stageId: OperationalStageId) => {
    setSelectedStages(prev =>
      prev.includes(stageId)
        ? prev.filter(id => id !== stageId)
        : [...prev, stageId]
    );
  };

  const resetToDefaultStages = () => {
    setSelectedStages(getDefaultStages());
  };

  // Pipeline order enforcer: always strictly maintain OMS lifecycle order
  const visibleStages = ALL_OPERATIONAL_STAGES
    .filter(stage => !stage.requiresPrep || isPreparacionEnabled)
    .filter(stage => selectedStages.includes(stage.id));

  const isStagesCustomized =
    selectedStages.length !== getDefaultStages().length ||
    !getDefaultStages().every(s => selectedStages.includes(s));

  const [statusFilter, setStatusFilter] = useState<OrderStatus | "TODOS">("TODOS");
  const [channelFilter, setChannelFilter] = useState<OrderChannel | "TODOS">("TODOS");
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyLevel | "TODOS">("TODOS");
  const [searchQuery, setSearchQuery] = useState("");
  const [showManualModal, setShowManualModal] = useState(false);
  const [isGroupActiveOpen, setIsGroupActiveOpen] = useState(true);
  const [isGroupDeliveredOpen, setIsGroupDeliveredOpen] = useState(true);

  const getMondayStatusStyle = (status: OrderStatus, isDelayed?: boolean) => {
    if (isDelayed) return "bg-error-500 hover:bg-error-600 text-white";
    switch (status) {
      case "NUEVO":
      case "PENDIENTE" as any:
        return "bg-brand-500 hover:bg-brand-600 text-white";
      case "CONFIRMADO":
        return "bg-blue-light-600 hover:bg-blue-light-700 text-white";
      case "EN_PREPARACION":
        return "bg-warning-500 hover:bg-warning-600 text-white";
      case "LISTO":
        return "bg-success-600 hover:bg-success-700 text-white";
      case "ENTREGADO":
        return "bg-gray-500 hover:bg-gray-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  const getChannelTagStyle = (channel?: OrderChannel) => {
    switch (channel?.toLowerCase()) {
      case "whatsapp":
        return "bg-success-50 text-success-700 border-success-200 dark:bg-success-950/40 dark:text-success-300 dark:border-success-800";
      case "web":
        return "bg-blue-light-50 text-blue-light-700 border-blue-light-200 dark:bg-blue-light-950/40 dark:text-blue-light-300 dark:border-blue-light-800";
      case "telefono":
        return "bg-accent-50 text-accent-700 border-accent-200 dark:bg-accent-950/40 dark:text-accent-300 dark:border-accent-800";
      case "presencial":
        return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800";
      default:
        return "bg-secondary-50 text-secondary-700 border-secondary-200 dark:bg-secondary-950/40 dark:text-secondary-300 dark:border-secondary-800";
    }
  };

  const [manualCustomer, setManualCustomer] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualChannel, setManualChannel] = useState<OrderChannel>("presencial");
  const [manualNotes, setManualNotes] = useState("");

  const delayedOrders = orders.filter(o => o.urgency === "RETRASADO" && o.status !== "ENTREGADO");
  const delayedCount = delayedOrders.length;

  const nuevosCount = orders.filter(o => o.status === "NUEVO" || (o.status as any) === "PENDIENTE").length;
  const confirmadosCount = orders.filter(o => o.status === "CONFIRMADO").length;
  const preparacionCount = orders.filter(o => o.status === "EN_PREPARACION").length;
  const listosCount = orders.filter(o => o.status === "LISTO").length;
  const entregadosCount = orders.filter(o => o.status === "ENTREGADO" || (o.status as any) === "FINALIZADO").length;

  // Active operational counts (excluding historical delivered orders)
  const activeOrders = orders.filter(o => o.status !== "ENTREGADO" && (o.status as any) !== "FINALIZADO");
  const totalActiveCount = activeOrders.length;
  const visibleActiveCount = activeOrders.filter(o => {
    if (o.status === "NUEVO" || (o.status as any) === "PENDIENTE") return selectedStages.includes("NUEVO");
    return selectedStages.includes(o.status as any);
  }).length;
  const hiddenActiveCount = totalActiveCount - visibleActiveCount;

  const renderPaymentBadge = (pStatus?: string) => {
    const status = pStatus || "PENDIENTE";
    const badgeClasses: Record<string, string> = {
      PAGADO: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60",
      PAGO_CONTRA_ENTREGA: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60",
      PENDIENTE: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60",
      ANULADO: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
      REEMBOLSADO: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/60",
    };
    const badgeLabels: Record<string, string> = {
      PAGADO: "Pagado",
      PAGO_CONTRA_ENTREGA: "Contra entrega",
      PENDIENTE: "Pendiente de pago",
      ANULADO: "Anulado",
      REEMBOLSADO: "Reembolsado",
    };
    return (
      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badgeClasses[status] || badgeClasses.PENDIENTE}`}>
        {badgeLabels[status] || status}
      </span>
    );
  };

  // Filtering
  const filterOrdersList = (list: Pedido[]) => {
    return list.filter(order => {
      if (statusFilter !== "TODOS") {
        if (statusFilter === "NUEVO" || (statusFilter as any) === "PENDIENTE") {
          if (order.status !== "NUEVO" && (order.status as any) !== "PENDIENTE") return false;
        } else if (statusFilter === "ENTREGADO" || (statusFilter as any) === "FINALIZADO") {
          if (order.status !== "ENTREGADO" && (order.status as any) !== "FINALIZADO") return false;
        } else if (order.status !== statusFilter) {
          return false;
        }
      }
      if (channelFilter !== "TODOS" && order.channel !== channelFilter) return false;
      if (urgencyFilter !== "TODOS" && order.urgency !== urgencyFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const cleanTurn = q.replace("#", "");
        const matchId = order.id.toLowerCase().includes(q);
        const matchName = order.customerName.toLowerCase().includes(q);
        const matchPhone = (order.customerPhone || "").toLowerCase().includes(q);
        const matchTurn = cleanTurn && String(order.turnNumber || "").includes(cleanTurn);
        const matchProduct = order.items.some(i => i.name.toLowerCase().includes(q));
        if (!matchId && !matchName && !matchPhone && !matchTurn && !matchProduct) return false;
      }
      return true;
    });
  };

  const filteredOrders = filterOrdersList(orders);

  const handleCreateManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCustomer.trim()) return;
    createManualOrder({
      customerName: manualCustomer.trim(),
      customerPhone: manualPhone.trim() || "+54 11 4455-0000",
      channel: manualChannel,
      notes: manualNotes.trim() || undefined,
    });
    playOrderAlert(activeBusiness?.soundAlert || "bell");
    setManualCustomer("");
    setManualPhone("");
    setManualNotes("");
    setShowManualModal(false);
  };

  const getChannelIcon = (channel: OrderChannel) => {
    switch (channel) {
      case "whatsapp":
        return <Smartphone className="h-5 w-5" />;
      case "web":
        return <Globe className="h-5 w-5" />;
      case "presencial":
        return <Store className="h-5 w-5" />;
      default:
        return <Phone className="h-5 w-5" />;
    }
  };

  const getChannelStyle = (channel: OrderChannel) => {
    switch (channel) {
      case "whatsapp":
        return "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400";
      case "web":
        return "bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400";
      case "presencial":
        return "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400";
      default:
        return "bg-secondary-50 text-secondary-600 dark:bg-secondary-500/15 dark:text-secondary-400";
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "NUEVO":
      case "PENDIENTE" as any:
        return { label: "Nuevo", class: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400", color: "primary" as const };
      case "CONFIRMADO":
        return { label: "Confirmado", class: "bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400", color: "info" as const };
      case "EN_PREPARACION":
        return { label: "En Preparación", class: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400", color: "warning" as const };
      case "LISTO":
        return { label: "Listo para Entrega", class: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400", color: "success" as const };
      case "ENTREGADO":
        return { label: "Entregado", class: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", color: "light" as const };
      default:
        return { label: status, class: "bg-gray-100 text-gray-600", color: "light" as const };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* ── Page Header (Clean SaaS Hierarchy) ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Órdenes
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {orders.filter(o => o.status !== "ENTREGADO").length} activas
            {delayedCount > 0 && <span className="text-amber-600 dark:text-amber-400 font-medium ml-1">· {delayedCount} con demora</span>}
          </p>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={toggleSound}
            title={isSoundEnabled ? "Silenciar notificaciones acústicas" : "Activar sonido"}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
              isSoundEnabled
                ? "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                : "border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-800"
            }`}
          >
            {isSoundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>

          {incidencias.length > 0 && (
            <button
              type="button"
              onClick={() => setIsIncidenciasOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 transition-colors cursor-pointer"
              title="Problemas de stock, dirección o cliente que requieren intervención"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
              <span>Incidencias</span>
              <span className="rounded font-mono text-[10px] text-gray-500 dark:text-gray-400">
                {incidencias.length}
              </span>
            </button>
          )}

          {/* View switcher Segmented Control (Tablero vs Tabla) */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-gray-100/70 p-0.5 dark:border-gray-800 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-white shadow-2xs text-gray-900 dark:bg-gray-700 dark:text-white font-semibold"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Tablero</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-white shadow-2xs text-gray-900 dark:bg-gray-700 dark:text-white font-semibold"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <Table2 className="h-3.5 w-3.5" />
              <span>Tabla</span>
            </button>
          </div>

          {/* + Nueva Orden Button */}
          <button
            type="button"
            onClick={() => setShowManualModal(true)}
            className="rounded-lg bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nueva orden</span>
          </button>
        </div>
      </div>

      {/* ── Unified Controls Bar (Search, Channel, Stage Filters) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente, # orden o producto..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 shadow-theme-xs"
            />
          </div>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as any)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:border-gray-300 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 cursor-pointer shadow-theme-xs flex-none"
          >
            <option value="TODOS">Todos los canales</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="web">Tienda Web</option>
            <option value="presencial">Mostrador / POS</option>
            <option value="telefono">Teléfono</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Stage Filter Chips (Solo para vista Tabla) */}
          {viewMode === "table" && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {[
                { id: "TODOS", label: `Todas (${orders.length})` },
                { id: "NUEVO", label: `Nuevas (${nuevosCount})` },
                { id: "CONFIRMADO", label: `Confirmadas (${confirmadosCount})` },
                ...(isPreparacionEnabled ? [{ id: "EN_PREPARACION", label: `En Preparación (${preparacionCount})` }] : []),
                { id: "LISTO", label: `Listas (${listosCount})` },
                { id: "ENTREGADO", label: `Entregadas (${entregadosCount})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer flex-shrink-0 ${
                    statusFilter === tab.id
                      ? "bg-brand-500 text-white shadow-theme-xs"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Configurable Operational Flow Chips (Para vista Tablero) */}
          {viewMode === "kanban" && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 mr-1 flex items-center gap-1.5">
                <span>Etapas visibles:</span>
              </span>
              {ALL_OPERATIONAL_STAGES
                .filter(stage => !stage.requiresPrep || isPreparacionEnabled)
                .map(stage => {
                  const isSelected = selectedStages.includes(stage.id);
                  const stageCount = orders.filter(o =>
                    o.status === stage.id ||
                    (stage.id === "NUEVO" && (o.status as any) === "PENDIENTE")
                  ).length;

                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => toggleStage(stage.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer border ${
                        isSelected
                          ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white font-medium shadow-2xs"
                          : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800 dark:hover:border-gray-750"
                      }`}
                      title={isSelected ? `Ocultar etapa ${stage.title}` : `Mostrar etapa ${stage.title}`}
                    >
                      <span className={`text-[10px] font-mono ${isSelected ? "text-white dark:text-gray-900 font-bold" : "text-gray-400"}`}>
                        {isSelected ? "✓" : "○"}
                      </span>
                      <span>{stage.shortLabel}</span>
                      <span className={`font-mono text-[11px] ${isSelected ? "text-gray-300 dark:text-gray-500" : "text-gray-400 dark:text-gray-500"}`}>
                        {stageCount}
                      </span>
                    </button>
                  );
                })}

              {isStagesCustomized && (
                <button
                  type="button"
                  onClick={resetToDefaultStages}
                  className="text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 font-medium transition-colors cursor-pointer ml-1 underline decoration-dotted underline-offset-2"
                >
                  Mostrar todas ({totalActiveCount})
                </button>
              )}
            </div>
          )}

          {delayedCount > 0 && (
            <button
              type="button"
              onClick={() => setUrgencyFilter(urgencyFilter === "RETRASADO" ? "TODOS" : "RETRASADO")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                urgencyFilter === "RETRASADO"
                  ? "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300 font-semibold"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 shadow-2xs"
              }`}
            >
              <span>Demoras {delayedCount}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Active Filters Notification Banner ── */}
      {viewMode === "kanban" && hiddenActiveCount > 0 && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-amber-50/70 border border-amber-200/80 dark:bg-amber-950/20 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 flex-none text-amber-600 dark:text-amber-400" />
            <span>
              Mostrando <strong className="font-semibold">{visibleActiveCount}</strong> de <strong className="font-semibold">{totalActiveCount}</strong> órdenes activas ({hiddenActiveCount} en etapas no seleccionadas).
            </span>
          </div>
          <button
            type="button"
            onClick={resetToDefaultStages}
            className="font-semibold hover:underline cursor-pointer flex-none ml-2 text-amber-900 dark:text-amber-200"
          >
            Ver flujo completo →
          </button>
        </div>
      )}

      {/* ── VIEW 1: DYNAMIC OPERATIONAL KANBAN BOARD ── */}
      {viewMode === "kanban" ? (
        visibleStages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              No hay etapas visibles seleccionadas
            </h3>
            <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
              Seleccioná al menos una etapa en la barra superior para visualizar el flujo operativo.
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={resetToDefaultStages}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3.5 py-2 text-xs font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors cursor-pointer shadow-2xs"
              >
                <span>Restaurar flujo</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            className={
              visibleStages.length === 1
                ? "w-full max-w-3xl mx-auto"
                : visibleStages.length === 2
                ? "grid grid-cols-1 md:grid-cols-2 gap-4 items-start w-full"
                : visibleStages.length === 3
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start w-full"
                : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start w-full"
            }
          >
            {visibleStages.map(col => {
              const colOrders = filterOrdersList(
                orders.filter(
                  o =>
                    o.status === col.id ||
                    (col.id === "NUEVO" && (o.status as any) === "PENDIENTE")
                )
              );

              return (
                <div key={col.id} className="flex flex-col">
                  {/* Column Header: Simple, quiet, Jira/Linear style */}
                  <div className="mb-2 flex items-center justify-between px-1">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {col.title}
                    </h2>
                    <span className="text-xs font-mono font-medium text-gray-400 dark:text-gray-500">
                      {colOrders.length}
                    </span>
                  </div>

                  {/* Column Body Track */}
                  <div className="min-h-[440px] rounded-xl bg-gray-50/70 dark:bg-gray-900/40 p-2.5 border border-gray-200/50 dark:border-gray-800/60 flex flex-col space-y-2.5">
                    {colOrders.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center text-center text-xs text-gray-400 dark:text-gray-600 py-14">
                        Sin pedidos
                      </div>
                    ) : (
                      colOrders.map(order => {
                        const isDelayed = order.urgency === "RETRASADO";
                        const delayMins = Math.max(1, order.elapsedMinutes - order.estimatedMinutes);

                        return (
                          <div
                            key={order.id}
                            onClick={() => setSelectedOrderId(order.id)}
                            className={`group rounded-lg border bg-white dark:bg-gray-850 p-3.5 transition-all duration-150 cursor-pointer select-none ${
                              isDelayed
                                ? "border-amber-300/80 dark:border-amber-600/70 hover:border-amber-400 shadow-2xs hover:shadow-xs"
                                : "border-gray-200/80 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50/40 dark:hover:bg-gray-800/50 shadow-2xs hover:shadow-xs"
                            }`}
                          >
                            {/* Nivel 1 — Identidad */}
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-mono text-[11px] text-gray-400 dark:text-gray-500">
                                {order.id}
                              </span>
                              <span className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 text-xs font-medium tracking-wider transition-colors">
                                ···
                              </span>
                            </div>

                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate mb-2.5 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                              {order.customerName}
                            </h3>

                            {/* Nivel 2 — Contenido / Productos */}
                            <div className="space-y-0.5 mb-3 text-xs text-gray-600 dark:text-gray-300">
                              {order.items.slice(0, 2).map((it, idx) => (
                                <div key={idx} className="truncate">
                                  <span className="font-medium text-gray-800 dark:text-gray-200 mr-1.5">{it.quantity}×</span>
                                  <span>{it.name}</span>
                                </div>
                              ))}
                              {order.items.length > 2 && (
                                <div className="text-[11px] text-gray-400 dark:text-gray-500 pt-0.5 font-medium">
                                  +{order.items.length - 2} {order.items.length - 2 === 1 ? "producto" : "productos"}
                                </div>
                              )}
                            </div>

                            {/* Nivel 3 & 4 — Contexto e Información Financiera */}
                            <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80 space-y-1 text-xs">
                              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-[11px]">
                                <span>
                                  {order.customerAddress ? "Domicilio" : "Mostrador"} · {order.elapsedMinutes} min
                                </span>
                                <span className="font-mono font-medium text-gray-800 dark:text-gray-200">
                                  ${order.total.toLocaleString("es-CO")}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[11px]">
                                <span className={
                                  order.paymentStatus === "PAGADO"
                                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                    : order.paymentStatus === "PAGO_CONTRA_ENTREGA"
                                    ? "text-blue-600 dark:text-blue-400 font-medium"
                                    : "text-amber-600 dark:text-amber-400 font-medium"
                                }>
                                  {order.paymentStatus === "PAGADO"
                                    ? "Pagado"
                                    : order.paymentStatus === "PAGO_CONTRA_ENTREGA"
                                    ? "Contra entrega"
                                    : "Pendiente de pago"}
                                </span>

                                {/* Nivel 5 — Excepciones (solo si existe demora) */}
                                {isDelayed && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-error-600 dark:text-error-400">
                                    ⚠ {delayMins} min de demora
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ── VIEW 2: PLAKY / MONDAY.COM MAIN TABLE ── */
        <div className="space-y-6 animate-fade-in">
          {filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 mb-3">
                <Table2 className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                No hay órdenes que coincidan con los filtros
              </h4>
              <p className="mt-1 text-xs text-gray-400">
                Prueba cambiando los filtros de canal, estado o búsqueda.
              </p>
            </div>
          ) : (
            <>
              {/* GROUP 1: ÓRDENES ACTIVAS */}
              {(() => {
                const activeOrders = filteredOrders.filter(o => o.status !== "ENTREGADO");
                if (activeOrders.length === 0 && filteredOrders.length > 0 && statusFilter !== "TODOS" && statusFilter !== "ENTREGADO") return null;

                const totalActiveSum = activeOrders.reduce((s, o) => s + o.total, 0);
                const totalActiveUnits = activeOrders.reduce((s, o) => s + o.items.reduce((sum, it) => sum + it.quantity, 0), 0);
                
                // Status distribution counts for signature bar
                const pCount = activeOrders.filter(o => o.status === "NUEVO" || (o.status as any) === "PENDIENTE").length;
                const cCount = activeOrders.filter(o => o.status === "CONFIRMADO").length;
                const prepCount = activeOrders.filter(o => o.status === "EN_PREPARACION").length;
                const rCount = activeOrders.filter(o => o.status === "LISTO").length;
                const totalCount = activeOrders.length || 1;

                return (
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
                    {/* Collapsible Group Header (Monday / Plaky style) */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50/90 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setIsGroupActiveOpen(!isGroupActiveOpen)}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-500 hover:bg-brand-600 text-white transition-all cursor-pointer shadow-xs"
                          title={isGroupActiveOpen ? "Colapsar grupo" : "Expandir grupo"}
                        >
                          {isGroupActiveOpen ? <ChevronDown className="h-4 w-4 stroke-[2.5]" /> : <ChevronRight className="h-4 w-4 stroke-[2.5]" />}
                        </button>
                        <h2 className="text-sm font-bold text-brand-600 dark:text-brand-400">
                          Flujo de Órdenes Activas
                        </h2>
                        <span className="rounded-full bg-white dark:bg-gray-800 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                          {activeOrders.length} {activeOrders.length === 1 ? "orden" : "órdenes"}
                        </span>
                        <span className="hidden sm:inline-block text-xs text-gray-400">
                          · {totalActiveUnits} uds por procesar
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowManualModal(true)}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/30 transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Nueva orden</span>
                      </button>
                    </div>

                    {isGroupActiveOpen && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-left text-xs">
                          {/* Column Headers */}
                          <thead className="bg-gray-50/50 dark:bg-gray-800/30 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                            <tr>
                              <th className="w-8 px-3 py-2.5 text-center"></th>
                              <th className="min-w-[220px] px-4 py-2.5">Orden & Cliente</th>
                              <th className="min-w-[120px] px-3 py-2.5">Canal</th>
                              <th className="min-w-[130px] px-3 py-2.5">Modalidad</th>
                              <th className="min-w-[110px] px-3 py-2.5">Hora / SLA</th>
                              <th className="min-w-[150px] px-3 py-2.5">Artículos</th>
                              <th className="min-w-[120px] px-3 py-2.5">Total</th>
                              <th className="min-w-[160px] px-3 py-2.5 text-center">Estado</th>
                              <th className="min-w-[120px] px-3 py-2.5 text-center">Pago</th>
                              <th className="min-w-[120px] px-4 py-2.5 text-right">Acción</th>
                            </tr>
                          </thead>

                          {/* Rows */}
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
                            {activeOrders.map(order => {
                              const badge = getStatusBadge(order.status);
                              const isDelayed = order.urgency === "RETRASADO";

                              return (
                                <tr
                                  key={order.id}
                                  onClick={() => setSelectedOrderId(order.id)}
                                  className={`group transition-colors cursor-pointer border-l-[5px] ${
                                    isDelayed
                                      ? "border-l-error-500 bg-error-50/30 dark:bg-error-950/15 hover:bg-error-50/50 dark:hover:bg-error-950/25"
                                      : "border-l-brand-500 hover:bg-gray-50/80 dark:hover:bg-white/[0.03]"
                                  }`}
                                >
                                  {/* Drag Grip Column */}
                                  <td className="w-8 px-3 py-3 text-center">
                                    <GripVertical className="h-4 w-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity inline-block" />
                                  </td>

                                  {/* Orden & Cliente */}
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono text-xs font-bold text-gray-900 dark:text-white group-hover:text-brand-500 transition-colors">
                                        {order.id}
                                      </span>
                                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                        #{order.turnNumber || "00"}
                                      </span>
                                      <span className="font-semibold text-xs text-gray-800 dark:text-white truncate max-w-[140px]">
                                        {order.customerName}
                                      </span>
                                      {order.notes && (
                                        <span title={order.notes} className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-warning-700 dark:text-warning-300 bg-warning-50 dark:bg-warning-500/15 px-1.5 py-0.5 rounded-full border border-warning-200/60 dark:border-warning-500/30">
                                          <MessageSquare className="h-3 w-3" /> 1
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Canal (Monday Tag Chip) */}
                                  <td className="px-3 py-3">
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${getChannelTagStyle(order.channel)}`}>
                                      <span className="capitalize">{order.channel}</span>
                                    </span>
                                  </td>

                                  {/* Modalidad */}
                                  <td className="px-3 py-3">
                                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                                      {order.customerAddress ? (
                                        <>
                                          <Bike className="h-3.5 w-3.5 text-brand-500 flex-none" />
                                          <span>Domicilio</span>
                                        </>
                                      ) : (
                                        <>
                                          <Store className="h-3.5 w-3.5 text-success-600 flex-none" />
                                          <span>Mostrador</span>
                                        </>
                                      )}
                                    </span>
                                  </td>

                                  {/* Hora / SLA */}
                                  <td className="px-3 py-3">
                                    <div className="flex flex-col">
                                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{order.createdAt}</span>
                                      {isDelayed ? (
                                        <span className="text-[10px] font-bold text-error-500">Demora (+{Math.max(1, order.elapsedMinutes - order.estimatedMinutes)}m)</span>
                                      ) : (
                                        <span className="text-[10px] text-gray-400">Hace {order.elapsedMinutes}m</span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Artículos */}
                                  <td className="px-3 py-3 text-gray-700 dark:text-gray-300">
                                    <div className="text-xs">
                                      <span className="font-semibold text-gray-900 dark:text-white">
                                        {order.items.reduce((s, it) => s + it.quantity, 0)} uds
                                      </span>
                                      <span className="text-gray-400 text-[11px] ml-1">
                                        ({order.items.length} {order.items.length === 1 ? "prod" : "prods"})
                                      </span>
                                    </div>
                                  </td>

                                  {/* Total */}
                                  <td className="px-3 py-3 font-mono text-xs font-bold text-gray-900 dark:text-white">
                                    ${order.total.toLocaleString("es-CO")}
                                  </td>

                                  {/* Estado (Plaky / Monday Solid Saturated Pill) */}
                                  <td className="px-3 py-3 text-center">
                                    <span className={`block w-full py-1.5 px-3 rounded-md text-center text-xs font-bold uppercase tracking-wider shadow-xs ${getMondayStatusStyle(order.status, isDelayed)}`}>
                                      {isDelayed ? "Demorado" : badge.label}
                                    </span>
                                  </td>

                                  {/* Pago (Solid Pill) */}
                                  <td className="px-3 py-3 text-center">
                                    {(() => {
                                      const pStatus = order.paymentStatus || "PENDIENTE";
                                      const pStyles: Record<string, { bg: string; label: string }> = {
                                        PAGADO: { bg: "bg-success-600 text-white", label: "Pagado" },
                                        PAGO_CONTRA_ENTREGA: { bg: "bg-sky-600 text-white", label: "Contra Entrega" },
                                        PENDIENTE: { bg: "bg-warning-500 text-white", label: "Por Cobrar" },
                                        ANULADO: { bg: "bg-gray-500 text-white", label: "Anulado" },
                                        REEMBOLSADO: { bg: "bg-purple-600 text-white", label: "Reembolsado" },
                                      };
                                      const st = pStyles[pStatus] || pStyles.PENDIENTE;
                                      return (
                                        <span className={`block w-full py-1.5 px-2.5 rounded-md text-center text-xs font-bold uppercase tracking-wider shadow-xs ${st.bg}`}>
                                          {st.label}
                                        </span>
                                      );
                                    })()}
                                  </td>

                                  {/* Acción Rápida */}
                                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                    {(order.status === "NUEVO" || (order.status as any) === "PENDIENTE") && (
                                      <button
                                        type="button"
                                        onClick={() => confirmOrder(order.id)}
                                        className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors shadow-xs cursor-pointer"
                                      >
                                        Aceptar
                                      </button>
                                    )}
                                    {order.status === "CONFIRMADO" && isPreparacionEnabled && (
                                      <button
                                        type="button"
                                        onClick={() => sendToKitchen(order.id)}
                                        className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors shadow-xs cursor-pointer"
                                      >
                                        Alistar
                                      </button>
                                    )}
                                    {((order.status === "CONFIRMADO" && !isPreparacionEnabled) || order.status === "EN_PREPARACION") && (
                                      <button
                                        type="button"
                                        onClick={() => markOrderReady(order.id)}
                                        className="rounded-lg bg-success-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-success-700 transition-colors shadow-xs cursor-pointer"
                                      >
                                        Listo
                                      </button>
                                    )}
                                    {order.status === "LISTO" && (
                                      <button
                                        type="button"
                                        onClick={() => deliverOrder(order.id)}
                                        className="rounded-lg bg-success-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-success-700 transition-colors shadow-xs cursor-pointer"
                                      >
                                        Entregar
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}

                            {/* + Agregar Item Row (Monday signature) */}
                            <tr
                              onClick={() => setShowManualModal(true)}
                              className="border-t border-gray-100 dark:border-gray-800/80 hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                            >
                              <td colSpan={10} className="px-4 py-2.5 text-xs text-gray-400 hover:text-brand-500 font-medium">
                                <div className="flex items-center gap-2">
                                  <Plus className="h-4 w-4 text-gray-400" />
                                  <span>+ Agregar orden manual...</span>
                                </div>
                              </td>
                            </tr>
                          </tbody>

                          {/* Plaky / Monday Signature Footer Summary Bar */}
                          <tfoot className="bg-gray-50/80 dark:bg-gray-800/60 border-t-2 border-gray-200 dark:border-gray-700">
                            <tr>
                              <td className="w-8 px-3 py-2.5"></td>
                              <td className="px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                Total {activeOrders.length} activas
                              </td>
                              <td className="px-3 py-2.5"></td>
                              <td className="px-3 py-2.5"></td>
                              <td className="px-3 py-2.5"></td>
                              <td className="px-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                                {totalActiveUnits} uds
                              </td>
                              {/* Sum Column */}
                              <td className="px-3 py-2.5">
                                <div className="flex flex-col text-xs font-mono">
                                  <span className="text-[10px] text-gray-400 uppercase font-semibold">sum</span>
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    ${totalActiveSum.toLocaleString("es-CO")}
                                  </span>
                                </div>
                              </td>
                              {/* Signature Multi-color Segmented Status Bar */}
                              <td className="px-3 py-2.5">
                                <div
                                  className="flex h-4 w-full rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-inner"
                                  title={`Distribución: ${pCount} Nuevas, ${cCount} Confirmadas, ${prepCount} Preparación, ${rCount} Listas`}
                                >
                                  {pCount > 0 && (
                                    <div
                                      style={{ width: `${(pCount / totalCount) * 100}%` }}
                                      className="bg-secondary-600 transition-all"
                                      title={`${pCount} Por Confirmar`}
                                    />
                                  )}
                                  {cCount > 0 && (
                                    <div
                                      style={{ width: `${(cCount / totalCount) * 100}%` }}
                                      className="bg-blue-light-600 transition-all"
                                      title={`${cCount} Confirmadas`}
                                    />
                                  )}
                                  {prepCount > 0 && (
                                    <div
                                      style={{ width: `${(prepCount / totalCount) * 100}%` }}
                                      className="bg-warning-500 transition-all"
                                      title={`${prepCount} En Preparación`}
                                    />
                                  )}
                                  {rCount > 0 && (
                                    <div
                                      style={{ width: `${(rCount / totalCount) * 100}%` }}
                                      className="bg-success-600 transition-all"
                                      title={`${rCount} Listas para Entrega`}
                                    />
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2.5"></td>
                              <td className="px-4 py-2.5"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* GROUP 2: ÓRDENES ENTREGADAS (HISTORIAL HOY) */}
              {(() => {
                const deliveredOrders = filteredOrders.filter(o => o.status === "ENTREGADO");
                if (deliveredOrders.length === 0) return null;

                const totalDeliveredSum = deliveredOrders.reduce((s, o) => s + o.total, 0);
                const totalDeliveredUnits = deliveredOrders.reduce((s, o) => s + o.items.reduce((sum, it) => sum + it.quantity, 0), 0);

                return (
                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
                    {/* Collapsible Group Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50/90 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setIsGroupDeliveredOpen(!isGroupDeliveredOpen)}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary-600 hover:bg-secondary-700 text-white transition-all cursor-pointer shadow-xs"
                          title={isGroupDeliveredOpen ? "Colapsar grupo" : "Expandir grupo"}
                        >
                          {isGroupDeliveredOpen ? <ChevronDown className="h-4 w-4 stroke-[2.5]" /> : <ChevronRight className="h-4 w-4 stroke-[2.5]" />}
                        </button>
                        <h2 className="text-sm font-bold text-secondary-600 dark:text-secondary-400">
                          Órdenes Entregadas Hoy
                        </h2>
                        <span className="rounded-full bg-white dark:bg-gray-800 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                          {deliveredOrders.length} {deliveredOrders.length === 1 ? "entregada" : "entregadas"}
                        </span>
                        <span className="hidden sm:inline-block text-xs text-gray-400">
                          · {totalDeliveredUnits} uds despachadas
                        </span>
                      </div>
                    </div>

                    {isGroupDeliveredOpen && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-left text-xs">
                          <thead className="bg-gray-50/50 dark:bg-gray-800/30 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                            <tr>
                              <th className="w-8 px-3 py-2.5 text-center"></th>
                              <th className="min-w-[220px] px-4 py-2.5">Orden & Cliente</th>
                              <th className="min-w-[120px] px-3 py-2.5">Canal</th>
                              <th className="min-w-[130px] px-3 py-2.5">Modalidad</th>
                              <th className="min-w-[110px] px-3 py-2.5">Hora</th>
                              <th className="min-w-[150px] px-3 py-2.5">Artículos</th>
                              <th className="min-w-[120px] px-3 py-2.5">Total</th>
                              <th className="min-w-[160px] px-3 py-2.5 text-center">Estado</th>
                              <th className="min-w-[120px] px-3 py-2.5 text-center">Pago</th>
                              <th className="min-w-[120px] px-4 py-2.5 text-right">Detalle</th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
                            {deliveredOrders.map(order => (
                              <tr
                                key={order.id}
                                onClick={() => setSelectedOrderId(order.id)}
                                className="group transition-colors cursor-pointer border-l-[5px] border-l-secondary-600 hover:bg-gray-50/80 dark:hover:bg-white/[0.03]"
                              >
                                <td className="w-8 px-3 py-3 text-center">
                                  <GripVertical className="h-4 w-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity inline-block" />
                                </td>

                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-bold text-gray-900 dark:text-white group-hover:text-brand-500 transition-colors">
                                      {order.id}
                                    </span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                      #{order.turnNumber || "00"}
                                    </span>
                                    <span className="font-semibold text-xs text-gray-800 dark:text-white truncate max-w-[140px]">
                                      {order.customerName}
                                    </span>
                                  </div>
                                </td>

                                <td className="px-3 py-3">
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${getChannelTagStyle(order.channel)}`}>
                                    <span className="capitalize">{order.channel}</span>
                                  </span>
                                </td>

                                <td className="px-3 py-3">
                                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                                    {order.customerAddress ? (
                                      <>
                                        <Bike className="h-3.5 w-3.5 text-brand-500 flex-none" />
                                        <span>Domicilio</span>
                                      </>
                                    ) : (
                                      <>
                                        <Store className="h-3.5 w-3.5 text-success-600 flex-none" />
                                        <span>Mostrador</span>
                                      </>
                                    )}
                                  </span>
                                </td>

                                <td className="px-3 py-3 text-xs text-gray-500">
                                  {order.createdAt}
                                </td>

                                <td className="px-3 py-3 text-gray-700 dark:text-gray-300">
                                  <div className="text-xs">
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                      {order.items.reduce((s, it) => s + it.quantity, 0)} uds
                                    </span>
                                  </div>
                                </td>

                                <td className="px-3 py-3 font-mono text-xs font-bold text-gray-900 dark:text-white">
                                  ${order.total.toLocaleString("es-CO")}
                                </td>

                                <td className="px-3 py-3 text-center">
                                  <span className="block w-full py-1.5 px-3 rounded-md text-center text-xs font-bold uppercase tracking-wider bg-gray-500 text-white shadow-xs">
                                    Entregado
                                  </span>
                                </td>

                                <td className="px-3 py-3 text-center">
                                  <span className="block w-full py-1.5 px-2.5 rounded-md text-center text-xs font-bold uppercase tracking-wider bg-success-600 text-white shadow-xs">
                                    Liquidado
                                  </span>
                                </td>

                                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedOrderId(order.id)}
                                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300 transition-colors cursor-pointer"
                                  >
                                    Ver Ficha
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>

                          {/* Footer Summary */}
                          <tfoot className="bg-gray-50/80 dark:bg-gray-800/60 border-t-2 border-gray-200 dark:border-gray-700">
                            <tr>
                              <td className="w-8 px-3 py-2.5"></td>
                              <td className="px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                Total {deliveredOrders.length} entregadas
                              </td>
                              <td className="px-3 py-2.5"></td>
                              <td className="px-3 py-2.5"></td>
                              <td className="px-3 py-2.5"></td>
                              <td className="px-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                                {totalDeliveredUnits} uds
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-col text-xs font-mono">
                                  <span className="text-[10px] text-gray-400 uppercase font-semibold">sum</span>
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    ${totalDeliveredSum.toLocaleString("es-CO")}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="h-4 w-full rounded-md bg-gray-500 shadow-inner" />
                              </td>
                              <td className="px-3 py-2.5"></td>
                              <td className="px-4 py-2.5"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* ── Minimalist Manual Order Modal ── */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-base font-bold text-gray-800 dark:text-white">
                Crear Nueva Orden
              </h3>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManual} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del Cliente *
                </label>
                <input
                  type="text"
                  required
                  value={manualCustomer}
                  onChange={(e) => setManualCustomer(e.target.value)}
                  placeholder="Ej. Carlos Méndez"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="tel"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="Ej. +57 300 123 4567"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Canal de Ingreso
                </label>
                <select
                  value={manualChannel}
                  onChange={(e) => setManualChannel(e.target.value as OrderChannel)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                >
                  <option value="presencial">Mostrador / Presencial</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telefono">Llamada Telefónica</option>
                  <option value="web">Tienda Web</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Notas o requerimientos
                </label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Observaciones de entrega..."
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition-colors cursor-pointer shadow-theme-xs"
                >
                  Crear orden
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
