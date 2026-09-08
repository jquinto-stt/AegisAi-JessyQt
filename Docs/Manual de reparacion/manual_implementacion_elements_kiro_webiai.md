# MANUAL DE INSTALACIÓN — WebiAI + Elements (Kiro)

Guía **paso a paso ejecutable**. Cada paso tiene: **comando exacto** → **qué debe
devolver** → **si falla, qué hacer exactamente**. Sigue los pasos **en orden**; no
avances a un paso si el anterior no dio el resultado esperado.

> **Seguridad:** nunca escribas ni compartas el `_authToken` real. En este manual los
> tokens aparecen como `<REDACTED>` / `<TU_TOKEN>`. Si viste un token en un log o chat,
> **revócalo/rótalo**.

---

## Orden de instalación (visión rápida)

```text
1. Node / npm            (base del sistema)
2. Registry @webiai      (a dónde busca npm los paquetes @webiai/*)
3. Autenticación         (login contra el registry privado)
4. Verificar acceso      (npm view: el paquete es visible)
5. WebiAI CLI            (npm install -g @webiai/sdk.cli)
6. Dependencias proyecto (npm install: @webiai/devlink + públicas)
7. Elements              (capa del repo en src/elements/, no es un paquete)
8. Arrancar y verificar  (tsc + build + dev)
```

> **IMPORTANTE:** primero se instala **WebiAI** (el CLI/tooling desde el registry
> privado). **Elements NO es un paquete npm**: es la capa de UI que vive en el repo
> (`src/elements/`). Se "instala" clonando el repo y corriendo `npm install`. El paso 7
> lo explica.

---

## PASO 1 — Node y npm

**Comando:**

```bash
node --version
npm --version
```

**Debe devolver:**

```text
v22.x   (o superior)   ← ejemplo real: v22.23.2
10.x    (o superior)   ← ejemplo real: 10.9.8
```

**Si falla:**

- `command not found: node` → instala Node 22+ (nvm, o el instalador del sistema) y
  reabre la terminal. Repite el comando.
- Versión menor a 22 → actualiza Node. WebiAI requiere Node ≥ 22.

---

## PASO 2 — Configurar el registry `@webiai`

Solo el scope `@webiai` va al registry privado. **El registry general NO se toca.**

**Comandos:**

```bash
npm config set @webiai:registry https://npm.pkg.webiai.io/
npm config set registry https://registry.npmjs.org/
```

**Verifica que quedó bien:**

```bash
npm config get @webiai:registry
```

Debe devolver **exactamente**:

```text
https://npm.pkg.webiai.io/
```

```bash
npm config get registry
```

Debe devolver **exactamente**:

```text
https://registry.npmjs.org/
```

**Si falla / da otro valor:**

- Devuelve `undefined` en `@webiai:registry` → el `set` no se aplicó; repítelo.
- El `registry` general apunta a `npm.pkg.webiai.io` → **está mal**. Corrígelo:
  ```bash
  npm config set registry https://registry.npmjs.org/
  ```
  (Si dejas todo npm apuntando al privado, luego fallará descargar `commander`, `react`,
  etc. con `404` — ver PASO 5.)
- Escribiste `@webiai:registry=https://...` directo en la terminal y salió
  `bash: ... No such file or directory` → **eso es sintaxis de `.npmrc`, no un comando.**
  Usa siempre `npm config set @webiai:registry https://npm.pkg.webiai.io/`.

---

## PASO 3 — Autenticación contra el registry privado

**Configurar el registry NO es estar autenticado.** Este es el paso donde más se falla.

**Comando de verificación:**

```bash
npm whoami --registry=https://npm.pkg.webiai.io/
```

**Debe devolver:** tu nombre de usuario del registry.

**Si devuelve esto → NO estás autenticado, detente y arréglalo:**

```text
npm error code ENEEDAUTH
npm error need auth This command requires you to be logged in.
```

**Cómo arreglarlo (elige UNA opción):**

- **Opción A — token en `.npmrc` (recomendada en Kiro/CI).** Añade estas líneas al
  `.npmrc` del workspace (`/workspaces/.npmrc` en este entorno):
  ```ini
  //npm.pkg.webiai.io/:_authToken=<TU_TOKEN>
  @webiai:registry=https://npm.pkg.webiai.io/
  ```
  El `<TU_TOKEN>` lo provee el equipo (o una variable de entorno / SSM). **No lo
  escribas en el repo.**

- **Opción B — login interactivo:**
  ```bash
  npm login --registry=https://npm.pkg.webiai.io/
  ```

**Vuelve a verificar (obligatorio antes de seguir):**

```bash
npm whoami --registry=https://npm.pkg.webiai.io/
```

Solo continúa cuando devuelva tu usuario.

> **Nota Windows vs Kiro:** que `npm whoami` funcione en tu Windows NO significa que
> funcione en Kiro (contenedor Linux). Son entornos con `.npmrc` y credenciales
> distintos. **Verifica dentro de Kiro.**

---

