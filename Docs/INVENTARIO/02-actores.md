# 02. Actores del Sistema en el Módulo Inventario

Este documento detalla todos los actores humanos, roles operativos y componentes automatizados que interactúan con el módulo **Inventario** en **StockFlow**.

---

## 2.1 Matriz General de Actores

| Actor | Tipo | Rol Principal | Interfaz / Punto de Entrada |
|---|---|---|---|
| **Jefe de Almacén / Bodeguero** | Humano (Interno) | Custodia física de mercancía y movimientos | `CatalogView`, `StockMovementModal`, `StockTransferModal` |
| **Auditor de Inventario** | Humano (Interno) | Conciliación de stock físico vs. contable | `StockCountModal`, `KardexView`, `ImportExcelModal` |
| **Encargado de Compras** | Humano (Interno) | Aprovisionamiento con proveedores | `PurchasingView`, `PurchaseOrderModal` |
| **Jefe de Producción (BOM)** | Humano (Interno) | Transformación de materias primas a producto terminado | `ManufacturingView`, `BuildOrders` |
| **Administrador del Negocio** | Humano (Interno) | Configuración de catálogo, bodegas y márgenes | Panel General de Inventario |
| **Motor de Pedidos (Ventas)** | Componente Software | Deducción automática de stock por comandas | `inventoryService.consumeSaleOrder` |
| **Proveedor de Mercancía** | Entidad Externa | Despacho de insumos según orden de compra | Facturas / Remisiones |

---

## 2.2 Especificación por Actor

### 1. Jefe de Almacén / Bodeguero
* **Rol**: Responsable de la recepción física, almacenamiento y despacho de productos.
* **Responsabilidades**:
  * Registrar entradas de mercancía por compras o devoluciones (`registerMovement` con `ENTRADA` / `STOCK_ADD`).
  * Registrar salidas manuales por merma, rotura o consumo interno (`SALIDA` / `STOCK_REMOVE`).
  * Ejecutar traslados de productos entre bodegas y sucursales (`registerStockTransfer` / `STOCK_TRANSFER`), seleccionando bodega origen y destino.
* **Información que consulta y modifica**:
  * Consulta: Saldo actual por producto, ubicación asignada (`locationName`) y alertas de stock bajo.
  * Modifica: Stock físico mediante movimientos justificados con concepto y documento de referencia.

---

### 2. Auditor de Inventario
* **Rol**: Responsable de la exactitud contable y conciliación de inventario.
* **Responsabilidades**:
  * Realizar conteos cíclicos o inventarios generales (`registerStockCount` / `STOCK_COUNT`).
  * Ingresar el conteo real en `StockCountModal`; el sistema calcula la desviación neta (`diff = countedStock - previousStock`) y genera el ajuste en el Kardex.
  * Auditar el historial inmutable de movimientos en `KardexView`, filtrando por producto, fecha, tipo de movimiento o autor.
  * Cargar catálogos masivos y saldos iniciales desde hojas Excel mediante `ImportExcelModal`.
* **Información que consulta y modifica**:
  * Consulta: Todo el historial de transacciones de stock y valorización financiera a costo y venta.
  * Modifica: Sobrescribe el `stockActual` únicamente a través de transacciones formales de conteo físico auditadas.

---

### 3. Encargado de Compras
* **Rol**: Administrador de la cadena de suministro y relación con proveedores.
* **Responsabilidades**:
  * Crear y gestionar el directorio de proveedores (`Supplier`: NIT/RUT, contacto, lead time).
  * Emitir órdenes de compra (`PurchaseOrder`) con ítems requeridos, precios pactados y bodega de entrega (`targetLocationId`).
  * Recepcionar órdenes de compra (`receivePurchaseOrder`), lo que dispara en un solo paso la actualización del stock físico de los productos y el registro de la `ENTRADA` en el Kardex.
  * Procesar compras directas con auto-recepción (`autoReceive: true`).
* **Información que consulta y modifica**:
  * Consulta: Precios de costo de los productos (`costPrice`), proveedores asignados y órdenes de compra pendientes.
  * Modifica: Estados de órdenes de compra (`draft` → `pending` → `received`), actualizando el costo unitario de los productos comprados.

---

### 4. Jefe de Producción / Operador de Ensamble (BOM)
* **Rol**: Coordinador de las líneas de ensamble, cocción o manufactura de productos compuestos.
* **Responsabilidades**:
  * Formular y gestionar la lista de materiales (Bill of Materials - BOM).
  * Crear órdenes de fabricación (`BuildOrder`) especificando el producto de salida y la cantidad a producir.
  * Ejecutar la orden de producción (`executeBuildOrder`): el sistema valida la existencia de materias primas, descuenta los componentes del inventario e ingresa el producto final en una transacción atómica.
* **Información que consulta y modifica**:
  * Consulta: Disponibilidad de componentes del BOM.
  * Modifica: Reduce existencias de materias primas e incrementa existencias de productos terminados.

---

### 5. Administrador del Negocio
* **Rol**: Gobernanza global del catálogo, infraestructura física y políticas de reabastecimiento.
* **Responsabilidades**:
  * Dar de alta y editar productos (`saveProduct`), asignando SKU, IPN, precios de costo/venta, categoría y unidad de medida.
  * Configurar metadatos dinámicos JSONB según la vertical de la industria (lotes, tallas, seriales, vencimientos).
  * Crear y organizar bodegas y sucursales (`createStockLocation`).
  * Establecer los puntos de reorden (`stockMinimo`).
  * Eliminar productos obsoletos sin transacciones activas (`deleteProduct`).

---

### 6. Motor de Pedidos (`PedidosModule` - Actor de Software)
* **Rol**: Consumidor transaccional automatizado.
* **Responsabilidades**:
  * Invocar `inventoryService.consumeSaleOrder(...)` cuando una comanda de venta ingresa a preparación en cocina o despacho en mostrador.
  * Proveer el ID del pedido, canal y lista de ítems vendidos para que el módulo Inventario reduzca el stock de forma desatendida.
