# 03. Casos de Uso del Módulo Inventario

Este documento especifica todos los casos de uso implementados y soportados en el código de **StockFlow (Módulo Inventario)**.

---

## 3.1 Catálogo de Casos de Uso

| Código | Nombre del Caso de Uso | Actor Principal | Objetivo |
|---|---|---|---|
| **CU-INV-01** | Crear / Editar Producto Maestro | Administrador | Dar de alta o modificar un ítem con soporte de metadatos dinámicos. |
| **CU-INV-02** | Registrar Movimiento Manual (Entrada/Salida) | Bodeguero | Modificar existencias con concepto y documento de referencia. |
| **CU-INV-03** | Conteo Físico y Conciliación de Auditoría | Auditor | Ajustar stock al conteo real calculando automáticamente la diferencia. |
| **CU-INV-04** | Traslado entre Bodegas y Sucursales | Bodeguero | Reubicar físicamente existencias entre diferentes ubicaciones. |
| **CU-INV-05** | Consumo Automático por Comanda de Venta | Motor Pedidos | Reducir stock automáticamente tras una comanda procesada. |
| **CU-INV-06** | Crear Bodega o Ubicación de Almacén | Administrador | Registrar nuevas sedes, almacenes o estanterías jerárquicas. |
| **CU-INV-07** | Crear y Administrar Proveedores | Encargado Compras | Registrar empresas proveedoras con NIT, lead time y contactos. |
| **CU-INV-08** | Emitir Orden de Compra (PO) | Encargado Compras | Generar una solicitud formal de aprovisionamiento de insumos. |
| **CU-INV-09** | Recepcionar Orden de Compra en Bodega | Bodeguero | Validar mercancía física recibida e ingresar existencias al Kardex. |
| **CU-INV-10** | Fabricar Producto por Ensamble (BOM) | Jefe Producción | Deducir materias primas de la receta y sumar producto terminado. |
| **CU-INV-11** | Importar Catálogo Masivo desde Excel | Auditor / Admin | Carga masiva de SKUs, precios y saldos desde hoja de cálculo. |
| **CU-INV-12** | Auditar Historial de Kardex | Auditor | Rastrear movimientos con filtros por SKU, concepto, tipo y autor. |
| **CU-INV-13** | Monitorear Métricas y Valorización | Administrador | Visualizar valor de inventario a costo, precio retail y alertas. |
| **CU-INV-14** | Eliminar Producto del Catálogo | Administrador | Dar de baja un ítem del maestro de inventario. |

---

## 3.2 Especificación Detallada de Casos de Uso Críticos

### CU-INV-01: Crear / Editar Producto Maestro
* **Actor Principal**: Administrador.
* **Objetivo**: Crear un nuevo ítem o actualizar sus datos comerciales, operativos y metadatos dinámicos.
* **Precondiciones**: Existencia de al menos una bodega (`StockLocation`).
* **Flujo Principal**:
  1. El usuario pulsa *"Nuevo Producto"* en `CatalogView`.
  2. Completa los datos base: SKU (código único), nombre, categoría, unidad de medida (`UND`, `KG`, `LT`, etc.), precio de costo y precio de venta.
  3. Selecciona el tipo de producto (`ProductType`: `perishable`, `electronics`, `apparel`, `pharma`, `raw_material` o `standard`).
  4. El formulario (`ProductFormModal`) renderiza dinámicamente los campos de la plantilla correspondiente (ej. fecha de vencimiento, registro INVIMA, talla o voltaje).
  5. Se define el stock inicial y el stock mínimo de reorden.
  6. El sistema invoca `inventoryService.saveProduct(data)`:
     * Si es nuevo y tiene stock inicial > 0, genera un movimiento de Kardex de tipo `ENTRADA` con acción `STOCK_CREATE` y concepto *"Inventario Inicial (Creación de Producto)"*.
     * Calcula automáticamente el estado (`active`, `low_stock`, `out_of_stock`).
* **Resultado Esperado**: Producto guardado en el catálogo y movimiento de balance inicial asentado en el Kardex.

---

### CU-INV-02: Registrar Movimiento Manual (Entrada o Salida)
* **Actor Principal**: Bodeguero / Operador de Almacén.
* **Objetivo**: Ingresar mercancía adicional o asentar una merma/consumo interno no originado en ventas.
* **Precondiciones**: Producto existente con stock registrado.
* **Flujo Principal**:
  1. En `CatalogView` o mediante *"Movimiento Rápido"*, el operador abre `StockMovementModal`.
  2. Selecciona el tipo: `ENTRADA` (ingreso) o `SALIDA` (egreso).
  3. Ingresa la cantidad, el concepto explicativo (ej. *"Devolución de cliente"*, *"Merma por empaque roto"*), el documento de referencia (factura/remisión) y el autor.
  4. El sistema valida:
     * Si es `SALIDA`, comprueba que `previousStock >= quantity`. Si no hay suficiente existencia, arroja una excepción impidiendo la operación.
  5. Ejecuta `inventoryService.registerMovement(...)`.
  6. Se actualiza el `stockActual` del producto y se crea un registro `StockMovement` con `previousStock`, `newStock` y fecha ISO.
* **Resultado Esperado**: Existencias ajustadas y trazabilidad registrada en el Kardex.

---

