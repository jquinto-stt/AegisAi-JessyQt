# Solución: no se puede instalar `@webiai` / usar `webiai` ni Elements

> Guía de troubleshooting para el error `500 Internal Server Error - bug in the auth plugin system`
> al ejecutar `npm install` en el monorepo Necto (paquetes `@webiai/*`).

---

## 1. Síntoma

No se puede usar **Elements** ni el CLI **`webiai`** en el proyecto porque las dependencias
de la raíz del monorepo nunca se instalan. Al correr `npm install` en la raíz falla con:

```text
npm error code E500
npm error 500 Internal Server Error - GET https://npm.pkg.webiai.io/@webiai/sdk.ioc/-/<hash> - bug in the auth plugin system
```

Consecuencias observables:

- `npm ls --depth=0` muestra todo como `UNMET DEPENDENCY` (incluidos `@webiai/sdk.cli` y `@webiai/devlink`).
- La raíz del monorepo **no tiene** carpeta `node_modules`.
- El frontend no compila / `webiai` no puede ejecutarse desde la raíz.

> **Importante:** este problema **no** tiene relación con la conexión SSH de Coder/Kiro ni con `settings.json`.
> Es un problema del **registry privado de WebiAI**, no de tu equipo ni de tu configuración local.

---

## 2. Causa raíz

El registry privado `https://npm.pkg.webiai.io/` tiene un **bug del lado del servidor** en su
sistema de autenticación (*"auth plugin system"*).

- La **metadata** de los paquetes (`GET /@webiai%2fsdk.ioc`) responde `200 OK`.
- Pero cuando **npm** solicita el **tarball** (`GET /@webiai/sdk.ioc/-/<hash>`), el endpoint
  responde `500 Internal Server Error - bug in the auth plugin system` de forma consistente.
- npm **no reintenta** un `500` con cuerpo de error, así que aborta todo el `npm install`.

### Evidencia de que NO es problema local

Descargar el **mismo** tarball con `curl` y tu token **sí funciona**:

```bash
# El registry responde 302 y redirige a S3, de donde el tarball baja con HTTP 200
curl -sSL -o /tmp/test.tgz -w "HTTP %{http_code} size=%{size_download}\n" \
  -H "Authorization: Bearer $WEBIAI_NPM_TOKEN" \
  "https://npm.pkg.webiai.io/@webiai/sdk.ioc/-/<hash>"
# => HTTP 200 size=89997
```

Es decir: **token OK, red OK, S3 OK.** Lo único que falla es el endpoint del registry
cuando lo consulta npm (npm envía cabeceras que disparan el bug del plugin de auth del servidor).

### Diagrama de la causa

```text
npm install
  ↓
npm pide metadata @webiai/*        → 200 OK
  ↓
npm pide tarball @webiai/sdk.ioc   → 500 "bug in the auth plugin system"
  ↓
npm NO reintenta un 500 con cuerpo
  ↓
npm install aborta por completo
  ↓
node_modules de la raíz nunca se crea → no hay webiai CLI ni build
```

---

## 3. Requisitos previos

Verifica que el entorno tiene lo necesario (en el workspace de Coder ya viene configurado):

```bash
node -v                 # >= 22
npm -v
which webiai            # /workspaces/.npm-global/bin/webiai (CLI global)

# El token del registry privado debe estar presente en el entorno
[ -n "$WEBIAI_NPM_TOKEN" ] && echo "WEBIAI_NPM_TOKEN OK (len=${#WEBIAI_NPM_TOKEN})" || echo "FALTA WEBIAI_NPM_TOKEN"
```

El `~/.npmrc` debe contener (ya viene así en el workspace):

