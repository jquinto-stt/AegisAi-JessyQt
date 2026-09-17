# Auditoría de animaciones — NECTO / StockFlow

**Fecha:** 2026-09-17
**Alcance:** `packages/apps/web/modules/app/src/` (238 archivos `.ts/.tsx/.css`, ~22 600 LOC en `pages/` + `elements/` + `shell/`)
**Pregunta:** ¿dónde se pueden agregar animaciones Tailwind en todo el diseño?
**Método:** inventario por grep sobre el árbol autoritativo + lectura de los componentes de catálogo.

> **Estado:** este documento nació como auditoría (sin ediciones) y se ha **corregido y ampliado**
> después de implementar el trabajo. Ver §6 para lo hecho y §7 para las erratas que se corrigieron.

---

## 0. Veredicto

La afirmación *"esa parte no se ha implementado en lo más mínimo"* es **direccionalmente correcta pero no literal**, y la distinción importa porque cambia el trabajo:

| | Existía | Faltaba |
|---|---|---|
| **Micro-interacción de hover/focus** | Sí, y abundante — **116 `transition-colors`**, 31 `transition-all`, 7 `transition-transform` | Nada relevante. Esta capa estaba sana. |
| **Animación de entrada/salida** | **1** superficie: `ChatDrawer` | **Todas las demás.** Modal (8 consumidores), Dropdown (6), Tab (1), toasts, cambio de sección, cambio de vista. |
| **Animación de layout / reordenamiento** | 1: el submenú del sidebar (`height` 0→N px) | Kanban, listas, tablas, bandeja, hilo de chat. |
| **Vocabulario de movimiento compartido** | **0 tokens.** Cero `--animate-*` en `theme.css` | Todo era valor arbitrario de un solo uso. |
| **`prefers-reduced-motion`** | **1** de ~10 animaciones lo respetaba | El resto, incluidas las infinitas, lo ignoran. |

**Causa raíz, en una línea:** el proyecto usa Tailwind v4 (`tailwindcss@4.0.15`) pero `css/theme.css` define `--color-*`, `--text-*`, `--shadow-*`, `--breakpoint-*`, `--z-index-*`… y **ni un solo `--animate-*`**. Sin tokens de movimiento, cada animación es un arbitrario aislado, y por eso solo existían las dos que alguien escribió a mano con mucha ceremonia.

---

## 1. Inventario verificado — lo que había

### 1.1 Keyframes globales (2, ambos en `css/base.css`)

| Keyframe | Línea | Consumidor | Estado |
|---|---|---|---|
| `@keyframes wiggle` | `base.css:29` | `pages/pedidos/InicioPage.tsx:207` — `animate-[wiggle_1.2s_ease-in-out_infinite]` en la campana de "requieren atención" | Funciona, pero **fuera del sistema de tokens**: se invoca como arbitrario porque no está declarado en `@theme` |
| `@keyframes paneo-entrada` | `base.css:58` + clase `.paneo-entrada` | `pages/asistente/AsistentePage.tsx:218` — entrada de la tarjeta de artefactos | **El patrón de referencia del repo.** 420 ms, `cubic-bezier(0.22,1,0.36,1)`, `backwards` (no `both`), guardado con `@media (prefers-reduced-motion: reduce)` |

### 1.2 Animaciones utilitarias de Tailwind (9 usos)

| Utilidad | N | Dónde |
|---|---|---|
| `animate-pulse` | 4 | `SpreadsheetCanvasView.tsx:153` (esqueleto), `ChatThread.tsx:52` (puntos de "escribiendo"), `AnaliticaPage.tsx:581` (icono IA), `EquipoTabla.tsx:163` (punto de aviso) |
| `animate-ping` | 3 | `SpreadsheetCanvasView.tsx:68` (punto "en vivo"), `AnaliticaPage.tsx:878`, `shell/header/NotificationDropdown.tsx:36` (badge de campana) |
| `animate-spin` | 2 | `Button.tsx:248` (estado de carga), `pages/asistente/views/Composer.tsx:105` |

