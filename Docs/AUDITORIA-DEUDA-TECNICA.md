# Auditoría de deuda técnica — StockFlow / Necto

**Fecha:** 12 de septiembre de 2026
**Alcance:** los 358 ficheros rastreados por git. `Repo-prueba-master/` queda **fuera** (está en `.gitignore`, es una copia de referencia) y `node_modules/` también.
**Estado:** auditoría solamente. **No se ha modificado ningún fichero de código.**

---

## 0. Cómo se verificó (método)

Nada de esta auditoría se marca como eliminable "porque parece poco usado". Cada afirmación sale de una de estas fuentes, y las tres se pueden volver a ejecutar:

| Fuente | Qué aporta |
| --- | --- |
| `tsc --noEmit -p tsconfig.app.json` (desde el paquete de la app) | 90 errores tipados, clasificados por código |
| `.workbuddy-ai/audit-import-graph.mjs` | grafo de imports/reexports; ficheros sin importadores, símbolos nunca importados |
| `.workbuddy-ai/audit-reachability.mjs` | **alcanzabilidad a nivel de símbolo desde `main.tsx`**, resolviendo cadenas de re-export |
| `.workbuddy-ai/audit-unused.mjs` | imports sin usar dentro de ficheros, dependencias npm huérfanas, marcadores |
| `grep` dirigido por cada hallazgo | confirmación puntual antes de dar algo por muerto |

> **Por qué la alcanzabilidad a nivel de símbolo era imprescindible.** Los *barrel files* (`elements/index.ts`, `shell/index.ts`) importan todo lo que hay debajo, así que un grafo a nivel de fichero declara "vivo" a `ui/modal/Modal.tsx` aunque **nadie importe `Modal` desde el barrel**. El análisis resuelve los re-exports y distingue los dos casos. Esa es la diferencia entre los 26 ficheros inalcanzables y los 27 adicionales que solo sobreviven por el barrel.

**Cifras de cabecera**

| Métrica | Valor |
| --- | --- |
| Ficheros fuente `.ts/.tsx` (app) | 149 |
| Errores de `tsc` | 90 (de los cuales **62 son un único problema**: falta de declaración de `*.svg?react`) |
| Ficheros **inalcanzables** desde `main.tsx` | **26** (3.469 líneas, descontando `vite-env.d.ts`) |
| Ficheros alcanzables **solo por barrel** y con todos sus exports sin usar | **27** (2.402 líneas) |
| Símbolos exportados muertos | **305** |
| Imports sin usar dentro de ficheros | **80** en 13 ficheros |
| Infra huérfana (cloud + api) + CSS muerto | 788 líneas |

---

## 1. Bugs y posibles errores

Ordenados por impacto real en ejecución.

### B1 — `onChange` con la firma equivocada ⇒ **TypeError en runtime**
- **Ubicación:** `src/compositions/workspace/AccountSettingsModal.tsx:315` y `:352`
- **Problema:** se usa `onChange={e => setAssignedBranch(e.target.value)}` sobre `Select` y `Textarea`, cuyo contrato es `onChange: (value: string) => void` — **no reciben el evento nativo**. `e` es un `string`, así que `e.target` es `undefined` y `e.target.value` lanza `TypeError`.
- **Evidencia:**
  - `elements/form/select/Select.tsx:48` → `onChange: (value: string) => void;`
  - `elements/form/textarea/Textarea.tsx:38` → `onChange?: (value: string) => void;` y el docstring de la línea 77 lo dice explícitamente: *"`onChange` receives `string` value, not the native event"*.
  - `tsc`: `TS2339: Property 'target' does not exist on type 'string'` ×2 (líneas 315 y 352).
  - Contraste: las líneas 304/331/340 usan `Field`, que **sí** pasa el evento (no hay error ahí) → la inconsistencia es real y está dentro del mismo fichero.
- **Recomendación:** `onChange={setAssignedBranch}` / `onChange={setBio}`. Y de paso unificar el contrato: hoy `Field` entrega evento y `Select`/`Textarea` entregan valor.

### B2 — El botón "Configuración" del sidebar abre el modal con un `MouseEvent` como pestaña
- **Ubicación:** `src/compositions/shell/StockFlowSidebar.tsx:170`
- **Problema:** `onClick={onOpenSettingsModal || (() => navigate("/workspaces"))}`. React invoca el handler con el evento como primer argumento, y `onOpenSettingsModal` es `(tab?: string) => void`. El `MouseEvent` viaja hasta `setSettingsInitialTab(...)`.
- **Evidencia:** `tsc` → `TS2322: Type '(tab?: string) => void' is not assignable to type 'MouseEventHandler<HTMLButtonElement>'` con la nota *"Types of parameters 'tab' and 'event' are incompatible"*.
- **Recomendación:** `onClick={() => onOpenSettingsModal?.()}`.

### B3 — `FranchiseAnalyticsPage` lee una propiedad que no existe en el contexto
- **Ubicación:** `src/pages/FranchiseAnalyticsPage.tsx:16`
- **Problema:** `const { currentBusiness, businesses, switchBusiness } = useBusiness();` pero `BusinessContextType` no expone `currentBusiness`.
- **Evidencia:** `tsc` → `TS2339: Property 'currentBusiness' does not exist on type 'BusinessContextType'`. La ruta **sí está registrada** (`App.tsx:24`, `/analitica`), así que es alcanzable.
- **Impacto:** silencioso pero real — `currentBusiness?.logoUrl` es siempre `undefined`, por lo que la rama del logo en la cabecera (línea 39) **nunca se pinta**.
- **Recomendación:** usar `activeBusiness` (el nombre real en el contexto) y revisar `switchBusiness`.

### B4 — La sede por defecto no cumple su propio tipo
- **Ubicación:** `src/context/BusinessContext.tsx:1097` (`DEFAULT_BUSINESS`)
- **Problema:** falta `kitchenBufferMin`, declarado como **requerido** en `BusinessInstance` (línea 375).
- **Evidencia:** `tsc` → `TS2741: Property 'kitchenBufferMin' is missing ... but required in type 'BusinessInstance'`. El otro seed (línea 1136) **sí** lo define con valor `20`.
- **Impacto:** `activeBusiness.kitchenBufferMin === undefined` para la sede por defecto.
- **Recomendación:** añadir el campo con el mismo valor que el otro seed.

### B5 — `RolesPermisosView` son 8 `ReferenceError` esperando a ocurrir
- **Ubicación:** `src/compositions/shared/security/RolesPermisosView.tsx` (865 líneas)
- **Problema:** usa `NectoBanner` (1), `Button` (6) y `SearchInput` (1) sin importarlos, más un parámetro implícito `any`.
- **Evidencia:** `tsc` → 8 × `TS2304: Cannot find name '...'` + 1 × `TS7006`. El fichero **no tiene ningún consumidor** (ver D1).
- **Recomendación:** eliminar el fichero. Si se quisiera conservar, primero habría que arreglar los imports.