```text
@webiai:registry=https://npm.pkg.webiai.io
//npm.pkg.webiai.io/:_authToken=${WEBIAI_NPM_TOKEN}
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

> Si `WEBIAI_NPM_TOKEN` está vacío, recárgalo con `envx sync` y vuelve a abrir la terminal.

---

## 4. Solución paso a paso

La idea: **descargar los tarballs `@webiai` con `curl`** (ruta que sí funciona vía S3),
**inyectarlos en la caché de npm** y luego **instalar en modo offline** para que npm no
vuelva a pedir esos tarballs al endpoint roto.

Todos los comandos se ejecutan desde la **raíz del monorepo**: `/workspaces/AegisAi-JessyQt`.

### Paso 1. Confirmar el diagnóstico (opcional)

```bash
npm install 2>&1 | tail -5
# Debe fallar con: 500 Internal Server Error - bug in the auth plugin system
```

### Paso 2. Extraer del lockfile los tarballs `@webiai` que hacen falta

```bash
node -e '
const lock = require("./package-lock.json");
const pkgs = lock.packages || {};
for (const [p, meta] of Object.entries(pkgs)) {
  if (p.includes("node_modules/@webiai/") && meta.resolved) {
    const name = p.split("node_modules/").pop();
    console.log(name + "\t" + meta.version + "\t" + meta.resolved);
  }
}
' > /tmp/webiai-list.txt
cat /tmp/webiai-list.txt
```

### Paso 3. Descargar cada tarball con `curl` (usa el redirect a S3)

```bash
mkdir -p .webiai-tarballs
while IFS=$'\t' read -r name version resolved; do
  fname=$(echo "$name" | sed 's#@webiai/#webiai-#')-"$version".tgz
  code=$(curl -sSL -o ".webiai-tarballs/$fname" -w "%{http_code}" \
    -H "Authorization: Bearer $WEBIAI_NPM_TOKEN" "$resolved")
  size=$(stat -c%s ".webiai-tarballs/$fname" 2>/dev/null || echo 0)
  echo "$name -> $fname : HTTP $code, ${size} bytes"
