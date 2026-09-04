import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { OrderStatus, OrderChannel, UrgencyLevel, Pedido } from "../types";
import {
  Plus,
  ShoppingBag,
  ChefHat,
  CheckCircle2,
  CheckCheck,
  LayoutGrid,
  Kanban,
  AlertTriangle,
  X,
  SlidersHorizontal,
  ArrowRight,
  Check,
  Package,
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
    openWhatsAppConversation,
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
      description: "Canales directos o WhatsApp",
      icon: ShoppingBag,
      iconBg: "bg-[#190088]/10 dark:bg-[#190088]/20",
      iconColor: "text-[#190088] dark:text-[#97D6DF]",
      badgeStyle: "bg-[#ECECEC] text-[#212121] dark:bg-zinc-800 dark:text-[#ECECEC] border-zinc-200 dark:border-zinc-700",
    },
    CONFIRMADO: {
      title: "Confirmados (En Cola)",
      description: "Pago validado en cola",
      icon: CheckCircle2,
      iconBg: "bg-[#190088]/10 dark:bg-[#190088]/20",
      iconColor: "text-[#190088] dark:text-[#97D6DF]",
      badgeStyle: "bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] border-[#190088]/20",
    },
    EN_PREPARACION: {
      title: "En Cocina / Preparación",
      description: "En línea de cocción KDS",
      icon: ChefHat,
      iconBg: "bg-[#FF3F1A]/10 dark:bg-[#FF3F1A]/20",
      iconColor: "text-[#FF3F1A]",
      badgeStyle: "bg-[#FF3F1A]/10 text-[#FF3F1A] border-[#FF3F1A]/20",
    },
    LISTO: {
      title: "Listos para Entrega",
      description: "En mostrador o pase",
      icon: Package,
      iconBg: "bg-[#97D6DF]/20 dark:bg-[#97D6DF]/15",
      iconColor: "text-[#190088] dark:text-[#97D6DF]",
      badgeStyle: "bg-[#97D6DF]/20 text-[#190088] dark:text-[#97D6DF] border-[#97D6DF]/40",
    },
    FINALIZADO: {
      title: "Entregados Hoy",
      description: "Completados con éxito",
      icon: CheckCheck,
      iconBg: "bg-[#ECECEC] dark:bg-zinc-800",
      iconColor: "text-zinc-600 dark:text-zinc-400",
      badgeStyle: "bg-[#ECECEC] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
    },
    RECHAZADO: {
      title: "Rechazados",
      description: "Descartados",
      icon: X,
      iconBg: "bg-[#ECECEC] dark:bg-zinc-800",
      iconColor: "text-zinc-500",
      badgeStyle: "bg-[#ECECEC] text-zinc-600 border-zinc-300 dark:border-zinc-700",
    },
    CANCELADO: {
      title: "Cancelados",
      description: "Cancelados",
      icon: X,
      iconBg: "bg-[#ECECEC] dark:bg-zinc-800",
      iconColor: "text-zinc-500",
      badgeStyle: "bg-[#ECECEC] text-zinc-500 border-zinc-200 dark:border-zinc-700",
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
                  ? "bg-[#190088]/10 dark:bg-[#190088]/25 text-[#190088] dark:text-[#97D6DF] border-[#190088]/30"
                  : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${urgencyFilter === "RETRASADO" ? "text-[#190088] dark:text-[#97D6DF]" : "text-zinc-400"}`} />
              <span>Demoras</span>
              {delayedCount > 0 && (
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    urgencyFilter === "RETRASADO"
                      ? "bg-[#190088] text-white"
                      : "bg-[#190088]/10 text-[#190088] dark:bg-[#190088]/20 dark:text-[#97D6DF]"
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
                { value: "grid", label: "Cuadrícula", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
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
          {orderedVisibleColumns.map(col => {
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
                className={`flex-1 min-w-[210px] sm:min-w-[230px] lg:min-w-0 max-w-full bg-[#ECECEC]/40 dark:bg-[#151518]/70 rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 p-2.5 sm:p-3 flex flex-col justify-between space-y-3 transition-all shadow-2xs ${
                  dragOverCol === col.id
                    ? "ring-2 ring-[#FF3F1A]/40 border-[#FF3F1A] bg-[#FF3F1A]/5 dark:bg-[#FF3F1A]/10 shadow-md"
                    : "hover:border-zinc-300 dark:hover:border-zinc-700/80"
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
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#EFE6D3]/60 dark:bg-[#EFE6D3]/15 text-[#212121] dark:text-[#ECECEC] border border-[#EFE6D3] dark:border-[#EFE6D3]/30">
                                <Calendar className="w-2.5 h-2.5 text-[#FF3F1A]" />
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
                    <div className="p-6 text-center text-zinc-400 dark:text-zinc-500 text-xs font-medium rounded-xl bg-white/50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60">
                      <p>Sin pedidos en esta etapa</p>
                    </div>
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
                          className={`bg-white dark:bg-[#18181B] rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 transition-all cursor-grab active:cursor-grabbing hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-xs space-y-2 group select-none ${
                            isDragging ? "opacity-30 scale-95 border-dashed border-[#FF3F1A]" : ""
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
                                <button
                                  type="button"
                                  onClick={e => {
                                    if (order.channel === "whatsapp") {
                                      e.stopPropagation();
                                      openWhatsAppConversation(order.id);
                                    }
                                  }}
                                  className={order.channel === "whatsapp" ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
                                  title={order.channel === "whatsapp" ? "Abrir chat en WhatsApp" : undefined}
                                >
                                  <ChannelBadge channel={order.channel} />
                                </button>
                              )}
                            </div>

                            {layoutPrefs.showOrderTotal !== false && (
                              <div className="flex items-center gap-1 flex-none">
                                <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100">
                                  ${order.total.toLocaleString("es-CO")}
                                </span>
                                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 group-hover:text-[#190088] dark:group-hover:text-[#97D6DF] transition-colors" />
                              </div>
                            )}
                          </div>

                          {/* Customer Name & Items count */}
                          <div className="min-w-0 pl-5">
                            <h5 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5 group-hover:text-[#190088] dark:group-hover:text-[#97D6DF] transition-colors">
                              {isDelayed && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#190088] dark:bg-[#97D6DF] flex-none" title="Demorado" />
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
                                      className={`h-full rounded-full transition-all ${isDelayed ? "bg-[#190088]" : "bg-[#97D6DF]"}`}
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                                    <span>{order.elapsedMinutes}m / {order.estimatedMinutes}m</span>
                                    {isDelayed && <span className="text-[#190088] dark:text-[#97D6DF] font-medium">Demorado</span>}
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full flex items-center justify-between text-[10px] font-mono text-zinc-400">
                                  <span className={isDelayed ? "text-[#190088] dark:text-[#97D6DF] font-medium" : ""}>
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
        /* RESPONSIVE CARDS GRID VIEW */
        <div className="space-y-4">
          {/* Grid Summary Bar */}
          <div className="flex items-center justify-between px-1 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              Mostrando {filterOrdersList(orders).length} pedidos en cuadrícula
              {programados.length > 0 && statusFilter === "TODOS" ? ` (+${programados.length} programados)` : ""}
            </span>
            <span className="text-[11px] text-zinc-400 items-center gap-1 hidden sm:flex">
              <Info className="w-3.5 h-3.5 text-zinc-400" />
              <span>Haz clic en cualquier tarjeta para abrir la comanda completa</span>
            </span>
          </div>

          {filterOrdersList(orders).length === 0 && (statusFilter !== "TODOS" || programados.length === 0) ? (
            <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-12 text-center text-zinc-400 font-medium shadow-2xs">
              No se encontraron pedidos con los filtros actuales.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 items-stretch">
              {/* Programados cards if applicable */}
              {statusFilter === "TODOS" &&
                programados.map(prog => (
                  <div
                    key={prog.id}
                    onClick={() => setSelectedOrderId(prog.id)}
                    className="p-4 rounded-2xl bg-[#EFE6D3]/30 dark:bg-[#EFE6D3]/5 border border-[#EFE6D3] dark:border-[#EFE6D3]/30 space-y-3 transition-all cursor-pointer hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-xs group flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-zinc-600 dark:text-zinc-400">
                            {prog.id}
                          </span>
                          <ChannelBadge channel={prog.channel} />
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-[#EFE6D3] dark:bg-[#EFE6D3]/20 text-[#212121] dark:text-[#ECECEC]">
                          <Calendar className="w-3 h-3 text-[#FF3F1A]" />
                          <span>
                            {prog.scheduledDate === "Hoy"
                              ? `Hoy ${prog.scheduledTime}`
                              : `${prog.scheduledDate} ${prog.scheduledTime}`}
                          </span>
                        </span>
                      </div>

                      <div>
                        <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-[#FF3F1A] transition-colors">
                          {prog.customerName}
                        </h4>
                        {prog.customerPhone && (
                          <p className="text-[11px] font-mono text-zinc-400">{prog.customerPhone}</p>
                        )}
                      </div>

                      <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2 leading-relaxed bg-white/70 dark:bg-zinc-900/60 p-2 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                        {prog.items.map(i => `${i.quantity}× ${i.name}`).join(", ")}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between">
                      <span className="font-mono font-black text-sm text-zinc-900 dark:text-zinc-100">
                        ${prog.total.toLocaleString("es-CO")}
                      </span>
                      <Button
                        variant="outline"
                        intent="pedidos.scheduled.inject"
                        onClick={e => {
                          e.stopPropagation();
                          injectScheduledOrderToLive(prog.id, true);
                        }}
                        className="py-1 px-2.5 text-xs font-bold border-zinc-200 dark:border-zinc-700 hover:border-[#FF3F1A] hover:text-[#FF3F1A]"
                      >
                        <ChefHat className="w-3.5 h-3.5 text-[#FF3F1A]" />
                        <span>Pasar a Cocina</span>
                      </Button>
                    </div>
                  </div>
                ))}

              {/* Live orders cards in Grid */}
              {filterOrdersList(orders).map(order => {
                const isDelayed = order.urgency === "RETRASADO";
                const progressPercent = Math.min(
                  100,
                  Math.round((order.elapsedMinutes / Math.max(1, order.estimatedMinutes)) * 100)
                );

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-zinc-200/90 dark:border-zinc-800 space-y-3 transition-all cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-xs group flex flex-col justify-between ${
                      isDelayed
                        ? "border-[#190088]/40 dark:border-[#97D6DF]/40 bg-[#190088]/5 dark:bg-[#190088]/10"
                        : ""
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Top Row: ID, Channel, Status */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-[#190088] dark:group-hover:text-[#97D6DF] transition-colors">
                            {order.id}
                          </span>
                          <ChannelBadge channel={order.channel} />
                        </div>
                        <OrderStatusBadge status={order.status} size="sm" />
                      </div>

                      {/* Customer Info & Turn */}
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 truncate group-hover:text-[#190088] dark:group-hover:text-[#97D6DF] transition-colors">
                            {order.customerName}
                          </h4>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex-none">
                            Turno #{order.turnNumber || "00"}
                          </span>
                        </div>
                        {order.customerPhone && (
                          <p className="text-[11px] font-mono text-zinc-400">{order.customerPhone}</p>
                        )}
                      </div>

                      {/* Items summary */}
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2 leading-relaxed bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
                        {order.items.map(i => `${i.quantity}× ${i.name}`).join(", ")}
                      </p>

                      {/* Special Notes */}
                      {order.notes && (
                        <p className="text-[11px] text-[#190088] dark:text-[#97D6DF] italic font-medium truncate">
                          Nota: {order.notes}
                        </p>
                      )}
                    </div>

                    {/* Footer: SLA Progress & Total */}
                    <div className="space-y-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80">
                      {order.status === "EN_PREPARACION" ? (
                        <div className="space-y-1">
                          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isDelayed ? "bg-[#190088]" : "bg-[#97D6DF]"
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                            <span>
                              {order.elapsedMinutes}m / {order.estimatedMinutes}m KDS
                            </span>
                            {isDelayed ? (
                              <span className="text-[#190088] dark:text-[#97D6DF] font-bold">
                                Demorado
                              </span>
                            ) : (
                              <span>{order.createdAt}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                          <span className={isDelayed ? "text-[#190088] dark:text-[#97D6DF] font-bold" : ""}>
                            {isDelayed
                              ? `+${order.elapsedMinutes - order.estimatedMinutes}m demora`
                              : `${order.elapsedMinutes}m activos`}
                          </span>
                          <span>{order.createdAt}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className="font-mono font-black text-sm text-zinc-900 dark:text-zinc-100">
                          ${order.total.toLocaleString("es-CO")}
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 group-hover:bg-[#190088] group-hover:text-white dark:group-hover:bg-[#97D6DF] dark:group-hover:text-zinc-900 flex items-center justify-center transition-all text-zinc-400 shadow-2xs">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
