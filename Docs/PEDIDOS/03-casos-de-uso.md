# 03. Casos de Uso del Módulo Pedidos

Este documento especifica todos los casos de uso que tienen sustento e implementación directa en el código del módulo Pedidos de StockFlow.

---

## 3.1 Catálogo de Casos de Uso Implementados

| Código | Nombre del Caso de Uso | Actor Primario | Objetivo |
|---|---|---|---|
| **CU-01** | Crear Pedido Manual en Mostrador | Operador de Caja | Registrar una venta presencial o telefónica en el Kanban en vivo. |
| **CU-02** | Procesar Pedido Conversacional vía IA | Asistente IA / Cliente | Construir una comanda en borrador mediante parsing de mensajes en WhatsApp. |
| **CU-03** | Aprobar y Revisar Interpretación IA | Operador de Caja | Validar ítems extraídos por la IA antes de confirmarlos al Kanban. |
| **CU-04** | Confirmar Pedido y Asignar Turno | Operador / Supervisor | Aceptar el pedido y asignar número de turno para cocina. |
| **CU-05** | Enviar Comanda a Preparación (KDS) | Cocinero Jefe | Pasar el pedido a elaboración en cocina e iniciar cronómetro. |
| **CU-06** | Marcar Pedido Listo y Empacado | Cocinero / Ayudante | Notificar que el pedido está terminado y listo para despacho. |
| **CU-07** | Entregar Pedido al Cliente | Repartidor / Mostrador | Finalizar el pedido al entregarlo físicamente al cliente. |
| **CU-08** | Rechazar Pedido Entrante | Operador / Supervisor | Denegar un pedido nuevo por indisponibilidad o cierre de turno. |
| **CU-09** | Cancelar Pedido con Incidencia | Supervisor | Cancelar un pedido confirmado registrando motivo e incidencia de severidad alta. |
| **CU-10** | Intervención Humana en Chat (HITL) | Operador de Caja | Tomar el control manual de una conversación de WhatsApp pausando la IA. |
| **CU-11** | Devolver Control del Chat a la IA | Operador de Caja | Reactivar las respuestas automatizadas de la IA en la conversación. |
| **CU-12** | Descontar Stock e Insumos Automáticamente | Motor Kardex ERP | Descontar existencias en el Kardex maestro e insumos locales de cocina. |
| **CU-13** | Modificar Disponibilidad en Catálogo | Administrador | Pausar o activar platos según disponibilidad de insumos. |
| **CU-14** | Inyectar Pedido Programado a Producción | Operador / Planificador | Transferir un pedido futuro a la cola activa en vivo o cocina. |
| **CU-15** | Ajustar Ritmo del Local y Capacidad | Supervisor | Modular el ritmo de la tienda (*rápida*, *habitual*, *demorada*) y asignar estaciones. |
| **CU-16** | Imprimir Ticket Térmico de Comanda | Operador de Caja | Generar comanda imprimible en estándar de 58mm u 80mm. |

---

## 3.2 Especificación Detallada de Casos de Uso Críticos

### CU-01: Crear Pedido Manual en Mostrador
* **Actor Principal**: Operador de Caja.
* **Objetivo**: Ingresar una venta presencial directamente al tablero Kanban en estado `NUEVO`.
* **Precondiciones**: Catálogo de productos con precios vigentes.
* **Flujo Principal**:
  1. El operador pulsa el botón *"Nuevo Pedido"* o presiona el atajo en `PedidosEnVivoView`.
  2. Selecciona cliente (o asigna genérico *"Cliente Mostrador"*), teléfono y canal (`presencial`).
  3. Agrega los ítems deseados del catálogo indicando cantidad y notas culinarias.
  4. El sistema calcula el total y el tiempo estimado basándose en el ritmo y buffer actual (`shiftInfo.suggestedPrepBufferMinutes`).
  5. El operador confirma la orden invocando `createManualOrder(orderData)`.
  6. El pedido se inserta con identificador único (`PED-XXXX`), estado `NUEVO`, evento en `history` y sonido de notificación (`playNewOrderSound()`).
* **Flujos Alternativos**:
  * *4a. El operador asigna tiempo estimado personalizado*: El sistema respeta el delta definido manualmente.
* **Excepciones**: Si no hay productos seleccionados, el botón de creación permanece inhabilitado.
* **Resultado Esperado**: Pedido disponible en la primera columna del Kanban con urgencia semafórica `A_TIEMPO`.

---

