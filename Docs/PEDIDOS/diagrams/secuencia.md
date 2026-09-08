# Diagramas UML de Secuencia del Módulo Pedidos

Este documento presenta los diagramas de secuencia UML para los flujos más relevantes del módulo **Pedidos** en **StockFlow**.

---

## Flujo 1: Creación de Pedido vía WhatsApp con IA y Confirmación

Muestra el flujo desde que el cliente escribe por WhatsApp hasta que la orden se confirma en el Kanban.

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (WhatsApp)
    participant WA as Meta WhatsApp API
    participant Bot as Asistente IA (Necto)
    participant Ctx as PedidosContext
    actor Cajero as Operador de Caja
    participant DDB as DynamoDB (Pedidos@Table)

    Cliente->>WA: "Hola, quiero 6 empanadas de carne y 2 gaseosas"
    WA->>Bot: Webhook: mensaje de texto
    Bot->>Bot: Analizar intención y extraer platos del catálogo
    Bot->>Ctx: Crear / Actualizar DraftOrder en Conversation
    Bot-->>Cliente: "Te armé el borrador: 6x Carne + 2x Gaseosa. Total: $42.000 COP. ¿A qué dirección?"
    Cliente->>WA: "Calle 72 # 11-45. Pago por Nequi"
    WA->>Bot: Mensaje con dirección y método
    Bot->>Ctx: Actualizar DraftOrder (deliveryAddress, paymentMethod)
    Bot-->>Cliente: "Datos de transferencia Nequi: 310 987 6543. Envíanos el comprobante por acá"
    Cliente->>WA: Envía captura de transferencia Nequi
    WA->>Bot: Adjunto de imagen (comprobante)
    Bot->>Ctx: flagForHandoff(convId, "VERIFICAR_PAGO_TRANSFERENCIA")
    Ctx->>Ctx: status = REQUIERE_INTERVENCION, unreadForOperator = true
    Ctx-->>Cajero: Alerta sonora (playUrgentAlertSound) y badge en pantalla
    Cajero->>Ctx: takeControl(convId) o confirmDraftOrder(convId)
    Ctx->>Ctx: create Order (id: PED-XXXX, status: CONFIRMADO, isAIOrigin: true)
    Ctx->>DDB: PutCommand / UpdateCommand
    Ctx-->>Cliente: "¡Tu comanda #PED-XXXX fue confirmada! En breve entra a preparación."
```

---

## Flujo 2: Preparación en Cocina (KDS) y Descuento Automático de Stock

Muestra la interacción cuando el cocinero inicia la cocción y el sistema descuenta las materias primas en el Kardex.

```mermaid
sequenceDiagram
    autonumber
    actor Cocinero as Cocinero Jefe (KDS)
    participant KDS as PreparacionTiemposView
    participant Ctx as PedidosContext
    participant ERP as inventoryService (Kardex Maestro)
    participant Sound as Web Audio API
    participant DDB as DynamoDB (Pedidos@Table)
    participant WA as WhatsApp Push Service

    Cocinero->>KDS: Pulsa "Enviar a Cocina / Horno"
    KDS->>Ctx: sendToKitchen(orderId)
    Ctx->>Ctx: transitionOrder(orderId, "EN_PREPARACION")
    Ctx->>DDB: UpdateCommand (SET status = 'EN_PREPARACION', append history)
    
    par Descuento en Kardex Maestro ERP
        Ctx->>ERP: consumeSaleOrder({ orderId, items, channel })
        ERP->>ERP: Reducir stockActual de cada producto y registrar movimiento SALIDA
    and Descuento en Recetas de Insumos Locales
        Ctx->>Ctx: registerStockMovement(VENTA_PEDIDO, -cantidadInsumo)
        Ctx->>Ctx: Evaluar umbral: si insumo agotado -> pausar catálogo
    and Notificación al Cliente
        Ctx->>WA: Enviar mensaje: "Tu comanda ya ingresó al horno y se está preparando"
    end

    Note over Cocinero,KDS: Transcurre tiempo de cocción en horno...
    Cocinero->>KDS: Pulsa "Marcar Listo"
    KDS->>Ctx: markOrderReady(orderId)
    Ctx->>Ctx: transitionOrder(orderId, "LISTO")
    Ctx->>Sound: playSuccessSound() (Doble campana armónica)
    Ctx->>WA: Enviar mensaje: "¡Tu pedido está listo y empacado para entrega!"
