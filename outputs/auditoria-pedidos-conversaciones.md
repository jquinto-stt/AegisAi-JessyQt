# Auditoría de Arquitectura de Información Visual — Pedidos ↔ Conversaciones

**Experta:** Iris (`ux-ui-systems-architect`)
**Proyecto:** StockFlow — `@stt/repo-prueba.app.web.app`
**Árbol auditado:** `packages/apps/web/modules/app/src` (git-tracked, `HEAD = 55eda1e`, rama `master`, 271 archivos)
**Fecha:** 2026-09-17

---

## Fase 0 — Grounding (completada)

| Comprobación | Resultado | Evidencia |
|---|---|---|
| Árbol autoritativo confirmado | ✅ | `git rev-parse --short HEAD` → `55eda1e`; 271 archivos rastreados bajo `src` |
| Copia obsoleta anidada | ✅ No existe bajo `packages/` | `git ls-files` no muestra duplicados; solo `outputs/ux-ui-systems-architect.zip` sin rastrear |
| Alias de import | `@/` → `src/` | `vite.config.ts` |
| Runtime de tests | vitest 3.2.7, `environment: 'node'` | `vite.config.ts:14-17` |
| Binarios | `node_modules/.bin/{vitest,tsc,vite}` presentes | El módulo `app` **no** es workspace del root: deps instaladas localmente |

### Limitaciones de entorno (declaradas, no absorbidas)

| Limitación | Impacto | Mitigación aplicada |
|---|---|---|
| **`webiai-devtools.projects` devuelve registro vacío** (`{"mode":"list","projects":[]}`; el detalle responde `Unknown project… Known: (none)`) | `search`, `runtime`, `kiro_steerings`, `shared_resources` **no son utilizables** | Grounding por filesystem: `Read` completo de ambos stores, `Grep`, `git`. El mapeo de interfaces es **verificado por lectura directa**, no inferido |
| **`agent-browser` no soporta Windows** (`win32`) | Sin verificación visual en runtime | Verificación por tests + inspección estática + razonamiento explícito. **Se declara como brecha**: la consistencia visual no queda probada en navegador |
| **`ui_dsl` cargado** ✅ | — | Referencia del DSL en contexto; modo *Brownfield (text only)* |

---

## Fase 1 — Inventario de fuentes de verdad (canónico)

### 1.1 Entidades en juego

| Entidad | Dueño único | Persistencia |
|---|---|---|
| `Pedido[]` + `PedidosConfig` | `stores/pedidos.store.ts` (singleton `pedidosStore`) | `localStorage["necto.pedidosConfig"]` (solo config) |
| `Conversacion[]` + `Map<Mensaje[]>` + `Map<EventoSistema[]>` | `stores/conversaciones.store.ts` (singleton `conversacionesStore`) | `localStorage["necto.conversaciones"]` (todo el estado) |
| `Rol`/`Capacidad`/excepciones | `stores/roles.store.ts` | — |
| Sesión / `AccessContext` | `stores/session.store.ts` | `localStorage["necto.session"]` |
| Capa de conveniencia de acceso | `stores/acceso.utils.ts` (re-exportada por `stores/index.ts`) | — |

### 1.2 Vocabulario de presentación del pipeline — **quién lo posee**

`pedidosStore` es el **dueño único** del vocabulario de estado:

| Selector | Devuelve | Fuente |
|---|---|---|
| `pedidosStore.estadoLabel(e)` | Etiqueta legible, honrando `config.aliasEstados` | `pedidos.store.ts` |
| `pedidosStore.estadoBadgeColor(e)` | `BadgeColor` | `pedidos.store.ts` |
| `pedidosStore.estadoDotClass(e)` | Clase de punto | `pedidos.store.ts` |
| `pedidosStore.modalidadLabel(m)` | Etiqueta de modalidad | `pedidos.store.ts` |
| `pedidosStore.resumenItems(p)` | Resumen de items | `pedidos.store.ts` |
| `pedidosStore.totalPedido(p)` | Total monetario | `pedidos.store.ts` |

