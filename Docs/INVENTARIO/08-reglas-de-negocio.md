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
| **RN-INV-05** | Asignación de Bodega por Defecto | `inventoryService.ts` (`saveProduct`) | Automática |
| **RN-INV-06** | Costeo Promedio Ponderado (PPP / NIC 2) en Recepción | `inventoryService.ts` (`receivePurchaseOrder`) | Automática |
| **RN-INV-07** | Proyección y Cálculo Atómico en Traslados | `inventoryService.ts` (`registerStockTransfer`) | Obligatoria |
| **RN-INV-08** | Ajuste Contable por Merma o Descuadre con Costo | `inventoryService.ts` (`registerStockAdjustment`) | Automática |
| **RN-INV-09** | Conciliación Ciega en Conteo Físico | `inventoryService.ts` (`registerStockCount`) | Automática |
| **RN-INV-10** | Tarifas Comerciales Dinámicas por Lista de Precios | `inventoryService.ts` (`calculateProductPrice`) | Automática |
| **RN-INV-11** | Asistente de Reabastecimiento bajo Stock Mínimo | `inventoryService.ts` (`getSuggestedReorders`) | Automática |
| **RN-INV-12** | Resolución Tolerante de Ítems en Ventas | `inventoryService.ts` (`consumeSaleOrder`) | Automática |

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
* **Definición**: Si un producto nuevo es creado con una cantidad en existencia mayor a cero (`stockActual > 0`), el sistema genera inmediatamente un movimiento formal en el Kardex:
  * `type`: `"ENTRADA"`
  * `action`: `"STOCK_CREATE"`
  * `concept`: `"Inventario Inicial (Creación de Producto)"`
  * `previousStock`: `0`
  * `newStock`: `stock`
  * `author`: `"Sistema"`

---

### RN-INV-03: Cálculo Determinista del Semáforo de Stock
* **Definición**: El estado operativo del producto se recalcula automáticamente tras cualquier operación que altere el balance:
  * **`out_of_stock`**: Si `stockActual <= 0`.
  * **`low_stock`**: Si `stockActual > 0` y `stockActual <= stockMinimo`.
  * **`active`**: Si `stockActual > stockMinimo`.

---

### RN-INV-04: Inmutabilidad de Asientos del Kardex
* **Definición**: Los registros del Kardex (`StockMovement`) son estrictamente inmutables. No existen métodos para editar o borrar un movimiento ya asentado. Cualquier corrección debe realizarse mediante un movimiento de compensación o conteo físico.

---

### RN-INV-06: Costeo Promedio Ponderado (PPP / NIC 2) en Recepción
* **Definición**: Al recepcionar una orden de compra (`receivePurchaseOrder`), el costo unitario del producto se recalcula automáticamente ponderando las unidades en existencia previa con las nuevas unidades adquiridas:
  $$\text{PPP} = \frac{(\text{Stock Previo} \times \text{Costo Previo}) + (\text{Cantidad Recibida} \times \text{Precio Facturado})}{\text{Stock Previo} + \text{Cantidad Recibida}}$$
* **Propósito**: Cumplimiento contable con la norma internacional NIC 2 de valorización de inventarios.

---

### RN-INV-10: Tarifas Comerciales Dinámicas por Lista de Precios
* **Definición**: Cada lista de precios aplica una regla determinista (`FIXED_MARKUP`, `PERCENTAGE_MARKUP`, `DISCOUNT_PERCENT`, `MANUAL`) calculando el precio final de venta y el margen correspondiente sin alterar el precio de venta base del catálogo.

---

### RN-INV-11: Asistente de Reabastecimiento bajo Stock Mínimo
* **Definición**: Los productos cuyo stock actual sea menor o igual al stock mínimo (`stockActual <= stockMinimo`) son clasificados como críticos. La cantidad sugerida de compra se proyecta automáticamente para restaurar el nivel óptimo:
  $$\text{Cantidad Sugerida} = \max(1, (\text{Stock Mínimo} \times 2) - \text{Stock Actual})$$
* **Propósito**: Permitir al comprador emitir órdenes de compra prellenadas con un solo clic.
