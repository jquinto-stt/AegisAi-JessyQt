# Necto OMS — Arquitectura de Dominios, Ownership & Integración Inter-Módulos

> **La Regla de Oro de la Arquitectura:**  
> *"No diseñes los módulos como aplicaciones aisladas ni dupliques capacidades entre ellos. Cada módulo debe tener un dominio funcional claramente delimitado. Cuando un módulo necesite información o una capacidad perteneciente a otro módulo, debe consumirla mediante eventos o integraciones tipadas, no replicarla."*

---

## 1. El Modelo Conceptual Final: Tienda, Canales & Capacidades

```
                       TIENDA / TENANT (NectoApp)
                               │
       ┌───────────────────────┼───────────────────────┐
       │                       │                       │
CAPACIDAD CATÁLOGO      CAPACIDAD CANALES        CAPACIDAD INVENTARIO
(CatalogContext)        (ChannelsContext)       (InventoryContext)
• Productos & Precios   • WhatsApp & HITL       • Existencias & Kardex
• Recetas & Variantes   • Simulador IA          • Insumos & Recetas
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               │ EventBus Tipado
                               ▼
                       CAPACIDAD PEDIDOS
                     (PedidosContext - OMS)
                     • Kanban de Órdenes (FSM)
                     • Despacho & Tiempos
                     • Automatizaciones OMS
                     • Capacidad de Turnos
```

---

## 2. Matriz de Ownership Final

| Capacidad Funcional | Módulo Dueño | Ubicación de Contexto / Servicio | ¿Cómo lo consumen otros módulos? |
| :--- | :--- | :--- | :--- |
| **Órdenes & FSM de Estado** | **Pedidos (OMS)** | `compositions/pedidos/context/PedidosContext.tsx` | OMS procesa transiciones y emite `orderStateChanged`. |
| **WhatsApp, Chat & HITL** | **Canales** | `compositions/channels/context/ChannelsContext.tsx` | Canales atiende el chat y emite `draftOrderConfirmed`. |
| **Catálogo & Precios** | **Catálogo** | `compositions/catalog/context/CatalogContext.tsx` | Insumos y Pedidos leen productos de `useCatalog()`. |
| **Insumos & Recetas** | **Inventario** | `ModuloInventario/context/InventoryContext.tsx` | OMS notifica evento de orden lista al `inventoryAdapter`. |
| **Roles & Permisos** | **Compartido** | `compositions/shared/security/RolesPermisosView.tsx` | Gobernanza global de la Tienda. |
| **Analítica & Reportes** | **Compartido** | `compositions/shared/analytics/ResumenDashboardView.tsx` | Dashboard ejecutivo transversal. |

---

## 3. Desacoplamiento Event-Driven (OMS ↔ Canales ↔ Inventario)

1. **Canal -> OMS (Creación de Pedido):**
   - El cliente interactúa por WhatsApp.
   - El operador o IA confirma la borrador -> Canales emite `draftOrderConfirmed`.
   - `PedidosContext` recibe el evento y crea la orden mediante `createManualOrder`.

2. **OMS -> Canal (Notificación al Cliente):**
   - El operador cambia el estado de la orden en el Kanban (ej. `CONFIRMADO` -> `LISTO`).
   - `PedidosContext` emite `orderStateChanged`.
   - `ChannelsContext` recibe el evento y envía automáticamente el mensaje WhatsApp al cliente.

3. **OMS -> Inventario (Descuento de Stock):**
   - Al llegar a `LISTO` o `ENTREGADO`, `PedidosContext` ejecuta `consumeStockForOrder`.
   - `consumeStockForOrder` delega al `inventoryAdapter` (4 líneas de código), notificando el evento de dominio `OrderReady`.

---

## 4. Métricas de Salud y Cobertura de Pruebas

- **Líneas de `PedidosContext.tsx`:** Reducido de 2.045 a 1.142 líneas.
- **Errores de Compilación TypeScript (`tsc --noEmit`):** 0 errores.
- **Suite de Pruebas E2E / Regresión (`domain_validation.ts`):** 8/8 pasadas (100%).

```bash
✅ PASS | [1. FLUJO SIN INVENTARIO] Ciclo completo en No-Op
✅ PASS | [2. FLUJO CON INVENTARIO] Reserva en CONFIRMADO, retención en PREP y consumo en LISTO
✅ PASS | [3. CANCELACIONES TRANSVERSALES] Cancelación contextual según etapa
✅ PASS | [4. DEVOLUCIÓN FORMAL] Preserva status=ENTREGADO y genera STOCK_RETURN
✅ PASS | [5. EJE FINANCIERO INDEPENDIENTE] Pares ortogonales de status / paymentStatus
✅ PASS | [6. IDEMPOTENCIA ESTRICTA] Protección contra doble reserva/descuento/reversión
✅ PASS | [7. AUDITORÍA Y TRAZABILIDAD] Registro reconstructivo de eventos
✅ PASS | [8. AISLAMIENTO DE OMS] PedidosContext instanciado autónomamente
```
