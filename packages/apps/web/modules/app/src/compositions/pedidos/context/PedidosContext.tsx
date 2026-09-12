import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { eventBus } from "@/infrastructure/eventBus";
import {
  Pedido,
  ProductItem,
  AutomationRule,
  RecurrenceConfig,
  ShiftInfo,
  Incidencia,
  ResumenKPIs,
  OrderStatus,
  PaymentStatus,
  OrderItem,
  StorePaceMode,
  UrgencyLevel,
  StockIngredientItem,
  StockMovement,
  Conversation,
  ConversationStatus,
  HandoffReason,
  ChatMessage,
} from "../types";
import {
  INITIAL_ORDERS,
  INITIAL_HISTORIAL_ORDERS,
  INITIAL_AUTOMATIONS,
  INITIAL_RECURRENCES,
  INITIAL_SHIFT_INFO,
  INITIAL_INCIDENCIAS,
  INITIAL_KPIS,
  INITIAL_PROGRAMADOS,
  INITIAL_INGREDIENTS,
  INITIAL_MOVEMENTS,
  INITIAL_CONVERSATIONS,
  getMockOrdersForBusiness,
  getMockConversationsForBusiness,
  getMockProgramadosForBusiness,
} from "../mockData";
import { useBusiness } from "@/context/BusinessContext";
import { playNewOrderSound, playSuccessSound, playUrgentAlertSound } from "../utils/soundEffects";
import { useAuth } from "../../../auth/AuthContext";
import { createInventoryAdapter, InventoryPort } from "../adapters/inventoryAdapter";

interface PedidosContextType {
  hasInventarios: boolean;
  inventoryAdapter: InventoryPort;
  orders: Pedido[];
  historialOrders: Pedido[];
  allOrders: Pedido[];
  programados: Pedido[];
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
  isPreparacionEnabled: boolean;
  setIsPreparacionEnabled: (enabled: boolean) => void;

  // Actions
  transitionOrder: (orderId: string, toStatus: OrderStatus, user?: string, note?: string) => void;
  confirmOrder: (orderId: string) => void;
  rejectOrder: (orderId: string, reason: string) => void;
  cancelOrder: (orderId: string, reason: string) => void;
  sendToKitchen: (orderId: string) => void;
  sendToPreparation: (orderId: string) => void;
  markOrderReady: (orderId: string) => void;
  deliverOrder: (orderId: string) => void;
  updatePaymentStatus: (orderId: string, newPaymentStatus: PaymentStatus, note?: string) => boolean;
  processReturnOrder: (
    orderId: string,
    params: { reason: string; returnStock?: boolean; refundPayment?: boolean; author?: string }
  ) => void;
  adjustEstimate: (orderId: string, deltaMinutes: number) => void;
  approveAIOrder: (orderId: string, customItems?: OrderItem[]) => void;
  consumeStockForOrder: (order: Pedido) => void;
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
  const { getIdToken, user } = useAuth();
  const { activeBusiness, semantics } = useBusiness();
  const hasInventarios = Boolean(activeBusiness?.activeModules?.includes("inventarios"));
  const inventoryAdapter = useMemo(() => createInventoryAdapter(hasInventarios), [hasInventarios]);
  const [orders, setOrders] = useState<Pedido[]>(() =>
    activeBusiness ? getMockOrdersForBusiness(activeBusiness.businessType, activeBusiness.name) : INITIAL_ORDERS
  );
  const [historialOrders, setHistorialOrders] = useState<Pedido[]>(INITIAL_HISTORIAL_ORDERS);
  const [programados, setProgramados] = useState<Pedido[]>(() =>
    activeBusiness ? getMockProgramadosForBusiness(activeBusiness.businessType) : INITIAL_PROGRAMADOS
  );

