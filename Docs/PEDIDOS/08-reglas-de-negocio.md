# 08. Reglas de Negocio del Módulo Pedidos

Este documento especifica todas las reglas de negocio formalmente codificadas en **StockFlow (Módulo Pedidos)**, diferenciando las reglas activas de aquellas planificadas o sugeridas.

---

## 8.1 Matriz de Reglas de Negocio Implementadas

| Identificador | Nombre de la Regla | Módulo / Archivo Fuente | Severidad / Cumplimiento |
|---|---|---|---|
| **RN-01** | Progresión Unidireccional de Estados | `PedidosContext.tsx`, `types.ts` | Obligatoria (Estricta) |
| **RN-02** | Justificación Obligatoria de Cancelación | `PedidosContext.tsx` (`cancelOrder`) | Obligatoria |
| **RN-03** | Generación de Incidencia en Cancelación | `PedidosContext.tsx` (`cancelOrder`) | Obligatoria |
| **RN-04** | Asignación de Turno de Cocina | `PedidosContext.tsx` (`transitionOrder`) | Automática |
| **RN-05** | Consumo Idempotente de Stock Kardex | `PedidosContext.tsx`, `inventoryService.ts` | Obligatoria |
| **RN-06** | Pausa Automática de Catálogo por Quiebre | `PedidosContext.tsx` (`registerStockMovement`) | Automática |
| **RN-07** | Cálculo Semafórico de Urgencia | `types.ts`, `PedidosContext.tsx` | Automática |
| **RN-08** | Exclusión Mutua en Atención Chat (HITL) | `PedidosContext.tsx` (`sendOperatorMessage`) | Obligatoria |
| **RN-09** | Escalado Automático por Disparadores | `PedidosContext.tsx` (`simulateCustomerMessage`) | Automática |
| **RN-10** | Notificación Omnicanal por Estado | `PedidosContext.tsx` (`transitionOrder`) | Automática |
| **RN-11** | Modulación de Ritmo de Tienda | `PedidosContext.tsx` (`setStorePace`) | Configurable |
| **RN-12** | Cálculo Dinámico de Capacidad de Turno | `PedidosContext.tsx` (`updateStaffStatus`) | Automática |

---

## 8.2 Detalle de Reglas Implementadas en Código

### RN-01: Progresión Unidireccional de Estados
* **Definición**: Un pedido no puede retroceder en su ciclo de vida natural (`NUEVO` → `CONFIRMADO` → `EN_PREPARACION` → `LISTO` → `FINALIZADO`).
* **Restricción**: Una comanda en estado `FINALIZADO`, `RECHAZADO` o `CANCELADO` es inmutable; no admite transiciones adicionales.
* **Excepciones**: Si una comanda entra por inyección directa de pedidos programados (`injectScheduledOrderToLive`), puede saltar directo de `PROGRAMADO` a `EN_PREPARACION`.

---

### RN-02 y RN-03: Cancelación Justificada e Incidencias Críticas
* **Definición**: La cancelación de cualquier pedido que ya haya sido confirmado exige obligatoriamente registrar un motivo textual (`reason`).
* **Efecto en el Sistema**: Al cancelar:
  1. El pedido pasa a `status = "CANCELADO"`.
  2. Se ejecuta `addIncidencia`:
     * `severity`: `"Alta"`.
     * `type`: `"cancelacion"`.
     * `description`: `"Motivo de cancelación registrado: {reason}"`.
  3. Se notifica al cliente vía WhatsApp informando la anulación de la comanda.

---

### RN-04: Asignación de Turno de Comanda
* **Definición**: Al transicionar un pedido de `NUEVO` a `CONFIRMADO`, el sistema comprueba si el pedido ya tiene un `turnNumber`. Si no lo tiene, genera automáticamente un número entero aleatorio del 1 al 30:
  ```typescript
  let newTurn = order.turnNumber;
  if (toStatus === "CONFIRMADO" && !order.turnNumber) {
    newTurn = Math.floor(Math.random() * 30) + 1;
  }
  ```
* **Propósito**: Proveer al personal de cocina y al cliente un identificador de llamado corto para despacho y ticket térmico.

---

### RN-05: Consumo Idempotente de Stock Kardex (ERP Maestro + Insumos Locales)
* **Definición**: El descuento de existencias físicas se activa cuando el pedido ingresa a fase productiva (`EN_PREPARACION`, `LISTO` o `FINALIZADO`), pero **debe ejecutarse exactamente una sola vez**.
* **Mecanismo de Salvaguarda**:
  ```typescript
  const isProgressiveProduction = ["EN_PREPARACION", "LISTO", "FINALIZADO"].includes(toStatus);
  const shouldConsumeStock = isProgressiveProduction && !order.isStockConsumed;
  if (shouldConsumeStock) {
    consumeStockForOrder(order);
  }
  ```
  La bandera `order.isStockConsumed = true` previene descuentos duplicados si el pedido pasa de `EN_PREPARACION` a `LISTO`.
