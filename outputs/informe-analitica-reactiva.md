# Analítica · conexión reactiva, vista lista, CSV y filtro temporal

**Módulo:** `pedidos` → `/pedidos/analitica`
**Árbol autoritativo:** `packages/apps/web/modules/app/src/` (rastreado por git)
**Rol:** Frontend UX/UI Systems Architect (Iris)
**Fecha:** 2026-09-17

---

## 1. Resumen ejecutivo

La página de Analítica era una **maqueta 100 % ficticia**: 843 líneas con 20+ valores
inventados que no procedían de ningún store. Se reescribió como **superficie derivada**
del `pedidosStore` y se cerraron las cuatro tareas del encargo —sin tocar el contrato de
dominio ni el contrato público de ningún store.

En el camino apareció un **defecto P0 real** que no era cosmético: el store indexaba
fechas con **dos convenciones incompatibles** (día UTC vs día local), lo que hacía que las
métricas diarias divergieran entre las **19:00 y las 23:59** locales (UTC−5). Ese defecto
explicaba **4 tests rojos** en un árbol limpio. Se corrigió en la raíz (alcance acordado
con el usuario) y la suite pasó de **253/257 con 4 fallos** a **370/370 verde**.

### Puertas de verificación

| Puerta | Antes | Después |
|---|---|---|
| `vitest run` | 14 archivos · **4 fallos / 257** | **20 archivos · 375 / 375 ✅** |
| `tsc --noEmit` | 12 errores (refactor `turnos`/`agendamiento`) | **12 errores — exactamente la línea base · 0 en archivos tocados ✅** |
| `vite build` | — | **✓ 301 módulos · 1 347 kB (371 kB gzip) ✅** |
| Arranque en caliente (CDP) | — | **53 aserciones · 0 fallos · 0 excepciones de runtime ✅** |

> `vitest` pasó de 19 a 20 archivos y de 370 a 375 tests entre mediciones porque **hay
> trabajo en paralelo en el repo durante esta sesión**. Verificado por archivo: ninguno de
> los archivos añadidos es de este encargo.

---

## 2. Matriz de consistencia

Una fila por elemento renderizado. `Veredicto` ∈ {**OK** (deriva del store),
**REPARADO** (era un defecto, ya corregido), **EVIDENCIA** (defecto ajeno al encargo)}.