`estadoBadgeColor` mapea: `programado:"light"`, `nuevo:"info"`, `confirmado:"primary"`, `en_preparacion:"warning"`, `listo:"success"`, `en_camino:"primary"`, `entregado:"success"`, `cancelado:"error"`.

### 1.3 Puente entre ambos módulos — el contrato que ya existe

| Elemento | Valor | Evidencia |
|---|---|---|
| Clave de cruce | `contacto.telefono` ↔ `pedido.telefono` | `conversaciones.types.ts:92` (comentario de `Contacto`) |
| Puerta pública | `pedidosStore.porTelefono(telefono)` | `pedidos.store.ts`; usado en `PanelContexto.tsx:115` |
| Invariante de encapsulamiento | **`conversaciones.store.ts` NUNCA importa `pedidos.store`** | Nota en `conversaciones.store.ts:24-26`; verificado por grep: 0 ocurrencias |
| Campo puente en la cabecera | `Conversacion.pedidoActivoId?: string` | `conversaciones.types.ts:115` — **declarado y NUNCA escrito ni leído** |
| Mutaciones de pedido | `moverEstado`, `avanzar`, `cancelar`, `activarAhora`, `activarProgramadosVencidos` | `pedidos.store.ts` — **ninguna emite nada hacia conversaciones** |

### 1.4 Brechas de selector (Phase 1 findings)

Un valor que ninguna superficie puede resolver sin calcularlo inline **es un hallazgo de Fase 1**, y su arreglo es **añadir el selector en el store**, no calcularlo en la vista.

| # | Valor necesario | Selector existente | Veredicto |
|---|---|---|---|
| S1 | "¿Tiene este contacto un pedido en curso, y cuál?" | `porTelefono()` devuelve **todos**; ninguna superficie filtra por "activo" de forma canónica | **GAP** — hoy cada consumidor tendría que filtrar por `esTerminal()` |
| S2 | "¿Qué conversación corresponde a este teléfono?" | `getConversacion(id)` solo por id; `bandeja` es getter con filtro/búsqueda aplicados | **GAP** — Task 1 lo necesita para navegar desde Pedidos |
| S3 | "Mensaje del sistema por cambio de estado de pedido" | `agregarMensajeBot` existe pero el `TipoEventoSistema` no tiene variante de pedido | **GAP** — Task 2 |
| S4 | "Enlazar conversación ↔ pedido activo" | `pedidoActivoId` declarado, jamás escrito | **GAP** — Task 3 |

---

## Fase 2 — Matriz de consistencia

Cada fila: superficie → elemento → valor mostrado → fuente de verdad → veredicto.
**Ordenada por severidad.** Agrupada por causa raíz.

### Clase D1 — `wa.me` hardcodeado (Task 1) · **SEVERIDAD: ALTA**

Es **una** causa raíz con **4 puntos de llamada**: la app expulsa al usuario del producto para hablar con un cliente cuya conversación ya vive dentro del producto (`/conversaciones`).

| Superficie | Elemento | Valor / acción | Fuente de verdad | Veredicto |
|---|---|---|---|---|
| `HistorialPage.tsx:37-41` | `abrirWhatsApp()` | `window.open("https://wa.me/…")` | — (literal externo) | ❌ **Defecto** — fuga del sistema |
| `HistorialPage.tsx:99` | Botón "Abrir WhatsApp" (menú 9 puntos) | invoca `abrirWhatsApp` | `puedeEscribirCliente()` ✅ gate correcto | ❌ Defecto (el gate es correcto; el destino no) |
| `InicioPage.tsx:29-33` | `abrirWhatsApp()` | idéntico | — | ❌ Defecto |
| `InicioPage.tsx:440` | Botón "Escribir" | invoca `abrirWhatsApp` | `channels.read` ✅ | ❌ Defecto |
| `TableroPage.tsx:63-67` | `abrirWhatsApp()` | idéntico | — | ❌ Defecto |
| `TableroPage.tsx:187` | Botón WhatsApp (tarjeta Kanban) | invoca `abrirWhatsApp` | `puedeEscribirCliente()` ✅ | ❌ Defecto |
| `TableroPage.tsx:277` | Botón ghost WhatsApp (vista Lista) | invoca `abrirWhatsApp` | `puedeEscribirCliente()` ✅ | ❌ Defecto |
| `TableroPage.tsx:720` | Botón WhatsApp (modal detalle) | invoca `abrirWhatsApp` | `puedeEscribirCliente()` ✅ | ❌ Defecto |
| `pedidos.store.ts:46` | Doc-comment `Pedido.telefono` | `// usado para abrir WhatsApp (wa.me)` | — | ❌ **Comentario obsoleto** (afirma un contrato que dejamos de cumplir) |