### B6 — El barrel exporta un miembro que no existe
- **Ubicación:** `src/elements/index.ts:47`
- **Problema:** `export type { ButtonsGroupProps, ButtonGroupOption } from './ui/buttons-group'` — ese módulo exporta `ButtonsGroupItem`, no `ButtonGroupOption`.
- **Evidencia:** `tsc` → `TS2614: Module '"./ui/buttons-group"' has no exported member 'ButtonGroupOption'`.
- **Impacto:** `import { ButtonGroupOption } from "@/elements"` resolvería a `undefined` en runtime.
- **Recomendación:** renombrar al nombre real (`ButtonsGroupItem`) o eliminar la línea.

### B7 — Mapas de etiquetas con claves que no pertenecen a su tipo
- **Ubicación:** `src/pages/NectoApp.tsx:415, 416, 444, 460`
- **Problema:** `handleNavigateFromNotification` compara contra `"gestion"` y `"insumos"`, y los mapas `pedidosGePageNames` / `sectionRoleNames` declaran esas claves como literales. Ninguna existe en los tipos: `PedidosSection` (línea 25) no incluye `"gestion"`; `GestionTab` (línea 27) no incluye `"insumos"`.
- **Evidencia:** `tsc` → 2 × `TS2367` (*"This comparison appears to be unintentional because the types have no overlap"*) + 2 × `TS2353` (*"Object literal may only specify known properties"*).
- **Recomendación:** al ser residuo del módulo borrado (ver L1), eliminar junto con él.

### B8 — `DatePicker` importa una dependencia que no está instalada
- **Ubicación:** `src/elements/form/date-picker/DatePicker.tsx:2`
- **Problema:** `import flatpickr from "flatpickr"` — `flatpickr` no figura en ningún `package.json` ni está instalado.
- **Evidencia:** `tsc` → `TS2307: Cannot find module 'flatpickr'`. El fichero es inalcanzable (D1).
- **Recomendación:** eliminar el fichero (es el único consumidor).

### B9 — 62 de los 90 errores de `tsc` son **un solo** problema: falta la declaración de `*.svg?react`
- **Ubicación:** `src/icons/index.ts` (60 errores) y `src/shell/icons/index.ts` (2 errores); declaración ausente en `src/vite-env.d.ts`
- **Problema:** `vite-env.d.ts` declara `*.png`, `*.jpg`, `*.jpeg` y `*.svg`, pero **no** `*.svg?react`. Los imports con el sufijo `?react` no resuelven para TypeScript.
- **Evidencia (importante, evita un falso positivo):** los SVG **existen** — `ls icons/*.svg` da 60 ficheros, y `icons/plus.svg`, `icons/close.svg`, etc. están todos. Además `vite.config.ts` configura `vite-plugin-svgr` con `exportType: 'named'` y `namedExport: 'ReactComponent'`. Es decir: **en runtime funciona**; el error es puramente de tipos.
- **Recomendación:** añadir a `vite-env.d.ts`:
  ```ts
  declare module "*.svg?react" {
    import type { FC, SVGProps } from "react";
    export const ReactComponent: FC<SVGProps<SVGSVGElement>>;
    export default ReactComponent;
  }
  ```
  Esto baja `tsc` de 90 a ~28 errores sin tocar ni una línea de lógica.

### B10 — Supresiones de tipos y `console.*` sueltos
- **Ubicación:** `as any` ×14 (`BusinessSettingsModal.tsx` ×12, `RolesPermisosView.tsx` ×1, +1) y `console.*` ×10 (`CatalogContext`, `BusinessContext:1170`, `DatePicker:125`, `MultiSelect:122`, `Switch:104`, `List:277`, `OnboardingPage:386`, `ui.store:282`, `audioAlerts:23`).
- **Problema:** los `as any` desactivan la comprobación justo donde el contrato de props ya está roto (B1/B6 son el mismo patrón); los `console.*` son depuración que quedó en el código.
- **Recomendación:** sustituir los `as any` por tipos correctos (la mayoría son props pasadas a `Select`/`Textarea`, ver R1) y quitar los `console.*` o llevarlos a un logger.

---

## 2. Código muerto

### D1 — 26 ficheros inalcanzables desde `main.tsx` (3.469 líneas)

Verificado siguiendo imports **y re-exports** desde `main.tsx`. Ninguno tiene camino de entrada.

| Fichero | Líneas | Nota |
| --- | --- | --- |
| `compositions/shared/security/RolesPermisosView.tsx` | 865 | además con 9 errores de tipos (B5) |
| `elements/ui/list/List.tsx` + `index.ts` | 553 + 11 | |
| `compositions/channels/context/ChannelsContext.tsx` | 481 | stub huérfano conocido |
| `elements/form/multi-select/MultiSelect.tsx` + `index.ts` | 303 + 3 | |
| `elements/form/date-picker/DatePicker.tsx` + `index.ts` | 203 + 3 | importa `flatpickr` (B8) |
| `api/mockProducts.ts` | 139 | |
| `compositions/catalog/context/CatalogContext.tsx` | 134 | stub huérfano conocido |
| `api/products.ts` | 71 | |
| `elements/Select.tsx` | 86 | duplicado plano (ver R2) |
| `elements/Textarea.tsx` | 73 | duplicado plano |
| `elements/Button.tsx` | 45 | duplicado plano |
| `elements/Badge.tsx` | 41 | duplicado plano |
| `elements/Card.tsx` | 36 | duplicado plano |
| `elements/common/ChartTab.tsx` | 46 | |
| `elements/common/CountdownTimer.tsx` | 73 | |
| `elements/common/GridShape.tsx` | 25 | |
| `elements/common/index.ts` | 7 | barrel sin consumidores |
| `api/client.ts` | 50 | solo lo usa `api/products.ts` (muerto) |
| `contracts/catalog.contract.ts` | 63 | solo lo usa `CatalogContext` (muerto) |
| `contracts/channel.contract.ts` | 77 | solo lo usa `ChannelsContext` (muerto) |
| `contracts/index.ts` | 5 | solo lo usa `ChannelsContext` (muerto) |
| `hooks/useIsMobile.ts` | 76 | cero referencias |
| `vite-env.d.ts` | 22 | **falso positivo**: es un fichero de declaraciones, no tiene importadores por diseño. **No borrar.** |

