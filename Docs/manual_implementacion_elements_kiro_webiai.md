# MANUAL — IMPLEMENTACIÓN DE ELEMENTS
### Kiro + WebiAI

> **Aviso de seguridad (leer primero).**
> Este manual **nunca** debe contener tokens de npm (`_authToken`), contraseñas ni credenciales.
> Si en algún log, captura o chat viste un token privado de npm, considéralo comprometido:
> **revócalo/rótalo** en el registry correspondiente. En todos los ejemplos, los tokens
> aparecen como `<REDACTED>` a propósito.

---

## Índice

1. [Objetivo](#1-objetivo)
2. [Requisitos previos](#2-requisitos-previos)
3. [Preparación de Kiro](#3-preparación-de-kiro)
4. [Inicio de sesión / autenticación](#4-inicio-de-sesión--autenticación)
5. [Configuración del registry WebiAI](#5-configuración-del-registry-webiai)
6. [Verificación del acceso al registry](#6-verificación-del-acceso-al-registry)
7. [Instalación de WebiAI CLI](#7-instalación-de-webiai-cli)
8. [Instalación de Elements](#8-instalación-de-elements)
9. [Configuración del proyecto frontend](#9-configuración-del-proyecto-frontend)
10. [Estructura recomendada](#10-estructura-recomendada)
11. [Implementación de Elements](#11-implementación-de-elements)
12. [Integración con la SPA](#12-integración-con-la-spa)
13. [Flujo de trabajo con Kiro](#13-flujo-de-trabajo-con-kiro)
14. [Problemas encontrados](#14-problemas-encontrados)
15. [Soluciones](#15-soluciones)
16. [Errores comunes](#16-errores-comunes)
17. [Puntos críticos a tener en cuenta](#17-puntos-críticos-a-tener-en-cuenta)
18. [Checklist de instalación](#18-checklist-de-instalación)
19. [Checklist de implementación](#19-checklist-de-implementación)
20. [Troubleshooting](#20-troubleshooting)

---

## 1. Objetivo

Dejar documentado, de principio a fin, cómo llevar un entorno **Kiro** desde cero
hasta tener disponible el tooling de **WebiAI** y la capa **Elements** del proyecto,
de forma **reutilizable** por cualquier desarrollador del equipo.

El manual sigue un principio no negociable:

> **No basta con "ejecute estos comandos".**
> Cada comando indica **qué debe devolver** y **cómo verificar** que salió bien
> antes de pasar al siguiente paso.

### Aclaración importante sobre el problema real

El problema que motivó este manual **no fue que Elements no existiera**. El paquete
`@webiai/sdk.cli` sí estaba publicado y accesible. El problema fue que estábamos
intentando **verificar/instalar desde un entorno Kiro que todavía no tenía resuelta
la autenticación al registry privado de WebiAI**.

```text
Windows
   │
   ├── npm autenticado
   ├── registry WebiAI accesible
   └── npm view @webiai/sdk.cli ✓

Kiro
   │
   ├── registry configurado ✓
   ├── autenticación inicialmente ausente ✗
   ├── npm whoami → ENEEDAUTH
   │
   └── iniciar sesión / autenticar Kiro
             ↓
        registry accesible ✓
             ↓
        instalar WebiAI ✓
             ↓
        instalar Elements ✓
```

**Que funcione en Windows NO significa que funcione en Kiro/Linux.** Son entornos
distintos, con `.npmrc` y credenciales distintas.

---

## 2. Requisitos previos

| Requisito | Verificación | Valor esperado (referencia de este proyecto) |
|---|---|---|
| Node.js ≥ 22 | `node --version` | `v22.x` (aquí `v22.23.2`) |
| npm ≥ 10 | `npm --version` | `10.x` (aquí `10.9.8`) |
| Acceso al registry privado WebiAI | ver secciones 5–6 | `https://npm.pkg.webiai.io/` |
| Credenciales/token del registry privado | provistas por el equipo | (nunca en el manual) |

**Cómo verificar:**

```bash
node --version   # debe imprimir v22.x o superior
npm --version    # debe imprimir 10.x o superior
```

Si `node` o `npm` no responden, detente y resuelve la instalación de Node antes de continuar.

---

## 3. Preparación de Kiro

En el entorno Kiro (contenedor Linux) la configuración de npm suele vivir en un
`.npmrc` a nivel de workspace, no en tu `$HOME` de Windows.

**Cómo verificar de qué `.npmrc` está leyendo npm:**

```bash
npm config list
```

Debe mostrar, entre otras cosas, la ruta del/los `.npmrc` en uso y las claves
configuradas. Presta atención a:

- `prefix` (dónde se instalan los paquetes globales).
- `@webiai:registry`.
- `registry`.

En este proyecto el `.npmrc` del workspace contiene (tokens redactados):

```ini
prefix=/workspaces/.npm-global
strict-ssl=true
//npm.pkg.github.com/:_authToken=<REDACTED>
//npm.pkg.webiai.io/:_authToken=<REDACTED>
@webiai:registry=https://npm.pkg.webiai.io
```

> **Nota del entorno Coder/Kiro:** el token de GitHub Packages suele inyectarse vía
> `GITHUB_TOKEN`. El token del registry WebiAI lo provee el equipo. **Nunca** lo
> escribas a mano en un manual ni lo subas a git.

**Cómo verificar dónde instala npm los binarios globales:**

```bash
npm root -g
```

Valor esperado en Kiro:

```text
/workspaces/.npm-global/lib/node_modules
```

Esto es clave para diagnosticar el error `webiai: command not found` (paquete
instalado pero binario fuera del `PATH`).

---

## 4. Inicio de sesión / autenticación

Este es **el paso donde falla la mayoría** y el corazón del problema documentado.

**Comando de verificación:**

```bash
npm whoami --registry=https://npm.pkg.webiai.io/
```

**Interpretación del resultado:**

| Resultado | Significado | Acción |
|---|---|---|
| Imprime tu usuario | Autenticación correcta | Continúa a la sección 5/6 |
| `npm error code ENEEDAUTH` | Kiro **no** está autenticado en el registry privado | **Detente y resuelve** antes de seguir |

Ejemplo real del fallo en Kiro:

```text
npm error code ENEEDAUTH
npm error need auth This command requires you to be logged in.
npm error need auth You need to authorize this machine using `npm adduser`
```

**Cómo resolver la autenticación (según cómo distribuya credenciales tu equipo):**

- **Opción A — token en `.npmrc` (recomendada en Kiro/CI):** añade la línea del
  token del registry privado al `.npmrc` del workspace:

  ```ini
  //npm.pkg.webiai.io/:_authToken=<TU_TOKEN>
  @webiai:registry=https://npm.pkg.webiai.io/
  ```

  > No pongas el token en el repo. En Kiro/Coder suele venir de una variable de
  > entorno o de SSM; en CI, de un secret.

- **Opción B — login interactivo:**

  ```bash
  npm login --registry=https://npm.pkg.webiai.io/
  ```

**Verifica de nuevo antes de continuar:**

```bash
npm whoami --registry=https://npm.pkg.webiai.io/
```

Solo cuando este comando devuelve tu usuario debes pasar al resto del proceso.

---

## 5. Configuración del registry WebiAI

La regla de oro:

```text
@webiai  →  https://npm.pkg.webiai.io/   (registry privado, SOLO el scope)
todo lo demás  →  https://registry.npmjs.org/  (registry público)
```

**Comandos:**

```bash
# Registry privado SOLO para el scope @webiai
npm config set @webiai:registry https://npm.pkg.webiai.io/

# Registry público para todo lo demás (react, vite, commander, etc.)
npm config set registry https://registry.npmjs.org/
```

> El segundo comando es defensivo: garantiza que el registry general **no** quedó
> apuntando por error al privado.

---

## 6. Verificación del acceso al registry

Nunca asumas que "está configurado" solo porque no dio error. **Verifica cada valor.**

**Paso 1 — registry del scope:**

```bash
npm config get @webiai:registry
```

Debe devolver exactamente:

```text
https://npm.pkg.webiai.io/
```

**Paso 2 — registry general:**

```bash
npm config get registry
```

Debe devolver exactamente:

```text
https://registry.npmjs.org/
```

**Paso 3 — autenticación (repetir el de la sección 4):**

```bash
npm whoami --registry=https://npm.pkg.webiai.io/
```

- Devuelve tu usuario → **continúa**.
- Devuelve `ENEEDAUTH` → **detente** y vuelve a la sección 4.

**Paso 4 — el paquete es visible SIN instalarlo:**

```bash
npm view @webiai/sdk.cli
```

Debe mostrar metadata del paquete (nombre, versión, dependencias). Ejemplo:

```text
@webiai/sdk.cli@0.23.11
```

Si aquí ves un error de auth o un `E500 / bug in the auth plugin system`, el
problema sigue siendo de **autenticación/acceso**, no del paquete.

**Comprobación fina de versión y binario (opcional, muy útil):**

```bash
npm view @webiai/sdk.cli@0.23.11 bin
```

Resultado esperado:

```text
{ webiai: 'dist/cli.js' }
```

Esto confirma que el paquete expone un binario llamado `webiai`.

---

## 7. Instalación de WebiAI CLI

Con registry correcto **y** autenticación verificada:

```bash
npm install -g @webiai/sdk.cli@0.23.11
```

Resultado esperado (aproximado):

```text
added 26 packages
```

**Verifica que el CLI quedó operativo:**

```bash
webiai --version
```

Debe devolver:

```text
0.23.11
```

```bash
webiai --help
```

Debe listar los comandos disponibles, entre ellos:

```text
infra  docs  init  install  run  hooks  build  tests
clean  scan  project  lib  bundle  dev  kiro
```

Si `webiai --version` funciona, el CLI está instalado, en el `PATH` y ejecutable.

> Si aparece `webiai: command not found`, revisa `npm root -g` (sección 3) y
> asegúrate de que `<prefix>/bin` esté en tu `PATH`.

---

## 8. Instalación de Elements

**Punto clave conceptual:** en este proyecto, **"Elements" es una capa
arquitectónica propia** (componentes React declarados con `ui_dsl()` en
`src/elements/`, ver secciones 10–11), **no un paquete npm independiente** de WebiAI.
Lo que se instala vía registry privado es el **tooling WebiAI** (`@webiai/sdk.cli`,
`@webiai/devlink`), que es lo que habilita construir/servir el bundle y trabajar con Kiro.

Por eso el manual distingue dos cosas que suelen confundirse:

| Concepto | Qué es | Cómo se "instala" |
|---|---|---|
| **Tooling WebiAI** | CLI y devlink del SDK | `npm install` desde el **registry privado** |
| **Elements** | Capa UI del proyecto (`src/elements/`) | Ya vive en el repo; no se instala por npm |

**Cómo quedó la dependencia del tooling** (en el `package.json` raíz del monorepo):

```jsonc
{
  "devDependencies": {
    "@webiai/devlink": "^2.8.1",
    "@webiai/sdk.cli": "0.23.11"
  }
}
```

**Comando de instalación de las dependencias del proyecto** (resuelve `@webiai/*`
desde el privado y el resto desde npmjs, gracias a la config de las secciones 5–6):

```bash
npm install
```

**Cómo verificar que las dependencias `@webiai/*` se instalaron desde el registro correcto:**

```bash
npm ls @webiai/sdk.cli @webiai/devlink
```

Debe listar las versiones sin errores de `UNMET DEPENDENCY` ni `404`.

> Si necesitas el CLI de forma global (para `webiai ...` en cualquier carpeta), usa
> además la instalación global de la sección 7. Para el proyecto en sí, basta con el
> `npm install` de las devDependencies.

---

## 9. Configuración del proyecto frontend

La SPA vive en `packages/apps/web/modules/app` (React + Vite + TypeScript + Tailwind v4).

**Verifica que el proyecto compila y arranca:**

```bash
# desde packages/apps/web/modules/app
npm run build      # debe terminar con "✓ built"
npm run dev        # levanta Vite (por defecto puerto 5173)
```

Config relevante ya presente en el repo:

- **Alias `@` → `./src`** en `vite.config.ts` y `paths` en `tsconfig.app.json`.
  Verifícalo:

  ```bash
  npm run build   # si el alias @ estuviera roto, fallaría la resolución de imports
  ```

- **Tailwind v4 vía plugin** (`@tailwindcss/vite`), sin `tailwind.config.js`.

---

## 10. Estructura recomendada

La capa Elements se ubica en `src/elements/` y sigue esta estructura:

```text
src/elements/
├── dsl.ts        # ui_dsl(): declara nodeId + intent + variants → componente tipado
├── Button.tsx    # variants: primary | accent | outline | ghost
├── Card.tsx
├── Badge.tsx
├── Field.tsx     # <input> etiquetado
├── Select.tsx    # <select> etiquetado
├── Textarea.tsx  # <textarea> etiquetada
├── Toggle.tsx    # switch ON/OFF accesible
├── SegmentedControl.tsx  # grupo de opciones con estado activo
├── SearchInput.tsx       # input de búsqueda con forwardRef
└── index.ts      # barrel (solo exporta los Elements)
```

Convenciones:

- Cada Element se declara con `ui_dsl()` y **emite `data-node-id` + `data-intent`**
  para trazabilidad/telemetría/testing.
- Los que necesitan tipos genéricos literales o `ref` (SegmentedControl, SearchInput)
  se implementan como función genérica / `forwardRef` en vez de `ui_dsl`, pero mantienen
  la convención de `data-node-id`/`data-intent`.

---

## 11. Implementación de Elements

Un Element se declara así (patrón real de `Button.tsx`):

```tsx
import { ui_dsl, type ElementBaseProps } from './dsl';

export interface ButtonProps extends ElementBaseProps,
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  variant?: 'primary' | 'accent' | 'outline' | 'ghost';
}

export const Button = ui_dsl<ButtonProps>({
  nodeId: 'necto.el.button',
  intent: ['action.generic'],
  base: 'inline-flex items-center justify-center gap-1.5 rounded-xl ...',
  variants: {
    primary: 'bg-zinc-950 text-white ...',
    accent:  'bg-[#FF3F1A] text-white ...',
    outline: 'border border-zinc-200 ...',
    ghost:   'text-zinc-500 hover:bg-zinc-100 ...',
  },
  render: ({ nodeId, intent, className, props, children }) => (
    <button data-node-id={nodeId} data-intent={intent} className={className} {...props}>
      {children}
    </button>
  ),
});
```

**Cómo verificar que un Element quedó bien:** al renderizarlo en el DOM debe
aparecer con sus atributos de trazabilidad. En build:

```bash
npm run build
grep -o "necto\.el\.button" dist/assets/index-*.js   # debe encontrarlo
```

---

## 12. Integración con la SPA

Los Elements se consumen desde el barrel:

```tsx
import { Button, Field, Select, Textarea, Badge, Card } from "@/elements";
```

Regla práctica de adopción (aprendida en este proyecto):

- **Usa Elements** para acciones (`Button`), formularios estándar (`Field`/`Select`/`Textarea`),
  estados (`Badge`), contenedores (`Card`), toggles, segmentos y búsquedas.
- **Deja HTML nativo** donde el Element rompería el diseño: inputs con icono absoluto,
  `type="date|file|color|datetime-local"`, checkboxes/radios, `<select>` con chevron
  propio, controles inline sin label, y las **primitivas internas** de `src/elements/`.

**Cómo verificar el nivel de adopción** (Elements vs nativos):

```bash
EL=$(grep -rho -E "<(Button|Card|Badge|Field|Select|Textarea|Toggle|SegmentedControl|SearchInput)\b" src --include="*.tsx" | wc -l)
NAT=$(grep -rho -E "<(button|input|select|textarea)\b" src --include="*.tsx" | wc -l)
awk "BEGIN{printf \"Adopción: %.1f%%\n\", ($EL/($EL+$NAT))*100}"
```

---

## 13. Flujo de trabajo con Kiro

1. **Autenticar** el entorno Kiro contra el registry privado (secciones 4–6).
2. `npm install` para resolver `@webiai/*` (privado) + resto (público).
3. Desarrollar en `src/` usando la capa Elements.
4. Verificar SIEMPRE tras cada grupo de cambios:
   ```bash
   npx tsc -p tsconfig.app.json --noEmit    # tipos: EXIT 0
   npm run build                            # bundle: ✓ built
   ```
5. Levantar `npm run dev` y comprobar HTTP 200 en las rutas principales.

> **Regla de verificación de Kiro:** el editor no siempre detecta errores de tipos
> genéricos; `tsc` sí. Verifica con `tsc`, no solo con los diagnostics del editor.

---

## 14. Problemas encontrados

| # | Síntoma | Entorno |
|---|---|---|
| P1 | `npm whoami` → `ENEEDAUTH` | Kiro |
| P2 | `npm view @webiai/sdk.cli` → `E500 / bug in the auth plugin system` | Kiro |
| P3 | `npm install -g @webiai/sdk.cli` → `404 Not Found ... is not in this registry` | Kiro |
| P4 | `404 Not Found - GET https://npm.pkg.webiai.io/commander` | Kiro |
| P5 | `@webiai:registry=https://...` → `bash: No such file or directory` | Kiro |
| P6 | Funcionaba en Windows pero no en Kiro | ambos |

---

## 15. Soluciones

- **P1 (ENEEDAUTH):** autenticar Kiro contra el privado (token en `.npmrc` del
  workspace o `npm login --registry=...`). Reverificar con `npm whoami --registry=...`.
- **P2 (E500 auth plugin):** era consecuencia de la falta de auth (P1). Al resolver
  la autenticación, `npm view` empezó a devolver la metadata correctamente.
- **P3 (404 en npmjs):** el scope `@webiai` estaba resolviéndose contra
  `registry.npmjs.org`. Solución: `npm config set @webiai:registry https://npm.pkg.webiai.io/`.
- **P4 (404 de `commander` en el privado):** se había apuntado **todo** npm al
  privado. `commander` es público. Solución: mantener `registry` general en npmjs y
  **solo** el scope `@webiai` en el privado.
- **P5 (línea de `.npmrc` en Bash):** `@webiai:registry=...` es sintaxis de archivo
  `.npmrc`, no un comando. Usar `npm config set @webiai:registry https://npm.pkg.webiai.io/`.
- **P6 (Windows sí / Kiro no):** son entornos distintos. Repetir la verificación de
  auth y registry **dentro de Kiro**.

---

## 16. Errores comunes

**❌ NO hacer esto:**

- ❌ Ejecutar `@webiai:registry=https://npm.pkg.webiai.io/` directamente en Bash.
  → Es una línea de `.npmrc`, no un comando. Usa `npm config set ...`.
- ❌ Apuntar **todo** npm al registry privado:
  ```bash
  npm config set registry https://npm.pkg.webiai.io/   # ❌ rompe react/commander/etc.
  ```
- ❌ Asumir que porque `npm config get @webiai:registry` devuelve la URL, **ya estás
  autenticado**. Configurar ≠ autenticar. Verifica siempre `npm whoami --registry=...`.
- ❌ Instalar paquetes `@webiai/*` desde `registry.npmjs.org` (darán 404).
- ❌ Confundir el entorno **Windows** con el entorno **Linux/contenedor de Kiro**.
- ❌ Pegar o commitear el `_authToken`.

**✅ SÍ hacer:**

- ✅ Mantener `registry.npmjs.org` como registry general y WebiAI **solo** para el
  scope `@webiai`.
- ✅ Verificar siempre `npm whoami --registry=https://npm.pkg.webiai.io/`.
- ✅ Usar `npm view` para comprobar acceso **antes** de instalar.

---

## 17. Puntos críticos a tener en cuenta

1. **Configurar el registry NO es autenticarse.** Son dos cosas separadas.
2. **El scope aísla el registry privado.** `@webiai` → privado; todo lo demás → público.
3. **Windows ≠ Kiro.** Verifica dentro del entorno donde vas a instalar.
4. **`prefix`/`npm root -g`** importa para que `webiai` esté en el `PATH`.
5. **La instalación no fue "mágica".** Lo que la desbloqueó fue **resolver el acceso
   autenticado de Kiro al registry privado**, no un comando especial de Elements.
6. **Tokens fuera del repo y de los manuales**, siempre.

---

## 18. Checklist de instalación

```text
[ ] node --version                → v22.x o superior
[ ] npm --version                 → 10.x o superior
[ ] npm config get @webiai:registry → https://npm.pkg.webiai.io/
[ ] npm config get registry       → https://registry.npmjs.org/
[ ] npm whoami --registry=https://npm.pkg.webiai.io/ → tu usuario (NO ENEEDAUTH)
[ ] npm view @webiai/sdk.cli      → muestra metadata/versión
[ ] npm install -g @webiai/sdk.cli@0.23.11 (si necesitas el CLI global)
[ ] webiai --version              → 0.23.11
[ ] webiai --help                 → lista de comandos
[ ] npm root -g                   → <prefix>/lib/node_modules (binario en PATH)
```

---

## 19. Checklist de implementación

```text
[ ] npm install (en la raíz del monorepo)  → sin 404 ni UNMET
[ ] npm ls @webiai/sdk.cli @webiai/devlink → versiones correctas
[ ] Alias @ → ./src funcionando           → npm run build sin errores de import
[ ] Elements importados desde "@/elements"
[ ] npx tsc -p tsconfig.app.json --noEmit  → EXIT 0
[ ] npm run build                          → ✓ built
[ ] npm run dev + HTTP 200 en /, /workspaces, /onboarding
[ ] data-node-id/data-intent presentes en el bundle (grep necto.el.*)
```

---

## 20. Troubleshooting

### Los 3 comandos de diagnóstico (ejecutar en este orden)

Si un desarrollador reporta que "no puede instalar/ver WebiAI o Elements", pídele
estos tres primero. Aíslan el problema en **registry → autenticación → acceso al paquete**:

```bash
# 1) ¿El scope apunta al registry privado?
npm config get @webiai:registry        # esperado: https://npm.pkg.webiai.io/

# 2) ¿Está autenticado ese registry?
npm whoami --registry=https://npm.pkg.webiai.io/   # esperado: tu usuario (no ENEEDAUTH)

# 3) ¿El paquete es accesible sin instalar?
npm view @webiai/sdk.cli               # esperado: metadata + versión
```

### Tabla rápida

| Error | Causa probable | Solución |
|---|---|---|
| `ENEEDAUTH` en `npm whoami` | Kiro no autenticado en el privado | Sección 4 (token en `.npmrc` o `npm login --registry=...`) |
| `E500 / bug in the auth plugin system` en `npm view` | Falta de auth | Resolver auth (P1) y reintentar |
| `404 ... is not in this registry` para `@webiai/*` | Scope resolviéndose en npmjs | `npm config set @webiai:registry https://npm.pkg.webiai.io/` |
| `404 - GET https://npm.pkg.webiai.io/commander` | Todo npm apuntando al privado | `npm config set registry https://registry.npmjs.org/` |
| `bash: @webiai:registry=...: No such file or directory` | Sintaxis de `.npmrc` en Bash | Usar `npm config set ...` |
| `webiai: command not found` | Binario global fuera del PATH | Revisar `npm root -g` y `<prefix>/bin` en PATH |
| Funciona en Windows, no en Kiro | Entornos distintos | Reverificar auth/registry dentro de Kiro |

### Flujo conceptual completo

```text
                 KIRO
                  │
                  ▼
        ¿npm está configurado?   (npm config get @webiai:registry / registry)
                  │
                  ▼
       @webiai → registry privado
                  │
                  ▼
       ¿Está autenticado?        (npm whoami --registry=...)
          │             │
         NO            SÍ
          │             │
     solucionar         ▼
     sesión       npm view @webiai/...   (acceso sin instalar)
                        │
                        ▼
                 npm install
                        │
                        ▼
                WebiAI CLI (webiai --version)
                        │
                        ▼
                   Elements (src/elements/)
                        │
                        ▼
                 SPA / Frontend
```

### Comando exacto que desbloqueó la instalación

No fue "una instalación mágica de Elements". La secuencia que finalmente funcionó fue:

```bash
# 1) aislar el scope al registry privado (NO tocar el registry general)
npm config set @webiai:registry https://npm.pkg.webiai.io/
npm config set registry https://registry.npmjs.org/

# 2) resolver la autenticación de Kiro (token en .npmrc del workspace o login)
npm whoami --registry=https://npm.pkg.webiai.io/     # confirmar usuario (no ENEEDAUTH)

# 3) recién entonces, instalar
npm install -g @webiai/sdk.cli@0.23.11               # CLI global
# y/o, en el proyecto:
npm install                                          # resuelve @webiai/* + deps públicas
```

Y la dependencia quedó registrada en el `package.json` raíz del monorepo:

```jsonc
{
  "devDependencies": {
    "@webiai/devlink": "^2.8.1",
    "@webiai/sdk.cli": "0.23.11"
  }
}
```

---

_Última verificación de los valores de este manual contra el entorno real del proyecto:_
`node v22.23.2`, `npm 10.9.8`, `@webiai:registry = https://npm.pkg.webiai.io/`,
`registry = https://registry.npmjs.org/`, `webiai --version = 0.23.11`,
`npm root -g = /workspaces/.npm-global/lib/node_modules`.
