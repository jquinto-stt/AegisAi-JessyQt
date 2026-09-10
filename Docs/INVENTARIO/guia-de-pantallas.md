# Guía Funcional y Ejecutiva de Pantallas — Módulo Inventario

Este documento resume de forma clara y directa el **propósito, funcionalidades y valor de negocio de cada pantalla** del módulo de Inventario de **StockFlow**, ideal como guion de presentación ejecutiva o manual de inducción.

---

## 🧭 Mapa General de Navegación

El módulo se estructura en **6 vistas especializadas** accesibles desde la barra superior, complementadas por el **Centro de Movimientos Unificado**:

```
[MÓDULO INVENTARIO]
   ├── 1. Productos (Catálogo Maestro)
   ├── 2. Valor de Inventario (Reporte Contable PPP)
   ├── 3. Listas de Precios (Tarifas Comerciales)
   ├── 4. Bodegas (Control Multialmacén)
   ├── 5. Compras (Órdenes y Sugeridos de Reorden)
   └── 6. Kardex (Auditoría y Libro Mayor)
   └── [+] Modal Unificado de Movimientos
```

---

## 1. Pantalla: Productos (`CatalogView`)

### ¿Qué es?
La **pantalla principal de control operativo**. Es la tabla maestra de alta densidad donde convive el catálogo de bienes, materias primas y servicios disponibles para la venta o producción.

### ¿Qué hace el usuario aquí?
* **Selector de modo de visualización**:
  * **Modo Tarjetas / Grid**: Presentación visual amplia con fotografías grandes, etiqueta de estado de stock en esquina, precio PVP, stock disponible y botón rápido de movimiento flotante.
  * **Modo Tabla de Alta Densidad**: Escaneo rápido tipo hoja de cálculo con fotos miniatura, SKU, categoría, bodega, costo PPP y precio.
* **Búsqueda instantánea y escaneo visual**: Localiza productos en tiempo real por nombre o SKU con su fotografía, categoría y bodega asignada.
* **Semáforo de disponibilidad física**: Identifica de inmediato si un ítem está **En Stock** (verde), **Bajo Mínimo** (ámbar con umbral de seguridad) o **Agotado** (rojo).
* **Control de márgenes comerciales**: Visualiza lado a lado el **Costo Promedio Ponderado (PPP)** y el **Precio de Venta (PVP)**.
* **Simulador de tarifas**: Alterna entre listas de precios (ej. General vs Mayorista) para ver cómo cambian los precios en pantalla en tiempo real.
* **Acciones rápidas sin saturación**:
  * Clic en la fila: Abre la **Ficha Técnica Detallada** (`PartDetailModal`).
  * Menú `...`: Permite editar, auditar Kardex o eliminar el producto.
  * Opciones secundarias: Importar masivamente desde Excel o exportar a CSV.

---

## 2. Pantalla: Valor de Inventario (`InventoryValuationView`)

### ¿Qué es?
La **pantalla financiera y contable** del inventario. Transforma las cantidades físicas en cifras de balance para gerencia, tesorería y auditoría.

### ¿Qué hace el usuario aquí?
* **Métricas clave de balance**:
  * **Valor a Costo (PPP / NIC 2)**: Capital exacto invertido y retenido en bodegas.
  * **Valor a Precio de Venta**: Proyección de ingresos potenciales en caso de liquidación total.
  * **Margen Bruto Proyectado**: Ganancia estimada en pesos y porcentaje global.
* **Distribución de capital**: Filtra la valorización por bodega específica o por categoría de producto para saber en qué líneas está concentrada la mayor inversión.
* **Trazabilidad directa**: Desde cualquier ítem en la tabla de valorización, un clic lleva al historial de Kardex para auditar cómo se formó dicho costo.

---

## 3. Pantalla: Listas de Precios (`PriceListsView`)

### ¿Qué es?
El **centro de estrategia comercial y pricing multicanal**. Permite vender los mismos productos a diferentes precios según el tipo de cliente o canal.

