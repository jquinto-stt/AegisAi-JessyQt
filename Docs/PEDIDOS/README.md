# Documentación Técnica y Funcional — Módulo Pedidos (StockFlow)

Bienvenido a la documentación técnica, arquitectónica y operativa del módulo **Pedidos** (conocido en la arquitectura interna como `Necto Pedidos` o `compositions/pedidos`) del proyecto **StockFlow**.

Esta documentación ha sido elaborada mediante el análisis exhaustivo del código fuente real del proyecto monorepo, reflejando componentes, flujos, reglas de negocio, modelos de datos, integraciones de infraestructura y estados verdaderamente implementados.

---

## 📌 Resumen Ejecutivo del Módulo

| Atributo | Detalle en StockFlow |
|---|---|
| **Propósito** | Centralizar, procesar y despachar pedidos omnicanal (WhatsApp con IA, Mostrador POS, Web y Programados), integrando en tiempo real la cocina (KDS) y el inventario Kardex maestro. |
| **Pila Tecnológica** | React 18 / TypeScript, Vite, Tailwind CSS, Web Audio API, AWS SST v3, AWS DynamoDB, AWS Cognito, AWS API Gateway v2. |
| **Ubicación Frontend** | `packages/apps/web/modules/app/src/compositions/pedidos/` |
| **Ubicación Backend / Cloud** | `packages/cloud/core/infra/factories/pedidos.ts` y `packages/cloud/core/infra/handlers/pedidos.ts` |
| **Integración ERP** | `packages/apps/web/modules/app/src/ModuloInventario/services/inventoryService.ts` (`consumeSaleOrder`) |
| **Estado Operativo** | Totalmente funcional en frontend con simulación conversacional multi-turno, Kardex y Web Audio API. Endpoints Lambda implementados y listos para despliegue SST. |

---

## 🗺️ Índice General de Documentación

### Especificaciones Funcionales y Técnicas
1. **[01. Propósito y Alcance](./01-proposito-y-alcance.md)**: Justificación de negocio, problemas que resuelve, información que maneja y procesos soportados.
2. **[02. Actores del Sistema](./02-actores.md)**: Matriz detallada de actores humanos (Cajero, Cocinero, Repartidor, Admin), agentes inteligentes (Necto Bot) y servicios internos.
3. **[03. Casos de Uso](./03-casos-de-uso.md)**: Especificación paso a paso de los 16 casos de uso reales implementados (CU-01 a CU-16) con precondiciones y excepciones.
4. **[04. Flujo Completo del Pedido](./04-flujo-del-pedido.md)**: Ciclo de vida desde la recepción hasta el despacho, cronómetros de cocina y niveles de urgencia.
5. **[05. Arquitectura del Módulo](./05-arquitectura.md)**: Capas de software, desacoplamiento, patrón Provider/Container, Web Audio API y arquitectura Cloud Serverless.
6. **[06. Modelo de Datos](./06-modelo-de-datos.md)**: Esquemas TypeScript de `Pedido`, `OrderItem`, `Conversation`, `StockIngredientItem`, `StockMovement` y diseño Single-Table en DynamoDB.
7. **[07. Catálogo de APIs y Endpoints](./07-apis.md)**: Endpoints REST (`/pedidos`, `/products`), contratos de request/response, headers JWT y códigos HTTP.
8. **[08. Reglas de Negocio](./08-reglas-de-negocio.md)**: Reglas formales de exclusión mutua HITL, consumo idempotente de Kardex, auto-pausado de catálogo y modulación de ritmo.
9. **[09. Integraciones del Sistema](./09-integraciones.md)**: Puntos de contacto con Kardex Maestro, AWS Cognito, AWS DynamoDB y Meta WhatsApp Cloud API.
10. **[10. Manejo de Errores e Incidencias](./10-manejo-de-errores.md)**: Taxonomía de errores, resiliencia con rollback optimista, fallback offline y sistema de incidencias.
11. **[11. Pendientes y Propuestas](./11-pendientes.md)**: Diferenciación estricta entre el código desplegado y las funcionalidades en backlog o roadmap.

---

## 📊 Diagramas UML y de Flujo Disponibles

Los diagramas han sido estandarizados en sintaxis **Mermaid** y se encuentran organizados en la carpeta [`diagrams/`](./diagrams/):

