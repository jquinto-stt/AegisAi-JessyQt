# Diagramas UML de Máquinas de Estados del Módulo Pedidos

Este documento presenta los diagramas de estados UML que rigen el comportamiento dinámico de las tres máquinas de estados concurrentes en **StockFlow (Pedidos)**:
1. Máquina de Estados del **Pedido** (`OrderStatus`).
2. Máquina de Estados de la **Conversación WhatsApp / HITL** (`ConversationStatus`).
3. Máquina de Estados del **Insumo / Stock** (`StockIngredientItem.status`).

---

## 1. Máquina de Estados del Pedido (`OrderStatus`)

```mermaid
stateDiagram-v2
    [*] --> NUEVO : Creación (Manual / WhatsApp / Programado)

    NUEVO --> CONFIRMADO : confirmOrder() [Operador] / approveAIOrder()
    NUEVO --> RECHAZADO : rejectOrder(reason) [Operador / Admin]

    CONFIRMADO --> EN_PREPARACION : sendToKitchen() [Cocinero KDS]\n/ Descuento Kardex Maestro
    CONFIRMADO --> CANCELADO : cancelOrder(reason) [Supervisor]\n/ Registra Incidencia Alta

    EN_PREPARACION --> LISTO : markOrderReady() [Personal Cocina]\n/ Tono éxito Web Audio
    EN_PREPARACION --> CANCELADO : cancelOrder(reason) [Supervisor]\n/ Registra Incidencia Alta

    LISTO --> FINALIZADO : deliverOrder() [Repartidor / Mostrador]\n/ Cierre contable
    LISTO --> CANCELADO : cancelOrder(reason) [Supervisor]

    FINALIZADO --> [*] : Archivado en Historial
    RECHAZADO --> [*] : Fin de Ciclo (No Venta)
    CANCELADO --> [*] : Fin de Ciclo (Anulación Justificada)
```

### Tabla de Transiciones y Condiciones del Pedido:

| Estado Origen | Evento Desencadenante | Condición / Validación | Estado Destino | Acción Asociada |
|---|---|---|---|---|
| `[*]` | `createManualOrder` / `confirmDraftOrder` | Ítems > 0, total > 0 | `NUEVO` | Alerta sonora `playNewOrderSound()`. |
| `NUEVO` | `confirmOrder` / `approveAIOrder` | Pago validado o crédito | `CONFIRMADO` | Asigna `turnNumber` (1-30) y notifica a WhatsApp. |
| `NUEVO` | `rejectOrder` | `reason` obligatorio | `RECHAZADO` | Guarda `rejectionReason` en historial. |
| `CONFIRMADO` | `sendToKitchen` | Comanda entra a horno | `EN_PREPARACION` | Dispara `consumeStockForOrder` (Kardex ERP). |
| `CONFIRMADO` | `cancelOrder` | `reason` obligatorio | `CANCELADO` | Crea `Incidencia` de severidad `Alta`. |
| `EN_PREPARACION`| `markOrderReady` | Cocción finalizada | `LISTO` | Emite sonido `playSuccessSound()`. |
| `EN_PREPARACION`| `cancelOrder` | `reason` obligatorio | `CANCELADO` | Crea `Incidencia` de severidad `Alta`. |
| `LISTO` | `deliverOrder` | Paquete entregado | `FINALIZADO` | Suma a KPIs del día y notifica a WhatsApp. |

---

## 2. Máquina de Estados de la Conversación WhatsApp (Protocolo HITL)

```mermaid
stateDiagram-v2
    [*] --> IA_ATENDIENDO : Cliente inicia chat en WhatsApp

    IA_ATENDIENDO --> REQUIERE_INTERVENCION : Disparador Handoff\n(Comprobante de pago, ambigüedad,\nqueja o solicitud de persona)
    IA_ATENDIENDO --> RESUELTO : Cliente concluye consulta sin pedido

    REQUIERE_INTERVENCION --> HUMANO_ATENDIENDO : takeControl() [Operador toma el control]
    
    HUMANO_ATENDIENDO --> IA_ATENDIENDO : releaseToAI() [Operador devuelve a IA]
    HUMANO_ATENDIENDO --> RESUELTO : resolveConversation() [Caso cerrado]

    RESUELTO --> IA_ATENDIENDO : Cliente envía nuevo mensaje
    RESUELTO --> [*]
```

### Exclusión Mutua en la Conversación:
* Mientras el estado es **`HUMANO_ATENDIENDO`**, el atributo `controlledBy` almacena el nombre del operador y el Asistente IA tiene **prohibido emitir respuestas automáticas**.
* Al invocar **`releaseToAI()`**, `controlledBy` vuelve a `null` y la IA retoma la escucha activa del canal.

---

## 3. Máquina de Estados del Insumo / Materia Prima

Gobierna el escandallo y la prevención de ventas sin stock en cocina (`StockIngredientItem`):

```mermaid
stateDiagram-v2
    [*] --> OPTIMO : Stock inicial cargado

    OPTIMO --> BAJO : currentStock <= minThreshold
    BAJO --> CRITICO : currentStock <= minThreshold * 0.5
    CRITICO --> AGOTADO : currentStock <= 0\n/ Pausa platos en catálogo

    AGOTADO --> OPTIMO : INGRESO_PROVEEDOR (Nueva compra recibida)
    CRITICO --> OPTIMO : INGRESO_PROVEEDOR
    BAJO --> OPTIMO : INGRESO_PROVEEDOR
```

### Regla de Quiebre de Stock (`AGOTADO`):
Si el insumo alcanza el estado `AGOTADO` y está vinculado a platos con la bandera `autoPauseOnStockOut = true`, el sistema ejecuta en tiempo real `toggleProductAvailability` sobre dichos productos en el catálogo para evitar que sigan vendiéndose por WhatsApp o mostrador.
