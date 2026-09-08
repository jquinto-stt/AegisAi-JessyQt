# 05. Arquitectura del Módulo Pedidos

Este documento presenta la arquitectura técnica, estructural y de despliegue del módulo **Pedidos** en **StockFlow**.

---

## 5.1 Diagrama de Arquitectura de Capas (Mermaid)

```mermaid
graph TB
    subgraph Cliente y Canales Externos
        WA[WhatsApp / Meta Cloud API]
        BROWSER[Navegador Web / POS Local]
    end

    subgraph Frontend - SPA React (Vite / TypeScript)
        UI[PedidosModule / PedidosContent]
        
        subgraph Sub-vistas y Vistas Operativas
            V_VIVO[PedidosEnVivoView - Kanban]
            V_KDS[PreparacionTiemposView - KDS]
            V_PROG[ProgramadosView]
            V_CHAT[ConversacionesView - HITL]
            V_CAT[CatalogoInteligenteView]
            V_INS[InsumosStockView]
            V_CFG[Turnos & Automatizaciones]
        end

        CTX[PedidosContext & PedidosProvider]
        ADAPT[ProductAdapter / Adapters]
        SOUND[Web Audio API - soundEffects]
    end

    subgraph Integraciones Internas Monorepo
        INV_SRV[inventoryService - Kardex ERP Maestro]
        PROD_API[api/products - Catalog API Client]
        AUTH_CTX[AuthContext - AWS Cognito Session]
    end

    subgraph Cloud Infrastructure (AWS / SST v3)
        APIGW[Pedidos@Api - API Gateway v2]
        COGNITO[Cognito User Pool Authorizer]
        
        subgraph Lambda Handlers (infra/handlers/pedidos.ts)
            H_LIST[list - QueryCommand]
            H_CREATE[create - PutCommand]
            H_STATUS[updateStatus - UpdateCommand]
        end

        DDB[(Pedidos@Table - DynamoDB Single-Table)]
    end

    %% Conexiones
    BROWSER --> UI
    UI --> V_VIVO & V_KDS & V_PROG & V_CHAT & V_CAT & V_INS & V_CFG
    V_VIVO & V_KDS & V_CHAT --> CTX
    CTX --> SOUND
    CTX --> ADAPT
    CTX --> INV_SRV
    CTX --> PROD_API
    CTX --> AUTH_CTX

    PROD_API --> APIGW
    APIGW --> COGNITO
    APIGW --> H_LIST & H_CREATE & H_STATUS
    H_LIST & H_CREATE & H_STATUS --> DDB
    WA -.-> |Webhook / Intent Detection| CTX
```

---

## 5.2 Capa Frontend (Web SPA)

* **Ubicación en el Monorepo**: `packages/apps/web/modules/app/src/compositions/pedidos/`
* **Patrón de Diseño**: *Container-Presentational* con *Provider Pattern* y composición desacoplada.

### Componentes Clave:
1. **Punto de Entrada (`PedidosModule.tsx`)**:
   * Encapsula todo el árbol de componentes dentro de `<PedidosProvider>`.
   * Administra la barra de navegación de 3 pilares: **Operación**, **Menú & Stock** y **Configuración**.
   * Soporta *deep-linking* mediante eventos globales (`necto_navigate_pedidos`) para saltar desde notificaciones a comandas o chats específicos.
2. **Estado Global React (`PedidosContext.tsx`)**:
   * Gestiona colecciones de pedidos activos (`orders`), histórico (`historialOrders`), programados (`programados`), insumos (`ingredients`), movimientos de Kardex (`stockMovements`) y conversaciones WhatsApp (`conversaciones`).
   * Despacha acciones puras con efectos colaterales automáticos (alertas de sonido, actualización de Kardex y notificaciones a clientes).
3. **Submódulos de Operación (`operacion/`)**:
   * `PedidosEnVivoView.tsx`: Tablero Kanban multicanal con filtrado dinámico, buscador y selector de ritmo.
   * `PreparacionTiemposView.tsx`: Terminal KDS de cocina enfocado en eficiencia de cocción, tiempos y estaciones.
   * `ProgramadosView.tsx`: Planificador semanal de entregas corporativas y recurrentes.
   * `ConversacionesView.tsx`: Inbox interactivo Human-in-the-Loop para atención directa y conversión de chat a comanda.
4. **Submódulos de Gestión (`gestion/`)**:
   * `CatalogoInteligenteView.tsx`: Maestro de productos con soporte de variantes y recetas.
   * `InsumosStockView.tsx`: Módulo de escandallo para control de inventario de materias primas con umbrales y registro de mermas.
   * `AutomatizacionesView.tsx`: Reglas reactivas basadas en disparadores (*triggers*), condiciones y acciones.
   * `TurnosCapacidadView.tsx`: Asignación de personal a puestos de trabajo y cálculo de capacidad de despacho.
   * `RolesPermisosView.tsx`: Matriz RBAC para operadores, supervisores y cocineros.
   * `ResumenDashboardView.tsx` y `AnaliticaView.tsx`: Tableros de métricas en tiempo real.