- **Evidencia:** `audit-reachability.mjs` + confirmación por `grep` de cada ruta (busqué el nombre del fichero y el nombre del directorio, incluyendo `import()` dinámico — no hay ninguno en todo `src/`).
- **Recomendación:** borrar las 25 entradas reales. **Antes**, decidir el destino de `catalog/` y `channels/` (ver M1).

### D2 — 27 ficheros que solo sobreviven por un barrel, con todos sus exports sin usar (2.402 líneas)

El barrel los "mantiene vivos" pero nadie consume sus símbolos.

| Fichero | Líneas |
| --- | --- |
| `elements/ui/notification/Notification.tsx` + `index.ts` | 441 + 8 |
| `elements/ui/alert/Alert.tsx` + `index.ts` | 347 + 3 |
| `elements/ui/buttons-group/ButtonsGroup.tsx` + `index.ts` | 245 + 12 |
| `elements/ui/modal/Modal.tsx` + `index.ts` | 231 + 3 |
| `elements/form/switch/Switch.tsx` + `index.ts` | 198 + 3 |
| `shell/header/NotificationDropdown.tsx` | 152 |
| `elements/ui/table/*` (Table, TableBody, TableCell, TableHeader, TableRow, index) | 151+16+22+16+16+7 |
| `shell/header/UserDropdown.tsx` | 105 |
| `elements/SegmentedControl.tsx` | 96 |
| `shell/menu/MenuSubmenuItem.tsx` | 93 |
| `elements/SearchInput.tsx` | 77 |
| `elements/ui/card/Card{Body,Description,Footer,Header,Title}.tsx` | 25+15+31+31+29 |
| `shell/menu/MenuSectionHeader.tsx` | 29 |

- **Evidencia:** `audit-reachability.mjs`, sección *"REACHABLE FILES WHOSE EXPORTS ARE ALL UNUSED"*. Ejemplo reproducible: `Modal` aparece en `elements/index.ts:34` pero **ningún** consumidor del barrel importa `Modal` (los 7 consumidores de `@/elements` importan solo `Button, Field, Toggle, Select, Textarea, Badge, Card, Breadcrumb`).
- **Recomendación:** borrar. Si se prevé usarlos, moverlos fuera del barrel es peor remedio: mejor borrarlos y recuperarlos de git cuando hagan falta.

### D3 — Infraestructura huérfana de los módulos borrados (347 líneas)

| Fichero | Líneas |
| --- | --- |
| `packages/cloud/core/infra/factories/pedidos.ts` | 60 |
| `packages/cloud/core/infra/factories/inventarios.ts` | 59 |
| `packages/cloud/core/infra/handlers/pedidos.ts` | 123 |
| `packages/cloud/core/infra/handlers/inventarios.ts` | 105 |

- **Evidencia:** `cloud/core/infra/factories/index.ts` exporta **solo** `createVpc` y `createCognito`; `app.ts` no los importa; el cableado de rutas está **comentado** dentro de los propios ficheros (p. ej. `pedidos.ts:53-56`, `inventarios.ts:53-55`). **Ninguna** de las 4 rutas se referencia en `cloud/core`.
- **Recomendación:** eliminar los 4 ficheros.

### D4 — Capa de factorías abandonada en `services/api` (3 ficheros)

- **Ubicación:** `packages/services/api/infra/factories/{api-gateway,compute,database}.ts`
- **Problema:** `app.ts` **reimplementa inline** `initDatabase()`, `initCompute()`, `initApi()` y no importa ninguna factoría. `createApiGateway` / `createCompute` / `createDatabase` no se invocan en ningún sitio.
- **Evidencia:** `app.ts` solo importa `./env.js`; `grep` de `createApiGateway|createCompute|createDatabase` en `packages/services` devuelve **solo la definición**.
- **Matiz importante:** `factories/compute.ts` es lo **único** que referencia `functions/health.ts` y `functions/encuesta.ts`. Si se borra `compute.ts`, esos dos handlers quedan huérfanos también (habría que decidir si se cablean en `app.ts` o se borran).
- **Recomendación:** decidir entre (a) borrar las 3 factorías y cablear `health`/`encuesta` directamente en `app.ts`, o (b) hacer que `app.ts` use las factorías. Hoy hay dos implementaciones de lo mismo, una muerta.

### D5 — Hojas de estilo muertas (267 líneas)

| Fichero | Líneas | Evidencia |
| --- | --- | --- |
| `src/css/legacy.css` | 58 | `grep -rn "legacy.css"` → **0 importadores**. El propio encabezado dice *"pending migration"*. |
| `src/css/vendors.css` | 209 | `grep -rn "vendors.css"` → **0 importadores**. Estiliza **Swiper** y **FullCalendar**, y `grep "swiper\|fullcalendar"` en todos los `package.json` → **no declarados en ninguna parte**. |

- **Recomendación:** borrar ambos.

### D6 — `recharts` es una dependencia huérfana

- **Ubicación:** `packages/apps/web/modules/app/package.json` (`"recharts": "2.15.2"`)
- **Problema:** se declaraba para el cluster de gráficas eliminado en el commit `e10b415`. Ya no se importa en ningún fichero.
- **Evidencia:** `grep -rn "recharts" src/` → **sin resultados** (ni en `.ts`, `.tsx` ni `.css`).
- **Recomendación:** quitar de `dependencies`. *(Nota: `tw-animate-css`, `tailwindcss`, `@tailwindcss/vite`, `@vitejs/plugin-react`, `vite-plugin-svgr` y los `@types/*` también aparecen "sin usar" en mi chequeo, pero es un falso positivo: se usan desde `vite.config.ts` y desde CSS, no desde `src/`.)*

### D7 — 305 símbolos exportados que nadie pide

- **Ubicación:** repartidos; los bloques más grandes son `src/icons/index.ts` (**~51 iconos de 60**), `src/elements/index.ts` (~46), `src/elements/ui/{table,modal,alert,notification}/*`, `src/context/BusinessContext.tsx` (12).
- **Ejemplos concretos y verificables:**
  - `src/icons/index.ts`: de 60 iconos solo se consumen ~9 (`PlugInIcon`, `InfoIcon`, `ArrowRightIcon`, `UserCircleIcon` desde `StockFlowSidebar`; `EyeIcon`/`EyeCloseIcon`/`CalenderIcon` desde ficheros que están muertos). El resto son exportaciones sin consumidor.
  - `src/context/BusinessContext.tsx`: `INITIAL_ROLES`, `getBusinessSemantics`, `getDefaultRolesForArchetype`, `ArchetypeDefinition`, `BusinessSetupProgress`, `HolidayTheme`, `WhatsAppBotConfig`, `UserWorkspaceRole` — **API pública sin consumidores**.
  - `src/compositions/shared/NectoLogo.tsx`: `NectoIsotype`, `NectoIsotypeProps`.
  - `src/utils/audioAlerts.ts`: `playOrderAlert` (la función entera del fichero).
  - `src/shell/index.ts`: `ShellProvider`, `ShellConfig`, `Backdrop`, `useSidebarContext`, `PageMeta`, `AppMetaProvider`, `MenuBadge`, `MenuSectionHeader`, `MenuSubmenuItem`.
