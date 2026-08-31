
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
├── Toggle.tsx    # switch ON/OFF accesible (role=switch)
├── SegmentedControl.tsx  # grupo de opciones con estado activo (tabs/pills/views)
├── SearchInput.tsx       # input de búsqueda (icono + clear opcional, forwardRef)
└── index.ts      # barrel
```

### Conceptos → evidencia en el código

| Concepto | Implementación concreta | Evidencia (Node ID / Intent) |
| --- | --- | --- |
| **Element** | Componente UI atómico declarado con `ui_dsl()` (o función genérica cuando requiere tipos literales / ref) | `necto.el.button`, `necto.el.field`, `necto.el.select`, `necto.el.textarea`, `necto.el.card`, `necto.el.badge`, `necto.el.toggle`, `necto.el.segmented`, `necto.el.search` |
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
| **Conversaciones WhatsApp** | `operacion/ConversacionesView.tsx` | `Button`, `SearchInput`, `SegmentedControl` | `conversaciones.*`, `conversation.*` |

Se preservó intacta la lógica delicada: transiciones de estado de pedidos (`confirmOrder`, `sendToKitchen`, `markOrderReady`, `deliverOrder`), sonido (`playOrderAlert`/`playSuccessSound`), filtrado (`filterOrdersList`), drag & drop del tablero Kanban, y cálculos de urgencia/progreso.

El conmutador de vista (Tablero/Lista) se migró a `SegmentedControl` (`pedidos.view`) y el buscador a `SearchInput` (`pedidos.search`, conserva el `ref` para el atajo Ctrl+K). Quedan como primitivas propias las pills de filtro con estado activo (Retrasos, estaciones KDS, checklist de cocina) — son arrays dinámicos — y los `<select>` de filtro de la toolbar (llevan chevron propio).

**Validación de flujo del Kanban:** el drag & drop del tablero sólo permite avanzar el pedido **una etapa** en el orden `NUEVO → CONFIRMADO → EN_PREPARACION → LISTO → FINALIZADO`. Soltar una tarjeta en una columna que salte o retroceda estados se bloquea con un aviso, evitando transiciones inválidas.

#### Human-in-the-Loop (HITL): intervención humana en conversaciones WhatsApp

El sub-tab **Conversaciones** implementa un flujo de intervención humana sobre las conversaciones de WhatsApp/IA (mockup en memoria, sin backend). Cada conversación tiene una máquina de estados de control independiente del estado del pedido:

`IA_ATENDIENDO → REQUIERE_INTERVENCION → HUMANO_ATENDIENDO → RESUELTO → (vuelve a) IA_ATENDIENDO`

- **Detección:** badge naranja pulsante + borde de acento + sonido cuando una conversación requiere intervención (IA ambigua, cliente pide humano, modificación especial, confirmar dato, baja confianza).
- **Toma de control:** el operador pulsa *Tomar control* → pasa a `HUMANO_ATENDIENDO` y se registra `controlledBy`. La exclusión mutua (IA vs humano) está garantizada en el contexto: `sendOperatorMessage` sólo agrega si el humano tiene el control, y la IA sólo responde en `IA_ATENDIENDO`.
- **Gestión del pedido:** desde la conversación se puede confirmar / modificar / rechazar el pedido asociado reutilizando las acciones y modales existentes (`confirmOrder`, `AIInterpretationModal`, `RejectCancelModal`).
- **Auditoría:** cada transición queda registrada en `handoffHistory` (quién y cuándo), análogo al `history` del pedido.

Componentes: `operacion/ConversacionesView.tsx` (inbox de dos paneles), `shared/ConversationThread.tsx` (hilo + input contextual) y `shared/ConversationControlBar.tsx` (control + acciones de pedido). Estado y acciones en `context/PedidosContext.tsx` (`takeControl`, `releaseToAI`, `resolveConversation`, `sendOperatorMessage`, `flagForHandoff`). Datos sembrados en `mockData.ts` (`INITIAL_CONVERSATIONS`).

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

Los sub-tabs de `AutomatizacionesView` e `InsumosStockView` se migraron a `SegmentedControl` (`automatizaciones.subtab`, `insumos.subtab`) y el buscador de insumos a `SearchInput` (`insumos.search`). Quedan sin migrar (documentado): las pills de filtro por categoría/estado/turno (arrays dinámicos), las **tarjetas-dashboard** con estilo visual propio (`#2C2D31`/`#374151`) y los elementos con acento **índigo `#190088`** (no hay variante para ese color).

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