```

---

## Flujo 3: Cancelación de Pedido con Registro de Incidencia

Muestra la excepción operativa donde un pedido debe anularse justificadamente.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Supervisor de Turno
    participant Modal as RejectCancelModal
    participant Ctx as PedidosContext
    participant Inc as IncidenciasDrawer
    participant DDB as DynamoDB (Pedidos@Table)
    participant WA as WhatsApp Push Service

    Admin->>Ctx: Solicita cancelar pedido #PED-1025
    Ctx->>Modal: Abrir modal de cancelación
    Admin->>Modal: Ingresa motivo: "Cliente desistió por demora excesiva"
    Admin->>Modal: Pulsa "Confirmar Cancelación"
    Modal->>Ctx: cancelOrder("PED-1025", motivo)
    Ctx->>Ctx: status = CANCELADO, cancellationReason = motivo
    Ctx->>Ctx: addIncidencia({ title: "Pedido cancelado", severity: "Alta", type: "cancelacion" })
    Ctx->>Inc: Registrar en lista de incidencias activas
    Ctx->>DDB: UpdateCommand (status = 'CANCELADO', history append)
    Ctx->>WA: "Tu pedido #PED-1025 ha sido cancelado. Disculpa los inconvenientes."
```

---

## Flujo 4: Finalización y Despacho del Pedido

Muestra el cierre del ciclo de vida y la actualización de los indicadores contables.

```mermaid
sequenceDiagram
    autonumber
    actor Repartidor as Repartidor / Despachador
    participant Kanban as PedidosEnVivoView
    participant Ctx as PedidosContext
    participant Sound as Web Audio API
    participant KPIs as ResumenKPIs
    participant WA as WhatsApp Push Service

    Repartidor->>Kanban: Pulsa "Entregar" en comanda en estado LISTO
    Kanban->>Ctx: deliverOrder(orderId)
    Ctx->>Ctx: transitionOrder(orderId, "FINALIZADO")
    Ctx->>Sound: playSuccessSound()
    Ctx->>KPIs: Incrementar completados (+1) y sumar total a ingresosTotales
    Ctx->>WA: "¡Tu pedido ha sido entregado! Muchas gracias por tu compra."
    Note over Ctx: Pedido archivado en HistorialView
```

---

## Flujo 5: Protocolo Human-in-the-Loop (HITL) en WhatsApp

Muestra la alternancia y exclusión mutua entre el bot de IA y el operador humano.

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente
    participant Chat as ConversacionesView
    participant Ctx as PedidosContext
    actor Cajero as Operador de Caja

    Cliente->>Chat: "Buenas tardes, necesito cotización para 100 personas y factura electrónica con RUT"
    Note over Chat,Ctx: Mensaje evaluado por el motor conversacional
    Ctx->>Ctx: Coincidencia con disparador: MODIFICACION_ESPECIAL
    Ctx->>Ctx: status = REQUIERE_INTERVENCION, requiresHandoffReason = "MODIFICACION_ESPECIAL"
    Ctx-->>Cliente: "He derivado tu consulta al Administrador para cotizar directamente."
    Ctx-->>Cajero: Alerta sonora de handoff (playUrgentAlertSound)
    
    Cajero->>Chat: Pulsa "Tomar Control del Chat"
    Chat->>Ctx: takeControl(conversationId)
    Ctx->>Ctx: status = HUMANO_ATENDIENDO, controlledBy = "Operador de Caja"
    Note over Ctx: La IA queda completamente silenciada (Exclusión Mutua)
    
    Cajero->>Chat: Escribe respuesta personalizada y precio especial
    Chat->>Ctx: sendOperatorMessage(convId, "Hola, con gusto. Para 100 personas te ofrecemos...")
    Ctx-->>Cliente: Mensaje enviado con autoría del operador humano
    
    Note over Cajero,Cliente: Conversación y acuerdo comercial finalizado...
    Cajero->>Chat: Pulsa "Devolver a IA"
    Chat->>Ctx: releaseToAI(conversationId)
    Ctx->>Ctx: status = IA_ATENDIENDO, controlledBy = null
    Note over Ctx: La IA retoma el control autónomo del hilo
```