- **Evidencia:** `audit-reachability.mjs` sección *"DEAD EXPORTED SYMBOLS"*. Los `*Props`/`*Variant` incluidos son superficie de tipos sin usar (menor), pero los componentes y funciones son código real.
- **Recomendación:** recortar. Los `*Props` exportados que solo se usan internamente deberían dejar de exportarse.

---

## 3. Código duplicado

### R1 — Hay **dos librerías de componentes en paralelo**, con los mismos nombres

- **Ubicación:** `src/elements/{Button,Card,Badge,Select,Textarea}.tsx` (planos) **vs** `src/elements/ui/{button,card,badge}/*` + `src/elements/form/{select,textarea}/*`
- **Problema:** mismos nombres de componente, implementaciones distintas y tamaños muy distintos. `elements/index.ts` exporta **solo** las versiones de `ui/` y `form/`; las planas quedaron huérfanas sin borrarse.
- **Evidencia:**

  | Componente | Versión plana (muerta) | Versión viva | Ratio |
  | --- | --- | --- | --- |
  | Button | `elements/Button.tsx` (45) | `elements/ui/button/Button.tsx` (300) | 6,7× |
  | Badge | `elements/Badge.tsx` (41) | `elements/ui/badge/Badge.tsx` (220) | 5,4× |
  | Card | `elements/Card.tsx` (36) | `elements/ui/card/Card.tsx` (149) | 4,1× |
  | Select | `elements/Select.tsx` (86) | `elements/form/select/Select.tsx` (212) | 2,5× |
  | Textarea | `elements/Textarea.tsx` (73) | `elements/form/textarea/Textarea.tsx` (172) | 2,4× |

  Confirmación de que las planas están muertas: `elements/index.ts:66-76` exporta desde `./Field`, `./SearchInput`, `./SegmentedControl`, `./Toggle` — **pero no** desde `./Button`, `./Card`, `./Badge`, `./Select`, `./Textarea`. Y `grep` del nombre de cada fichero plano no encuentra importador.
- **Recomendación:** borrar las 5 versiones planas.

### R2 — Datos mock y capa API duplicadas
- **Ubicación:** `src/api/mockProducts.ts` (139) vs `src/api/products.ts` (71), con `src/api/client.ts` (50) debajo.
- **Problema:** dos rutas para lo mismo (mock vs real). Las tres están muertas: `products.ts` solo lo usa `CatalogContext.tsx`, que a su vez es inalcanzable.
- **Evidencia:** `audit-reachability.mjs` (las tres en inalcanzables) + `grep` de `api/products` → solo `CatalogContext.tsx:13`.
- **Recomendación:** borrar los tres (257 líneas). Si se prevé una capa API, es más limpio rehacerla desde cero que arrastrar esto.

### R3 — Tres definiciones de los colores de marca
- **Ubicación:** `src/styles/tailwind.css` (`@theme` con `--color-necto-*`), `src/css/theme.css` (`@theme`, 195 líneas), `src/styles/theme.css` (`:root`, 162 líneas).
- **Problema:** el mismo `#FF3F1A` / `#190088` / `#97D6DF` está declarado en tres sistemas distintos. `styles/index.css` importa **los tres** (líneas 3, 5 y 7: `../css/theme.css`, `./tailwind.css` y `./theme.css`).
- **Evidencia:** `styles/index.css`:
  ```
  @import './fonts.css';
  @import './tailwind.css';     ← @theme con --color-necto-*
  @import '../css/theme.css';   ← @theme (tokens brand-*/secondary-*)
  @import '../css/base.css';
  @import '../css/shell.css';
  @import '../css/scrollbar.css';
  @import './theme.css';        ← :root con --color-principal, etc.
  ```
  Más los tokens `--color-necto-*` de `tailwind.css:14-19`.
- **Recomendación:** consolidar en **un** fichero de tokens (`css/theme.css` `@theme`) y eliminar las definiciones paralelas. Es exactamente la clase de problema que ya se resolvió una vez para el tema claro/oscuro (`6e5fb63`) y que aquí sigue vivo para los colores.

### R4 — Dos (tres) conmutadores de tema
- **Ubicación:** `src/compositions/shared/ThemeToggle.tsx` **y** `src/shell/header/theme-toggle-button/ThemeToggleButton.tsx`, con un tercer camino de acceso vía `src/elements/common/index.ts:2`.
- **Evidencia:** consumidores reales: `NectoApp.tsx:36`, `OnboardingPage.tsx:13`, `WorkspacesPage.tsx:9` usan `ThemeToggle`; `StockFlowHeader.tsx:4` y `AuthPageLayout.tsx:4` usan `ThemeToggleButton`. Y `OnboardingPage.tsx` **importa los dos** (líneas 13 y 17) aunque solo usa uno (línea 411) — el otro import está sin usar.
- **Recomendación:** quedarse con uno (el que delega en `uiStore`, que es la fuente única de verdad) y borrar el otro.

### R5 — *(verificado: NO es un problema — se deja constancia para evitar una falsa alarma)*
- **Ubicación:** `src/shell/header/BaseAppHeader.tsx` (69) vs `src/compositions/shell/StockFlowHeader.tsx`; `src/shell/sidebar/BaseAppSidebar.tsx` (67) vs `src/compositions/shell/StockFlowSidebar.tsx` (302).
- **Lo que parecía:** dos implementaciones de cabecera y dos de sidebar.
- **Lo que es en realidad:** un reparto correcto **primitivo → composición**. `StockFlowHeader.tsx:3,24,68` **usa** `BaseAppHeader`; `StockFlowSidebar` usa `BaseAppSidebar`. Ambos primitivos están vivos.
- **Recomendación:** mantener tal cual. El único residuo real en esta zona es el conmutador de tema duplicado (R4).

---

## 4. Redundancias

