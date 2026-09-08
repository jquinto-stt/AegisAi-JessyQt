# MANUAL — IMPLEMENTACIÓN DE ELEMENTS (FRONTEND)

Cómo **creamos y aplicamos** la capa Elements en el frontend del proyecto (React +
Vite + TypeScript + Tailwind v4). Es la guía de trabajo diario para un desarrollador
del equipo.

> **Alcance.** Este manual es sobre **implementación en el código**. Para instalar el
> entorno (npm/registry/auth/WebiAI CLI) ver `manual_implementacion_elements_kiro_webiai.md`.

---

## Índice

1. [Qué es la capa Elements](#1-qué-es-la-capa-elements)
2. [Anatomía de un Element (contrato de `ui_dsl`)](#2-anatomía-de-un-element-contrato-de-ui_dsl)
3. [Cómo crear un Element nuevo](#3-cómo-crear-un-element-nuevo)
4. [Los dos patrones: `ui_dsl` vs función genérica / `forwardRef`](#4-los-dos-patrones-ui_dsl-vs-función-genérica--forwardref)
5. [Cómo aplicar un Element en una vista](#5-cómo-aplicar-un-element-en-una-vista)
6. [Regla de adopción: qué migrar y qué dejar nativo](#6-regla-de-adopción-qué-migrar-y-qué-dejar-nativo)
7. [Registrar el Element en el barrel](#7-registrar-el-element-en-el-barrel)
8. [Verificación](#8-verificación)
9. [Errores comunes](#9-errores-comunes)
10. [Checklist](#10-checklist)

---

## 1. Qué es la capa Elements

**Elements** es un **patrón arquitectónico propio de este proyecto**, construido sobre
React + Tailwind. **No es un SDK ni una API de WebiAI.** Vive en:

```text
packages/apps/web/modules/app/src/elements/
```

Cada Element es un componente UI atómico y reutilizable que **siempre emite dos
atributos de trazabilidad** en su nodo raíz:

- `data-node-id` → identificador estable del nodo (ej. `necto.el.button`).
- `data-intent` → propósito de ese nodo/acción (ej. `catalog.product.create.submit`).

Esto permite localizar cualquier control en el DOM y en el bundle para telemetría,
testing y trazabilidad.

Elements actuales: `Button`, `Card`, `Badge`, `Field`, `Select`, `Textarea`, `Toggle`,
`SegmentedControl`, `SearchInput`.

---

## 2. Anatomía de un Element (contrato de `ui_dsl`)

La mayoría de Elements se declaran con el helper `ui_dsl()` (en `src/elements/dsl.ts`).
El contrato:

```ts
ui_dsl<Props>({
  nodeId: 'necto.el.<nombre>',   // Node ID base y estable
  intent: ['<intent.por.defecto>'], // intent por defecto (sobreescribible por instancia)
  base: '<clases Tailwind siempre presentes>',
  variants: {                    // variantes visuales tipadas (opcional)
    primary: '<clases>',
    // la PRIMERA clave declarada es la variante por defecto
  },
  render: ({ nodeId, intent, className, props, children }) => (
    <tag data-node-id={nodeId} data-intent={intent} className={className} {...props}>
      {children}
    </tag>
  ),
});
```

Qué resuelve `ui_dsl` por ti:

1. **Node ID** con sufijo de variante (`necto.el.button.primary`).
2. **Intent efectivo** (el de la instancia o el declarado por defecto).
3. **className final** = `base` + variante seleccionada + `className` de la instancia
   (en ese orden — el de la instancia se concatena al final y puede sobreescribir).
4. Entrega todo resuelto a `render()`.

Props base que gestiona (`ElementBaseProps`): `intent`, `className`, `variant`, `children`.

---

## 3. Cómo crear un Element nuevo

Ejemplo real: así está hecho `Badge` (`src/elements/Badge.tsx`).

**Paso 1 — define las props** (extiende `ElementBaseProps` + los atributos del tag):

```tsx
import type { HTMLAttributes } from 'react';
import { ui_dsl, type ElementBaseProps } from './dsl';

export interface BadgeProps
  extends ElementBaseProps,
    Omit<HTMLAttributes<HTMLSpanElement>, 'className' | 'children'> {
  variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}
```

**Paso 2 — declara el Element con `ui_dsl`:**

```tsx
export const Badge = ui_dsl<BadgeProps>({
  nodeId: 'necto.el.badge',
  intent: ['status.label'],
  base: 'inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border',
  variants: {
    neutral: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 ...',
    accent:  'bg-[#FF3F1A]/10 text-[#FF3F1A] border-[#FF3F1A]/30',
    success: 'bg-emerald-50 ...',
    warning: 'bg-amber-100 ...',
    danger:  'bg-red-50 ...',
  },
  render: ({ nodeId, intent, className, props, children }) => (
    <span data-node-id={nodeId} data-intent={intent} className={className} {...props}>
      {children}
    </span>
  ),
});
```

**Paso 3 — regístralo en el barrel** (ver sección 7).

**Convenciones:**
- `nodeId`: `necto.el.<nombre>` en minúsculas.
- `intent` por defecto: describe el propósito genérico (`status.label`, `action.generic`,
  `input.text`…). Se puede sobreescribir por instancia.
- La primera variante declarada es la default.

---

## 4. Los dos patrones: `ui_dsl` vs función genérica / `forwardRef`

No todos los Elements pueden usar `ui_dsl`. Hay **dos casos** en los que se declara como
función normal, **manteniendo la convención** (`data-node-id` + `data-intent`):

### Caso A — tipos genéricos literales → función genérica

`SegmentedControl` necesita que el tipo de `value`/`onValueChange` sea el literal unión
(ej. `"overview" | "sales" | "revenue"`), no `string`. `ui_dsl` fijaría `V = string` y
rompería el tipado. Por eso es una **función genérica**:

```tsx
export function SegmentedControl<V extends string = string>({
  options, value, onValueChange, tone = 'contrast', intent = 'input.segmented', className = '',
}: SegmentedControlProps<V>) {
  // ... emite data-node-id="necto.el.segmented" y data-state="active|inactive" por opción
}
```

> **Por qué importa:** si lo hubiéramos hecho con `ui_dsl`, `tsc` fallaba con TS2322 al
> pasar un `setState` tipado con unión literal. Lo detecta `tsc`, **no** el editor.

### Caso B — necesita `ref` → `forwardRef`

`SearchInput` expone el `ref` del `<input>` para foco programático / atajos (Ctrl+K en
la Bandeja). Por eso usa `forwardRef`:

```tsx
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput({ value, onChange, onClear, intent = 'input.search', className = '', shortcut, ...rest }, ref) {
    return (
      <div data-node-id="necto.el.search" data-intent={intent} className={`relative flex items-center ${className}`}>
        <input ref={ref} data-node-id="necto.el.search.input" data-intent={`${intent}.control`} ... />
        {/* botón clear condicional + kbd de atajo */}
      </div>
    );
  },
);
```

### Cuál usar

| Situación | Patrón |
|---|---|
| Componente estándar (span, button, input simple, div) | `ui_dsl` |
| El tipo de un prop debe ser una unión literal genérica | función genérica |
| Necesita exponer `ref` (focus, medición, atajos) | `forwardRef` |

---

## 5. Cómo aplicar un Element en una vista

**Importa siempre desde el barrel `@/elements`:**

```tsx
import { Button, Field, Select, Textarea, Badge, Card, SearchInput, SegmentedControl } from "@/elements";
```

**Ejemplos reales del proyecto:**

```tsx
// Acción (Button) con variante e intent específico
<Button variant="accent" intent="pedidos.order.confirm" onClick={() => confirmOrder(o.id)}>
  Confirmar
</Button>

// Campo de formulario (Field)
<Field label="Nombre del Cliente *" labelStyle="bold" intent="pedidos.manual.customer"
  value={name} onChange={e => setName(e.target.value)} />

// Conmutador de vista (SegmentedControl) — el genérico infiere el tipo de value
<SegmentedControl
  intent="pedidos.view" tone="contrast"
  value={viewMode} onValueChange={setViewMode}
  options={[
    { value: "kanban", label: "Tablero", icon: <Kanban className="w-3.5 h-3.5" /> },
    { value: "grid",   label: "Lista",   icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  ]} />

// Búsqueda con ref para atajo (SearchInput)
<SearchInput ref={searchInputRef} intent="pedidos.search"
  value={query} onChange={e => setQuery(e.target.value)} onClear={() => setQuery("")}
  placeholder="Buscar por ID, cliente..." />
```

**Reglas al aplicar:**

- **`className` se concatena a la base**, no la reemplaza. Puedes ajustar padding, ancho,
  colores por instancia. Ej.: `<Button className="w-full py-1.5 px-3 text-xs">`.
- **Botones de icono cuadrados/circulares:** antepón `p-0` para neutralizar el padding
  base (`<Button className="w-9 h-9 p-0" ...>`).
- **Botones con contenido a la izquierda (`text-left`):** añade `justify-start` (la base
  del Button es `justify-center`).
- **Intent descriptivo por instancia:** usa punto-notación con el propósito real
  (`catalog.product.edit.save`, `conversation.take-control`).

---

## 6. Regla de adopción: qué migrar y qué dejar nativo

No todo control nativo debe convertirse en Element. **Migrar por migrar mete deuda
visual.** Esta es la regla que seguimos:

### ✅ Migrar a Element (mapea limpio)
- Botones de acción → `Button` (variantes primary/accent/outline/ghost).
- Inputs de texto de formulario estándar → `Field`.
- `<select>` estándar → `Select`.
- `<textarea>` estándar → `Textarea`.
- Estados/etiquetas → `Badge`. Contenedores → `Card`.
- Tabs/pills/conmutadores → `SegmentedControl`. Búsquedas → `SearchInput`. Switches → `Toggle`.

### ❌ Dejar como HTML nativo (migrar rompería el diseño o no aplica)
- **Primitivas internas** de `src/elements/` (un `Button` se construye con un `<button>`
  real; migrarlas sería circular).
- **Pantallas de autenticación** (`Login`, `Register`): usan CSS propio.
- `<input type="date | datetime-local | file | color">` → el Element no cubre esos widgets.
- `<input type="checkbox | radio">` → no hay equivalente en la capa.
- **Inputs con icono absoluto** adyacente (Search/Phone/MapPin posicionados) o con
  prefijo/sufijo (ej. `necto.app/`): el `Field` fuerza su propio layout.
- **`<select>` con chevron propio** (envuelto en `relative` + icono absoluto): el `Select`
  es `appearance-none` y perdería el ícono.
- **Controles inline sin label** en filas compactas (el label del `Field`/`Textarea`
  rompería el grid).
- **Triggers propios** con contrato establecido (ThemeToggle, GlobalSearchButton, AIBadge).

> Regla práctica: **si dudas si romperá el layout, déjalo nativo.** La coherencia visual
> vale más que un punto porcentual de adopción.

### Medir la adopción

```bash
# desde packages/apps/web/modules/app
EL=$(grep -rho -E "<(Button|Card|Badge|Field|Select|Textarea|Toggle|SegmentedControl|SearchInput)\b" src --include="*.tsx" | wc -l)
NAT=$(grep -rho -E "<(button|input|select|textarea)\b" src --include="*.tsx" | wc -l)
awk "BEGIN{printf \"Adopción: %.1f%% (%d Elements / %d total)\n\", ($EL/($EL+$NAT))*100, $EL, $EL+$NAT}"
```

Referencia actual del proyecto: **~86%** (el resto son los casos nativos legítimos de arriba).

---

## 7. Registrar el Element en el barrel

Todo Element nuevo se exporta desde `src/elements/index.ts` para poder importarlo con
`@/elements`:

```ts
export { Badge } from './Badge';
export type { BadgeProps } from './Badge';
```

> El barrel exporta **solo los Elements** (y sus tipos). `ui_dsl`/`cx` se importan
> directo desde `./dsl` dentro de los propios archivos de la capa, no desde el barrel.

---

## 8. Verificación

Después de crear o aplicar Elements, verifica **siempre** (desde
`packages/apps/web/modules/app`):

```bash
# 1) Tipos — detecta el error del genérico que el editor NO ve
npx tsc -p tsconfig.app.json --noEmit        # → EXIT 0

# 2) Build
npm run build                                # → ✓ built

# 3) El Element emite su trazabilidad en el bundle
grep -o "necto\.el\.badge" dist/assets/index-*.js   # → debe encontrarlo

# 4) Dev server
npm run dev                                  # → HTTP 200 en las rutas
```

---

## 9. Errores comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `TS2322` al pasar un `setState` con unión literal a un Element | El Element se declaró con `ui_dsl` fijando `V=string` | Reescríbelo como **función genérica** (`<V extends string>`), como `SegmentedControl` |
| El editor no marca error pero `tsc` sí | El editor no siempre valida genéricos | Verifica SIEMPRE con `npx tsc -p tsconfig.app.json --noEmit` |
| Botón migrado queda con padding/tamaño raro | La base del `Button` (`px-4 py-2.5`) se suma | Añade `p-0` (icono) o el padding deseado en `className` |
| Botón `text-left` queda centrado | La base es `justify-center` | Añade `justify-start` en `className` |
| Se perdió un icono al migrar un `<select>` | El `Select` es `appearance-none` sin chevron | Déjalo nativo (ver sección 6) |
| El Element no aparece al importar de `@/elements` | No está exportado en el barrel | Añádelo a `src/elements/index.ts` (sección 7) |
| Imports de iconos sin usar tras migrar | Quedan colgados al reemplazar por Element | Quítalos; verifica con `tsc --noUnusedLocals` |

---

## 10. Checklist

**Al crear un Element:**

```text
[ ] Props extienden ElementBaseProps (o firma propia si es genérico/forwardRef)
[ ] nodeId = necto.el.<nombre>; intent por defecto declarado
[ ] Emite data-node-id y data-intent en el nodo raíz
[ ] Elegido el patrón correcto (ui_dsl / genérico / forwardRef)
[ ] Exportado en src/elements/index.ts
[ ] tsc --noEmit EXIT 0 + build OK
[ ] grep necto.el.<nombre> en dist/ lo encuentra
```

**Al aplicar Elements en una vista:**

```text
[ ] Import desde "@/elements"
[ ] variant + intent descriptivo por instancia
[ ] className solo ajusta lo necesario (p-0 en iconos, justify-start si text-left)
[ ] Lógica de negocio intacta (onClick/handlers/estado sin cambios)
[ ] Casos nativos legítimos dejados como están (sección 6)
[ ] tsc --noEmit EXIT 0 + build OK + dev 200
[ ] Imports sin uso eliminados (tsc --noUnusedLocals)
```

---

_Referencia de código real: `src/elements/{dsl,Button,Badge,Field,Select,Textarea,`
`Toggle,SegmentedControl,SearchInput}.tsx` y su uso en `src/compositions/`._