### CU-02: Procesar Pedido Conversacional vía IA (WhatsApp)
* **Actor Principal**: Cliente (vía WhatsApp) y Asistente IA.
* **Objetivo**: Atender al cliente en tiempo real, entender su pedido y construir una comanda en borrador (`DraftOrder`).
* **Precondiciones**: Conversación en estado `IA_ATENDIENDO`.
* **Flujo Principal**:
  1. El cliente envía un mensaje solicitando comida (ej. *"Hola, quiero 6 empanadas de carne y 2 gaseosas"*).
  2. La función conversacional de la IA procesa el mensaje, identifica los productos del menú y sus opciones.
  3. La IA construye un objeto `DraftOrder` con los ítems, cantidades, precios unitarios y subtotal.
  4. La IA emite un mensaje estructurado al cliente indicando el resumen y preguntando por salsas adicionales, dirección y método de pago.
  5. El cliente responde con su dirección y solicita pagar vía Nequi/transferencia.
  6. La IA actualiza el `DraftOrder` con la dirección y emite los datos de las cuentas bancarias oficiales del negocio.
* **Flujos Alternativos**:
  * *5a. El cliente envía imagen de comprobante de pago*: La IA detecta el adjunto, asigna metadata (`bank`, `amount`, `reference`), cambia el estado a `REQUIERE_INTERVENCION` con motivo `VERIFICAR_PAGO_TRANSFERENCIA`, marca `unreadForOperator = true` y dispara alerta sonora urgente (`playUrgentAlertSound`).
  * *5b. El cliente solicita hablar con un humano o plantea un reclamo*: La IA cambia el estado a `REQUIERE_INTERVENCION` con motivo `CLIENTE_PIDE_HUMANO` o `RECLAMO_INCIDENCIA`.
* **Resultado Esperado**: Hilo de chat actualizado con comanda en borrador lista para aprobación o escalado para intervención humana.

---

### CU-03: Aprobar y Revisar Interpretación IA
* **Actor Principal**: Operador de Caja.
* **Objetivo**: Validar humanamente las extracciones de IA con confianza dudosa o confirmar pedidos WhatsApp directamente al Kanban.
* **Precondiciones**: Pedido en estado `NUEVO` con bandera `isAIOrigin = true` o comanda en borrador en `ConversacionesView`.
* **Flujo Principal**:
  1. El operador abre el modal de interpretación (`AIInterpretationModal`) o pulsa *"Aprobar Comanda"* en el chat de WhatsApp.
  2. Visualiza el mensaje original del cliente (`aiRawMessage`) y la tabla de ítems sugerida por el modelo.
  3. Modifica cantidades o ítems si el cliente corrigió algo en el chat.
  4. Pulsa *"Aprobar Comanda"*.
  5. El sistema ejecuta `approveAIOrder(orderId, customItems)` o `confirmDraftOrder(conversationId)`.
  6. El pedido cambia a `CONFIRMADO`, se asigna `turnNumber` aleatorio (1-30), se registra el evento en la bitácora de auditoría y se reproduce `playSuccessSound()`.
* **Resultado Esperado**: Pedido confirmado en la columna 2 del Kanban y comanda vinculada con el chat.

---

### CU-04: Confirmar Pedido y Asignar Turno
* **Actor Principal**: Operador de Caja.
* **Objetivo**: Aceptar oficialmente un pedido `NUEVO` para que sea visible por el personal de cocina.
* **Flujo**:
  1. El operador pulsa *"Confirmar"* en la tarjeta del Kanban o dentro de `OrderDetailDrawer`.
  2. Se ejecuta `confirmOrder(orderId)`.
  3. El estado pasa a `CONFIRMADO`, se genera `turnNumber` y se notifica automáticamente al WhatsApp del cliente: *"¡Tu pedido #{id} fue confirmado! En breve entra a preparación en cocina"*.

---

### CU-05: Enviar Comanda a Preparación (KDS)
* **Actor Principal**: Cocinero Jefe / Operador KDS.
* **Objetivo**: Indicar el inicio de cocción en horno o ensamble en cocina.
* **Precondiciones**: Pedido en estado `CONFIRMADO`.
* **Flujo Principal**:
  1. El cocinero visualiza la comanda en `PreparacionTiemposView` o columna `CONFIRMADO` del Kanban.
  2. Pulsa *"Enviar a Cocina / Horno"*.
  3. Se dispara `sendToKitchen(orderId)`.
  4. El pedido cambia a `EN_PREPARACION`.
  5. El sistema ejecuta de manera asíncrona `consumeStockForOrder(order)`:
     * Llama a `inventoryService.consumeSaleOrder(...)` para descontar stock en el Kardex ERP maestro.
     * Si los productos tienen receta de insumos (`recipe`), genera movimientos de stock (`VENTA_PEDIDO`) con cantidad negativa en `StockMovement`.
  6. Se envía mensaje automático al WhatsApp del cliente: *"Tu comanda #{id} ya ingresó al horno de cocina y se está preparando"*.

---

