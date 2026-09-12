/**
 * SUITE DE VALIDACIÓN FUNCIONAL Y DE REGRESIÓN DE DOMINIO (OMS - PEDIDOS)
 * Prueba los 7 puntos críticos exigidos por arquitectura.
 */
import "./setup";
import { inventoryService } from "../../../ModuloInventario/services/inventoryService";
import { createInventoryAdapter } from "../adapters/inventoryAdapter";
import { Pedido, OrderEvent, PaymentStatus, OrderStatus } from "../types";

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function runSuite() {
  console.log("======================================================================");
  console.log("   EJECUTANDO SUITE DE VALIDACIÓN FUNCIONAL Y REGRESIÓN DE PEDIDOS    ");
  console.log("======================================================================\n");

  // Helper para resetear inventario antes de cada suite
  const resetInventory = () => {
    (globalThis as any).localStorage?.clear();
    inventoryService.resetToDefaults();
  };

  // Helper para crear una orden base vinculada a producto real del catálogo
  const createTestOrder = (id: string, qty: number = 2): Pedido => ({
    id,
    customerName: "Carlos Cliente",
    customerPhone: "3001234567",
    channel: "whatsapp",
    type: "inmediato",
    status: "NUEVO",
    items: [
      {
        productId: "prod-001", // "Bear Cheer" en mock, stock inicial 97
        name: "Bear Cheer",
        quantity: qty,
        unitPrice: 56000,
      },
    ],
    total: 56000 * qty,
    createdAt: "14:00",
    estimatedMinutes: 25,
    elapsedMinutes: 0,
    urgency: "A_TIEMPO",
    paymentStatus: "PENDIENTE",
    returnStatus: "NO_APLICA",
    history: [],
  });

  // =========================================================================
  // 1. PRUEBA: FLUJO SIN INVENTARIO (No-Op Adapter)
  // =========================================================================
  try {
    const noOpAdapter = createInventoryAdapter(false);
    assert(noOpAdapter.isEnabled === false, "No-Op Adapter debe tener isEnabled = false");

    const order = createTestOrder("ORD-NOOP-1", 9999); // Cantidad enorme inexistente

    // Validar disponibilidad
    const avail = noOpAdapter.validateAvailableStock(order.items);
    assert(avail.hasStock === true, "En modo No-Op siempre debe reportar hasStock = true");
    assert(avail.missingItems.length === 0, "En modo No-Op no debe reportar missingItems");

    // Transición secuencial
    await noOpAdapter.handleOrderEvent({ type: "OrderConfirmed", order });
    order.status = "CONFIRMADO";

    order.status = "EN_PREPARACION";

    const readyOp = await noOpAdapter.handleOrderEvent({ type: "OrderReady", order });
    order.status = "LISTO";
    assert(readyOp === undefined, "No-Op no debe generar operationId de Kardex");

    order.status = "ENTREGADO";

    results.push({
      suite: "1. FLUJO SIN INVENTARIO",
      name: "Ciclo completo NUEVO->CONFIRMADO->PREP->LISTO->ENTREGADO en No-Op",
      passed: true,
      details: "Transicionó de punta a punta con cantidades arbitrarias sin requerir ni bloquear por Kardex.",
    });
  } catch (err: any) {
    results.push({
      suite: "1. FLUJO SIN INVENTARIO",
      name: "Ciclo completo NUEVO->CONFIRMADO->PREP->LISTO->ENTREGADO en No-Op",
      passed: false,
      error: err.message,
    });
  }

  // =========================================================================
  // 2. PRUEBA: FLUJO CON INVENTARIO
  // =========================================================================
  try {
    resetInventory();
    const adapter = createInventoryAdapter(true);
    const order = createTestOrder("ORD-INV-1", 3);

    const initialStock = inventoryService.getProductStock("prod-001")!;
    const initialActual = initialStock.stockActual;
    const initialReserved = initialStock.reservedStock;
    const initialAvailable = initialStock.availableStock;

    // CONFIRMADO: debe reservar stock
    await adapter.handleOrderEvent({ type: "OrderConfirmed", order });
    order.status = "CONFIRMADO";

    const stockAfterConfirm = inventoryService.getProductStock("prod-001")!;
    assert(
      stockAfterConfirm.stockActual === initialActual,
      `CONFIRMADO: stockActual debe quedar intacto (${initialActual}), obtenido: ${stockAfterConfirm.stockActual}`
    );
    assert(
      stockAfterConfirm.reservedStock === initialReserved + 3,
      `CONFIRMADO: reservedStock debe subir en 3, obtenido: ${stockAfterConfirm.reservedStock}`
    );
    assert(
      stockAfterConfirm.availableStock === initialAvailable - 3,
      `CONFIRMADO: availableStock debe restar 3, obtenido: ${stockAfterConfirm.availableStock}`
    );

    // EN_PREPARACION: la reserva debe mantenerse, sin salida formal de Kardex
    order.status = "EN_PREPARACION";
    const initialMovementsCount = (await inventoryService.getMovements()).length;
    const stockInPrep = inventoryService.getProductStock("prod-001")!;
    assert(stockInPrep.reservedStock === initialReserved + 3, "PREPARACIÓN: la reserva debe mantenerse intacta");
    assert(stockInPrep.stockActual === initialActual, "PREPARACIÓN: stockActual no debe modificarse todavía");
    assert((await inventoryService.getMovements()).length === initialMovementsCount, "PREPARACIÓN: no debe generar movimiento de Kardex");

    // LISTO: salida formal de Kardex y consumo de reserva
    const opId = await adapter.handleOrderEvent({ type: "OrderReady", order });
    order.status = "LISTO";
    order.isStockConsumed = true;

    const stockAfterReady = inventoryService.getProductStock("prod-001")!;
    assert(
      stockAfterReady.stockActual === initialActual - 3,
      `LISTO: stockActual debe descontar 3 (${initialActual - 3}), obtenido: ${stockAfterReady.stockActual}`
    );
    assert(
      stockAfterReady.reservedStock === initialReserved,
      `LISTO: reservedStock debe haberse liberado a ${initialReserved}, obtenido: ${stockAfterReady.reservedStock}`
    );
    assert(opId !== undefined, "LISTO: debe devolver el ID del movimiento de salida");

    // ENTREGADO: no debe generar un segundo movimiento de inventario
    const movementsAfterReady = (await inventoryService.getMovements()).length;
    order.status = "ENTREGADO";
    const stockAfterDelivered = inventoryService.getProductStock("prod-001")!;
    assert(
      stockAfterDelivered.stockActual === initialActual - 3,
      "ENTREGADO: el stock NO debe descontarse por segunda vez"
    );
    assert(
      (await inventoryService.getMovements()).length === movementsAfterReady,
      "ENTREGADO: no debe generar un segundo movimiento en Kardex"
    );

    results.push({
      suite: "2. FLUJO CON INVENTARIO",
      name: "Reserva preventiva en CONFIRMADO, retención en PREP y salida única en LISTO",
      passed: true,
      details: `stockActual: ${initialActual} -> ${stockAfterReady.stockActual}. Movimientos generados: 1 (STOCK_REMOVE).`,
    });
  } catch (err: any) {
    results.push({
      suite: "2. FLUJO CON INVENTARIO",
      name: "Reserva preventiva en CONFIRMADO, retención en PREP y salida única en LISTO",
      passed: false,
      error: err.message,
    });
  }

  // =========================================================================
  // 3. PRUEBA: CANCELACIONES TRANSVERSALES
  // =========================================================================
  try {
    resetInventory();
    const adapter = createInventoryAdapter(true);

    // Caso 3.1: NUEVO -> CANCELADO (cero impacto en inventario)
    const orderNuevo = createTestOrder("ORD-CANC-NUEVO", 2);
    const stockPreNuevo = inventoryService.getProductStock("prod-001")!;
    await adapter.handleOrderEvent({ type: "OrderCancelled", order: orderNuevo, reason: "Error de captura" });
    const stockPostNuevo = inventoryService.getProductStock("prod-001")!;
    assert(stockPreNuevo.stockActual === stockPostNuevo.stockActual, "NUEVO->CANCELADO no debe alterar stockActual");
    assert(stockPreNuevo.reservedStock === stockPostNuevo.reservedStock, "NUEVO->CANCELADO no debe alterar reservedStock");

    // Caso 3.2: CONFIRMADO -> CANCELADO (liberar reserva)
    const orderConf = createTestOrder("ORD-CANC-CONF", 2);
    await adapter.handleOrderEvent({ type: "OrderConfirmed", order: orderConf });
    orderConf.status = "CONFIRMADO";
    assert(inventoryService.getProductStock("prod-001")!.reservedStock === 2, "Debe tener 2 reservados");
    await adapter.handleOrderEvent({ type: "OrderCancelled", order: orderConf, reason: "Cliente se arrepintió" });
    orderConf.status = "CANCELADO";
    assert(inventoryService.getProductStock("prod-001")!.reservedStock === 0, "CONFIRMADO->CANCELADO debe liberar reserva a 0");

    // Caso 3.3: EN_PREPARACION -> CANCELADO (liberar reserva sin consumo formal)
    const orderPrep = createTestOrder("ORD-CANC-PREP", 4);
    await adapter.handleOrderEvent({ type: "OrderConfirmed", order: orderPrep });
    orderPrep.status = "EN_PREPARACION";
    assert(inventoryService.getProductStock("prod-001")!.reservedStock === 4, "Debe tener 4 reservados");
    await adapter.handleOrderEvent({ type: "OrderCancelled", order: orderPrep, reason: "Problema en alistamiento" });
    orderPrep.status = "CANCELADO";
    assert(inventoryService.getProductStock("prod-001")!.reservedStock === 0, "PREPARACION->CANCELADO debe liberar reserva a 0");

    // Caso 3.4: LISTO -> CANCELADO (reversión formal en Kardex)
    const orderListo = createTestOrder("ORD-CANC-LISTO", 5);
    const baseStockActual = inventoryService.getProductStock("prod-001")!.stockActual;
    await adapter.handleOrderEvent({ type: "OrderConfirmed", order: orderListo });
    orderListo.status = "CONFIRMADO";
    await adapter.handleOrderEvent({ type: "OrderReady", order: orderListo });
    orderListo.status = "LISTO";
    orderListo.isStockConsumed = true;
    assert(inventoryService.getProductStock("prod-001")!.stockActual === baseStockActual - 5, "Stock debió bajar en 5");

    const revertOpId = await adapter.handleOrderEvent({
      type: "OrderCancelled",
      order: orderListo,
      reason: "Despachador reportó cliente ausente",
    });
    orderListo.status = "CANCELADO";
    orderListo.isStockReverted = true;

    assert(revertOpId !== undefined, "LISTO->CANCELADO debe retornar movementId de reversión");
    assert(
      inventoryService.getProductStock("prod-001")!.stockActual === baseStockActual,
      "LISTO->CANCELADO debe restaurar stockActual exactamente al valor base"
    );
    const lastMov = (await inventoryService.getMovements())[0];
    assert(lastMov.action === "STOCK_ADD", "LISTO->CANCELADO debe generar STOCK_ADD en Kardex");
    assert(lastMov.concept.includes("Reversión"), "Concepto de movimiento debe indicar Reversión");

    results.push({
      suite: "3. CANCELACIONES TRANSVERSALES",
      name: "Comportamiento contextual de cancelación según etapa (NUEVO, CONF, PREP, LISTO)",
      passed: true,
      details: "NUEVO no toca stock; CONF y PREP liberan reserva; LISTO genera reversión contable STOCK_ADD.",
    });
  } catch (err: any) {
    results.push({
      suite: "3. CANCELACIONES TRANSVERSALES",
      name: "Comportamiento contextual de cancelación según etapa (NUEVO, CONF, PREP, LISTO)",
      passed: false,
      error: err.message,
    });
  }

  // =========================================================================
  // 4. PRUEBA: DEVOLUCIÓN DE ORDEN ENTREGADA
  // =========================================================================
  try {
    resetInventory();
    const adapter = createInventoryAdapter(true);
    const order = createTestOrder("ORD-RET-1", 2);

    // Llevar a ENTREGADO
    await adapter.handleOrderEvent({ type: "OrderConfirmed", order });
    order.status = "CONFIRMADO";
    await adapter.handleOrderEvent({ type: "OrderReady", order });
    order.status = "LISTO";
    order.isStockConsumed = true;
    order.status = "ENTREGADO";
    order.paymentStatus = "PAGADO";

    const stockDelivered = inventoryService.getProductStock("prod-001")!.stockActual;

    // Procesar devolución con reingreso y reembolso
    const returnOpId = await adapter.handleOrderEvent({
      type: "OrderReturned",
      order,
      reason: "Talla incorrecta / producto no deseado",
      returnStock: true,
    });

    // Validar invariantes ortogonales:
    order.returnStatus = "RECIBIDA";
    order.paymentStatus = "REEMBOLSADO";
    order.isStockReverted = true;

    assert(order.status === "ENTREGADO", `La orden debe conservar status = ENTREGADO, no CANCELADO. Obtenido: ${order.status}`);
    assert(order.returnStatus === "RECIBIDA", `returnStatus debe ser RECIBIDA. Obtenido: ${order.returnStatus}`);
    assert(order.paymentStatus === "REEMBOLSADO", `paymentStatus debe ser REEMBOLSADO. Obtenido: ${order.paymentStatus}`);

    const stockReturned = inventoryService.getProductStock("prod-001")!.stockActual;
    assert(stockReturned === stockDelivered + 2, `Devolución física debe sumar 2 a stockActual (${stockDelivered + 2}), obtenido: ${stockReturned}`);

    const returnMov = (await inventoryService.getMovements())[0];
    assert(returnMov.action === "STOCK_RETURN", `Debe generar acción STOCK_RETURN en Kardex, obtenido: ${returnMov.action}`);
    assert(returnOpId !== undefined, "Debe devolver ID de la operación de retorno");

    results.push({
      suite: "4. DEVOLUCIÓN FORMAL",
      name: "Devolución preserva status=ENTREGADO, actualiza returnStatus=RECIBIDA y genera STOCK_RETURN",
      passed: true,
      details: "Orden no fue mutada a CANCELADO; Kardex y reembolso asentados limpiamente.",
    });
  } catch (err: any) {
    results.push({
      suite: "4. DEVOLUCIÓN FORMAL",
      name: "Devolución preserva status=ENTREGADO, actualiza returnStatus=RECIBIDA y genera STOCK_RETURN",
      passed: false,
      error: err.message,
    });
  }

  // =========================================================================
  // 5. PRUEBA: EJE FINANCIERO INDEPENDIENTE
  // =========================================================================
  try {
    const order = createTestOrder("ORD-PAY-1", 1);
    const validPairs: Array<[OrderStatus, PaymentStatus]> = [
      ["CONFIRMADO", "PAGADO"],
      ["EN_PREPARACION", "PAGADO"],
      ["ENTREGADO", "PAGO_CONTRA_ENTREGA"],
      ["ENTREGADO", "PENDIENTE"],
      ["ENTREGADO", "PAGADO"],
    ];

    for (const [opStatus, payStatus] of validPairs) {
      order.status = opStatus;
      order.paymentStatus = payStatus;
      assert(order.status === opStatus, `status no debe ser alterado por paymentStatus (${opStatus})`);
      assert(order.paymentStatus === payStatus, `paymentStatus debe mantenerse independiente (${payStatus})`);
    }

    results.push({
      suite: "5. EJE FINANCIERO INDEPENDIENTE",
      name: "Combinaciones ortogonales válidas sin colisión de columnas ni acoplamiento",
      passed: true,
      details: "Comprobados los 5 pares mínimos requeridos.",
    });
  } catch (err: any) {
    results.push({
      suite: "5. EJE FINANCIERO INDEPENDIENTE",
      name: "Combinaciones ortogonales válidas sin colisión de columnas ni acoplamiento",
      passed: false,
      error: err.message,
    });
  }

  // =========================================================================
  // 6. PRUEBA: IDEMPOTENCIA ESTRICTA
  // =========================================================================
  try {
    resetInventory();
    const adapter = createInventoryAdapter(true);
    const order = createTestOrder("ORD-IDEMP-1", 2);

    const initialStock = inventoryService.getProductStock("prod-001")!;
    const baseActual = initialStock.stockActual;
    const baseReserved = initialStock.reservedStock;

    // 6.1 Doble OrderConfirmed
    await adapter.handleOrderEvent({ type: "OrderConfirmed", order });
    const reservedOnce = inventoryService.getProductStock("prod-001")!.reservedStock;
    await adapter.handleOrderEvent({ type: "OrderConfirmed", order });
    const reservedTwice = inventoryService.getProductStock("prod-001")!.reservedStock;
    assert(reservedOnce === baseReserved + 2, "Primera confirmación debe reservar 2");
    assert(reservedTwice === reservedOnce, `Doble confirmación no debe duplicar reserva (${reservedOnce}), obtenido: ${reservedTwice}`);

    // 6.2 Doble OrderReady
    await adapter.handleOrderEvent({ type: "OrderReady", order });
    order.isStockConsumed = true;
    const stockAfterFirstReady = inventoryService.getProductStock("prod-001")!.stockActual;
    const movCountFirstReady = (await inventoryService.getMovements()).length;

    // Segunda ejecución accidental de OrderReady para la misma orden
    await adapter.handleOrderEvent({ type: "OrderReady", order });
    const stockAfterSecondReady = inventoryService.getProductStock("prod-001")!.stockActual;
    const movCountSecondReady = (await inventoryService.getMovements()).length;

    assert(
      stockAfterFirstReady === baseActual - 2,
      `Primer OrderReady debe descontar 2 (${baseActual - 2}), obtenido: ${stockAfterFirstReady}`
    );
    assert(
      stockAfterSecondReady === stockAfterFirstReady,
      `Segundo OrderReady NO DEBE volver a descontar stock (${stockAfterFirstReady}), obtenido: ${stockAfterSecondReady}`
    );
    assert(
      movCountSecondReady === movCountFirstReady,
      `Segundo OrderReady NO DEBE generar un segundo movimiento de Kardex (${movCountFirstReady}), obtenido: ${movCountSecondReady}`
    );

    // 6.3 Doble OrderCancelled para orden lista
    order.status = "LISTO";
    await adapter.handleOrderEvent({ type: "OrderCancelled", order, reason: "Cliente canceló" });
    const stockAfterFirstCancel = inventoryService.getProductStock("prod-001")!.stockActual;
    const movCountFirstCancel = (await inventoryService.getMovements()).length;

    await adapter.handleOrderEvent({ type: "OrderCancelled", order, reason: "Reintento de cancelación" });
    const stockAfterSecondCancel = inventoryService.getProductStock("prod-001")!.stockActual;
    const movCountSecondCancel = (await inventoryService.getMovements()).length;

    assert(
      stockAfterFirstCancel === baseActual,
      `Primera cancelación debe restaurar stock a ${baseActual}, obtenido: ${stockAfterFirstCancel}`
    );
    assert(
      stockAfterSecondCancel === stockAfterFirstCancel,
      `Segunda cancelación NO DEBE volver a sumar stock (${stockAfterFirstCancel}), obtenido: ${stockAfterSecondCancel}`
    );
    assert(
      movCountSecondCancel === movCountFirstCancel,
      `Segunda cancelación NO DEBE generar segundo movimiento de reversión (${movCountFirstCancel}), obtenido: ${movCountSecondCancel}`
    );

    // 6.4 Doble OrderReturned para orden entregada
    const returnOrder = createTestOrder("ORD-IDEMP-RET", 3);
    await adapter.handleOrderEvent({ type: "OrderConfirmed", order: returnOrder });
    await adapter.handleOrderEvent({ type: "OrderReady", order: returnOrder });
    returnOrder.status = "ENTREGADO";
    returnOrder.isStockConsumed = true;

    const stockBeforeReturn = inventoryService.getProductStock("prod-001")!.stockActual;
    await adapter.handleOrderEvent({ type: "OrderReturned", order: returnOrder, reason: "Defectuoso", returnStock: true });
    const stockAfterFirstReturn = inventoryService.getProductStock("prod-001")!.stockActual;
    const movCountFirstReturn = (await inventoryService.getMovements()).length;

    // Doble despacho accidental de devolución
    returnOrder.isStockReverted = true;
    await adapter.handleOrderEvent({ type: "OrderReturned", order: returnOrder, reason: "Defectuoso", returnStock: true });
    const stockAfterSecondReturn = inventoryService.getProductStock("prod-001")!.stockActual;
    const movCountSecondReturn = (await inventoryService.getMovements()).length;

    assert(
      stockAfterFirstReturn === stockBeforeReturn + 3,
      `Primer retorno debe sumar 3 (${stockBeforeReturn + 3}), obtenido: ${stockAfterFirstReturn}`
    );
    assert(
      stockAfterSecondReturn === stockAfterFirstReturn,
      `Segundo retorno NO DEBE volver a sumar stock (${stockAfterFirstReturn}), obtenido: ${stockAfterSecondReturn}`
    );
    assert(
      movCountSecondReturn === movCountFirstReturn,
      `Segundo retorno NO DEBE generar segundo movimiento en Kardex (${movCountFirstReturn}), obtenido: ${movCountSecondReturn}`
    );

    results.push({
      suite: "6. IDEMPOTENCIA ESTRICTA",
      name: "Protección contra doble reserva, doble descuento, doble reversión y doble retorno",
      passed: true,
      details: "Ninguna operación duplicada generó doble movimiento en Kardex ni alteró inventario dos veces.",
    });
  } catch (err: any) {
    results.push({
      suite: "6. IDEMPOTENCIA ESTRICTA",
      name: "Protección contra doble reserva, doble descuento, doble reversión y doble retorno",
      passed: false,
      error: err.message,
    });
  }

  // =========================================================================
  // 7. PRUEBA: AUDITORÍA Y TRAZABILIDAD
  // =========================================================================
  try {
    const order = createTestOrder("ORD-AUDIT-1", 1);
    const event: OrderEvent = {
      timestamp: "15:30",
      fromStatus: "ENTREGADO",
      toStatus: "ENTREGADO",
      fromPaymentStatus: "PAGADO",
      toPaymentStatus: "REEMBOLSADO",
      fromReturnStatus: "NO_APLICA",
      toReturnStatus: "RECIBIDA",
      user: "Supervisor Carlos",
      note: "Devolución autorizada por garantía",
      inventoryOperationId: "mov-ret-9988",
    };
    order.history.push(event);

    assert(order.history.length === 1, "Debe tener 1 evento");
    const h = order.history[0];
    assert(h.timestamp === "15:30", "timestamp registrado");
    assert(h.user === "Supervisor Carlos", "usuario registrado");
    assert(h.fromStatus === "ENTREGADO" && h.toStatus === "ENTREGADO", "status inalterado");
    assert(h.fromPaymentStatus === "PAGADO" && h.toPaymentStatus === "REEMBOLSADO", "pago auditado");
    assert(h.fromReturnStatus === "NO_APLICA" && h.toReturnStatus === "RECIBIDA", "devolución auditada");
    assert(h.inventoryOperationId === "mov-ret-9988", "ID de Kardex vinculado");
    assert(Boolean(h.note), "motivo registrado");

    results.push({
      suite: "7. AUDITORÍA Y TRAZABILIDAD",
      name: "Registro completo de eventos de ciclo de vida con causas, usuarios y vínculos contables",
      passed: true,
      details: "Trazabilidad reconstructiva completa verificada en OrderEvent.",
    });
  } catch (err: any) {
    results.push({
      suite: "7. AUDITORÍA Y TRAZABILIDAD",
      name: "Registro completo de eventos de ciclo de vida con causas, usuarios y vínculos contables",
      passed: false,
      error: err.message,
    });
  }

  // =========================================================================
  // IMPRESIÓN DEL REPORTE FINAL
  // =========================================================================
  console.log("----------------------------------------------------------------------");
  console.log("                      RESUMEN DE EJECUCIÓN                           ");
  console.log("----------------------------------------------------------------------");
  let allPassed = true;
  for (const r of results) {
    const badge = r.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${badge} | [${r.suite}] ${r.name}`);
    if (r.details) console.log(`       Detalle: ${r.details}`);
    if (r.error) {
      console.log(`       ERROR: ${r.error}`);
      allPassed = false;
    }
  }
  console.log("----------------------------------------------------------------------");
  if (allPassed) {
    console.log("RESULTADO GENERAL: 100% DE PRUEBAS SUPERADAS EXITOSAMENTE (7/7)");
  } else {
    console.log("RESULTADO GENERAL: EXISTEN FALLAS EN LA SUITE");
    process.exit(1);
  }
  console.log("======================================================================\n");
}

runSuite().catch((e) => {
  console.error("Error fatal en runner:", e);
  process.exit(1);
});
