import React, { createContext, useContext, useState, useEffect } from "react";
import {
  Pedido,
  ProductItem,
  AutomationRule,
  RecurrenceConfig,
  ShiftInfo,
  Incidencia,
  ResumenKPIs,
  OrderStatus,
  OrderItem,
  StorePaceMode,
  UrgencyLevel,
} from "../types";
import {
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_AUTOMATIONS,
  INITIAL_RECURRENCES,
  INITIAL_SHIFT_INFO,
  INITIAL_INCIDENCIAS,
  INITIAL_KPIS,
  INITIAL_PROGRAMADOS,
} from "../mockData";
import { playNewOrderSound, playSuccessSound, playUrgentAlertSound } from "../utils/soundEffects";

interface PedidosContextType {
  orders: Pedido[];
  programados: Pedido[];
  products: ProductItem[];
  automations: AutomationRule[];
  recurrences: RecurrenceConfig[];
  shiftInfo: ShiftInfo;
  incidencias: Incidencia[];
  kpis: ResumenKPIs;
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  isIncidenciasOpen: boolean;
  setIsIncidenciasOpen: (open: boolean) => void;
  aiModalOrder: Pedido | null;
  setAiModalOrder: (order: Pedido | null) => void;
  rejectModalOrder: Pedido | null;
  setRejectModalOrder: (order: Pedido | null) => void;
  cancelModalOrder: Pedido | null;
  setCancelModalOrder: (order: Pedido | null) => void;
  printTicketOrder: Pedido | null;
  setPrintTicketOrder: (order: Pedido | null) => void;
  isSoundEnabled: boolean;
  setIsSoundEnabled: (enabled: boolean) => void;
  toggleSound: () => void;

  // Actions
  transitionOrder: (orderId: string, toStatus: OrderStatus, user?: string, note?: string) => void;
  confirmOrder: (orderId: string) => void;
  rejectOrder: (orderId: string, reason: string) => void;
  cancelOrder: (orderId: string, reason: string) => void;
  sendToKitchen: (orderId: string) => void;
  markOrderReady: (orderId: string) => void;
  deliverOrder: (orderId: string) => void;
  adjustEstimate: (orderId: string, deltaMinutes: number) => void;
  approveAIOrder: (orderId: string, customItems?: OrderItem[]) => void;
  toggleProductAvailability: (productId: string) => void;
  updateProductPrice: (productId: string, newPrice: number) => void;
  updateProduct: (productId: string, updatedFields: Partial<ProductItem>) => void;
  addProduct: (newProduct: Omit<ProductItem, "id">) => void;
  toggleAutomationRule: (ruleId: string) => void;
  toggleRecurrence: (recurrenceId: string) => void;
  storePace: StorePaceMode;
  setStorePace: (mode: StorePaceMode) => void;
  updateStaffStatus: (staffId: string, status: "Activo" | "Descanso" | "Inactivo") => void;
  assignStaffStation: (staffId: string, station: "Horno" | "Armado" | "Empaque" | "Caja") => void;
  switchShift: (shiftName: string) => void;
  resolveIncidencia: (incidenciaId: string) => void;
  addIncidencia: (inc: Omit<Incidencia, "id" | "timestamp" | "isResolved">) => void;
  createManualOrder: (newOrder: Partial<Pedido>) => void;
  injectScheduledOrderToLive: (orderId: string, directToKitchen?: boolean) => void;
}

const PedidosContext = createContext<PedidosContextType | null>(null);

