# Informe — Página de configuración del canal (Conversaciones / WhatsApp)

**Ruta entregada:** `/conversaciones/config`
**Entrada de menú:** Canales → **Configuración**
**Expert:** Iris — Frontend UX/UI Systems Architect
**Flujo asesor aplicado:** `ui_dsl` → `ui_requirement` → `ui_discovery` → `ui_refine` (×16, una por intent) → `ui_implement`
**Fecha:** 2026-09-17

---

## 1. Qué se pidió y qué se entregó

Se pidió una página de configuración para el módulo de WhatsApp, ubicada en **Canales**, tomando
como referencia `https://demo.tailadmin.com/ai-settings.html`, y construida a través del flujo de
Elements MCP.

La referencia se analizó primero (`outputs/ws-config-ref/` incluye `page.html` y 7 capturas de sus
secciones: *personalization*, *models*, *connector*, *data-control*, *file-media*, *memory*, y el
estado completo). Su valor real estaba en **el patrón de navegación**: una página de ajustes con
nav vertical persistente y panel único intercambiable.

Sus **secciones concretas no eran trasladables**: *modelos*, *claves de API*, *conectores*,
*memoria del asistente*, *control de datos* y *archivos y multimedia* describen un backend que
**este proyecto no tiene**. Este es un mock 100 % frontend cuyo asistente es un motor de reglas
local. Copiar esas secciones habría sido, en palabras de la propia doctrina, *inventar*.

Decisión acordada contigo en tres preguntas previas:

| Pregunta | Respuesta elegida |
|---|---|
| Alcance | **Reales + preferencias de UI** — secciones respaldadas por el store, más preferencias visuales. Sin valores de negocio fabricados. |
| Navegación | **Nav vertical como la referencia** |
| Ubicación | **`/conversaciones/config` + entrada en Canales** |

Entregado: **7 secciones en 3 grupos**, todas leyendo de un store real o de un catálogo de
presentación.

---

## 2. Matriz de consistencia

Cada fila: lo que se ve → de dónde sale → veredicto.

| Superficie | Elemento | Valor mostrado | Fuente de verdad | Veredicto |
|---|---|---|---|---|
| Nav lateral (Canales) | «Configuración» | texto + `/conversaciones/config` | `AppSidebar.tsx`, condicionado por `sessionStore.hasPermission("channels.manage")` | ✅ correcto |
| Cabecera | Título «Configuración del canal» | literal de presentación | `ConfigPage.tsx` (título de pantalla) | ✅ correcto |
| Nav vertical | 7 etiquetas + 3 grupos | Perfil / Plantillas / Horario / Automatización / Aviso / Alertas / Apariencia | `configuracion.secciones.ts` → `META_SECCION`, `GRUPO_SECCION_LABEL`, `ORDEN_GRUPOS` | ✅ correcto |
| Nav vertical | Icono por sección | 7 iconos | `META_SECCION[x].icono` → mapa tipado `ICONO_SECCION` | ✅ correcto |
| Nav vertical | Estado activo | `aria-current="page"` | estado local `seccion` (una sola montada) | ✅ correcto |
| Perfil | Número conectado | `+57 300 555 1122` | constante de identidad de canal en `ConfigPage.tsx` | ⚠️ constante de presentación — ver §9 |
| Perfil | Nombre visible | `Necto` | constante de identidad de canal | ⚠️ constante de presentación — ver §9 |
| Perfil | Clientes esperando | conteo real | `conversacionesStore.totalRequierenAtencion` | ✅ correcto |
| Perfil | Estado del canal | «Conectado» / «Atención en pausa» | derivado de `draft.horario.activo` + `ESTADO_CANAL_LABEL` / `ESTADO_CANAL_BADGE` | ✅ correcto |
| Plantillas | 7 filas (Recibido → Cancelado) | textos de plantilla | `FILAS_PLANTILLA` (catálogo) ← `pedidosStore.config.plantillas` | ✅ correcto |
| Horario | Interruptor «Aplicar horario» | bool | `draft.horario.activo` | ✅ correcto |
| Horario | 7 píldoras de día | selección 1..7 | `DIAS_ATENCION` (catálogo) ← `draft.horario.dias` | ✅ correcto |
| Horario | Contador de días | «N de 7 días seleccionados» | derivado del array, mismo catálogo | ✅ correcto |
| Horario | Apertura / Cierre | horas | `draft.horario.apertura` / `.cierre` | ✅ correcto |
| Horario | Error de franja inválida | mensaje + borde | `horarioInvalido` (derivado) | ✅ corregido en esta sesión |
| Automatización | Hilos que lleva el bot | conteo | `conversacionesStore.conversaciones.filter(c => c.atencion === "bot").length` | ✅ correcto |
| Automatización | Etiquetas de modo | «Atendido por el bot» / «Atendido por un asesor» | `ATENCION_LABEL` + `ATENCION_BADGE` (store) | ✅ correcto |
| Automatización | Aviso de traspaso | `Alert` explicativo | invariante de handoff documentado | ✅ correcto |
| Aviso de pausa | Mensaje fuera de horario | texto | `draft.plantillas.cancelado` (reutilizado, no campo nuevo) | ✅ correcto |
| Alertas | Interruptor + cada N segundos | bool + número | `draft.alertaAtencion.activo` / `.cadaSegundos` | ✅ correcto |
| Apariencia | Tema: Claro / Oscuro / Sistema | elección | `OPCIONES_TEMA` (catálogo) → `uiStore.setTheme` | ✅ correcto |
| Apariencia | Densidad: Compacta / Cómoda | elección | `OPCIONES_DENSIDAD` (catálogo) | ✅ correcto |
| Pie | «Guardar cambios» / «Descartar cambios» | acciones | `draft` local; `pedidosStore.updateConfig` al guardar | ✅ correcto |

