# Documentación Técnica y Funcional — Módulo Inventario (StockFlow)

Bienvenido a la suite documental técnica y funcional del módulo **Inventario** (`ModuloInventario`) de **StockFlow**.

Esta documentación refleja con exactitud la arquitectura, componentes, servicios, entidades, reglas de negocio, esquemas de persistencia y flujos operativos reales del sistema.

---

## 📌 Resumen Ejecutivo del Módulo

| Atributo | Detalle en StockFlow |
|---|---|
| **Propósito** | Gestión integral de existencias, control multialmacén, Kardex transaccional inmutable, costeo promedio ponderado (PPP / NIC 2), listas de precios, compras a proveedores con asistente de reorden y consumo automático de ventas. |
| **Pila Tecnológica** | React 18, TypeScript, Tailwind CSS, LocalStorage Engine, AWS SST v3, AWS DynamoDB (`Inventarios@Table`), AWS Cognito. |
| **Ubicación Frontend** | `packages/apps/web/modules/app/src/ModuloInventario/` |
| **Ubicación Cloud Backend**| `packages/cloud/core/infra/factories/inventarios.ts` y `packages/cloud/core/infra/handlers/inventarios.ts` |
| **Integración Ventas** | `inventoryService.consumeSaleOrder` (conectado con `compositions/pedidos`) |
| **Estado Operativo** | 100% operativo en frontend con interfaz SaaS minimalista de alta densidad, persistencia local-first y soporte multivertical dinámico (JSONB). Lambdas DynamoDB preparadas en infraestructura cloud. |

---

## 🗺️ Índice General de Documentación

### Especificaciones Técnicas y Operativas
0. **[Guía de Pantallas y Funcionalidades (Para Presentación)](./guia-de-pantallas.md)**: Resumen ejecutivo del propósito, funciones clave y flujo de cada pantalla.
1. **[01. Propósito y Alcance](./01-proposito-y-alcance.md)**: Problemas que resuelve, objetivos del Kardex ERP, usuarios y procesos soportados.
2. **[02. Actores del Sistema](./02-actores.md)**: Bodeguero, Auditor, Encargado de Compras, Administrador y servicios de software.
3. **[03. Casos de Uso](./03-casos-de-uso.md)**: Especificación detallada de 16 casos de uso reales (CU-INV-01 a CU-INV-16).
4. **[04. Flujo Completo de Inventario](./04-flujo-del-inventario.md)**: Ciclo de vida de productos, entradas por compra con PPP, salidas por venta, traslados y conteo físico unificado.
5. **[05. Arquitectura del Módulo](./05-arquitectura.md)**: Patrón Observer en `useInventory`, motor `inventoryService`, modal unificado de operaciones y capas monorepo.
6. **[06. Modelo de Datos](./06-modelo-de-datos.md)**: Interfaces TypeScript (`InventoryProduct`, `StockMovement`, `StockLocation`, `PriceList`, `Supplier`, `PurchaseOrder`) y DynamoDB single-table.
7. **[07. Catálogo de APIs y Métodos](./07-apis.md)**: Endpoints REST (`/inventarios`), métodos públicos del servicio ERP y firmas TypeScript.
8. **[08. Reglas de Negocio](./08-reglas-de-negocio.md)**: Prohibición de saldos negativos, asientos automáticos de apertura, costeo PPP (NIC 2), inmutabilidad de Kardex y tarifas comerciales.
9. **[09. Integraciones del Sistema](./09-integraciones.md)**: Conexión con el módulo Pedidos, importador Excel y AWS DynamoDB.
10. **[10. Manejo de Errores](./10-manejo-de-errores.md)**: Prevención de stock negativo, tolerancia en ventas, recuperación de fallos de storage.
11. **[11. Pendientes y Propuestas](./11-pendientes.md)**: Estado de despliegue de rutas cloud y hoja de ruta futura.

---

## 🧭 Trazabilidad del Código (Estructura Actual)

```text
StockFlow/
├── packages/
│   ├── apps/
│   │   └── web/
│   │       └── modules/
│   │           └── app/
│   │               └── src/
│   │                   └── ModuloInventario/
│   │                       ├── ModuloInventario.tsx              # Componente raíz y navegación superior integrada
│   │                       ├── types/
│   │                       │   └── inventory.types.ts            # Entidades, enums y tipos TypeScript
│   │                       ├── services/
│   │                       │   └── inventoryService.ts           # Motor singleton del ERP (Kardex, PPP, transacciones)
│   │                       ├── hooks/
│   │                       │   └── useInventory.ts               # Hook de suscripción y estado reactivo
│   │                       ├── mock/
│   │                       │   └── inventoryMockData.ts          # Datos semilla para modo local
│   │                       └── components/
│   │                           ├── CatalogView.tsx               # Catálogo de alta densidad con fotos y filtros
│   │                           ├── InventoryValuationView.tsx    # Reporte de valorización contable por bodega y PPP
│   │                           ├── PriceListsView.tsx            # Tarifas comerciales y márgenes dinámicos
│   │                           ├── StockLocationsView.tsx        # Gestión de bodegas y existencias
│   │                           ├── PurchasingView.tsx            # Órdenes de compra y asistente de reorden
│   │                           ├── KardexView.tsx                # Libro mayor de movimientos cronológicos
│   │                           ├── StockMovementModal.tsx        # Modal UNIFICADO (Entrada, Salida, Ajuste, Traslado, Conteo)
│   │                           ├── ProductFormModal.tsx          # Formulario de alta y edición con campos dinámicos
│   │                           ├── QuickProductModal.tsx         # Alta rápida de productos
│   │                           ├── PurchaseOrderModal.tsx        # Modal de orden de compra prellenada
│   │                           ├── LocationFormModal.tsx         # Modal de creación de bodegas
│   │                           ├── PartDetailModal.tsx           # Ficha técnica detallada del producto
│   │                           ├── CategoriesModal.tsx           # Administración de categorías
│   │                           └── ImportExcelModal.tsx          # Asistente de importación masiva Excel
│   └── cloud/
│       └── core/
│           └── infra/
│               ├── factories/
│               │   └── inventarios.ts                            # Factoría SST de infraestructura cloud
│               └── handlers/
│                   └── inventarios.ts                            # Lambdas: list, create, updateStatus
└── Docs/
    └── INVENTARIO/                                               # Esta suite documental
```