export const PedidosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Pedido[]>(INITIAL_ORDERS);
  const [programados, setProgramados] = useState<Pedido[]>(INITIAL_PROGRAMADOS);
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [automations, setAutomations] = useState<AutomationRule[]>(INITIAL_AUTOMATIONS);
  const [recurrences, setRecurrences] = useState<RecurrenceConfig[]>(INITIAL_RECURRENCES);
  const [shiftInfo, setShiftInfo] = useState<ShiftInfo>(INITIAL_SHIFT_INFO);
  const [storePace, setStorePaceState] = useState<StorePaceMode>("habitual");
  const [incidencias, setIncidencias] = useState<Incidencia[]>(INITIAL_INCIDENCIAS);
  const [kpis, setKpis] = useState<ResumenKPIs>(INITIAL_KPIS);

  const setStorePace = (mode: StorePaceMode) => {
    setStorePaceState(mode);
    const buffer = mode === "demorada" ? 10 : mode === "rapida" ? -5 : 0;

    setShiftInfo(prev => ({
      ...prev,
      suggestedPrepBufferMinutes: Math.max(0, buffer),
    }));

    // Sincronización en tiempo real de tiempos de cocina y semáforo de urgencia con el ritmo de tienda
    setOrders(prevOrders =>
      prevOrders.map(order => {
        if (["FINALIZADO", "CANCELADO", "RECHAZADO"].includes(order.status)) return order;

        // Ajuste reactivo del tiempo estimado según el ritmo seleccionado
        const baseEstimate = order.estimatedMinutes || 25;
        const adjustedEstimate = Math.max(8, baseEstimate + (mode === "demorada" ? 5 : mode === "rapida" ? -5 : 0));
        const elapsed = order.elapsedMinutes || 0;

        let newUrgency: UrgencyLevel = "A_TIEMPO";
        if (elapsed > adjustedEstimate) {
          newUrgency = "RETRASADO";
        } else if (adjustedEstimate - elapsed <= 6) {
          newUrgency = "PROXIMO";
        }

        return {
          ...order,
          estimatedMinutes: adjustedEstimate,
          urgency: newUrgency,
        };
      })
    );
  };

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isIncidenciasOpen, setIsIncidenciasOpen] = useState(false);
  const [aiModalOrder, setAiModalOrder] = useState<Pedido | null>(null);
  const [rejectModalOrder, setRejectModalOrder] = useState<Pedido | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<Pedido | null>(null);
  const [printTicketOrder, setPrintTicketOrder] = useState<Pedido | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  const toggleSound = () => {
    setIsSoundEnabled(prev => {
      const next = !prev;
      if (next) playSuccessSound();
      return next;
    });
  };

  // Recalculate KPIs when orders change
  useEffect(() => {
    const todayOrders = orders;
    const completed = todayOrders.filter(o => o.status === "FINALIZADO").length;
    const inProcess = todayOrders.filter(o => ["CONFIRMADO", "EN_PREPARACION", "LISTO"].includes(o.status)).length;
    const canceled = todayOrders.filter(o => o.status === "CANCELADO").length;
    const rejected = todayOrders.filter(o => o.status === "RECHAZADO").length;
    const totalRev = todayOrders.filter(o => o.status !== "CANCELADO" && o.status !== "RECHAZADO").reduce((sum, o) => sum + o.total, 0);
    const avgTicket = todayOrders.length > 0 ? Math.round(totalRev / (todayOrders.length - canceled - rejected || 1)) : 0;

    setKpis(prev => ({
      ...prev,
      pedidosHoy: todayOrders.length,
      completados: completed,
      enProceso: inProcess,
      cancelados: canceled,
      rechazados: rejected,
      ingresosTotales: totalRev,
      ticketPromedio: avgTicket,
    }));
  }, [orders]);

  const addIncidencia = (inc: Omit<Incidencia, "id" | "timestamp" | "isResolved">) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const newInc: Incidencia = {
      ...inc,
      id: `INC-${String(incidencias.length + 1).padStart(2, "0")}`,
      timestamp: timeStr,
      isResolved: false,
    };
    setIncidencias(prev => [newInc, ...prev]);
  };

  const transitionOrder = (orderId: string, toStatus: OrderStatus, user = "Operador", note?: string) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    setOrders(prev =>
      prev.map(order => {
        if (order.id !== orderId) return order;

        const newEvent = {
          timestamp: timeStr,
          fromStatus: order.status,
          toStatus,
          user,
          note,
        };

        let newTurn = order.turnNumber;
        if (toStatus === "CONFIRMADO" && !order.turnNumber) {
          newTurn = Math.floor(Math.random() * 30) + 1;
        }

        return {
          ...order,
          status: toStatus,
          turnNumber: newTurn,
          history: [...order.history, newEvent],
        };
      })
    );
  };

  const confirmOrder = (orderId: string) => {
    transitionOrder(orderId, "CONFIRMADO", "Operador de Caja", "Pedido aceptado y comanda confirmada.");
  };

  const rejectOrder = (orderId: string, reason: string) => {
    setOrders(prev =>
      prev.map(order => {
        if (order.id !== orderId) return order;
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        return {
          ...order,
          status: "RECHAZADO",
          rejectionReason: reason,
          history: [
            ...order.history,
            {
              timestamp: timeStr,
              fromStatus: order.status,
              toStatus: "RECHAZADO",
              user: "Operador de Caja",
              note: `Rechazado por: ${reason}`,
            },
          ],
        };
      })
    );
  };

  const cancelOrder = (orderId: string, reason: string) => {
    setOrders(prev =>
      prev.map(order => {
        if (order.id !== orderId) return order;
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        return {
          ...order,
          status: "CANCELADO",
          cancellationReason: reason,
          history: [
            ...order.history,
            {
              timestamp: timeStr,
              fromStatus: order.status,
              toStatus: "CANCELADO",
              user: "Supervisor de Turno",
              note: `Cancelado por: ${reason}`,
            },
          ],
        };
      })
    );

    addIncidencia({
      title: `Pedido ${orderId} cancelado`,
      severity: "Alta",
      type: "cancelacion",
      orderId,
      description: `Motivo de cancelación registrado: ${reason}`,
    });
  };

  const sendToKitchen = (orderId: string) => {
    transitionOrder(orderId, "EN_PREPARACION", "Cocinero Jefe (Carlos Rossi)", "Comanda enviada a horno y KDS de cocina.");
  };

  const markOrderReady = (orderId: string) => {
    transitionOrder(orderId, "LISTO", "Cocina de Empanadas", "Elaboración finalizada. Pedido empaquetado y listo para retiro/despacho.");
    if (isSoundEnabled) playSuccessSound();
  };

  const deliverOrder = (orderId: string) => {
    transitionOrder(orderId, "FINALIZADO", "Mostrador / Repartidor", "Comanda entregada al cliente.");
    if (isSoundEnabled) playSuccessSound();
  };

  const adjustEstimate = (orderId: string, deltaMinutes: number) => {
    setOrders(prev =>
      prev.map(o => {
        if (o.id !== orderId) return o;
        const newEstimate = Math.max(5, o.estimatedMinutes + deltaMinutes);
        return { ...o, estimatedMinutes: newEstimate };
      })
    );
  };

  const approveAIOrder = (orderId: string, customItems?: OrderItem[]) => {
    if (isSoundEnabled) playSuccessSound();
    setOrders(prev =>
      prev.map(o => {
        if (o.id !== orderId) return o;
        const finalItems = customItems || o.items;
        const newTotal = finalItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
        return {
          ...o,
          items: finalItems,
          total: newTotal,
          status: "CONFIRMADO",
          turnNumber: Math.floor(Math.random() * 30) + 1,
          history: [
            ...o.history,
            {
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              fromStatus: "NUEVO",
              toStatus: "CONFIRMADO",
              user: "Operador (Aprobación IA)",
              note: "Interpretación IA revisada y aprobada humanamente.",
            },
          ],
        };
      })
    );
  };

  // Synergy with Catalog
  const toggleProductAvailability = (productId: string) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id !== productId) return p;
        const nextAvail = !p.isAvailable;
        if (!nextAvail) {
          addIncidencia({
            title: `Producto '${p.name}' deshabilitado`,
            severity: "Media",
            type: "producto_desactivado",
            description: `Se desactivó la disponibilidad de ${p.name} en catálogo. Los pedidos activos vigentes se mantendrán.`,
          });
        }
        return { ...p, isAvailable: nextAvail };
      })
    );
  };

  const updateProductPrice = (productId: string, newPrice: number) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, price: newPrice } : p))
    );
  };

  const updateProduct = (productId: string, updatedFields: Partial<ProductItem>) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, ...updatedFields } : p))
    );
  };

  const addProduct = (newProduct: Omit<ProductItem, "id">) => {
    const id = `PROD-${Date.now().toString().slice(-4)}`;
    const productWithId: ProductItem = {
      ...newProduct,
      id,
    };
    setProducts(prev => [productWithId, ...prev]);
  };

  // Synergy with Automations
  const toggleAutomationRule = (ruleId: string) => {
    setAutomations(prev =>
      prev.map(r => (r.id === ruleId ? { ...r, isActive: !r.isActive } : r))
    );
  };

  // Synergy with Recurrences
  const toggleRecurrence = (recurrenceId: string) => {
    setRecurrences(prev =>
      prev.map(r => (r.id === recurrenceId ? { ...r, isActive: !r.isActive } : r))
    );
  };

  // Synergy with Shifts
  const updateStaffStatus = (staffId: string, status: "Activo" | "Descanso" | "Inactivo") => {
    setShiftInfo(prev => {
      const updatedStaff = prev.activeStaff.map(st => (st.id === staffId ? { ...st, status } : st));
      const activeCount = updatedStaff.filter(st => st.status === "Activo").length;
      let capacityStatus: "Optima" | "Moderada" | "Reducida" = "Optima";
      let capacityPercent = 95;
      let buffer = 0;
      let maxOrders = 12;

      if (activeCount <= 1) {
        capacityStatus = "Reducida";
        capacityPercent = 30;
        buffer = 20;
        maxOrders = 3;
      } else if (activeCount <= 2) {
        capacityStatus = "Reducida";
        capacityPercent = 48;
        buffer = 12;
        maxOrders = 5;
      } else if (activeCount <= 3) {
        capacityStatus = "Moderada";
        capacityPercent = 72;
        buffer = 5;
        maxOrders = 8;
      }

      return {
        ...prev,
        activeStaff: updatedStaff,
        capacityStatus,
        capacityPercent,
        maxRecommendedOrders: maxOrders,
        suggestedPrepBufferMinutes: buffer,
      };
    });
  };

  const assignStaffStation = (staffId: string, station: "Horno" | "Armado" | "Empaque" | "Caja") => {
    setShiftInfo(prev => ({
      ...prev,
      activeStaff: prev.activeStaff.map(st => (st.id === staffId ? { ...st, station } : st)),
    }));
  };

  const switchShift = (shiftName: string) => {
    setShiftInfo(prev => {
      let maxOrders = 10;
      if (shiftName.includes("Mañana")) maxOrders = 8;
      if (shiftName.includes("Noche")) maxOrders = 12;
      if (shiftName.includes("Trasnoche")) maxOrders = 4;

      return {
        ...prev,
        currentShift: shiftName,
        maxRecommendedOrders: maxOrders,
      };
    });
  };

  const resolveIncidencia = (incidenciaId: string) => {
    setIncidencias(prev =>
      prev.map(inc => (inc.id === incidenciaId ? { ...inc, isResolved: true } : inc))
    );
  };

  const createManualOrder = (newOrderData: Partial<Pedido>) => {
    const nextId = `PED-${String(orders.length + 1025)}`;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const order: Pedido = {
      id: nextId,
      customerName: newOrderData.customerName || "Cliente Mostrador",
      customerPhone: newOrderData.customerPhone || "+54 11 0000-0000",
      channel: newOrderData.channel || "presencial",
      type: newOrderData.type || "inmediato",
      status: "NUEVO",
      items: newOrderData.items || [
        { productId: products[0].id, name: products[0].name, quantity: 2, unitPrice: products[0].price },
      ],
      total: newOrderData.total || products[0].price * 2,
      createdAt: timeStr,
      estimatedMinutes: newOrderData.estimatedMinutes || 15 + shiftInfo.suggestedPrepBufferMinutes,
      elapsedMinutes: 0,
      urgency: "A_TIEMPO",
      notes: newOrderData.notes || "",
      history: [
        {
          timestamp: timeStr,
          toStatus: "NUEVO",
          user: "Caja Mostrador",
          note: "Ingreso manual desde panel de pedidos.",
        },
      ],
    };

    setOrders(prev => [order, ...prev]);
    if (isSoundEnabled) playNewOrderSound();
  };

  const injectScheduledOrderToLive = (orderId: string, directToKitchen = true) => {
    const target = programados.find(p => p.id === orderId);
    if (!target) return;

    const newStatus: OrderStatus = directToKitchen ? "EN_PREPARACION" : "CONFIRMADO";
    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const activatedOrder: Pedido = {
      ...target,
      status: newStatus,
      urgency: "A_TIEMPO",
      elapsedMinutes: 0,
      turnNumber: target.turnNumber || Math.floor(Math.random() * 30) + 1,
      history: [
        ...target.history,
        {
          timestamp: nowStr,
          fromStatus: "NUEVO",
          toStatus: newStatus,
          user: "Planificador / Inyección Manual",
          note: `Comanda programada activada en vivo (${directToKitchen ? "Enviada a Cocina" : "Confirmada en Cola"}).`,
        },
      ],
    };

    setProgramados(prev => prev.filter(p => p.id !== orderId));
    setOrders(prev => [activatedOrder, ...prev]);
    if (isSoundEnabled) playNewOrderSound();
  };

  return (
    <PedidosContext.Provider
      value={{
        orders,
        programados,
        products,
        automations,
        recurrences,
        shiftInfo,
        incidencias,
        kpis,
        selectedOrderId,
        setSelectedOrderId,
        isIncidenciasOpen,
        setIsIncidenciasOpen,
        aiModalOrder,
        setAiModalOrder,
        rejectModalOrder,
        setRejectModalOrder,
        cancelModalOrder,
        setCancelModalOrder,
        printTicketOrder,
        setPrintTicketOrder,
        isSoundEnabled,
        setIsSoundEnabled,
        toggleSound,
        transitionOrder,
        confirmOrder,
        rejectOrder,
        cancelOrder,
        sendToKitchen,
        markOrderReady,
        deliverOrder,
        adjustEstimate,
        approveAIOrder,
        toggleProductAvailability,
        updateProductPrice,
        updateProduct,
        addProduct,
        toggleAutomationRule,
        toggleRecurrence,
        storePace,
        setStorePace,
        updateStaffStatus,
        assignStaffStation,
        switchShift,
        resolveIncidencia,
        addIncidencia,
        createManualOrder,
        injectScheduledOrderToLive,
      }}
    >
      {children}
    </PedidosContext.Provider>
  );
};

export const usePedidos = () => {
  const context = useContext(PedidosContext);
  if (!context) {
    throw new Error("usePedidos must be used within a PedidosProvider");
  }
  return context;
};
