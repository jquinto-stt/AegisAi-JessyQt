# Diagrama UML de Clases del Módulo Inventario

Este documento presenta el diagrama UML de clases y entidades de **StockFlow (Módulo Inventario)**, modelando los atributos, métodos, relaciones y cardinalidades que existen en `packages/apps/web/modules/app/src/ModuloInventario/types/inventory.types.ts`.

---

## Diagrama UML de Clases (Mermaid)

```mermaid
classDiagram
    class InventoryProduct {
        +string id
        +string sku
        +string ipn
        +string name
        +string category
        +ProductType productType
        +number costPrice
        +number salePrice
        +UnitOfMeasure unit
        +number stockActual
        +number stockMinimo
        +string locationId
        +string locationName
        +string barcode
        +string supplier
        +string imageUrl
        +Record metadata
        +ProductStatus status
        +string createdAt
        +string updatedAt
    }

    class StockMovement {
        +string id
        +string productId
        +string productSku
        +string productName
        +MovementType type
        +StockTrackingAction action
        +number quantity
        +number previousStock
        +number newStock
        +string fromLocation
        +string toLocation
        +string concept
        +string referenceDoc
        +string timestamp
        +string author
        +string notes
        +string batchCode
    }

    class StockLocation {
        +string id
        +string name
        +string code
        +string description
        +string parentLocationId
        +number itemsCount
    }

    class Supplier {
        +string id
        +string name
        +string taxId
        +string contactPerson
        +string email
        +string phone
        +number leadTimeDays
        +number rating
    }

    class PurchaseOrder {
        +string id
        +string orderNumber
        +string supplierId
        +string supplierName
        +string targetLocationId
        +string targetLocationName
        +PurchaseOrderStatus status
        +number totalAmount
        +string issueDate
        +string expectedDate
        +string receivedDate
        +string notes
    }

    class PurchaseOrderItem {
        +string productId
        +string productSku
        +string productName
        +number quantity
        +number unitPrice
        +UnitOfMeasure unit
    }

    class BuildOrder {
        +string id
        +string buildNumber
        +string outputProductId
        +string outputProductSku
        +string outputProductName
        +number quantityToBuild
        +BuildOrderStatus status
        +string locationId
        +string locationName
        +string createdAt
        +string completedAt
        +string notes
    }

    class BomItem {
        +string id
        +string componentProductId
        +string componentSku
        +string componentName
        +number quantityRequired
        +UnitOfMeasure unit
    }

    class InventoryService {
        -InventoryProduct[] products
        -StockMovement[] movements
        -StockLocation[] locations
        -Supplier[] suppliers
        -PurchaseOrder[] purchaseOrders
        -BuildOrder[] buildOrders
        +getProducts()
        +saveProduct(productData)
        +deleteProduct(id)
        +registerMovement(params)
        +consumeSaleOrder(params)
        +registerStockCount(params)
        +registerStockTransfer(params)
        +createPurchaseOrder(poData)
        +receivePurchaseOrder(poId)
        +createBuildOrder(boData)
        +executeBuildOrder(boId)
        +calculateStatus(stockActual, stockMinimo)
    }

    %% Relaciones
    InventoryProduct "1" *-- "0..*" StockMovement : registra historial
    StockLocation "1" o-- "0..*" InventoryProduct : almacena
    StockLocation "0..1" <-- "0..*" StockLocation : contiene sububicaciones
    
    Supplier "1" -- "0..*" PurchaseOrder : provee
    PurchaseOrder "1" *-- "1..*" PurchaseOrderItem : contiene
    PurchaseOrderItem "0..*" --> "1" InventoryProduct : referencia

    BuildOrder "1" *-- "1..*" BomItem : especifica receta
    BuildOrder "0..*" --> "1" InventoryProduct : produce producto final
    BomItem "0..*" --> "1" InventoryProduct : consume componente

    InventoryService ..> InventoryProduct : gestiona
    InventoryService ..> StockMovement : genera
    InventoryService ..> PurchaseOrder : administra
    InventoryService ..> BuildOrder : ejecuta
```

---

## Enumeraciones y Tipos Literales

* **`ProductType`**: `"standard"` | `"perishable"` | `"apparel"` | `"electronics"` | `"pharma"` | `"raw_material"`
* **`UnitOfMeasure`**: `"UND"` | `"KG"` | `"GR"` | `"LT"` | `"ML"` | `"METRO"` | `"CAJA"` | `"PAR"` | `"PAQUETE"` | `"ROLLO"`
* **`ProductStatus`**: `"active"` | `"inactive"` | `"low_stock"` | `"out_of_stock"`
* **`MovementType`**: `"ENTRADA"` | `"SALIDA"` | `"CONTEO"` | `"TRASLADO"`
* **`StockTrackingAction`**: `"STOCK_ADD"` | `"STOCK_REMOVE"` | `"STOCK_COUNT"` | `"STOCK_TRANSFER"` | `"STOCK_CREATE"`
* **`PurchaseOrderStatus`**: `"draft"` | `"pending"` | `"received"` | `"cancelled"`
* **`BuildOrderStatus`**: `"pending"` | `"in_progress"` | `"completed"` | `"cancelled"`
