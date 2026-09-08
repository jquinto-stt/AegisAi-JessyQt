# 01. Propósito y Alcance del Módulo Inventario

## 1.1 ¿Qué es el Módulo Inventario?

El módulo **Inventario** (estructurado internamente en `packages/apps/web/modules/app/src/ModuloInventario`) es el núcleo de gestión de recursos, materias primas, productos terminados y control de existencias de **StockFlow**.

Opera como un **Kardex ERP multialmacén e intersectorial** diseñado para controlar el flujo físico y financiero de mercancías a lo largo de 4 pilares operativos fundamentales:
1. **Catálogo Maestro de Productos & Servicios**: Administración de ítems con soporte de esquemas JSONB dinámicos por industria (perecederos con fecha de vencimiento y lote, electrónica con serial y voltaje, textil con talla y color, farmacéutica con registro INVIMA/principio activo, materia prima y estándar).
2. **Control Multialmacén y Sucursales (`StockLocations`)**: Jerarquía de ubicaciones físicas y bodegas con trazabilidad de stock por sede y traslados internos.
3. **Kardex Transaccional Inmutable (`StockMovements`)**: Registro cronológico de cada entrada (`ENTRADA`), salida (`SALIDA`), ajuste por conteo físico (`CONTEO`) y reubicación (`TRASLADO`), con soporte de costeo unitario y documentos de referencia.
4. **Compras, Proveedores y Ensamble (BOM - Bill of Materials)**: Ciclo completo de órdenes de compra a proveedores con recepción automática al Kardex y órdenes de manufactura/ensamble con deducción de componentes y alta de producto terminado.

---

## 1.2 ¿Qué problema resuelve?

En la gestión logística tradicional y de pymes, el control de inventario suele sufrir fallas críticas:
* **Descuadres en el Kardex y stock fantasma**: Ventas que no se descuentan en tiempo real o mermas operativas no justificadas, provocando roturas de stock imprevistas.
* **Rigidez de esquemas por vertical de negocio**: Un sistema tradicional no puede manejar con la misma solvencia empanadas y carnes (lotes, temperaturas de conservación, fechas de caducidad) que componentes electrónicos o prendas de vestir.
* **Falta de trazabilidad en compras y traslados**: Mercancía que entra de proveedores sin orden de compra formal o traslados entre bodegas que se pierden en el camino.
* **Desconexión entre producción y receta**: En negocios gastronómicos o manufactureros, producir un lote no descuenta los ingredientes o piezas base, falseando el costo de venta real.

El módulo Inventario resuelve estas brechas integrando el Kardex con las ventas automáticas del módulo Pedidos (`consumeSaleOrder`), compras a proveedores (`PurchaseOrders`) y manufactura por receta (`BuildOrders`).

---

## 1.3 Objetivo dentro de StockFlow

* **Garantizar la integridad del stock físico**: Registrar cada alteración de existencias con autor, fecha ISO, concepto, documento de respaldo y saldo anterior/posterior.
* **Proveer soporte multivertical**: Adaptarse a cualquier tipo de negocio mediante plantillas de metadatos dinámicos (`DynamicFieldDefinition`).
* **Automatizar la deducción por ventas omnicanal**: Servir como API interna para que el módulo `Pedidos` descuente productos de forma desatendida.
* **Calcular valorización financiera en tiempo real**: Monitorear el valor del inventario a costo promedio ponderado (`totalCostValue`) y precio de venta retail (`totalRetailValue`).

---

## 1.4 ¿Quién utiliza el módulo?

1. **Jefe de Almacén / Bodeguero**:
   * Registra entradas y salidas manuales de mercancía.
   * Realiza conteos físicos periódicos y auditorías de inventario.
   * Ejecuta traslados entre bodegas (`StockTransferModal`).
2. **Encargado de Compras / Facturación**:
   * Da de alta proveedores con NIT/RUT, persona de contacto y tiempos de entrega.
   * Genera órdenes de compra (`PurchaseOrder`) y procesa recepciones de mercancía (`receivePurchaseOrder`).
3. **Jefe de Producción / Cocinero Principal**:
   * Ejecuta órdenes de ensamble/producción (`BuildOrder`) deduciendo materias primas del BOM y sumando productos terminados.
4. **Auditor / Administrador**:
   * Revisa el historial inmutable del Kardex filtrando por SKU, lote o fecha.
   * Importa catálogos masivos desde hojas de cálculo Excel (`ImportExcelModal`).
   * Monitorea alertas de stock bajo (`low_stock`) y agotado (`out_of_stock`).

---

## 1.5 Información que maneja el módulo

* **Productos (`InventoryProduct`)**: Identificador único (`id`), código de barra (`barcode`), SKU, IPN (*Internal Part Number*), nombre, categoría, tipo de producto (`ProductType`), precio de costo (`costPrice`), precio de venta (`salePrice`), unidad de medida (`UnitOfMeasure`), stock actual, stock mínimo, ubicación física (`locationId`, `locationName`), proveedor y metadatos JSONB dinámicos.
* **Movimientos de Kardex (`StockMovement`)**: ID, producto, tipo (`ENTRADA`, `SALIDA`, `CONTEO`, `TRASLADO`), acción técnica (`StockTrackingAction`), cantidad, stock previo, stock nuevo, ubicación origen/destino, concepto, documento de referencia, autor y código de lote.
* **Ubicaciones (`StockLocation`)**: ID, código (ej. `"BOD-101"`), nombre, descripción, ubicación padre y conteo de ítems almacenados.
* **Proveedores (`Supplier`)**: NIT/RUT, nombre comercial, persona de contacto, correo, teléfono, tiempo de entrega en días (*lead time*) y calificación.
* **Órdenes de Compra (`PurchaseOrder`)**: Número de orden (ej. `"OC-2026-451"`), proveedor, ubicación destino, ítems con precio de compra y estado (`draft`, `pending`, `received`, `cancelled`).
* **Órdenes de Ensamble (`BuildOrder`)**: Número de ensamble, producto resultante, cantidad a fabricar, receta/BOM con cantidades requeridas por componente y estado.

---

## 1.6 Relación con otros módulos de StockFlow

| Módulo Hermano | Mecanismo de Integración | Propósito |
|---|---|---|
| **`Pedidos` (`compositions/pedidos`)** | Invocación `inventoryService.consumeSaleOrder(...)` | Descuento automático de existencias físicas en cuanto un pedido entra a preparación en cocina. |
| **`Products API` (Cloud Core)** | Sincronización REST | Contrato de producto compartido (`pk=ownerId`, `sk=productId`). |
| **`AuthContext` (AWS Cognito)** | Inyección de identidad y tokens JWT | Trazabilidad del usuario autor en cada movimiento del Kardex. |
| **Infraestructura Cloud (SST v3)** | AWS DynamoDB `Inventarios@Table` | Persistencia en nube particionada por `OWNER#{ownerId}` y `ITEM#{itemId}`. |
