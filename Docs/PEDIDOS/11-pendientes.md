# 11. Pendientes y Funcionalidades Propuestas

Este documento recopila de manera explícita y transparente todas las funcionalidades, rutas, integraciones y mejoras identificadas en comentarios del código, especificaciones preliminares (`openspec`) y archivos de infraestructura que **NO están actualmente implementadas o se encuentran en fase de propuesta**.

---

## 11.1 Resumen Comparativo de Estado

| Característica / Funcionalidad | Estado Actual en Código | Ubicación en el Código | Requerimiento para Producción |
|---|---|---|---|
| **Rutas HTTP Cloud en API Gateway** | Comentadas / Staged | `packages/cloud/core/infra/factories/pedidos.ts` (L53-56) | Descomentar y desplegar con SST v3 una vez resueltos los permisos IAM de la cuenta AWS. |
| **Endpoint `GET /pedidos/stats`** | Propuesto en infra | `factories/pedidos.ts` (L56) | Crear la función de agregación de métricas en `handlers/pedidos.ts`. |
| **Webhook Real de Meta WhatsApp Cloud API** | Simulado en frontend | `PedidosContext.tsx` (`simulateCustomerMessage`) | Implementar Lambda receptora de Webhooks con verificación de token `hub.challenge`. |
| **Sincronización en Tiempo Real Multi-dispositivo** | Eventos locales en SPA | `PedidosContext.tsx` | Implementar WebSocket API (API Gateway v2 WebSockets) o AWS AppSync GraphQL Subscriptions. |
| **Impresión Directa ESC/POS por Bluetooth/Serial** | Emulación visual y `window.print()` | `ThermalTicketModal.tsx` | Integrar Web Serial API o Web Bluetooth API para envío directo de comandos ESC/POS sin diálogo del navegador. |
| **Pasarela de Pago Online Automatizada (IPN)** | Validación humana de comprobantes | `ConversationThread.tsx`, `ChatMessage` | Webhook de confirmación de pago para Mercado Pago / Wompi / PSE. |

---

## 11.2 Detalle de Funcionalidades Pendientes

### 1. Despliegue de Rutas en SST v3 (`factories/pedidos.ts`)
* **Evidencia en Código**:
  En `packages/cloud/core/infra/factories/pedidos.ts`:
  ```typescript
  // Routes (linked to DynamoDB table)
  // api.route('GET /pedidos', { handler: 'infra/handlers/pedidos.list', link: [_table] }, _auth);
  // api.route('POST /pedidos', { handler: 'infra/handlers/pedidos.create', link: [_table] }, _auth);
  // api.route('PATCH /pedidos/{id}/status', { handler: 'infra/handlers/pedidos.updateStatus', link: [_table] }, _auth);
  // api.route('GET /pedidos/stats', { handler: 'infra/handlers/pedidos.stats', link: [_table] }, _auth);
  ```
* **Situación**:
  Los controladores Lambda (`list`, `create`, `updateStatus`) ya están completamente codificados en `packages/cloud/core/infra/handlers/pedidos.ts`. Las rutas se encuentran comentadas temporalmente en la definición de infraestructura de SST para permitir el despliegue de módulos base mientras se resuelven las políticas de roles en AWS (`iam:CreateRole`).
* **Acción Pendiente**: Descomentar las rutas y ejecutar `sst deploy`.

---

### 2. Receptor de Webhooks de Meta WhatsApp Cloud API
* **Evidencia en Código**:
  La atención conversacional inteligente (detección de intención, construcción de comanda, consulta de carta y alérgenos, y escalado por comprobantes bancarios) funciona actualmente con un simulador reactivo en `PedidosContext.tsx`.
* **Situación**:
  En un entorno productivo omnicanal, se requiere recibir los payloads JSON de Meta (`entry[0].changes[0].value.messages`).
* **Acción Pendiente**:
  1. Crear un endpoint `POST /webhooks/whatsapp` en SST.
  2. Implementar la verificación `GET /webhooks/whatsapp` con `hub.verify_token`.
  3. Enlazar la Lambda con el modelo fundacional de IA (ej. Google Gemini o Amazon Bedrock) para procesar el texto entrante y persistir la comanda en `Pedidos@Table`.

---

### 3. Sincronización en Tiempo Real entre Terminales (WebSockets)
* **Evidencia en Código**:
  La comunicación entre vistas ocurre en memoria a través de React Context y eventos CustomEvent en la ventana del navegador (`necto_navigate_pedidos`).
* **Situación**:
  Si la pantalla KDS de la cocina se ejecuta en una tablet Android separada y la caja en una PC, los cambios de estado requieren recargar o sincronizarse en la nube.
* **Acción Pendiente**:
  Provisionar un API Gateway WebSocket con rutas `$connect`, `$disconnect`, y `broadcastOrderEvent` para reflejar en menos de 200ms las transiciones de cocina en la caja registradora.

---

### 4. Puente de Hardware para Impresoras Térmicas (ESC/POS)
* **Evidencia en Código**:
  El componente `ThermalTicketModal.tsx` genera una representación visual fidedigna de un ticket de 58mm u 80mm e invoca `window.print()` con estilos `@media print`.
* **Mejora Propuesta**:
  Implementar conexión nativa por cable USB / Serial mediante `navigator.serial` para cortar el papel y abrir el cajón monedero automáticamente sin abrir el diálogo estándar de impresión del sistema operativo.

---

### 5. Validación Automatizada de Pagos QR
* **Evidencia en Código**:
  Actualmente, cuando el cliente envía un comprobante de Nequi o Bancolombia, el sistema activa la cola `REQUIERE_INTERVENCION` con motivo `VERIFICAR_PAGO_TRANSFERENCIA` para que el cajero lo verifique visualmente.
* **Mejora Propuesta**:
  Integración con APIs bancarias oficiales o pasarelas de pago con links dinámicos (Wompi / MercadoPago / Bold) para auto-confirmar la comanda en cuanto el webhook financiero confirme el ingreso de fondos.
