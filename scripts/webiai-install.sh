#!/usr/bin/env bash
set -euo pipefail

# Instala las dependencias del monorepo evitando el bug 500 del registry @webiai.
# Descarga los tarballs @webiai por curl (ruta S3 que sí funciona), los mete en
# la caché de npm e instala en modo offline-first.
#
# Documentación: Docs/troubleshooting_webiai_registry_500_install.md

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