- **Barrels que exportan superficie muerta.** `elements/index.ts` exporta ~46 símbolos que nadie importa; `shell/index.ts` 9; `shell/header/index.ts` 4; `shell/menu/index.ts` 3. Un barrel que exporta todo lo que existe obliga a arrastrar código muerto. **Recomendación:** exportar solo lo consumido.
- **`stores/index.ts` duplica `shell/stores/index.ts`.** Dos rutas (`@/stores` y `@/shell`) al mismo store. **Evidencia:** ambos re-exportan `uiStore`, `UIStore`, `Theme`, `UIPreferences`. **Recomendación:** una sola ruta canónica.
- **`elements/common/index.ts` re-exporta componentes de `shell`** (`PageMeta`, `AppMetaProvider` de `@/shell/meta`; `ThemeToggleButton` de `@/shell/header/...`). Un barrel de *elements* no debería exponer *shell*. **Evidencia:** `elements/common/index.ts:1-2`. Además `PageMeta`/`AppMetaProvider` quedan accesibles por **dos** rutas.
- **`utils/index.ts` re-exporta `audioAlerts`** (`export * from "./audioAlerts"`), un módulo de dominio dentro de una carpeta genérica, y cuyo único símbolo (`playOrderAlert`) está muerto.
- **`cx()` duplica `cn()`.** `elements/dsl.ts` define `cx()` (join simple) mientras `utils/index.ts` define `cn()` (clsx + tailwind-merge, usado por 20 ficheros). `cx` no tiene **ni un solo call site**. **Evidencia:** `grep "\bcx("` fuera de `dsl.ts` → 0 resultados.
- **`Button` del barrel se usa, pero `ButtonProps`/`ButtonVariant`/`ButtonSize` exportados no.** Lo mismo con casi todos los `*Props`. Superficie de tipos innecesaria.

---

## 5. Estados, efectos y handlers innecesarios

Todo esto vive en `src/pages/NectoApp.tsx` (598 líneas) y es residuo directo de los módulos borrados.

### E1 — Tres estados que se escriben y **nunca se leen**
- **Ubicación:** `NectoApp.tsx:366-368` — `targetOrderId`, `targetModal`, `targetProductId`
- **Problema:** los consumía la vista de Pedidos. Hoy `handleNavigateFromNotification` (líneas 412-430) los rellena y **nada los renderiza**.
- **Evidencia:** los tres estados solo aparecen en su declaración y en las asignaciones dentro de `handleNavigateFromNotification`; no hay lectura en el JSX (que solo renderiza `EmptyModulesHubView`).
- **Recomendación:** eliminar los tres estados, la lógica asociada y el `setTimeout(..., 20)` de la línea 425 (que existe únicamente para dejar "aterrizar" esos estados).

### E2 — Cuatro estados de navegación que solo alimentan la URL y los mapas de etiquetas
- **Ubicación:** `NectoApp.tsx:240-257` — `pedidosSection`, `pedidosOpTab`, `pedidosGeTab`, `inventarioTab`
- **Problema:** no hay vista detrás. `MODULES_WITH_VIEWS = []` (línea 487) ya declara explícitamente que ningún módulo tiene vista.
- **Recomendación:** conservar **solo** si se va a implementar el módulo (es el punto de extensión documentado). Si no, eliminar junto con B7.

### E3 — Efectos que sincronizan estado hacia ninguna parte
- **Ubicación:** `NectoApp.tsx:260-275` (redirección inteligente de módulo), `:308-344` (sincronización desde `searchParams`), `:346-359` (suscripciones a `eventBus`)
- **Problema:** el efecto de sincronización escribe `setActiveModule`/`setPedidosSection`/`setInventarioTab` que nadie consume visualmente. Las suscripciones escuchan `necto_navigate_pedidos` y `necto_open_settings`; la segunda **sí** sirve (abre el modal de configuración), la primera navega a un módulo inexistente.
- **Evidencia:** el propio fichero documenta el problema en las líneas 481-486 (*"there is no view behind them"*).
- **Recomendación:** conservar `necto_open_settings`; el resto, condicionar a la llegada de la vista.

### E4 — Handlers parcialmente muertos
- **Ubicación:** `NectoApp.tsx:277-288` `handleNavigatePedidos`, `:290-294` `handleNavigateInventario`, `:412-430` `handleNavigateFromNotification`
- **Problema:** `handleNavigatePedidos`/`handleNavigateInventario` se siguen usando (los llama `EmptyModulesHubView.onNavigateToModule`), pero su único efecto observable es cambiar la URL. `handleNavigateFromNotification` es enteramente residuo.
- **Recomendación:** conservar los dos primeros como punto de extensión; eliminar el tercero.

### E5 — Notificaciones hardcodeadas
- **Ubicación:** `NectoApp.tsx:370-410`
- **Problema:** tres notificaciones de ejemplo con `module: "pedidos"`, `pedidosSection`, `targetOrderId: "PED-1025"`… Son datos del módulo borrado.
- **Recomendación:** vaciar el array o conectarlo a datos reales; hoy son datos ficticios que además arrastran el tipo `NotificationItem` (líneas 50-65) con `module`, `pedidosSection`, `targetModal`, `inventariosSubView?: any`.

### E6 — Import sin usar que revela un toggle duplicado
- **Ubicación:** `OnboardingPage.tsx:17` (`ThemeToggleButton`) — ver R4.

---

## 6. Componentes o funciones sin consumidores

Consolidado de D1 + D2 + D7. Los bloques mayores:

| Componente / función | Ubicación | Líneas |
| --- | --- | --- |
| `RolesPermisosView` | `compositions/shared/security/` | 865 |
| `List` | `elements/ui/list/` | 553 |
| `MultiSelect` | `elements/form/multi-select/` | 303 |
| `Notification` | `elements/ui/notification/` | 441 |
| `Alert` | `elements/ui/alert/` | 347 |
| `ButtonsGroup` | `elements/ui/buttons-group/` | 245 |
| `Modal` | `elements/ui/modal/` | 231 |
| `Switch` | `elements/form/switch/` | 198 |
| `DatePicker` | `elements/form/date-picker/` | 203 |
| `Checkbox`, `Input`, `Label` | `elements/form/*` | 243+219+85 |
| `Table` (+4 partes) | `elements/ui/table/` | 222 |
| `NotificationDropdown`, `UserDropdown` | `shell/header/` | 257 |
| `SegmentedControl`, `SearchInput` | `elements/` | 173 |
| `MenuSubmenuItem`, `MenuSectionHeader`, `MenuBadge` | `shell/menu/` | 148 |
| `useIsMobile` | `hooks/` | 76 |
| `playOrderAlert` | `utils/audioAlerts.ts` | 132 |
| `INITIAL_ROLES`, `getBusinessSemantics`, `getDefaultRolesForArchetype` | `context/BusinessContext.tsx` | — |
| `NectoIsotype` | `compositions/shared/NectoLogo.tsx` | — |
| ~51 iconos de `icons/index.ts` | `icons/` | — |