* **[Diagrama de Contexto](./diagrams/contexto.md)**: Fronteras del sistema, módulos de StockFlow y actores externos.
* **[Diagrama UML de Componentes](./diagrams/componentes.md)**: Vistas, context providers, adapters, handlers Lambda y base de datos.
* **[Diagrama UML de Clases](./diagrams/clases.md)**: Entidades, atributos, métodos y cardinalidades estrictas de TypeScript.
* **[Diagrama UML de Casos de Uso](./diagrams/casos-de-uso.md)**: Mapeo de actores contra casos de uso.
* **[Diagramas UML de Secuencia](./diagrams/secuencia.md)**: Cinco secuencias detalladas (Pedido WhatsApp, Cocina y Kardex, Cancelación, Despacho y Protocolo HITL).
* **[Diagramas UML de Máquinas de Estados](./diagrams/estados.md)**: Máquinas de estado de Comanda (`OrderStatus`), Conversación (`ConversationStatus`) e Insumos (`IngredientStatus`).

---

## 🧭 Trazabilidad del Código (File Tree de Referencia)

Para que un desarrollador nuevo navegue directamente al código fuente correspondiente:

```text
StockFlow/
├── packages/
│   ├── apps/
│   │   └── web/
│   │       └── modules/
│   │           └── app/
│   │               └── src/
│   │                   ├── compositions/
│   │                   │   └── pedidos/
│   │                   │       ├── PedidosModule.tsx                  # Entrada principal y switcher de pilares
│   │                   │       ├── types.ts                          # Modelo de datos, tipos y enums
│   │                   │       ├── mockData.ts                       # Semilla de datos para modo offline
│   │                   │       ├── context/
│   │                   │       │   └── PedidosContext.tsx            # Estado global, reducers y reglas de negocio
│   │                   │       ├── operacion/
│   │                   │       │   ├── PedidosEnVivoView.tsx         # Tablero Kanban en vivo
│   │                   │       │   ├── PreparacionTiemposView.tsx    # Pantalla KDS para cocineros
│   │                   │       │   ├── ProgramadosView.tsx           # Pedidos programados y recurrentes
│   │                   │       │   └── ConversacionesView.tsx        # Bandeja WhatsApp e interfaz HITL
│   │                   │       ├── gestion/
│   │                   │       │   ├── CatalogoInteligenteView.tsx   # Gestión de platos y precios
│   │                   │       │   ├── InsumosStockView.tsx          # Escandallos, recetas y mermas
│   │                   │       │   ├── TurnosCapacidadView.tsx       # Capacidad y personal en turno
│   │                   │       │   ├── RolesPermisosView.tsx         # Matriz de permisos RBAC
│   │                   │       │   ├── AutomatizacionesView.tsx      # Reglas automáticas reactivas
│   │                   │       │   ├── ResumenDashboardView.tsx      # KPIs del día
│   │                   │       │   └── HistorialView.tsx             # Historial y auditoría de pedidos
│   │                   │       ├── shared/
│   │                   │       │   ├── OrderDetailDrawer.tsx         # Panel lateral de detalle y trazabilidad
│   │                   │       │   ├── AIInterpretationModal.tsx     # Modal de revisión de parsing de IA
│   │                   │       │   ├── RejectCancelModal.tsx         # Modal de motivo de cancelación/rechazo
│   │                   │       │   ├── IncidenciasDrawer.tsx         # Panel de alertas e incidencias
│   │                   │       │   ├── ThermalTicketModal.tsx        # Emulador e impresión de ticket 58/80mm
│   │                   │       │   └── WhatsAppFloatingWidget.tsx    # Widget flotante de conversaciones
│   │                   │       ├── adapters/
│   │                   │       │   └── productAdapter.ts             # Normalizador Cloud <-> Frontend
│   │                   │       └── utils/
│   │                   │           └── soundEffects.ts               # Sintetizador Web Audio API
│   │                   └── ModuloInventario/
│   │                       └── services/
│   │                           └── inventoryService.ts               # Método consumeSaleOrder (Kardex ERP)
│   └── cloud/
│       └── core/
│           └── infra/
│               ├── factories/
│               │   └── pedidos.ts                                    # Provisionamiento SST (DynamoDB + ApiGateway)
│               └── handlers/
│                   └── pedidos.ts                                    # Lambdas: list, create, updateStatus
└── Docs/
    └── PEDIDOS/                                                      # Esta suite documental
```

---

## 🚀 Estado Actual y Próximos Pasos

1. **Estado en Frontend**: Totalmente interactivo y operable localmente. Soporta transiciones de estado, visualización KDS, chat multi-turno con IA simulada, deducción automática de stock en el Kardex y generación de tickets térmicos.
2. **Estado en Cloud**: La tabla DynamoDB `Pedidos@Table` y los handlers Lambda están implementados. Las rutas HTTP en API Gateway se encuentran en fase de staging en `packages/cloud/core/infra/factories/pedidos.ts` pendientes de despliegue en la infraestructura de AWS.