Estas tres **comunican estado** (cargando, en vivo, escribiendo). Por eso la guarda de `reduced-motion` de §3.3 las excluye explícitamente: neutralizarlas borraría información, no movimiento.

### 1.3 La única transición de estado real: `ChatDrawer`

`pages/conversaciones/components/ChatDrawer.tsx:100-155` implementa a mano el ciclo montar → pintar → animar:

```tsx
const [visible, setVisible] = useState(false);
useEffect(() => {
  if (!abierto) { setVisible(false); return; }
  const id = requestAnimationFrame(() => setVisible(true));   // frame: sin esto
  return () => cancelAnimationFrame(id);                       // no se ve el deslizamiento
}, [abierto]);
```

Con `translate-x-full → translate-x-0` + `transition-transform duration-300 ease-out`, y el scrim en `transition-opacity duration-300`. **Era el único lugar del repo donde alguien había resuelto el problema de "animar la entrada de un overlay montado condicionalmente".**

> **Matiz que la auditoría no hacía y que la implementación sí:** ese `requestAnimationFrame` **solo hace falta para transiciones**. Una animación `@keyframes` arranca sola cuando se aplica la clase, y su estado inicial está garantizado por `animation-fill-mode: backwards`. Es decir: el patrón de `ChatDrawer` no era el que necesitaban los overlays; se podía resolver con CSS puro y sin rAF.

### 1.4 Ausencias documentadas en el propio catálogo

Los componentes de `elements/ui/` **declaran sus limitaciones en el JSDoc**. Estas no eran suposiciones:

- `elements/ui/modal/Modal.tsx` → *"**Limitations:** No animation/transition on open/close."* → **8 consumidores**: `ChatDrawer`, `PanelContexto`, `HistorialAtencionPage`, `EquipoPage`, `HistorialPage`, `InicioPage`, `ProgramarModal`, `TableroPage`.
- `elements/ui/dropdown/Dropdown.tsx` → *"**Limitations:** … No keyboard navigation"* + `if (!isOpen) return null;` → **imposible animar la salida sin reestructurar**. **6 consumidores**.
- `elements/ui/notification/Notification.tsx` → *"**Limitations:** Toast uses internal `useState` for visibility"*. Además el toast tiene un **bug**: `handleClose` hace `setIsVisible(false)` y luego `setTimeout(() => setIsVisible(true), hideDuration)` — se vuelve a mostrar solo. Y **0 consumidores**: es código muerto.
- `elements/ui/tabs/Tab.tsx` → *"**Limitations:** No lazy rendering of tab content"*. Solo `transition-colors`; el indicador activo **saltaba** en las 3 variantes. **1 consumidor** (`EquipoPage`, `variant="underline"`).
- `elements/ui/chart/Chart.tsx` → hacía deep-merge de defaults temáticos (`grid`, `xaxis`, `legend`, `tooltip`) pero **nunca tocaba la animación**. ApexCharts trae animación por defecto (~800 ms): **el único sitio que animaba sin que nadie lo hubiera decidido**.

### 1.5 Dependencias declaradas y sin usar (verificado)

`react-dnd` **0 usos** · `react-dropzone` **0** · `swiper` **0** · `simplebar-react` **0** · `prismjs` **0** · `@fullcalendar/*` **0**. (`apexcharts` 6, `flatpickr` 2.)

`react-dnd` + `react-dnd-html5-backend` merecen mención: el Kanban del Tablero **no es arrastrable** pese a tener las librerías instaladas, y el comentario de `TableroPage.tsx:1340` dice *"no bloquea el arrastre de tarjetas del Kanban"* — describe una capacidad que no existe.

---

## 2. Mapa de oportunidades, por superficie

Prioridad = impacto percibido ÷ riesgo de romper el contrato de acceso o los anclajes `data-*` que leen los arneses (`outputs/*/verify.mjs` leen `data-perfil`, `data-area`, `data-dir` — **nada de lo implementado los toca**).