  const allOrders = useMemo(() => [...orders, ...historialOrders], [orders, historialOrders]);
  const [automations, setAutomations] = useState<AutomationRule[]>(INITIAL_AUTOMATIONS);
  const [recurrences, setRecurrences] = useState<RecurrenceConfig[]>(INITIAL_RECURRENCES);
  const [shiftInfo, setShiftInfo] = useState<ShiftInfo>(INITIAL_SHIFT_INFO);
  const [storePace, setStorePaceState] = useState<StorePaceMode>("habitual");
  const [incidencias, setIncidencias] = useState<Incidencia[]>(INITIAL_INCIDENCIAS);
  const [kpis, setKpis] = useState<ResumenKPIs>(INITIAL_KPIS);
  // Sincronización reactiva de órdenes y programados al cambiar de empresa
  useEffect(() => {
    if (!activeBusiness) return;
    const newOrders = getMockOrdersForBusiness(activeBusiness.businessType, activeBusiness.name);
    const newProgramados = getMockProgramadosForBusiness(activeBusiness.businessType);

    setOrders(newOrders);
    setProgramados(newProgramados);
  }, [activeBusiness?.id]);

  // Nombre legible del operador actual. En el mockup, si no hay sesión Cognito
  // con nombre usable, se cae a un rol genérico consistente con las acciones de pedido.
  const currentOperatorName = (() => {
    try {
      const uname = user?.getUsername?.();
      if (uname && !uname.includes("@")) return uname;
      if (uname) return uname.split("@")[0];
    } catch (e) {}
    return "Operador de Caja";
  })();

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