### ¿Qué hace el usuario aquí?
* **Creación de tarifas**: Define listas como *Mayorista*, *Clientes VIP*, *Distribuidores* o *Convenios*.
* **Reglas automatizadas de cálculo**:
  * **Margen sobre costo**: Suma un porcentaje sobre el costo PPP (ej. Costo + 40%).
  * **Descuento sobre base**: Aplica una rebaja sobre el PVP base (ej. 15% OFF).
  * **Margen fijo monetario**: Incremento fijo en pesos sobre el costo de adquisición.
* **Designación de lista por defecto**: Establece cuál tarifa regirá las ventas estándar.

---

## 4. Pantalla: Bodegas (`StockLocationsView`)

### ¿Qué es?
La **pantalla de control físico multisede y multialmacén**. Administra la distribución territorial de los productos.

### ¿Qué hace el usuario aquí?
* **Monitoreo por sede**: Filtra existencias por almacén (ej. *Bodega Central*, *Punto de Venta Norte*, *Almacén Despachos*).
* **Auditoría de existencias locales**: Muestra el stock físico real, costo unitario y valor monetario acumulado en la sede seleccionada.
* **Alta de nuevas sedes**: Permite crear almacenes, depósitos o estanterías con código de identificación único.

---

## 5. Pantalla: Compras & Facturas (`PurchasingView`)

### ¿Qué es?
El **módulo de aprovisionamiento, cuentas con proveedores y abastecimiento inteligente**.

### ¿Qué hace el usuario aquí?
* **Gestión de Órdenes de Compra (PO)**: Emite solicitudes de compra formales con proveedor, cantidades, costos pactados e impuestos.
* **Recepción con Costeo Promedio Ponderado (PPP / NIC 2)**:
  * Al pulsar *"Recibir Mercancía"*, las unidades ingresan de forma atómica a la bodega correspondiente.
  * El sistema recalcula automáticamente el costo unitario del producto ponderando lo que ya había en stock con las nuevas unidades al precio facturado.
* **Directorio de Proveedores**: Mantiene la ficha de contacto, NIT, teléfono y lead time de entrega.
* **Asistente Inteligente de Reorden**:
  * Pestaña que lista en automático todos los artículos que tocaron el stock de seguridad.
  * Calcula el déficit y la cantidad sugerida de compra.
  * Botón *"Crear Orden"* en 1 clic con el proveedor y cantidades ya completados.

---

## 6. Pantalla: Historial de Movimientos / Kardex (`KardexView`)

### ¿Qué es?
El **libro mayor transaccional e inmutable**. Garantiza la trazabilidad legal, contable y operativa de cada unidad que entra o sale de la empresa.

### ¿Qué hace el usuario aquí?
* **Auditoría cronológica estricta**: Cada registro muestra fecha/hora, producto, tipo de movimiento, concepto, documento soporte, variación (`+` o `-`), saldo final y usuario responsable.
* **Inmutabilidad**: Ningún movimiento se puede alterar ni borrar; todo descuadre se compensa con ajustes formales.
* **Filtros de investigación**: Permite filtrar por tipo de evento (*Entradas*, *Salidas*, *Ajustes por Merma*, *Traslados*, *Conteos*) o aislar el Kardex de un solo producto.

---

## 7. Componente Clave: Modal Unificado de Movimientos (`StockMovementModal`)

### ¿Qué es?
El **núcleo de agilidad operativa**. En lugar de navegar por múltiples menús, un único modal centraliza cualquier operación de inventario con un selector segmentado:

1. **Entrada**: Ingreso rápido por devoluciones o compras directas.
2. **Salida**: Retiro manual por consumo interno o baja comercial (con validación de saldo negativo).
3. **Ajuste**: Corrección contable por merma, daño o desperdicio, calculando el impacto en pesos ($).
4. **Traslado**: Movimiento físico entre bodegas seleccionando origen y destino.
5. **Conteo Físico**: Conciliación ciega donde el auditor ingresa el conteo real y el sistema genera el asiento de ajuste por diferencia.

**Proyección en Vivo**: En todo momento muestra `Stock Actual → Impacto → Stock Resultante` antes de pulsar confirmar.