### P0 — Overlays (el 100 % de las capas modales del producto)

| Superficie | Archivo:línea | Movimiento | Resultado |
|---|---|---|---|
| `Modal` | `elements/ui/modal/Modal.tsx:180-200` | Backdrop `opacity 0→1`; panel `opacity 0→1` + `scale 0.97→1` + `translate-y-2→0`, 200 ms. **Un solo cambio → 8 pantallas.** | ✅ Entrada. **Salida descartada a propósito** — ver §6.2 |
| `Dropdown` | `elements/ui/dropdown/Dropdown.tsx:150-160` | `opacity 0→1` + `translate-y-1→0` + `scale 0.98→1`, 140 ms, `origin-top-right`. **→ 6 pantallas.** | ✅ Entrada **y salida** |
| `ChatDrawer` | `ChatDrawer.tsx:143,151` | Ya estaba. Solo le faltaba el `prefers-reduced-motion` que sí tenía `.paneo-entrada`. | ✅ Guardado en `base.css` |
| Toasts (`Notification`) | `Notification.tsx:171-235` | Entrada `translate-x-4→0` + fade; salida real. | ⛔ **No se tocó**: 0 consumidores. Arreglar el bug del `setTimeout` o retirarlo, primero |

### P1 — Cambios de estado con salto (navegación interna)

| Superficie | Archivo:línea | Movimiento | Resultado |
|---|---|---|---|
| `Tab` | `elements/ui/tabs/Tab.tsx:150-260` | Indicador **deslizante** en la barra de 2 px. | ✅ Solo variante `underline` — ver §6.3 |
| Sidebar colapsar/expandir | `shell/sidebar/BaseAppSidebar.tsx:41-63` | El ancho ya transicionaba, pero `{showExpanded ? logo : logoCollapsed}` se intercambiaba en seco. | ✅ Fade con `key` (crossfade real descartado — ver §6.4) |
| Toggle de tema | `shell/header/theme-toggle-button/ThemeToggleButton.tsx:28-64` | `hidden dark:block` no es animable (`display` no tiene estados intermedios). Iconos superpuestos con `rotate/scale/opacity`. | ✅ Giro de 300 ms |
| Cambio de sección de config | `pages/conversaciones/ConfigPage.tsx`, `pages/asistente/ConfigPage.tsx` | Panel sustituido en seco. | ✅ Fade con `key={seccion}` |
| Kanban ↔ Lista | `pages/pedidos/TableroPage.tsx` (`VistaToggle`) | Dos vistas que se desmontan mutuamente sin transición. | ✅ Fade en la raíz de cada rama |
| Cambio de conversación | `pages/conversaciones/ConversacionesPage.tsx:95` | **Corregido respecto a la auditoría:** el contenedor del ancho ya animaba; lo que saltaba era el **hilo nuevo**. | ✅ Fade con `key={seleccionadaId}` |

### P2 — Listas y datos (mayor volumen, mayor retorno visual)

Ninguna lista del producto tenía animación de entrada. Todas eran candidatas a **stagger** (retardo escalonado por índice, tope ~6 elementos):