done < /tmp/webiai-list.txt
```

Todos deben mostrar `HTTP 200` y un tamaño > 0.

### Paso 4. Inyectar los tarballs en la caché de npm

```bash
for f in .webiai-tarballs/*.tgz; do
  echo "cache add $f"
  npm cache add "$f"
done
```

### Paso 5. Instalar en modo offline-first

```bash
npm install --prefer-offline --no-audit --no-fund --fetch-timeout=600000
```

Al tener los tarballs en caché, npm los usa desde ahí y **no** vuelve a pegarle al endpoint
que devuelve `500`. Resultado esperado: `added <N> packages`.

### Paso 6. Limpiar temporales

```bash
rm -rf .webiai-tarballs /tmp/webiai-list.txt
```

> `node_modules` está en `.gitignore`, así que no se agrega al control de versiones.

---

## 5. Verificación

```bash
# 1) Los paquetes @webiai quedaron instalados
ls node_modules/@webiai
# devlink  sdk.aws  sdk.cli  sdk.core  sdk.dispatch  sdk.http  sdk.infra-provider  sdk.ioc

# 2) Sin dependencias UNMET en la raíz
npm ls --depth=0

# 3) El CLI webiai reconoce el monorepo
webiai scan

# 4) El frontend (donde vive la capa Elements) compila
cd packages/apps/web/modules/app && npm run build
# ✓ built in ~10s
```

Si los 4 pasos pasan, **Elements y `webiai` ya funcionan**.

---

## 6. Script reutilizable

Para no repetir los pasos a mano, guarda esto como `scripts/webiai-install.sh` y ejecútalo
desde la raíz del monorepo cada vez que el registry falle:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Instala las dependencias del monorepo evitando el bug 500 del registry @webiai.
# Descarga los tarballs @webiai por curl (ruta S3 que sí funciona), los mete en
# la caché de npm e instala en modo offline-first.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -z "${WEBIAI_NPM_TOKEN:-}" ]; then
  echo "ERROR: WEBIAI_NPM_TOKEN no está definido. Ejecuta 'envx sync' y reabre la terminal." >&2
  exit 1
fi

echo "==> Extrayendo tarballs @webiai del package-lock.json"
node -e '
const lock = require("./package-lock.json");
const pkgs = lock.packages || {};
for (const [p, meta] of Object.entries(pkgs)) {
  if (p.includes("node_modules/@webiai/") && meta.resolved) {
    const name = p.split("node_modules/").pop();
    console.log(name + "\t" + meta.version + "\t" + meta.resolved);
  }
}
' > /tmp/webiai-list.txt

echo "==> Descargando tarballs @webiai con curl (redirect S3)"
mkdir -p .webiai-tarballs
while IFS=$'\t' read -r name version resolved; do
  fname=$(echo "$name" | sed 's#@webiai/#webiai-#')-"$version".tgz
  code=$(curl -sSL -o ".webiai-tarballs/$fname" -w "%{http_code}" \
    -H "Authorization: Bearer $WEBIAI_NPM_TOKEN" "$resolved")
  size=$(stat -c%s ".webiai-tarballs/$fname" 2>/dev/null || echo 0)
  echo "    $name -> $fname : HTTP $code, ${size} bytes"
  if [ "$code" != "200" ] || [ "$size" -le 100 ]; then
    echo "ERROR: fallo al descargar $name (HTTP $code)" >&2
    exit 1
  fi
done < /tmp/webiai-list.txt

echo "==> Inyectando tarballs en la caché de npm"
for f in .webiai-tarballs/*.tgz; do
  npm cache add "$f"
done

echo "==> npm install (offline-first)"
npm install --prefer-offline --no-audit --no-fund --fetch-timeout=600000

echo "==> Limpieza"
rm -rf .webiai-tarballs /tmp/webiai-list.txt

echo "==> Verificación"
ls node_modules/@webiai
echo "OK: dependencias @webiai instaladas."
```

Para usarlo:

```bash
chmod +x scripts/webiai-install.sh
./scripts/webiai-install.sh
```

---

## 7. Notas y alternativas

- **Es un fallo intermitente del servidor.** A veces la metadata responde `200` y otras `500`.
  El script es tolerante porque descarga los tarballs por la ruta S3 (302), que es estable.
- **Verdaccio** (registry local del workspace, `verdaccio start`) es una alternativa a largo
  plazo: cachea los paquetes localmente. Requiere configurarlo (`verdaccio` aparecía como
  *"not configured"* al momento de escribir esta guía).
- **No** es necesario tocar `~/.npmrc`, el token ni `settings.json` de Kiro para resolver esto.
- Si `curl` devuelve `401/403` en el Paso 3, el problema sí sería de token: ejecuta
  `envx sync`, reabre la terminal y verifica `echo ${#WEBIAI_NPM_TOKEN}`.

---

## 8. Resumen para soporte técnico

**Problema:**

> `npm install` en el monorepo falla con `500 Internal Server Error - bug in the auth plugin system`
> al descargar los tarballs `@webiai/*`. Sin esas dependencias no funcionan el CLI `webiai`
> ni la build del frontend (capa Elements).

**Causa:**

> Bug del lado del servidor en el registry privado `npm.pkg.webiai.io`. La metadata responde
> `200` pero el endpoint del tarball devuelve `500` cuando lo pide npm. Descargar el tarball
> por `curl` (redirect a S3) con el mismo token funciona (`HTTP 200`).

**Solución:**

> Descargar los tarballs `@webiai` con `curl`, inyectarlos en la caché de npm
> (`npm cache add`) e instalar con `npm install --prefer-offline`. Ver `scripts/webiai-install.sh`.

---

## 9. Checklist rápido

- [ ] Estar en la raíz del monorepo (`/workspaces/AegisAi-JessyQt`).
- [ ] `WEBIAI_NPM_TOKEN` definido (`echo ${#WEBIAI_NPM_TOKEN}` > 0).
- [ ] Extraer tarballs del `package-lock.json` (Paso 2).
- [ ] Descargar con `curl` → todos `HTTP 200` (Paso 3).
- [ ] `npm cache add` de cada `.tgz` (Paso 4).
- [ ] `npm install --prefer-offline` → `added N packages` (Paso 5).
- [ ] `ls node_modules/@webiai` muestra los 8 paquetes.
- [ ] `webiai scan` reconoce el monorepo.
- [ ] `npm run build` del frontend compila.