**Sin contradicciones entre superficies.** La página y `/pedidos/config` escriben en la **misma**
clave `necto.pedidosConfig`, verificado por test (§8).

---

## 3. Hallazgos por clase de defecto

### D1 · Valores derivados en línea (corregido — autoinfligido)

**Archivo:** `pages/conversaciones/ConfigPage.tsx` (borrador inicial)
**Fuente de verdad violada:** el contrato `PedidosConfig` en `stores/pedidos.store.ts`

Mi primer borrador inventó cinco campos que no existen: `activo`, `atencion`, `autoReply`,
`pausaActiva`, `pausaMensaje`. `tsc` lo rechazó con *"Property 'activo' does not exist on type
'PedidosConfig'"*.

**Por qué importa:** la salida fácil era **añadir esos campos al store**. Eso es exactamente
«cambiar el contrato para que el diseño encaje», prohibido por la doctrina. La reparación correcta
fue re-derivar cada sección de campos que sí existen:

| Sección inventada | Reemplazo real |
|---|---|
| «El canal está activo» (`draft.activo`) | `draft.horario.activo` |
| «Atención» (`draft.atencion`) | conteos derivados de `conversacionesStore` + `ATENCION_LABEL` |
| «Auto-respuesta» (`draft.autoReply`) | eliminado: el motor de reglas local ya cubre esto; se muestra como lectura |
| «Pausa activa» + «Mensaje de pausa» | `plantillas.cancelado` reutilizado vía `setPlantillaVigilada` |
| «Alertas» arbitrarias | `alertaAtencion.{activo, cadaSegundos}` reales |

**Veredicto:** ✅ reparado. Controles de encendido/apagado inventados sustituidos por **valores
derivados de solo lectura** donde no existía campo real.

### D2 · Vocabulario incrustado (evitado por diseño)

Riesgo: escribir «Recibido», «Confirmado», «En preparación»… como literales en el JSX.