| Superficie | Elemento | Valor mostrado | Fuente de verdad | Veredicto |
|---|---|---|---|---|
| Analítica | KPI «Total Pedidos» | `7` | `pedidosStore.pedidosEnRango(rango).length` | REPARADO |
| Analítica | KPI «Ticket Promedio» (AOV) | `$…` | `pedidosStore.ticketPromedioVendidoEnRango(rango)` | REPARADO |
| Analítica | KPI «Tasa de Cancelación» | `…%` | `pedidosStore.tasaCancelacionEnRango(rango)` | REPARADO |
| Analítica | KPI «Ingresos por Ventas» | `$…` | `pedidosStore.ingresosVendidosEnRango(rango)` | REPARADO |
| Analítica | Serie «Ventas y cancelaciones» | 7 / 30 puntos | `pedidosStore.serieVentasYCancelaciones(dias)` | REPARADO |
| Analítica | Barras «Ventas por Canal» | WhatsApp / Mostrador | `pedidosStore.porOrigenEnRango(rango)` + `ORIGEN_LABEL` | REPARADO |
| Analítica | Cuotas porcentuales del canal | `nn %` (suma 100) | `pedidosStore.repartirPorcentaje(...)` | REPARADO |
| Analítica | Barras «Pedidos por Modalidad» | Domicilio / Retiro / En sitio | `pedidosStore.porModalidadEnRango(rango)` + `MODALIDAD_LABEL` | REPARADO |
| Analítica | Barras «Pedidos por Estado» | 8 estados del pipeline | `pedidosStore.conteoPorEstadoEnRango(rango)` + `ESTADO_LABEL` | REPARADO |
| Analítica | Bloque «Ahora mismo» | en curso + tiempo de ciclo | `pedidosStore` (`enCurso`, `tiempoCiclo`) | OK |
| Analítica | Selector de periodo (trigger) | «Últimos 7 días» | `analitica.utils.OPCIONES_PERIODO` | REPARADO |
| Analítica | Subtítulo del periodo | rango `dd/mm – dd/mm` | `analitica.utils.etiquetaPeriodo` | REPARADO |
| Lista | Columna «ID Pedido» | `P-001` | `Pedido.numero` | OK |
| Lista | Columna «Cliente» | nombre | `Pedido.cliente` | OK |
| Lista | Columna «Teléfono» | `+57…` | `Pedido.telefono` | OK |
| Lista | Columna «Canal» | `WhatsApp` / `Mostrador` | `pedidosStore.origenLabel(p.origen)` + `ORIGEN_LABEL` | REPARADO |
| Lista | Columna «Modalidad» | `Domicilio` / `Retiro` | `pedidosStore.modalidadLabel(p.modalidad)` | REPARADO |
| Lista | Columna «Monto Total» | `$…` | `pedidosStore.totalPedido(p)` (deriva de `items[].precio`) | REPARADO |
| Lista | Columna «Estado» | badge | `ESTADO_LABEL` + variante de `Badge` | REPARADO |
| Lista | Columna «Fecha» | fecha local | `analitica.utils.ymdLocal(p.createdAt)` | REPARADO |
| Lista | Paginador | `1–10 de 7` | `analitica.utils.paginar` | REPARADO |
| Lista | Buscador | filtra filas | `analitica.utils.filtrarLista` | REPARADO |
| Lista | Selector de estado | filtro rápido | `pedidosStore.estados` | REPARADO |
| Ambas | Botón «Descargar CSV» | descarga | `analitica.utils.{construirCsv, filasCsv, descargarCsv}` | REPARADO |
| Ambas | Etiquetas de estado | `En preparación`… | `pedidosStore.estadoLabel` | OK |
| Ambos | Título de página / meta | — | `PageMeta` del shell | OK |

### Valores fabricados eliminados (todos REPARADO → ausente)

`totalPedidos + 2792` · `€123,927.85` · `1,571` · `835` · `2,792` · medidor `3 271/4 182`
· bloque de tráfico `€11,596 / €5.4 / 7 574 183 / 60 784` · `salesByRegion` · embudo
inventado `Leads / Add to cart / Checkout / Deals` · 19 barras `equalizerBars` ·
`trafficChannels` · marca `Redondo Brand` · píldora inerte `Last 7 days`. Todos están
**verificados ausentes** por la Fase 1 del arranque en caliente.

---

## 3. Hallazgos por severidad

### P0 — Indexación de fecha con dos convenciones (split truth temporal)

**Clase de defecto:** *split truth*. **Síntoma:** 4 tests rojos en un árbol limpio y
métricas diarias que mienten 5 h al día.

`pedidos.store.ts` indexaba con **día UTC** (`p.createdAt.slice(0, 10)`) en las líneas
573 / 594 / 618 y con `p.finishedAt.slice(0, 10)` en la 537, mientras que `ingresosEntre`
(línea 711) y `pedidos.tool-provider.ts` (`aFechaLocalYmd`) usaban **día local**.

Reproducción empírica (UTC−5):

```
19:30 local → local 2026-09-17  vs  UTC 2026-09-18   *** DIVERGEN ***
… hasta las 23:30
```

**Ventana de divergencia: 19:00–23:59 local.** `ingresosEntre`, los dos tests de
`getVentasPeriodo` y `assistant.store.multiconv` caían dentro de ella.

**Reparación (presentación/derivación, sin cambiar el contrato):** se añadieron los
helpers de módulo `ymdLocal`, `ymdDeDate` y `recorrerDias`, y se convirtieron los **6
puntos de indexación** a día local. `volumenEntre` e `ingresosEntre` se reescribieron
sobre `recorrerDias` (con guarda de 400 iteraciones).

> Decisión del usuario: **«Arreglar solo lo que bloquea el encargo»** → alcance acotado.

