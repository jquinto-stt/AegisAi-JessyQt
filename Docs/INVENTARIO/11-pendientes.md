# 11. Pendientes y Funcionalidades Propuestas

Este documento distingue explícitamente lo que actualmente está implementado en el código de **StockFlow (Módulo Inventario)** de las funcionalidades pendientes, en staging o propuestas a futuro.

---

## 11.1 Comparativa de Estado: Implementado vs. Pendiente

| Funcionalidad | Estado Actual | Ubicación en el Código | Requisito para Producción |
|---|---|---|---|
| **Rutas HTTP Cloud en API Gateway** | Comentadas / Staged | `packages/cloud/core/infra/factories/inventarios.ts` (L53-55) | Descomentar y desplegar con SST v3 cuando los permisos IAM estén habilitados. |
| **Escáner de Código de Barras con Cámara** | Propuesto | `ProductFormModal.tsx` | Integrar librería de escaneo por cámara de móvil/tablet (ej. `html5-qrcode` o Barcode Detection API nativa). |
| **Sincronización WebSockets Multi-bodega** | Local-First / Pub-Sub | `inventoryService.ts` | Conectar con API Gateway WebSockets para sincronizar múltiples bodegueros en tiempo real. |
| **Generación Automática de Requisiciones** | Manual vía PurchaseOrders | `PurchasingView.tsx` | Job programado o trigger que genere un borrador de OC al detectar `status === "low_stock"`. |
| **Métodos de Costeo Avanzados (PEPS / Promedio Ponderado)** | Costo Directo de Compra | `inventoryService.ts` (`receivePurchaseOrder`) | Implementar capas contables FIFO (PEPS) para valoración fiscal estricta. |

---

## 11.2 Detalle de Tareas Pendientes

### 1. Despliegue de Endpoints en AWS SST (`factories/inventarios.ts`)
* **Evidencia**:
  En `packages/cloud/core/infra/factories/inventarios.ts`:
  ```typescript
  // Routes (linked to DynamoDB table)
  // api.route('GET /inventarios', { handler: 'infra/handlers/inventarios.list', link: [_table] }, _auth);
  // api.route('POST /inventarios', { handler: 'infra/handlers/inventarios.create', link: [_table] }, _auth);
  // api.route('PATCH /inventarios/{id}/status', { handler: 'infra/handlers/inventarios.updateStatus', link: [_table] }, _auth);
  ```
* **Situación**:
  Los controladores Lambda (`list`, `create`, `updateStatus`) ya están completamente programados en `packages/cloud/core/infra/handlers/inventarios.ts` utilizando `@aws-sdk/lib-dynamodb`. Requieren ser descomentados para exponer las rutas públicas en el API Gateway v2.

---

### 2. Lector de Códigos de Barras por Cámara Móvil
* **Situación Actual**:
  El modelo `InventoryProduct` posee la propiedad `barcode`, y la interfaz acepta la entrada de pistolas lectoras USB/Bluetooth (que emulan teclado enviando pulsaciones).
* **Propuesta**:
  Añadir un botón en `ProductFormModal` y `CatalogView` que active la cámara web o del smartphone del bodeguero para leer códigos EAN-13, QR o UPC directamente sin periféricos adicionales.

---

### 3. Sugerencia Automática de Compra (Reorden Inteligente)
* **Situación Actual**:
  El sistema calcula `low_stock` cuando `stockActual <= stockMinimo` y muestra un badge visual en el catálogo y métricas.
* **Propuesta**:
  Añadir un botón *"Generar Órdenes de Compra Sugeridas"* que agrupe todos los productos con `low_stock` por proveedor habitual (`supplier`) y cree automáticamente las órdenes de compra en estado `draft`.