---

## 5.3 Capa de Integraciones Locales (Monorepo)

1. **Integración con Kardex Maestro (`ModuloInventario`)**:
   * Archivo: `packages/apps/web/modules/app/src/ModuloInventario/services/inventoryService.ts`
   * Al transicionar una comanda a `EN_PREPARACION` o `LISTO`, el contexto invoca:
     ```typescript
     await inventoryService.consumeSaleOrder({
       orderId: order.id,
       items: order.items.map(i => ({ productId: i.productId, name: i.name, quantity: i.quantity })),
       channel: order.channel,
       author: "Motor de Ventas"
     });
     ```
   * Esto genera una salida física formal en el inventario general del ERP, descontando el stock actual y recalculando el estado del producto (*Óptimo*, *Bajo*, *Crítico* o *Agotado*).

2. **Adaptador de Catálogo Cloud (`adapters/productAdapter.ts`)**:
   * Conecta el modelo simple del backend cloud (`Product`: `id`, `name`, `sku`, `price`, `stock`) con el modelo enriquecido de frontend (`ProductItem`: categorías, modificadores, recetas, calificaciones, fotos).

3. **Efectos Auditivos (`utils/soundEffects.ts`)**:
   * Implementados mediante **Web Audio API** (`AudioContext`), generando frecuencias sinusoidales puras en el navegador sin dependencias de archivos de audio externos:
     * `playNewOrderSound()`: Tono arpegiado ascendente (C5 → E5 → G5).
     * `playSuccessSound()`: Acorde armónico de doble campana.
     * `playUrgentAlertSound()`: Beep repetitivo de advertencia para comandas demoradas o handoff de WhatsApp.

---

## 5.4 Capa Backend e Infraestructura Cloud (SST v3 / AWS)

* **Definición de Infraestructura**: `packages/cloud/core/infra/factories/pedidos.ts`
* **Implementación de Handlers Lambda**: `packages/cloud/core/infra/handlers/pedidos.ts`

### 1. Base de Datos: DynamoDB Single-Table (`Pedidos@Table`)
* **Partición Principal**:
  * `pk`: `OWNER#{ownerId}` (Aislamiento estricto multi-inquilino / multi-franquicia).
  * `sk`: `ORDER#{orderId}` (Identificador unívoco del pedido).
* **Propiedades Almacenadas en el Ítem**:
  * `customerName`, `customerPhone`, `deliveryAddress`, `channel`, `type`, `status`.
  * `items`: Array serializado con ítems, cantidades y precios.
  * `history`: Array de eventos de auditoría (`OrderEvent`).
  * `urgency`, `estimatedMinutes`, `elapsedMinutes`.
  * `isAIOrigin`, `aiConfidence`.

### 2. API Gateway v2 y Seguridad (`Pedidos@Api`)
* **Gateway**: HTTP API Gateway v2 provisionado mediante SST v3.
* **CORS**: Configurado con comodín o dominios seguros de la SPA y headers de `Authorization` y `Content-Type`.
* **Autorización**: **Cognito User Pool JWT Authorizer** enlazado a la identidad federada del usuario (`ownerId`).
* **Rutas Provisionadas en el Handler**:
  * `GET /pedidos`: Ejecuta un `QueryCommand` filtrando por `pk = :pk AND begins_with(sk, 'ORDER#')`.
  * `POST /pedidos`: Ejecuta un `PutCommand` insertando el pedido con evento inicial en `history`.
  * `PATCH /pedidos/{id}/status`: Ejecuta un `UpdateCommand` atómico que actualiza el atributo `status` y añade el nuevo evento a la lista `history` mediante `list_append`.

---

## 5.5 Estrategia de Modo Offline / Mock Local

Para garantizar desarrollo y operación continua cuando las Lambdas de AWS no están desplegadas (por ejemplo, restricciones de IAM en cuentas de desarrollo locales), el frontend cuenta con un selector de entorno transparente en `packages/apps/web/modules/app/src/api/products.ts`:
```typescript
export const USE_MOCK =
  import.meta.env.VITE_USE_MOCK === 'true' || !import.meta.env.VITE_API_URL;
```
Cuando `USE_MOCK` está activo, `PedidosContext` carga los datos semilla desde `mockData.ts`, permitiendo ejecutar la totalidad de la experiencia (Kanban, KDS, chats interactivos, recetas, deducción de stock y simulación de IA) de manera 100% autónoma en el navegador.