**Mitigación:** `configuracion.secciones.ts` es la **única fuente** del vocabulario de la página.
`FILAS_PLANTILLA` se tipa contra `keyof PlantillasWhatsApp`, así que **añadir una plantilla al
store sin declararla aquí es un error de compilación**. Un test verifica que las 7 claves cubren
todas las del store, en orden de pipeline.

**Veredicto:** ✅ sin literales de dominio en la vista.

### D3 · Verdad partida entre páginas de configuración (evitado y verificado)

Riesgo: dos páginas de configuración derivando el mismo valor por caminos distintos.

**Verificación:** `configuracion.consistencia.test.ts` (8 tests) prueba que ambas páginas escriben
en la **misma** clave de persistencia y que `updateConfig` **fusiona** `plantillas` en lugar de
reemplazar el bloque entero.

**Veredicto:** ✅ sin verdad partida.

### D4 · Fuga de alcance (verificado)

Riesgo: mostrar cifras globales en una pantalla con alcance de operador.

**Verificación:** la ruta está envuelta en `<CapabilityGuard capacidad="channels.manage">` y el
arnés de navegador confirma que **sin esa capacidad la página no se monta en absoluto**
(`navInterna=false`) y se muestra «No tienes acceso a esta sección». La entrada del menú
desaparece para ese rol (`enlace a /conversaciones/config: false`).

**Distinción respetada:** `channels.manage` es una **capacidad** («¿puede gestionar el canal?»).
No se usó para decidir qué datos ve. Los conteos de conversaciones leen del store completo, que es
el alcance correcto de un administrador de canal — no se deriva uno del otro.

**Veredicto:** ✅ sin fuga.

### D5 · Señal de error incompleta (corregido en esta sesión)

**Archivo:** `pages/conversaciones/ConfigPage.tsx`
**Fuente de verdad:** regla de validación `draft.horario.cierre <= draft.horario.apertura`

Una franja horaria inválida deshabilitaba «Guardar cambios» correctamente, pero **no explicaba
por qué**. La única señal era el borde rojo del campo *Cierre*.

Medido por el arnés:
```
FAIL  una franja horaria inválida bloquea el guardado y muestra el error
      — {"deshabilitado":true,"hayError":false}
```

**Reparación:** mensaje textual bajo la rejilla, con el texto ya establecido en
`pages/pedidos/ConfigPage.tsx` para no inventar vocabulario nuevo:

```tsx
{horarioInvalido && (
  <p className="mt-2 text-xs text-error-500">
    La hora de cierre debe ser mayor que la de apertura.
  </p>
)}
```

**Veredicto:** ✅ reparado. Medición posterior: `{"deshabilitado":true,"hayError":true}`.

---

## 4. Reparaciones aplicadas

Todas **solo de capa de presentación**. Ninguna toca el contrato de un store ni una regla de negocio.

| Archivo | Cambio | Por qué es solo presentación |
|---|---|---|
| `pages/conversaciones/ConfigPage.tsx` | **Nuevo.** La página, 40.8 KB | No modifica ningún store; lee selectores existentes |
| `pages/conversaciones/configuracion.secciones.ts` | **Nuevo.** Catálogo de vocabulario, 12.1 KB | Sin JSX; importable desde tests de Node sin runtime de React |
| `pages/conversaciones/index.ts` | Reexporta `ConfigPage as ConversacionesConfigPage` | Solo barrel de módulo |
| `app/App.tsx` | Registra la ruta tras `CapabilityGuard` | Añade una ruta; ninguna existente cambia |
| `app/AppSidebar.tsx` | Tercer ítem de Canales, renderizado condicionalmente | Solo UI; se apoya en `hasPermission`, no en un booleano nuevo |
| `pages/conversaciones/ConfigPage.tsx` | Mensaje de error de franja inválida | Texto de UI derivado de un validador ya existente |
| `.gitignore` | `dist-canales`, `dist-canales2` | Artefactos de build |

