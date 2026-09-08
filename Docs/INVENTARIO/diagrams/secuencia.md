# Diagramas UML de Secuencia del Módulo Inventario

Este documento presenta los diagramas de secuencia UML para los flujos operativos más críticos de **StockFlow (Módulo Inventario)**.

---

## Flujo 1: Creación de Producto con Balance Inicial

Muestra la creación de un nuevo SKU y el asiento automático de apertura en el Kardex.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrador
    participant UI as ProductFormModal
    participant Hook as useInventory
    participant Srv as inventoryService
    participant Store as LocalStorage / DynamoDB

    Admin->>UI: Ingresa datos (SKU: "EMP-005", Nombre: "Empanada Humita", Stock: 50 UND)
    Admin->>UI: Pulsa "Guardar Producto"
    UI->>Hook: saveProduct(productData)
    Hook->>Srv: saveProduct(data)
    Srv->>Srv: Generar ID único, calcular status ("active")
    Srv->>Srv: Detecta stockActual > 0 (50 UND)
    Srv->>Srv: Crear StockMovement (type: "ENTRADA", action: "STOCK_CREATE", concept: "Inventario Inicial")
    Srv->>Store: persistProducts() & persistMovements()
    Srv->>Hook: notify() -> Refrescar observadores
    Hook-->>UI: Producto guardado con éxito
    UI-->>Admin: Cierre de modal y fila visible en CatalogView
```

---

## Flujo 2: Recepción de Orden de Compra a Proveedor

Muestra la llegada física de mercancía y el ingreso automático al stock y Kardex.

```mermaid
sequenceDiagram
    autonumber
    actor Bodeguero as Bodeguero
    participant UI as PurchasingView
    participant Hook as useInventory
    participant Srv as inventoryService
    participant Store as LocalStorage / DynamoDB

    Bodeguero->>UI: Pulsa "Recibir Mercancía" en Orden #OC-2026-104
    UI->>Hook: receivePurchaseOrder("po-104")
    Hook->>Srv: receivePurchaseOrder(poId)
    loop Por cada ítem en la Orden de Compra
        Srv->>Srv: nextStock = prevStock + item.quantity
        Srv->>Srv: costPrice = item.unitPrice
        Srv->>Srv: calculateStatus(nextStock, stockMinimo)
        Srv->>Srv: Crear StockMovement (type: "ENTRADA", action: "STOCK_ADD", concept: "Recepción Orden de Compra")
    end
    Srv->>Srv: PO.status = "received", receivedDate = now
    Srv->>Store: persistProducts(), persistMovements(), persistPurchaseOrders()
    Srv->>Hook: notify()
    Hook-->>UI: Orden actualizada y stock incrementado en catálogo
```

---

## Flujo 3: Fabricación y Ensamble por Receta (BOM)

Muestra la validación atómica y transformación de materias primas a producto terminado.

```mermaid
sequenceDiagram
    autonumber
    actor JefeProd as Jefe de Producción
    participant UI as ManufacturingView
    participant Hook as useInventory
    participant Srv as inventoryService

    JefeProd->>UI: Pulsa "Ejecutar Producción" en Ensamble #BOM-ENS-501
    UI->>Hook: executeBuildOrder("bo-501")
    Hook->>Srv: executeBuildOrder(boId)
    
    rect rgb(240, 248, 255)
    Note over Srv: Paso 1: Validación Atómica
    loop Por cada componente en BOM
        Srv->>Srv: Comprobar: stockActual >= required * quantityToBuild
        alt Stock insuficiente
            Srv-->>Hook: Throw Error ("Stock insuficiente para insumo...")
            Hook-->>UI: Despliega alerta y cancela transacción
        end
    end
    end

    rect rgb(245, 255, 245)
    Note over Srv: Paso 2: Deducción de Componentes
    loop Por cada componente en BOM
        Srv->>Srv: Descontar materia prima del stock
        Srv->>Srv: Crear StockMovement (SALIDA, "Consumo Ensamble BOM")
    end
    end

    rect rgb(255, 250, 240)
    Note over Srv: Paso 3: Alta de Producto Terminado
    Srv->>Srv: Sumar producto final al stock
    Srv->>Srv: Crear StockMovement (ENTRADA, "Producción Terminada BOM")
    Srv->>Srv: BuildOrder.status = "completed"
    end

    Srv->>Hook: notify()
    Hook-->>UI: Producción exitosa reflejada en catálogo
```

---

## Flujo 4: Descuento Automático por Venta Omnicanal (`Pedidos`)

Muestra el enlace transaccional donde una comanda de WhatsApp o mostrador descuenta inventario.

```mermaid
sequenceDiagram
    autonumber
    participant Pedidos as PedidosModule / PedidosContext
    participant Srv as inventoryService
    participant Store as LocalStorage / DynamoDB

    Pedidos->>Pedidos: Comanda #PED-1025 pasa a "EN_PREPARACION"
    Pedidos->>Srv: consumeSaleOrder({ orderId: "PED-1025", items: [...], channel: "whatsapp" })
    
    loop Por cada ítem vendido
        Srv->>Srv: Buscar producto por id, sku o name
        Srv->>Srv: newStock = prevStock - item.quantity
        Srv->>Srv: calculateStatus(newStock, stockMinimo)
        Srv->>Srv: Crear StockMovement (SALIDA, action: "STOCK_REMOVE", concept: "Venta Automática Pedido #PED-1025")
    end

    Srv->>Store: persistProducts() & persistMovements()
    Srv->>Srv: notify()
    Srv-->>Pedidos: Retorna array con productos actualizados y movimientos generados
```

---

## Flujo 5: Conteo Físico y Conciliación de Auditoría

Muestra la reconciliación entre el stock contado en bodega y el saldo contable del sistema.

```mermaid
sequenceDiagram
    autonumber
    actor Auditor as Auditor de Inventario
    participant Modal as StockCountModal
    participant Hook as useInventory
    participant Srv as inventoryService

    Auditor->>Modal: Visualiza stock sistema (20 UND) e ingresa conteo físico (17 UND)
    Auditor->>Modal: Ingresa motivo: "Diferencia por merma no reportada" y pulsa "Guardar Ajuste"
    Modal->>Hook: registerStockCount({ productId, countedStock: 17, notes })
    Hook->>Srv: registerStockCount(params)
    Srv->>Srv: Calcular diff: 17 - 20 = -3 UND
    Srv->>Srv: stockActual = 17 UND
    Srv->>Srv: Crear StockMovement (type: "CONTEO", action: "STOCK_COUNT", quantity: 3, previousStock: 20, newStock: 17)
    Srv->>Srv: notify()
    Hook-->>Modal: Ajuste completado
    Modal-->>Auditor: Saldo actualizado y asiento asentado en KardexView
```
