
# Necto — Monorepo Architecture

> **Necto** — Plataforma SaaS de propósito general para operaciones de negocios.  
> Ofrece módulos de servicio (Pedidos, Inventarios, …) que cada empresa activa según su rubro.  
> Monorepo de infraestructura AWS (`cloud.core`) y aplicación SPA (`app.web.app`) implementado con **WebiAI SDK + SST v3 + Elements**.

---

## 📐 Estructura del Monorepo

```text
Necto/
├── package.json                   # @stt/necto — raíz del monorepo
├── webiai.config.mjs              # Configuración de WebiAI
├── lerna.json                     # Lerna workspaces
│
└── packages/
    ├── cloud/
    │   └── core/                  # @stt/necto.cloud.core (AWS CDK / SST v3)
    │       ├── infra/
    │       │   ├── app.ts         # Stack principal (CloudCore)
    │       │   ├── env.ts         # Validación de variables con EnvVisitor
    │       │   ├── factories/     # Factories: Auth, Inventarios, Pedidos, Parameters
    │       │   └── handlers/      # Lambda handlers (inventarios, pedidos)
    │       └── sst.config.ts      # Configuración de SST v3
    │
    └── apps/
        └── web/                   # @stt/necto.app.web
            └── modules/
                └── app/           # @stt/necto.app.web.app (SPA React + Elements)
                    ├── src/
                    │   ├── elements/      # UI Elements (Button, Badge, Card, Dialog, Table...)
                    │   ├── compositions/  # Business Modules (pedidos, inventarios)
                    │   ├── pages/         # Top-level Views (NectoApp, Login, Register)
                    │   └── auth/          # AWS Cognito Auth Context
                    └── vite.config.ts     # Vite + Tailwind CSS
```

---

## 🧩 Plataforma vs. Módulos

**Necto es la plataforma**; **Pedidos** e **Inventarios** son **módulos de servicio** que una empresa activa como producto según su rubro. Necto sirve a múltiples rubros — restaurantes, centros deportivos, clínicas, inmobiliarias, coworkings, retail, hoteles, servicios técnicos, negocios de barrio, entre otros — resolviendo problemas transversales: atención lenta, falta de automatización, trazabilidad, métricas y orden operativo.

| Concepto | Qué es | Ejemplo |
| --- | --- | --- |
| **Plataforma** | Necto — shell, autenticación, navegación y servicios compartidos | `NectoApp`, `auth/`, `elements/` |
| **Módulo** | Un servicio de dominio que una empresa activa | `compositions/pedidos`, `compositions/inventarios` |
| **Recurso backend** | Infra dedicada por dominio, **no compartida entre módulos** | `Pedidos@Table` / `Inventarios@Table` |

### Propiedad de recursos por módulo

Cada módulo tiene su propia capa de datos y recurso backend. No se comparten tablas entre dominios distintos:

- **Módulo Pedidos** → Catálogo de productos y órdenes, respaldado por `Pedidos@Table` + `Pedidos@Api` (WebiAI `cloud.core`). Aislamiento por `ownerId` (claim `sub` del JWT de Cognito). Capa frontend: `src/api/products.ts`, `src/api/mockProducts.ts`, `src/compositions/pedidos/adapters/productAdapter.ts`.
- **Módulo Inventarios** → Dominio de control físico de activos y evidencias; respaldado por `Inventarios@Table` + `Inventarios@Api`. **No** monta sobre el recurso de Pedidos.

> **Nomenclatura**: Lo que el módulo Pedidos llama "catálogo de productos" pertenece a **ese módulo específico**, no a la plataforma Necto en general.

---

## 🎛️ Capa Elements

> **Nota de transparencia:** *Elements* aquí es un **patrón arquitectónico y de convención propio de este proyecto**, construido sobre React + Tailwind. **No** es un SDK ni una API de WebiAI (WebiAI no expone "Elements" como librería). Se nombra explícitamente para que cada concepto sea evaluable con evidencia en el código.

La capa vive en `packages/apps/web/modules/app/src/elements/` y define componentes UI atómicos reutilizables, cada uno declarado con el helper `ui_dsl()` y emitiendo `data-node-id` + `data-intent` para trazabilidad.

```text
src/elements/
├── dsl.ts        # ui_dsl(): declara nodeId + intent + variants → componente tipado
├── Button.tsx    # variants: primary | accent | outline | ghost
├── Card.tsx      # variants: default | elevated | dashed
├── Badge.tsx     # variants: neutral | accent | success | warning | danger
├── Field.tsx     # <input> etiquetado (labelStyle mono|bold, mono, error, hint)
├── Select.tsx    # <select> etiquetado (options | children)
├── Textarea.tsx  # <textarea> etiquetada
└── index.ts      # barrel
```

### Conceptos → evidencia en el código

