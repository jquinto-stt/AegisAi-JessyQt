# 09. Integraciones del Módulo Inventario

Este documento describe todas las integraciones internas del monorepo y las conexiones con sistemas externos que intervienen en el módulo **Inventario** de **StockFlow**.

---

## 9.1 Matriz de Integraciones

| Sistema / Componente | Tipo | Mecanismo de Integración | Propósito |
|---|---|---|---|
| **Módulo Pedidos** | Interno Monorepo | Invocación TypeScript Asíncrona | Descuento automático de existencias físicas tras confirmar comandas de venta. |
| **Excel / CSV Importer** | Servicio de Archivos | FileReader / XLSX Parser en Browser | Carga masiva de productos, saldos iniciales y precios desde hojas de cálculo. |
| **AWS DynamoDB (`Inventarios@Table`)** | Base de Datos Cloud | AWS SDK v3 (`PutCommand`, `QueryCommand`) | Persistencia y replicación centralizada de ítems de inventario por empresa. |
| **AWS Cognito** | Seguridad Cloud | JWT Authorizer en API Gateway v2 | Identificación del inquilino y firma de peticiones HTTP. |
| **Lectores de Código de Barras** | Hardware POS | Input Event Capture / Propiedad `barcode` | Identificación rápida de productos en caja y almacén. |

---

## 9.2 Detalle de Cada Integración

### 1. Módulo Pedidos (`compositions/pedidos`)
* **Punto de Enlace**: `packages/apps/web/modules/app/src/compositions/pedidos/context/PedidosContext.tsx`
* **Método Utilizado**: `inventoryService.consumeSaleOrder(params)`
* **Momento de Ejecución**: En cuanto un pedido pasa a estado `EN_PREPARACION` o `LISTO`.
* **Datos Intercambiados**:
  * Origen: Pedidos envía `orderId`, canal de venta (`"whatsapp"`, `"presencial"`, `"web"`) y el listado de ítems con `quantity`.
  * Destino: Inventario busca los ítems, reduce el saldo en `stockActual`, genera movimientos de tipo `SALIDA` en el Kardex y retorna los productos actualizados.
* **Garantía de Idempotencia**: El módulo Pedidos verifica la bandera `isStockConsumed` antes de invocar el servicio, asegurando que cada comanda se descuente una sola vez.

---

### 2. Importador Masivo de Hojas Excel (`ImportExcelModal.tsx`)
* **Propósito**: Migración ágil de inventarios desde sistemas legados o planillas de cálculo.
* **Mecanismo**:
  * El usuario arrastra un archivo `.xlsx` o `.csv`.
  * La interfaz realiza un mapeo visual interactivo de columnas (SKU, Nombre, Costo, Precio, Categoría, Stock Inicial, Ubicación).
  * Valida filas con errores (SKU faltante o cantidades no numéricas) antes de procesar.
  * Inserta en bloque los productos e inicializa sus saldos en el Kardex mediante `STOCK_CREATE`.

---

### 3. AWS DynamoDB (`Inventarios@Table`)
* **Infraestructura**: Provisionada en SST v3 (`packages/cloud/core/infra/factories/inventarios.ts`).
* **Modelo Single-Table**:
  * Clave de Partición: `pk: OWNER#{ownerId}`
  * Clave de Ordenamiento: `sk: ITEM#{itemId}`
* **Sincronización**: Los handlers Lambda en `packages/cloud/core/infra/handlers/inventarios.ts` procesan comandos atómicos `PutCommand` y `UpdateCommand`, listos para replicar los ítems del almacén a la nube.
