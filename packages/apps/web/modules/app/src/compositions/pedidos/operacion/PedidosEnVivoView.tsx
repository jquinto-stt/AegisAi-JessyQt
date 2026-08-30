import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { OrderStatus, OrderChannel, UrgencyLevel, Pedido } from "../types";
import {
  Search,
  Filter,
  Plus,
  Sparkles,
  ChefHat,
  CheckCircle2,
  Clock,
  LayoutGrid,
  Kanban,
  ListFilter,
  AlertTriangle,
  RotateCcw,
  Store,
  X,
  ShoppingBag,
  SlidersHorizontal,
  ArrowRight,
  User,
  Phone,
  MessageSquare,
  Flame,
  Check,
  Send,
  Package,
  Zap,
  GripVertical,
  ChevronDown,
} from "lucide-react";
import { OperacionTab } from "../types";
import { NectoBanner } from "../shared/NectoBanner";
import {
  CustomLayoutModal,
  DEFAULT_LAYOUT_PREFS,
  LayoutPreferences,
} from "../shared/CustomLayoutModal";

export const PedidosEnVivoView: React.FC<{
  onNavigateOpTab?: (t: OperacionTab) => void;
}> = ({ onNavigateOpTab }) => {
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

  const todayScheduled = programados.filter(p => p.scheduledDate === "Hoy");

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

  const handleDropOrder = (orderId: string, targetCol: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.status === targetCol) return;

    transitionOrder(
      orderId,
      targetCol,
      "Operador (Arrastrar y Soltar)",
      `Pedido movido al estado ${targetCol} mediante arrastre en el tablero.`
    );

    const colNames: Record<OrderStatus, string> = {
      NUEVO: "Nuevos & Por Confirmar",
      CONFIRMADO: "Confirmados (En Cola)",
      EN_PREPARACION: "En Cocina / Horno",
      LISTO: "Listos para Entrega",
      FINALIZADO: "Entregados / Finalizados",
      RECHAZADO: "Rechazados",
      CANCELADO: "Cancelados",
    };

    setDragToast(`Pedido ${orderId} trasladado a "${colNames[targetCol]}"`);
    setTimeout(() => setDragToast(null), 3000);
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

  // Keyboard shortcut listener (Ctrl+K / Cmd+K to focus search)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    setManualCustomer("");
    setManualPhone("");
    setManualNotes("");
    setShowManualModal(false);
  };

  const getChannelBadge = (channel: OrderChannel) => {
    switch (channel) {
      case "whatsapp":
        return { label: "WhatsApp IA", bg: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700" };
      case "web":
        return { label: "Web Directo", bg: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700" };
      case "presencial":
        return { label: "Mostrador", bg: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700" };
      case "telefono":
        return { label: "Teléfono", bg: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700" };
    }
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
        <div className="bg-white dark:bg-[#2C2D31] rounded-2xl p-3.5 border border-slate-200 dark:border-[#374151] shadow-xs flex flex-wrap items-center justify-between gap-3">
          {/* Left: Search & Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search with Ctrl+K shortcut */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar pedido, cliente, #turno..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-16 py-2 text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="w-5 h-5 rounded-full bg-slate-200 dark:bg-gray-700 text-gray-500 flex items-center justify-center hover:bg-slate-300 transition-colors"
                    title="Limpiar búsqueda"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold text-gray-400 bg-slate-100 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded">
                    Ctrl K
                  </kbd>
                )}
              </div>
            </div>

            {/* Estado Dropdown */}
            <div className="relative flex items-center">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="appearance-none bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 cursor-pointer shadow-xs"
              >
                <option value="TODOS">Todos los Estados ({statusCounts.TODOS})</option>
                <option value="NUEVO">Nuevos ({statusCounts.NUEVO})</option>
                <option value="CONFIRMADO">En Cola ({statusCounts.CONFIRMADO})</option>
                <option value="EN_PREPARACION">En Cocina ({statusCounts.EN_PREPARACION})</option>
                <option value="LISTO">Listos ({statusCounts.LISTO})</option>
                <option value="FINALIZADO">Entregados ({statusCounts.FINALIZADO})</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 text-gray-400 pointer-events-none" />
            </div>

            {/* Canal Dropdown */}
            <div className="relative flex items-center">
              <select
                value={channelFilter}
                onChange={e => setChannelFilter(e.target.value as any)}
                className="appearance-none bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF3F1A]/30 cursor-pointer shadow-xs"
              >
                <option value="TODOS">Todos los Canales ({channelCounts.TODOS})</option>
                <option value="whatsapp">WhatsApp IA ({channelCounts.whatsapp})</option>
                <option value="web">Web Directo ({channelCounts.web})</option>
                <option value="presencial">Mostrador ({channelCounts.presencial})</option>
                <option value="telefono">Teléfono ({channelCounts.telefono})</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 text-gray-400 pointer-events-none" />
            </div>

            {/* Delay Alert Filter Button */}
            <button
              onClick={() => setUrgencyFilter(urgencyFilter === "RETRASADO" ? "TODOS" : "RETRASADO")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-xs ${
                urgencyFilter === "RETRASADO"
                  ? "bg-red-500 text-white border-red-500 ring-2 ring-red-500/20"
                  : "bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-slate-300"
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${urgencyFilter === "RETRASADO" ? "text-white" : "text-red-500"}`} />
              <span>Retrasados</span>
              {delayedCount > 0 && (
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md font-black ${
                    urgencyFilter === "RETRASADO"
                      ? "bg-white/20 text-white"
                      : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                  }`}
                >
                  {delayedCount}
                </span>
              )}
            </button>
          </div>

          {/* Right: View Mode Toggle, Customize & New Order */}
          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex bg-slate-100 dark:bg-gray-800 p-1 rounded-xl border border-slate-200 dark:border-gray-700">
              <button
                onClick={() => setViewMode("kanban")}
                className={`py-1.5 px-3 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === "kanban"
                    ? "bg-[#FF3F1A] text-white shadow-xs"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
                }`}
              >
                <Kanban className="w-3.5 h-3.5" /> Tablero
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`py-1.5 px-3 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-[#FF3F1A] text-white shadow-xs"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Cuadrícula
              </button>
            </div>

            {/* Personalizar Vista Button */}
            <button
              type="button"
              onClick={() => setShowLayoutModal(true)}
              className="py-2 px-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-[#FF3F1A] text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Personalizar qué secciones y columnas ver"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF3F1A]" />
              <span className="hidden md:inline">Personalizar</span>
            </button>

            <button
              onClick={() => setShowManualModal(true)}
              className="py-2 px-3.5 rounded-xl bg-[#FF3F1A] hover:bg-[#e03413] text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 flex-none"
            >
              <Plus className="w-4 h-4" /> Nuevo Pedido
            </button>
          </div>
        </div>
      ) : (
        /* Floating mini-bar when toolbar is hidden to allow reopening */
        <div className="flex items-center justify-between bg-white dark:bg-[#2C2D31] p-2.5 rounded-2xl border border-slate-200 dark:border-gray-700 shadow-xs">
          <span className="text-xs font-bold text-gray-500 pl-2">Modo Tablero Enfocado</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLayoutModal(true)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-gray-700 text-xs font-bold flex items-center gap-1.5 text-gray-700 dark:text-gray-200 hover:border-[#FF3F1A] cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF3F1A]" />
              <span>Personalizar Vista</span>
            </button>
            <button
              onClick={() => setShowManualModal(true)}
              className="py-1.5 px-3 rounded-xl bg-[#FF3F1A] hover:bg-[#e03413] text-white text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Nuevo Pedido
            </button>
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
                className={`w-[86vw] sm:w-80 md:w-88 flex-none snap-center bg-[#F8F9FA]/90 dark:bg-[#1E1E20]/90 rounded-3xl border p-3.5 flex flex-col justify-between shadow-2xs space-y-3 transition-all duration-200 ${
                  dragOverCol === col.id
                    ? "border-[#FF3F1A] ring-4 ring-orange-500/15 bg-orange-50/40 dark:bg-orange-950/20 scale-[1.01]"
                    : "border-slate-200/80 dark:border-zinc-800"
                }`}
              >
                {/* Column Header */}
                <div className="space-y-1.5 flex-none">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200/60 dark:border-zinc-700/60 text-[#FF3F1A] flex items-center justify-center shadow-2xs">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="font-black text-xs text-zinc-900 dark:text-zinc-100 tracking-tight">
                          {col.title}
                        </h4>
                      </div>
                    </div>

                    <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-slate-200/80 dark:border-zinc-700/80 shadow-2xs">
                      {colOrders.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-400 px-0.5">
                    <span className="truncate max-w-[180px]">{col.description}</span>
                    <strong className="font-mono font-bold text-zinc-600 dark:text-zinc-400 flex-none">
                      ${(colTotalSum / 1000).toFixed(0)}k
                    </strong>
                  </div>
                </div>

                {/* Tickets Container */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[calc(100vh-340px)]">
                  {col.id === "NUEVO" && todayScheduled.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-zinc-100/90 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-2 text-xs shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-[#FF3F1A]" /> Programado para Hoy:
                        </span>
                        <span className="font-mono font-black text-[10px] bg-white dark:bg-gray-800 px-2 py-0.5 rounded-md text-zinc-900 dark:text-zinc-100">
                          {todayScheduled[0].scheduledTime}
                        </span>
                      </div>
                      <div>
                        <p className="font-extrabold text-gray-900 dark:text-gray-100 truncate">
                          {todayScheduled[0].customerName}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {todayScheduled[0].items.map(i => `${i.quantity}× ${i.name}`).join(", ")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          injectScheduledOrderToLive(todayScheduled[0].id, true);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                      >
                        <Zap className="w-3.5 h-3.5 text-[#FF3F1A]" />
                        <span>Despertar e Inyectar a Cocina</span>
                      </button>
                    </div>
                  )}

                  {colOrders.length === 0 && (col.id !== "NUEVO" || todayScheduled.length === 0) ? (
                    <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-gray-800 rounded-2xl text-gray-400 text-xs">
                      <p className="font-bold">Sin pedidos en esta etapa</p>
                    </div>
                  ) : (
                    colOrders.map(order => {
                      const channelBadge = getChannelBadge(order.channel);
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
                          className={`bg-white dark:bg-[#2C2D31] rounded-2xl border-2 p-4 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-3 ${
                            isDragging
                              ? "opacity-35 scale-95 border-dashed border-[#FF3F1A] ring-2 ring-orange-500/30"
                              : isDelayed
                              ? "border-red-400 dark:border-red-800 bg-red-50/10"
                              : "border-slate-200/90 dark:border-gray-700 hover:border-[#FF3F1A]"
                          }`}
                        >
                          {/* Ticket Top Meta */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <GripVertical className="w-3.5 h-3.5 text-gray-400 opacity-60 hover:opacity-100 flex-none" />
                              <span className="font-mono font-black text-xs text-gray-900 dark:text-gray-100">
                                {order.id}
                              </span>
                              {isDelayed && (
                                <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-md animate-pulse">
                                  RETRASO
                                </span>
                              )}
                            </div>

                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${channelBadge.bg}`}
                            >
                              {channelBadge.label}
                            </span>
                          </div>

                          {/* Customer & Time */}
                          <div>
                            <h5 className="font-extrabold text-xs text-gray-900 dark:text-gray-100 truncate">
                              {order.customerName}
                            </h5>
                            <p className="text-[10px] text-gray-400 font-mono">
                              Creado: {order.createdAt}
                            </p>
                          </div>

                          {/* Items Preview */}
                          <div className="bg-slate-50 dark:bg-gray-800/80 rounded-xl p-2.5 text-xs space-y-1 border border-slate-100 dark:border-gray-700">
                            {order.items.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="flex justify-between text-gray-700 dark:text-gray-300 font-medium">
                                <span className="truncate pr-1">
                                  <strong className="text-[#FF3F1A]">×{item.quantity}</strong> {item.name}
                                </span>
                              </div>
                            ))}
                            {order.items.length > 2 && (
                              <p className="text-[10px] text-gray-400 italic">
                                +{order.items.length - 2} productos más...
                              </p>
                            )}

                            <div className="pt-1.5 border-t border-slate-200 dark:border-gray-700 flex justify-between font-black text-xs text-zinc-900 dark:text-zinc-100">
                              <span>Total:</span>
                              <span className="font-mono">${order.total.toLocaleString("es-CO")}</span>
                            </div>
                          </div>

                          {/* Elapsed Time Progress Bar */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-extrabold text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#FF3F1A]" />
                                <span>{order.elapsedMinutes}m de {order.estimatedMinutes}m</span>
                              </span>
                              <span className={isDelayed ? "text-red-500 font-black" : "text-gray-400"}>
                                {isDelayed ? `+${order.elapsedMinutes - order.estimatedMinutes}m demora` : `${progressPercent}%`}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isDelayed ? "bg-red-500" : progressPercent > 80 ? "bg-amber-500" : "bg-[#FF3F1A]"
                                }`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>

                          {/* Quick Advancement Action Buttons */}
                          <div
                            className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-1.5"
                            onClick={e => e.stopPropagation()}
                          >
                            {order.status === "NUEVO" && (
                              <>
                                <button
                                  onClick={() => setRejectModalOrder(order)}
                                  className="py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-gray-700 text-[10px] font-bold text-gray-500 hover:bg-slate-100 cursor-pointer"
                                >
                                  Descartar
                                </button>
                                <button
                                  onClick={() => confirmOrder(order.id)}
                                  className="flex-1 py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-black flex items-center justify-center gap-1 shadow-xs cursor-pointer active:scale-95"
                                >
                                  <span>Confirmar</span>
                                  <ArrowRight className="w-3 h-3 text-[#FF3F1A]" />
                                </button>
                              </>
                            )}

                            {order.status === "CONFIRMADO" && (
                              <button
                                onClick={() => sendToKitchen(order.id)}
                                className="w-full py-1.5 px-3 rounded-xl bg-[#FF3F1A] hover:bg-[#e03413] text-white text-[11px] font-black flex items-center justify-center gap-1 shadow-xs cursor-pointer active:scale-95"
                              >
                                <ChefHat className="w-3 h-3" />
                                <span>Pasar al Fogón / Horno</span>
                              </button>
                            )}

                            {order.status === "EN_PREPARACION" && (
                              <button
                                onClick={() => markOrderReady(order.id)}
                                className="w-full py-1.5 px-3 rounded-xl bg-[#FF3F1A] hover:bg-[#e03413] text-white text-[11px] font-black flex items-center justify-center gap-1 shadow-xs cursor-pointer active:scale-95"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Marcar Listo para Retiro</span>
                              </button>
                            )}

                            {order.status === "LISTO" && (
                              <button
                                onClick={() => deliverOrder(order.id)}
                                className="w-full py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-black flex items-center justify-center gap-1 shadow-xs cursor-pointer active:scale-95"
                              >
                                <Package className="w-3 h-3 text-[#FF3F1A]" />
                                <span>Entregar Pedido</span>
                              </button>
                            )}

                            {order.status === "FINALIZADO" && (
                              <div className="w-full text-center py-1 text-[10px] font-extrabold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
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
            <div
              key={order.id}
              onClick={() => setSelectedOrderId(order.id)}
              className="bg-white dark:bg-[#2C2D31] rounded-2xl border border-slate-200 dark:border-gray-700 p-5 shadow-xs hover:border-[#FF3F1A] transition-all cursor-pointer space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-xs text-gray-900 dark:text-gray-100">{order.id}</span>
                <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 font-mono">
                  ${order.total.toLocaleString("es-CO")}
                </span>
              </div>
              <h5 className="font-extrabold text-sm text-gray-900 dark:text-gray-100">{order.customerName}</h5>
              <p className="text-xs text-gray-500">
                {order.items.map(i => `${i.quantity}× ${i.name}`).join(", ")}
              </p>
              <div className="text-[11px] font-bold text-gray-400 flex justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-zinc-900 dark:text-zinc-100 font-extrabold">{order.status}</span>
                <span>{order.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Crear Nuevo Pedido Manual */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-[#2C2D31] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#374151] w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#374151] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#FF3F1A] flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 dark:text-gray-100">
                    Nuevo Pedido Manual (POS)
                  </h3>
                  <p className="text-xs text-gray-400">Ingreso rápido de pedido en salón o mostrador</p>
                </div>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManual} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Nombre del Cliente o Mesa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Mesa 4 / Carlos Bianchi"
                  value={manualCustomer}
                  onChange={e => setManualCustomer(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-[#374151] rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="+54 11 0000-0000"
                    value={manualPhone}
                    onChange={e => setManualPhone(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-[#374151] rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Canal de Ingreso
                  </label>
                  <select
                    value={manualChannel}
                    onChange={e => setManualChannel(e.target.value as OrderChannel)}
                    className="w-full p-2.5 text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-[#374151] rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none cursor-pointer"
                  >
                    <option value="presencial">Mostrador / Salón</option>
                    <option value="telefono">Teléfono</option>
                    <option value="web">Web Directo</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Observaciones / Alergias
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Sin cebolla, entregar empaquetado térmico..."
                  value={manualNotes}
                  onChange={e => setManualNotes(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-[#374151] rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-[#374151]">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 dark:border-gray-700 text-xs font-extrabold text-gray-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-[#FF3F1A] hover:bg-orange-600 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  Crear Pedido
                </button>
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