- **Evidencia:** `audit-reachability.mjs` + `grep` puntual por cada uno.

---

## 7. Imports y dependencias sin uso

### I1 — 80 imports sin usar en 13 ficheros

`tsconfig.app.json` tiene `noUnusedLocals: false` y `noUnusedParameters: false`, por eso `tsc` no los reporta. Los detecté analizando el cuerpo de cada fichero.

| Fichero | Imports sin usar |
| --- | --- |
| `pages/NectoApp.tsx` | **~40** (todas las iconos de `lucide-react` de las líneas 4-23, `useNavigate`, `useAuth`, `ThemeToggle`, `NectoLogo`, `NectoSidebarLogo`, `BusinessSwitcher`, `UserProfileDropdown`, `GlobalSearchButton`) |
| `compositions/workspace/AccountSettingsModal.tsx` | 7 (`Mail`, `MapPin`, `Briefcase`, `FileText`, `Building2`, `Sparkles`, `Badge`) |
| `compositions/workspace/BusinessSettingsModal.tsx` | 6 (`Volume2`, `MapPin`, `Calendar`, `ListChecks`, `Share2`, `Button`) |
| `compositions/workspace/BusinessSwitcher.tsx` | 6 (`LayoutGrid`, `Building2`, `ShieldCheck`, `Clock`, `Zap`, `Flame`) |
| `compositions/shared/security/RolesPermisosView.tsx` | 5 (`Shield`, `CheckCircle2`, `XCircle`, `ChevronRight`, `Lock`) |
| `pages/FranchiseAnalyticsPage.tsx` | 3 (`TrendingUp`, `Building2`, `Sparkles`) |
| `compositions/workspace/ModuleActivationModal.tsx` | 3 (`AlertCircle`, `Building`, `Layers`) |
| `pages/OnboardingPage.tsx` | 3 (`ThemeToggleButton`, `MapPin`, `CheckCircle2`) |
| `compositions/catalog/context/CatalogContext.tsx` | 1 (`eventBus`) |
| `compositions/channels/context/ChannelsContext.tsx` | 2 (`OrderChannel`, `playNewOrderSound`) |
| `pages/WorkspacesPage.tsx` | 1 (`React` — innecesario con `jsx: react-jsx`) |
| `elements/common/InteractiveDotGrid.tsx` | 1 (`React` — ídem) |

- **Evidencia:** `.workbuddy-ai/audit-unused.mjs`. Verifiqué manualmente `NectoApp.tsx`: cada símbolo aparece **solo** en su línea de import (`grep -n "\bHome\b"` → únicamente la línea 5).

### I2 — Dependencia npm huérfana
- `recharts` — ver D6.

---

## 8. Lógica repetida entre módulos

### M1 — `catalog/` y `channels/` son stubs que duplican estado que ya vive en `BusinessContext`
- **Ubicación:** `compositions/catalog/context/CatalogContext.tsx` (134) y `compositions/channels/context/ChannelsContext.tsx` (481)
- **Problema:** son los dos únicos ficheros que quedan de los dominios que `c52c103` extrajo *desde* `PedidosContext`. Siguen importando la capa de datos borrada y **duplican conceptos que ya están en el contexto de negocio**.
- **Evidencia:**
  - `ChannelsContext.tsx` gestiona canales, pero `BusinessContext.tsx:374` ya tiene `channels: BusinessChannelConfig` — dos fuentes para el mismo concepto.
  - Imports rotos: `../../pedidos/mockData` (×2), `../../pedidos/adapters/productAdapter`, `../../pedidos/utils/soundEffects` → 4 × `TS2307`.
  - Cero consumidores (D1).
- **Recomendación:** decidir explícitamente — **borrar** o **reconstruir dentro del módulo**. No dejarlos como están. *(Nota: en la conversación previa quedó pendiente esta decisión; la auditoría confirma que no tienen consumidores ni forma de compilar.)*

### M2 — Los contratos duplican tipos de `BusinessContext`
- **Ubicación:** `src/contracts/*.ts` (4 ficheros, 212 líneas)
- **Problema:** `channel.contract.ts` define `Conversation`, `ChatMessage`… que se solapan conceptualmente con `BusinessChannelConfig`/`WhatsAppBotConfig` de `BusinessContext`. Es la misma duplicación que M1 pero en tipos.
- **Evidencia:** `catalog.contract.ts` y `channel.contract.ts` solo los usan los stubs muertos; `contracts/index.ts` también.
- **Recomendación:** eliminar los 3 y quedarse solo con `events.contract.ts` (ver L2).

---

## 9. Responsabilidades mal ubicadas

### U1 — `NectoApp.tsx` es un componente-dios (598 líneas)
Concentra: routing de módulos, derivación del breadcrumb, 3 mapas de etiquetas (`pedidosOpPageNames`, `pedidosGePageNames`, `sectionRoleNames`), datos de notificaciones, suscripciones a `eventBus`, composición del layout, y 4 tipos de dominio exportados (`PedidosSection`, `OperacionTab`, `GestionTab`, `InventoryTab`).
- **Recomendación:** extraer a `hooks/useModuleRouting.ts`, `config/breadcrumbs.ts` y mover los tipos a un `types/modules.ts`.

### U2 — `BusinessContext.tsx` es un módulo-dios (1.473 líneas)
Mezcla: definición de tipos de dominio, **datos semilla** (`DEFAULT_BUSINESS`, el otro seed en :1098-1140), roles por arquetipo, semántica de negocio, y **preferencias de UI que no son de negocio** (`storePace`, `setStorePace`, `userAvatarUrl`, `setUserAvatarUrl`, `isCommandPaletteOpen`, `setIsCommandPaletteOpen` — líneas ~1089-1093).
- **Problema:** `isCommandPaletteOpen` en el contexto de negocio es una responsabilidad de UI. Los seeds hardcodeados con URLs de Unsplash tampoco son "contexto".
- **Recomendación:** partir en `BusinessProvider` (dominio) + `seed/businesses.ts` (datos) + mover el estado de UI a `uiStore` (que ya existe y es la fuente única de verdad del tema).

### U3 — `RolesPermisosView` está en `compositions/shared/security/` pero es una página completa (865 líneas)
- **Recomendación:** si sobrevive, va en `pages/`. Hoy es candidato a borrado (D1).

### U4 — `elements/common/index.ts` expone componentes de `shell`
- Ver R3 (redundancia). Es a la vez un problema de capas: `elements` es la capa más baja y no debería depender de `shell`.
- **Evidencia:** `elements/common/index.ts:1-2`.

