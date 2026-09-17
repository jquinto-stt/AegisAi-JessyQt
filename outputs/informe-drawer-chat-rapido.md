# Drawer de Chat Rápido (Slide-over) — Informe de arquitectura

**Proyecto:** StockFlow (`packages/apps/web/modules/app`)
**Árbol autoritativo:** `src/` en HEAD `55eda1e` (verificado; sin copia obsoleta anidada en uso)
**Rol:** Frontend UX/UI Systems Architect
**Estado:** Implementado y verificado — **274/274 tests**, `tsc` sin errores nuevos, build OK

---

## 1. Qué se hizo

Se sustituyó el enlace externo a WhatsApp (`wa.me`, `window.open` a pestaña nueva) por un
**drawer lateral de chat rápido** que permite al operador responder al cliente sin abandonar
el Tablero Kanban ni la vista de Inicio.

**Superficies conectadas**

| Superficie | Punto de entrada | Antes | Ahora |
|---|---|---|---|
| Tablero Kanban | botón WhatsApp de la tarjeta | `wa.me` externo | `setChatDrawerPedidoId(p.id)` |
| Tablero Kanban | botón del `DetalleModal` | `wa.me` externo | cierra detalle + abre drawer |
| Tablero (modo lista) | ítem "Abrir WhatsApp" del menú | `wa.me` externo | abre drawer |
| Inicio | `ClienteRow` de `ClientesModal` | `wa.me` externo | cierra lista + abre drawer |

Todos los puntos de entrada guardan **el id del pedido**, no el teléfono: el drawer resuelve
el hilo por dentro con el selector canónico. Así la regla de normalización de teléfono existe
en **un solo sitio** y las dos superficies no pueden discrepar.

---

## 2. Defecto raíz encontrado y corregido

**El botón de WhatsApp nunca encontraba la conversación.** No era un fallo visual: era un
desajuste de identidad de datos entre dos módulos.

| Fuente | Formato del teléfono | Valor de Juan Carlos |
|---|---|---|
| `pedidos.store.ts` (seed) | plano | `+573001112233` |
| `conversaciones.seed.ts` | con espacios | `+57 300 555 1122` |

`pedidosStore.porTelefono` comparaba con `===` sobre la cadena cruda, así que **ninguna** de
las 4 conversaciones del seed resolvía contra su pedido. El drawer habría funcionado y aun
así mostrado siempre "Sin conversación".

**Corrección (solo presentación, sin tocar el contrato):** se añadió al store de
conversaciones el resolutor canónico `porTelefono()` + `normalizarTelefono()` — deriva a
dígitos, conserva el `+`. Respeta la invariante D2: **el store de conversaciones sigue sin
importar `pedidos.store`**; el cruce ocurre en la capa de UI.

> Se **reporta** (no se "arregla") que `pedidos.store.ts:46` documenta `telefono` como
> *"usado para abrir WhatsApp (wa.me)"* — una preocupación de presentación dentro de un
> comentario de dominio. Y que el seed tenía dos convenciones de formato para el mismo dato.

---

## 3. Huecos del catálogo (reportados, no improvisados)

La doctrina obliga a **parar y reportar** cuando una intención no tiene candidato en el
catálogo, en lugar de inventar un componente. Se confirmó con **dos herramientas
independientes**:

- `ui_lookup(cnames=["SlideOver","Drawer","SidePanel","Backdrop","Sheet","Overlay"])` → **Not found** para los seis.
- `ui_refine` (dos veces, con la intención reformulada) → `Popover`, `Modal`, `Dropdown`, `Tooltip`, `Ribbon`, `Card`, `AccordionItem`. **Ningún** primitivo de slide-over ni de scrim.

**Consecuencia:** el contenedor del drawer (panel lateral + scrim) se compone en
`ChatDrawer.tsx`. Todo el **contenido** sí reutiliza catálogo y composiciones existentes.

**Por qué NO se usó el `Modal` del catálogo** (evidencia documentada en su propio archivo):
- está **centrado**, no anclado al borde;
- **no tiene animación** ni prop de tamaño;
- **bloquea `document.body.style.overflow = "hidden"`** y monta `fixed inset-0 z-99999`
  **capturando el puntero**.

Eso último habría violado el requisito duro del usuario: *"que no bloquee el movimiento de
tarjetas Kanban en segundo plano"*. El `ChatDrawer` usa `pointer-events: none` en el
contenedor y `pointer-events: auto` solo en el panel; el `body` nunca se bloquea.

**Tercer hueco:** `Button` renderiza un `<button>` sin *spread* de props y **no acepta
`aria-label` ni `title`**, así que no puede expresar una acción "solo icono con nombre
accesible". Se siguió el patrón ya establecido en el propio módulo
(`ConversacionesPage.tsx:76`, `ChatView.tsx:113`: `<button>` decorado con `aria-label`).