### CU-06: Marcar Pedido Listo y Empacado
* **Actor Principal**: Personal de Cocina.
* **Objetivo**: Notificar que los platos están cocinados y empacados para despacho.
* **Flujo**:
  1. El cocinero pulsa *"Marcar Listo"* en la pantalla KDS.
  2. Se ejecuta `markOrderReady(orderId)`.
  3. El pedido pasa a `LISTO`.
  4. Se reproduce sonido de confirmación (`playSuccessSound()`).
  5. Notificación automática a WhatsApp: *"¡Tu pedido #{id} está listo y empacado para retiro / entrega!"*.

---

### CU-07: Finalizar / Entregar Pedido
* **Actor Principal**: Repartidor o Personal de Mostrador.
* **Objetivo**: Registrar la entrega física del producto al comensal.
* **Flujo**:
  1. El despachador pulsa *"Entregar"* en el Kanban o drawer.
  2. Se invoca `deliverOrder(orderId)`.
  3. Estado transiciona a `FINALIZADO`.
  4. Notificación automática a WhatsApp: *"¡Tu pedido #{id} ha sido entregado! Muchas gracias por tu compra"*.
  5. El pedido se contabiliza en los KPIs del día (`kpis.completados`, `kpis.ingresosTotales`).

---

### CU-08: Rechazar Pedido
* **Actor Principal**: Operador o Administrador.
* **Objetivo**: Denegar un pedido antes de su confirmación.
* **Precondiciones**: Estado `NUEVO`.
* **Flujo**:
  1. El operador pulsa *"Rechazar"*.
  2. Se abre `RejectCancelModal` solicitando motivo obligatorio (ej. *"Fuera de zona de entrega"*, *"Local cerrado"*).
  3. Se ejecuta `rejectOrder(orderId, reason)`.
  4. El pedido pasa a `RECHAZADO` con `rejectionReason` registrado en el historial.

---

### CU-09: Cancelar Pedido con Incidencia
* **Actor Principal**: Supervisor de Turno.
* **Objetivo**: Anular una comanda que ya estaba en proceso por causas operativas justificadas.
* **Precondiciones**: Pedido en estado `CONFIRMADO`, `EN_PREPARACION` o `LISTO`.
* **Flujo**:
  1. El supervisor pulsa *"Cancelar Pedido"*.
  2. En `RejectCancelModal` ingresa el motivo mandatorio (ej. *"Cliente desistió por demora excesiva"*).
  3. Se ejecuta `cancelOrder(orderId, reason)`.
  4. El pedido cambia a `CANCELADO` y `cancellationReason` queda guardado.
  5. Se dispara automáticamente `addIncidencia(...)` de tipo `cancelacion` y severidad `Alta` en el registro de incidencias operativas.
  6. Se notifica al cliente por WhatsApp de la cancelación.

---

### CU-10: Intervención Humana en Chat (HITL)
* **Actor Principal**: Operador de Caja.
* **Objetivo**: Tomar control exclusivo del hilo de WhatsApp del cliente.
* **Precondiciones**: Conversación en cola `REQUIERE_INTERVENCION` o `IA_ATENDIENDO`.
* **Flujo**:
  1. El operador pulsa *"Tomar Control"* en `ConversacionesView` o barra de control.
  2. Se ejecuta `takeControl(conversationId)`.
  3. El estado pasa a `HUMANO_ATENDIENDO`, `controlledBy` se establece con el nombre del operador y la IA entra en pausa estricta (no responderá automáticamente).
  4. El operador redacta y envía mensajes con `sendOperatorMessage(conversationId, text)`.

---

### CU-11: Devolver Control a la IA
* **Actor Principal**: Operador de Caja.
* **Objetivo**: Reactivar el bot inteligente tras resolver la inquietud del cliente.
* **Flujo**:
  1. El operador pulsa *"Devolver a IA"*.
  2. Se invoca `releaseToAI(conversationId)`.
  3. Estado transiciona a `IA_ATENDIENDO` y `controlledBy` pasa a `null`.
  4. La IA retoma el procesamiento autónomo de mensajes entrantes.

---

### CU-12: Descontar Stock e Insumos Automáticamente
* **Actor Principal**: Motor Kardex ERP (`inventoryService`).
* **Objetivo**: Mantener coherencia absoluta entre platos vendidos y materias primas físicas.
* **Flujo**:
  1. Al cambiar un pedido a `EN_PREPARACION`, se activa `consumeStockForOrder(order)` si `isStockConsumed` es falso.
  2. `inventoryService.consumeSaleOrder` busca cada producto por `productId`, `sku` o `name`, reduciendo `stockActual` y registrando un movimiento `SALIDA` en el Kardex maestro.
  3. Si el plato posee escandallo (`recipe`), se calcula `rec.quantityRequired * orderItem.quantity` y se descuenta de `StockIngredientItem`.
  4. Si un insumo llega a 0 (`AGOTADO`), y el plato tiene `autoPauseOnStockOut = true`, el producto se desactiva del catálogo automáticamente y se crea una `Incidencia` de quiebre de stock.
