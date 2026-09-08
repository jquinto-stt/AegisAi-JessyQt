# Diagramas UML de Máquinas de Estados del Módulo Inventario

Este documento presenta los diagramas de estados UML para las entidades con ciclo de vida dinámico en **StockFlow (Módulo Inventario)**:
1. Máquina de Estados del **Producto en Inventario** (`ProductStatus`).
2. Máquina de Estados de la **Orden de Compra a Proveedor** (`PurchaseOrderStatus`).
3. Máquina de Estados de la **Orden de Fabricación / Ensamble** (`BuildOrderStatus`).

---

## 1. Máquina de Estados del Producto (`ProductStatus`)

Rige la disponibilidad y semáforo operativo de cada SKU en el catálogo.

```mermaid
stateDiagram-v2
    [*] --> active : Alta de Producto con stock > stockMinimo
    [*] --> low_stock : Alta de Producto con stock <= stockMinimo
    [*] --> out_of_stock : Alta de Producto con stock == 0

    active --> low_stock : Venta / Salida / Conteo (stockActual <= stockMinimo)
    active --> out_of_stock : Venta / Salida (stockActual <= 0)
    active --> inactive : Desactivación manual por Administrador

    low_stock --> active : Recepción de Compra / Entrada / Ensamble (stockActual > stockMinimo)
    low_stock --> out_of_stock : Venta / Salida (stockActual <= 0)
    low_stock --> inactive : Desactivación manual

    out_of_stock --> active : Recepción de Compra / Entrada (stockActual > stockMinimo)
    out_of_stock --> low_stock : Entrada parcial (stockActual <= stockMinimo)
    out_of_stock --> inactive : Desactivación manual

    inactive --> active : Reactivación con stock disponible
    inactive --> [*] : Eliminación del catálogo
```

### Tabla de Transiciones del Producto:

| Estado Actual | Evento / Condición | Estado Resultante | Efecto en StockFlow |
|---|---|---|---|
| `active` | `stockActual <= stockMinimo` | `low_stock` | Insignia amarilla de alerta en catálogo y sugerencia de compra. |
| `active` o `low_stock` | `stockActual <= 0` | `out_of_stock` | Insignia roja de agotado; activa `autoPauseOnStockOut` en Pedidos. |
| Cualquiera | Desactivación por Administrador | `inactive` | Oculto de la venta al público y canales externos. |
| `out_of_stock` | Recepción de mercancía (`STOCK_ADD`) | `active` / `low_stock` | Desbloqueo automático para venta en WhatsApp y mostrador. |

---

## 2. Máquina de Estados de la Orden de Compra (`PurchaseOrderStatus`)

Gobierna el aprovisionamiento de insumos desde proveedores externos.

```mermaid
stateDiagram-v2
    [*] --> draft : Creación inicial de borrador
    [*] --> pending : Emisión directa a proveedor

    draft --> pending : Envío formal a proveedor
    draft --> cancelled : Desistimiento de compra

    pending --> received : receivePurchaseOrder() / Llegada a Bodega\n(Actualiza stock y genera ENTRADA Kardex)
    pending --> cancelled : Anulación por proveedor o comprador

    received --> [*] : Mercancía en almacén (Terminal exitoso)
    cancelled --> [*] : Orden anulada (Terminal fallido)
```

---

## 3. Máquina de Estados de la Orden de Fabricación (`BuildOrderStatus`)

Gobierna la transformación de materias primas a producto terminado (BOM).

```mermaid
stateDiagram-v2
    [*] --> pending : Creación de orden de ensamble

    pending --> in_progress : Inicio de preparación en taller/cocina
    pending --> completed : executeBuildOrder() directo\n(Deduce componentes BOM y da alta al producto terminado)
    pending --> cancelled : Cancelación de orden

    in_progress --> completed : Finalización de lote fabricado
    in_progress --> cancelled : Anulación por quiebre de insumos

    completed --> [*] : Lote ingresado al inventario (Terminal)
    cancelled --> [*] : Fabricación cancelada (Terminal)
```