**Sub-finding D1.b — teléfono normalizado descartado.** Las tres copias de `abrirWhatsApp` hacen `telefono.replace(/[^\d]/g, "")`. Los teléfonos del seed tienen formato E.164 (`+573001112233`). El `Contacto` de conversaciones guarda el teléfono **tal cual** — hay que confirmar si con `+` o sin él antes de cruzar, o el lookup fallará silenciosamente.

### Clase D2 — Vocabulario duplicado y divergente (Task 3, pre-requisito) · **SEVERIDAD: ALTA**

`PanelContexto.tsx:25-37` declara `ESTADO_PREP_META`, un **segundo diccionario de estado** que duplica el que ya posee `pedidosStore`, y que **discrepa en dos estados**:

| Estado | `pedidosStore.estadoBadgeColor` | `ESTADO_PREP_META.color` | ¿Coincide? |
|---|---|---|---|
| `programado` | `light` | `light` | ✅ |
| `nuevo` | `info` | `info` | ✅ |
| `confirmado` | **`primary`** | **`info`** | ❌ **DIVERGE** |
| `en_preparacion` | `warning` | `warning` | ✅ |
| `listo` | `success` | `success` | ✅ |
| `en_camino` | **`primary`** | **`warning`** | ❌ **DIVERGE** |
| `entregado` | `success` | `success` | ✅ |
| `cancelado` | `error` | `error` | ✅ |

**Evidencia del defecto:** `PanelContexto.tsx:31` y `PanelContexto.tsx:34` contra `pedidos.store.ts` (`estadoBadgeColor`).
**Confirmación cruzada:** `HistorialPage.tsx:551,583` **sí** usa `pedidosStore.estadoBadgeColor(...)`. Es decir: el mismo pedido en estado `confirmado` se pinta **`primary`** en el Historial y **`info`** en el panel de la conversación. Dos superficies, mismo dato, dos colores.

Violación directa de *"derive, never duplicate"* y de la clase de defecto *cross-module vocabulary mismatch*.

### Clase D3 — Estado de pedido no visible en la bandeja (Task 3a) · **SEVERIDAD: MEDIA**

| Superficie | Elemento | Valor mostrado | Fuente de verdad | Veredicto |
|---|---|---|---|---|
| `BandejaLista.tsx:143-190` | Fila de conversación | avatar, nombre, `tiempoRelativo`, `ultimoTexto`, `noLeidos` | `conversacionesStore` ✅ | ⚠️ **Omisión** |
| `Conversacion.pedidoActivoId` | — | `undefined` en el 100 % del seed (`conversaciones.seed.ts:70`) | nunca escrito | ❌ **Orphan field** — declarado, jamás poblado, jamás leído |

El operador no puede saber, desde la bandeja, que el cliente que escribe tiene un pedido en `en_camino`. La información **existe** (`pedidosStore.porTelefono(conv.contacto.telefono)`) y **no se muestra**.

### Clase D4 — Sin acción de avance en vivo desde el chat (Task 3b) · **SEVERIDAD: MEDIA**

| Superficie | Elemento | Estado | Veredicto |
|---|---|---|---|
| `PanelContexto.tsx:44-80` | `PedidoItemCard` | Solo lectura: número, fecha, resumen, 2 badges | ⚠️ **Omisión** |
| `pedidosStore.avanzar(id)` | — | Existe y es público; `TableroPage.tsx:127,362,768` lo usa | **Disponible, no expuesto** |

El chat es donde el operador **está mirando el pedido** y es el **único sitio donde no puede moverlo**.

### Clase D5 — Plantillas de WhatsApp desconectadas (Task 2) · **SEVERIDAD: MEDIA**

