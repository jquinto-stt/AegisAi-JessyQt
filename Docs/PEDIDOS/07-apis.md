# 07. Catálogo de APIs y Endpoints del Módulo Pedidos

Este documento detalla todas las APIs y endpoints HTTP que existen en el código de **StockFlow** relacionados con el módulo Pedidos, especificando métodos, rutas, headers de autenticación, estructuras de request/response y códigos de retorno.

---

## 7.1 Resumen de Endpoints Identificados

| Método | Ruta | Componente / Archivo | Estado en el Proyecto |
|---|---|---|---|
| `GET` | `/pedidos` | `packages/cloud/core/infra/handlers/pedidos.ts` (`list`) | Implementado en Lambda; staged en infra |
| `POST` | `/pedidos` | `packages/cloud/core/infra/handlers/pedidos.ts` (`create`) | Implementado en Lambda; staged en infra |
| `PATCH` | `/pedidos/{id}/status` | `packages/cloud/core/infra/handlers/pedidos.ts` (`updateStatus`) | Implementado en Lambda; staged en infra |
| `GET` | `/products` | `packages/apps/web/modules/app/src/api/products.ts` | Activo / Soporta Mock |
| `POST` | `/products` | `packages/apps/web/modules/app/src/api/products.ts` | Activo / Soporta Mock |
| `PUT` | `/products/{id}` | `packages/apps/web/modules/app/src/api/products.ts` | Activo / Soporta Mock |

---

## 7.2 Especificación de la API de Pedidos (`Pedidos@Api`)

* **Autenticación Requerida**: Sí. Bearer Token emitido por **AWS Cognito User Pool** en el header `Authorization: Bearer <JWT>`.
* **Identificación de Inquilino**: El backend extrae automáticamente el `ownerId` de las claims del token JWT (`getOwnerId(event)`). No se requiere enviar el ID de usuario en la URL o body.

---

### 1. Listar Pedidos
* **Método**: `GET`
* **Ruta**: `/pedidos`
* **Propósito**: Obtener todas las órdenes pertenecientes al negocio autenticado desde DynamoDB (`Pedidos@Table`).
* **Headers**:
  ```http
  Authorization: Bearer eyJraWQiOi...
  Content-Type: application/json
  ```
* **Query Parameters**: Ninguno obligatorio.
* **Códigos de Respuesta HTTP**:
  * `200 OK`: Lista de órdenes obtenida exitosamente.
  * `401 Unauthorized`: Token ausente, inválido o expirado.
  * `500 Internal Server Error`: Fallo de conexión con DynamoDB.
* **Ejemplo de Respuesta (`200 OK`)**:
  ```json
  {
    "orders": [
      {
        "pk": "OWNER#usr_7f8a9b",
        "sk": "ORDER#PED-1025",
        "id": "PED-1025",
        "customerName": "Mariana Gómez",
        "customerPhone": "+57 300 987 6543",
        "deliveryAddress": "Calle 72 # 11-45 (Apto 402)",
        "channel": "whatsapp",
        "type": "inmediato",
        "status": "CONFIRMADO",
        "items": [
          {
            "productId": "prod-01",
            "name": "Empanada de Carne Cortada a Cuchillo",
            "quantity": 6,
            "unitPrice": 5500,
            "option": "Horneada"
          },
          {
            "productId": "prod-07",
            "name": "Gaseosa Cola 354ml",
            "quantity": 2,
            "unitPrice": 4500
          }
        ],
        "total": 42000,
        "createdAt": "2026-09-08T12:30:00.000Z",
        "estimatedMinutes": 25,
        "elapsedMinutes": 5,
        "urgency": "A_TIEMPO",
        "isAIOrigin": true,
        "aiConfidence": "Alta",
        "history": [
          {
            "timestamp": "2026-09-08T12:30:00.000Z",
            "toStatus": "NUEVO",
            "user": "usr_7f8a9b",
            "note": "Pedido creado vía WhatsApp"
          }
        ]
      }
    ]
  }
  ```

---