### P1 — 20+ valores fabricados sin fuente de verdad

**Clase de defecto:** *derived inline* / *hardcoded vocabulary*. Toda la página. El valor
`totalPedidos + 2792` es el caso ejemplar: parece un total, es aritmética inventada sobre
una constante. Reparado por reescritura completa (§ lista de eliminados).

### P1 — Falta de vocabulario de dominio para `origen`

**Clase de defecto:** *cross-module vocabulary mismatch* (latente). El tipo del campo era
una unión anónima y **no existía etiqueta** para `whatsapp`/`operador`. La página habría
tenido que inventar `"WhatsApp"`/`"Mostrador"` en línea. Se promovió `Origen` a tipo
exportado y se añadieron `ORIGEN_LABEL`, `ORIGEN_ORDEN` y `origenLabel()`; `porOrigen()`
pasó a devolver `{ origen: Origen; total: number }[]` en vez de `string`.

### P2 — Ausencia de selectores con rango

**Clase de defecto:** *orphan value* (hueco, no error). Ninguna superficie podía pedir
métricas por ventana temporal sin recalcularlas en el componente. Se añadieron 10
selectores con rango al store (ver § mapa). Decisión del usuario: **«Sí, añadir selectores
con rango»**.

### R1 — `assistant.store.multiconv.test.ts` sigue latente (fuera de encargo)

Construye conversaciones en `now-1h/-2h/-3h` y exige que las tres caigan en «Hoy». Entre
**00:00 y 02:59 local**, `now-3h` cae en el día anterior → el grupo «Hoy» no existe →
`undefined`. Ventana caracterizada; **no se tocó** (módulo `conversaciones`, sin relación
con el encargo). **Es un defecto de diseño del test, no del store.**

### R2 — `historial.utils.ts` duplica su propio `ymdLocal`

Ahora que el store centraliza la convención de día local, la copia local en
`pages/pedidos/historial.utils.ts` es un **olor a split truth**. Fuera del alcance
acordado; se reporta, no se absorbe.

---

## 4. Reparaciones aplicadas

Todas son **presentación / derivación**. Ninguna cambia el contrato público de un store,
ni una regla de negocio, ni un tipo de dominio existente.

| Archivo | Cambio | Por qué es solo presentación |
|---|---|---|
| `src/stores/pedidos.store.ts` | Helpers `ymdLocal`/`ymdDeDate`/`recorrerDias`; 6 puntos de indexación a día local | Unifica el *cálculo de cubeta*, no el contrato. Las firmas públicas no cambian. |
| `src/stores/pedidos.store.ts` | `Origen` exportado; `ORIGEN_LABEL`/`ORIGEN_ORDEN`; `origenLabel()`; `porOrigen()` tipado | Añade vocabulario que faltaba. `porOrigen()` solo estrecha el tipo (`string` → `Origen`). |
| `src/stores/pedidos.store.ts` | 10 selectores con rango + `repartirPorcentaje()` | Adiciones puras; `ticketPromedioEntregado()` queda intacto (métrica distinta por diseño). |
| `src/pages/pedidos/analitica.utils.ts` | **Nuevo.** Helpers puros (periodo, orden, paginación, CSV) | Sigue el precedente de `historial.utils.ts`: la lógica de vista no vive en el componente. |
| `src/pages/pedidos/AnaliticaPage.tsx` | Reescritura (843 → 703 líneas) | Exclusivamente consumo del store y del catálogo. |
| `src/stores/pedidos.store.test.ts` | +19 tests del bloque «analítica por rango» | Evidencia para los selectores nuevos. |
| `src/pages/pedidos/analitica.utils.test.ts` | **Nuevo.** 41 tests | Evidencia para los helpers puros. |

---

## 5. Design DSL

**No hay Design DSL que mostrar.** La superficie se reconstruyó con componentes del
catálogo ya presentes en el repo; no se ejecutó el flujo de asesoría (ver § 9, desviación
D1), así que no se generó ningún documento DSL que pudiera reproducirse literalmente.
Se declara explícitamente en vez de inventar uno.