| Superficie | Archivo:línea | Resultado |
|---|---|---|
| Tarjetas del Kanban | `TableroPage.tsx` (`pedidosDeColumna`) | ✅ Stagger por columna, envolviendo `PedidoCard` sin tocarlo |
| `ListaView` | `TableroPage.tsx:962` | ✅ Stagger por fila + fade de la vista |
| Bandeja de conversaciones | `components/BandejaLista.tsx` | ✅ Stagger por fila |
| Hilo de chat | `components/ChatView.tsx`, `views/MessageBubble.tsx` | ✅ Entrada por burbuja, **sin stagger** (ver §6.5) |
| Historial de atención | `pages/conversaciones/HistorialAtencionPage.tsx` | ✅ Stagger por fila, calculado **sobre la página**, no sobre el ticket global |
| Equipo | `pages/pedidos/equipo/EquipoTabla.tsx` | ✅ Entrada **sin** stagger (las filas van agrupadas por rol) |
| KPIs de Inicio | `pages/pedidos/InicioPage.tsx` (`KpiCard`) | ✅ Stagger de 4 tarjetas |
| Métricas de Analítica | `pages/pedidos/AnaliticaPage.tsx:112` (`KpiCard`) | ✅ Stagger de 6 tarjetas |
| Sugerencias del asistente | `pages/asistente/AsistentePage.tsx` (`SuggestionCard`) | ✅ Stagger de 3 tarjetas |
| Programados | `TableroPage.tsx` (`ProgramadoCard`) | ⏳ **No hecho.** Ya tiene `focusId` + `scrollIntoView`; animar el resaltado es una tarea aparte |
| `MetricCard` | `compositions/metric-card/MetricCard.tsx` | ⛔ **Código muerto: 0 consumidores.** La auditoría lo llamaba *"el átomo que heredan todos"*. Falso. Se animaron las dos rejillas reales |

### P3 — Gráficos (ApexCharts)

`Chart.tsx` no configuraba la animación. ApexCharts anima por defecto, así que **el producto ya animaba gráficos, pero sin control ni conciencia de tema**. ✅ Resuelto en un solo sitio, con la API real (ver §6.6):

- `chart: { animations: { enabled: !prefersReducedMotion, speed: 600, animateGradually: { enabled: true, delay: 80 }, dynamicAnimation: { enabled: true, speed: 350 } } }` en `Chart.tsx`, compartido por las dos ramas de tema.
- Los 4 `ApexOptions` de `AnaliticaPage.tsx` (sparkline, barras de volumen, apiladas, donut) heredan la decisión. **Antes cada uno la ignoraba por separado.**
- `ChartCanvasView.tsx:85` ya tenía `transition-all duration-500` en el ancho de barra — el único gráfico con animación explícita.

### P4 — Superficies menores

- `elements/common/CountdownTimer.tsx:60-80` — el dígito de segundos cambia en seco; un `animate-` de `scale` de 100 ms lo suaviza. ⏳ **No hecho.**
- `pages/seleccionar/SeleccionarPage.tsx:146-147` — los puntos de paso ya animan `width`; el paso activo podría además pulsar. ⏳ **No hecho.**
- `pages/pedidos/HistorialPage.tsx:385` — `hover:scale-110` en el botón de copiar; coherente con lo que ya hay. ✅ Ya estaba.

---

## 3. Infraestructura creada

### 3.1 Tokens de movimiento en `css/theme.css`

Tailwind v4 declara animaciones como `--animate-<nombre>` + `@keyframes` dentro de `@theme`. Se declararon **5** (no los 5 especulativos del borrador original):

```css
--animate-aparecer:        aparecer 200ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
--animate-entrada-panel:   entrada-panel 200ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
--animate-entrada-menu:    entrada-menu 140ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
--animate-salida-menu:     salida-menu 120ms ease-in forwards;
--animate-entrada-lista:   entrada-lista 240ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
```

`entrada-lista` es la única sin `scale`: una lista escalada se lee como "rebote", no como "aparece".

### 3.2 Escala de duración y easing

Tres duraciones (**140 / 200 / 240 ms**) y dos curvas: la de entrada reutiliza el `cubic-bezier(0.22, 1, 0.36, 1)` del `paneo-entrada`; la de salida es `ease-in` a propósito (una salida debe acelerar, no frenar).

### 3.3 Guarda de `prefers-reduced-motion` — **enumerada, no universal**

El borrador de esta auditoría proponía un `* { animation-duration: 0.01ms !important }` universal. **Se descartó**: eso mataría `animate-spin` / `animate-ping` / `animate-pulse`, que *comunican estado* (cargando, en vivo, escribiendo). Quitar esas animaciones borra información, no movimiento.