| Concepto | Implementación concreta | Evidencia (Node ID / Intent) |
| --- | --- | --- |
| **Element** | Componente UI atómico declarado con `ui_dsl()` | `necto.el.button`, `necto.el.field`, `necto.el.select`, `necto.el.textarea`, `necto.el.card`, `necto.el.badge` |
| **Design DSL / `ui_dsl()`** | Helper tipado que declara `nodeId` + `intent` + `variants` y devuelve un componente que emite los metadatos | `src/elements/dsl.ts` |
| **Node IDs** | Identificador estable por nodo, para trazabilidad/telemetría/testing | atributo `data-node-id` |
| **Intent Tags** | Metadato de intención por nodo/acción | atributo `data-intent` (p.ej. `catalog.product.create.submit`) |

### `ui_dsl()` — la utilidad (forma real)

```tsx
export const Button = ui_dsl<ButtonProps>({
  nodeId: 'necto.el.button',
  intent: ['action.generic'],
  base: 'inline-flex items-center rounded-xl font-bold …',
  variants: { primary: '…', accent: '…', outline: '…', ghost: '…' },
  render: ({ nodeId, intent, className, props, children }) => (
    <button data-node-id={nodeId} data-intent={intent} className={className} {...props}>
      {children}
    </button>
  ),
});
```

`ui_dsl` resuelve el Node ID (base + sufijo de variante, p.ej. `necto.el.button.accent`), el Intent efectivo (declarado o sobrescrito por instancia con la prop `intent`) y combina las clases (`base` + variante + `className`).

### Uso real: módulo Pedidos → Catálogo

La capa **no es una demo aislada**: está aplicada en el front en uso. El primer módulo migrado es el **Catálogo Inteligente** (`src/compositions/pedidos/gestion/CatalogoInteligenteView.tsx`), donde los Elements sustituyen las primitivas inline preservando toda la lógica de negocio (creación/edición de productos vía `usePedidos`, simulación de pedido, modificadores):

| Zona del catálogo | Elements aplicados | Intents (`data-intent`) |
| --- | --- | --- |
| Modal *Crear plato* | `Field`, `Select`, `Textarea`, `Button` | `catalog.product.create.*` |
| Modal *Editar plato* | `Field`, `Select`, `Textarea`, `Button` | `catalog.product.edit.*` |
| Modal *Nueva categoría* | `Field`, `Button` | `catalog.category.create.*` |
| Toolbar (orden, alta) | `Select`, `Button` | `catalog.sort`, `catalog.product.new`, `catalog.category.new` |
| Tarjetas de estadística | `Card`, `Badge` | `catalog.stat.*` |
| Tarjeta de producto | `Button` | `catalog.product.edit.open` |
| Reseñas | `Card`, `Badge`, `Button` | `catalog.review.*` |

La lógica de dominio se mantuvo intacta: `handleCreateProductSubmit`, `handleSaveProductEdit`, `handleAddNewCategory`, `handleTestOrderSubmit` y los cálculos (`computedPreviewTotal`, coste desde receta) no se tocaron; solo cambió la capa de presentación a Elements.

### Uso real: módulo Pedidos → Operación

El módulo de **Operación** también está migrado, en sus dos vistas:

| Vista | Archivo | Elements aplicados | Intents |
| --- | --- | --- | --- |
| **Bandeja Unificada** | `operacion/PedidosEnVivoView.tsx` | `Button`, `Card`, `Field`, `Select`, `Textarea` | `pedidos.order.*`, `pedidos.manual.*`, `pedidos.toolbar.*` |
| **KDS Cocina** | `operacion/PreparacionTiemposView.tsx` | `Button`, `Card`, `Badge` | `kds.order.*`, `kds.section.*`, `kds.header` |

Se preservó intacta la lógica delicada: transiciones de estado de pedidos (`confirmOrder`, `sendToKitchen`, `markOrderReady`, `deliverOrder`), sonido (`playOrderAlert`/`playSuccessSound`), filtrado (`filterOrdersList`), drag & drop del tablero Kanban, y cálculos de urgencia/progreso.

Se dejaron **intencionalmente** sin migrar los controles que no son botones atómicos: los toggles de vista (Tablero/Lista), las pills de filtro con estado activo (Retrasos, estaciones KDS, checklist de cocina), el input de búsqueda (usa `ref` + icono + botón de limpiar) y los `<select>` de filtro de la toolbar (llevan chevron propio). Migrarlos a Elements requeriría un Element `SegmentedControl`/`SearchInput` dedicado.

### Uso real: módulo Pedidos → Gestión

Las 7 vistas de **Gestión** están migradas (enfoque pragmático: acciones atómicas → `Button`, estados → `Badge`, formularios → `Field`/`Select`/`Textarea`):

| Vista | Elements aplicados | Intents |
| --- | --- | --- |
| ResumenDashboardView | `Button`, `Badge` | `resumen.*` |
| AnaliticaView | `Badge` | `analitica.*` |
| TurnosCapacidadView | `Badge` | `turnos.*` |
| HistorialView | `Button`, `Select` | `historial.*` |
| RolesPermisosView | `Button`, `Field`, `Select`, `Badge` | `roles.*` |
| AutomatizacionesView | `Button`, `Field`, `Textarea`, `Badge` | `automatizaciones.*` |
| InsumosStockView | `Button`, `Field`, `Select`, `Badge` | `insumos.*` |

