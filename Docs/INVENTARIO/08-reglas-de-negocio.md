# 08. Reglas de Negocio del Módulo Inventario

Este documento especifica todas las reglas de negocio, validaciones y restricciones implementadas en el código fuente de **StockFlow (Módulo Inventario)**.

---

## 8.1 Matriz de Reglas de Negocio

| Regla | Nombre de la Regla | Archivo / Método | Cumplimiento |
|---|---|---|---|
| **RN-INV-01** | Prohibición de Saldos Negativos en Salidas Manuales | `inventoryService.ts` (`registerMovement`) | Obligatoria (Error fatal) |
| **RN-INV-02** | Asiento Obligatorio de Balance Inicial | `inventoryService.ts` (`saveProduct`) | Automática |
| **RN-INV-03** | Cálculo Determinista del Semáforo de Stock | `inventoryService.ts` (`calculateStatus`) | Automática |
| **RN-INV-04** | Inmutabilidad de Asientos del Kardex | `inventoryService.ts` (`movements`) | Obligatoria |
| **RN-INV-05** | Validación Previa y Atómica de Insumos BOM | `inventoryService.ts` (`executeBuildOrder`) | Obligatoria |
| **RN-INV-06** | Asignación de Bodega por Defecto | `inventoryService.ts` (`saveProduct`) | Automática |
| **RN-INV-07** | Actualización de Costo en Recepción de Compra | `inventoryService.ts` (`receivePurchaseOrder`) | Automática |
| **RN-INV-08** | Resolución Tolerante de Ítems en Ventas | `inventoryService.ts` (`consumeSaleOrder`) | Automática |
| **RN-INV-09** | Trazabilidad Obligatoria de Auditor (Autor) | `inventoryService.ts` (`StockMovement`) | Obligatoria |

---

## 8.2 Detalle de Reglas Implementadas

### RN-INV-01: Prohibición de Saldos Negativos en Salidas Manuales
* **Definición**: Un operador de almacén no puede registrar una salida manual (`SALIDA` / `STOCK_REMOVE`) por una cantidad superior a las existencias físicas disponibles en ese momento.
* **Código Fuente**:
  ```typescript
  if (type === "SALIDA") {
    if (previousStock < quantity) {
      throw new Error(
        `Stock insuficiente. Stock actual: ${previousStock} ${currentProduct.unit}, intentando retirar: ${quantity} ${currentProduct.unit}`
      );
    }
    newStock = previousStock - Number(quantity);
  }
  ```
* **Consecuencia**: La transacción es rechazada antes de modificar el estado y no se registra movimiento en el Kardex.

---

### RN-INV-02: Asiento Obligatorio de Balance Inicial
* **Definición**: Si un producto nuevo es creado con una cantidad en existencia mayor a cero (`stockActual > 0`), el sistema está obligado a generar inmediatamente un movimiento formal en el Kardex:
  * `type`: `"ENTRADA"`
  * `action`: `"STOCK_CREATE"`
  * `concept`: `"Inventario Inicial (Creación de Producto)"`
  * `previousStock`: `0`
  * `newStock`: `stock`
  * `author`: `"Sistema"`
* **Propósito**: Garantizar que ningún saldo de existencias aparezca en el sistema sin una justificación de origen trazable.

---

### RN-INV-03: Cálculo Determinista del Semáforo de Stock
* **Definición**: El estado operativo del producto se recalcula automáticamente tras cualquier operación que altere el balance:
  * **`out_of_stock`**: Si `stockActual <= 0`.
  * **`low_stock`**: Si `stockActual > 0` y `stockActual <= stockMinimo`.
  * **`active`**: Si `stockActual > stockMinimo`.

---

### RN-INV-04: Inmutabilidad de Asientos del Kardex
* **Definición**: Los registros del Kardex (`StockMovement`) son estrictamente inmutables. No existen métodos para editar o borrar un movimiento ya asentado.
* **Tratamiento de Correcciones**: Cualquier error operativo debe subsanarse mediante un movimiento de compensación (ej. ajuste por conteo físico `STOCK_COUNT` o entrada de devolución).

---

### RN-INV-05: Validación Previa y Atómica en Ensamble BOM
* **Definición**: Antes de iniciar la fabricación de un producto compuesto, el sistema debe comprobar que **todos** los insumos del BOM tengan saldo suficiente para cubrir `quantityRequired * quantityToBuild`.
* **Código Fuente**:
  ```typescript
  for (const comp of bo.bom) {
    const prod = this.products.find((p) => p.id === comp.componentProductId);
    const totalNeeded = comp.quantityRequired * bo.quantityToBuild;
    if (!prod || prod.stockActual < totalNeeded) {
      throw new Error(`Stock insuficiente para el insumo ${comp.componentName}...`);
    }
  }
  ```
* **Consecuencia**: Si tan solo uno de los insumos es insuficiente, la orden no se ejecuta y ningún componente es descontado (garantía de atomicidad).

---

### RN-INV-06: Asignación de Bodega por Defecto
* **Definición**: Si durante el alta de un producto o importación desde Excel no se especifica una ubicación física, el sistema le asigna automáticamente el almacén principal `"loc-001"` (*"Almacén Central"*).

---

### RN-INV-07: Actualización de Costo de Adquisición
* **Definición**: Al recepcionar una orden de compra (`receivePurchaseOrder`), si el precio unitario facturado por el proveedor (`item.unitPrice`) es mayor a cero, se actualiza automáticamente el campo `costPrice` del producto en el catálogo maestro, manteniendo la valorización al día.

---

### RN-INV-08: Resolución Tolerante de Productos en Ventas
* **Definición**: Al procesar ventas provenientes de canales externos o del módulo Pedidos (`consumeSaleOrder`), el sistema busca el producto en tres niveles de tolerancia:
  1. Coincidencia por `productId`.
  2. Coincidencia insensible a mayúsculas por `sku`.
  3. Coincidencia insensible a mayúsculas por `name`.
* **Propósito**: Prevenir fallas de descuento cuando una comanda de WhatsApp fue creada usando el nombre del producto en lugar de su código SKU interno.
