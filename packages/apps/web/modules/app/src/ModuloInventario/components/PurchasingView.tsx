import React, { useState, useMemo } from "react";
import {
  Truck,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Phone,
  Mail,
  User,
  ArrowDownLeft,
  Search,
  FileText,
  Boxes,
  MapPin,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShoppingCart,
} from "lucide-react";
import {
  PurchaseOrder,
  Supplier,
  StockLocation,
  InventoryProduct,
} from "../types/inventory.types";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  Badge,
  Button,
} from "../../elements";

interface PurchasingViewProps {
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  locations: StockLocation[];
  products: InventoryProduct[];
  onReceiveOrder: (orderId: string) => Promise<any>;
  onOpenNewPurchaseOrder?: (initialProduct?: InventoryProduct | null, initialSuggestedQty?: number) => void;
  onOpenNewSupplier?: () => void;
}

export const PurchasingView: React.FC<PurchasingViewProps> = ({
  purchaseOrders,
  suppliers,
  locations,
  products,
  onReceiveOrder,
  onOpenNewPurchaseOrder,
  onOpenNewSupplier,
}) => {
  const [activeTab, setActiveTab] = useState<"orders" | "reorder" | "suppliers">("orders");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "received">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // ── Sugeridos de Reabastecimiento (Punto de Reorden / Stock de Seguridad) ──
  const reorderItems = useMemo(() => {
    return products
      .filter(
        (p) =>
          p.productType !== "service" &&
          (p.stockActual !== undefined ? p.stockActual : 0) <= (p.stockMinimo !== undefined ? p.stockMinimo : 0)
      )
      .map((p) => {
        const stockActual = Math.max(0, p.stockActual || 0);
        const stockMinimo = p.stockMinimo || 0;
        const deficit = Math.max(1, stockMinimo - stockActual);
        const suggestedQty = Math.max(deficit, (stockMinimo * 2) - stockActual || 10);
        const estimatedCost = suggestedQty * (p.costPrice || 0);
        const isOutOfStock = stockActual <= 0;
        return {
          ...p,
          stockActual,
          stockMinimo,
          deficit,
          suggestedQty,
          estimatedCost,
          isOutOfStock,
        };
      })
      .sort((a, b) => {
        if (a.isOutOfStock && !b.isOutOfStock) return -1;
        if (!a.isOutOfStock && b.isOutOfStock) return 1;
        return a.stockActual - b.stockActual;
      });
  }, [products]);

  const totalEstimatedReorderInvestment = useMemo(() => {
    return reorderItems.reduce((acc, it) => acc + it.estimatedCost, 0);
  }, [reorderItems]);

  const filteredOrders = purchaseOrders.filter((po) => {
    if (statusFilter !== "all" && po.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = po.orderNumber.toLowerCase().includes(q);
      const matchSup = po.supplierName.toLowerCase().includes(q);
      const matchLoc = po.targetLocationName.toLowerCase().includes(q);
      const matchNotes = (po.notes || "").toLowerCase().includes(q);
      return matchNum || matchSup || matchLoc || matchNotes;
    }
    return true;
  });

  const handleReceive = async (orderId: string) => {
    try {
      setReceivingId(orderId);
      await onReceiveOrder(orderId);
    } catch (err: any) {
      alert(err?.message || "Error al recibir la orden de compra");
    } finally {
      setReceivingId(null);
    }
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "—";
    try {
      return new Date(isoStr).toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  const pendingOrders = purchaseOrders.filter((po) => po.status === "pending").length;
  const receivedOrders = purchaseOrders.filter((po) => po.status === "received").length;
  const totalPurchasesValue = purchaseOrders.reduce(
    (acc, po) => acc + Number(po.totalAmount ?? (po as any).total ?? 0),
    0
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── 1. Minimalist Purchasing Overview Strip ── */}
      <div className="rounded-2xl p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-theme-xs flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 sm:gap-6 divide-x divide-gray-200 dark:divide-gray-800 text-xs overflow-x-auto py-0.5">
          <div className="flex items-baseline gap-2 flex-none">
            <span className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Total Facturado:</span>
            <span className="font-mono font-bold text-sm text-gray-800 dark:text-white">
              ${(totalPurchasesValue || 0).toLocaleString("es-CO")}
            </span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-baseline gap-2 flex-none">
            <span className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Pendientes Recepción:</span>
            <span className="font-mono font-bold text-sm text-warning-600 dark:text-warning-400">
              {pendingOrders}
            </span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-baseline gap-2 flex-none">
            <span className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Recibidas en Bodega:</span>
            <span className="font-mono font-bold text-sm text-success-600 dark:text-success-400">
              {receivedOrders}
            </span>
          </div>

          <div className="pl-4 sm:pl-6 flex items-baseline gap-2 flex-none">
            <span className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Proveedores Activos:</span>
            <span className="font-mono font-bold text-xs text-gray-700 dark:text-gray-300">
              {suppliers.length}
            </span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 flex-none ml-auto">
          {onOpenNewPurchaseOrder && (
            <Button
              size="sm"
              variant="primary"
              startIcon={<Plus className="size-4" />}
              onClick={() => onOpenNewPurchaseOrder()}
            >
              Nueva Factura de Compra
            </Button>
          )}

          {onOpenNewSupplier && (
            <Button
              size="sm"
              variant="outline"
              startIcon={<Building2 className="size-4 text-brand-500" />}
              onClick={onOpenNewSupplier}
            >
              Nuevo Proveedor
            </Button>
          )}
        </div>
      </div>

      {/* ── 2. View Mode Pills & Search / Filters Toolbar ── */}
      <div className="rounded-2xl p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-theme-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Main Tabs (Órdenes vs Sugeridos vs Proveedores) */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit flex-none">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "orders"
                ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-theme-xs font-semibold"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Boxes className="size-3.5" />
            <span>Facturas & Órdenes</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                activeTab === "orders"
                  ? "bg-brand-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              }`}
            >
              {purchaseOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reorder")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "reorder"
                ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-theme-xs font-semibold"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <AlertTriangle className={`size-3.5 ${reorderItems.length > 0 ? "text-warning-500" : ""}`} />
            <span>Sugeridos de Reorden</span>
            {reorderItems.length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400">
                {reorderItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("suppliers")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "suppliers"
                ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-theme-xs font-semibold"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Building2 className="size-3.5" />
            <span>Proveedores</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                activeTab === "suppliers"
                  ? "bg-brand-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              }`}
            >
              {suppliers.length}
            </span>
          </button>
        </div>

        {/* Filters and Search when viewing orders */}
        {activeTab === "orders" && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="size-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar factura, proveedor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-hidden focus:border-brand-500 text-gray-800 dark:text-white transition-colors"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-brand-500 text-white font-semibold"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("pending")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === "pending"
                    ? "bg-warning-500 text-white font-semibold"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Pendientes ({pendingOrders})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("received")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === "received"
                    ? "bg-success-500 text-white font-semibold"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Recibidas ({receivedOrders})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Tab 1: Purchase Orders Table ── */}
      {activeTab === "orders" && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader>Orden / Factura</TableCell>
                <TableCell isHeader>Fecha Emisión</TableCell>
                <TableCell isHeader>Proveedor</TableCell>
                <TableCell isHeader>Bodega Destino</TableCell>
                <TableCell isHeader className="text-center">Ítems</TableCell>
                <TableCell isHeader className="text-right">Total Factura</TableCell>
                <TableCell isHeader className="text-center">Estado Recepción</TableCell>
                <TableCell isHeader className="text-right">Acciones de Stock</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-gray-500">
                    <Truck className="size-8 mx-auto text-gray-400 mb-2" />
                    <p className="font-semibold text-gray-700 dark:text-gray-300">
                      No hay facturas u órdenes de compra registradas
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Crea una con "+ Nueva Factura de Compra" para ingresar mercadería y costo al inventario.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((po) => {
                  const isExpanded = expandedOrderId === po.id;
                  const totalQty = po.items.reduce((acc, it) => acc + it.quantity, 0);

                  return (
                    <React.Fragment key={po.id}>
                      <TableRow className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                        <TableCell className="font-mono font-semibold text-gray-800 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span>{po.orderNumber}</span>
                            {po.notes && (
                              <span className="text-[11px] font-sans font-normal text-gray-400 truncate max-w-[120px]" title={po.notes}>
                                ({po.notes})
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                          {formatDate(po.issueDate)}
                        </TableCell>

                        <TableCell className="font-medium text-gray-800 dark:text-white">
                          {po.supplierName}
                        </TableCell>

                        <TableCell>
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-gray-600 dark:text-gray-400">
                            <MapPin className="size-3 text-brand-500 flex-none" />
                            <span>{po.targetLocationName}</span>
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedOrderId(isExpanded ? null : po.id)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                          >
                            <span>{po.items.length} ítems ({totalQty} u.)</span>
                            {isExpanded ? (
                              <ChevronUp className="size-3" />
                            ) : (
                              <ChevronDown className="size-3" />
                            )}
                          </button>
                        </TableCell>

                        <TableCell className="text-right font-mono font-bold text-gray-800 dark:text-white">
                          ${Number(po.totalAmount ?? (po as any).total ?? (po.items?.reduce((s, it) => s + ((it.quantity || 0) * (it.unitPrice || 0)), 0)) ?? 0).toLocaleString("es-CO")}
                        </TableCell>

                        <TableCell className="text-center">
                          {po.status === "received" ? (
                            <Badge variant="light" color="success" size="sm">
                              <CheckCircle2 className="size-3 mr-1 inline" />
                              Ingresada a Stock
                            </Badge>
                          ) : (
                            <Badge variant="light" color="warning" size="sm">
                              <Clock className="size-3 mr-1 inline" />
                              Pendiente
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right whitespace-nowrap">
                          {po.status === "pending" ? (
                            <Button
                              size="sm"
                              variant="primary"
                              startIcon={<ArrowDownLeft className="size-3.5" />}
                              onClick={() => handleReceive(po.id)}
                              disabled={receivingId === po.id}
                              className="bg-success-600 hover:bg-success-700 text-white ml-auto"
                            >
                              {receivingId === po.id ? "Ingresando..." : "Recibir en Almacén"}
                            </Button>
                          ) : (
                            <span className="text-xs font-mono text-gray-400">
                              Recibida {formatDate(po.receivedDate)}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Renglones Expandibles */}
                      {isExpanded && (
                        <TableRow className="bg-gray-50/50 dark:bg-gray-800/30">
                          <TableCell colSpan={8} className="p-4">
                            <div className="space-y-2">
                              <span className="text-xs uppercase font-semibold text-gray-500 tracking-wider block">
                                Detalle de Renglones Facturados ({po.items.length})
                              </span>
                              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
                                {po.items.map((it, idx) => (
                                  <div
                                    key={idx}
                                    className="px-4 py-2 flex items-center justify-between text-xs"
                                  >
                                    <div>
                                      <span className="font-semibold text-gray-800 dark:text-white">
                                        {it.productName}
                                      </span>
                                      <span className="font-mono text-xs text-gray-400 ml-2">
                                        SKU: {it.productSku}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4 font-mono">
                                      <span className="text-gray-500">
                                        {it.quantity} {it.unit || "UND"} × ${(it.unitPrice || 0).toLocaleString("es-CO")}
                                      </span>
                                      <span className="font-semibold text-gray-800 dark:text-white">
                                        ${((it.quantity || 0) * (it.unitPrice || 0)).toLocaleString("es-CO")}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── 4. Tab 2: Sugeridos de Reabastecimiento ── */}
      {activeTab === "reorder" && (
        <div className="space-y-4">
          <div className="rounded-2xl p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-theme-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="light" color="warning" size="sm">
                  <AlertTriangle className="size-3 mr-1 inline" />
                  {reorderItems.length} referencias bajo stock mínimo
                </Badge>
                <span className="text-xs text-gray-400">• Sugerencia ROP</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Referencias que alcanzaron su punto de pedido de seguridad para evitar quiebres de inventario.
              </p>
            </div>

            <div className="flex items-baseline gap-2 bg-gray-50 dark:bg-gray-800 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Inversión Estimada:</span>
              <span className="text-base font-mono font-bold text-brand-500">
                ${totalEstimatedReorderInvestment.toLocaleString("es-CO")}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell isHeader>Producto & SKU</TableCell>
                  <TableCell isHeader>Bodega</TableCell>
                  <TableCell isHeader className="text-center">Stock Actual</TableCell>
                  <TableCell isHeader className="text-center">Stock Mínimo</TableCell>
                  <TableCell isHeader className="text-center">Sugerido Pedir</TableCell>
                  <TableCell isHeader className="text-right">Costo Estimado</TableCell>
                  <TableCell isHeader>Proveedor Habitual</TableCell>
                  <TableCell isHeader className="text-right">Acción Rápida</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reorderItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-gray-500">
                      <CheckCircle2 className="size-8 mx-auto mb-2 text-success-500" />
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        ¡Inventario en niveles óptimos!
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Ningún producto se encuentra por debajo de su stock mínimo de seguridad.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  reorderItems.map((item) => (
                    <TableRow
                      key={item.id}
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    >
                      <TableCell>
                        <div>
                          <span className="font-semibold text-gray-800 dark:text-white block">
                            {item.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-xs text-gray-400">{item.sku}</span>
                            <span className="text-gray-300 dark:text-gray-700">•</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                              {item.category || "General"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-gray-600 dark:text-gray-400">
                        <span className="truncate max-w-[130px] block">
                          {item.locationName || "Sede Principal"}
                        </span>
                      </TableCell>

                      <TableCell className="text-center font-mono">
                        <Badge
                          variant="light"
                          color={item.isOutOfStock ? "error" : "warning"}
                          size="sm"
                        >
                          {item.stockActual} {item.unit}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center font-mono text-gray-500 font-semibold">
                        {item.stockMinimo} {item.unit}
                      </TableCell>

                      <TableCell className="text-center font-mono">
                        <span className="font-bold text-sm text-brand-500">
                          +{item.suggestedQty} {item.unit}
                        </span>
                      </TableCell>

                      <TableCell className="text-right font-mono font-semibold text-gray-800 dark:text-white">
                        ${item.estimatedCost.toLocaleString("es-CO")}
                      </TableCell>

                      <TableCell className="text-gray-600 dark:text-gray-400 text-xs">
                        {item.supplier || "Sin proveedor asignado"}
                      </TableCell>

                      <TableCell className="text-right">
                        {onOpenNewPurchaseOrder && (
                          <Button
                            size="sm"
                            variant="primary"
                            startIcon={<ShoppingCart className="size-3.5" />}
                            onClick={() => onOpenNewPurchaseOrder(item, item.suggestedQty)}
                            className="ml-auto"
                            title="Crear orden de compra prellenada para este ítem"
                          >
                            Pedir a Proveedor
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── 5. Tab 3: Suppliers Directory Table ── */}
      {activeTab === "suppliers" && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader>Proveedor / Razón Social</TableCell>
                <TableCell isHeader>NIT / RUT</TableCell>
                <TableCell isHeader>Contacto Directo</TableCell>
                <TableCell isHeader>Correo Electrónico</TableCell>
                <TableCell isHeader>Teléfono</TableCell>
                <TableCell isHeader className="text-center">Plazo Entrega</TableCell>
                <TableCell isHeader className="text-right">Acción</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((sup) => (
                <TableRow
                  key={sup.id}
                  className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-500 flex items-center justify-center flex-none">
                        <Building2 className="size-4" />
                      </div>
                      <span className="font-semibold text-gray-800 dark:text-white">
                        {sup.name}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="font-mono font-semibold text-gray-600 dark:text-gray-400">
                    {sup.taxId}
                  </TableCell>

                  <TableCell className="text-gray-700 dark:text-gray-300 font-medium">
                    {sup.contactPerson}
                  </TableCell>

                  <TableCell className="font-mono text-xs text-gray-500 dark:text-gray-400">
                    {sup.email}
                  </TableCell>

                  <TableCell className="font-mono text-xs text-gray-500 dark:text-gray-400">
                    {sup.phone}
                  </TableCell>

                  <TableCell className="text-center font-mono font-semibold text-gray-700 dark:text-gray-300">
                    {sup.leadTimeDays} días
                  </TableCell>

                  <TableCell className="text-right">
                    {onOpenNewPurchaseOrder && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenNewPurchaseOrder(null)}
                        className="text-brand-500 border-brand-200 dark:border-brand-500/30 hover:bg-brand-50 dark:hover:bg-brand-500/10 ml-auto"
                      >
                        + Facturar Compra
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