## PASO 4 — Verificar que el paquete WebiAI es accesible (sin instalar)

**Comando:**

```bash
npm view @webiai/sdk.cli
```

**Debe devolver:** metadata del paquete (nombre, versión, dependencias). Referencia:

```text
@webiai/sdk.cli@0.23.11 ...
```

**Si falla:**

- `E500 ... bug in the auth plugin system` → sigues **sin autenticar**. Vuelve al PASO 3.
- `404 Not Found ... is not in this registry` → el scope `@webiai` se está resolviendo
  contra npmjs. Vuelve al PASO 2 y confirma `npm config get @webiai:registry`.

**Comprobación opcional del binario:**

```bash
npm view @webiai/sdk.cli@0.23.11 bin
```

Debe devolver:

```text
{ webiai: 'dist/cli.js' }
```

(Confirma que el paquete instala un comando llamado `webiai`.)

---

## PASO 5 — Instalar el WebiAI CLI (global)

Solo con el PASO 3 (auth) y el PASO 4 (acceso) en verde.

**Comando:**

```bash
npm install -g @webiai/sdk.cli@0.23.11
```

**Debe devolver algo como:**

```text
added 26 packages
```

**Verifica que quedó operativo:**

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

Debe listar comandos: `infra docs init install run hooks build tests clean scan project lib bundle dev kiro`.

**Si falla:**

- `404 Not Found - GET https://npm.pkg.webiai.io/commander` (u otra dep pública) →
  **apuntaste TODO npm al privado.** `commander` es público. Arréglalo:
  ```bash
  npm config set registry https://registry.npmjs.org/
  ```
  y reinstala.
- `404 ... @webiai/sdk.cli is not in this registry` → el scope no apunta al privado
  (PASO 2) o no estás autenticado (PASO 3).
- `webiai: command not found` (pero el install dijo "added ...") → el binario global no
  está en el `PATH`. Diagnostica:
  ```bash
  npm root -g
  ```
  En Kiro debe devolver `/workspaces/.npm-global/lib/node_modules`. Asegúrate de que la
  carpeta `bin` correspondiente (`/workspaces/.npm-global/bin`) esté en tu `PATH`.

---

## PASO 6 — Instalar las dependencias del proyecto

Clona el repo (si aún no lo tienes) y entra a la raíz del monorepo.

**Comando (en la raíz del repo):**

```bash
npm install
```

Esto resuelve `@webiai/*` desde el privado y el resto (react, vite, etc.) desde npmjs,
gracias a la config del PASO 2.

**Verifica que las dependencias WebiAI se instalaron:**

```bash
npm ls @webiai/sdk.cli @webiai/devlink
```

Debe listar las versiones **sin** `UNMET DEPENDENCY` ni `404`. Referencia del proyecto
(en `package.json` raíz):

```jsonc
{
  "devDependencies": {
    "@webiai/devlink": "^2.8.1",
    "@webiai/sdk.cli": "0.23.11"
  }
}
```

**Si falla:**

- `404` en un `@webiai/*` → PASO 2 / PASO 3 (registry o auth).
- `404` en un paquete público (react, vite, commander...) → el registry general quedó
  mal; `npm config set registry https://registry.npmjs.org/` y repite `npm install`.
- Errores raros de caché tras cambiar de registry:
  ```bash
  npm cache verify
  rm -rf node_modules package-lock.json   # último recurso
  npm install
  ```

---

## PASO 7 — "Instalar" Elements (la capa del repo)

**Elements NO es un paquete npm.** Es la capa de UI del proyecto, ya incluida en el
repositorio. "Instalarla" = tenerla en el repo tras `npm install`. No hay `npm install
@webiai/elements` ni nada parecido.

**Verifica que la capa existe:**

```bash
ls packages/apps/web/modules/app/src/elements/
```

Debe listar (referencia):

```text
dsl.ts  Button.tsx  Card.tsx  Badge.tsx  Field.tsx  Select.tsx
Textarea.tsx  Toggle.tsx  SegmentedControl.tsx  SearchInput.tsx  index.ts
```

**Verifica que se pueden importar** (se consumen desde el barrel `@/elements`):

```bash
grep -r "from \"@/elements\"" packages/apps/web/modules/app/src | head
```

Debe mostrar imports como `import { Button, Field } from "@/elements";`.

> Distinción clave:
> - **WebiAI (paso 5–6)** = tooling/CLI que se instala del **registry privado**.
> - **Elements (paso 7)** = capa de UI que **ya vive en el repo**; no se instala por npm.

---

## PASO 8 — Arrancar y verificar

Entra a la app: `packages/apps/web/modules/app`.

**Type-check:**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Debe terminar con **EXIT 0** (sin imprimir errores).

**Build de producción:**

```bash
npm run build
```

Debe terminar con:

```text
✓ built in N.NNs
```

**Servidor de desarrollo:**

```bash
npm run dev
```

