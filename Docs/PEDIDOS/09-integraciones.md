# 09. Integraciones del Módulo Pedidos

Este documento especifica todas las integraciones internas y externas que operan dentro del módulo **Pedidos** en **StockFlow**.

---

## 9.1 Matriz de Integraciones

| Sistema / Servicio | Tipo | Protocolo / Mecanismo | Archivo Clave en el Código |
|---|---|---|---|
| **`ModuloInventario` (Kardex ERP)** | Interno Monorepo | Invocación TypeScript Asíncrona | `inventoryService.ts` |
| **`Products API` (Catálogo Necto)** | Backend SST / Cloud | HTTP REST / JSON | `api/products.ts`, `productAdapter.ts` |
| **AWS Cognito User Pool** | Externo Cloud (AWS) | OAuth 2.0 / JWT Bearer | `AuthContext.tsx`, `auth.ts` |
| **AWS DynamoDB (`Pedidos@Table`)** | Externo Cloud (AWS) | AWS SDK v3 (`@aws-sdk/lib-dynamodb`) | `infra/handlers/pedidos.ts` |
| **Web Audio API (Sintetizador)** | API Nativa de Navegador | AudioContext / Sintetizador de Ondas | `utils/soundEffects.ts` |
| **WhatsApp / Meta Cloud API** | Externo Conversacional | Webhooks HTTP + Simulación Local | `ConversacionesView.tsx`, `PedidosContext.tsx` |

---

## 9.2 Detalle de Cada Integración

### 1. Kardex Maestro ERP (`inventoryService`)
* **Propósito**: Garantizar que cada producto o ingrediente despachado quede asentado en la contabilidad y trazabilidad física del negocio.
* **Momento en que interviene**: Al pasar una comanda a `EN_PREPARACION`, `LISTO` o `FINALIZADO`.
* **Información que intercambia**:
  * Envío: `orderId`, `channel`, `author`, e ítems con `productId`, `sku`, `name` y `quantity`.
  * Recepción: Arreglo de productos actualizados y movimientos de stock (`SALIDA` con concepto `"Venta Automática Pedido #{id}"`).
* **Dependencias**: Singleton `inventoryService` exportado desde `packages/apps/web/modules/app/src/ModuloInventario/services/inventoryService.ts`.

---

### 2. Products API (Catálogo Cloud)
* **Propósito**: Sincronizar altas, bajas y modificaciones de precios entre el catálogo local y la base de datos cloud centralizada.
* **Momento en que interviene**: Al crear un nuevo plato en `CatalogoInteligenteView` o modificar precios de venta.
* **Información que intercambia**:
  * Mapeo mediante `productAdapter.ts`:
    * Entrada Cloud: `{ name, sku, price, stock }`.
    * Salida Frontend: `{ id, name, code, price, stockEstimated, isAvailable, recipe, modifiers, category }`.
* **Estrategia Fallback**: Si `VITE_USE_MOCK = true` o no hay variable `VITE_API_URL`, conmuta a `mockProducts.ts` para permitir el funcionamiento offline.

---

### 3. AWS Cognito (Autenticación y Seguridad)
* **Propósito**: Autenticar al usuario que opera el panel y firmar criptográficamente las peticiones HTTP hacia el API Gateway.
* **Mecanismo**:
  * En frontend: El hook `useAuth()` expone `getIdToken()`, que provee el JWT vigente.
  * En backend: El autorizador JWT de SST v3 (`Pedidos@Api`) valida el emisor (`issuer: https://cognito-idp.us-east-1.amazonaws.com/{userPoolId}`) y la audiencia del cliente.
  * En los handlers: La función auxiliar `getOwnerId(event)` decodifica las claims para obtener el ID de inquilino (`sub` o `cognito:username`).

---

### 4. AWS DynamoDB (`Pedidos@Table`)
* **Propósito**: Almacenamiento no relacional de alta velocidad y baja latencia para pedidos y eventos históricos.
* **Mecanismo**:
  * Utiliza `@aws-sdk/lib-dynamodb` con `DynamoDBDocumentClient`.
  * Comandos utilizados:
    * `QueryCommand`: Búsquedas por clave de partición `pk = OWNER#{id}` y prefijo `sk = ORDER#`.
    * `PutCommand`: Escritura de nuevas órdenes con fecha ISO.
    * `UpdateCommand`: Modificaciones atómicas con expresiones condicionales y `list_append`.

---

### 5. Web Audio API (Hardware Audio)
* **Propósito**: Emitir alertas sonoras en la cocina y mostrador sin depender de archivos de audio descargables que puedan fallar por red o bloqueos de autoplay.
* **Implementación**:
  ```typescript
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.connect(gain);
  gain.connect(ctx.destination);
  ```
* **Eventos Notificados**:
  * Nuevo pedido entrante (`playNewOrderSound`).
  * Pedido listo o acción exitosa (`playSuccessSound`).
  * Comanda demorada o cliente pidiendo intervención (`playUrgentAlertSound`).

---

### 6. WhatsApp / Meta Cloud API
* **Propósito**: Canal de interacción directa con el comensal.
* **Estado Actual**:
  * En el código actual, la capa interactiva está implementada mediante el motor reactivo de `ConversacionesView.tsx` y `PedidosContext.tsx`.
  * Permite simular mensajes entrantes de clientes (`simulateCustomerMessage`) con parsing heurístico multi-turno (solicitud de ítems, adición de combos, direcciones de entrega y detección de comprobantes Nequi/Bancolombia con OCR simulado).
  * El modelo está completamente estructurado para desacoplar el canal y conectarse a un webhook real de AWS Lambda expuesto a Meta Cloud API.
