# Diagrama UML de Componentes del Módulo Inventario

Este documento presenta el diagrama UML de componentes del módulo **Inventario**, describiendo la estructura de interfaces de usuario, lógica de negocio local y servicios cloud en **StockFlow**.

---

## Diagrama UML de Componentes (Mermaid)

```mermaid
graph TB
    subgraph Frontend_UI["Frontend (React / TypeScript)"]
        [ModuloInventario]
        
        subgraph Vistas_Operativas["Vistas Operativas (Pestañas)"]
            [CatalogView]
            [StockLocationsView]
            [PurchasingView]
            [KardexView]
            [ManufacturingView]
        end

        subgraph Modales_UI["Modales de Transacción"]
            [ProductFormModal]
            [StockMovementModal]
            [StockCountModal]
            [StockTransferModal]
            [PurchaseOrderModal]
            [LocationFormModal]
            [ImportExcelModal]
            [PartDetailModal]
        end

        subgraph State_Engine["Capa de Estado y Suscripción"]
            [useInventory_Hook]
            [inventoryService_Singleton]
            [LocalStorage_Store]
        end
    end

    subgraph Integracion_ERP["Integración con Otros Módulos"]
        [PedidosModule]
        [AuthContext]
    end

    subgraph Backend_Cloud["Backend Serverless (AWS SST v3)"]
        [InventariosApi_Gateway]
        
        subgraph Lambdas["Handlers Lambda (infra/handlers/inventarios.ts)"]
            [Handler_List]
            [Handler_Create]
            [Handler_UpdateStatus]
        end

        [DynamoDB_InventariosTable]
    end

    %% Relaciones UI
    [ModuloInventario] --> Vistas_Operativas
    [ModuloInventario] --> Modales_UI
    Vistas_Operativas --> [useInventory_Hook]
    Modales_UI --> [useInventory_Hook]

    %% Relaciones State
    [useInventory_Hook] --> [inventoryService_Singleton]
    [inventoryService_Singleton] <--> [LocalStorage_Store]

    %% Relaciones Externas
    [PedidosModule] --> |consumeSaleOrder| [inventoryService_Singleton]
    [inventoryService_Singleton] --> [AuthContext]

    %% Relaciones Cloud
    [InventariosApi_Gateway] --> [Handler_List]
    [InventariosApi_Gateway] --> [Handler_Create]
    [InventariosApi_Gateway] --> [Handler_UpdateStatus]

    [Handler_List] --> [DynamoDB_InventariosTable]
    [Handler_Create] --> [DynamoDB_InventariosTable]
    [Handler_UpdateStatus] --> [DynamoDB_InventariosTable]
```

---

## Responsabilidad de Componentes

* **`ModuloInventario`**: Orquestador principal que gestiona el menú de navegación de pestañas (`catalog`, `locations`, `purchasing`, `kardex`) y el estado de visibilidad de los modales.
* **`CatalogView`**: Tabla de productos con buscador multifiltro, paginación, cálculo de métricas financieras y badges dinámicos según el tipo de producto.
* **`StockLocationsView`**: Explorador jerárquico de bodegas y sucursales con recuento de SKUs por sede.
* **`PurchasingView`**: Tablero de compras a proveedores con filtros de estado (`pending`, `received`) y botón de recepción directa al almacén.
* **`KardexView`**: Auditoría cronológica de todos los movimientos de stock con filtrado por producto, concepto y autor.
* **`useInventory_Hook`**: Hook de React que implementa el patrón observador para reaccionar a cambios en tiempo real emitidos por `inventoryService`.
* **`inventoryService_Singleton`**: Núcleo transaccional del ERP. Implementa la lógica de altas, bajas, conteos físicos, traslados, compras y ensambles.
* **Handlers Lambda**: Controladores en AWS para listar (`list`), registrar (`create`) y modificar condición (`updateStatus`) en DynamoDB.