### U5 — `eventBus.ts` está tipado con los contratos del módulo borrado
- **Ubicación:** `src/infrastructure/eventBus.ts:1`
- **Problema:** el bus de eventos de **toda la aplicación** depende de `../contracts/events.contract`, que a su vez depende de `./order.contract` (`Pedido`, `DraftOrder`, `OrderType`…). Es decir: la infraestructura genérica arrastra el vocabulario del módulo eliminado.
- **Recomendación:** desacoplar el bus de los tipos de dominio (genérico) o mover los eventos de pedidos al módulo.

### U6 — `utils/audioAlerts.ts` mete lógica de dominio en una carpeta genérica
- **Ubicación:** `src/utils/audioAlerts.ts` (132 líneas, `playOrderAlert`)
- **Problema:** "alertas de pedido" no es una utilidad genérica, y `utils/index.ts` la re-exporta hacia todo el proyecto. Está muerta.

---

## 10. Código legado de implementaciones anteriores

### L1 — Tipos y mapas de etiquetas del módulo Pedidos dentro del shell
- **Ubicación:** `NectoApp.tsx:25-28` (los 4 tipos), `:50-65` (`NotificationItem` con `module`, `pedidosSection`, `targetModal`, `inventariosSubView?: any`), `:433-479` (los 3 mapas + `currentRoleName`/`currentPageName`)
- **Problema:** `currentRoleName` **ya estaba muerto** antes de esta auditoría (definido y nunca usado); los mapas tienen claves que no existen en sus propios tipos (B7).
- **Recomendación:** eliminar los mapas y `currentPageName`; conservar los tipos solo si se implementa el módulo.

### L2 — `contracts/order.contract.ts`: 71 líneas del dominio borrado
- **Ubicación:** `src/contracts/order.contract.ts`
- **Problema:** define `Pedido`, `DraftOrder`, `OrderType`, `UrgencyLevel`, `AIConfidence`, `PaymentStatus`, `ReturnStatus`, `OrderEvent`, `OrderDomainEvent` — todo el vocabulario de Pedidos. Sobrevive **únicamente** porque `events.contract.ts` reutiliza `OrderChannel`/`OrderItem`/`OrderStatus` para tipar el bus (L2 → U5).
- **Evidencia:** `grep "order.contract"` → solo `channel.contract.ts:6` y `events.contract.ts:7` (el primero está muerto).
- **Recomendación:** al desacoplar el bus (U5), este fichero queda huérfano y se puede borrar.

### L3 — CSS autodeclarado como legado
- `css/legacy.css:1-10`: *"Legacy CSS — Plain CSS rules pending migration… Should eventually be… Eliminated if no longer needed."* No está importado (D5).
- `css/vendors.css:1-8`: overrides para Swiper/FullCalendar, **librerías que no existen en el proyecto** (D5).

### L4 — Componentes con nombres y comentarios del template de origen (TailAdmin / Repo-prueba-master)
- **Ubicación:** `NectoApp.tsx:170-211` — `TailAdminBreadcrumb` (exportado, sin consumidores: aparece en los símbolos muertos); `elements/index.ts:2` — *"Barrel de la capa Elements puro (basado en Repo-prueba-master)"*.
- **Problema:** el árbol `elements/ui/*` y `shell/*` es el del template, del que solo se usa una fracción (D2).
- **Recomendación:** borrar `TailAdminBreadcrumb` y los componentes del template sin uso; actualizar el comentario del barrel.

### L5 — Infraestructura de Pedidos/Inventarios aún "viva" en la nube
- **Ubicación:** `packages/cloud/core/infra/factories/parameters.ts:36-54`
- **Problema:** `Params.InventariosConfig` y `Params.PedidosConfig` crean parámetros SSM `/inventarios-config` y `/pedidos-config`. Están **definidos y nunca llamados** (`app.ts` solo llama a `ProjectInfo` y `AuthConfig`), pero el proyecto **todavía anuncia el alcance borrado**:
  - `parameters.ts:15` → `platform: 'Enterprise Inventory & Orders Management'`
  - `packages/services/api/infra/app.ts:9-15` → docstring *"Provisions: DynamoDB Tables (**Pedidos & Inventarios**)"*
- **Recomendación:** eliminar las dos funciones no llamadas y actualizar ambos textos. Es deuda de documentación con impacto real: describe un producto que ya no existe.

### L6 — El sidebar anterior (`shell/menu/*`, `shell/header/*`)
- `MenuBadge`, `MenuSectionHeader`, `MenuSubmenuItem`, `NotificationDropdown`, `UserDropdown`, `ToggleAppSidebar` — todos sin consumidor (D2). El shell actual usa `compositions/shell/StockFlow*`.
- **Excepción:** `MenuItem` y `BaseAppSidebar` **sí** están vivos (los usa `StockFlowSidebar`).

---

## 11. Abstracciones innecesarias

### A1 — El sistema `ui_dsl` (`elements/dsl.ts`, 148 líneas)
- **Problema:** define un "Design DSL" que inyecta `data-node-id` y `data-intent` en cada nodo "para trazabilidad, testing y razonamiento". El propio encabezado admite: *"esto NO es una API de WebiAI… es una utilidad propia de este proyecto que formaliza… los conceptos del checklist"*.
- **Evidencia:** sus 10 consumidores son `elements/{Badge,Button,Card,Field,SearchInput,SegmentedControl,Select,Textarea,Toggle}.tsx` — y **5 de esos 9 están muertos** (R1). `cx()` que exporta no tiene ningún call site. Los `data-node-id`/`data-intent` no los consume nadie (no hay telemetría ni tests que los lean).
- **Recomendación:** evaluar en serio su eliminación. Si no hay un consumidor real de `data-intent`, es una capa de indirección que cuesta ~150 líneas + 9 ficheros que la usan, sin beneficio observable. Es exactamente el tipo de abstracción que se introduce "para el checklist" y luego nadie usa.

### A2 — `contracts/` (4 ficheros, 212 líneas)
- 3 de 4 sin consumidores reales (M2). Un contrato sin consumidor no es un contrato.
- **Recomendación:** quedarse con `events.contract.ts` (o desacoplarlo, U5) y borrar el resto.

### A3 — Barrels que existen para "reexportar todo"
- `elements/index.ts`, `shell/index.ts`, `shell/header/index.ts`, `shell/menu/index.ts`, `stores/index.ts`, `elements/common/index.ts`, `shell/sidebar/index.ts`, `elements/form/*/index.ts`, `elements/ui/*/index.ts`.
- **Problema:** hay ficheros `index.ts` de 3 líneas que solo hacen `export { default as X } from "./X"` (p. ej. `elements/form/switch/index.ts`, `elements/form/date-picker/index.ts`). Y hay `index.ts` que declaran **ambos** el named y el default (`pages/auth/sign-in/index.ts`: `export { default as SignInForm }` + `export { default }`), lo que duplica la superficie.
- **Recomendación:** no eliminar los barrels por sistema, pero sí recortar sus exportaciones a lo consumido y borrar los barrels cuyos ficheros desaparecen.

