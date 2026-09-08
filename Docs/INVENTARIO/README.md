# Documentación Técnica y Funcional — Módulo Inventario (StockFlow)

Bienvenido a la suite documental técnica y funcional del módulo **Inventario** (`ModuloInventario`) de **StockFlow**.

Esta documentación ha sido construida a partir del análisis riguroso del código fuente del monorepo, reflejando componentes, servicios, entidades, reglas de negocio, esquemas de persistencia y flujos operativos reales.

---

## 📌 Resumen Ejecutivo del Módulo

| Atributo | Detalle en StockFlow |
|---|---|
| **Propósito** | Gestión integral de existencias, control multialmacén, Kardex transaccional inmutable, compras a proveedores, manufactura/ensamble por receta (BOM) y consumo automático de ventas. |
| **Pila Tecnológica** | React 18, TypeScript, Tailwind CSS, LocalStorage Engine, AWS SST v3, AWS DynamoDB (`Inventarios@Table`), AWS Cognito. |
| **Ubicación Frontend** | `packages/apps/web/modules/app/src/ModuloInventario/` |
| **Ubicación Cloud Backend**| `packages/cloud/core/infra/factories/inventarios.ts` y `packages/cloud/core/infra/handlers/inventarios.ts` |
| **Integración Ventas** | `inventoryService.consumeSaleOrder` (conectado con `compositions/pedidos`) |
| **Estado Operativo** | 100% operativo en frontend con persistencia local y soporte multivertical dinámico (JSONB). Lambdas DynamoDB preparadas en infraestructura cloud. |

---

## 🗺️ Índice General de Documentación

### Especificaciones Técnicas y Operativas
1. **[01. Propósito y Alcance](./01-proposito-y-alcance.md)**: Problemas que resuelve, objetivos del Kardex ERP, usuarios y procesos soportados.
2. **[02. Actores del Sistema](./02-actores.md)**: Bodeguero, Auditor, Encargado de Compras, Jefe de Producción, Administrador y servicios de software.
3. **[03. Casos de Uso](./03-casos-de-uso.md)**: Especificación detallada de 14 casos de uso reales (CU-INV-01 a CU-INV-14).
4. **[04. Flujo Completo de Inventario](./04-flujo-del-inventario.md)**: Ciclo de vida de productos, entradas por compra, salidas por venta, conteo físico y ensamble BOM.
5. **[05. Arquitectura del Módulo](./05-arquitectura.md)**: Patrón Observer en `useInventory`, motor `inventoryService`, capas monorepo y Cloud Serverless.
6. **[06. Modelo de Datos](./06-modelo-de-datos.md)**: Interfaces TypeScript (`InventoryProduct`, `StockMovement`, `StockLocation`, `Supplier`, `PurchaseOrder`, `BuildOrder`) y DynamoDB single-table.
7. **[07. Catálogo de APIs y Métodos](./07-apis.md)**: Endpoints REST (`/inventarios`), métodos públicos del servicio ERP y firmas TypeScript.
8. **[08. Reglas de Negocio](./08-reglas-de-negocio.md)**: Prohibición de saldos negativos, asientos automáticos de apertura, inmutabilidad de Kardex y validación BOM.
9. **[09. Integraciones del Sistema](./09-integraciones.md)**: Conexión con el módulo Pedidos, importador Excel y AWS DynamoDB.
10. **[10. Manejo de Errores](./10-manejo-de-errores.md)**: Prevención de stock negativo, tolerancia en ventas, recuperación de fallos de storage.
11. **[11. Pendientes y Propuestas](./11-pendientes.md)**: Estado de despliegue de rutas cloud y hoja de ruta futura.

---

## 📊 Diagramas UML y de Flujo Disponibles

Ubicados en la carpeta [`diagrams/`](./diagrams/):

* **[Diagrama de Contexto](./diagrams/contexto.md)**: Fronteras de inventario, actores y módulos integrados.
* **[Diagrama UML de Componentes](./diagrams/componentes.md)**: Vistas, modales, hook observador, motor de servicio y base de datos.
* **[Diagrama UML de Clases](./diagrams/clases.md)**: Estructura de clases, atributos, relaciones y cardinalidades.
* **[Diagrama UML de Casos de Uso](./diagrams/casos-de-uso.md)**: Mapeo entre actores y funcionalidades operativas.
* **[Diagramas UML de Secuencia](./diagrams/secuencia.md)**: Cinco secuencias detalladas (Alta de producto, Compra a proveedor, Ensamble BOM, Consumo de venta y Conteo físico).
* **[Diagramas UML de Máquinas de Estados](./diagrams/estados.md)**: Estados de Producto (`ProductStatus`), Órdenes de Compra (`PurchaseOrderStatus`) y Ensamble (`BuildOrderStatus`).

---

## 🧭 Trazabilidad del Código (File Tree de Referencia)

```text
StockFlow/
├── packages/
│   ├── apps/
│   │   └── web/
│   │       └── modules/
│   │           └── app/
│   │               └── src/
│   │                   └── ModuloInventario/
│   │                       ├── ModuloInventario.tsx              # Componente raíz y navegación por pestañas
│   │                       ├── types/
│   │                       │   └── inventory.types.ts            # Entidades, enums y tipos TypeScript
│   │                       ├── services/
│   │                       │   └── inventoryService.ts           # Motor singleton del ERP y lógica transaccional
│   │                       ├── hooks/
│   │                       │   └── useInventory.ts               # Hook de suscripción y cálculo de métricas
│   │                       ├── mock/
│   │                       │   └── inventoryMockData.ts          # Datos semilla para modo local
│   │                       └── components/
│   │                           ├── CatalogView.tsx               # Catálogo de productos con filtros y métricas
│   │                           ├── StockLocationsView.tsx        # Gestión de bodegas y sucursales
│   │                           ├── PurchasingView.tsx            # Órdenes de compra y proveedores
│   │                           ├── KardexView.tsx                # Historial cronológico de movimientos
│   │                           ├── ManufacturingView.tsx         # Órdenes de ensamble y producción BOM
│   │                           ├── ProductFormModal.tsx          # Modal de alta/edición con campos dinámicos
│   │                           ├── StockMovementModal.tsx        # Modal de entradas y salidas manuales
│   │                           ├── StockCountModal.tsx           # Modal de ajuste por conteo físico
│   │                           ├── StockTransferModal.tsx        # Modal de traslado entre bodegas
│   │                           ├── PurchaseOrderModal.tsx        # Modal de creación de orden de compra
│   │                           ├── LocationFormModal.tsx         # Modal de creación de bodegas
│   │                           ├── PartDetailModal.tsx           # Ficha técnica detallada del producto
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
