# Fase 3 — Reparación: Pedidos ↔ Conversaciones

**Fecha:** 2026-09-17
**Rama:** `master` @ `55eda1e`
**Autoridad de código:** `packages/apps/web/modules/app/src/` (árbol rastreado por git)
**Rol:** Iris — Frontend UX/UI Systems Architect

---

## 1. Veredicto de verificación

| Puerta | Comando | Resultado |
|---|---|---|
| Tests | `node_modules/.bin/vitest run` | **375/375 en 20 archivos** ✅ |
| Tipos | `node_modules/.bin/tsc --noEmit` | **12 errores, todos preexistentes y ajenos** ✅ |
| Build | `node_modules/.bin/vite build` | **OK — 301 módulos, chunks emitidos** ✅ |
| Invariante D2 | grep de imports | **`conversaciones.store.ts` no importa `pedidos.store`** ✅ |

**Línea base:** la sesión arrancó con 299/299. Se cerró en **375/375** (+76 tests).

### Sobre los 12 errores de tipo

No es una regresión: son los mismos que existían antes de tocar nada. Todos
pertenecen al problema de `Modulo` estrechado a `"pedidos"` en
`session.store.ts:37`, que afecta a `operador/*`, `seleccionar/*` y tres tests.
**Están fuera del alcance de este mandato** (no son Pedidos ↔ Conversaciones) y no
se han tocado. Se reportan, no se absorben.

### Sobre la primera compilación fallida

El primer `vite build` murió **después** de `301 modules transformed`, dentro de
`emptyDir()`: el shim `safe-delete` del sandbox agotó el tiempo hablando con el
binario de papelera de Windows. **No era un error de código.** Se confirmó
compilando a un directorio nuevo (`--emptyOutDir=false`), que terminó en 20 s con
los chunks emitidos.

---

## 2. Defectos reparados

### D1 — El cruce Pedidos→Conversaciones nunca funcionó (severidad: crítica)

Los dos seeds guardaban el **mismo teléfono en formatos distintos**:

| Fuente | Formato | Ejemplo |
|---|---|---|
| `pedidos.seed` | E.164 compacto | `+573001112233` |
| `conversaciones.seed` | agrupado con espacios | `+57 300 111 2233` |

La comparación cruda `===` daba **0 cruces, siempre**. El panel de contexto del
chat jamás encontraba los pedidos del contacto. Agravante: `+57 300 111 2233`
(Ana Silva) está a **un dígito** de `+573001112233` (Juan Carlos), así que la
comparación cruda era insegura en ambos sentidos.

**Reparación:** normalización **en las dos direcciones**.

- `pedidos.store.ts` → `soloDigitos()` + `porTelefono()` normalizado.
- `conversaciones.store.ts` → `normalizarTelefono()` exportada + `porTelefono()` normalizado.

### D2 — Vocabulario de estado duplicado (severidad: alta)

`PanelContexto.tsx` tenía una tabla propia `ESTADO_PREP_META` que **había
divergido** del catálogo del store en dos estados:

| estado | `pedidosStore.estadoBadgeColor` | `ESTADO_PREP_META` |
|---|---|---|
| `confirmado` | `primary` | `info` ❌ |
| `en_camino` | `primary` | `warning` ❌ |

**Reparación:** tabla eliminada. Etiqueta y color se leen **siempre** de
`pedidosStore.estadoLabel()` / `estadoBadgeColor()` / `modalidadLabel()`, que ya
honran los alias de Configuración. El módulo de Conversaciones deja de tener
vocabulario propio de estados de pedido.

### D3 — Llamada a un método inexistente (severidad: alta)

`PanelContexto.tsx` invocaba `pedidosStore.avanzarEstado(pedido.id)`, que **no
existe** (`tsc`: `TS2339`). El botón "Avanzar →" habría lanzado en runtime.

**Reparación:** sustituido por `avanzarPedido(pedido.id)` — el puente nuevo, que
además publica la plantilla.

### D4 — El puente no etiquetaba el módulo (severidad: media)

`agregarMensajeBot()` aceptaba solo 3 argumentos, así que los avisos de Pedidos
**no llevaban `moduloContexto`**. Como `modulosDe()` deriva el filtro transversal
*de* ese campo, un aviso de pedido **nunca** marcaba el hilo como tocado por
Pedidos. El comentario del código ya prometía lo contrario: era una promesa sin
implementar, detectada por un test que escribí para ello.

**Reparación:** 4.º parámetro **opcional** `moduloContexto?: ModuloDestino`.
Retrocompatible (las llamadas de 3 argumentos siguen intactas y verdes) y la clave
se **omite** cuando no se pasa, para no alterar la forma serializada de los
mensajes existentes.

### D5 — `get requierenAtencion` duplicado (severidad: media)