* **Descuento Dual**:
  1. **Nivel Maestro**: Descuenta unidades en `inventoryService.consumeSaleOrder` con concepto `Venta Automática Pedido #{id}`.
  2. **Nivel Escandallo**: Si el plato tiene receta (`recipe`), descuenta `rec.quantityRequired * orderItem.quantity` en `StockIngredientItem` bajo el tipo de movimiento `VENTA_PEDIDO`.

---

### RN-06: Pausa Automática en Catálogo por Quiebre de Stock
* **Definición**: Cuando el stock de un insumo crítico cae a 0 (`currentStock <= 0`):
  1. El insumo cambia a estado `"AGOTADO"`.
  2. El sistema recorre todos los platos del catálogo que requieran dicho insumo en su `recipe`.
  3. Si el plato tiene activada la bandera `autoPauseOnStockOut: true` y actualmente está disponible (`isAvailable: true`), el sistema invoca `toggleProductAvailability(p.id)` inhabilitando el plato para la venta.
  4. Se registra una incidencia operativa de severidad `"Alta"` por quiebre de stock.

---

### RN-07: Semáforo de Urgencia en Cocina
* **Definición**: Cada comanda evalúa su urgencia comparando los minutos transcurridos (`elapsedMinutes`) contra los minutos estimados (`estimatedMinutes`):
  * **`A_TIEMPO`**: `elapsedMinutes < estimatedMinutes - 5`
  * **`PROXIMO`**: `elapsedMinutes >= estimatedMinutes - 5` y `elapsedMinutes <= estimatedMinutes`
  * **`RETRASADO`**: `elapsedMinutes > estimatedMinutes`

---

### RN-08: Exclusión Mutua en Atención Conversacional (HITL)
* **Definición**: En el hilo de chat de WhatsApp, una conversación solo puede ser atendida por una entidad a la vez:
  * Si `status === "HUMANO_ATENDIENDO"`: El bot de IA se silencia completamente. Solo el operador humano cuyo nombre coincide con `controlledBy` puede enviar mensajes al cliente.
  * Si `status === "IA_ATENDIENDO"`: La IA responde de forma autónoma.
  * Si un operador pulsa *"Tomar Control"*, la conversación pasa a `HUMANO_ATENDIENDO` y `controlledBy` se fija al operador actual.

---

### RN-09: Disparadores de Escalado a Humano (Handoff Triggers)
* **Definición**: La IA transiciona el chat a `REQUIERE_INTERVENCION` y dispara sonido de alerta urgente (`playUrgentAlertSound`) cuando:
  1. El cliente envía un comprobante o habla de transferencia bancaria (`VERIFICAR_PAGO_TRANSFERENCIA`).
  2. El cliente solicita explícitamente hablar con una persona (`CLIENTE_PIDE_HUMANO`).
  3. El cliente manifiesta quejas de demoras o pedidos fríos (`RECLAMO_INCIDENCIA`).
  4. El cliente solicita cotizaciones corporativas, eventos o facturación electrónica con RUT (`MODIFICACION_ESPECIAL`).

---

### RN-10: Notificaciones Automáticas Omnicanal a WhatsApp
* **Definición**: Si el pedido posee canal `whatsapp`, cada transición de estado en el Kanban o KDS genera un mensaje automatizado al hilo de chat del cliente:
  * `CONFIRMADO`: *"¡Tu pedido #{id} fue confirmado! En breve entra a preparación en cocina."*
  * `EN_PREPARACION`: *"Tu comanda #{id} ya ingresó al horno de cocina y se está preparando."*
  * `LISTO`: *"¡Tu pedido #{id} está listo y empacado para retiro / entrega!"*
  * `FINALIZADO`: *"¡Tu pedido #{id} ha sido entregado! Muchas gracias por tu compra."*
  * `CANCELADO`: *"Tu pedido #{id} ha sido cancelado. Si tienes dudas, estamos a tu disposición."*

---

### RN-11: Modulación de Ritmo de la Tienda (`StorePaceMode`)
* **Definición**: El administrador puede regular el ritmo de trabajo del local en 3 modos:
  * **`rapida`**: Reduce en 5 minutos los tiempos estimados de preparación y establece un buffer de 0 min.
  * **`habitual`**: Tiempos estándar de cocción.
  * **`demorada`**: Añade 10 minutos a todas las nuevas estimaciones y fija un buffer de +10 min para absorber picos de sobredemanda.

---

### RN-12: Capacidad Dinámica de Cocina por Dotación de Personal
* **Definición**: La capacidad porcentual y el límite de comandas simultáneas recomendadas se recalculan automáticamente en base al número de cocineros y ayudantes en estado `"Activo"`:
  * **<= 1 operario activo**: Capacidad `"Reducida"` (30%), buffer sugerido de +20 min, máximo 3 comandas recomendadas.
  * **<= 2 operarios activos**: Capacidad `"Reducida"` (48%), buffer sugerido de +12 min, máximo 5 comandas recomendadas.
  * **<= 3 operarios activos**: Capacidad `"Moderada"` (72%), buffer sugerido de +5 min, máximo 8 comandas recomendadas.
  * **>= 4 operarios activos**: Capacidad `"Optima"` (95%), buffer de 0 min, máximo 12 comandas recomendadas.