---

## 6. Intención → componente

| Intención | Componente elegido | Alternativas descartadas | Razón |
|---|---|---|---|
| Conmutador Métricas / Lista | `Button` × `role="tab"` | `Tabs`, `ButtonsGroup` | `ButtonsGroup` fija `min-w-[393px]`/`min-w-[309px]`: rompe el encabezado. Los `Button` con `role="tab"` dan semántica correcta sin anchos rígidos. |
| Selector de periodo | `Dropdown` + `DropdownItem` | `Select` nativo | El `Dropdown` del catálogo admite el estilo de la identidad; el `Select` es un control de formulario, no un *menu button*. |
| Exportar | `Button` + `DownloadIcon` | `ExportButton` | **`ExportButton` no existe en el catálogo.** Ver hueco C2. |
| Tabla de pedidos | `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableCell` | tabla a mano, `ag-grid` | Regla de oro: nada que el catálogo pueda dar se escribe a mano. |
| Orden / paginación | `analitica.utils` **sobre** el `Table` | — | El `Table` del catálogo **no trae orden ni paginación**. Ver hueco C1. Decisión del usuario: **«Ordenar/paginar sobre el Table canónico»**. |
| Badge de canal / estado | `Badge` | texto plano | Ya está en el catálogo y expresa variantes semánticas. |
| Buscador | `Input` | `input` a mano | Catálogo. |
| Filtro rápido de estado | `Select` | — | Catálogo. **Es no controlado**: ver hueco C3. |
| KPI y barras | `Card` + `Chart` (Apex) | `Stat`, `Gauge` | `Card` ya es la unidad de panel del módulo. |
| Paneles | `Card` | `Panel` | `Card` es el patrón existente en `pedidos`. |

---

## 7. Manifiesto del paquete

No se empaquetó ningún bundle nuevo: los componentes consumidos **ya estaban vendorizados
en el repo** (`src/elements/`, con anotaciones de procedencia `@kgId`). No se instaló,
importó ni escribió ningún componente fuera del catálogo.

Archivos entregados:

```
packages/apps/web/modules/app/src/pages/pedidos/AnaliticaPage.tsx        703 líneas (reescrito)
packages/apps/web/modules/app/src/pages/pedidos/analitica.utils.ts       314 líneas (nuevo)
packages/apps/web/modules/app/src/pages/pedidos/analitica.utils.test.ts  350 líneas (nuevo)
packages/apps/web/modules/app/src/stores/pedidos.store.ts              1 304 líneas (+~120)
packages/apps/web/modules/app/src/stores/pedidos.store.test.ts           864 líneas (+19 tests)
```

Evidencia de verificación (andamiaje, no entregable):

```
outputs/analitica-verify/verify.mjs          53 aserciones, 7 fases
outputs/analitica-verify/out5.log            salida verde
outputs/analitica-verify/artifacts/*.png     5 capturas
```

---

## 8. Mapa estado → store

Cada región de la superficie, su valor de dominio y el selector que lo produce.

