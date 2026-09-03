import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
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
  INITIAL_PRODUCTS,
  INITIAL_AUTOMATIONS,
  INITIAL_RECURRENCES,
  INITIAL_SHIFT_INFO,
  INITIAL_INCIDENCIAS,
  INITIAL_KPIS,
  INITIAL_PROGRAMADOS,
  INITIAL_INGREDIENTS,
  INITIAL_MOVEMENTS,
  INITIAL_CONVERSATIONS,
} from "../mockData";
import { playNewOrderSound, playSuccessSound, playUrgentAlertSound } from "../utils/soundEffects";
import { useAuth } from "../../../auth/AuthContext";
import {
  listProducts as apiListProducts,
  createProduct as apiCreateProduct,
  updateProduct as apiUpdateProduct,
  USE_MOCK as PRODUCTS_USE_MOCK,
} from "../../../api/products";
import { toProductItem, toApiProduct } from "../adapters/productAdapter";

interface PedidosContextType {
  orders: Pedido[];
  historialOrders: Pedido[];
  allOrders: Pedido[];
  programados: Pedido[];
  products: ProductItem[];
  ingredients: StockIngredientItem[];
  stockMovements: StockMovement[];
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
  addIngredient: (newIng: Omit<StockIngredientItem, "id">) => void;
  updateIngredient: (id: string, patch: Partial<StockIngredientItem>) => void;
  deleteIngredient: (id: string) => void;
  registerStockMovement: (mov: Omit<StockMovement, "id" | "timestamp">) => void;
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

  // Human-in-the-Loop — Conversaciones WhatsApp / IA
  conversations: Conversation[];
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
  /** Nombre legible del operador actual (para controlledBy / autoría de mensajes). */
  currentOperatorName: string;
  /** Transición genérica de estado del hilo (registra evento de auditoría). */
  transitionConversation: (conversationId: string, toStatus: ConversationStatus, note?: string) => void;
  /** El operador toma el control: IA pasa a pausa (HUMANO_ATENDIENDO). */
  takeControl: (conversationId: string) => void;
  /** Devuelve el control a la IA (IA_ATENDIENDO). */
  releaseToAI: (conversationId: string) => void;
  /** Marca el caso como resuelto (RESUELTO). */
  resolveConversation: (conversationId: string) => void;
  /** El operador (dueño del control) envía un mensaje al cliente. */
  sendOperatorMessage: (conversationId: string, text: string) => void;
  /** Marca una conversación como que requiere intervención humana. */
  flagForHandoff: (conversationId: string, reason: HandoffReason) => void;
  /** Marca la conversación como leída (limpia el badge de no-leído). */
  markConversationRead: (conversationId: string) => void;
  /** Crea o confirma el Pedido oficial en el Kanban a partir del borrador de la conversación. */
  confirmDraftOrder: (conversationId: string) => string | undefined;
  /** DEMO: simula un mensaje entrante del cliente. */
  simulateCustomerMessage: (
    conversationId: string,
    text: string,
    options?: { isOrder?: boolean; isReceipt?: boolean }
  ) => void;
  /** DEMO: simula una respuesta de la IA (solo si está en IA_ATENDIENDO). */
  simulateAIReply: (conversationId: string, text: string) => void;
  /** Navega directamente al hilo de WhatsApp del cliente asociado al pedido */
  openWhatsAppConversation: (orderIdOrConvId: string) => void;
  /** Envía un mensaje / alerta operativo directamente al WhatsApp del cliente */
  sendWhatsAppStatusAlert: (orderId: string, customMessage: string) => void;
}

const PedidosContext = createContext<PedidosContextType | null>(null);

