import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { OrderStatus, OrderChannel, UrgencyLevel, Pedido } from "../types";
import {
  Plus,
  Sparkles,
  ChefHat,
  CheckCircle2,
  LayoutGrid,
  Kanban,
  AlertTriangle,
  X,
  SlidersHorizontal,
  ArrowRight,
  Check,
  Package,
  Zap,
  ChevronDown,
  Minimize2,
  Calendar,
  GripVertical,
  ArrowUpRight,
  Info,
} from "lucide-react";


import { useBusiness } from "@/context/BusinessContext";
import { playOrderAlert } from "@/utils/audioAlerts";
import { OperacionTab } from "../types";
import { NectoBanner } from "../shared/NectoBanner";
import { OrderStatusBadge, ChannelBadge } from "../shared/Badges";
import { Button, Card, Field, Select, Textarea, SegmentedControl, SearchInput } from "@/elements";

import {
  CustomLayoutModal,
  DEFAULT_LAYOUT_PREFS,
  LayoutPreferences,
} from "../shared/CustomLayoutModal";

export const PedidosEnVivoView: React.FC<{
  onNavigateOpTab?: (t: OperacionTab) => void;
}> = () => {
  const {
    orders,
    programados,
    setSelectedOrderId,
    createManualOrder,
    confirmOrder,
    sendToKitchen,
    markOrderReady,
    deliverOrder,
    setRejectModalOrder,
    setCancelModalOrder,
    injectScheduledOrderToLive,
    transitionOrder,
  } = usePedidos();
  const { activeBusiness } = useBusiness();

  // Layout Preferences with localStorage persistence
  const [layoutPrefs, setLayoutPrefs] = useState<LayoutPreferences>(() => {
    try {
      const saved = localStorage.getItem("necto_pedidos_layout_prefs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.columns)) return parsed;
      }
    } catch (e) {
      console.warn("Could not read layout prefs", e);
    }
    return DEFAULT_LAYOUT_PREFS;
  });
  const [showLayoutModal, setShowLayoutModal] = useState(false);

  const handleSaveLayoutPrefs = (newPrefs: LayoutPreferences) => {
    setLayoutPrefs(newPrefs);
    try {
      localStorage.setItem("necto_pedidos_layout_prefs", JSON.stringify(newPrefs));
      window.dispatchEvent(new Event("necto_layout_changed"));
    } catch (e) {
      console.warn("Could not save layout prefs", e);
    }
  };

  const handleResetLayoutPrefs = () => {
    setLayoutPrefs(DEFAULT_LAYOUT_PREFS);
    try {
      localStorage.removeItem("necto_pedidos_layout_prefs");
      window.dispatchEvent(new Event("necto_layout_changed"));
    } catch (e) {}
  };

  const [viewMode, setViewMode] = useState<"kanban" | "grid">("kanban");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "TODOS">("TODOS");
  const [channelFilter, setChannelFilter] = useState<OrderChannel | "TODOS">("TODOS");
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyLevel | "TODOS">("TODOS");
  const [searchQuery, setSearchQuery] = useState("");
  const [showManualModal, setShowManualModal] = useState(false);

  const [manualCustomer, setManualCustomer] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualChannel, setManualChannel] = useState<OrderChannel>("presencial");
  const [manualNotes, setManualNotes] = useState("");

  // Filtering counts
  const statusCounts = {
    TODOS: orders.length,
    NUEVO: orders.filter(o => o.status === "NUEVO").length,
    CONFIRMADO: orders.filter(o => o.status === "CONFIRMADO").length,
    EN_PREPARACION: orders.filter(o => o.status === "EN_PREPARACION").length,
    LISTO: orders.filter(o => o.status === "LISTO").length,
    FINALIZADO: orders.filter(o => o.status === "FINALIZADO").length,
  };

  const channelCounts = {
    TODOS: orders.length,
    whatsapp: orders.filter(o => o.channel === "whatsapp").length,
    web: orders.filter(o => o.channel === "web").length,
    presencial: orders.filter(o => o.channel === "presencial").length,
    telefono: orders.filter(o => o.channel === "telefono").length,
  };

  const delayedCount = orders.filter(o => o.urgency === "RETRASADO").length;

  // Drag and Drop States
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<OrderStatus | null>(null);
  const [dragToast, setDragToast] = useState<string | null>(null);

  const colNames: Record<OrderStatus, string> = {
    NUEVO: "Nuevos & Por Confirmar",
    CONFIRMADO: "Confirmados (En Cola)",
    EN_PREPARACION: "En Cocina / Horno",
    LISTO: "Listos para Entrega",
    FINALIZADO: "Entregados / Finalizados",
    RECHAZADO: "Rechazados",
    CANCELADO: "Cancelados",
  };

  const STATUS_RANK: Record<OrderStatus, number> = {
    NUEVO: 0,
    CONFIRMADO: 1,
    EN_PREPARACION: 2,
    LISTO: 3,
    FINALIZADO: 4,
    RECHAZADO: 5,
    CANCELADO: 5,
  };

  const showToast = (msg: string) => {
    setDragToast(msg);
    setTimeout(() => setDragToast(null), 3000);
  };

  const handleDropOrder = (orderId: string, targetCol: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.status === targetCol) return;

    // 1. Manejo de Rechazo y Cancelación directa por arrastre
    if (targetCol === "RECHAZADO") {
      if (order.status === "NUEVO") {
        setRejectModalOrder(order);
      } else {
        setCancelModalOrder(order);
      }
      return;
    }

    if (targetCol === "CANCELADO") {
      setCancelModalOrder(order);
      return;
    }

    const currentRank = STATUS_RANK[order.status] ?? 0;
    const targetRank = STATUS_RANK[targetCol] ?? 0;

    // 2. Bloquear retrocesos ilógicos (ej: de FINALIZADO/LISTO a NUEVO)
    if (targetRank < currentRank) {
      showToast(
        `No se puede retroceder: el pedido ya superó la etapa de "${colNames[targetCol]}".`
      );
      return;
    }

    // 3. Fast-Track de Mostrador o Avance Secuencial Flexible
    const isFastTrackAllowed =
      order.channel === "presencial" ||
      targetCol === "FINALIZADO" ||
      targetCol === "LISTO" ||
      targetRank === currentRank + 1;

    if (!isFastTrackAllowed) {
      showToast(
        `No se puede saltar a "${colNames[targetCol]}": avanza el pedido por orden o envíalo a preparación.`
      );
      return;
    }

    transitionOrder(
      orderId,
      targetCol,
      order.channel === "presencial" ? "Caja Mostrador (Pase Rápido)" : "Operador (Tablero)",
      order.channel === "presencial" && targetCol === "FINALIZADO"
        ? "Venta directa de mostrador finalizada."
        : `Pedido trasladado a ${colNames[targetCol]}.`
    );

    showToast(`Pedido ${orderId} trasladado a "${colNames[targetCol]}"`);
  };

  // Kanban Column Definitions dictionary
  const columnDefs: Record<OrderStatus, {
    title: string;
    description: string;
    icon: any;
    iconBg: string;
    iconColor: string;
    badgeStyle: string;
  }> = {
    NUEVO: {
      title: "Nuevos & Por Confirmar",
      description: "Canales directos o IA",
      icon: Sparkles,
      iconBg: "bg-orange-500/10 dark:bg-orange-500/20",
      iconColor: "text-[#FF3F1A]",
      badgeStyle: "bg-orange-500/10 text-[#FF3F1A] border-orange-500/20 dark:bg-orange-500/20",
    },
    CONFIRMADO: {
      title: "Confirmados (En Cola)",
      description: "Pago validado en cola",
      icon: CheckCircle2,
      iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      badgeStyle: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300",
    },
    EN_PREPARACION: {
      title: "En Cocina / Preparación",
      description: "En línea de cocción KDS",
      icon: ChefHat,
      iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
      iconColor: "text-amber-600 dark:text-amber-400",
      badgeStyle: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300",
    },
    LISTO: {
      title: "Listos para Entrega",
      description: "En mostrador o pase",
      icon: Package,
      iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      badgeStyle: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300",
    },
    FINALIZADO: {
      title: "Entregados Hoy",
      description: "Completados con éxito",
      icon: Check,
      iconBg: "bg-zinc-500/10 dark:bg-zinc-500/20",
      iconColor: "text-zinc-600 dark:text-zinc-400",
      badgeStyle: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:bg-zinc-500/20 dark:text-zinc-300",
    },
    RECHAZADO: {
      title: "Rechazados",
      description: "Descartados",
      icon: X,
      iconBg: "bg-rose-500/10",
      iconColor: "text-rose-600",
      badgeStyle: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    },
    CANCELADO: {
      title: "Cancelados",
      description: "Cancelados",
      icon: X,
      iconBg: "bg-zinc-500/10",
      iconColor: "text-zinc-500",
      badgeStyle: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
    },
  };

  // Active ordered and visible columns
  const orderedVisibleColumns = layoutPrefs.columns
    .filter(c => c.visible && columnDefs[c.id])
    .map(c => ({
      id: c.id,
      title: c.title || columnDefs[c.id].title,
      description: columnDefs[c.id].description,
      icon: columnDefs[c.id].icon,
      iconBg: columnDefs[c.id].iconBg,
      iconColor: columnDefs[c.id].iconColor,
      badgeStyle: columnDefs[c.id].badgeStyle,
    }));

  const searchInputRef = React.useRef<HTMLInputElement>(null);


  // Filtering
  const filterOrdersList = (list: Pedido[]) => {
    return list.filter(order => {
      if (statusFilter !== "TODOS" && order.status !== statusFilter) return false;
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


  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Banner (Toggleable) */}
      {layoutPrefs.showBanner && (
        <NectoBanner
          icon={<Kanban className="w-6 h-6 text-[#FF3F1A]" />}
          title="Tablero de Pedidos"
          description="Flujo operativo visual en tiempo real: desde la recepción multicanal hasta la entrega al cliente."
        />
      )}

      {/* Compact Horizontal Toolbar (Toggleable) */}
      {layoutPrefs.showToolbar ? (
        <div className="bg-white dark:bg-[#151518] rounded-2xl p-2.5 border border-zinc-200/70 dark:border-zinc-800/80 shadow-none flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Search & Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            {/* Search with Ctrl+K shortcut */}
            <SearchInput
              ref={searchInputRef}
              intent="pedidos.search"
              className="flex-1 min-w-[140px] sm:min-w-[180px] max-w-xs"
              placeholder="Buscar pedido..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
            />

            {/* Estado Dropdown */}
            <div className="relative flex items-center">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="appearance-none bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium py-2 pl-3 pr-7 rounded-xl focus:outline-none cursor-pointer hover:border-zinc-300 transition-colors"
              >
                <option value="TODOS">Todos los Estados ({statusCounts.TODOS})</option>
                <option value="NUEVO">Nuevos ({statusCounts.NUEVO})</option>
                <option value="CONFIRMADO">En Cola ({statusCounts.CONFIRMADO})</option>
                <option value="EN_PREPARACION">En Cocina ({statusCounts.EN_PREPARACION})</option>
                <option value="LISTO">Listos ({statusCounts.LISTO})</option>
                <option value="FINALIZADO">Entregados ({statusCounts.FINALIZADO})</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 text-zinc-400 pointer-events-none" />
            </div>

            {/* Canal Dropdown */}
            <div className="relative flex items-center">
              <select
                value={channelFilter}
                onChange={e => setChannelFilter(e.target.value as any)}
                className="appearance-none bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium py-2 pl-3 pr-7 rounded-xl focus:outline-none cursor-pointer hover:border-zinc-300 transition-colors"
              >
                <option value="TODOS">Todos los Canales ({channelCounts.TODOS})</option>
                <option value="whatsapp">WhatsApp ({channelCounts.whatsapp})</option>
                <option value="web">Web ({channelCounts.web})</option>
                <option value="presencial">POS ({channelCounts.presencial})</option>
                <option value="telefono">Teléfono ({channelCounts.telefono})</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 text-zinc-400 pointer-events-none" />
            </div>

            {/* Delay Alert Filter Button */}
            <Button
              variant="ghost"
              intent="pedidos.filter.delayed"
              onClick={() => {
                setUrgencyFilter(urgencyFilter === "RETRASADO" ? "TODOS" : "RETRASADO");
              }}
              className={`py-2 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 border ${
                urgencyFilter === "RETRASADO"
                  ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-900"
                  : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${urgencyFilter === "RETRASADO" ? "text-rose-500" : "text-zinc-400"}`} />
              <span>Demoras</span>
              {delayedCount > 0 && (
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    urgencyFilter === "RETRASADO"
                      ? "bg-rose-500 text-white"
                      : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                  }`}
                >
                  {delayedCount}
                </span>
              )}
            </Button>
          </div>

          {/* Right: View Mode Toggle, Customize & New Order */}
          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <SegmentedControl
              intent="pedidos.view"
              tone="contrast"
              value={viewMode}
              onValueChange={setViewMode}
              options={[
                { value: "kanban", label: "Tablero", icon: <Kanban className="w-3.5 h-3.5" /> },
                { value: "grid", label: "Lista", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
              ]}
            />

            {/* Personalizar Vista Button */}
            <Button
              variant="outline"
              intent="pedidos.toolbar.customize"
              onClick={() => setShowLayoutModal(true)}
              className="py-2 px-3 bg-zinc-50 dark:bg-zinc-900 text-xs border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300"
              title="Personalizar columnas y diseño del tablero"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden md:inline">Vista Operativa</span>
            </Button>

            {!layoutPrefs.showTopHeader && (
              <Button
                variant="outline"
                intent="pedidos.toolbar.exit-focus"
                onClick={() => {
                  const newPrefs = { ...layoutPrefs, showTopHeader: true, showBanner: true };
                  setLayoutPrefs(newPrefs);
                  localStorage.setItem("necto_pedidos_layout_prefs", JSON.stringify(newPrefs));
                  window.dispatchEvent(new Event("necto_layout_changed"));
                }}
                className="py-2 px-3 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 text-xs"
                title="Restaurar barra de navegación de módulos"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salir Enfoque</span>
              </Button>
            )}

            <Button
              variant="primary"
              intent="pedidos.toolbar.new-order"
              onClick={() => setShowManualModal(true)}
              className="py-2 px-3.5 text-xs flex-none"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nuevo Pedido</span>
            </Button>
          </div>
        </div>
      ) : (
        /* Floating mini-bar when toolbar is hidden to allow reopening */
        <div className="flex items-center justify-between bg-white dark:bg-[#151518] p-2.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-none">
          <span className="text-xs font-mono text-zinc-400 pl-2">MODO TABLERO ENFOCADO</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              intent="pedidos.minibar.customize"
              onClick={() => setShowLayoutModal(true)}
              className="py-1.5 px-3 text-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
              <span>Vista Operativa</span>
            </Button>
            <Button
              variant="primary"
              intent="pedidos.minibar.new-order"
              onClick={() => setShowManualModal(true)}
              className="py-1.5 px-3 text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Nuevo Pedido
            </Button>
          </div>
        </div>
      )}

      {/* KANBAN BOARD VIEW */}
      {viewMode === "kanban" ? (
        <div className="space-y-2">
          {/* Subtle Visual Guide for Operators — hidden on mobile (no drag support on touch) */}
          <div className="hidden sm:flex items-center justify-between px-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium select-none">
            <span className="flex items-center gap-1.5">
              <GripVertical className="w-3.5 h-3.5 text-[#FF3F1A]" />
              <span>Haz clic en cualquier tarjeta para abrir su comanda, o arrástrala entre columnas para avanzar su etapa</span>
            </span>
          </div>

          <div className="flex gap-2.5 sm:gap-3 w-full overflow-x-auto pb-4 pt-1 items-start scrollbar-thin">
          {orderedVisibleColumns
            .filter(col => statusFilter === "TODOS" || col.id === statusFilter)
            .map(col => {
            const colOrders = filterOrdersList(orders.filter(o => o.status === col.id));
            const colTotalSum = colOrders.reduce((sum, o) => sum + o.total, 0);
            const Icon = col.icon;

            return (
              <div
                key={col.id}
                onDragOver={e => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverCol !== col.id) setDragOverCol(col.id);
                }}
                onDragLeave={e => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverCol(null);
                  }
                }}
                onDrop={e => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain") || draggedOrderId;
                  if (id) handleDropOrder(id, col.id);
                  setDragOverCol(null);
                  setDraggedOrderId(null);
                }}
                className={`flex-1 min-w-[210px] sm:min-w-[230px] lg:min-w-0 max-w-full bg-zinc-50/50 dark:bg-[#121214]/40 rounded-2xl border-2 border-dashed border-zinc-300/80 dark:border-zinc-800/90 p-2.5 sm:p-3 flex flex-col justify-between space-y-3 transition-colors ${
                  dragOverCol === col.id
                    ? "border-[#FF3F1A] border-solid ring-2 ring-[#FF3F1A]/20 bg-orange-50/20 dark:bg-orange-950/20"
                    : ""
                }`}
              >
                {/* Minimalist Column Header Card */}
                <div className="bg-white dark:bg-[#18181B] rounded-xl border border-zinc-200/80 dark:border-zinc-800 p-2.5 sm:p-3 shadow-2xs flex items-center justify-between gap-2 flex-none">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${col.iconBg} ${col.iconColor} flex-none`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="font-bold text-xs sm:text-[13px] text-zinc-900 dark:text-zinc-100 tracking-tight truncate">
                      {col.title}
                    </h4>
                  </div>

                  <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full border ${col.badgeStyle} flex-none`}>
                    {colOrders.length}
                  </span>
                </div>

                {/* Tickets Container */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[calc(100vh-340px)]">
                  {col.id === "NUEVO" && programados.length > 0 && (
                    <div className="space-y-2">
                      {programados.map(prog => (
                        <div
                          key={prog.id}
                          onClick={() => setSelectedOrderId(prog.id)}
                          className="p-3 rounded-xl bg-white dark:bg-[#18181B] border border-zinc-200/80 dark:border-zinc-800 space-y-2 text-xs transition-all cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-xs group select-none"
                          title="Haz clic para ver el detalle de este pedido programado"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-mono font-bold text-[10px] text-zinc-500 dark:text-zinc-400">
                                {prog.id}
                              </span>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300">
                                <Calendar className="w-2.5 h-2.5" />
                                <span>{prog.scheduledDate === "Hoy" ? `Hoy ${prog.scheduledTime}` : `${prog.scheduledDate} ${prog.scheduledTime}`}</span>
                              </span>
                            </div>
                            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 group-hover:text-[#FF3F1A] transition-colors flex-none" />
                          </div>

                          <div className="min-w-0">
                            <h5 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate group-hover:text-[#FF3F1A] transition-colors">
                              {prog.customerName}
                            </h5>
                          </div>

                          {layoutPrefs.showItemsSummary !== false && (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                              {prog.items.map(i => `${i.quantity}× ${i.name}`).join(", ")}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-1.5 border-t border-zinc-100 dark:border-zinc-800/60 text-[11px]">
                            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                              ${prog.total.toLocaleString("es-CO")}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400">
                              Programado
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {colOrders.length === 0 && (col.id !== "NUEVO" || programados.length === 0) ? (
                    <Card variant="dashed" intent="pedidos.column.empty" className="p-6 text-center text-zinc-400 text-xs font-normal border-zinc-200/60 dark:border-zinc-800/60 rounded-xl">
                      <p>Sin pedidos en esta etapa</p>
                    </Card>
                  ) : (
                    colOrders.map(order => {
                      const isDelayed = order.urgency === "RETRASADO";
                      const isDragging = draggedOrderId === order.id;
                      const progressPercent = Math.min(
                        100,
                        Math.round((order.elapsedMinutes / Math.max(1, order.estimatedMinutes)) * 100)
                      );

                      return (
                        <div
                          key={order.id}
                          draggable={true}
                          onDragStart={e => {
                            e.dataTransfer.setData("text/plain", order.id);
                            e.dataTransfer.effectAllowed = "move";
                            setDraggedOrderId(order.id);
                          }}
                          onDragEnd={() => {
                            setDraggedOrderId(null);
                            setDragOverCol(null);
                          }}
                          onClick={() => setSelectedOrderId(order.id)}
                          className={`bg-white dark:bg-[#18181B] rounded-xl border p-3 transition-all cursor-grab active:cursor-grabbing hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-xs space-y-2 group select-none ${
                            isDragging
                              ? "opacity-30 scale-95 border-dashed border-[#FF3F1A]"
                              : isDelayed
                              ? "border-rose-300 dark:border-rose-900/60 bg-rose-50/[0.04]"
                              : "border-zinc-200/80 dark:border-zinc-800"
                          }`}
                          title="Haz clic para abrir comanda o arrastra para mover de etapa"
                        >
                          {/* Top Row: Jira-style ID + Channel Badge + Total */}
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <GripVertical className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 flex-none transition-colors" />
                              <span className="font-mono font-bold text-[11px] text-zinc-500 dark:text-zinc-400">
                                {order.id}
                              </span>
                              {layoutPrefs.showChannelBadge !== false && (
                                <ChannelBadge channel={order.channel} />
                              )}
                            </div>

                            {layoutPrefs.showOrderTotal !== false && (
                              <div className="flex items-center gap-1 flex-none">
                                <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100">
                                  ${order.total.toLocaleString("es-CO")}
                                </span>
                                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 group-hover:text-[#FF3F1A] transition-colors" />
                              </div>
                            )}
                          </div>

                          {/* Customer Name & Items count */}
                          <div className="min-w-0 pl-5">
                            <h5 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5 group-hover:text-[#FF3F1A] transition-colors">
                              {isDelayed && (
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-none" title="Demorado" />
                              )}
                              <span>{order.customerName}</span>
                              {layoutPrefs.showCustomerPhone && order.customerPhone && (
                                <span className="font-mono text-[10px] text-zinc-400 font-normal">
                                  · {order.customerPhone}
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-400 font-normal font-mono">
                                ({order.items.reduce((s, i) => s + i.quantity, 0)} ítems)
                              </span>
                            </h5>
                          </div>

                          {/* Resumen corto de productos */}
                          {layoutPrefs.showItemsSummary !== false && (
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 pl-5 leading-relaxed">
                              {order.items.map(i => `${i.quantity}× ${i.name}`).join(", ")}
                            </p>
                          )}

                          {/* Tiempo y estado en el pie de la tarjeta */}
                          {layoutPrefs.showSlaProgress !== false && (
                            <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between pl-5">
                              {order.status === "EN_PREPARACION" ? (
                                <div className="w-full space-y-1">
                                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${isDelayed ? "bg-rose-500" : "bg-[#FF3F1A]"}`}
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                                    <span>{order.elapsedMinutes}m / {order.estimatedMinutes}m</span>
                                    {isDelayed && <span className="text-rose-500 font-medium">Demorado</span>}
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full flex items-center justify-between text-[10px] font-mono text-zinc-400">
                                  <span className={isDelayed ? "text-rose-500 font-medium" : ""}>
                                    {isDelayed ? `+${order.elapsedMinutes - order.estimatedMinutes}m demora` : `${order.elapsedMinutes}m transcurridos`}
                                  </span>
                                  <span className="text-zinc-300 dark:text-zinc-700 font-sans">·</span>
                                  <span>{order.createdAt}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      ) : (
        /* HIGH-DENSITY OPERATIONAL LIST / TABLE VIEW */
        <div className="space-y-3">
          {/* List Summary Bar */}
          <div className="flex items-center justify-between px-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              Mostrando {filterOrdersList(orders).length} pedidos en vivo
              {programados.length > 0 ? ` + ${programados.length} programados` : ""}
            </span>
            <span className="text-[11px] text-zinc-400 items-center gap-1 hidden sm:flex">
              <Info className="w-3.5 h-3.5 text-zinc-400" />
              <span>Haz clic en cualquier fila para ver la comanda completa</span>
            </span>
          </div>

          {/* Scheduled Orders Section in List Mode */}
          {programados.length > 0 && statusFilter === "TODOS" && (
            <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-2xs">
              <div className="px-4 py-2.5 bg-zinc-50/80 dark:bg-zinc-900/80 border-b border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#FF3F1A]" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Pedidos Programados & Reservas
                  </span>
                  <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100/70 text-[#FF3F1A] dark:bg-orange-950/40">
                    {programados.length}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {programados.map(prog => (
                  <div
                    key={prog.id}
                    onClick={() => setSelectedOrderId(prog.id)}
                    className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/40 flex items-center justify-center flex-none">
                        <Calendar className="w-4 h-4 text-[#FF3F1A]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-[#FF3F1A] transition-colors">
                            {prog.customerName}
                          </span>
                          <span className="font-mono text-[10px] text-zinc-400">
                            {prog.id}
                          </span>
                          <ChannelBadge channel={prog.channel} />
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                          {prog.items.map(i => `${i.quantity}× ${i.name}`).join(", ")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-none justify-between sm:justify-end">
                      <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        Programado: {prog.scheduledDate} {prog.scheduledTime}
                      </span>
                      <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        ${prog.total.toLocaleString("es-AR")}
                      </span>
                      <Button
                        variant="outline"
                        intent="pedidos.scheduled.inject"
                        onClick={e => {
                          e.stopPropagation();
                          injectScheduledOrderToLive(prog.id, true);
                        }}
                        className="py-1 px-2.5 text-[10px] font-semibold border-zinc-200 dark:border-zinc-700 hover:border-[#FF3F1A] hover:text-[#FF3F1A]"
                        title="Adelantar y pasar a preparación en vivo"
                      >
                        <Zap className="w-3 h-3 text-[#FF3F1A]" />
                        <span>Pasar a En Vivo</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Orders Table */}
          <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                {/* Desktop Table Header — hidden on mobile */}
                <thead className="hidden sm:table-header-group">
                  <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-900/90 text-zinc-500 dark:text-zinc-400 font-semibold text-[11px]">
                    <th className="py-3 px-4">Comanda & Canal</th>
                    <th className="py-3 px-4">Cliente & Contacto</th>
                    <th className="py-3 px-4">Productos & Ítems</th>
                    <th className="py-3 px-4">Estado Actual</th>
                    <th className="py-3 px-4">Tiempos / SLA</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {filterOrdersList(orders).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-400 font-medium">
                        No se encontraron pedidos con los filtros actuales.
                      </td>
                    </tr>
                  ) : (
                    filterOrdersList(orders).map(order => {
                      const isDelayed = order.urgency === "RETRASADO";
                      const progressPercent = Math.min(
                        100,
                        Math.round((order.elapsedMinutes / Math.max(1, order.estimatedMinutes)) * 100)
                      );

                      return (
                        <tr
                          key={order.id}
                          onClick={() => setSelectedOrderId(order.id)}
                          className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors group sm:table-row flex flex-col p-3 sm:p-0 border-b border-zinc-100 dark:border-zinc-800/60 last:border-b-0"
                        >
                          {/* ID & Canal */}
                          <td className="py-2 sm:py-3.5 px-0 sm:px-4 align-middle whitespace-nowrap sm:table-cell flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-[#FF3F1A] transition-colors">
                                {order.id}
                              </span>
                              <ChannelBadge channel={order.channel} />
                            </div>
                            {/* Mobile-only: show total inline */}
                            <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 sm:hidden">
                              ${order.total.toLocaleString("es-CO")}
                            </span>
                          </td>

                          {/* Cliente */}
                          <td className="py-1 sm:py-3.5 px-0 sm:px-4 align-middle sm:table-cell flex items-center justify-between">
                            <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate max-w-[200px] sm:max-w-[160px]">
                              {order.customerName}
                            </div>
                            <OrderStatusBadge status={order.status} size="sm" />
                          </td>

                          {/* Productos — hidden on mobile */}
                          <td className="py-3.5 px-4 align-middle hidden sm:table-cell">
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 line-clamp-1 max-w-[280px]">
                              {order.items.map(i => `${i.quantity}× ${i.name}`).join(", ")}
                            </p>
                          </td>

                          {/* Estado — desktop only (mobile shows inline with client name) */}
                          <td className="py-3.5 px-4 align-middle whitespace-nowrap hidden sm:table-cell">
                            <OrderStatusBadge status={order.status} size="sm" />
                          </td>

                          {/* Tiempos / SLA — hidden on mobile */}
                          <td className="py-3.5 px-4 align-middle whitespace-nowrap min-w-[140px] hidden sm:table-cell">
                            {order.status === "EN_PREPARACION" ? (
                              <div className="space-y-1 w-28">
                                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${isDelayed ? "bg-rose-500" : "bg-[#FF3F1A]"}`}
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                                  <span>{order.elapsedMinutes}m / {order.estimatedMinutes}m</span>
                                  {isDelayed && <span className="text-rose-500 font-bold">Demora</span>}
                                </div>
                              </div>
                            ) : (
                              <span className={`font-mono text-[11px] ${isDelayed ? "text-rose-500 font-bold" : "text-zinc-400"}`}>
                                {isDelayed ? `+${order.elapsedMinutes - order.estimatedMinutes}m demora` : `${order.elapsedMinutes}m activos`}
                              </span>
                            )}
                          </td>

                          {/* Total — hidden on mobile (shown inline in ID row) */}
                          <td className="py-3.5 px-4 align-middle text-right font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 whitespace-nowrap hidden sm:table-cell">
                            ${order.total.toLocaleString("es-CO")}
                          </td>

                          {/* Acción / Abrir — hidden on mobile (whole row is clickable) */}
                          <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap hidden sm:table-cell">
                            <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 group-hover:bg-[#FF3F1A] group-hover:text-white flex items-center justify-center transition-all mx-auto text-zinc-400">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* Modal: Crear Nuevo Pedido Manual */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in font-sans antialiased">
          <div className="bg-white dark:bg-[#0E0E10] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF3F1A]">
                  Toma Manual
                </span>
                <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight">
                  Nuevo Pedido
                </h3>
              </div>
              <Button
                variant="ghost"
                intent="pedidos.manual.close"
                onClick={() => setShowManualModal(false)}
                className="w-7 h-7 p-0 rounded-lg text-zinc-400"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateManual} className="space-y-4">
              <Field
                label="Nombre del Cliente o Mesa *"
                labelStyle="bold"
                intent="pedidos.manual.customer"
                type="text"
                required
                placeholder="Ej. Mesa 4 / Carlos Bianchi"
                value={manualCustomer}
                onChange={e => setManualCustomer(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Teléfono / WhatsApp"
                  labelStyle="bold"
                  intent="pedidos.manual.phone"
                  type="text"
                  placeholder="+57 300 000-0000"
                  value={manualPhone}
                  onChange={e => setManualPhone(e.target.value)}
                />

                <Select
                  label="Canal de Ingreso"
                  intent="pedidos.manual.channel"
                  value={manualChannel}
                  onChange={e => setManualChannel(e.target.value as OrderChannel)}
                  options={[
                    { value: "presencial", label: "POS Mostrador" },
                    { value: "telefono", label: "Teléfono" },
                    { value: "web", label: "Web Directo" },
                    { value: "whatsapp", label: "WhatsApp" },
                  ]}
                />
              </div>

              <Textarea
                label="Observaciones / Alergias"
                intent="pedidos.manual.notes"
                rows={2}
                placeholder="Ej. Sin cebolla, empaque térmico..."
                value={manualNotes}
                onChange={e => setManualNotes(e.target.value)}
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                <Button
                  variant="ghost"
                  intent="pedidos.manual.cancel"
                  onClick={() => setShowManualModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  intent="pedidos.manual.submit"
                  className="px-5"
                >
                  Crear Pedido
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Layout Customizer Modal */}
      <CustomLayoutModal
        isOpen={showLayoutModal}
        onClose={() => setShowLayoutModal(false)}
        prefs={layoutPrefs}
        onSave={handleSaveLayoutPrefs}
        onReset={handleResetLayoutPrefs}
      />

      {/* Floating Drag & Drop Toast */}
      {dragToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 rounded-2xl shadow-2xl text-xs font-black flex items-center gap-2.5 border border-gray-700 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-none" />
          <span>{dragToast}</span>
        </div>
      )}
    </div>
  );
};