### A4 — *(corregido tras verificación: NO es un problema)*
- **Ubicación:** `elements/form/common/types.ts` (75 líneas, `FormFieldProps`) + `index.ts` (2 líneas)
- **Lo que parecía:** una abstracción sin consumidores.
- **Lo que es en realidad:** `FormFieldProps` es la base de la que **extienden** los tres componentes de formulario vivos —
  `Select.tsx:20` (`SelectProps extends FormFieldProps`), `Textarea.tsx:9` y `Input.tsx:10`, importándolo desde
  `@/elements/form/common`. Es la abstracción **correcta y compartida**, no deuda.
- **Verificación:** `grep -rn "FormFieldProps"` → 8 referencias, tres de ellas en ficheros vivos.
- **Recomendación:** mantener. (Lo dejo escrito porque mi primera lectura lo marcó como muerto: el import es
  `import type`, y una comprobación de imports que ignore los type-only lo pierde.)

---

## 12. Archivos que pueden eliminarse sin afectar funcionalidad

**Verificado con alcanzabilidad a nivel de símbolo + `grep` puntual. Nada de esta lista tiene consumidor.**

### Grupo A — Sin riesgo (código aislado, cero consumidores): 25 ficheros, ~3.447 líneas

```
src/compositions/shared/security/RolesPermisosView.tsx        (865)
src/elements/ui/list/List.tsx                                  (553)
src/elements/ui/list/index.ts                                  (11)
src/compositions/channels/context/ChannelsContext.tsx          (481)  ← decidir antes (M1)
src/elements/form/multi-select/MultiSelect.tsx                 (303)
src/elements/form/multi-select/index.ts                        (3)
src/elements/form/date-picker/DatePicker.tsx                   (203)
src/elements/form/date-picker/index.ts                         (3)
src/api/mockProducts.ts                                        (139)
src/compositions/catalog/context/CatalogContext.tsx            (134)  ← decidir antes (M1)
src/api/products.ts                                            (71)
src/api/client.ts                                              (50)
src/elements/Select.tsx                                        (86)
src/elements/Textarea.tsx                                      (73)
src/elements/Button.tsx                                        (45)
src/elements/Badge.tsx                                         (41)
src/elements/Card.tsx                                          (36)
src/elements/common/ChartTab.tsx                               (46)
src/elements/common/CountdownTimer.tsx                         (73)
src/elements/common/GridShape.tsx                              (25)
src/elements/common/index.ts                                   (7)
src/contracts/catalog.contract.ts                              (63)
src/contracts/channel.contract.ts                              (77)
src/contracts/index.ts                                         (5)
src/hooks/useIsMobile.ts                                       (76)
```

### Grupo B — Solo vivos por un barrel, exports sin usar: 27 ficheros, ~2.402 líneas

`elements/ui/{notification,alert,buttons-group,modal,table}/**`, `elements/form/switch/**`, `elements/ui/card/Card{Body,Description,Footer,Header,Title}.tsx`, `elements/{SearchInput,SegmentedControl}.tsx`, `shell/header/{NotificationDropdown,UserDropdown}.tsx`, `shell/menu/{MenuSubmenuItem,MenuSectionHeader}.tsx` — detalle en D2.

### Grupo C — CSS muerto: 2 ficheros, 267 líneas
```
src/css/legacy.css   (58)   — 0 importadores
src/css/vendors.css  (209)  — 0 importadores + Swiper/FullCalendar no instalados
```

### Grupo D — Infra huérfana: 7 ficheros, ~521 líneas
```
packages/cloud/core/infra/factories/pedidos.ts        (60)
packages/cloud/core/infra/factories/inventarios.ts    (59)
packages/cloud/core/infra/handlers/pedidos.ts         (123)
packages/cloud/core/infra/handlers/inventarios.ts     (105)
packages/services/api/infra/factories/api-gateway.ts  (?)  ← decidir cableado (D4)
packages/services/api/infra/factories/compute.ts      (?)  ← mantiene vivos health/encuesta
packages/services/api/infra/factories/database.ts     (?)
```

**Total estimado: ~6.640 líneas** (~29 % de las 22.773 de `app/src`, más la infra).

> ⚠️ **No borrar:** `src/vite-env.d.ts`. Aparece como "inalcanzable" porque es un fichero de declaraciones globales, no un módulo con importadores. Es un falso positivo del análisis.

---

## 13. Orden de ataque sugerido

| # | Acción | Riesgo | Ganancia |
| --- | --- | --- | --- |
| 1 | **B9** — declarar `*.svg?react` en `vite-env.d.ts` | Muy bajo | `tsc` 90 → ~28 errores; desbloquea ver el resto |
| 2 | **B1, B2, B4** — arreglar los 3 bugs de runtime | Bajo | Elimina 2 `TypeError` y un modal con pestaña basura |
| 3 | **I1** — quitar los 80 imports sin usar | Muy bajo | Ruido fuera; hace visible el código real |
| 4 | **Grupo A + C** — borrar código y CSS muertos | Bajo (verificado) | ~3.700 líneas |
| 5 | **D3, D4, L5** — limpiar infra de módulos borrados | Medio (toca despliegue) | ~520 líneas + coherencia del producto |
| 6 | **B3, B6, B7** — corregir los errores de tipos restantes | Bajo | `tsc` limpio salvo preexistentes |
| 7 | **D2** — borrar la superficie de componentes del template | Medio (revisar cada uno) | ~2.400 líneas |
| 8 | **M1 / A1 / A2 / U1 / U2** — decisiones de arquitectura | Alto | La deuda de fondo: barrels, DSL, contratos, componentes-dios |

**Decisiones que necesitan tu criterio antes de tocar nada:**

1. **`catalog/` y `channels/`** (M1): ¿se borran o se reconstruyen dentro del módulo? Bloquean ~615 líneas del Grupo A.
2. **`ui_dsl`** (A1): ¿hay un consumidor real de `data-intent`/`data-node-id` (telemetría, tests E2E)? Si no lo hay, sobra toda la abstracción.
3. **`services/api` factorías** (D4): ¿se cablean en `app.ts` o se borran? Si se borran, hay que decidir el destino de `functions/health.ts` y `functions/encuesta.ts`.
4. **El módulo Pedidos/Inventario**: ¿vuelve? Determina si el Grupo E de `NectoApp` (estados, mapas, tipos) se conserva como punto de extensión o se elimina.