| Región | Valor de dominio | Getter del store / entrada de catálogo |
|---|---|---|
| KPI Total Pedidos | conteo de pedidos en la ventana | `pedidosEnRango(rango).length` |
| KPI Ticket Promedio | ingresos vendidos / pedidos vendidos | `ticketPromedioVendidoEnRango(rango)` |
| KPI Tasa de Cancelación | cancelados / total | `tasaCancelacionEnRango(rango)` |
| KPI Ingresos por Ventas | suma de pedidos vendidos | `ingresosVendidosEnRango(rango)` |
| Serie del gráfico | ventas y cancelaciones por día | `serieVentasYCancelaciones(dias)` |
| Barras de canal | agrupación por `origen` | `porOrigenEnRango(rango)` + `ORIGEN_LABEL` |
| Cuota de canal | reparto a 100 % sin sesgo | `repartirPorcentaje(valores)` |
| Barras de modalidad | agrupación por `modalidad` | `porModalidadEnRango(rango)` + `MODALIDAD_LABEL` |
| Barras de estado | conteo por estado | `conteoPorEstadoEnRango(rango)` + `ESTADO_LABEL` |
| «Ahora mismo» | en curso / tiempo de ciclo | `enCurso` · `tiempoCiclo` |
| Encabezado de la lista | 8 nombres de columna | `analitica.utils.CSV_ENCABEZADOS` |
| Filas de la lista | pedidos ordenados y paginados | `ordenarLista(paginar(filtrarLista(...)))` |
| Celda Canal | etiqueta de canal | `origenLabel(p.origen)` |
| Celda Modalidad | etiqueta de modalidad | `modalidadLabel(p.modalidad)` |
| Celda Monto Total | total derivado de ítems | `totalPedido(p)` |
| Celda Estado | etiqueta + variante | `estadoLabel(p.estado)` + `ESTADO_VARIANTE` |
| Celda Fecha | día local del pedido | `analitica.utils.ymdLocal(p.createdAt)` |
| CSV | 8 columnas con escapado | `construirCsv(CSV_ENCABEZADOS, filasCsv(...))` |
| Nombre del archivo | `stockflow-analitica-YYYY-MM-DD.csv` | `nombreArchivoCsv()` |

**Regiones sin resolver: ninguna.** No queda ningún valor en la superficie que se calcule
en línea o se tome de un literal de negocio.

---

## 9. Evidencia de verificación

### 9.1 Suite de tests (la prueba de «dos superficies coinciden»)

```
Test Files  19 passed (19)
     Tests  370 passed (370)
  Duration  17.28s
```

Línea base del árbol limpio: `14 archivos · 4 fallos / 257`. Los 4 fallos eran el defecto
P0 § 3. **+113 tests** respecto de la línea base, todos verdes.

Los 19 tests nuevos del store prueban, entre otras cosas, que **`ingresosEntre` y
`serieVentasYCancelaciones` coinciden** en la misma ventana — es la aserción que
demuestra que las dos superficies ya leen la misma cubeta temporal.

### 9.2 Arranque en caliente (Chrome DevTools Protocol)

`outputs/analitica-verify/verify.mjs` — 7 fases, 53 aserciones, **53 OK / 0 FAIL**,
**`RUNTIME ERRORS: (none)`**.

Lo que se probó de verdad, no de forma superficial:

- Las 4 tarjetas KPI se renderizan desde el store.
- **14 comprobaciones de ausencia**: ni `Cart Abandonment`, ni `Profit Margin`, ni
  `Units Sold`, ni `Sales by Region`, ni `Traffic Sources`, ni `Sessions`, ni
  `Marketing Spend`, ni `Redondo Brand`, ni la píldora `Last 7 days`.
- El desplegable se abre con **exactamente 3 opciones** y el trigger pasa a
  «Todo el historial».
- **El filtro recalcula de verdad**: la serie del gráfico tiene **7 puntos en 7d** y
  **30 puntos en 30d**, y el eje X se reetiqueta. *(Aquí está el matiz interesante: los 7
  pedidos del seed son de hace minutos, así que el conteo de pedidos es 7 en ambas
  ventanas — comparar conteos no habría demostrado nada. Se verificó por la longitud de
  la serie, que es la señal observable que sí depende de la ventana.)*
- La tabla tiene **exactamente las 8 columnas** pedidas y **7 filas** del seed.
- La columna Canal usa el vocabulario del catálogo (`WhatsApp`/`Mostrador`) y Monto Total
  trae importes reales.
- Buscar → 0 filas con estado vacío; limpiar → 7 filas; ordenar por Cliente ordena.
- El CSV arranca con el encabezado de 8 columnas, **separador CRLF**, **7 filas de datos**,
  **8 campos por fila**.
- **El escapado aguanta**: se invocó la utilidad real del bundle con un cliente
  `Pérez, "El Jefe"` y produjo `"Pérez, ""El Jefe"""` **en una sola fila** — que es
  exactamente lo que rompería si el escapado fallara.