Lo implementado enumera las clases que sí deben apagarse:

```css
@media (prefers-reduced-motion: reduce) {
  .paneo-entrada,
  .animate-aparecer,
  .animate-entrada-panel,
  .animate-entrada-menu,
  .animate-salida-menu,
  .animate-entrada-lista {
    animation: none;
  }
}
```

### 3.4 Helper de montaje animado — `src/hooks/useMontajeAnimado.ts`

Extrae el patrón de `ChatDrawer` a un hook, pero **sin `requestAnimationFrame`** (§1.3): usa `useLayoutEffect` y una bandera `saliendo` derivada, con `montado = abierto || saliendo`. Un ref `haEstadoAbierto` evita que un hook montado ya cerrado abra una ventana de salida.

`DURACION_SALIDA_MS = 120` se exporta para que el CSS y el JS no se desincronicen.

### 3.5 Helpers transversales en `src/utils/index.ts`

- `retardoEscalonado(indice, pasoMs = 40, tope = 6)` → `"80ms"`. El tope existe para que una lista de 60 filas no tarde 2,4 s en terminar de entrar.
- `prefiereMenosMovimiento()` → lo que ApexCharts no puede saber por sí solo (no conoce media queries).

---

## 4. Reglas que el trabajo respetó

1. **`.git/` se corrompe en este sandbox** y `vite build` falla sobre un `dist/` existente. Compilar siempre a `--outDir dist-vN --emptyOutDir=false`.
2. **Los arneses leen `data-perfil` / `data-area` / `data-dir`**. Añadir `data-*` nuevos para verificar animaciones es correcto; quitar los existentes, no.
3. **Nunca dos `Edit` sobre el MISMO archivo en un solo mensaje** — se pisan y ambos reportan éxito; el fallo solo aparece después en `tsc`. Archivos distintos en paralelo sí son seguros.
4. **Línea base de `tsc`: 15 errores en 8 archivos**, todos del choque `Modulo = "pedidos"` vs. los módulos que mencionan el seed y la UI. Medir el delta **por archivo**, nunca por total.
5. **El contrato de acceso manda sobre el código.** Una animación no cambia *qué* se ve (eso lo decide `capacidadesEfectivas`), solo *cómo aparece*. No usar una transición para ocultar un control que el rol no puede ejecutar — la regla sigue siendo **ocultar**, no desvanecer.
6. **`overflow-x-clip` en `AsistentePage.tsx:218` no es decorativo.** El paneo desplaza 32 px y sin él desborda el documento 4 px y parpadea la barra de scroll.
7. **`backwards`, no `both`.** Documentado en `base.css:52-57`: `both` deja vivo un `transform`, lo que convierte la tarjeta en bloque contenedor de sus descendientes.
8. **Una animación de entrada necesita remontaje**, o React reutiliza el nodo y no se vuelve a disparar. Hay **dos** formas, y elegir mal es un bug:
   - `key` explícita cuando el tipo de elemento no cambia (`key={seccion}`, `key={seleccionadaId}`).
   - **Nada**, cuando el tipo *sí* cambia (`div` ↔ `ListaView`): React ya desmonta. Añadir una `key` o un envoltorio ahí es un nodo de más.

---

## 5. Secuencia ejecutada

| Fase | Trabajo | Estado |
|---|---|---|
| **1** | Tokens en `theme.css` + guarda de `reduced-motion` + `useMontajeAnimado` + helpers | ✅ |
| **2** | `Modal` + `Dropdown` + `Chart` (catálogo) | ✅ |
| **3** | Sidebar, toggle de tema, cambio de sección, cambio de vista, cambio de conversación | ✅ |
| **4** | Stagger en las listas de P2 | ✅ (salvo Programados) |
| **5** | `Tab` deslizante | ✅ |
| **6** | Menores de P4 | ⏳ pendiente |