### CU-INV-03: Conteo Físico y Conciliación de Auditoría
* **Actor Principal**: Auditor de Inventario.
* **Objetivo**: Reconciliar el inventario físico contado en estantería con el inventario registrado en el sistema.
* **Flujo Principal**:
  1. El auditor pulsa *"Ajuste / Conteo"* en la tarjeta o fila del producto.
  2. En `StockCountModal` visualiza el stock actual del sistema (ej. 15 UND) e ingresa el conteo físico real (ej. 12 UND).
  3. El sistema calcula la diferencia neta (`diff = -3 UND`).
  4. El auditor ingresa el motivo del desajuste (ej. *"Diferencia en auditoría mensual de estantería A-2"*).
  5. Se ejecuta `inventoryService.registerStockCount(...)`:
     * Fija el `stockActual = countedStock`.
     * Genera un movimiento `StockMovement` de tipo `CONTEO` y acción `STOCK_COUNT` con cantidad `Math.abs(diff)`.
* **Resultado Esperado**: Stock sincronizado con la realidad física y asiento de auditoría formal.

---

### CU-INV-04: Traslado entre Bodegas y Sucursales
* **Actor Principal**: Bodeguero.
* **Objetivo**: Mover existencias entre diferentes ubicaciones físicas registradas.
* **Flujo Principal**:
  1. El operador abre `StockTransferModal` para el producto seleccionado.
  2. Visualiza la bodega de origen actual (`fromLocation`).
  3. Selecciona la bodega o estantería de destino (`toLocationId`).
  4. Ingresa la cantidad a transferir y notas de remisión.
  5. Se invoca `inventoryService.registerStockTransfer(...)`.
  6. El producto actualiza su `locationId` y `locationName`.
  7. Se asienta un movimiento de tipo `TRASLADO` (`STOCK_TRANSFER`) reflejando `[Bodega A] ➔ [Bodega B]`.
* **Resultado Esperado**: Producto reasignado a su nueva ubicación física con historial de traslado inmutable.

---

### CU-INV-05: Consumo Automático por Orden de Venta
* **Actor Principal**: Motor de Pedidos (`PedidosModule`).
* **Objetivo**: Descontar automáticamente productos vendidos en comandas sin intervención manual.
* **Flujo Principal**:
  1. Al pasar un pedido a `EN_PREPARACION` en el módulo Pedidos, se invoca `consumeSaleOrder({ orderId, items, channel, author })`.
  2. El servicio recorre la lista de ítems:
     * Busca el producto en el catálogo por `productId`, `sku` o coincidencia insensible a mayúsculas de `name`.
     * Descuenta `item.quantity` del `stockActual`.
     * Recalcula el estado del producto (`calculateStatus`).
     * Inserta un movimiento `StockMovement` de tipo `SALIDA` y acción `STOCK_REMOVE` con concepto `Venta Automática Pedido #{orderId} ({channel})` y `referenceDoc = orderId`.
  3. Persiste los productos y movimientos actualizados en una sola pasada.
* **Resultado Esperado**: Kardex sincronizado con las ventas del día en tiempo real.

---

### CU-INV-09: Recepcionar Orden de Compra de Proveedor
* **Actor Principal**: Encargado de Compras / Bodeguero.
* **Objetivo**: Recibir mercancía despachada por un proveedor y sumarla al inventario disponible.
* **Precondiciones**: Orden de compra en estado `pending`.
* **Flujo Principal**:
  1. En `PurchasingView`, el usuario ubica la orden de compra pendiente y pulsa *"Recibir Mercancía"*.
  2. Se invoca `inventoryService.receivePurchaseOrder(poId)`.
  3. Para cada ítem de la orden:
     * Suma la cantidad recibida al `stockActual` del producto.
     * Recalcula automáticamente el `costPrice` del producto aplicando Costeo Promedio Ponderado (PPP / NIC 2).
     * Inserta un movimiento `StockMovement` de tipo `ENTRADA` (`STOCK_ADD`) con concepto `Recepción Orden de Compra: {orderNumber} ({supplierName})`.
  4. La orden de compra pasa a estado `received` con fecha `receivedDate = now`.
* **Resultado Esperado**: Mercancía disponible para la venta, costo promedio ponderado (PPP) recalculado y orden de compra cerrada.

---

### CU-INV-15: Gestión de Listas de Precios y Tarifas Comerciales
* **Actor Principal**: Administrador / Gerente Comercial.
* **Objetivo**: Configurar listas de precios diferenciales (Mayorista, VIP, Distribuidores) calculadas sobre el precio base o costo.
* **Flujo Principal**:
  1. En `PriceListsView`, el usuario crea o edita una lista de precios definiendo el tipo de regla (`PERCENTAGE_MARKUP`, `FIXED_MARKUP`, `DISCOUNT_PERCENT`, etc.).
  2. En el catálogo (`CatalogView`), el usuario puede alternar la tarifa activa en el selector de listas de precios para proyectar los precios en tiempo real.
* **Resultado Esperado**: Precios comerciales proyectados dinámicamente según la tarifa seleccionada sin alterar el precio maestro.

---

### CU-INV-16: Asistente de Reorden y Sugeridos de Compra
* **Actor Principal**: Encargado de Compras.
* **Objetivo**: Detectar automáticamente artículos con existencias críticas y prellenar órdenes de compra en un clic.
* **Flujo Principal**:
  1. En `PurchasingView`, el usuario accede a la pestaña *"Sugeridos de Reorden"*.
  2. El sistema lista todos los productos cuyo `stockActual <= stockMinimo`, mostrando el déficit y la cantidad sugerida para alcanzar el stock de seguridad.
  3. Al pulsar *"Crear Orden"*, el sistema abre `PurchaseOrderModal` con el producto, proveedor preferente y cantidad sugerida ya configurados.
* **Resultado Esperado**: Reducción drástica del tiempo de reaprovisionamiento y prevención de quiebres de inventario.