| Superficie | Elemento | Estado | Veredicto |
|---|---|---|---|
| `pedidosStore.config.plantillas` | `PlantillasWhatsApp` (`recibido`, `confirmado`, `enPreparacion`, `listo`, `enCamino`, `entregado`, `cancelado`) | 7 plantillas con texto por defecto **completo y editable** | ❌ **Orphan value** — **cero consumidores** |
| `pedidosStore.moverEstado/avanzar` | Mutaciones del pipeline | No emiten nada | ❌ **Split truth** |
| `conversacionesStore.agregarMensajeBot` | Única puerta pública para añadir mensaje `bot` | Existe, pero **nada la llama desde Pedidos** | ⚠️ **Punto de extensión sin usar** |
| `TipoEventoSistema` | `handoff_solicitado \| tomada \| devuelta \| cerrada \| reabierta` | **Sin variante de pedido** | ❌ **GAP de contrato** |

**Hallazgo grave asociado:** `pedidosStore` **nunca** lee `config.plantillas`. El módulo `ConfigPage` las edita y las persiste, el operador cree haberlas configurado, y **el sistema jamás las envía**. Es el defecto más engañoso del conjunto: una funcionalidad visible que no hace nada.

### Clase D6 — Support Tickets inexistente (Task 4) · **SEVERIDAD: MEDIA**

| Superficie | Estado | Veredicto |
|---|---|---|
| Ruta de soporte | **No existe** en `App.tsx:41-70` | ❌ Ausente |
| Tipo de dominio `Ticket` | **No existe** en ningún archivo | ❌ Ausente |
| Store de tickets | **No existe** | ❌ Ausente |
| Navegación (sidebar) | **No existe** | ❌ Ausente |

`grep -i "soporte|ticket"` sobre `modules-tools/` → **0 coincidencias**. Es una superficie **greenfield dentro de un brownfield**: hay que diseñarla con el flujo consultivo completo.

### Resumen ejecutivo de la matriz

| Clase | Defecto | Severidad | Puntos de llamada | Tarea |
|---|---|---|---|---|
| D1 | `wa.me` hardcodeado | **ALTA** | 3 helpers + 4 botones + 1 comentario | 1 |
| D2 | `ESTADO_PREP_META` duplicado y divergente | **ALTA** | 1 diccionario, 2 estados en conflicto | 3 (pre-req) |
| D3 | Pedido activo invisible en la bandeja | MEDIA | 1 lista + 1 campo huérfano | 3a |
| D4 | Sin avance de estado desde el chat | MEDIA | 1 tarjeta de solo lectura | 3b |
| D5 | Plantillas sin consumidor | MEDIA | 7 literales huérfanos | 2 |
| D6 | Support Tickets ausente | MEDIA | superficie completa | 4 |
| — | **4 brechas de selector** (S1–S4) | — | Fase 1 | — |

---

## Fase 3 — Plan de reparación (pendiente de tu confirmación)

> **Regla del mandato:** pido confirmación antes de editar cuando el cambio toca un selector compartido o más de un módulo. **Los cuatro clusters la requieren.** No he editado nada.

### Cluster A — Task 1: eliminar `wa.me`, abrir la conversación dentro del sistema

**Cambio propuesto:** sustituir los 3 helpers `abrirWhatsApp` por **un único helper compartido** que (1) busque la conversación del cliente por teléfono vía `conversacionesStore`, (2) la seleccione, y (3) navegue a `/conversaciones`.

- **Cómo, sin romper el encapsulamiento:** el helper vive en **capa de UI** (un módulo nuevo, p. ej. `pages/conversaciones/conversaciones.navegacion.ts`), no en ningún store. `pedidosStore` sigue sin conocer `conversacionesStore`. La clave de cruce sigue siendo `telefono`.
- **No altera el contrato de dominio:** solo cambia el *destino* de una acción de presentación. `puedeEscribirCliente()` (`channels.read`) se mantiene tal cual: el gate ya era correcto.
- **Comentario obsoleto:** `pedidos.store.ts:46` pasa de `// usado para abrir WhatsApp (wa.me)` a describir el uso real (clave de cruce con el canal).
- **Decisión que necesito de ti:** ¿**navegación a `/conversaciones`** o **Chat Drawer** desde el propio Pedidos? (ver "Preguntas abiertas").