---

## 4. Defecto que introduje y corregí en el momento

`ChatView` renderiza su **propia** cabecera (avatar, nombre, teléfono, acciones). Dentro del
drawer eso habría mostrado **dos avatares y dos nombres** para el mismo contacto —
exactamente la identidad duplicada que la doctrina prohíbe.

**Corrección:** prop de presentación `sinCabecera` en `ChatView`. La consola completa no
cambia (sigue con su cabecera); el drawer la omite porque ya aporta la suya con la identidad
y el `#P-XXX`. No es un cambio de contrato: es una opción de renderizado.

También eliminé un `abrirWhatsAppExterno` que había dejado definido y sin usar. Un fallback
silencioso a `wa.me` habría sido un segundo camino que esquiva el drawer; el estado vacío
explícito ya cubre ese caso.

---

## 5. Archivos

**Nuevos**
- `src/pages/conversaciones/components/ChatDrawer.tsx` — el slide-over compartido.
- `src/stores/conversaciones.store.test.ts` — 12 tests del resolutor.
- `src/pages/conversaciones/components/chat-drawer.resolucion.test.ts` — 5 tests de acuerdo entre superficies.

**Modificados**
- `src/stores/conversaciones.store.ts` — `normalizarTelefono()`, `porTelefono()`, `tieneConversacion()`.
- `src/pages/pedidos/TableroPage.tsx` — 3 puntos de entrada + montaje de una instancia.
- `src/pages/pedidos/InicioPage.tsx` — 1 punto de entrada + montaje + retirada del helper muerto.
- `src/pages/conversaciones/components/ChatView.tsx` — prop `sinCabecera`.

**No tocados (fuera de alcance, solo reportados)**
- `src/pages/pedidos/HistorialPage.tsx` — conserva su `abrirWhatsApp` (línea 38).
- `src/modules-tools/pedidos/pedidos.tool-provider.test.ts`, `pedidos.store.test.ts`,
  `assistant.store.multiconv.test.ts` — correcciones de *time-bomb* previas (ver §6).

### Catálogo de estado de conversación: el drawer lo consume

`conversaciones.store.ts` contiene `ESTADO_CONVERSACION_LABEL` (líneas 69-74) y
`ESTADO_CONVERSACION_BADGE` (84-89), exportados desde `stores/index.ts`. El drawer los
importa y muestra el estado del hilo junto al `#P-XXX`, de modo que el vocabulario de estado
vive en un solo sitio y el `Record<EstadoConversacion, …>` obliga al compilador a cubrir
cualquier estado nuevo.

**Nota de autoría (corrección).** Este catálogo **no lo escribí yo** y **no está en `HEAD`**:
llegó como trabajo sin commitear de otra sesión/proceso, en el **mismo archivo** que mis
adiciones (`normalizarTelefono`, `porTelefono`, `tieneConversacion`). Mis ediciones y las
ajenas están entremezcladas en ese archivo y **no es posible separarlas limpiamente** por
diff. Antes de commitear conviene decidir qué se hace con esa convivencia.