Toda la lógica de negocio quedó intacta: CRUD de insumos (`addIngredient`/`updateIngredient`/`deleteIngredient` con cálculo de estado de stock), roles y permisos (`createRole`/`updateRole`/`deleteRole`), toggles de reglas/recurrencias, exportación CSV del cierre de caja, y los cálculos de KPIs.

En estas vistas se dejaron sin migrar (documentado): los controles **segmentados** (sub-tabs, pills de filtro por categoría/estado/turno, toggles ON/OFF de reglas), las **tarjetas-dashboard** con estilo visual propio (`#2C2D31`/`#374151`) y los elementos con acento **índigo `#190088`** (no hay variante para ese color). Estos requerirían Elements `SegmentedControl`, `Toggle` y una variante `indigo` para migrarse de forma coherente.

### Uso real: módulo Pedidos → componentes compartidos y Programados

El módulo Pedidos quedó cubierto de punta a punta. Además de Catálogo, Operación (Bandeja/KDS) y las 7 vistas de Gestión, se migraron la vista **Programados** y los **componentes compartidos** (`shared/`):

| Componente | Elements aplicados | Intents |
| --- | --- | --- |
| ProgramadosView | `Button` | `programados.*` |
| OrderDetailDrawer | `Button` | `order-detail.*` |
| OrderCard | `Button` | `order-card.*` |
| AIInterpretationModal | `Button` | `ai-modal.*` |
| ThermalTicketModal | `Button` | `ticket.*` |
| CustomLayoutModal | `Button` | `layout.*` |
| RejectCancelModal | `Button`, `Field` | `reject-cancel.*` |
| IncidenciasDrawer | `Button`, `Badge` | `incidencias.*` |
| StorePaceSelector | `Button` | `store-pace.*` |
| PedidosModule | `Button` | `pedidos.incidencias.open` |

Los únicos archivos del módulo sin Elements son los que no tienen UI propia: `PedidosContext` (lógica), `NectoBanner`/`SafeImage` (presentación sin controles), y `Badges` (que exporta sus propios componentes de badge con API establecida, incluido un `AIBadge` clicable que abre el modal de IA).

### Uso real: Hub / Workspace y Onboarding

Las pantallas grandes fuera de Pedidos también están migradas (enfoque pragmático):

| Pantalla | Elements aplicados | Intents |
| --- | --- | --- |
| BusinessSettingsModal | `Button`, `Field`, `Select`, `Textarea`, `Badge` | `business.*` |
| OnboardingPage | `Button`, `Badge` | `onboarding.*` |
| NectoApp (shell) | `Button`, `Badge` | `shell.notifications.*` |

- **BusinessSettingsModal**: formulario de identidad (nombre/ciudad → `Field`, país/moneda → `Select`), mensaje de pausa (`Textarea`), badges de estado, y las acciones de guardar/descartar/eliminar (incluida la zona de peligro con `handleDelete` intacto).
- **OnboardingPage**: navegación del wizard (Anterior/Siguiente/Finalizar), conexión Meta y badges de estado. Los inputs con icono absoluto (nombre/ciudad/teléfono, país) se dejaron por el addon visual.
- **NectoApp** es un shell de navegación: se migró lo que aporta valor sin romper el look (badge de notificaciones, cerrar dropdown). El sidebar (`NavItem`/`SectionHeader`), el breadcrumb, la campana y el selector de rol son controles de navegación/segmentados con estilos propios y quedaron intactos.
- **WorkspacesPage** (Hub): botones "Cuenta"/"Ajustes"/"Entrar al Tablero" → `Button`.
- **AccountSettingsModal**: campos de perfil → `Field`, acciones → `Button`.
- **RoleSelectionModal** y **GlobalFranchiseOverview**: botones de entrada al tablero → `Button`.

### Cobertura y decisiones de alcance

La adopción de Elements alcanza **~52%** del front (27 de 39 archivos de UI usan la capa). El resto se dejó **intencionalmente** sin migrar, por razones documentadas:

- **Pantallas de autenticación** (`Login`, `Register`): usan un sistema de CSS propio (`auth-container`, `form-input`, `btn-primary`), ajeno a Tailwind. Migrarlas rompería su diseño.
- **Componentes trigger propios** (`ThemeToggle`, `GlobalSearchButton`): ya son primitivas UI reutilizables con forma circular y animaciones específicas, análogas a un Element.
- **Controles segmentados / dropdowns** (`BusinessSwitcher`, `CommandPalette`, tabs, switches, pills de filtro): requerirían Elements dedicados (`SegmentedControl`, `Toggle`, `SearchInput`) para migrarse de forma coherente.
- **`Badges`** (`AIBadge`): componente de badge con API propia (clicable, abre modal IA).

### Trazabilidad

Cada nodo relevante emite `data-node-id` y `data-intent`, localizables en el DOM y en el bundle de producción. Ejemplos:

```text
necto.el.button · necto.el.field · necto.el.select · necto.el.textarea
necto.el.card · necto.el.badge

catalog.product.create.submit · catalog.product.edit.save
catalog.sort · catalog.review.verified
```