  // Operational preparation capability toggle
  const [isPreparacionEnabled, setIsPreparacionEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("necto_pedidos_preparacion_enabled");
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true;
  });

  const setIsPreparacionEnabled = (enabled: boolean) => {
    setIsPreparacionEnabledState(enabled);
    try {
      localStorage.setItem("necto_pedidos_preparacion_enabled", JSON.stringify(enabled));
      eventBus.publish("necto_preparacion_toggle", { active: enabled });
    } catch (e) {}
  };

  useEffect(() => {
    const handleToggle = () => {
      try {
        const saved = localStorage.getItem("necto_pedidos_preparacion_enabled");
        if (saved !== null) setIsPreparacionEnabledState(JSON.parse(saved));
      } catch (e) {}
    };
    const unsub = eventBus.subscribe("necto_preparacion_toggle", (payload) => {
      setIsPreparacionEnabledState(payload.active);
    });
    window.addEventListener("storage", handleToggle);
    return () => {
      unsub();
      window.removeEventListener("storage", handleToggle);
    };
  }, []);

  // Sync with global store pace changes from BusinessSwitcher
  useEffect(() => {
    try {
      const saved = localStorage.getItem("necto_store_pace");
      if (saved === "rapida" || saved === "habitual" || saved === "demorada") {
        setStorePace(saved as StorePaceMode);
      }
    } catch (e) {}

    const handlePaceChange = (e: Event) => {
      const customEvent = e as CustomEvent<StorePaceMode>;
      if (customEvent.detail && ["rapida", "habitual", "demorada"].includes(customEvent.detail)) {
        setStorePace(customEvent.detail);
      }
    };
    window.addEventListener("necto_store_pace_changed", handlePaceChange);
    return () => window.removeEventListener("necto_store_pace_changed", handlePaceChange);
  }, []);


  const toggleSound = () => {
    setIsSoundEnabled(prev => {
      const next = !prev;
      if (next) playSuccessSound();
      return next;
    });
  };

  // Load catalog products from the WebiAI Products API (mock fallback).
  // Necto-only presentation fields are preserved by merging over existing items.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getIdToken().catch(() => "");
        const apiProducts = await apiListProducts(token);
        if (cancelled) return;
        setProducts(prev => {
          const byId = new Map(prev.map(p => [p.id, p]));
          return apiProducts.map(ap => toProductItem(ap, byId.get(ap.id)));
        });
      } catch (err) {
        // Non-fatal: keep the seeded INITIAL_PRODUCTS so the UI stays usable.
        console.error("[PedidosContext] failed to load products", err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recalculate KPIs when orders or historial change
  useEffect(() => {
    const allDayOrders = [...orders, ...historialOrders];
    const completed = allDayOrders.filter(o => o.status === "FINALIZADO").length;
    const inProcess = orders.filter(o => ["CONFIRMADO", "EN_PREPARACION", "LISTO"].includes(o.status)).length;
    const canceled = allDayOrders.filter(o => o.status === "CANCELADO").length;
    const rejected = allDayOrders.filter(o => o.status === "RECHAZADO").length;
    const totalRev = allDayOrders
      .filter(o => o.status !== "CANCELADO" && o.status !== "RECHAZADO")
      .reduce((sum, o) => sum + o.total, 0);
    const validCount = allDayOrders.length - canceled - rejected;
    const avgTicket = validCount > 0 ? Math.round(totalRev / validCount) : 0;

    setKpis(prev => ({
      ...prev,
      pedidosHoy: allDayOrders.length,
      completados: completed,
      enProceso: inProcess,
      cancelados: canceled,
      rechazados: rejected,
      ingresosTotales: totalRev,
      ticketPromedio: avgTicket,
    }));
  }, [orders, historialOrders]);

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

        // 1. Notificación de evento OrderConfirmed al puerto de inventario
        if (toStatus === "CONFIRMADO") {
          const availCheck = inventoryAdapter.validateAvailableStock(
            order.items.map((i) => ({ productId: i.productId, name: i.name, quantity: i.quantity }))
          );
          if (!availCheck.hasStock) {
            console.warn(
              `[PedidosContext] Advertencia de sobreventa en orden #${order.id}: ${availCheck.missingItems.map(m => `${m.name} (disponible: ${m.available}, requerido: ${m.requested})`).join(", ")}`
            );
          }
          void inventoryAdapter.handleOrderEvent({ type: "OrderConfirmed", order });
        }

        // 2. Notificación de evento OrderCancelled si la orden es rechazada
        if (toStatus === "RECHAZADO") {
          void inventoryAdapter.handleOrderEvent({ type: "OrderCancelled", order, reason: "Orden rechazada" });
        }

        // 3. Notificación de evento OrderReady al puerto de inventario al llegar a LISTO o entrega
        // En EN_PREPARACION se mantiene la reserva intacta sin descontar Kardex todavía
        const isFulfillmentFinished = ["LISTO", "ENTREGADO", "FINALIZADO"].includes(toStatus);
        const shouldConsumeStock = isFulfillmentFinished && !order.isStockConsumed;

        if (shouldConsumeStock) {
          consumeStockForOrder(order);
        }

        // Automatic WhatsApp notification to the customer's chat thread
        if (order.channel === "whatsapp") {
          eventBus.publish("orderStateChanged", {
            orderId: order.id,
            newState: toStatus,
          });
        }

        return {
          ...order,
          status: toStatus,
          turnNumber: newTurn,
          isStockConsumed: order.isStockConsumed || shouldConsumeStock,
          history: [...order.history, newEvent],
        };
      })
    );
  };

  const confirmOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order && hasInventarios) {
      const availCheck = inventoryAdapter.validateAvailableStock(
        order.items.map((i) => ({ productId: i.productId, name: i.name, quantity: i.quantity }))
      );
      if (!availCheck.hasStock) {
        const detailStr = availCheck.missingItems.map(m => `${m.name} (disp: ${m.available}, req: ${m.requested})`).join(", ");
        addIncidencia({
          title: `Alerta de Stock al Confirmar #${orderId}`,
          severity: "Media",
          type: "quiebre_stock",
          orderId,
          description: `El pedido se confirmó con déficit en stock disponible: ${detailStr}`,
        });
      }
    }
    transitionOrder(orderId, "CONFIRMADO", "Operador de Pedidos", "Pedido confirmado y stock reservado.");
  };

  const rejectOrder = (orderId: string, reason: string) => {
    // Liberar reserva preventiva en Inventario si el módulo está activo
    void inventoryAdapter.releaseStock(orderId);

    setOrders(prev =>
      prev.map(order => {
        if (order.id !== orderId) return order;
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const newPaymentStatus: PaymentStatus =
          order.paymentStatus === "PAGADO" ? "REEMBOLSADO" : "ANULADO";
        return {
          ...order,
          status: "RECHAZADO",
          paymentStatus: newPaymentStatus,
          rejectionReason: reason,
          history: [
            ...order.history,
            {
              timestamp: timeStr,
              fromStatus: order.status,
              toStatus: "RECHAZADO",
              fromPaymentStatus: order.paymentStatus,
              toPaymentStatus: newPaymentStatus,
              user: "Operador de Pedidos",
              note: `Rechazado por: ${reason}`,
            },
          ],
        };
      })
    );
  };

  /**
   * Cancelación contextual de orden según su etapa operativa:
   * - NUEVO: cancela directamente sin tocar inventario.
   * - CONFIRMADO / EN_PREPARACION: libera reserva preventiva sin generar entrada en Kardex.
   * - LISTO: reversa formalmente la salida de Kardex (ENTRADA / STOCK_ADD) e idempotencia.
   * - ENTREGADO: bloquea cancelación ordinaria y orienta a processReturnOrder.
   */
  const cancelOrder = (orderId: string, reason: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    if (targetOrder.status === "ENTREGADO" || targetOrder.status === "FINALIZADO") {
      console.warn("Una orden entregada no puede cancelarse de forma ordinaria. Utilice processReturnOrder para registrar la devolución y reembolso.");
      return;
    }

    let inventoryOpId: string | undefined = undefined;

    // Despacho del evento OrderCancelled al puerto de inventario
    void inventoryAdapter.handleOrderEvent({
      type: "OrderCancelled",
      order: targetOrder,
      reason,
    }).then(resOpId => {
      if (resOpId) inventoryOpId = resOpId;
    });

    // Transición de estado de pago consistente con la cancelación:
    let newPaymentStatus: PaymentStatus = targetOrder.paymentStatus || "PENDIENTE";
    if (newPaymentStatus === "PENDIENTE" || newPaymentStatus === "PAGO_CONTRA_ENTREGA") {
      newPaymentStatus = "ANULADO";
    } else if (newPaymentStatus === "PAGADO") {
      newPaymentStatus = "REEMBOLSADO";
    }

    setOrders(prev =>
      prev.map(order => {
        if (order.id !== orderId) return order;
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const newEvent: OrderEvent = {
          timestamp: timeStr,
          fromStatus: order.status,
          toStatus: "CANCELADO",
          fromPaymentStatus: order.paymentStatus || "PENDIENTE",
          toPaymentStatus: newPaymentStatus,
          user: "Operador de Pedidos",
          note: `Cancelado por: ${reason}`,
          inventoryOperationId: inventoryOpId,
        };
        return {
          ...order,
          status: "CANCELADO",
          paymentStatus: newPaymentStatus,
          isStockReverted: targetOrder.status === "LISTO" ? true : order.isStockReverted,
          cancellationReason: reason,
          history: [...order.history, newEvent],
        };
      })
    );

    addIncidencia({
      title: `Pedido ${orderId} cancelado (${targetOrder.status})`,
      severity: "Alta",
      type: "cancelacion",
      orderId,
      description: `Cancelación en etapa ${targetOrder.status}. Motivo: ${reason}`,
    });
  };

  /**
   * Flujo formal de Devolución / Anulación para órdenes ENTREGADAS.
   * La orden conserva su estado operativo (ENTREGADO) pero evoluciona en su eje de
   * devolución (returnStatus: RECIBIDA) y financiero (paymentStatus: REEMBOLSADO).
   */
  const processReturnOrder = (
    orderId: string,
    params: { reason: string; returnStock?: boolean; refundPayment?: boolean; author?: string }
  ) => {
    const { reason, returnStock = true, refundPayment = false, author = "Supervisor de Devoluciones" } = params;
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    let inventoryOpId: string | undefined = undefined;

    // Despacho del evento OrderReturned al puerto de inventario
    void inventoryAdapter.handleOrderEvent({
      type: "OrderReturned",
      order: targetOrder,
      reason,
      returnStock,
    }).then(resOpId => {
      if (resOpId) inventoryOpId = resOpId;
    });

    // Modificación del estado financiero correspondiente
    let newPaymentStatus: PaymentStatus = targetOrder.paymentStatus || "PENDIENTE";
    if (refundPayment) {
      if (newPaymentStatus === "PAGADO") {
        newPaymentStatus = "REEMBOLSADO";
      } else if (newPaymentStatus === "PENDIENTE" || newPaymentStatus === "PAGO_CONTRA_ENTREGA") {
        newPaymentStatus = "ANULADO";
      }
    }

    setOrders(prev =>
      prev.map(order => {
        if (order.id !== orderId) return order;
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const newEvent: OrderEvent = {
          timestamp: timeStr,
          fromStatus: order.status,
          toStatus: order.status, // Mantiene su estatus operativo (ej: ENTREGADO)
          fromPaymentStatus: order.paymentStatus || "PENDIENTE",
          toPaymentStatus: newPaymentStatus,
          fromReturnStatus: order.returnStatus || "NO_APLICA",
          toReturnStatus: "RECIBIDA",
          user: author,
          note: `Devolución formal registrada: ${reason} (Reingreso stock: ${returnStock ? "Sí" : "No"}, Reembolso: ${refundPayment ? "Sí" : "No"})`,
          inventoryOperationId: inventoryOpId,
        };
        return {
          ...order,
          returnStatus: "RECIBIDA",
          returnReason: reason,
          paymentStatus: newPaymentStatus,
          isStockReverted: returnStock ? true : order.isStockReverted,
          history: [...order.history, newEvent],
        };
      })
    );

    addIncidencia({
      title: `Devolución de Pedido ${orderId}`,
      severity: "Media",
      type: "cancelacion",
      orderId,
      description: `Devolución física registrada por ${author}. Motivo: ${reason}`,
    });
  };

  /**
   * Actualización validada del estado de pago (eje financiero independiente del eje operativo).
   */
  const updatePaymentStatus = (orderId: string, newPaymentStatus: PaymentStatus, note?: string): boolean => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return false;

    const current = order.paymentStatus || "PENDIENTE";
    if (current === newPaymentStatus) return true;

    // Validación de máquina de estados financieros:
    const allowedTransitions: Record<PaymentStatus, PaymentStatus[]> = {
      PENDIENTE: ["PAGADO", "PAGO_CONTRA_ENTREGA", "ANULADO"],
      PAGO_CONTRA_ENTREGA: ["PAGADO", "ANULADO"],
      PAGADO: ["REEMBOLSADO"],
      ANULADO: [],
      REEMBOLSADO: [],
    };

    if (!allowedTransitions[current]?.includes(newPaymentStatus)) {
      console.warn(`[PedidosContext] Transición financiera no permitida: ${current} -> ${newPaymentStatus}`);
      return false;
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    setOrders(prev =>
      prev.map(o => {
        if (o.id !== orderId) return o;
        const newEvent: OrderEvent = {
          timestamp: timeStr,
          fromPaymentStatus: current,
          toPaymentStatus: newPaymentStatus,
          user: "Cajero / Operador",
          note: note || `Estado de pago actualizado de ${current} a ${newPaymentStatus}`,
        };
        return {
          ...o,
          paymentStatus: newPaymentStatus,
          history: [...o.history, newEvent],
        };
      })
    );
    return true;
  };

  const sendToKitchen = (orderId: string) => {
    const actor = semantics?.requiresKitchenDisplay ? "Cocinero Jefe" : "Operador de Alistamiento";
    const note = semantics?.requiresKitchenDisplay ? "Comanda enviada a cocina." : "Pedido enviado a alistamiento y empaque.";
    transitionOrder(orderId, "EN_PREPARACION", actor, note);
  };

  const sendToPreparation = (orderId: string) => {
    sendToKitchen(orderId);
  };

  const markOrderReady = (orderId: string) => {
    const actor = semantics?.requiresKitchenDisplay ? "Cocina" : (semantics?.stationShortName || "Alistamiento");
    transitionOrder(orderId, "LISTO", actor, "Alistamiento finalizado. Pedido empacado y listo para retiro/despacho.");
    if (isSoundEnabled) playSuccessSound();
  };

  const deliverOrder = (orderId: string) => {
    transitionOrder(orderId, "ENTREGADO", "Mostrador / Repartidor", "Comanda entregada al cliente.");
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

  const consumeStockForOrder = (order: Pedido) => {
    void inventoryAdapter.handleOrderEvent({
      type: "OrderReady",
      order,
    });
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
        { productId: "p-01", name: "Producto de Catálogo", quantity: 2, unitPrice: 25000 },
      ],
      total: newOrderData.total || 50000,
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

    // Prevent duplicate injection into live orders
    if (orders.some(o => o.id === orderId)) return;

    const newStatus: OrderStatus = directToKitchen ? "EN_PREPARACION" : "CONFIRMADO";
    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const activatedOrder: Pedido = {
      ...target,
      status: newStatus,
      urgency: "A_TIEMPO",
      elapsedMinutes: 0,
      isInLiveQueue: true,
      turnNumber: target.turnNumber || Math.floor(Math.random() * 30) + 1,
      history: [
        ...target.history,
        {
          timestamp: nowStr,
          fromStatus: target.status,
          toStatus: newStatus,
          user: "Planificador / Inyección Manual",
          note: `Comanda programada activada en vivo (${directToKitchen ? "Enviada a Cocina" : "Confirmada en Cola"}).`,
        },
      ],
    };

    setProgramados(prev =>
      prev.map(p => (p.id === orderId ? { ...p, isInLiveQueue: true, status: newStatus } : p))
    );
    setOrders(prev => [activatedOrder, ...prev]);
    if (isSoundEnabled) playNewOrderSound();
  };

  // ==========================================================================
  // Human-in-the-Loop — Conversaciones WhatsApp / IA
  // ==========================================================================
  const nowTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  };

  const transitionConversation = (
    conversationId: string,
    toStatus: ConversationStatus,
    note?: string,
  ) => {
    const timeStr = nowTime();
    setConversations(prev =>
      prev.map(conv => {
        if (conv.id !== conversationId) return conv;
        // controlledBy sólo tiene valor mientras un humano atiende.
        const controlledBy =
          toStatus === "HUMANO_ATENDIENDO" ? currentOperatorName : null;
        // El motivo de handoff se limpia al salir de la cola/atención.
        const requiresHandoffReason =
          toStatus === "IA_ATENDIENDO" || toStatus === "RESUELTO"
            ? undefined
            : conv.requiresHandoffReason;
        return {
          ...conv,
          status: toStatus,
          controlledBy,
          requiresHandoffReason,
          handoffHistory: [
            ...conv.handoffHistory,
            {
              timestamp: timeStr,
              fromStatus: conv.status,
              toStatus,
              user: currentOperatorName,
              note,
            },
          ],
        };
      })
    );
  };

  const takeControl = (conversationId: string) => {
    transitionConversation(
      conversationId,
      "HUMANO_ATENDIENDO",
      "Operador tomó el control de la conversación.",
    );
  };

  const releaseToAI = (conversationId: string) => {
    transitionConversation(
      conversationId,
      "IA_ATENDIENDO",
      "Control devuelto al asistente IA.",
    );
  };

  const resolveConversation = (conversationId: string) => {
    transitionConversation(
      conversationId,
      "RESUELTO",
      "Conversación marcada como resuelta.",
    );
    if (isSoundEnabled) playSuccessSound();
  };

  const sendOperatorMessage = (conversationId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const timeStr = nowTime();
    setConversations(prev =>
      prev.map(conv => {
        if (conv.id !== conversationId) return conv;
        // Exclusión mutua: sólo el operador con el control puede escribir.
        if (conv.status !== "HUMANO_ATENDIENDO") return conv;
        return {
          ...conv,
          lastMessageAt: timeStr,
          messages: [
            ...conv.messages,
            {
              id: `m-${Date.now()}`,
              sender: "humano",
              authorName: currentOperatorName,
              text: trimmed,
              timestamp: timeStr,
            },
          ],
        };
      })
    );
  };

  const flagForHandoff = (conversationId: string, reason: HandoffReason) => {
    const timeStr = nowTime();
    setConversations(prev =>
      prev.map(conv => {
        if (conv.id !== conversationId) return conv;
        return {
          ...conv,
          status: "REQUIERE_INTERVENCION",
          requiresHandoffReason: reason,
          unreadForOperator: true,
          handoffHistory: [
            ...conv.handoffHistory,
            {
              timestamp: timeStr,
              fromStatus: conv.status,
              toStatus: "REQUIERE_INTERVENCION",
              user: "Asistente IA",
              note: "La IA solicitó intervención humana.",
            },
          ],
        };
      })
    );
    if (isSoundEnabled) playUrgentAlertSound();
  };

  const markConversationRead = (conversationId: string) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId ? { ...conv, unreadForOperator: false } : conv
      )
    );
  };

  // --- Confirmar comanda desde borrador de chat al Kanban de Cocina ---
  const confirmDraftOrder = (conversationId: string): string | undefined => {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;

    if (conv.orderId) {
      confirmOrder(conv.orderId);
      return conv.orderId;
    }

    const draft = conv.draftOrder;
    const newOrderId = `PED-${Math.floor(1030 + Math.random() * 70)}`;
    const customerPhone = conv.customerPhone || "+57 300 123 4567";
    const customerName = conv.customerName || "Cliente WhatsApp";
    const items =
      draft?.items && draft.items.length > 0
        ? draft.items
        : [
            {
              productId: "prod-01",
              name: "Empanada de Carne Cortada a Cuchillo",
              quantity: 6,
              unitPrice: 5500,
              option: "Horneada",
            },
            {
              productId: "prod-07",
              name: "Gaseosa Cola 354ml",
              quantity: 2,
              unitPrice: 4500,
            },
            {
              productId: "extra-01",
              name: "Salsa Chimichurri Especial (120ml)",
              quantity: 1,
              unitPrice: 3500,
            },
          ];
    const total = draft?.total || items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

    const newOrder: Pedido = {
      id: newOrderId,
      customerName,
      customerPhone,
      customerAddress: draft?.deliveryAddress || "Calle 72 # 11-45 (Apto 402)",
      channel: "whatsapp",
      type: "inmediato",
      status: "CONFIRMADO",
      items,
      total,
      createdAt: nowTime(),
      estimatedMinutes: 20,
      elapsedMinutes: 0,
      urgency: "A_TIEMPO",
      isAIOrigin: true,
      aiConfidence: "Alta",
      paymentMethod: draft?.paymentMethod === "efectivo" ? "efectivo" : "transferencia",
      notes: draft?.notes || "Comanda WhatsApp confirmada tras validación de pago.",
      history: [
        {
          timestamp: nowTime(),
          toStatus: "NUEVO",
          user: "Necto IA Bot (WhatsApp)",
          note: "Borrador de chat completado y verificado.",
        },
        {
          timestamp: nowTime(),
          fromStatus: "NUEVO",
          toStatus: "CONFIRMADO",
          user: currentOperatorName || "Administrador",
          note: "Pago comprobado. Comanda transferida al Kanban de Cocina en Vivo.",
        },
      ],
    };

    setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrderId)]);
    setConversations(prev =>
      prev.map(c => (c.id === conversationId ? { ...c, orderId: newOrderId } : c))
    );
    if (isSoundEnabled) playNewOrderSound();
    return newOrderId;
  };



  return (
    <PedidosContext.Provider
      value={{
        orders,
        historialOrders,
        allOrders,
        programados,
        ingredients,
        stockMovements,
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
        isPreparacionEnabled,
        setIsPreparacionEnabled,
        transitionOrder,
        confirmOrder,
        rejectOrder,
        cancelOrder,
        sendToKitchen,
        sendToPreparation,
        markOrderReady,
        deliverOrder,
        updatePaymentStatus,
        processReturnOrder,
        adjustEstimate,
        approveAIOrder,
        consumeStockForOrder,
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
        conversations,
        selectedConversationId,
        setSelectedConversationId,
        currentOperatorName,
        transitionConversation,
        takeControl,
        releaseToAI,
        resolveConversation,
        sendOperatorMessage,
        flagForHandoff,
        markConversationRead,
        confirmDraftOrder,
        simulateCustomerMessage,
        simulateAIReply,
        openWhatsAppConversation,
        sendWhatsAppStatusAlert,
        hasInventarios,
        inventoryAdapter,
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