> Nota de corrección: `stores/index.ts` **sí** exporta `conversacionesStore` y
> `normalizarTelefono`. Una observación anterior ("hay que importar el store directamente
> porque no está en el barrel") quedó obsoleta: el barrel ya lo expone.



---

## 6. Nota sobre `npm test` al 100 %

El requisito *"que `npm test` continúe pasando al 100%"* se cumple, pero conviene registrar
por qué hacía falta trabajo previo: la suite se ejecutaba justo después de medianoche local,
y **tres** archivos construían fixtures con "N horas atrás", que cruzaban al día anterior.

| Archivo | Síntoma | Corrección |
|---|---|---|
| `pedidos.store.test.ts` | `ingresosEntre(hoy, hoy)` no encontraba `pd6` (~50 min atrás) | derivar el día de `pd6.finishedAt` |
| `assistant.store.multiconv.test.ts` | `iso(1)` caía fuera del grupo "Hoy" | anclar a medianoche, usar `h = 0.5` |
| `pedidos.tool-provider.test.ts` | 2 casos: `minutesAgoIso(60)` en el día anterior | helper `rangoDe()` derivado de los fixtures |

Las tres son **preservadoras de comportamiento**: cambian *cuándo* se sitúa un fixture, nunca
*qué* se afirma.

**Resultado final:** la suite pasa (**299/299**), con la salvedad de que el total se mueve
mientras haya edición paralela (ver §7).

---

## 7. Verificación

| Comprobación | Resultado |
|---|---|
| `vitest run` | **299/299** en 16 archivos (×2 ejecuciones consecutivas) |
| `tsc --noEmit` | 0 errores en mis archivos (13 ajenos: 12 heredados + 1 del trabajo paralelo) |
| `vite build` | `✓ built in 13.91s` |

> **Cifra móvil.** El total de tests **no es estable** mientras dure el trabajo paralelo:
> pasó de 274 → 298 → 299 en esta sesión porque otra sesión añade casos, incluso **dentro de
> archivos que yo creé** (`conversaciones.store.test.ts` pasó de mis 12 tests a 37).
> Una medición intermedia dio `1 failed | 297 passed` y resultó ser una **carrera de
> escritura** (la suite leyó un archivo a medio editar), no un defecto: no se reprodujo en
> dos ejecuciones consecutivas posteriores. La afirmación fiable es más estrecha:
> **la suite pasa y ningún fallo es atribuible a este trabajo.**

### Nota sobre el conteo inicial de 12 errores `tsc`
El conteo subió de 12 a 13 sin que yo tocara nada: apareció
`HistorialAtencionPage.tsx(23,3): TS2305 '@/icons' has no exported member 'ChevronRightIcon'`
en un archivo **untracked** creado a las 00:49 por la sesión paralela, sin ninguna referencia
a `ChatDrawer`. Al medir el delta de errores hay que hacerlo **por archivo**, no por número
total, porque otro proceso puede añadir archivos entre dos mediciones.

| Acuerdo entre superficies | 5 tests: mismo pedido → mismo hilo desde ambas superficies |

---

## 8. DSL de Diseño (verbatim)

```dsl
  overlay position=top-right @dc6e
    ?Backdrop(a dimmed, softly blurred scrim spanning the viewport; purely visual and non-interactive, so background gestures and scrolling remain available) @2a99 #ff64
    ?SlideOver(a lateral panel anchored to the right edge of the viewport; full height; roughly 420-480px wide on desktop and full width on mobile; solid panel surface with a soft edge shadow toward the content; slides in from the right on open and out on close) chatDrawer @39f8 #10b3
      section(pinned drawer header; a bottom hairline separates it from the timeline) drawerHeader @0779
        row(identity group on the left, actions on the right, vertically centered) @7575
          ?Avatar(circular customer photo with initials fallback and a small presence dot, large) clienteAvatar @8031 #cf1d
          section(stacked identity lines next to the avatar) identidad @f196
            ?Heading(customer name, semibold, 14px, truncated on overflow) nombreCliente @80b6 #7ab5
            ?Text(customer phone number, muted 12px, below the name) telefonoCliente @a1c5 #7ab5
          ?Badge(small pill badge with the order number, light neutral surface with a hairline border, tabular look, 11px) pedidoBadge "#PED-014" @fce2 #c198
          ?IconButton(secondary action with icon only, accessible name and tooltip 'Abrir en consola completa', opens the same conversation in the full chat console) abrirConsola @282b #e4fe
          ?IconButton(ghost close control with accessible name 'Cerrar') cerrarDrawer @c053 #e4fe
      section(scrollable conversation body; fills the remaining height; internal scroll only, so header and footer stay pinned; comfortable vertical rhythm between items) drawerBody @fb4e
        ?Timeline(the full 2-way conversation timeline already implemented: customer messages left-aligned with an avatar and a soft light-gray bubble with one squared top-left corner; bot replies right-aligned in a deep-indigo bubble with a small 'Bot Necto (IA)' label; human-advisor replies right-aligned in a brand-indigo bubble with an 'Asesor Humano' label; each bubble is followed by a muted 11-12px attribution line with the sender name and time; system events render as small centered gray pills prefixed by a dot) @c535 #3d4b
      section(pinned drawer footer; a top hairline; the functional send bar already implemented, compacted for the narrow width) drawerFooter @7179
        ~Composer(send bar already implemented: an emoji affordance, a borderless single-line text field, attach and voice-note affordances, and an indigo circular submit button; Enter submits; disabled state when the operator lacks the reply capability, with a muted warning hint line underneath explaining the denial reason; when the thread is closed, the composer stays visible but disabled with the reason shown) @69e9 #0b2c #90e6
    ?EmptyState(explicit empty state shown when no conversation matches the order phone: a centered icon in a soft circle, a short bold title, a muted explanation that the thread does not exist yet and that messaging starts from the customer device, and a single outline action linking to the full chat console; no inline thread creation; the drawer header still shows the customer identity and order badge) sinConversacion @01ea #1188
    ?EmptyState(secondary empty state when the conversation exists but has no messages: a centered small muted pill with a one-line message) hiloVacio @9907 #1188
    ?EmptyState(read-only closed thread state: the conversation timeline remains visible, but the composer stays disabled and the reason is shown in muted text) hiloCerrado @71ac #1188
```

---

## 9. Intención → componente

| Intención | Elegido | Alternativas descartadas | Motivo |
|---|---|---|---|
| `10b3` slide-over | **ninguno (hueco)** | `Modal`, `Popover`, `Dropdown`, `ChatSidebar`, `AiSidebarHistory` | `Modal` centrado, sin animación, sin tamaño, y bloquea puntero/scroll |
| `ff64` scrim | **ninguno (hueco)** | `Popover`, `Modal`, `Dropdown`, `Tooltip`, `Ribbon` | No hay primitivo de scrim |
| `c198` badge `#P-XXX` | **`Badge`** | `ExtraSmallBadge`, `SmallBadge`, `LightColorBadge` | Canónico; `size="sm"` |
| `cf1d` avatar | **`Avatar`** | `OfflineAvatar`, `LargeAvatar`, `BusyAvatar` | Canónico; `status` desde `statusDe(estado)` |
| `e4fe` botón icono | **`Button`** → `<button>` decorado | `IconButton`, `GhostButton` | `Button` no acepta `aria-label`; hueco reportado |
| `0b2c` composer | **`Composer`** existente | `ChatBox` (no está en `elements/ui/`) | Reutilización literal |
| `3d4b` timeline | **`ChatView`** existente | idem | Reutilización literal |
| `7ab5` cabecera | `ChatDrawer` + `sinCabecera` en `ChatView` | `AppHeader`, `ChatSidebar` | Evita identidad duplicada |
| `90e6` texto de motivo | texto atenuado | `Alert` | `Alert` es de bloque, el requisito es una línea inline |
| `1188` estado vacío | icono + título + texto + enlace | `IconCard`, `Alert`, `AlertStyleModal` | Composición sobre `Card`/`Button` |

---

## 10. Mapa estado → store

| Región del componente | Valor de dominio | Selector / catálogo |
|---|---|---|
| Nombre del cliente | `contacto.nombre` | `conversacionesStore.porTelefono(telefono)` |
| Teléfono | `contacto.telefono` | idem |
| Avatar (imagen) | — | `AVATAR_MAP[conv.id]` |
| Avatar (iniciales) | — | `inicialesDe(nombre)` |
| Punto de presencia | `estado` | `statusDe(conv.estado)` |
| Badge `#P-XXX` | `pedido.numero` | `Pedido.numero` + `Badge` |
| Timeline | `lineaDeTiempo(convId)` | `conversacionesStore.lineaDeTiempo` |
| Envío | — | `conversacionesStore.enviarComoNegocio` |
| Permiso de envío | capacidades | `puedeResponderConversacion()`, `motivoSinPermiso("channels.respond")` |
| Estado cerrado | `estado === "cerrada"` | `Conversacion.estado` |
| Etiqueta del estado | — | `ESTADO_CONVERSACION_LABEL[estado]` |
| Color del estado | — | `ESTADO_CONVERSACION_BADGE[estado]` |
| Resolución de hilo | teléfono normalizado | `conversacionesStore.porTelefono` |

---

## 11. Preguntas abiertas

1. **`pasos` del hueco de catálogo** — el slide-over y el scrim son código local, porque el
   catálogo no los ofrece. Si se desea un primitivo oficial, hay que pedirlo al catálogo; no
   debe forjarse uno local presentándolo como del catálogo.
2. **`ui_lookup` con CNAME `ChatBox`** dio candidato en `ui_refine` pero **no existe
   directorio** `elements/ui/chat-box/`. Queda registrado como discrepancia entre lo que
   `ui_refine` sugiere y lo que el proyecto tiene instalado.
3. **12 errores de `tsc` preexistentes** (tipo `Modulo` reducido a `"pedidos"` en
   `operadores.store`, `SeleccionarPage`, `OperadorRegistroPage`, `OperadorLoginPage` y sus
   tests). Ajenos a esta tarea; conviene abordarlos aparte.
4. **`HistorialPage.tsx`** conserva el `wa.me` externo. Si debe unificarse al drawer, es una
   decisión del usuario: quedó fuera del alcance solicitado.
5. **Estado del repositorio:** hay ~42 archivos con cambios de contenido sin commitear
   (más ~16 con solo diferencias de fin de línea). Los ajenos a esta tarea provienen de
   sesiones anteriores. Conviene revisarlos y commitear por separado; el árbol no estaba
   limpio antes de empezar.
6. **Hallazgo de arquitectura:** `ESTADO_CONVERSACION_LABEL` / `ESTADO_CONVERSACION_BADGE`
   existen y ahora los consume el drawer. Si el historial o la bandeja rotulan el mismo estado
   con literales, deberían converger a este catálogo.
7. **Autoría mezclada en `conversaciones.store.ts`:** mis adiciones y las de otra sesión
   conviven en el mismo archivo sin commitear. No se pueden separar por diff. Hay que decidir
   cómo se commitea (todo junto o revisando línea a línea).