**Sin cambios en:** `pedidos.store.ts`, `conversaciones.store.ts`, `session.store.ts`,
`ui.store.ts`, `acceso.utils.ts`, `CapabilityGuard.tsx`, ni en el vocabulario de dominio
`ESTADO_CONVERSACION_*` / `ATENCION_*`.

---

## 5. Runtime del flujo asesor — intents → componentes

`ui_discovery` produjo **16 intents**, todos con candidato viable (ningún callejón sin salida, así
que no hubo que detenerse a reportar). `ui_refine` corrió **una vez por intent**.

| # | Intent | Componente elegido | Alternativas descartadas | Razón |
|---|---|---|---|---|
| 1 | Marco de la página | `BasePage` / `Card` | — | Patrón establecido del proyecto |
| 2 | Título + subtítulo de pantalla | `PageHeader` (scaffolding existente) | — | Ya en la app |
| 3 | Nav vertical de secciones | **Nav personalizado** (`<nav aria-label=…>`) | `Tab` variante `vertical` | `Tab` fija `sm:w-[200px]` y tiñe el activo con `bg-brand-50 text-brand-500`; el diseño pide tinte gris claro |
| 4 | Etiqueta de grupo | `<p>` con `GRUPO_SECCION_LABEL` | — | Parte del nav personalizado |
| 5 | Ítem de sección | `<button>` + icono | — | `aria-current="page"` para el activo |
| 6 | Tarjeta de sección | `Card` + `CardHead` | — | Contenedor estándar |
| 7 | Filas etiqueta/valor | `Label2` (helper local) | — | Etiqueta + descripción atenuada + control |
| 8 | Campo de texto | `Input` | — | Catálogo |
| 9 | Texto largo (aviso de pausa) | `Textarea` | — | Catálogo |
| 10 | Interruptor | `Switch` | — | Catálogo |
| 11 | Píldoras de día | `ChipDia` (helper local) | `Chip` del catálogo | Replica el patrón ya usado en `pedidos/ConfigPage.tsx` |
| 12 | Selección segmentada | `Segmentado` (helper local) | `ButtonsGroup` | `ButtonsGroup` fija `min-w-[393px]`/`min-w-[309px]`, rompe el ancho de la tarjeta |
| 13 | Estados / modo de atención | `Badge` | — | Catálogo |
| 14 | Aviso de traspaso | `Alert` | — | Catálogo |
| 15 | Botón primario y secundario | `Button` (`variant="outline"` para secundario) | — | Catálogo |
| 16 | Pie fijo de acciones | `div.sticky` | `ButtonsGroup` | Mismo problema de ancho mínimo fijo |

**Ningún componente escrito a mano fuera de los 3 helpers locales de layout** (`Label2`,
`CardHead`, `ChipDia`, `Segmentado`), que son composiciones de elementos del catálogo, no
sustitutos de un componente existente.

---

## 6. Manifiesto del paquete

| | |
|---|---|
| Sesión `ui_implement` | `5bb4760d9851` |
| Selecciones empaquetadas | **19** |
| Componentes resultantes | **12** |
| Archivos | **32** |
| Tamaño | **22.0 KB** |
| Solapamiento con el proyecto | ✅ **Ninguno** — solo se marcaron entradas preexistentes de scaffolding (`BasePage`, `Card`) |

**Nota de honestidad:** la URL de descarga **no se extrajo** a `src/` de forma deliberada. Los 12
componentes ya existen en el árbol canónico; extraer el bundle arriesgaba **sobrescribir archivos
canónicos** por coincidencia de hash. Si quieres que lo extraiga, dímelo y lo hago de forma
controlada (diff previo, componente a componente).

---

## 7. Mapa estado → store

