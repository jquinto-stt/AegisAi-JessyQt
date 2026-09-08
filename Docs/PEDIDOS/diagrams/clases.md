# Diagrama UML de Clases del Módulo Pedidos

Este documento presenta el diagrama UML de clases y entidades del módulo **Pedidos**, reflejando con exactitud los atributos, tipos de datos, cardinalidades y relaciones definidas en el código fuente (`packages/apps/web/modules/app/src/compositions/pedidos/types.ts`).

---

## Diagrama UML de Clases (Mermaid)

```mermaid
classDiagram
    class Pedido {
        +string id
        +string customerName
        +string customerPhone
        +string customerAddress
        +string deliveryAddress
        +string paymentMethod
        +OrderChannel channel
        +OrderType type
        +OrderStatus status
        +number total
        +string createdAt
        +number estimatedMinutes
        +number elapsedMinutes
        +UrgencyLevel urgency
        +number turnNumber
        +boolean isAIOrigin
        +string aiRawMessage
        +AIConfidence aiConfidence
        +string rejectionReason
        +string cancellationReason
        +boolean isStockConsumed
        +boolean isInLiveQueue
        +string notes
    }

    class OrderItem {
        +string productId
        +string name
        +number quantity
        +number unitPrice
        +string notes
        +string option
        +string category
    }

    class OrderEvent {
        +string timestamp
        +OrderStatus fromStatus
        +OrderStatus toStatus
        +string user
        +string ruleName
        +string note
    }

    class Conversation {
        +string id
        +string customerName
        +string customerPhone
        +string avatarUrl
        +OrderChannel channel
        +ConversationStatus status
        +string controlledBy
        +HandoffReason requiresHandoffReason
        +AIConfidence aiConfidence
        +string orderId
        +string lastMessageAt
        +boolean unreadForOperator
    }

    class ChatMessage {
        +string id
        +string sender
        +string authorName
        +string text
        +string timestamp
        +string attachmentUrl
        +string attachmentType
        +object attachmentMeta
    }

    class ConversationEvent {
        +string timestamp
        +ConversationStatus fromStatus
        +ConversationStatus toStatus
        +string user
        +string note
    }

    class DraftOrder {
        +number subtotal
        +number deliveryFee
        +number total
        +string deliveryType
        +string deliveryAddress
        +string paymentMethod
        +string notes
    }

    class ProductItem {
        +string id
        +string code
        +string name
        +string category
        +number price
        +string imageUrl
        +boolean isActive
        +boolean isAvailable
        +number stockEstimated
        +number prepTimeMinutes
        +string description
        +string demandTag
        +boolean autoPauseOnStockOut
        +number costEstimated
    }

    class RecipeIngredient {
        +string ingredientId
        +string ingredientName
        +number quantityRequired
        +string unit
    }

    class StockIngredientItem {
        +string id
        +string code
        +string name
        +string category
        +string unit
        +number currentStock
        +number minThreshold
        +number costPerUnit
        +string expiryDate
        +string status
    }

    class StockMovement {
        +string id
        +string ingredientId
        +string ingredientName
        +string type
        +number quantity
        +string unit
        +string orderId
        +string reason
        +string registeredBy
        +string timestamp
    }

    class Incidencia {
        +string id
        +string title
        +string severity
        +string type
        +string orderId
        +string timestamp
        +string description
        +boolean isResolved
    }

    class ShiftInfo {
        +string name
        +string currentShift
        +string capacityStatus
        +number capacityPercent
        +number currentActiveOrdersCount
        +number maxRecommendedOrders
        +number suggestedPrepBufferMinutes
    }

    class StaffMember {
        +string id
        +string name
        +string role
        +string status
        +string station
        +number assignedOrdersCount
    }

    %% Relaciones y Cardinalidades
    Pedido "1" *-- "1..*" OrderItem : contiene
    Pedido "1" *-- "1..*" OrderEvent : registra en history
    Pedido "0..1" -- "0..*" Incidencia : puede originar

    Conversation "1" *-- "0..*" ChatMessage : aloja mensajes
    Conversation "1" *-- "0..*" ConversationEvent : audita en handoffHistory
    Conversation "1" o-- "0..1" DraftOrder : elabora comanda previa
    Conversation "0..1" ..> "0..1" Pedido : referencia por orderId

    DraftOrder "1" o-- "1..*" OrderItem : agrupa items

    ProductItem "1" *-- "0..*" RecipeIngredient : define escandallo
    RecipeIngredient "0..*" --> "1" StockIngredientItem : consume materia prima
    StockIngredientItem "1" *-- "0..*" StockMovement : audita entradas y salidas

    ShiftInfo "1" *-- "1..*" StaffMember : coordina equipo
```

---

## Enumeraciones y Tipos Literales del Dominio

* **`OrderStatus`**: `"NUEVO"` | `"CONFIRMADO"` | `"EN_PREPARACION"` | `"LISTO"` | `"FINALIZADO"` | `"RECHAZADO"` | `"CANCELADO"`
* **`UrgencyLevel`**: `"A_TIEMPO"` | `"PROXIMO"` | `"RETRASADO"`
* **`OrderChannel`**: `"whatsapp"` | `"web"` | `"presencial"` | `"telefono"`
* **`OrderType`**: `"inmediato"` | `"programado"` | `"recurrente"`
* **`ConversationStatus`**: `"IA_ATENDIENDO"` | `"REQUIERE_INTERVENCION"` | `"HUMANO_ATENDIENDO"` | `"RESUELTO"`
* **`HandoffReason`**: `"AMBIGUO"` | `"FUERA_DE_ALCANCE"` | `"MODIFICACION_ESPECIAL"` | `"CONFIRMAR_DATO"` | `"CLIENTE_PIDE_HUMANO"` | `"BAJA_CONFIANZA"` | `"VERIFICAR_PAGO_TRANSFERENCIA"` | `"RECLAMO_INCIDENCIA"`
* **`StockMovementType`**: `"INGRESO_PROVEEDOR"` | `"VENTA_PEDIDO"` | `"MERMA_COCINA"` | `"AJUSTE_AUDITORIA"`
* **`IngredientStatus`**: `"OPTIMO"` | `"BAJO"` | `"CRITICO"` | `"AGOTADO"`
