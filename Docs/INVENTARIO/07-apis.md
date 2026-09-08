# 07. Catálogo de APIs y Métodos del Módulo Inventario

Este documento especifica todos los endpoints cloud HTTP y las firmas del servicio central del módulo **Inventario** de **StockFlow**.

---

## 7.1 Resumen de Endpoints Cloud (`Inventarios@Api`)

Ubicación del código fuente: `packages/cloud/core/infra/handlers/inventarios.ts` e infraestructura en `packages/cloud/core/infra/factories/inventarios.ts`.

| Método | Ruta | Handler Lambda | Propósito |
|---|---|---|---|
| `GET` | `/inventarios` | `handlers/inventarios.list` | Listar ítems de inventario del inquilino autenticado. |
| `POST` | `/inventarios` | `handlers/inventarios.create` | Crear un ítem de inventario con código y evidencias. |
| `PATCH` | `/inventarios/{id}/status` | `handlers/inventarios.updateStatus` | Actualizar estado y condición física del ítem. |

---

## 7.2 Especificación Detallada de Endpoints Cloud

### 1. Listar Ítems de Inventario
* **Método**: `GET`
* **Ruta**: `/inventarios`
* **Headers**: `Authorization: Bearer <Cognito_JWT>`
* **Códigos HTTP**: `200 OK`, `401 Unauthorized`, `500 Internal Server Error`
* **Ejemplo de Respuesta (`200 OK`)**:
  ```json
  {
    "items": [
      {
        "pk": "OWNER#usr_empresa123",
        "sk": "ITEM#inv-789a",
        "id": "inv-789a",
        "code": "INV-1045",
        "name": "Bolsa Empanada Kraft x100",
        "category": "Packaging",
        "clientName": "Default",
        "status": "Activo",
        "condition": "Buena",
        "location": "Almacén Central",
        "evidenceCount": 1,
        "evidenceType": "foto",
        "lastUpdated": "2026-09-08T12:00:00.000Z",
        "createdAt": "2026-09-08T10:00:00.000Z"
      }
    ]
  }
  ```

---

### 2. Crear Ítem de Inventario
* **Método**: `POST`
* **Ruta**: `/inventarios`
* **Body (JSON)**:
  ```json
  {
    "name": "Harina de Trigo Especial 50kg",
    "category": "Harinas y Masas",
    "condition": "Buena",
    "location": "Bodega Norte",
    "notes": "Lote recibido en tarimas selladas"
  }
  ```
* **Códigos HTTP**: `201 Created`, `401 Unauthorized`, `500 Internal Server Error`
* **Ejemplo de Respuesta (`201 Created`)**:
  ```json
  {
    "item": {
      "pk": "OWNER#usr_empresa123",
      "sk": "ITEM#4b12c8a0-2f91-4d33-a740-9a2c1b9f7721",
      "id": "4b12c8a0-2f91-4d33-a740-9a2c1b9f7721",
      "code": "INV-4012",
      "name": "Harina de Trigo Especial 50kg",
      "category": "Harinas y Masas",
      "status": "Activo",
      "condition": "Buena",
      "location": "Bodega Norte",
      "createdAt": "2026-09-08T12:30:15.120Z"
    }
  }
  ```

---

### 3. Actualizar Estado y Condición
* **Método**: `PATCH`
* **Ruta**: `/inventarios/{id}/status`
* **Body (JSON)**:
  ```json
  {
    "status": "Inactivo",
    "condition": "Merma"
  }
  ```
* **Códigos HTTP**: `200 OK`, `400 Bad Request`, `401 Unauthorized`, `500 Internal Server Error`

---

## 7.3 Métodos del Servicio Transaccional Interno (`inventoryService`)

Ubicación: `packages/apps/web/modules/app/src/ModuloInventario/services/inventoryService.ts`.

### Métodos Principales:

1. **`saveProduct(productData)`**:
   * Inserta o edita un producto en el catálogo. Si es nuevo con `stockActual > 0`, genera automáticamente un movimiento `STOCK_CREATE` en el Kardex.
2. **`registerMovement(params)`**:
   * Modifica stock por `ENTRADA` o `SALIDA`. Valida que el stock no sea negativo en salidas y registra el movimiento de Kardex con `author`, `concept` y `referenceDoc`.
3. **`consumeSaleOrder(params)`**:
   * Descuenta stock de múltiples ítems a partir de una orden de venta procesada en el módulo Pedidos (`channel`, `orderId`).
4. **`registerStockCount(params)`**:
   * Ajusta existencias tras un conteo físico manual, calculando la desviación neta (`diff`).
5. **`registerStockTransfer(params)`**:
   * Traslada mercancía entre bodegas, cambiando el `locationId` del producto y asentando un movimiento `STOCK_TRANSFER`.
6. **`createPurchaseOrder(poData)` & `receivePurchaseOrder(poId)`**:
   * Genera órdenes de compra y recibe la mercancía física en almacén, actualizando el Kardex y el costo unitario de los productos comprados.
7. **`createBuildOrder(boData)` & `executeBuildOrder(boId)`**:
   * Valida stock de componentes, descuenta materias primas del BOM e ingresa producto terminado en una transacción atómica.
