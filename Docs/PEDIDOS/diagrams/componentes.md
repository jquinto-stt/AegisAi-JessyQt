# Diagrama UML de Componentes del Módulo Pedidos

Este documento presenta el diagrama UML de componentes del módulo **Pedidos**, detallando la jerarquía de componentes frontend, servicios locales, controladores backend y capas de persistencia que existen en el código de **StockFlow**.

---

## Diagrama UML de Componentes (Mermaid)

```mermaid
graph TB
    subgraph Frontend_SPA["Frontend (SPA React / TypeScript)"]
        [PedidosModule]
        
        subgraph Vistas_Operativas["Vistas de Operación"]
            [PedidosEnVivoView]
            [PreparacionTiemposView]
            [ProgramadosView]
            [ConversacionesView]
        end

        subgraph Vistas_Gestion["Vistas de Menú y Gestión"]
            [CatalogoInteligenteView]
            [InsumosStockView]
            [AutomatizacionesView]
            [TurnosCapacidadView]
            [RolesPermisosView]
            [ResumenDashboardView]
            [HistorialView]
            [AnaliticaView]
        end

        subgraph Modales_Drawers["Modales y Componentes Compartidos"]
            [OrderDetailDrawer]
            [AIInterpretationModal]
            [RejectCancelModal]
            [IncidenciasDrawer]
            [ThermalTicketModal]
            [WhatsAppFloatingWidget]
            [CustomLayoutModal]
        end

        subgraph Core_State["Capa de Estado y Utilidades"]
            [PedidosContext]
            [ProductAdapter]
            [SoundEffects_WebAudio]
        end
    end

    subgraph ERP_Interno["Servicios Internos del Monorepo"]
        [InventoryService_Kardex]
        [ProductsApiClient]
        [AuthContext_Cognito]
    end

    subgraph Backend_Cloud["Backend Serverless (AWS / SST v3)"]
        [PedidosApi_Gateway]
        
        subgraph Lambda_Handlers["Handlers Lambda (infra/handlers/pedidos.ts)"]
            [Handler_List]
            [Handler_Create]
            [Handler_UpdateStatus]
        end

        [DynamoDB_PedidosTable]
    end

    %% Relaciones Frontend
    [PedidosModule] --> [PedidosContext]
    [PedidosModule] --> Vistas_Operativas
    [PedidosModule] --> Vistas_Gestion
    [PedidosModule] --> Modales_Drawers

    Vistas_Operativas --> [PedidosContext]
    Vistas_Gestion --> [PedidosContext]
    Modales_Drawers --> [PedidosContext]

    [PedidosContext] --> [SoundEffects_WebAudio]
    [PedidosContext] --> [ProductAdapter]
    [PedidosContext] --> [InventoryService_Kardex]
    [PedidosContext] --> [ProductsApiClient]
    [PedidosContext] --> [AuthContext_Cognito]

    %% Relaciones Backend
    [ProductsApiClient] -.-> [PedidosApi_Gateway]
    [PedidosApi_Gateway] --> [Handler_List]
    [PedidosApi_Gateway] --> [Handler_Create]
    [PedidosApi_Gateway] --> [Handler_UpdateStatus]
    
    [Handler_List] --> [DynamoDB_PedidosTable]
    [Handler_Create] --> [DynamoDB_PedidosTable]
    [Handler_UpdateStatus] --> [DynamoDB_PedidosTable]
```

---

## Responsabilidad de Cada Componente

### 1. Frontend (SPA React)
* **`PedidosModule`**: Componente orquestador que gestiona la pestaña activa (`sectionProp`, `opTabProp`, `geTabProp`), deep-linking y montaje del `PedidosProvider`.
* **`PedidosContext`**: Fuente de verdad del estado de la aplicación. Mantiene pedidos activos, historial, insumos, conversaciones y expone las acciones de mutación (`transitionOrder`, `confirmOrder`, `consumeStockForOrder`, `takeControl`, etc.).
* **`PedidosEnVivoView`**: Tablero Kanban multicanal con filtros de búsqueda, selector de ritmo y tarjetas interactivas de comanda.
* **`PreparacionTiemposView`**: Terminal KDS diseñado para cocinas. Muestra comandas en horno/cocina con temporizador semafórico y botón rápido para pasar a `LISTO`.
* **`ConversacionesView`**: Bandeja de entrada de WhatsApp que implementa el protocolo Human-in-the-Loop (HITL), alternando entre control de IA y operador humano.
* **`CatalogoInteligenteView` e `InsumosStockView`**: Módulos de administración de platos, precios, recetas y control de materias primas con cálculo de costos unitarios.
* **`OrderDetailDrawer` y `ThermalTicketModal`**: Paneles laterales y modales para ver la bitácora completa de eventos del pedido e imprimir comandas térmicas.
* **`ProductAdapter`**: Normalizador bidireccional entre la estructura simple del backend cloud (`Product`) y la interfaz rica de frontend (`ProductItem`).
* **`SoundEffects_WebAudio`**: Sintetizador de audio nativo para alertar a cocina y mostrador.

### 2. Servicios del Monorepo
* **`InventoryService_Kardex` (`inventoryService.ts`)**: Servicio singleton de StockFlow que actualiza el inventario físico general y registra movimientos de auditoría `SALIDA` por cada venta.
* **`ProductsApiClient` (`api/products.ts`)**: Cliente HTTP que gestiona la persistencia optimista de productos contra el backend o conmuta a mock local si la nube está desconectada.
* **`AuthContext_Cognito`**: Proveedor de autenticación que inyecta tokens JWT y resuelve la identidad del operador en turno.

### 3. Backend Cloud (AWS / SST v3)
* **`PedidosApi_Gateway` (`Pedidos@Api`)**: API Gateway HTTP v2 que enruta las solicitudes hacia las funciones Lambda, protegido por Cognito JWT Authorizer.
* **Handlers Lambda (`infra/handlers/pedidos.ts`)**:
  * `Handler_List`: Ejecuta consultas `QueryCommand` para listar órdenes por inquilino.
  * `Handler_Create`: Inserta nuevas órdenes con fecha ISO y evento inicial.
  * `Handler_UpdateStatus`: Actualiza el estado y concatena el nuevo evento a la bitácora de auditoría mediante `UpdateCommand`.
* **`DynamoDB_PedidosTable` (`Pedidos@Table`)**: Tabla DynamoDB con diseño de tabla única indexada por `pk: OWNER#{id}` y `sk: ORDER#{id}`.