`conversaciones.store.ts` declaraba el getter **dos veces** (líneas 365 y 444).
La segunda sombreaba silenciosamente a la primera, descartando el predicado
`requiereAtencionHumana()` y el **orden de cola de atención**
(`ultimaActividad` ascendente = quien más espera, primero). Vite lo avisaba:
`Duplicate member "requierenAtencion" in class body`.

Hoy ambos predicados coinciden (`estado === "en_espera"`), así que el síntoma
estaba latente — no había consumidores todavía. Pero era una trampa: cualquier
cambio futuro en `requiereAtencionHumana` habría sido ignorado en silencio.

**Reparación:** eliminada la definición no documentada. Se conserva la que pasa
por el predicado y ordena como cola.

### D6 — El drawer de chat estaba roto en Inicio (severidad: alta)

`InicioPage.tsx` llamaba a `setChatDrawerPedidoId(id)` y leía
`chatDrawerPedidoId`, pero el estado real se llama `chatDrawerConvId`
(4 errores `TS2552`/`TS2304`). **Abrir el chat desde la tarjeta "Clientes"
lanzaba en runtime.**

Causa raíz: la prop `convId` de `ChatDrawer` **estaba declarada con prioridad
documentada sobre `pedido`, pero no implementada** — el cuerpo solo destructuraba
`pedido` y hacía `if (!pedido) return null`. Un consumidor que solo tiene un hilo
no podía usar el componente.

**Reparación:**
- `pedido` pasa a **opcional** (`pedido?: Pedido | null`).
- `convId` **implementado de verdad**: tiene prioridad y resuelve con
  `getConversacion(convId)`; sin él, cae a `porTelefono(pedido.telefono)`.
- La apertura se decide por `pedido !== null || convId !== null`.
- Identidad del cliente y nº de pedido toleran la ausencia de pedido: el badge
  `#PED-XXX` solo se pinta si el drawer se abrió **por** un pedido (un contacto
  sin pedido no debe inventarse un número).

---

## 3. Funcionalidad entregada

### Tarea 18.a — Desconexión Pedido → WhatsApp

**Cero `wa.me` en código de producción.** Sustituido por dos mecanismos:

| Superficie | Mecanismo | Archivo |
|---|---|---|
| Tablero Kanban | `ChatDrawer` (slide-over) | `TableroPage.tsx` |
| Inicio (tarjeta Clientes) | `ChatDrawer` por `convId` | `InicioPage.tsx` |
| Historial de pedidos | Navegación a `/conversaciones` | `HistorialPage.tsx` |

Helper compartido (una sola resolución de hilo):
`conversaciones.navegacion.ts` → `abrirConversacionDe(telefono, navigate)`.
Devuelve `"abierto" | "sin_conversacion"`; **no** comprueba capacidades (el
gating vive en la UI) y **no** crea conversaciones.

### Tarea 18.b — Disparo de plantillas de WhatsApp

`pedidos.notificaciones.ts` — puente en la **capa de UI** (invariante D2: los
stores no se importan entre sí).

| Función | Semántica |
|---|---|
| `notificarCambioDeEstado(pedido)` | Publica la plantilla del estado; devuelve por qué sí o por qué no |
| `avanzarPedido(id)` | `avanzar` + notificar |
| `moverPedidoA(id, destino)` | `moverEstado` + notificar |
| `cancelarPedido(id)` | `cancelar` + notificar |

Resultados posibles (fail-closed): `enviado` · `sin_plantilla` · `sin_conversacion` · `plantilla_vacia`.

- Lee la plantilla **en el momento del envío**, así un cambio en Configuración se refleja.
- `nuevo` y `programado` **no** están en el mapa (son estados de entrada: agradecer
  un pedido que el cliente acaba de hacer no aporta). Un estado ausente **no envía
  nada**, en vez de un texto por defecto inventado.
- Sin hilo **no se crea** uno: la ausencia se representa como ausencia.
- Enviado como `autor: "bot"` con `payload.pedidoId` (solo el id, nunca la entidad)
  y `moduloContexto: "pedidos"`.
- **No** incrementa `noLeidos`.

### Tarea 18.c — Visibilidad del pedido en la bandeja

`BandejaLista.tsx`: cada fila muestra el **badge del pedido activo**
(`#PED-XXX` + estado), resuelto con el selector canónico
`pedidosStore.pedidoActivoDe(conv.contacto.telefono)`.

El badge es **condicional**: un contacto sin pedido activo no pinta nada. El
criterio de "activo" (excluye solo terminales; **incluye `programado`**) vive en
UN sitio — el store — para que la bandeja y el panel no puedan discrepar.

### Tarea 18.c bis — Avance del pedido en vivo desde el chat

`PanelContexto.tsx`: botón "Avanzar →" con `puedeMoverA(siguiente)`
(mismo mapeo destino→capacidad que el Tablero, fail-closed). Sin ese gating,
entrar al chat bastaba para mover pedidos que el rol no puede mover.

### Tarea 18.d — Historial de Atención