Debe levantar Vite e imprimir la URL local (por defecto `http://localhost:5173/`).
Verifica en el navegador o con:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/
```

Debe devolver `200`.

**Si falla:**

- `tsc` con errores → corrige los tipos antes de continuar (no confíes solo en el editor;
  `tsc` detecta cosas que el editor no).
- El build falla por un import `@/...` → el alias `@ → ./src` no se resolvió; revisa que
  `vite.config.ts` y `tsconfig.app.json` no se hayan modificado.
- `EADDRINUSE` en `npm run dev` → el puerto está ocupado; usa otro:
  ```bash
  npm run dev -- --port 5174
  ```

---

## Los 3 comandos de diagnóstico (memorízalos)

Si algo falla en los pasos 4–6, ejecuta estos tres **en este orden**. Aíslan el
problema en **registry → autenticación → acceso**:

```bash
npm config get @webiai:registry                      # 1) ¿scope al privado?  → https://npm.pkg.webiai.io/
npm whoami --registry=https://npm.pkg.webiai.io/     # 2) ¿autenticado?       → tu usuario (no ENEEDAUTH)
npm view @webiai/sdk.cli                             # 3) ¿accesible?         → metadata/versión
```

---

## Tabla de errores → solución exacta

| Error exacto | Paso | Qué hacer exactamente |
|---|---|---|
| `command not found: node` | 1 | Instalar Node ≥ 22 y reabrir terminal |
| `npm config get @webiai:registry` → `undefined` | 2 | `npm config set @webiai:registry https://npm.pkg.webiai.io/` |
| `bash: @webiai:registry=...: No such file or directory` | 2 | Es sintaxis de `.npmrc`; usar `npm config set @webiai:registry https://npm.pkg.webiai.io/` |
| `npm error code ENEEDAUTH` | 3 | Añadir `//npm.pkg.webiai.io/:_authToken=<TU_TOKEN>` al `.npmrc` **o** `npm login --registry=https://npm.pkg.webiai.io/` |
| `E500 ... bug in the auth plugin system` | 4 | Es falta de auth: volver al PASO 3 y reverificar `npm whoami` |
| `404 ... @webiai/sdk.cli is not in this registry` | 4/5 | El scope apunta a npmjs: `npm config set @webiai:registry https://npm.pkg.webiai.io/` |
| `404 - GET https://npm.pkg.webiai.io/commander` | 5 | Todo npm al privado: `npm config set registry https://registry.npmjs.org/` y reinstalar |
| `webiai: command not found` (tras instalar OK) | 5 | `npm root -g`; añadir `<prefix>/bin` al `PATH` |
| `npm ls` → `UNMET DEPENDENCY` | 6 | `rm -rf node_modules package-lock.json && npm install` |
| Funciona en Windows, falla en Kiro | 3 | Repetir PASO 3 (auth) **dentro de Kiro** |

---

## Reglas de oro (no hacer esto)

- ❌ **No** apuntes todo npm al privado (`npm config set registry https://npm.pkg.webiai.io/`).
  Solo el scope `@webiai`.
- ❌ **No** asumas que configurar el registry = estar autenticado. Verifica `npm whoami --registry=...`.
- ❌ **No** ejecutes `@webiai:registry=...` en Bash. Es sintaxis de `.npmrc`; usa `npm config set ...`.
- ❌ **No** instales `@webiai/*` desde `registry.npmjs.org` (da 404).
- ❌ **No** busques Elements como paquete npm: vive en el repo (`src/elements/`).
- ❌ **No** compartas ni commitees el `_authToken`.
- ✅ **Sí** mantén npmjs como registry general y WebiAI solo para `@webiai`.

---

## Checklist de instalación (marca en orden)

```text
[ ] node --version                                   → v22.x+
[ ] npm --version                                    → 10.x+
[ ] npm config get @webiai:registry                  → https://npm.pkg.webiai.io/
[ ] npm config get registry                          → https://registry.npmjs.org/
[ ] npm whoami --registry=https://npm.pkg.webiai.io/ → tu usuario (NO ENEEDAUTH)
[ ] npm view @webiai/sdk.cli                          → metadata/versión
[ ] npm install -g @webiai/sdk.cli@0.23.11            → added N packages
[ ] webiai --version                                 → 0.23.11
[ ] webiai --help                                    → lista de comandos
[ ] npm install (raíz del repo)                      → sin 404 / UNMET
[ ] npm ls @webiai/sdk.cli @webiai/devlink           → versiones OK
[ ] ls src/elements/                                 → Button.tsx, dsl.ts, index.ts, ...
[ ] npx tsc -p tsconfig.app.json --noEmit            → EXIT 0
[ ] npm run build                                    → ✓ built
[ ] npm run dev + curl / → 200
```

---

_Valores de referencia verificados en este entorno:_
`node v22.23.2` · `npm 10.9.8` · `webiai 0.23.11` ·
`@webiai:registry = https://npm.pkg.webiai.io/` · `registry = https://registry.npmjs.org/` ·
`npm root -g = /workspaces/.npm-global/lib/node_modules`.