export const PedidosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getIdToken, user } = useAuth();
  const [orders, setOrders] = useState<Pedido[]>(INITIAL_ORDERS);
  const [historialOrders, setHistorialOrders] = useState<Pedido[]>(INITIAL_HISTORIAL_ORDERS);
  const [programados, setProgramados] = useState<Pedido[]>(INITIAL_PROGRAMADOS);

  const allOrders = useMemo(() => [...orders, ...historialOrders], [orders, historialOrders]);
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [ingredients, setIngredients] = useState<StockIngredientItem[]>(INITIAL_INGREDIENTS);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(INITIAL_MOVEMENTS);
  const [automations, setAutomations] = useState<AutomationRule[]>(INITIAL_AUTOMATIONS);
  const [recurrences, setRecurrences] = useState<RecurrenceConfig[]>(INITIAL_RECURRENCES);
  const [shiftInfo, setShiftInfo] = useState<ShiftInfo>(INITIAL_SHIFT_INFO);
  const [storePace, setStorePaceState] = useState<StorePaceMode>("habitual");
  const [incidencias, setIncidencias] = useState<Incidencia[]>(INITIAL_INCIDENCIAS);
  const [kpis, setKpis] = useState<ResumenKPIs>(INITIAL_KPIS);
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

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

        // Automatic Stock consumption whenever order reaches preparation, ready, or delivered stage (safely executed once)
        const isProgressiveProduction = ["EN_PREPARACION", "LISTO", "FINALIZADO"].includes(toStatus);
        const shouldConsumeStock = isProgressiveProduction && !order.isStockConsumed;

        if (shouldConsumeStock) {
          setTimeout(() => consumeStockForOrder(order), 50);
        }

        // Automatic WhatsApp notification to the customer's chat thread
        if (order.channel === "whatsapp") {
          setTimeout(() => {
            const statusMessages: Partial<Record<OrderStatus, string>> = {
              CONFIRMADO: `¡Tu pedido #${order.id} fue confirmado! En breve entra a preparación en cocina.`,
              EN_PREPARACION: `Tu comanda #${order.id} ya ingresó al horno de cocina y se está preparando.`,
              LISTO: `¡Tu pedido #${order.id} está listo y empacado para retiro / entrega!`,
              FINALIZADO: `¡Tu pedido #${order.id} ha sido entregado! Muchas gracias por tu compra.`,
              CANCELADO: `Tu pedido #${order.id} ha sido cancelado. Si tienes dudas, estamos a tu disposición.`,
            };
            const msgText = statusMessages[toStatus];
            if (msgText) {
              setConversations(prevConvs =>
                prevConvs.map(c => {
                  if (c.orderId === order.id || (c.customerPhone && order.customerPhone && c.customerPhone.replace(/\D/g, '') === order.customerPhone.replace(/\D/g, ''))) {
                    const newMsg: ChatMessage = {
                      id: `m-auto-${Date.now()}`,
                      sender: "ia",
                      text: msgText,
                      timestamp: timeStr,
                    };
                    return {
                      ...c,
                      lastMessageAt: timeStr,
                      messages: [...c.messages, newMsg],
                    };
                  }
                  return c;
                })
              );
            }
          }, 60);
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

  // Persist a partial product update to the Products API (best-effort).
  const persistUpdate = async (
    productId: string,
    patch: Partial<{ name: string; sku: string; price: number; stock: number }>,
  ) => {
    try {
      const token = await getIdToken().catch(() => "");
      await apiUpdateProduct(productId, patch, token);
    } catch (err) {
      console.error("[PedidosContext] failed to update product", err);
    }
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
    // Optimistic local update, then persist to the API (best-effort).
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, price: newPrice } : p))
    );
    void persistUpdate(productId, { price: newPrice });
  };

  const updateProduct = (productId: string, updatedFields: Partial<ProductItem>) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, ...updatedFields } : p))
    );
    // Persist only the fields the Products API owns (name/sku/price/stock).
    const apiPatch: Partial<{ name: string; sku: string; price: number; stock: number }> = {};
    if (updatedFields.name !== undefined) apiPatch.name = updatedFields.name;
    if (updatedFields.code !== undefined) apiPatch.sku = updatedFields.code;
    if (updatedFields.price !== undefined) apiPatch.price = updatedFields.price;
    if (updatedFields.stockEstimated !== undefined) apiPatch.stock = updatedFields.stockEstimated;
    if (Object.keys(apiPatch).length > 0) void persistUpdate(productId, apiPatch);
  };

  const addProduct = (newProduct: Omit<ProductItem, "id">) => {
    // Optimistic insert with a temporary id, then reconcile with the API id.
    const tempId = `tmp-${Date.now()}`;
    const optimistic: ProductItem = { ...newProduct, id: tempId };
    setProducts(prev => [optimistic, ...prev]);

    (async () => {
      try {
        const token = await getIdToken().catch(() => "");
        const created = await apiCreateProduct(
          toApiProduct({
            name: newProduct.name,
            code: newProduct.code,
            price: newProduct.price,
            stockEstimated: newProduct.stockEstimated,
          }),
          token,
        );
        setProducts(prev =>
          prev.map(p => (p.id === tempId ? toProductItem(created, { ...optimistic, id: created.id }) : p))
        );
      } catch (err) {
        console.error("[PedidosContext] failed to create product", err);
        if (!PRODUCTS_USE_MOCK) {
          // Roll back the optimistic insert on a real API failure.
          setProducts(prev => prev.filter(p => p.id !== tempId));
        }
      }
    })();
  };

  const addIngredient = (newIng: Omit<StockIngredientItem, "id">) => {
    const nextId = `ing-${Date.now().toString().slice(-4)}`;
    const created: StockIngredientItem = { ...newIng, id: nextId };
    setIngredients(prev => [created, ...prev]);
  };

  const updateIngredient = (id: string, patch: Partial<StockIngredientItem>) => {
    setIngredients(prev =>
      prev.map(ing => {
        if (ing.id !== id) return ing;
        const updated = { ...ing, ...patch };
        if (patch.currentStock !== undefined || patch.minThreshold !== undefined) {
          const stock = patch.currentStock !== undefined ? patch.currentStock : ing.currentStock;
          const min = patch.minThreshold !== undefined ? patch.minThreshold : ing.minThreshold;
          if (stock <= 0) updated.status = "AGOTADO";
          else if (stock <= min * 0.5) updated.status = "CRITICO";
          else if (stock <= min) updated.status = "BAJO";
          else updated.status = "OPTIMO";
        }
        return updated;
      })
    );
  };

  const deleteIngredient = (id: string) => {
    setIngredients(prev => prev.filter(i => i.id !== id));
  };

  const registerStockMovement = (mov: Omit<StockMovement, "id" | "timestamp">) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const nextId = `mov-${Date.now().toString().slice(-4)}`;
    const newMovement: StockMovement = {
      ...mov,
      id: nextId,
      timestamp: `Hoy ${timeStr}`,
    };

    setStockMovements(prev => [newMovement, ...prev]);

    setIngredients(prev =>
      prev.map(ing => {
        if (ing.id !== mov.ingredientId) return ing;
        const newStock = Math.max(0, Number((ing.currentStock + mov.quantity).toFixed(2)));
        let newStatus: StockIngredientItem["status"] = "OPTIMO";
        if (newStock <= 0) newStatus = "AGOTADO";
        else if (newStock <= ing.minThreshold * 0.5) newStatus = "CRITICO";
        else if (newStock <= ing.minThreshold) newStatus = "BAJO";

        if (newStock <= 0 && ing.currentStock > 0) {
          products.forEach(p => {
            if (p.recipe?.some(r => r.ingredientId === ing.id) && p.autoPauseOnStockOut && p.isAvailable) {
              toggleProductAvailability(p.id);
            }
          });
          addIncidencia({
            title: `Quiebre de Stock: ${ing.name}`,
            severity: "Alta",
            type: "producto_desactivado",
            description: `El insumo '${ing.name}' se agotó (${newStock} ${ing.unit}). Se pausaron automáticamente los productos asociados del catálogo.`,
          });
        }

        return {
          ...ing,
          currentStock: newStock,
          status: newStatus,
          lastRestockedAt: mov.type === "INGRESO_PROVEEDOR" ? `Hoy ${timeStr}` : ing.lastRestockedAt,
        };
      })
    );
  };

  const consumeStockForOrder = (order: Pedido) => {
    order.items.forEach(orderItem => {
      const product = products.find(p => p.id === orderItem.productId || p.name === orderItem.name);
      if (product && product.recipe && product.recipe.length > 0) {
        product.recipe.forEach(rec => {
          const totalQty = rec.quantityRequired * orderItem.quantity;
          registerStockMovement({
            ingredientId: rec.ingredientId,
            ingredientName: rec.ingredientName,
            type: "VENTA_PEDIDO",
            quantity: -Number(totalQty.toFixed(2)),
            unit: rec.unit,
            orderId: order.id,
            reason: `Consumo automático por ${orderItem.quantity}x ${product.name} (Comanda ${order.id})`,
            registeredBy: "Motor de Pedidos",
          });
        });
      } else if (ingredients.length > 0) {
        // Fallback: match by common ingredient keywords
        const nameLower = orderItem.name.toLowerCase();
        const matchedIng =
          ingredients.find(
            ing =>
              nameLower.includes(ing.name.toLowerCase()) ||
              ing.name.toLowerCase().includes(nameLower.split(" ")[0])
          ) || ingredients[0];

        if (matchedIng) {
          const qty = matchedIng.unit === "kg" ? 0.12 * orderItem.quantity : orderItem.quantity;
          registerStockMovement({
            ingredientId: matchedIng.id,
            ingredientName: matchedIng.name,
            type: "VENTA_PEDIDO",
            quantity: -Number(qty.toFixed(2)),
            unit: matchedIng.unit,
            orderId: order.id,
            reason: `Consumo proporcional por ${orderItem.quantity}x ${orderItem.name} (Comanda ${order.id})`,
            registeredBy: "Motor de Pedidos",
          });
        }
      }
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

  // --- Simuladores de demo con respuesta y toma de pedido autónoma de IA ---
  const simulateCustomerMessage = (
    conversationId: string,
    text: string,
    options?: { isOrder?: boolean; isReceipt?: boolean }
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const timeStr = nowTime();

    setConversations(prev =>
      prev.map(conv => {
        if (conv.id !== conversationId) return conv;
        return {
          ...conv,
          lastMessageAt: timeStr,
          unreadForOperator: conv.status !== "HUMANO_ATENDIENDO" ? true : conv.unreadForOperator,
          messages: [
            ...conv.messages,
            {
              id: `m-${Date.now()}`,
              sender: "cliente",
              text: trimmed,
              timestamp: timeStr,
              ...(options?.isReceipt
                ? {
                    attachmentType: "comprobante" as const,
                    attachmentUrl:
                      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=400&q=80",
                    attachmentMeta: {
                      bank: "Nequi",
                      amount: 45500,
                      reference: `NQ-${Math.floor(1000000 + Math.random() * 9000000)}`,
                      status: "PENDIENTE_VERIFICACION" as const,
                    },
                  }
                : {}),
            },
          ],
        };
      })
    );

    // La IA responde automáticamente en 600ms con lógica conversacional multi-turno
    setTimeout(() => {
      setConversations(currentConvs => {
        const conv = currentConvs.find(c => c.id === conversationId);
        if (!conv) return currentConvs;

        const lower = trimmed.toLowerCase();
        const replyTime = nowTime();
        const customerName = conv.customerName || "Lucía";

        // CASO 1: Comprobante de pago o transferencia enviada
        const isReceiptRequest =
          options?.isReceipt ||
          lower.includes("comprobante") ||
          lower.includes("transferí") ||
          lower.includes("transferencia") ||
          lower.includes("pagué") ||
          lower.includes("acá está el pago") ||
          lower.includes("adjunto el pago");

        if (isReceiptRequest) {
          return currentConvs.map(c =>
            c.id === conversationId
              ? {
                  ...c,
                  status: "REQUIERE_INTERVENCION" as const,
                  requiresHandoffReason: "VERIFICAR_PAGO_TRANSFERENCIA" as const,
                  lastMessageAt: replyTime,
                  unreadForOperator: true,
                  messages: [
                    ...c.messages,
                    {
                      id: `m-${Date.now()}`,
                      sender: "ia",
                      text: `Comprobante de Nequi recibido por $45.500 COP (Ref: #NQ-${Math.floor(100000 + Math.random() * 900000)})!\n\nPor seguridad financiera, un Administrador está validando la acreditación en la cuenta bancaria. Apenas se verifique el saldo, tu comanda entrará al horno inmediatamente. ¡Muchas gracias, ${customerName}!`,
                      timestamp: replyTime,
                    },
                  ],
                }
              : c
          );
        }

        // CASO 2: Modificación / Upsell / Adición a comanda en borrador
        const isAddingItems =
          lower.includes("agrega") ||
          lower.includes("sumale") ||
          lower.includes("adicional") ||
          lower.includes("también quiero") ||
          lower.includes("chimichurri") ||
          lower.includes("salsa") ||
          lower.includes("gaseosa") ||
          lower.includes("coca") ||
          lower.includes("postre");

        if (isAddingItems) {
          return currentConvs.map(c => {
            if (c.id !== conversationId) return c;
            const currentDraft = c.draftOrder || {
              items: [
                { productId: "prod-01", name: "Empanada de Carne Cortada a Cuchillo", quantity: 6, unitPrice: 5500, option: "Horneada" },
                { productId: "prod-07", name: "Gaseosa Cola 354ml", quantity: 2, unitPrice: 4500 },
              ],
              subtotal: 42000,
              deliveryFee: 0,
              total: 42000,
            };

            const hasChimi = currentDraft.items.some(i => i.name.includes("Chimichurri"));
            const newItems = hasChimi
              ? [
                  ...currentDraft.items,
                  { productId: "prod-07", name: "Gaseosa Cola 354ml", quantity: 1, unitPrice: 4500 },
                ]
              : [
                  ...currentDraft.items,
                  { productId: "extra-01", name: "Salsa Chimichurri Especial (120ml)", quantity: 1, unitPrice: 3500 },
                ];
            const newSubtotal = newItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
            const newTotal = newSubtotal + (currentDraft.deliveryFee || 0);

            return {
              ...c,
              draftOrder: {
                ...currentDraft,
                items: newItems,
                subtotal: newSubtotal,
                total: newTotal,
              },
              status: "IA_ATENDIENDO" as const,
              lastMessageAt: replyTime,
              messages: [
                ...c.messages,
                {
                  id: `m-${Date.now()}`,
                  sender: "ia",
                  text: `¡Listo, ${customerName}! Agregué: 1x ${hasChimi ? "Gaseosa Cola" : "Salsa Chimichurri Especial de la Casa"}.\nNuevo total: $${newTotal.toLocaleString("es-CO")} COP.\n\n¿Confirmamos entrega a tu dirección habitual (Calle 72 # 11-45) o prefieres retirar por el local? ¿Cómo deseas pagar (Nequi / Daviplata / Efectivo)?`,
                  timestamp: replyTime,
                },
              ],
            };
          });
        }

        // CASO 3: Confirmación de Dirección / Método de Pago
        const isAddressOrPayment =
          lower.includes("calle") ||
          lower.includes("carrera") ||
          lower.includes("dirección") ||
          lower.includes("domicilio") ||
          lower.includes("enviar a") ||
          lower.includes("nequi") ||
          lower.includes("bancolombia") ||
          lower.includes("efectivo") ||
          lower.includes("transferencia");

        if (isAddressOrPayment) {
          return currentConvs.map(c => {
            if (c.id !== conversationId) return c;
            const currentDraft = c.draftOrder || {
              items: [
                { productId: "prod-01", name: "Empanada de Carne Cortada a Cuchillo", quantity: 6, unitPrice: 5500, option: "Horneada" },
                { productId: "prod-07", name: "Gaseosa Cola 354ml", quantity: 2, unitPrice: 4500 },
                { productId: "extra-01", name: "Salsa Chimichurri Especial (120ml)", quantity: 1, unitPrice: 3500 },
              ],
              subtotal: 45500,
              deliveryFee: 0,
              total: 45500,
            };

            return {
              ...c,
              draftOrder: {
                ...currentDraft,
                deliveryAddress: "Calle 72 # 11-45 (Apto 402)",
                deliveryType: "domicilio",
                paymentMethod: "nequi",
              },
              status: "IA_ATENDIENDO" as const,
              lastMessageAt: replyTime,
              messages: [
                ...c.messages,
                {
                  id: `m-${Date.now()}`,
                  sender: "ia",
                  text: `¡Perfecto! Despacho agendado para: Calle 72 # 11-45 (Apto 402).\n\n**Datos de Transferencia Oficial:**\n• **Nequi / Daviplata:** 310 987 6543\n• **Bancolombia Ahorros:** 104-892134-55\n• **Titular:** Necto Gourmet S.A.S.\n• **Total:** $${currentDraft.total.toLocaleString("es-CO")} COP\n\nPor favor envíanos la captura de tu comprobante por aquí para validar el pago y enviar tu pedido a cocina.`,
                  timestamp: replyTime,
                },
              ],
            };
          });
        }

        // CASO 4: Pedido nuevo o solicitud de comida (Construye el borrador en el chat)
        const isOrderRequest =
          options?.isOrder ||
          lower.includes("quiero") ||
          lower.includes("pedir") ||
          lower.includes("empanada") ||
          lower.includes("combo") ||
          lower.includes("docena") ||
          lower.includes("hambre") ||
          lower.includes("ordenar");

        if (isOrderRequest) {
          const initialItems = [
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
          ];
          const subtotal = 42000;

          return currentConvs.map(c =>
            c.id === conversationId
              ? {
                  ...c,
                  draftOrder: {
                    items: initialItems,
                    subtotal,
                    deliveryFee: 0,
                    total: subtotal,
                  },
                  status: "IA_ATENDIENDO" as const,
                  lastMessageAt: replyTime,
                  messages: [
                    ...c.messages,
                    {
                      id: `m-${Date.now()}`,
                      sender: "ia",
                      text: `¡Hola ${customerName}! Te armé el borrador de tu pedido:\n\n• 6x Empanada de Carne a Cuchillo (Horneadas)\n• 2x Gaseosa Cola 354ml frías\n• Subtotal: $42.000 COP\n\n¿Te gustaría agregar alguna salsa especial de la casa (Chimichurri o Criolla por $3.500) o confirmamos la dirección de entrega?`,
                      timestamp: replyTime,
                    },
                  ],
                }
              : c
          );
        }

        // CASO 5: Disparadores Human-in-the-Loop (HITL)
        // 5a. Cliente solicita hablar con un operador humano
        if (
          lower.includes("humano") ||
          lower.includes("persona") ||
          lower.includes("asesor") ||
          lower.includes("operador") ||
          lower.includes("alguien real") ||
          lower.includes("atención humana") ||
          lower.includes("hablar con alguien")
        ) {
          if (isSoundEnabled) playUrgentAlertSound();
          return currentConvs.map(c =>
            c.id === conversationId
              ? {
                  ...c,
                  status: "REQUIERE_INTERVENCION" as const,
                  requiresHandoffReason: "CLIENTE_PIDE_HUMANO" as const,
                  lastMessageAt: replyTime,
                  unreadForOperator: true,
                  messages: [
                    ...c.messages,
                    {
                      id: `m-${Date.now()}`,
                      sender: "ia",
                      text: `¡Entendido, ${customerName}! Te estoy transfiriendo con un Administrador de nuestro equipo en vivo. En un momento un asesor tomará el control de este chat para asistirte.`,
                      timestamp: replyTime,
                    },
                  ],
                }
              : c
          );
        }

        // 5b. Reclamos, pedidos demorados o incidencias de calidad
        if (
          lower.includes("reclamo") ||
          lower.includes("queja") ||
          lower.includes("no llega") ||
          lower.includes("demorado") ||
          lower.includes("está frío") ||
          lower.includes("está fria") ||
          lower.includes("llegó frío") ||
          lower.includes("llegó mal") ||
          lower.includes("incompleto") ||
          lower.includes("pedido equivocado")
        ) {
          if (isSoundEnabled) playUrgentAlertSound();
          return currentConvs.map(c =>
            c.id === conversationId
              ? {
                  ...c,
                  status: "REQUIERE_INTERVENCION" as const,
                  requiresHandoffReason: "RECLAMO_INCIDENCIA" as const,
                  lastMessageAt: replyTime,
                  unreadForOperator: true,
                  messages: [
                    ...c.messages,
                    {
                      id: `m-${Date.now()}`,
                      sender: "ia",
                      text: `Lamentamos mucho el inconveniente, ${customerName}. He marcado este caso con máxima prioridad y transferido la conversación a la Administración para darte una solución inmediata.`,
                      timestamp: replyTime,
                    },
                  ],
                }
              : c
          );
        }

        // 5c. Solicitudes especiales, cotizaciones o facturación electrónica
        if (
          lower.includes("personalizada") ||
          lower.includes("modificación") ||
          lower.includes("descuento") ||
          lower.includes("50 personas") ||
          lower.includes("evento") ||
          lower.includes("factura electrónica") ||
          lower.includes("rut")
        ) {
          if (isSoundEnabled) playUrgentAlertSound();
          return currentConvs.map(c =>
            c.id === conversationId
              ? {
                  ...c,
                  status: "REQUIERE_INTERVENCION" as const,
                  requiresHandoffReason: "MODIFICACION_ESPECIAL" as const,
                  lastMessageAt: replyTime,
                  unreadForOperator: true,
                  messages: [
                    ...c.messages,
                    {
                      id: `m-${Date.now()}`,
                      sender: "ia",
                      text: `Para solicitudes especiales o corporativas (${lower.includes("factura") ? "Facturación Electrónica" : "Personalización de Comanda"}), he derivado tu consulta al Administrador para cotizar y validar directamente con cocina.`,
                      timestamp: replyTime,
                    },
                  ],
                }
              : c
          );
        }

        // CASO 6: Preguntas sobre Alérgenos, Tiempos o Carta
        if (
          lower.includes("alergia") ||
          lower.includes("alérgeno") ||
          lower.includes("cebolla") ||
          lower.includes("queso") ||
          lower.includes("celiaquia") ||
          lower.includes("gluten") ||
          lower.includes("tacc")
        ) {
          return currentConvs.map(c =>
            c.id === conversationId
              ? {
                  ...c,
                  status: "IA_ATENDIENDO" as const,
                  lastMessageAt: replyTime,
                  messages: [
                    ...c.messages,
                    {
                      id: `m-${Date.now()}`,
                      sender: "ia",
                      text: `¡Muy buena pregunta, ${customerName}!\n\nNuestras empanadas de carne a cuchillo y pollo al verdeo contienen cebolla salteada y masa de trigo tradicional. Si tienes intolerancia a los lácteos, te recomendamos las de carne o espinaca. Para celiaquía estricta, avísanos para activar el protocolo de horneado en bandeja sellada libre de trazas. ¿Deseas que te recomiende opciones según tus preferencias?`,
                      timestamp: replyTime,
                    },
                  ],
                }
              : c
          );
        }

        if (
          lower.includes("cuanto demora") ||
          lower.includes("tiempo") ||
          lower.includes("tardan") ||
          lower.includes("demora") ||
          lower.includes("hora")
        ) {
          return currentConvs.map(c =>
            c.id === conversationId
              ? {
                  ...c,
                  status: "IA_ATENDIENDO" as const,
                  lastMessageAt: replyTime,
                  messages: [
                    ...c.messages,
                    {
                      id: `m-${Date.now()}`,
                      sender: "ia",
                      text: `Nuestro tiempo promedio de entrega hoy es de **20 a 25 minutos** (10 min en horno de piedra + 15 min de traslado en moto). Si realizas tu pedido ahora, te llegará aproximadamente en 25 minutos. ¿Te gustaría ordenar?`,
                      timestamp: replyTime,
                    },
                  ],
                }
              : c
          );
        }

        // CASO 6: Respuesta general conversacional
        return currentConvs.map(c =>
          c.id === conversationId
            ? {
                ...c,
                status: "IA_ATENDIENDO" as const,
                lastMessageAt: replyTime,
                messages: [
                  ...c.messages,
                  {
                    id: `m-${Date.now()}`,
                    sender: "ia",
                    text: `¡Hola ${customerName}! Con gusto te atiendo. Estamos en turno de despacho con nuestro menú de empanadas gourmet, bebidas y combos ejecutivos. ¿Deseas hacer un pedido para entrega inmediata o consultar nuestra carta?`,
                    timestamp: replyTime,
                  },
                ],
              }
            : c
        );
      });
    }, 600);
  };

  const simulateAIReply = (conversationId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const timeStr = nowTime();
    setConversations(prev =>
      prev.map(conv => {
        if (conv.id !== conversationId) return conv;
        // La IA sólo responde si tiene el control (exclusión mutua con el humano).
        if (conv.status !== "IA_ATENDIENDO") return conv;
        return {
          ...conv,
          lastMessageAt: timeStr,
          messages: [
            ...conv.messages,
            { id: `m-${Date.now()}`, sender: "ia", text: trimmed, timestamp: timeStr },
          ],
        };
      })
    );
  };

  const openWhatsAppConversation = (orderIdOrConvId: string) => {
    // 1. Find existing conversation by conv ID or order ID
    let targetConv = conversations.find(
      c => c.id === orderIdOrConvId || c.orderId === orderIdOrConvId
    );

    // 2. If not found by direct ID, search by order customer phone or name
    const relatedOrder = allOrders.find(o => o.id === orderIdOrConvId);
    if (!targetConv && relatedOrder) {
      targetConv = conversations.find(
        c =>
          (c.customerPhone && relatedOrder.customerPhone && c.customerPhone.replace(/\D/g, "") === relatedOrder.customerPhone.replace(/\D/g, "")) ||
          c.customerName.toLowerCase() === relatedOrder.customerName.toLowerCase()
      );
    }

    // 3. If still not found, create a realistic new conversation dynamically from the order details
    if (!targetConv && relatedOrder) {
      const newConvId = `CONV-${relatedOrder.id}`;
      const newConv: Conversation = {
        id: newConvId,
        customerName: relatedOrder.customerName,
        customerPhone: relatedOrder.customerPhone || "+54 11 0000-0000",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
        channel: "whatsapp",
        status: "IA_ATENDIENDO",
        controlledBy: null,
        aiConfidence: relatedOrder.aiConfidence || "Alta",
        orderId: relatedOrder.id,
        lastMessageAt: relatedOrder.createdAt || "18:30",
        unreadForOperator: false,
        messages: [
          {
            id: `m-init-1`,
            sender: "cliente",
            text: relatedOrder.aiRawMessage || `Hola! Queremos: ${relatedOrder.items.map(i => `${i.quantity}× ${i.name}`).join(", ")} porfa.`,
            timestamp: relatedOrder.createdAt || "18:28",
          },
          {
            id: `m-init-2`,
            sender: "ia",
            text: `¡Hola ${relatedOrder.customerName}! Registrado con gusto:\n${relatedOrder.items.map(i => `• ${i.quantity}× ${i.name} ${i.option ? `(${i.option})` : ""}`).join("\n")}\n\nTotal: $${relatedOrder.total.toLocaleString("es-CO")} COP\n${relatedOrder.customerAddress ? `Dirección: ${relatedOrder.customerAddress}\n` : ""}Tu comanda #${relatedOrder.id} está registrada en el sistema.`,
            timestamp: relatedOrder.createdAt || "18:29",
          },
        ],
        handoffHistory: [],
      };
      setConversations(prev => [newConv, ...prev]);
      targetConv = newConv;
    }

    const convId = targetConv ? targetConv.id : orderIdOrConvId;
    setSelectedConversationId(convId);
    setSelectedOrderId(null);
    setAiModalOrder(null);

    // Notify application to navigate to WhatsApp tab
    window.dispatchEvent(
      new CustomEvent("necto_navigate_pedidos", {
        detail: { section: "operacion", opTab: "conversaciones", conversationId: convId },
      })
    );
  };

  const sendWhatsAppStatusAlert = (orderId: string, customMessage: string) => {
    const targetOrder = allOrders.find(o => o.id === orderId);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    setConversations(prevConvs =>
      prevConvs.map(c => {
        if (
          c.orderId === orderId ||
          (targetOrder && c.customerPhone && targetOrder.customerPhone && c.customerPhone.replace(/\D/g, "") === targetOrder.customerPhone.replace(/\D/g, "")) ||
          (targetOrder && c.customerName.toLowerCase() === targetOrder.customerName.toLowerCase())
        ) {
          const newMsg: ChatMessage = {
            id: `m-alert-${Date.now()}`,
            sender: "ia",
            text: customMessage,
            timestamp: timeStr,
          };
          return {
            ...c,
            lastMessageAt: timeStr,
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );
  };

  return (
    <PedidosContext.Provider
      value={{
        orders,
        historialOrders,
        allOrders,
        programados,
        products,
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
        addIngredient,
        updateIngredient,
        deleteIngredient,
        registerStockMovement,
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