### 2. Crear Pedido
* **Método**: `POST`
* **Ruta**: `/pedidos`
* **Propósito**: Registrar un nuevo pedido en la base de datos (utilizado por el webhook de WhatsApp o el checkout web).
* **Body (JSON)**:
  ```json
  {
    "customerName": "Carlos Mendoza",
    "customerPhone": "+57 312 456 7890",
    "deliveryAddress": "Carrera 15 # 85-30",
    "channel": "whatsapp",
    "type": "inmediato",
    "status": "NUEVO",
    "items": [
      {
        "productId": "prod-02",
        "name": "Empanada de Pollo al Verdeo",
        "quantity": 4,
        "unitPrice": 5500
      }
    ],
    "total": 22000,
    "estimatedMinutes": 20,
    "isAIOrigin": true,
    "aiConfidence": "Alta"
  }
  ```
* **Códigos de Respuesta HTTP**:
  * `201 Created`: Pedido persistido con identificador unívoco.
  * `400 Bad Request`: Payload malformado.
  * `401 Unauthorized`: No autenticado.
  * `500 Internal Server Error`: Error interno en el motor DynamoDB.
* **Ejemplo de Respuesta (`201 Created`)**:
  ```json
  {
    "order": {
      "pk": "OWNER#usr_7f8a9b",
      "sk": "ORDER#d9b2e5a1-4321-4a9f-8891-628a8d1e345f",
      "id": "d9b2e5a1-4321-4a9f-8891-628a8d1e345f",
      "customerName": "Carlos Mendoza",
      "status": "NUEVO",
      "total": 22000,
      "createdAt": "2026-09-08T12:45:10.123Z",
      "history": [
        {
          "timestamp": "2026-09-08T12:45:10.123Z",
          "toStatus": "NUEVO",
          "user": "usr_7f8a9b",
          "note": "Pedido creado"
        }
      ]
    }
  }
  ```

---

### 3. Actualizar Estado de Pedido
* **Método**: `PATCH`
* **Ruta**: `/pedidos/{id}/status`
* **Propósito**: Cambiar el estado operativo del pedido (`CONFIRMADO`, `EN_PREPARACION`, `LISTO`, `FINALIZADO`, etc.) registrando la entrada en el historial de eventos atómicamente.
* **Path Parameters**:
  * `id`: Identificador del pedido (ej. `"PED-1025"`).
* **Body (JSON)**:
  ```json
  {
    "status": "EN_PREPARACION",
    "note": "Comanda ingresada a horno de piedra"
  }
  ```
* **Códigos de Respuesta HTTP**:
  * `200 OK`: Transición de estado aplicada exitosamente.
  * `400 Bad Request`: Falta el parámetro `id` en la ruta o estado inválido.
  * `401 Unauthorized`: No autorizado.
  * `500 Internal Server Error`: Fallo de actualización en DynamoDB.
* **Ejemplo de Respuesta (`200 OK`)**:
  ```json
  {
    "success": true
  }
  ```

---

## 7.3 API de Catálogo (`/products`)

Ubicación del cliente en frontend: `packages/apps/web/modules/app/src/api/products.ts`.

### 1. Listar Productos
* **Método**: `GET /products`
* **Respuesta**: `{ "products": [ { "id": "...", "ownerId": "...", "name": "...", "sku": "...", "price": 5500, "stock": 50 } ] }`

### 2. Crear Producto
* **Método**: `POST /products`
* **Body**: `{ "name": "Empanada Caprese", "sku": "EMP-003", "price": 5500, "stock": 40 }`
* **Respuesta**: `{ "product": { ... } }`

### 3. Actualizar Producto
* **Método**: `PUT /products/{id}`
* **Body**: `{ "price": 6000, "stock": 35 }`
* **Respuesta**: `{ "product": { ... } }`

---

## 7.4 Servicio Interno Transaccional (`inventoryService`)

Aunque no es un endpoint HTTP expuesto hacia el exterior, funciona como la **API de Servicio Interna** del monorepo:
* **Método TypeScript**: `inventoryService.consumeSaleOrder(params)`
* **Firma**:
  ```typescript
  consumeSaleOrder(params: {
    orderId: string;
    items: Array<{ productId?: string; sku?: string; name: string; quantity: number }>;
    channel?: string;
    author?: string;
  }): Promise<Array<{ product: InventoryProduct; movement: StockMovement }>>
  ```
* **Efecto**: Descuenta el inventario maestro en memoria / almacenamiento local de `ModuloInventario` y genera una salida formal en el Kardex.