**Verificación:** `tsc` desde `packages/apps/web/modules/app` con **delta 0** (15 preexistentes), `vitest run` sin regresiones, y `vite build` a un `--outDir` nuevo comprobando que las clases `animate-*` y los `@keyframes` llegan al CSS emitido.

---

## 6. Decisiones que se apartan de lo que pedía el borrador

Cada una es un sitio donde el borrador de la auditoría habría producido un defecto.

### 6.1 `Modal` anima la entrada pero **no** la salida

6 de sus 8 consumidores pasan `isOpen` "a pelo" (es decir, `true`) y **desmontan el modal desde el padre**. Animar la salida solo funcionaría en 2 de 8 pantallas: en las otras 6 el panel desaparecería de golpe. Una salida que se ve en el 25 % de los casos es peor que ninguna, porque el usuario no puede predecir cuál va a ver. Se documentó en el JSDoc del componente.

### 6.2 `Dropdown` sí anima la salida — y por eso se pudo

Todos sus consumidores renderizan `<Dropdown isOpen={…}>` de forma permanente, con el estado controlado por el padre. Aquí `useMontajeAnimado` sí tiene sentido. El panel queda montado 120 ms con `pointer-events-none` y `aria-hidden`.

**Antes de tocarlo se leyó el arnés** (`outputs/analitica-verify/verify.mjs`): hace clic en `.dropdown-toggle`, espera 400 ms y **nunca comprueba que el panel se cierre**. La ventana de 120 ms es segura. Si algún día se añade una aserción de cierre, tiene que esperar más de `DURACION_SALIDA_MS`.

### 6.3 `Tab` deslizante solo en la variante `underline`

`Tab` tiene **un** consumidor (`EquipoPage`) y usa `underline`. Las variantes `default` y `vertical` marcan el activo con un **fondo en el propio botón**: deslizarlo obliga a extraer ese fondo a un elemento posicionado y a reescribir el estilo de las tres variantes. Habría sido código que nadie ejecuta y que nadie puede verificar.

Dos trampas que costó encontrar:

- **Bucle de renders.** `EquipoPage` pasa `items={[{…},{…}]}`, un literal nuevo en cada render. Con `items` en las dependencias del efecto, la medición se repetiría sin fin. La dependencia es `claves` (las claves unidas en una cadena), y el `setState` devuelve `prev` si la medida no cambió.
- **`space-x-2` y el indicador.** Tailwind v4 emite `space-x-2` como `margin-inline-end` sobre `:not(:last-child)`. Como el indicador es el **último** hijo, queda excluido y su `translateX` no se desplaza. Verificado en el CSS compilado, no supuesto. (Efecto colateral: el último botón pasa a recibir 8 px de margen final. Invisible aquí —la barra es de ancho completo y no desborda— pero es real.)

### 6.4 Sidebar: fade, no crossfade

Un crossfade de verdad exige montar los **dos** logotipos a la vez. Miden distinto (`logo` es un wordmark de `h-5`; `logoCollapsed` es un cuadrado con borde de `h-10`), así que el bloque mediría el mayor durante la transición y la barra daría un salto vertical a mitad del colapso. Se optó por un fade de entrada con `key`.

### 6.5 El chat no lleva stagger

`retardoEscalonado` es para listas que se pintan **de golpe**. En un chat los mensajes llegan en momentos distintos: retrasarlos por índice haría que el último en llegar esperase medio segundo solo por tener un índice alto. Las burbujas entran con `entrada-lista` sin retardo. Mismo criterio en `EquipoTabla`, donde las filas van agrupadas por rol y un índice por grupo reiniciaría la cascada en cada encabezado.

### 6.6 ApexCharts: la API real no es la que decía el borrador

El borrador proponía `chart.animation` (singular) con `duration` y `easing`. Al aplicarlo, `tsc` dio **TS2561**. La inspección del paquete instalado (`apexcharts@4.7.0`) mostró:

| Clave | Accesos en runtime | Veredicto |
|---|---|---|
| `.animations` (plural) | **42** | La correcta |
| `.animation` (singular) | **0** | La del borrador: no hace nada |
| `animations.speed` | 10 | La correcta (no `duration`) |
| `animations.easing` | **0** | **No existe** en esta versión ni en los tipos |

Se usó la API real y se **omitió `easing`** en lugar de dejar una línea que aparenta configurar algo que no configura.

### 6.7 Cambio de conversación: la `key` tiene una consecuencia asumida

`ConversacionesPage` no tenía ninguna animación que "faltase" en el contenedor —el ancho ya transicionaba—. Lo que saltaba era el **hilo**: React reutilizaba la misma instancia de `ChatView` y solo cambiaba las props. Se añadió `key={seleccionadaId}`, que **remonta** el hilo y por tanto **resetea el scroll a 0**.

Es el mismo punto de partida que ya tenía la primera conversación que se abría, así que el comportamiento queda consistente entre el primer hilo y los siguientes. **Aterrizar en el último mensaje es otra tarea** (exige gestión de scroll) y no se aborda aquí: hacerlo de paso habría convertido un cambio de animación en un cambio de comportamiento no pedido.

---

## 7. Erratas de este informe, corregidas

Se dejan escritas porque afectan a cómo se priorizó el trabajo.

| Decía | Realidad | Causa |
|---|---|---|
| `Tab` tiene **7 consumidores** | **1** (`EquipoPage`) | El grep fue `elements/ui/tab` en minúsculas y también capturaba `elements/ui/table`. El conteo real de `Table` es 6 |
| `MetricCard` es *"el átomo: si se le añade la entrada aquí, la heredan todos sus consumidores"* | **0 consumidores.** Código muerto | No se verificó con grep fuera de su propia carpeta antes de escribir la frase |
| `Modal` (8) + `Dropdown` (6) + `Tab` (7) → **21 puntos de uso** | **15** | Arrastra el error de `Tab` |
| `chart.animation` con `duration` / `easing` | `chart.animations` con `speed`; `easing` no existe | Se escribió desde el recuerdo de la API, no desde el paquete instalado |
| P1 "Colapsar bandeja" (`ConversacionesPage.tsx:79-141`) | El contenedor **ya** animaba el ancho. Lo que saltaba era el hilo | Se asumió el defecto por lectura del JSX sin comprobar qué transicionaba de verdad |

**Lección transversal:** los tres primeros son el mismo fallo — contar por grep aproximado en lugar de por grep anclado a comillas, y no verificar los ceros. Un conteo de consumidores es una afirmación verificable; escribirlo sin verificar convierte una auditoría en una opinión.

---

## Anexo — Resumen numérico

```
ANTES                                  DESPUÉS
Keyframes globales .......... 2        Keyframes en @theme ............ 5
Tokens --animate-* .......... 0        5 tokens declarados
Animaciones de entrada/salida 1        Superficies con entrada ....... 15+
Usos de prefers-reduced-motion 1       6 clases enumeradas + Chart.tsx
Superficies modales sin animar 14*     0 (Modal 8 + Dropdown 6)
Listas sin entrada .......... 10       9 con entrada escalonada
transition-colors ........... 116      sin cambios (capa sana)
Dependencias de UI sin uso .. 6        sin cambios (deuda aparte)

* 8 Modal + 6 Dropdown. Tab contaba 7 en la versión errónea; su valor real es 1.
```

**Deuda detectada y no pagada en este trabajo** (fuera de alcance, no olvidada):

1. `Notification.tsx` — 0 consumidores, y un bug real: se reabre solo tras cerrarse.
2. `MetricCard` — 0 consumidores.
3. `react-dnd` + `react-dnd-html5-backend` — instalados; el Kanban no es arrastrable. El comentario de `TableroPage.tsx:1340` describe una capacidad inexistente.
4. `Programados` y `CountdownTimer` — animaciones de P4 sin implementar.
5. El hilo de chat aterriza en la parte superior, no en el último mensaje (§6.7).