- El nombre del archivo es `stockflow-analitica-<fecha local de hoy>.csv`.
- Volver a Métricas quita la tabla y renderiza el gráfico.

Capturas: `01-metricas`, `02-periodo-todo`, `02b-periodo-30d`, `03-vista-lista`,
`04-busqueda-orden`.

### 9.3 Typecheck

12 errores, **la línea base exacta**, todos del refactor en vuelo que dejó `Modulo`
reducido a `"pedidos"` (archivos `operador/*`, `seleccionar/*`, `session.store.test`,
`operadores.store*`, `assistant.store.test`). **Cero errores en archivos que toqué.**

---

## 10. Huecos del catálogo y preguntas abiertas

### Huecos del catálogo (reportados, no absorbidos)

**C1 — `Table` no trae orden ni paginación.** Su propio docstring lo dice: *«Primitive
wrapper — no built-in sort, filter, or pagination. See `TECH_DEBT.md`»*. **Ese
`TECH_DEBT.md` no existe** en la raíz del módulo. Se construyeron orden y paginación
**encima** del `Table` canónico (opción elegida por el usuario), lo cual respeta la regla
«no escribas a mano lo que el catálogo pueda darte» sin fingir que el catálogo ya lo da.

**C2 — `ExportButton` no existe.** El encargo lo pedía junto con `DownloadIcon`. En
`src/elements/` **no hay** `ExportButton`; solo existe `DownloadIcon` en `src/icons/`.
Se compuso la intención con el `Button` canónico + `DownloadIcon`, que es el patrón de
catálogo más cercano. Un `ExportButton` canónico sería una adición razonable al catálogo.

**C3 — `Select` es no controlado y no acepta `value`.** Se sincroniza remontándolo con
`key`. Es frágil: cualquier estado externo que deba reflejarse en el `Select` obliga al
mismo truco. Un `Select` controlable (o un `value` opcional) eliminaría la clase entera.

### Desviación declarada

**D1 — El flujo de asesoría MCP (`ui_dsl` → `ui_requirement` → `ui_discovery` →
`ui_refine` → `ui_implement`) no está disponible en este entorno.** La doctrina lo exige
como orden fijo; aquí no se pudo ejecutar. En lugar de improvisar componentes, se
consumió el **catálogo vendorizado en el repo** (`src/elements/`, con procedencia `@kgId`),
que es la misma fuente que el flujo habría seleccionado. Consecuencia: no hay Design DSL
(§ 5) ni manifiesto de bundle nuevo (§ 7). Se reporta como desviación, no se disimula.

### Preguntas abiertas

1. **`assistant.store.multiconv.test.ts`** (R1) falla entre 00:00 y 02:59 local. Es un
   defecto del test, no del store. ¿Se corrige en un encargo aparte?
2. **`historial.utils.ts`** (R2) mantiene su propio `ymdLocal`. ¿Se importa el del store?
3. **`ticketPromedioEntregado()`** sigue existiendo con una definición distinta de
   `ticketPromedioVendidoEnRango()`. Se dejó intacto por diseño (métricas distintas), pero
   **dos selectores de «ticket promedio» en el mismo store es una invitación a que alguien
   use el equivocado**. ¿Se renombra para desambiguar?
4. **`TECH_DEBT.md` no existe** aunque el `Table` lo cita. ¿Se crea, o se corrige la
   referencia?
5. **Los 12 errores de typecheck** son de un refactor de `turnos`/`agendamiento` en vuelo,
   ajenos a este encargo. Quedan como estaban.

---

## 11. Conclusión

`/pedidos/analitica` ya no inventa nada: **cada valor de la pantalla tiene un selector
detrás**, la vista lista reutiliza el `Table` canónico, el CSV sale de una utilidad pura y
probada, y el filtro de periodo recalcula de verdad —verificado por la longitud de la
serie, no por un conteo que casualmente coincidía.

El resultado que más importa no es la página: es que **la suite pasó de 4 fallos a 370
verdes** porque el encargo destapó un defecto de cubetas temporales que llevaba tiempo
haciendo mentir a las métricas diarias cinco horas al día.