`HistorialAtencionPage.tsx` en `/conversaciones/historial`, guardada con
`CapabilityGuard capacidad="channels.read"`. 3 tarjetas KPI (Total / Pendientes /
Resueltos) + tabla con búsqueda, filtros, orden, selección, paginación y modal de
detalle. Proyección sobre datos existentes (sin dominio nuevo).

---

## 4. Archivos

### Nuevos

| Archivo | Contenido |
|---|---|
| `pages/pedidos/pedidos.notificaciones.ts` | Puente de plantillas (Tarea 18.b) |
| `pages/pedidos/pedidos.notificaciones.test.ts` | **9 tests** del puente |
| `pages/conversaciones/conversaciones.navegacion.ts` | Helper compartido de navegación |
| `pages/conversaciones/components/consistencia-pedidos.test.ts` | **5 tests** de acuerdo entre superficies |

### Modificados

| Archivo | Cambio |
|---|---|
| `stores/pedidos.store.ts` | `soloDigitos`, `porTelefono` normalizado, `pedidoActivoDe` nuevo |
| `stores/conversaciones.store.ts` | 4.º arg `moduloContexto`; **duplicado `requierenAtencion` eliminado** |
| `stores/conversaciones.types.ts` | `pedidoActivoId` marcado `@deprecated` con razonamiento |
| `pages/pedidos/TableroPage.tsx` | 4 sitios de mutación → puente |
| `pages/pedidos/HistorialPage.tsx` | `wa.me` → `abrirConversacionDe` |
| `pages/pedidos/InicioPage.tsx` | **Regresión D6 corregida** |
| `pages/conversaciones/components/BandejaLista.tsx` | Badge del pedido activo |
| `pages/conversaciones/components/PanelContexto.tsx` | D2 + D3 corregidos; avance en vivo |
| `pages/conversaciones/components/ChatDrawer.tsx` | **`convId` implementado**; `pedido` opcional |

---

## 5. Evidencia de consistencia

`consistencia-pedidos.test.ts` no prueba una pantalla (no hay DOM): prueba **el
contrato que las hace coincidir**, para que una derivación local futura rompa un test.

| Test | Qué fija |
|---|---|
| Bandeja y Panel resuelven el **mismo** pedido activo | Un solo selector de "activo" |
| El cruce funciona en **ambos** formatos de teléfono | Defecto D1 no vuelve |
| Etiqueta y color salen de **un** catálogo | Defecto D2 no vuelve |
| Un avance se ve **igual** en las tres superficies | Reactividad MobX de punta a punta |
| `pedidoActivoDe` incluye `programado`, excluye terminales | Criterio único, no "en curso" |

---

## 6. Limitaciones del entorno (reportadas, no absorbidas)

1. **`webiai-devtools` devuelve un registro vacío** — `projects` → `{"projects":[]}`.
   `search`, `runtime`, `kiro_steerings` y `shared_resources` quedan inservibles.
   El anclaje (grounding) se hizo por lectura directa del sistema de archivos.
2. **`agent-browser` no soporta Windows** (`win32`). No hubo verificación en
   navegador; la verificación es de tipos, tests y build.
3. **`git` se encontró sin `.git/refs/`** — `git status` daba
   `fatal: not a git repository`. Se recuperó `HEAD = 55eda1e` desde el reflog
   (`.git/logs/refs/heads/master`). Árbol de trabajo intacto, **sin pérdida de datos**.
4. **El shim `safe-delete` del sandbox no puede borrar directorios** en el árbol del
   proyecto (el binario de papelera de Windows falla). Los directorios temporales de
   build (`dist-verify*`) se dejaron en disco y se añadieron a `.gitignore`.

---

## 7. Preguntas abiertas

1. **Dos mecanismos coexisten para abrir el chat.** Las Tres superficies no hacen lo
   mismo: Tablero e Inicio abren el **drawer**; Historial **navega** a
   `/conversaciones`. La respuesta del usuario a la pregunta bloqueante fue
   "navegar a `/conversaciones`", pero el `ChatDrawer` ya venía funcionando de una
   sesión anterior. **Hay que decidir**: ¿se unifica en navegación (y se retira el
   drawer), se unifica en drawer, o se mantienen ambos deliberadamente?
   No lo decidí por mi cuenta porque afecta a tres superficies y es una decisión de
   producto.
2. **`pedidosStore.activarAhora`** (Tablero ~línea 477, "Activar ahora") sigue
   llamando al store directamente, sin pasar por el puente. Un pedido programado
   que se activa no avisa al cliente. ¿Debe notificar? (El estado destino es
   `nuevo`, que no tiene plantilla — pero quizá deba mandar `recibido`.)
3. **El drawer no muestra el badge del pedido activo cuando se abre por `convId`.**
   Solo pinta `#PED-XXX` si el drawer se abrió *por* un pedido. Se podría derivar
   con `pedidoActivoDe(conv.contacto.telefono)` y unificar con la bandeja. No lo
   hice porque añade otra superficie a la regla del badge.
