# 05. Arquitectura del Módulo Inventario

Este documento presenta la arquitectura técnica, estructural y de integración del módulo **Inventario** en **StockFlow**.

---

## 5.1 Diagrama de Arquitectura de Capas (Mermaid)

```mermaid
graph TB
    subgraph UI_Layer["Capa de Presentación (React / TypeScript)"]
        MOD[ModuloInventario.tsx - Orquestador Principal]
        
        subgraph Vistas_Principales["Vistas Principales (Tabs)"]
            V_CAT[CatalogView - Productos & Catálogo]
            V_VAL[InventoryValuationView - Valor de Inventario PPP]
            V_PRI[PriceListsView - Listas de Precios & Tarifas]
            V_LOC[StockLocationsView - Bodegas & Sedes]
            V_PUR[PurchasingView - Compras & Reabastecimiento]
            V_KDX[KardexView - Historial de Movimientos]
        end

        subgraph Modales_Operativos["Modales Operativos"]
            M_PROD[ProductFormModal / QuickProductModal]
            M_MOV[StockMovementModal - UNIFICADO Entrada/Salida/Ajuste/Traslado/Conteo]
            M_PO[PurchaseOrderModal - Asistente de Reorden]
            M_XLS[ImportExcelModal]
            M_DET[PartDetailModal - Ficha Técnica]
            M_LOC[LocationFormModal]
            M_CAT[CategoriesModal]
        end
    end

    subgraph State_Layer["Capa de Estado y Lógica Local"]
        HOOK[useInventory Hook - Observer Pattern]
        SRV[inventoryService Singleton - Core ERP Engine]
        STORE[(LocalStorage Engine - Fallback Local)]
    end

    subgraph Integracion_Monorepo["Integraciones Internas StockFlow"]
        PED[Modulo Pedidos - consumeSaleOrder]
        AUTH[AuthContext - AWS Cognito JWT]
    end

    subgraph Cloud_Infrastructure["Infraestructura Cloud (AWS / SST v3)"]
        APIGW[Inventarios@Api - API Gateway v2]
        COGNITO[Cognito JWT Authorizer]
        
        subgraph Handlers_Lambda["Handlers Lambda (infra/handlers/inventarios.ts)"]
            H_LIST[list - QueryCommand ITEM#]
            H_CREATE[create - PutCommand ITEM#]
            H_STATUS[updateStatus - UpdateCommand]
        end

        DDB[(Inventarios@Table - DynamoDB Single-Table)]
    end

    %% Relaciones
    MOD --> Vistas_Principales
    MOD --> Modales_Operativos
    Vistas_Principales --> HOOK
    Modales_Operativos --> HOOK
    HOOK --> SRV
    SRV <--> STORE

    PED --> |consumeSaleOrder| SRV
    SRV --> AUTH

    APIGW --> COGNITO
    APIGW --> Handlers_Lambda
    Handlers_Lambda --> DDB
```

---

## 5.2 Capa Frontend y Patrón Observer

* **Ubicación**: `packages/apps/web/modules/app/src/ModuloInventario/`
* **Patrón de Estado**: Se utiliza un patrón **Observer/Pub-Sub** desacoplado:
  1. `inventoryService` mantiene un arreglo privado de escuchadores (`listeners: Array<() => void>`).
  2. Cada vez que se ejecuta una mutación (`saveProduct`, `registerMovement`, `registerStockAdjustment`, `registerStockTransfer`, `registerStockCount`, `receivePurchaseOrder`, `consumeSaleOrder`), se invoca `this.notify()`.
  3. El hook reactivo `useInventory()` se suscribe al servicio en su ciclo de vida (`inventoryService.subscribe(...)`), disparando un refresco automático de todos los componentes suscritos sin necesidad de prop-drilling ni re-renders innecesarios.

---

## 5.3 Motor de Negocio (`inventoryService.ts`)

El archivo `inventoryService.ts` actúa como el motor central del ERP en el cliente:
* **Persistencia Doble (Local-First)**: Mantiene los datos en memoria para máxima velocidad de renderizado (<50ms) y los sincroniza automáticamente en `localStorage` bajo claves versionadas (`modulo_inventario_products_v5`, `modulo_inventario_movements_v5`, etc.).
* **Costeo Promedio Ponderado (PPP / NIC 2)**: Al recibir mercancía mediante una orden de compra (`receivePurchaseOrder`), recalcula el costo unitario según la fórmula internacional:
  $$\text{PPP} = \frac{(\text{Stock Previo} \times \text{Costo Previo}) + (\text{Cantidad Recibida} \times \text{Precio Facturado})}{\text{Stock Previo} + \text{Cantidad Recibida}}$$
* **Listas de Precios y Márgenes**: Motor de cálculo dinámico para aplicar tarifas porcentuales de recargo o descuento sobre el precio base o costo.
* **Modal Unificado (`StockMovementModal.tsx`)**: Arquitectura consolidada que centraliza en una sola vista con pestañas segmentadas los 5 tipos de operaciones de almacén: Entrada rápida, Salida rápida, Ajuste contable por merma, Traslado entre bodegas y Conteo físico.

---

## 5.4 Backend Cloud Serverless (SST v3 / AWS)

* **Definición de Infraestructura**: `packages/cloud/core/infra/factories/inventarios.ts`
* **Controladores Lambda**: `packages/cloud/core/infra/handlers/inventarios.ts`

### 1. Base de Datos: DynamoDB Single-Table (`Inventarios@Table`)
* **Claves de Acceso**:
  * Clave de Partición: `PK` (ej. `TENANT#tenant-001`)
  * Clave de Ordenación: `SK` (ej. `ITEM#prod-001`, `MOVEMENT#mov-001`)
* **Esquema de Entidad**: JSONB flexible para almacenar metadatos dinámicos por tipo de producto.
