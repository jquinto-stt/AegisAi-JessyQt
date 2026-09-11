import React, { useState } from "react";
import { usePedidos } from "../context/PedidosContext";
import { Pedido, UrgencyLevel, OperacionTab, OrderStatus } from "../types";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  CardFooter,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Select,
  SegmentedControl,
  Modal,
} from "@/elements";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Search,
  FileText,
  Printer,
  ExternalLink,
  ShieldCheck,
  Barcode,
  MapPin,
  User,
  Phone,
  ShoppingBag,
  Boxes,
  Check,
  RotateCcw,
  Sparkles,
  ChefHat,
  Minus,
  Plus,
  ArrowLeft,
} from "lucide-react";
import { useBusiness } from "@/context/BusinessContext";
import { inventoryService } from "@/ModuloInventario/services/inventoryService";

export const PreparacionTiemposView: React.FC<{
  onNavigateOpTab?: (t: OperacionTab) => void;
}> = ({ onNavigateOpTab }) => {
  const {
    orders,
    transitionOrder,
    markOrderReady,
    deliverOrder,
    adjustEstimate,
    setSelectedOrderId,
    setPrintTicketOrder,
  } = usePedidos();
  const { activeBusiness, semantics } = useBusiness();

  const isFood = Boolean(semantics?.requiresKitchenDisplay);

  // States for general store fulfillment
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [methodFilter, setMethodFilter] = useState<string>("TODOS");
  const [searchQuery, setSearchQuery] = useState("");
  const [checkedItems, setCheckedItems] = useState<Record<string, Set<number>>>({});
  const [courierData, setCourierData] = useState<Record<string, { courier: string; trackingNumber: string }>>({
    "PED-1020": { courier: "Coordinadora Mercantil", trackingNumber: "CO-98412091" },
    "PED-1024": { courier: "Servientrega Express", trackingNumber: "SER-449102" },
    "PED-1021": { courier: "Mensajería Propia (Moto)", trackingNumber: "DOM-08" },
  });
  const [shippingLabelOrder, setShippingLabelOrder] = useState<Pedido | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  // Orders involved in fulfillment lifecycle
  const fulfillmentOrders = orders.filter(
    o => o.status === "CONFIRMADO" || o.status === "EN_PREPARACION" || o.status === "LISTO"
  );

  // Counts for KPIs
  const porAlistarCount = orders.filter(o => o.status === "CONFIRMADO").length;
  const enAlistamientoCount = orders.filter(o => o.status === "EN_PREPARACION").length;
  const listosDespachoCount = orders.filter(o => o.status === "LISTO").length;
  const despachadosHoyCount = orders.filter(o => o.status === "FINALIZADO").length;

  const toggleItemCheck = (orderId: string, itemIdx: number) => {
    setCheckedItems(prev => {
      const orderSet = new Set(prev[orderId] || []);
      if (orderSet.has(itemIdx)) orderSet.delete(itemIdx);
      else orderSet.add(itemIdx);
      return { ...prev, [orderId]: orderSet };
    });
  };

  const handleUpdateCourier = (orderId: string, field: "courier" | "trackingNumber", value: string) => {
    setCourierData(prev => ({
      ...prev,
      [orderId]: {
        courier: field === "courier" ? value : prev[orderId]?.courier || "Coordinadora Mercantil",
        trackingNumber: field === "trackingNumber" ? value : prev[orderId]?.trackingNumber || "",
      },
    }));
  };

  // Filter orders
  const filteredOrders = fulfillmentOrders.filter(order => {
    if (methodFilter !== "TODOS") {
      const currentCourier = courierData[order.id]?.courier || "";
      if (methodFilter === "transportadora" && !currentCourier.toLowerCase().includes("coordinadora") && !currentCourier.toLowerCase().includes("servientrega")) {
        return false;
      }
      if (methodFilter === "domicilio" && !currentCourier.toLowerCase().includes("mensajería") && !currentCourier.toLowerCase().includes("moto")) {
        return false;
      }
      if (methodFilter === "retiro" && order.channel !== "presencial") {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = order.id.toLowerCase().includes(q);
      const matchCust = order.customerName.toLowerCase().includes(q);
      const matchItems = order.items.some(i => i.name.toLowerCase().includes(q));
      if (!matchId && !matchCust && !matchItems) return false;
    }
    return true;
  });

  // ==========================================================================
  // KITCHEN KDS FALLBACK (Only for food/restaurant businesses)
  // ==========================================================================
  if (isFood) {
    const prepOrders = orders.filter(o => o.status === "EN_PREPARACION" || o.status === "CONFIRMADO");
    return (
      <div className="space-y-6 animate-fade-in p-2">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#18181B] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF3F1A]/10 text-[#FF3F1A] flex items-center justify-center font-bold">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Pantalla KDS de Cocina</h2>
              <p className="text-xs text-zinc-500">Monitoreo de comandas en preparación y tiempos de horneado.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => onNavigateOpTab?.("en-vivo")} className="text-xs">
            <ArrowLeft className="w-4 h-4 mr-1 text-[#FF3F1A]" /> Volver a Pedidos
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {prepOrders.map(order => (
            <Card key={order.id} className="p-4 space-y-3 cursor-pointer" onClick={() => setSelectedOrderId(order.id)}>
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <div>
                  <span className="text-xs font-mono font-bold text-[#190088] dark:text-[#97D6DF]">{order.id}</span>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{order.customerName}</h4>
                </div>
                <span className="font-mono text-xs font-bold text-zinc-500">{order.elapsedMinutes}m / {order.estimatedMinutes}m</span>
              </div>
              <div className="space-y-1">
                {order.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-xs py-1 border-b border-zinc-50 dark:border-zinc-900">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">×{it.quantity} {it.name}</span>
                    <span className="text-zinc-400">{it.option || ""}</span>
                  </div>
                ))}
              </div>
              <Button
                variant="primary"
                onClick={e => {
                  e.stopPropagation();
                  markOrderReady(order.id);
                }}
                className="w-full text-xs font-bold bg-[#190088] hover:bg-[#14006e] text-white"
              >
                Marcar Listo para Entrega
              </Button>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // UNIVERSAL FULFILLMENT & SHIPPING CENTER (Retail, Hardware, Fashion, etc.)
  // ==========================================================================
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast feedback */}
      {actionToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#190088] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold border border-white/20 animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-[#97D6DF]" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-white via-zinc-50 to-white dark:from-[#18181B] dark:via-[#202024] dark:to-[#18181B] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#190088]/10 dark:bg-[#190088]/25 text-[#190088] dark:text-[#97D6DF] flex items-center justify-center font-bold shadow-inner">
            <Truck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">
                Mesa de Alistamiento & Despacho Logístico
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] border border-[#190088]/20">
                Fulfillment ERP
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Control de picking en bodega, empaque seguro de mercancía, asignación de transportadora y remisiones de salida.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => onNavigateOpTab?.("en-vivo")}
            className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1 text-[#FF3F1A]" />
            <span>Volver a Órdenes</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => showToast("Planilla de despachos consolidada lista para exportar o imprimir.")}
            className="text-xs font-bold bg-[#FF3F1A] hover:bg-[#e63314] text-white shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            <span>Imprimir Planilla</span>
          </Button>
        </div>
      </div>

      {/* 4 KPI Fulfillment Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Por Alistar */}
        <Card className="p-4 border-l-4 border-l-amber-500 bg-white dark:bg-[#18181B]">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider">
            <span>Por Alistar (En Cola)</span>
            <Boxes className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black font-mono text-zinc-900 dark:text-zinc-100">
              {porAlistarCount}
            </span>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
              Confirmadas
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Órdenes con stock reservado listas para picking</p>
        </Card>

        {/* KPI 2: En Empaque */}
        <Card className="p-4 border-l-4 border-l-[#FF3F1A] bg-white dark:bg-[#18181B]">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider">
            <span>En Alistamiento & Empaque</span>
            <Package className="w-4 h-4 text-[#FF3F1A]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black font-mono text-[#FF3F1A]">
              {enAlistamientoCount}
            </span>
            <span className="text-[11px] font-bold text-[#FF3F1A] bg-[#FF3F1A]/10 px-2 py-0.5 rounded-full">
              En mesa de trabajo
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Mercancía siendo embalada y verificada</p>
        </Card>

        {/* KPI 3: Listos para Despacho */}
        <Card className="p-4 border-l-4 border-l-[#190088] dark:border-l-[#97D6DF] bg-white dark:bg-[#18181B]">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider">
            <span>Listos para Despacho</span>
            <Truck className="w-4 h-4 text-[#190088] dark:text-[#97D6DF]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black font-mono text-[#190088] dark:text-[#97D6DF]">
              {listosDespachoCount}
            </span>
            <span className="text-[11px] font-bold text-[#190088] dark:text-[#97D6DF] bg-[#190088]/10 dark:bg-[#97D6DF]/20 px-2 py-0.5 rounded-full">
              Esperando recolecta
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Paquetes sellados con guía lista</p>
        </Card>

        {/* KPI 4: Despachados Hoy */}
        <Card className="p-4 border-l-4 border-l-emerald-500 bg-white dark:bg-[#18181B]">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider">
            <span>Despachados / Entregados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {despachadosHoyCount}
            </span>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Completados hoy
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Salidas registradas en Kardex de inventario</p>
        </Card>
      </div>

      {/* Toolbar: Filters & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#18181B] p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por orden, cliente o producto..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-[#FF3F1A]"
            />
          </div>

          {/* Delivery Method Filter */}
          <div className="flex items-center gap-1.5">
            {[
              { id: "TODOS", label: "Todos los Despachos" },
              { id: "transportadora", label: "Transportadora Nacional" },
              { id: "domicilio", label: "Mensajería / Domicilio" },
              { id: "retiro", label: "Retiro en Mostrador" },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethodFilter(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  methodFilter === m.id
                    ? "bg-[#190088] text-white shadow-2xs"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Toggle */}
        <SegmentedControl
          intent="fulfillment.view"
          tone="contrast"
          value={viewMode}
          onValueChange={v => setViewMode(v as any)}
          options={[
            { value: "cards", label: "Mesa de Empaque (Tarjetas)" },
            { value: "table", label: "Planilla Logística (Tabla)" },
          ]}
        />
      </div>

      {/* Main Content Area */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
            <Package className="w-6 h-6 stroke-[1.5]" />
          </div>
          <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
            No hay órdenes pendientes de alistamiento con los filtros seleccionados
          </h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Todas las órdenes confirmadas han sido empacadas o no coinciden con la búsqueda actual.
          </p>
        </div>
      ) : viewMode === "cards" ? (
        /* Card View: Fulfillment Workbench */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredOrders.map(order => {
            const currentChecks = checkedItems[order.id] || new Set();
            const isAllChecked = order.items.length > 0 && currentChecks.size === order.items.length;
            const currentCourierInfo = courierData[order.id] || {
              courier: order.channel === "presencial" ? "Retiro en Tienda" : "Coordinadora Mercantil",
              trackingNumber: `GUIA-${order.id.replace("PED-", "")}`,
            };

            return (
              <Card
                key={order.id}
                className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
              >
                {/* Card Header */}
                <CardHeader className="p-4 pb-3 border-b border-zinc-100 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] border border-[#190088]/20">
                        {order.id}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        {order.channel.toUpperCase()}
                      </span>
                    </div>
                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        order.status === "EN_PREPARACION"
                          ? "bg-[#FF3F1A]/10 text-[#FF3F1A] border-[#FF3F1A]/30"
                          : order.status === "LISTO"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {order.status === "EN_PREPARACION"
                        ? "En Empaque"
                        : order.status === "LISTO"
                        ? "Listo p/ Despacho"
                        : "Por Alistar"}
                    </span>
                  </div>

                  {/* Customer Info & Destination */}
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate flex items-center justify-between">
                      <span>{order.customerName}</span>
                      <span className="font-mono text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                        ${order.total.toLocaleString("es-CO")} COP
                      </span>
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      <MapPin className="w-3.5 h-3.5 flex-none text-zinc-400" />
                      <span className="truncate">
                        {order.customerAddress || (order.channel === "presencial" ? "Retiro en mostrador bodega" : "Dirección acordada por WhatsApp")}
                      </span>
                    </div>
                    {order.customerPhone && (
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                        <Phone className="w-3 h-3 flex-none" />
                        <span>{order.customerPhone}</span>
                      </div>
                    )}
                  </div>
                </CardHeader>

                {/* Card Body: Picking Checklist with ERP Stock */}
                <CardBody className="p-4 space-y-3 flex-1">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    <span>Lista de Picking en Bodega</span>
                    <span className="font-mono text-[#190088] dark:text-[#97D6DF]">
                      {currentChecks.size}/{order.items.length} empacados
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    {order.items.map((it, idx) => {
                      const isChecked = currentChecks.has(idx);
                      // Look up live inventory stock for realism
                      const invItem = inventoryService.findProductMatch(it.name, it.productId);
                      const availableStock = invItem ? invItem.stock - invItem.reservado : 18;

                      return (
                        <div
                          key={idx}
                          onClick={() => toggleItemCheck(order.id, idx)}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer select-none ${
                            isChecked
                              ? "bg-emerald-500/10 border-emerald-500/30 text-zinc-900 dark:text-zinc-100"
                              : "bg-zinc-50 dark:bg-zinc-900/70 border-zinc-200/80 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                            {/* Checkbox box */}
                            <span
                              className={`w-4 h-4 rounded-md border flex items-center justify-center flex-none transition-all ${
                                isChecked
                                  ? "bg-emerald-600 border-emerald-600 text-white"
                                  : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </span>

                            <span className="font-mono font-extrabold text-xs text-[#190088] dark:text-[#97D6DF] flex-none">
                              ×{it.quantity}
                            </span>

                            <div className="truncate space-y-0.5">
                              <p className={`text-xs font-semibold truncate ${isChecked ? "line-through opacity-60" : ""}`}>
                                {it.name}
                              </p>
                              <p className="text-[10px] text-zinc-400 font-mono">
                                SKU: {it.productId} | Stock Bodega: {availableStock} disp.
                              </p>
                            </div>
                          </div>

                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md flex-none ml-2 ${
                              isChecked
                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                : "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500"
                            }`}
                          >
                            {isChecked ? "Alistado" : "Pendiente"}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Courier & Tracking Assignment Section */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2 bg-zinc-50/60 dark:bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-[#FF3F1A]" /> Datos de Despacho
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-zinc-400 font-semibold block mb-0.5">Transportadora:</label>
                        <select
                          value={currentCourierInfo.courier}
                          onChange={e => handleUpdateCourier(order.id, "courier", e.target.value)}
                          className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none"
                        >
                          <option value="Coordinadora Mercantil">Coordinadora Mercantil</option>
                          <option value="Servientrega Express">Servientrega Express</option>
                          <option value="Envía Colvanes">Envía Colvanes</option>
                          <option value="Interrapidísimo">Interrapidísimo</option>
                          <option value="Mensajería Propia (Moto)">Mensajería Propia</option>
                          <option value="Retiro en Tienda">Retiro en Mostrador</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-zinc-400 font-semibold block mb-0.5">No. Guía / Remisión:</label>
                        <input
                          type="text"
                          value={currentCourierInfo.trackingNumber}
                          onChange={e => handleUpdateCourier(order.id, "trackingNumber", e.target.value)}
                          placeholder="Ej: GUIA-9841"
                          className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-[11px] font-mono font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none"
                        />
                      </div>
                    </div>

                    {order.notes && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic bg-white dark:bg-zinc-800/80 p-1.5 rounded border border-zinc-100 dark:border-zinc-800 truncate">
                        <strong>Nota:</strong> {order.notes}
                      </p>
                    )}
                  </div>
                </CardBody>

                {/* Card Footer: Action Buttons */}
                <CardFooter className="p-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShippingLabelOrder(order)}
                    className="py-1.5 px-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                    title="Imprimir Rótulo de Envío con código de barras"
                  >
                    <Barcode className="w-3.5 h-3.5 mr-1 text-[#190088] dark:text-[#97D6DF]" />
                    <span>Rótulo</span>
                  </Button>

                  {/* Progression Button */}
                  {order.status === "CONFIRMADO" && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        transitionOrder(order.id, "EN_PREPARACION", "Mesa de Alistamiento", "Iniciando empaque de mercancía.");
                        showToast(`Orden ${order.id} pasada a proceso de alistamiento y empaque.`);
                      }}
                      className="flex-1 py-1.5 px-3 text-xs font-bold border-[#190088]/30 text-[#190088] dark:text-[#97D6DF] hover:bg-[#190088]/10"
                    >
                      <Boxes className="w-3.5 h-3.5 mr-1" />
                      <span>Iniciar Alistamiento</span>
                    </Button>
                  )}

                  {order.status === "EN_PREPARACION" && (
                    <Button
                      variant="primary"
                      onClick={() => {
                        markOrderReady(order.id);
                        showToast(`Orden ${order.id} empaquetada y lista para despacho.`);
                      }}
                      className="flex-1 py-1.5 px-3 text-xs font-bold bg-[#190088] hover:bg-[#14006e] text-white shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#97D6DF]" />
                      <span>Marcar Empacado & Listo</span>
                    </Button>
                  )}

                  {order.status === "LISTO" && (
                    <Button
                      variant="primary"
                      onClick={() => {
                        deliverOrder(order.id);
                        showToast(`Orden ${order.id} entregada / despachada con éxito a transportadora.`);
                      }}
                      className="flex-1 py-1.5 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    >
                      <Truck className="w-3.5 h-3.5 mr-1 text-white" />
                      <span>Confirmar Despacho</span>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View: Logistical Dispatch Planilla */
        <Card className="bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 text-xs font-bold uppercase">
              <TableRow>
                <TableCell className="py-3 px-4">Orden</TableCell>
                <TableCell className="py-3 px-4">Cliente</TableCell>
                <TableCell className="py-3 px-4">Destino</TableCell>
                <TableCell className="py-3 px-4">Transportadora & Guía</TableCell>
                <TableCell className="py-3 px-4">Items / SKUs</TableCell>
                <TableCell className="py-3 px-4">Total</TableCell>
                <TableCell className="py-3 px-4">Estado</TableCell>
                <TableCell className="py-3 px-4 text-right">Acciones</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {filteredOrders.map(order => {
                const info = courierData[order.id] || {
                  courier: order.channel === "presencial" ? "Retiro en Tienda" : "Coordinadora Mercantil",
                  trackingNumber: `GUIA-${order.id.replace("PED-", "")}`,
                };

                return (
                  <TableRow key={order.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                    <TableCell className="py-3.5 px-4 font-mono font-bold text-[#190088] dark:text-[#97D6DF]">
                      {order.id}
                      <span className="block text-[10px] text-zinc-400 font-normal">{order.createdAt}</span>
                    </TableCell>
                    <TableCell className="py-3.5 px-4">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{order.customerName}</p>
                      <p className="text-[11px] text-zinc-400">{order.customerPhone}</p>
                    </TableCell>
                    <TableCell className="py-3.5 px-4 max-w-xs truncate text-zinc-600 dark:text-zinc-300">
                      {order.customerAddress || "Retiro en mostrador bodega"}
                    </TableCell>
                    <TableCell className="py-3.5 px-4">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 block">{info.courier}</span>
                      <span className="font-mono text-[11px] text-zinc-400">{info.trackingNumber}</span>
                    </TableCell>
                    <TableCell className="py-3.5 px-4">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {order.items.reduce((s, i) => s + i.quantity, 0)} unidades
                      </span>
                      <span className="block text-[11px] text-zinc-400 truncate max-w-[200px]">
                        {order.items.map(i => i.name).join(", ")}
                      </span>
                    </TableCell>
                    <TableCell className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      ${order.total.toLocaleString("es-CO")}
                    </TableCell>
                    <TableCell className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          order.status === "EN_PREPARACION"
                            ? "bg-[#FF3F1A]/10 text-[#FF3F1A] border-[#FF3F1A]/30"
                            : order.status === "LISTO"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {order.status === "EN_PREPARACION"
                          ? "En Empaque"
                          : order.status === "LISTO"
                          ? "Listo p/ Despacho"
                          : "Por Alistar"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-right space-x-1.5">
                      <Button
                        variant="outline"
                        onClick={() => setShippingLabelOrder(order)}
                        className="p-1.5 text-xs"
                        title="Imprimir Rótulo de Envío"
                      >
                        <Barcode className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
                      </Button>
                      {order.status === "CONFIRMADO" && (
                        <Button
                          variant="outline"
                          onClick={() => transitionOrder(order.id, "EN_PREPARACION", "Mesa de Alistamiento")}
                          className="py-1 px-2.5 text-xs font-bold"
                        >
                          Alistar
                        </Button>
                      )}
                      {order.status === "EN_PREPARACION" && (
                        <Button
                          variant="primary"
                          onClick={() => markOrderReady(order.id)}
                          className="py-1 px-2.5 text-xs font-bold bg-[#190088] text-white"
                        >
                          Listo
                        </Button>
                      )}
                      {order.status === "LISTO" && (
                        <Button
                          variant="primary"
                          onClick={() => deliverOrder(order.id)}
                          className="py-1 px-2.5 text-xs font-bold bg-emerald-600 text-white"
                        >
                          Despachar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Shipping Label Modal (Rótulo de Envío) */}
      {shippingLabelOrder && (
        <Modal
          isOpen={Boolean(shippingLabelOrder)}
          onClose={() => setShippingLabelOrder(null)}
          className="max-w-md p-6 bg-white dark:bg-[#18181B] rounded-2xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="space-y-4">
            {/* Label Header */}
            <div className="border-b-2 border-dashed border-zinc-300 dark:border-zinc-700 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF3F1A]">Rótulo de Despacho</span>
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">
                  {activeBusiness?.name || "StockFlow Logistics"}
                </h3>
                <p className="text-[10px] text-zinc-400">NIT 901.458.209-1 | {activeBusiness?.city || "Medellín, Colombia"}</p>
              </div>
              <div className="text-right">
                <span className="font-mono font-black text-sm text-[#190088] dark:text-[#97D6DF] block">
                  {shippingLabelOrder.id}
                </span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase">
                  {courierData[shippingLabelOrder.id]?.courier || "Coordinadora"}
                </span>
              </div>
            </div>

            {/* Destination Box */}
            <div className="bg-zinc-50 dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Destinatario:</span>
              <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{shippingLabelOrder.customerName}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                {shippingLabelOrder.customerAddress || "Retiro en mostrador"}
              </p>
              <p className="text-xs font-mono text-zinc-500">Tel: {shippingLabelOrder.customerPhone || "+57 300 000-0000"}</p>
            </div>

            {/* Barcode Simulator */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-center space-y-1.5 bg-white dark:bg-zinc-950">
              <div className="h-12 w-full flex items-center justify-center gap-1">
                {[4, 2, 6, 1, 3, 5, 2, 8, 3, 2, 5, 1, 4, 7, 2, 3, 6, 1, 4, 3, 2, 6].map((w, i) => (
                  <div key={i} className="bg-zinc-900 dark:bg-zinc-100 h-full" style={{ width: `${w * 2}px` }} />
                ))}
              </div>
              <p className="font-mono text-xs font-bold tracking-widest text-zinc-600 dark:text-zinc-400">
                {courierData[shippingLabelOrder.id]?.trackingNumber || `GUIA-${shippingLabelOrder.id}`}
              </p>
            </div>

            {/* Contents summary */}
            <div className="text-xs border-t border-zinc-100 dark:border-zinc-800 pt-2 text-zinc-500 space-y-1">
              <p className="font-bold text-zinc-700 dark:text-zinc-300">Contenido del paquete:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                {shippingLabelOrder.items.map((i, idx) => (
                  <li key={idx}>
                    {i.quantity}× {i.name}
                  </li>
                ))}
              </ul>
            </div>

            {/* Print button */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShippingLabelOrder(null)}
                className="flex-1 text-xs"
              >
                Cerrar
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  window.print();
                }}
                className="flex-1 text-xs font-bold bg-[#FF3F1A] hover:bg-[#e63314] text-white"
              >
                <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir Etiqueta
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