| Región del componente | Valor de dominio | Selector / catálogo |
|---|---|---|
| Nav — grupos | CANAL / MENSAJERÍA / PREFERENCIAS | `GRUPO_SECCION_LABEL`, `ORDEN_GRUPOS` |
| Nav — ítems | 7 secciones | `META_SECCION`, `ORDEN_SECCIONES`, `seccionesPorGrupo()` |
| Nav — iconos | 7 iconos | `META_SECCION[x].icono` → `ICONO_SECCION` |
| Perfil — clientes esperando | `number` | `conversacionesStore.totalRequierenAtencion` |
| Perfil — estado del canal | `"conectado" \| "pausado"` | `ESTADO_CANAL_LABEL`, `ESTADO_CANAL_BADGE` |
| Plantillas — 7 filas | `string` ×7 | `FILAS_PLANTILLA` ← `pedidosStore.config.plantillas` |
| Horario — días | `number[]` (1..7, 0=Dom) | `DIAS_ATENCION` |
| Horario — apertura/cierre | `string` `"HH:MM"` | `pedidosStore.config.horario` |
| Automatización — hilos del bot | `number` | `conversacionesStore.conversaciones.filter(atencion === "bot")` |
| Automatización — modo | `"bot" \| "humano"` | `ATENCION_LABEL`, `ATENCION_BADGE` |
| Aviso de pausa | `string` | `pedidosStore.config.plantillas.cancelado` |
| Alertas | `{ activo: boolean; cadaSegundos: number }` | `pedidosStore.config.alertaAtencion` |
| Apariencia — tema | `"claro" \| "oscuro" \| "sistema"` | `OPCIONES_TEMA` → `uiStore.setTheme` |
| Apariencia — densidad | `"compacta" \| "comoda"` | `OPCIONES_DENSIDAD` |
| Permiso de edición | capacidad | `puedeEditarPlantillas()` = `channels.manage`; motivo: `motivoSinPermiso()` |

**Regiones sin resolver: ninguna.** No hubo que calcular nada en línea.

---

## 8. Evidencia de verificación

### Suite de tests

```
Test Files  24 passed (24)
     Tests  431 passed (431)
  Duration  21.83s
```

Los dos archivos nuevos aportan **28 tests**, todos verdes:
- `configuracion.secciones.test.ts` — **20 tests** sobre el catálogo: exhaustividad
  `ORDEN_SECCIONES` ↔ `META_SECCION`, sin duplicados, toda sección en un grupo declarado, todo
  grupo etiquetado, `seccionesPorGrupo()` conserva el total, las 7 secciones exactas,
  `FILAS_PLANTILLA` cubre **todas** las claves de `PlantillasWhatsApp` en orden de pipeline,
  `DIAS_ATENCION` cubre `0..6`, opciones exactas `claro/oscuro/sistema` y `compacta/comoda`,
  colores de badge distintos.
- `configuracion.consistencia.test.ts` — **8 tests** que prueban que **no hay verdad partida**
  entre `/pedidos/config` y `/conversaciones/config`: mutar el borrador no toca el store; clonar
  `horario.dias` evita aliasing de array; guardar persiste en la **misma** clave
  `necto.pedidosConfig`; toda clave de `FILAS_PLANTILLA` resuelve contra el store; `updateConfig`
  **fusiona** `plantillas`; escribir el tema no altera la config de dominio; y `"sistema"` no se
  escribe jamás como tema literal.

*(Nota técnica: `vite.config.ts` fija `environment: 'node'`, así que no existe `localStorage`
global. Los tests instalan un stub `Storage` respaldado por `Map` vía
`vi.stubGlobal("localStorage", …)` en `beforeEach`, y `vi.unstubAllGlobals()` en `afterEach`.)*

### Typecheck

```
15 líneas de error  ·  0 en pages/conversaciones
```

Las 12 preexistentes (15 líneas) son todas de `type Modulo = "pedidos"` contra
`"turnos"`/`"agendamiento"` en `operador`, `seleccionar`, `operadores.store` y `session.store.test`.
**Delta de este trabajo: cero.**

### Build de producción

```
✓ 305 modules transformed.
dist-canales2/assets/index-B0oAlHES.css    122.09 kB │ gzip:  19.27 kB
dist-canales2/assets/index-zVbPFowj.js   1,422.18 kB │ gzip: 388.52 kB
✓ built in 20.39s
```

