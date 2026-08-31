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
} from "lucide-react";


import { useBusiness } from "@/context/BusinessContext";
import { playOrderAlert } from "@/utils/audioAlerts";
import { OperacionTab } from "../types";
import { NectoBanner } from "../shared/NectoBanner";
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

  // Flujo operativo lineal del pedido: no se pueden saltar ni retroceder etapas.
  // Cada estado sólo puede avanzar exactamente al siguiente mediante arrastre.
  const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
    NUEVO: "CONFIRMADO",
    CONFIRMADO: "EN_PREPARACION",
    EN_PREPARACION: "LISTO",
    LISTO: "FINALIZADO",
  };

  const colNames: Record<OrderStatus, string> = {
    NUEVO: "Nuevos & Por Confirmar",
    CONFIRMADO: "Confirmados (En Cola)",
    EN_PREPARACION: "En Cocina / Horno",
    LISTO: "Listos para Entrega",
    FINALIZADO: "Entregados / Finalizados",
    RECHAZADO: "Rechazados",
    CANCELADO: "Cancelados",
  };

  const showToast = (msg: string) => {
    setDragToast(msg);
    setTimeout(() => setDragToast(null), 3000);
  };

  const handleDropOrder = (orderId: string, targetCol: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.status === targetCol) return;

    // Sólo se admite avanzar UNA etapa: bloquea saltos (p.ej. NUEVO→LISTO)
    // y retrocesos (p.ej. LISTO→NUEVO).
    const allowedNext = NEXT_STATUS[order.status];
    if (targetCol !== allowedNext) {
      showToast(
        `No se puede mover a "${colNames[targetCol]}": el pedido debe avanzar por orden desde "${colNames[order.status]}".`
      );
      return;
    }

    transitionOrder(
      orderId,
      targetCol,
      "Operador (Arrastrar y Soltar)",
      `Pedido movido al estado ${targetCol} mediante arrastre en el tablero.`
    );

    showToast(`Pedido ${orderId} trasladado a "${colNames[targetCol]}"`);
  };

  // Kanban Column Definitions dictionary
  const columnDefs: Record<OrderStatus, {
    title: string;
    description: string;
    headerColor: string;
    badgeBg: string;
    icon: any;
  }> = {
    NUEVO: {
      title: "Nuevos & Por Confirmar",
      description: "Recibidos por canales directos o IA",
      headerColor: "text-zinc-900 dark:text-zinc-100 border-zinc-900",
      badgeBg: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100",
      icon: Sparkles,
    },
    CONFIRMADO: {
      title: "Confirmados (En Cola)",
      description: "Aprobados y listos para entrar al fogón",
      headerColor: "text-zinc-900 dark:text-zinc-100 border-zinc-900",
      badgeBg: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100",
      icon: CheckCircle2,
    },
    EN_PREPARACION: {
      title: "En Cocina / Preparación",
      description: "En horneado, armado o despacho",
      headerColor: "text-[#FF3F1A] border-[#FF3F1A]",
      badgeBg: "bg-orange-50 dark:bg-orange-950/60 text-[#FF3F1A]",
      icon: ChefHat,
    },
    LISTO: {
      title: "Listos para Entrega",
      description: "En mostrador o esperando delivery",
      headerColor: "text-zinc-900 dark:text-zinc-100 border-zinc-900",
      badgeBg: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100",
      icon: Package,
    },
    FINALIZADO: {
      title: "Entregados Hoy",
      description: "Completados con éxito en el turno",
      headerColor: "text-zinc-700 dark:text-zinc-300 border-zinc-700",
      badgeBg: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
      icon: Check,
    },
    RECHAZADO: {
      title: "Rechazados",
      description: "Rechazados",
      headerColor: "text-rose-700",
      badgeBg: "bg-rose-50",
      icon: X,
    },
    CANCELADO: {
      title: "Cancelados",
      description: "Cancelados",
      headerColor: "text-rose-700",
      badgeBg: "bg-rose-50",
      icon: X,
    },
  };

  // Active ordered and visible columns
  const orderedVisibleColumns = layoutPrefs.columns
    .filter(c => c.visible && columnDefs[c.id])
    .map(c => ({
      id: c.id,
      title: c.title || columnDefs[c.id].title,
      description: columnDefs[c.id].description,
      headerColor: columnDefs[c.id].headerColor,
      badgeBg: columnDefs[c.id].badgeBg,
      icon: columnDefs[c.id].icon,
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
        <div className="bg-white dark:bg-[#121214] rounded-2xl p-3 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          {/* Left: Search & Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search with Ctrl+K shortcut */}
            <SearchInput
              ref={searchInputRef}
              intent="pedidos.search"
              className="flex-1 min-w-[200px] max-w-sm"
              placeholder="Buscar por ID, cliente, producto..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
            />

            {/* Estado Dropdown */}
            <div className="relative flex items-center">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="appearance-none bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold py-2 pl-3 pr-7 rounded-xl focus:outline-none cursor-pointer"
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
                className="appearance-none bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold py-2 pl-3 pr-7 rounded-xl focus:outline-none cursor-pointer"
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
              className={`p-0 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                urgencyFilter === "RETRASADO"
                  ? "bg-rose-500 text-white border-rose-500 shadow-2xs"
                  : "bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-zinc-400"
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${urgencyFilter === "RETRASADO" ? "text-white" : "text-rose-500"}`} />
              <span>Retrasos</span>
              {delayedCount > 0 && (
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    urgencyFilter === "RETRASADO"
                      ? "bg-white/20 text-white"
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
              className="py-2 px-3 bg-zinc-50 dark:bg-zinc-900 text-xs"
              title="Personalizar columnas y diseño"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden md:inline">Estructura</span>
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
                className="py-2 px-3 border-orange-200 dark:border-orange-900/60 bg-orange-50/90 dark:bg-orange-950/40 text-[#FF3F1A] hover:bg-[#FF3F1A] hover:text-white text-xs"
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
              <span>Nuevo Pedido</span>
            </Button>

          </div>
        </div>
      ) : (
        /* Floating mini-bar when toolbar is hidden to allow reopening */
        <div className="flex items-center justify-between bg-white dark:bg-[#121214] p-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-xs font-mono text-zinc-400 pl-2">MODO TABLERO ENFOCADO</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              intent="pedidos.minibar.customize"
              onClick={() => setShowLayoutModal(true)}
              className="py-1.5 px-3 text-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
              <span>Estructura</span>
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
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory min-h-[600px] scrollbar-thin">
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
                className={`w-[86vw] sm:w-80 md:w-88 flex-none snap-center bg-zinc-100/60 dark:bg-[#121214]/60 rounded-2xl border p-3 flex flex-col justify-between shadow-2xs space-y-3 transition-all duration-200 ${
                  dragOverCol === col.id
                    ? "border-[#FF3F1A] ring-2 ring-orange-500/20 bg-orange-50/20 dark:bg-orange-950/20"
                    : "border-zinc-200/80 dark:border-zinc-800/80"
                }`}
              >
                {/* Column Header */}
                <div className="space-y-1.5 flex-none">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-200/60 dark:border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
                        <Icon className="w-3 h-3 text-[#FF3F1A]" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs text-zinc-950 dark:text-zinc-50 tracking-tight">
                          {col.title}
                        </h4>
                      </div>
                    </div>

                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                      {colOrders.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 px-0.5">
                    <span className="truncate max-w-[180px]">{col.description}</span>
                    <span className="font-bold text-zinc-600 dark:text-zinc-400 flex-none">
                      ${(colTotalSum / 1000).toFixed(0)}k
                    </span>
                  </div>
                </div>

                {/* Tickets Container */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[calc(100vh-340px)]">
                  {col.id === "NUEVO" && programados.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#FF3F1A]" /> Programados ({programados.length})
                        </span>
                      </div>

                      {programados.map(prog => (
                        <div
                          key={prog.id}
                          className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 space-y-2 text-xs shadow-2xs transition-all hover:border-zinc-300"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-1.5 text-[11px] truncate max-w-[140px]">
                              {prog.customerName}
                            </span>
                            <span className="font-mono font-bold text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700">
                              {prog.scheduledDate === "Hoy" ? `Hoy ${prog.scheduledTime}` : `${prog.scheduledDate} ${prog.scheduledTime}`}
                            </span>
                          </div>

                          <p className="text-[11px] text-zinc-500 line-clamp-2">
                            {prog.items.map(i => `${i.quantity}× ${i.name}`).join(", ")}
                          </p>

                          <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px]">
                            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                              ${prog.total.toLocaleString("es-AR")}
                            </span>
                            <Button
                              variant="primary"
                              intent="pedidos.scheduled.inject"
                              onClick={e => {
                                e.stopPropagation();
                                injectScheduledOrderToLive(prog.id, true);
                              }}
                              className="py-1.5 px-2.5 text-[10px]"
                            >
                              <Zap className="w-3 h-3 text-[#FF3F1A]" />
                              <span>Inyectar a Cocina</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {colOrders.length === 0 && (col.id !== "NUEVO" || programados.length === 0) ? (
                    <Card variant="dashed" intent="pedidos.column.empty" className="p-8 text-center text-zinc-400 text-xs font-medium">
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
                          className={`bg-white dark:bg-[#18181B] rounded-3xl border p-4 shadow-2xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-3 ${
                            isDragging
                              ? "opacity-40 scale-95 border-dashed border-[#FF3F1A] ring-2 ring-orange-500/20"
                              : isDelayed
                              ? "border-rose-500/40 bg-rose-500/[0.02] dark:bg-rose-500/[0.04]"
                              : "border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700"
                          }`}
                        >
                          {/* Cliente + total (jerarquía primaria) */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h5 className="font-bold text-sm text-zinc-950 dark:text-zinc-50 truncate flex items-center gap-1.5">
                                {isDelayed && (
                                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse flex-none" title="Retraso operativo" />
                                )}
                                {order.customerName}
                              </h5>
                              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                {order.id} · {order.items.reduce((s, i) => s + i.quantity, 0)} ítems
                              </p>
                            </div>
                            <span className="font-mono font-bold text-sm text-zinc-950 dark:text-zinc-50 flex-none">
                              ${order.total.toLocaleString("es-CO")}
                            </span>
                          </div>

                          {/* Tiempo: una sola señal (barra sólo en preparación) */}
                          {order.status === "EN_PREPARACION" ? (
                            <div className="space-y-1">
                              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${isDelayed ? "bg-rose-500" : "bg-[#FF3F1A]"}`}
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <p className={`text-[10px] font-mono ${isDelayed ? "text-rose-500 font-bold" : "text-zinc-400"}`}>
                              {isDelayed ? `+${order.elapsedMinutes - order.estimatedMinutes}m de demora` : `${order.elapsedMinutes}m / ${order.estimatedMinutes}m`}
                            </p>
                          )}

                          {/* Quick Advancement Action Buttons */}
                          <div
                            className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-1.5"
                            onClick={e => e.stopPropagation()}
                          >
                            {order.status === "NUEVO" && (
                              <>
                                <Button
                                  variant="outline"
                                  intent="pedidos.order.discard"
                                  onClick={() => setRejectModalOrder(order)}
                                  className="py-1.5 px-2.5 text-[10px]"
                                >
                                  Descartar
                                </Button>
                                <Button
                                  variant="primary"
                                  intent="pedidos.order.confirm"
                                  onClick={() => confirmOrder(order.id)}
                                  className="flex-1 py-1.5 px-3 text-[11px]"
                                >
                                  <span>Confirmar</span>
                                  <ArrowRight className="w-3 h-3 text-[#FF3F1A]" />
                                </Button>
                              </>
                            )}

                            {order.status === "CONFIRMADO" && (
                              <Button
                                variant="accent"
                                intent="pedidos.order.send-kitchen"
                                onClick={() => sendToKitchen(order.id)}
                                className="w-full py-1.5 px-3 text-[11px]"
                              >
                                <ChefHat className="w-3.5 h-3.5" />
                                <span>Pasar a Cocina</span>
                              </Button>
                            )}

                            {order.status === "EN_PREPARACION" && (
                              <Button
                                variant="accent"
                                intent="pedidos.order.mark-ready"
                                onClick={() => markOrderReady(order.id)}
                                className="w-full py-1.5 px-3 text-[11px]"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Marcar Listo</span>
                              </Button>
                            )}

                            {order.status === "LISTO" && (
                              <Button
                                variant="primary"
                                intent="pedidos.order.deliver"
                                onClick={() => deliverOrder(order.id)}
                                className="w-full py-1.5 px-3 text-[11px]"
                              >
                                <Package className="w-3.5 h-3.5 text-[#FF3F1A]" />
                                <span>Entregar Pedido</span>
                              </Button>
                            )}

                            {order.status === "FINALIZADO" && (
                              <div className="w-full text-center py-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl">
                                Pedido Finalizado
                              </div>
                            )}
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
      ) : (
        /* GRID VIEW (Compact cards fallback) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filterOrdersList(orders).map(order => (
            <Card
              key={order.id}
              intent="pedidos.grid.card"
              onClick={() => setSelectedOrderId(order.id)}
              className="dark:bg-[#18181B] p-5 hover:border-[#FF3F1A] transition-all cursor-pointer space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-zinc-950 dark:text-zinc-50">{order.id}</span>
                <span className="text-xs font-bold text-zinc-950 dark:text-zinc-50 font-mono">
                  ${order.total.toLocaleString("es-CO")}
                </span>
              </div>
              <h5 className="font-bold text-sm text-zinc-950 dark:text-zinc-50">{order.customerName}</h5>
              <p className="text-xs text-zinc-500">
                {order.items.map(i => `${i.quantity}× ${i.name}`).join(", ")}
              </p>
              <div className="text-[11px] font-bold text-zinc-400 flex justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-950 dark:text-zinc-50 font-bold">{order.status}</span>
                <span>{order.createdAt}</span>
              </div>
            </Card>
          ))}
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