### Cluster B — Task 2: conectar `config.plantillas` al pipeline

**Cambio propuesto:** cuando un pedido cambia de estado, publicar la plantilla correspondiente en el hilo del cliente.

- **Restricción de diseño ineludible:** `conversaciones.store.ts` **no puede** importar `pedidos.store` (invariante D2). Opciones viables:
  - **(i) Puente en UI (recomendado):** un único punto en la capa de presentación que envuelva `pedidosStore.avanzar/moverEstado` y, tras un cambio exitoso, llame a `conversacionesStore.agregarMensajeBot`. Ventaja: cero cambios de contrato. Riesgo: un avance disparado desde fuera de la UI no notificaría.
  - **(ii) Callback inyectado:** `pedidosStore` expone un hook (`onEstadoCambiado`) que la capa de UI cablea una vez al arrancar. Ventaja: cubre **todo** avance, venga de donde venga. Coste: añade API pública al store → **requiere tu visto bueno explícito**.
- **Mapeo estado → plantilla:** `confirmado→confirmado`, `en_preparacion→enPreparacion`, `listo→listo`, `en_camino→enCamino`, `entregado→entregado`, `cancelado→cancelado`. `nuevo`/`programado` no tienen plantilla (son estados de entrada) → **fail-closed**, no se envía nada.
- **GAP de contrato (S3):** `TipoEventoSistema` no tiene variante para esto. El mensaje iría como `Mensaje` con `autor:"bot"` y `moduloContexto:"pedidos"` + `payload.pedidoId`. **Añadir una variante al enum es un cambio de contrato** → lo someteré a tu decisión.
- **Idempotencia:** si el estado no cambia, no se envía. Si la conversación no existe para ese teléfono, no se crea silenciosamente (habría que decidir si se crea o se ignora).

### Cluster C — Task 3: visibilidad y control del pedido en el chat

**(a) Badge de pedido activo en `BandejaLista.tsx`** — se añade bajo el nombre: `#PED-XXX` + badge de estado, leyendo `pedidosStore.porTelefono(conv.contacto.telefono)` filtrado por no-terminal. Requiere el **selector S1** (`pedidoActivoDe(telefono)` en `pedidosStore`) para no duplicar el filtro en la vista.

**(b) Eliminar `ESTADO_PREP_META`** — borrar el diccionario y delegar en `pedidosStore.estadoLabel()` / `estadoBadgeColor()`. **Es el arreglo que elimina la divergencia D2.** Cambio de presentación puro: el store ya tenía la respuesta.

**(c) Avance en vivo desde `PanelContexto.tsx`** — botón de avance gobernado por `puedeMoverA(destino)` (el mismo helper que usa el Tablero), con re-comprobación dentro de la mutación. Sin acción para estados terminales.

**(d) `Conversacion.pedidoActivoId`** — decidir: o se puebla desde la capa de UI al abrir el hilo, o se declara **derogado**. Dejarlo declarado-y-vacío es el peor de los mundos (invita a que alguien lo lea como verdad).

### Cluster D — Task 4: página de Support Tickets

Flujo consultivo completo: `ui_requirement` → `ui_discovery` → `ui_refine` (una vez por intent) → `ui_implement`.
Candidatos del catálogo **ya verificados como existentes en el repo**: `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableCell`, `Card`, `Badge`, `Dropdown`, `Avatar`, `Input`, `Select`, `Button`, `Tabs`.
**Preguntas que el flujo deberá resolver contigo:** qué *es* un ticket (¿proyección de conversaciones en espera? ¿dominio nuevo?), qué KPIs exactos, y si necesita persistencia propia.

---

## Verificación — prueba de que ahora mismo NO cuadra

**Baseline de tests capturado antes de tocar nada:**

```
Test Files  3 failed | 11 passed (14)
     Tests  4 failed | 253 passed (257)
```

**Los 4 fallos son PREEXISTENTES y NO están causados por esta auditoría** (no he editado ningún archivo). Análisis de causa raíz:

1. **`pedidos.store.test.ts:526` — `ingresosEntre`** · Causa: la hora local es `00:26` (medianoche). El seed de `pd6` da `finishedAt = ahora − 50 min` → cae en el **día anterior**. El test asume literalmente `hoy`:
   ```
   - Received: [{ fecha: "2026-09-17", total: 0 }]
   + Expected: [{ fecha: "2026-09-17", total: 25000 }]
   ```
   Confirmado empíricamente: `new Date().getHours() = 0` y `now − 50 min` → `2026-09-16T23:36` local. El test está anclado a `now` ⇒ es **hora-dependiente**.

2. **`assistant.store.multiconv.test.ts:218`** · Misma clase: `base - h horas` cruza la medianoche, así que el grupo "Hoy" queda vacío y el orden se pierde (`expected undefined to deeply equal ['b','c','a']`).

3. **`pedidos.tool-provider.test.ts`** (2 fallos) · Misma familia temporal.

> **Esto es un hallazgo por derecho propio: la suite es hora-dependiente.** Falla entre ~00:00 y ~01:10 locales. No es regresión; es un defecto latente de los tests. **Lo reparo solo si me lo pides** — está fuera de los 4 ítems que encargaste, y tocar tests ajenos sin permiso sería "absorber deriva" en vez de reportarla.

**Sub-suite limpia (la relevante aquí):** `src/stores` → `143 passed | 1 failed` (solo el caso de medianoche de arriba). Los **156 tests del contrato de acceso siguen verdes**.

**Nota sobre la ejecución:** los dos primeros intentos de `vitest run` devolvieron resultados distintos porque el reloj cruzó la medianoche entre ejecuciones. La fluctuación es la prueba del defecto, no ruido.

---

## Preguntas abiertas (necesito tu decisión)

| # | Pregunta | Opciones |
|---|---|---|
| Q1 | **Task 1 — destino de "escribir al cliente"** | (A) Navegar a `/conversaciones` seleccionando el hilo · (B) **Chat Drawer** lateral, sin salir de Pedidos · (C) Menú: "Ver en conversaciones" / "Abrir WhatsApp" como escape residual |
| Q2 | **Task 1 — si el teléfono no tiene conversación** | Ignorar (no-op) · Crear la conversación al vuelo · Mostrar estado explícito de "sin conversación" |
| Q3 | **Task 2 — mecanismo del puente** | (i) Puente en UI (cero cambio de contrato) · (ii) Hook público en `pedidosStore` (cubre todo avance, **cambia API pública**) |
| Q4 | **Task 2 — modelo del mensaje** | Solo `Mensaje` `autor:"bot"` (cero cambio de contrato) · Añadir variante a `TipoEventoSistema` (**cambio de contrato**) · Ambos |
| Q5 | **Task 3d — `pedidoActivoId`** | Poblarlo desde la UI al abrir el hilo · Marcarlo `@deprecated` (se deriva siempre de `porTelefono`) |
| Q6 | **Task 4 — naturaleza del ticket** | Proyección sobre conversaciones/pedidos existentes · Dominio nuevo (`Ticket` + store propio + seed) |
| Q7 | **Tests hora-dependientes** | ¿Los arreglo ahora, en otra pasada, o los dejo? |
| Q8 | **Task 1 — `agregarMensajeBot` sin `moduloContexto`** | ¿Marcamos los mensajes de plantilla con `moduloContexto:"pedidos"` (habilita el filtro transversal de `modulosDe`)? |

---

## Estado

- **Fase 0** ✅ completada
- **Fase 1** ✅ completada (inventario + 4 brechas de selector)
- **Fase 2** ✅ completada (matriz de consistencia, 6 clases de defecto)
- **Fase 3** ⏸️ **esperando tu confirmación** — sin ediciones realizadas
- **Fase 4** ⏸️ pendiente (arranca con `ui_requirement`)
- **Fase 5** ⏸️ pendiente
- **Fase 6** ⏸️ este documento es el informe intermedio

**No he modificado ni un archivo.** Los 6 archivos con defectos siguen intactos.