Solo el aviso estándar de chunk >500 kB.

### Verificación en Chrome real (CDP)

Harness: `outputs/canales-config-verify/verify.mjs` — Chrome headless vía WebSocket nativo de
Node 22, sin dependencias. Capturas en `artifacts/`.

```
── RESUMEN: 31/31 comprobaciones OK ──
```

Cubre, entre otras:

| Comprobación | Resultado |
|---|---|
| Canales muestra Conversaciones / Historial / **Configuración** | ✅ |
| Existe enlace a `/conversaciones/config` | ✅ `texto="Configuración"` |
| `/conversaciones/config` carga, título «Configuración del canal» | ✅ |
| Nav vertical: 7 secciones en orden CANAL · MENSAJERÍA · PREFERENCIAS | ✅ |
| Las 7 secciones son las del diseño, en orden | ✅ |
| Arranca en «Perfil del canal» sin montar plantillas | ✅ solo una sección montada |
| Pulsar «Plantillas de mensaje» cambia el panel | ✅ 7 inputs, perfil desmontado |
| El pie muestra ambos botones | ✅ |
| Editar el borrador se refleja en pantalla | ✅ |
| Editar **no** escribe en el almacén antes de guardar | ✅ |
| Guardar **sí** persiste | ✅ |
| Aparece el acuse «Guardado ✓» | ✅ |
| Descartar revierte al valor confirmado | ✅ |
| Horario desactivado ⟹ no se montan los campos de hora | ✅ |
| Activar ⟹ aparecen apertura, cierre y 7 días | ✅ |
| **Franja inválida bloquea y explica** | ✅ `{deshabilitado:true, hayError:true}` |
| Automatización explica el invariante de handoff | ✅ |
| Apariencia: Claro/Oscuro/Sistema + Compacta/Cómoda | ✅ |
| **No inventa secciones de un backend inexistente** | ✅ ninguna de 11 vetadas |
| La sección activa lleva `aria-current` | ✅ |
| Sin `channels.manage`: la página **no** se monta | ✅ `navInterna=false` |
| Sin `channels.manage`: pantalla de acceso denegado | ✅ «No tienes acceso a esta sección» |
| Sin `channels.manage`: la entrada de menú se oculta | ✅ `enlace=false` |

Sobre las dos últimas: el rol usado es **`d2` (vendedor)**. En el intento anterior sembré
`operadorSimuladoId: 'op-1'`, que **no es un id real** — los operadores sembrados son `d0`
(admin_tienda), `d1` (supervisor_pedidos), `d2` (vendedor) y `d3` (vendedor/pendiente). Con un id
inexistente la sesión caía al estado de administrador y las comprobaciones fallaban **por culpa
del arnés, no de la página**. Corregido el id, ambas pasan: la navegación de `d2` muestra
«VIENDO COMO / Mateo Vargas / Salir de vista», confirmando que la impersonación funciona y que la
capacidad está correctamente ausente.

---

## 9. Preguntas abiertas

1. **Identidad del canal como constantes.**
   `NUMERO_CANAL = "+57 300 555 1122"` y `NOMBRE_VISIBLE_CANAL = "Necto"` son constantes de
   presentación en `ConfigPage.tsx`, no selectores. No existe hoy un store de identidad de canal.
   Se dejaron **de solo lectura**, con la nota «El nombre comercial se gestiona con los datos del
   negocio». Si quieres que sean editables, la reparación correcta es **añadir el selector al
   store**, no convertirlas en `useState`.

2. **`Tab` vertical no es reutilizable tal cual.** Su variante `vertical` fija `sm:w-[200px]` y
   usa tinte de marca (`bg-brand-50 text-brand-500`) donde el diseño especifica tinte gris claro.
   Por eso la nav es personalizada. Si se corrige `Tab`, la nav personalizada podría retirarse.

