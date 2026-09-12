# 05 — Plan de Refactor & Migración a Arquitectura de Dominios

Este documento presenta la hoja de ruta técnica completa y el estado final de la refactorización ejecutada para transformar el módulo **Pedidos** (`PedidosContext.tsx`) de un monolito acoplado en un **OMS Autónomo y Desacoplado por Dominios Funcionales**.

---

## 1. Diagnóstico del Estado Anterior

El sistema heredado presentaba tres problemas críticos de acoplamiento:
1. **Monolito en `PedidosContext.tsx` (2.045 líneas):** Mezclaba órdenes, HITL WhatsApp, simulador de IA, catálogo de productos, inventario de insumos y recetas de cocina en una sola composición.
2. **Eventos CustomEvents sin Tipo:** Disparo de eventos DOM sin validación en tiempo de compilación.
3. **Falta de Aislamiento de Dominios:** Imposibilidad de instanciar o probar el OMS sin cargar WhatsApp o el catálogo completo.

---

## 2. Fases del Plan de Migración Ejecutadas

### ✅ Fase 1: Contratos de Datos y Tipos (`@/contracts`)
- **Archivos creados:**
  - `contracts/order.contract.ts`: Contrato de orden, estado FSM, evento de dominio.
  - `contracts/catalog.contract.ts`: Contrato público de ítems de catálogo y recetas.
  - `contracts/channel.contract.ts`: Contrato de conversaciones WhatsApp, mensajes e intenciones HITL.
  - `contracts/events.contract.ts`: Definición discriminada de todos los eventos del sistema.
- **Resultado:** Re-exportación en `types.ts` manteniendo 100% de compatibilidad hacia atrás.

---

### ✅ Fase 2: Bus de Eventos Tipado (`@/infrastructure/eventBus.ts`)
- **Implementación:** Publicador/suscriptor fuertemente tipado mediante TypeScript.
- **Eventos migrados:** `draftOrderConfirmed`, `orderStateChanged`, `necto_layout_changed`, `necto_navigate_pedidos`.
- **Resultado:** Eliminación de CustomEvents untyped. Los módulos se comunican sin acoplamiento de código.

---

### ✅ Fase 3: Extracción del Dominio de Catálogo (`@/compositions/catalog`)
- **Implementación:** `CatalogContext.tsx` y el hook `useCatalog()`.
- **Desacoplamiento:** Eliminación del estado `products` y sus funciones CRUD de `PedidosContext`.
- **Componentes migrados:** `CatalogoInteligenteView`, `ResumenDashboardView`, `AnaliticaView`, `CreateOrderFromConversationModal`.

---

### ✅ Fase 4: Extracción del Dominio de Canales & HITL (`@/compositions/channels`)
- **Implementación:** `ChannelsContext.tsx` y el hook `useChannels()`.
- **Desacoplamiento:** Extracción de ~800 líneas de conversaciones WhatsApp, Human-in-the-Loop y simulador de IA.
- **Componentes migrados:** `ConversacionesView`, `ConversationThread`, `ConversationControlBar`, `WhatsAppFloatingWidget`, `CreateOrderFromConversationModal`, `OrderDetailDrawer`, `AIInterpretationModal`.
- **Comunicación OMS ↔ Canales:**
  - Canales publica `draftOrderConfirmed` -> OMS escucha e inyecta la orden.
  - OMS publica `orderStateChanged` -> Canales escucha y envía notificación WhatsApp.

---

### ✅ Fase 5: Extracción del Dominio de Inventario (`@/ModuloInventario`)
- **Implementación:** `InventoryContext.tsx` en `src/ModuloInventario/context/`.
- **Desacoplamiento:** Estado de `ingredients` e insumos de cocina extraído de `PedidosContext`.
- **Refactor clave (`consumeStockForOrder`):** Quedó reducido a 4 líneas de OMS puro llamando al `inventoryAdapter.handleOrderEvent({ type: "OrderReady", order })`.
- **Componente migrado:** `InsumosStockView.tsx` relocalizado en `ModuloInventario/components/`.

---

### ✅ Fase 6: Relocalización de Pantallas Transversales & Aislamiento OMS
- **Seguridad / Roles:** `RolesPermisosView.tsx` relocalizado en `src/compositions/shared/security/`.
- **Analítica & Reportes:** `ResumenDashboardView.tsx` y `AnaliticaView.tsx` relocalizados en `src/compositions/shared/analytics/`.
- **Aislamiento OMS Verificado:** `PedidosContext` puede instanciarse y ejecutarse 100% de forma autónoma sin depender de `ChannelsContext` ni `CatalogContext`.

---

## 3. Matriz de Verificación y Pruebas (8/8 PASADAS)

| Criterio de Aceptación | Estado | Método de Validación |
| :--- | :--- | :--- |
| **Flujo Sin Inventario (No-Op Adapter)** | ✅ Aprobado | Test E2E 1 en `domain_validation.ts` |
| **Flujo Con Inventario (Kardex ERP)** | ✅ Aprobado | Test E2E 2 en `domain_validation.ts` |
| **Cancelaciones Transversales** | ✅ Aprobado | Test E2E 3 en `domain_validation.ts` |
| **Devolución Formal (ENTREGADO)** | ✅ Aprobado | Test E2E 4 en `domain_validation.ts` |
| **Eje Financiero Independiente** | ✅ Aprobado | Test E2E 5 en `domain_validation.ts` |
| **Idempotencia Estricta** | ✅ Aprobado | Test E2E 6 en `domain_validation.ts` |
| **Auditoría y Trazabilidad (OrderEvent)** | ✅ Aprobado | Test E2E 7 en `domain_validation.ts` |
| **Aislamiento Completo OMS** | ✅ Aprobado | Test E2E 8 en `domain_validation.ts` |
| **Compilación TypeScript (`tsc --noEmit`)** | ✅ Aprobado | `0 errores` |