La adopción de Elements alcanza **~86%** del front (327 de 381 controles UI usan la capa). Se añadieron Elements nuevos para cubrir patrones que antes quedaban como primitivas inline, y se migraron masivamente los `<button>`, `<input>`, `<select>` y `<textarea>` nativos que mapean limpio a la capa (`Button`, `Field`, `Select`, `Textarea`). Los ~54 controles nativos restantes son intencionales: las primitivas internas de `src/elements/` (implementación de los propios Elements), las pantallas de autenticación (CSS propio), y casos especiales donde el nativo es la opción correcta (inputs con icono absoluto, `type="date/file/color/datetime-local"`, checkboxes/radios, controles inline sin label, y triggers circulares propios). Los tres Elements iniciales para cubrir patrones que antes quedaban inline:

- **`Toggle`** (`necto.el.toggle`): switch ON/OFF accesible (`role="switch"`). Aplicado en los canales de venta de `BusinessSettingsModal` (WhatsApp/Web/POS → `business.channel.*`) y en `showToolbar` de `CustomLayoutModal` (`layout.toolbar.*`).
- **`SegmentedControl`** (`necto.el.segmented`): grupo de opciones con estado activo (tabs, pills de filtro, conmutadores de vista), con tonos `contrast | accent | panel`. Aplicado en el time-range y metric-tabs de `AnaliticaView`, subtabs de `AutomatizacionesView`/`InsumosStockView`/`CatalogoInteligenteView`, y view switchers de `ProgramadosView`/`PedidosEnVivoView`.
- **`SearchInput`** (`necto.el.search`): input de búsqueda con icono + clear opcional (usa `forwardRef` para soportar focus por atajo). Aplicado en `PedidosEnVivoView` (con `ref` para Ctrl+K), `InsumosStockView` e `HistorialView`.

El resto se dejó **intencionalmente** sin migrar, por razones documentadas:

- **Pantallas de autenticación** (`Login`, `Register`): usan un sistema de CSS propio (`auth-container`, `form-input`, `btn-primary`), ajeno a Tailwind. Migrarlas rompería su diseño.
- **Componentes trigger propios** (`ThemeToggle`, `GlobalSearchButton`): ya son primitivas UI reutilizables con forma circular y animaciones específicas, análogas a un Element.
- **Controles segmentados con lógica/estilo especial** (`BusinessSwitcher`, `CommandPalette`, section switcher y sub-tabs de `PedidosModule`, arquetipos/tabs verticales de `BusinessSettingsModal`, grupos índigo de `TurnosCapacidadView`, `StorePaceSelector`, category pills dinámicas): se dejaron por layout vertical, arrays dinámicos, color de acento propio o handlers acoplados que no mapean limpio a los Elements horizontales.
- **`Badges`** (`AIBadge`): componente de badge con API propia (clicable, abre modal IA).

### Trazabilidad

Cada nodo relevante emite `data-node-id` y `data-intent`, localizables en el DOM y en el bundle de producción. Ejemplos:

```text
necto.el.button · necto.el.field · necto.el.select · necto.el.textarea
necto.el.card · necto.el.badge · necto.el.toggle · necto.el.segmented · necto.el.search

catalog.product.create.submit · catalog.product.edit.save
catalog.sort · catalog.review.verified
business.channel.whatsapp · analitica.time-range · pedidos.search
```
