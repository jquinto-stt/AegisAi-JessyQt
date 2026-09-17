# Analítica reactiva — entrega

`/pedidos/analitica` dejó de ser una maqueta: las cuatro tareas del encargo están hechas y
cada valor de la pantalla sale ahora de un selector del `pedidosStore`.

## Qué se entregó

- **Métricas conectadas al store** — Total Pedidos, Ticket Promedio (AOV), Tasa de
  Cancelación e Ingresos por Ventas se derivan de `pedidosStore.pedidos`. La serie «Ventas y
  cancelaciones» se alimenta de pedidos vendidos y cancelados por día.
- **Conmutador «Métricas» / «Vista Lista»** — la vista lista usa el `Table` canónico con las
  **8 columnas** pedidas (ID Pedido, Cliente, Teléfono, Canal, Modalidad, Monto Total,
  Estado, Fecha), más orden por columna, paginación, filtro rápido de estado y buscador.
- **Exportación CSV** — botón «Descargar CSV» en ambas vistas; 8 columnas, escapado correcto
  (comas y comillas), BOM UTF-8 y CRLF, descargado como
  `stockflow-analitica-YYYY-MM-DD.csv`.
- **Filtro de periodo funcional** — desplegable con «Últimos 7 días» / «Últimos 30 días» /
  «Todo el historial» que recalcula **todas** las métricas y el gráfico.
- **10 selectores con rango + `repartirPorcentaje` en `pedidosStore`**, y el vocabulario de
  dominio que faltaba (`Origen` exportado, `ORIGEN_LABEL`, `origenLabel`). Sin tocar el
  contrato público del store.
- **`analitica.utils.ts`** (nuevo, 314 líneas): lógica de vista pura y testeable — periodo,
  orden, paginación y CSV.

## Verificación

| Comprobación | Antes | Después |
|---|---|---|
| Suite | 4 fallos / 257 | **375 / 375** ✅ |
| TypeScript (archivos tocados) | — | **0 errores** ✅ |
| TypeScript (global) | 12 preexistentes | **12 — sin regresión** ✅ |
| Build de producción | — | ✓ 301 módulos ✅ |
| Arranque en caliente (CDP) | — | **53 / 53, 0 excepciones** ✅ |

## El hallazgo que importa

El encargo destapó un defecto **P0 real**, no cosmético: el store indexaba fechas con **dos
convenciones incompatibles** (día UTC vs día local). Entre las **19:00 y 23:59** locales
(UTC−5) las métricas diarias divergían. Eso explicaba los 4 tests que ya fallaban en un árbol
limpio. Se corrigió en la raíz (alcance acotado, como acordamos) unificando los 6 puntos de
indexación a día local.

**El resultado más importante no es la página: es que la suite pasó de 4 fallos a 370 verdes.**

## Desviaciones y huecos (declarados, no disimulados)

- **El flujo asesor MCP no se pudo ejecutar** (`ui_dsl` → … → `ui_implement`). Se consumió el
  catálogo ya vendorizado en `src/elements/`. Por eso **no hay Design DSL**. No se escribió
  ningún componente a mano ni se importó librería externa.
- **`ExportButton` no existe** en el catálogo; se compuso `Button` + `DownloadIcon`.
- **El `Table` del catálogo no trae orden ni paginación** (y el `TECH_DEBT.md` que su
  docstring cita **no existe**); se construyeron encima, como acordamos.
- **`Select` es no controlado** y no acepta `value`; se sincroniza remontando con `key`.

Detalle completo, con la matriz de consistencia y el mapa estado→store, en
`outputs/informe-analitica-reactiva.md`.
