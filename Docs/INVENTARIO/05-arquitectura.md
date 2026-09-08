# 05. Arquitectura del Módulo Inventario

Este documento presenta la arquitectura técnica, estructural y de integración del módulo **Inventario** en **StockFlow**.

---

## 5.1 Diagrama de Arquitectura de Capas (Mermaid)

```mermaid
graph TB
    subgraph UI_Layer["Capa de Presentación (React / TypeScript)"]
        MOD[ModuloInventario.tsx - Componente Principal]
        
        subgraph Vistas_Principales["Vistas Principales (Tabs)"]
            V_CAT[CatalogView - Productos & Servicios]
            V_LOC[StockLocationsView - Bodegas & Sedes]
            V_PUR[PurchasingView - Compras & Facturas]
            V_KDX[KardexView - Historial de Movimientos]
            V_MAN[ManufacturingView - Ensamble BOM]
        end

        subgraph Modales_Operativos["Modales Operativos"]
            M_PROD[ProductFormModal]
            M_MOV[StockMovementModal]
            M_CNT[StockCountModal]
            M_TRF[StockTransferModal]
            M_PO[PurchaseOrderModal]
            M_XLS[ImportExcelModal]
            M_DET[PartDetailModal]
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
  2. Cada vez que se ejecuta una mutación (`saveProduct`, `registerMovement`, `consumeSaleOrder`, `executeBuildOrder`), se invoca `this.notify()`.
  3. El hook reactivo `useInventory()` se suscribe al servicio en su ciclo de vida (`inventoryService.subscribe(...)`), disparando un refresco automático de todos los componentes suscritos sin necesidad de prop-drilling.

---

## 5.3 Motor de Negocio (`inventoryService.ts`)

El archivo `inventoryService.ts` actúa como el motor central del ERP en el cliente:
* **Persistencia Doble (Local-First)**: Mantiene los datos en memoria para máxima velocidad de renderizado (<50ms) y los sincroniza automáticamente en `localStorage` bajo claves versionadas (`modulo_inventario_products_v5`, `modulo_inventario_movements_v5`, etc.).
* **Generación de Semillas**: Si el almacenamiento local está vacío, carga automáticamente el catálogo enriquecido de demostración desde `inventoryMockData.ts`.
* **Cálculo de Columnas Dinámicas (`extractDynamicColumns`)**: Analiza todos los metadatos JSONB (`metadata`) de los productos y extrae dinámicamente las columnas correspondientes para mostrarlas en la tabla del catálogo.

---

## 5.4 Backend Cloud Serverless (SST v3 / AWS)

* **Definición de Infraestructura**: `packages/cloud/core/infra/factories/inventarios.ts`
* **Controladores Lambda**: `packages/cloud/core/infra/handlers/inventarios.ts`

### 1. Base de Datos: DynamoDB Single-Table (`Inventarios@Table`)
* **Partición Principal**:
  * `pk`: `OWNER#{ownerId}` (Aislamiento por empresa/inquilino).
  * `sk`: `ITEM#{itemId}` o `TEMPLATE#{templateId}`.
* **Handlers Implementados**:
  * `list`: `QueryCommand` sobre `pk = :pk AND begins_with(sk, 'ITEM#')`.
  * `create`: `PutCommand` con código autogenerado `INV-XXXX`, evidencias (`evidenceCount`, `evidenceType`), estado y condición.
  * `updateStatus`: `UpdateCommand` atómico que modifica `#status`, `#cond` y `lastUpdated`.

### 2. Seguridad y Gateway
* Protegido por **AWS Cognito JWT Authorizer**, asegurando que solo usuarios autenticados con claim de `ownerId` puedan consultar o modificar registros.