3. **`ButtonsGroup` descartado por ancho mínimo fijo** (`min-w-[393px]` / `min-w-[309px]`).
   Afectó al pie de acciones y a los controles segmentados, resueltos con un `Segmentado` local
   sobre el estilo de píldora del catálogo.

4. **Desfase menor de vocabulario.** El `Switch` del catálogo no expone texto de pista en este
   proyecto; la sección de alertas usa `Label2` + `aria-label`. Es consistente con el resto de la
   app, pero no con la variante de dos líneas que el catálogo sí tiene.

5. **El bundle de Elements no se extrajo.** Ver §6. Decisión deliberada; reversible si lo pides.

---

## 10. Aviso importante — el repositorio git está dañado

Esto **no** lo causó el trabajo de la página, pero debes saberlo antes de intentar commitear.

**Evidencia:**
- `git status` → `error: bad tree object HEAD`
- `.git/objects/pack/` contiene **solo los `.idx`**; los **dos `.pack`** han desaparecido
- Sobrevive **1 objeto suelto**; `.git` entero pesa **385 KB**
- `git cat-file` falla con *"could not get object info"*

**Causa:** el sandbox de Windows de este entorno elimina archivos de forma intermitente. Ya había
ocurrido antes; en esta sesión se llevó el almacén de objetos.

**Lo que sí recuperé:** las referencias. Reconstruí `.git/refs/heads/master`,
`.git/refs/remotes/origin/master` y `origin/HEAD` desde `.git/logs/refs/heads/master` (punta
`acb5022cb1f7d439182da9e3a47ed08813ae6821`) y desde `.git/packed-refs`, que además registra
`8f6dfefc86170b1ed79180e0451ecef41287fa09 refs/remotes/origin/master`.

**Lo que no se puede recuperar localmente:** el contenido de los paquetes. Sin los `.pack`, los
objetos no existen.

**Recuperación recomendada:** `git fetch origin` cuando haya red, para volver a materializar los
paquetes desde el remoto. Las referencias ya están puestas, así que el fetch debería bastar.

**Tus archivos están intactos.** Verificado tras el incidente:

| Archivo | Tamaño |
|---|---|
| `src/pages/conversaciones/ConfigPage.tsx` | 40 812 bytes |
| `src/pages/conversaciones/configuracion.secciones.ts` | 12 130 bytes |
| `src/pages/conversaciones/configuracion.secciones.test.ts` | 6 470 bytes |
| `src/pages/conversaciones/configuracion.consistencia.test.ts` | 8 257 bytes |
| `app/App.tsx` contiene `ConversacionesConfigPage` | ×2 |
| `app/AppSidebar.tsx` contiene `conversaciones/config` | ✅ |

---

## 11. Archivos entregados

**Nuevos**

| Ruta | Qué es |
|---|---|
| `packages/apps/web/modules/app/src/pages/conversaciones/ConfigPage.tsx` | La página completa (7 secciones, nav vertical, borrador, validación, guard de capacidad) |
| `packages/apps/web/modules/app/src/pages/conversaciones/configuracion.secciones.ts` | Catálogo de vocabulario de la página — fuente única |
| `packages/apps/web/modules/app/src/pages/conversaciones/configuracion.secciones.test.ts` | 20 tests del catálogo |
| `packages/apps/web/modules/app/src/pages/conversaciones/configuracion.consistencia.test.ts` | 8 tests anti-verdad-partida |
| `outputs/canales-config-verify/verify.mjs` | Arnés CDP (31 comprobaciones) |
| `outputs/canales-config-verify/artifacts/*.png` | 5 capturas de pantalla |

**Modificados**

| Ruta | Cambio |
|---|---|
| `src/pages/conversaciones/index.ts` | Reexporta la página |
| `src/app/App.tsx` | Ruta `/conversaciones/config` tras `CapabilityGuard` |
| `src/app/AppSidebar.tsx` | Ítem «Configuración» en Canales, condicional por capacidad |
| `.gitignore` | `dist-canales`, `dist-canales2` |
