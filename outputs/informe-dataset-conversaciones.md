# Replanteo del dataset de conversaciones de WhatsApp

**Fecha:** 2026-09-17
**Alcance:** `conversaciones.seed.ts`, `pedidos.store.ts` (seed), pruebas asociadas
**Tipo de cambio:** datos de demo + gobernanza de catálogo. **Cero cambios de contrato.**

---

## 1. Qué se eliminó y por qué

El dataset anterior eran **4 hilos que contaban la misma historia**:

| Hilo anterior | Guion | Defecto |
|---|---|---|
| conv-1 | cliente pide → bot pregunta → bot crea pedido | plantilla repetida |
| conv-2 | cliente pide → bot pregunta → bot crea pedido | plantilla repetida |
| conv-3 | cliente pide → bot pregunta → bot crea pedido | plantilla repetida |
| conv-4 | cliente pide → bot pregunta → bot crea pedido | plantilla repetida |

Los cuatro compartían estructura, longitud y desenlace. Como dataset de un canal
de atención al cliente, el problema no era cada hilo por separado: era que **la
bandeja entera demostraba una sola capacidad** (crear pedidos) y sugería que todo
contacto termina en compra. Además, las fechas estaban fijas en `2024-06-03`, de
modo que cualquier preview decía *"836 days"* — incoherente con una conversación
"reciente" y con el resto de la aplicación.

**Conclusión:** no se corrigieron; se reemplazaron.

---

## 2. El dataset nuevo — 8 hilos, 8 intenciones

Cada hilo se escribió alrededor de **la necesidad del cliente**, no del módulo.

| # | Intención | Desenlace | Estado / Atención | ¿Crea pedido? |
|---|---|---|---|---|
| conv-1 | Consulta de producto (*"¿qué trae el combo clásico?"*) | bot informa desde el catálogo | `abierta` / `bot` | No |
| conv-2 | Consulta de disponibilidad (*"¿les quedan postres del día?"*) | bot responde **honestamente lo que puede comprobar** | `abierta` / `bot` | No |
| conv-3 | Crear pedido | bot pide lo que falta → **resume** → **pide confirmación** → registra | `atendida` / `humano` | Sí (1) |
| conv-4 | Consultar pedido existente (*"¿no sé si llegó?"*) | bot consulta el pedido **del store** | `abierta` / `bot` | No |
| conv-5 | Problema con pedido (cambiar dirección) | bot **no puede** sobre un pedido `listo` → **escala** | `en_espera` / `humano` | No |
| conv-6 | Pago pendiente | bot explica el estado **del pedido** | `abierta` / `bot` | No |
| conv-7 | Pide una persona (cobro no reconocido) | handoff → operador toma → **responde** | `atendida` / `humano` | No |
| conv-8 | Consulta general (horarios y retiro) | se resuelve y **cierra** | `cerrada` / `bot` | No |

**Reparto de desenlaces: 1 de 8 termina en pedido.** Ese es el punto. El arco que
la bandeja demuestra de un vistazo es
`consulta → información → intención → acción → seguimiento → handoff`.

### Reglas de redacción aplicadas a los 8

- El cliente escribe como escribe la gente: minúsculas, frases sueltas, sin jerga
  de negocio.
- El bot responde en 1–3 frases. **Sin listas numeradas** ni menús de opciones,
  salvo cuando la pregunta es realmente un menú.
- **Prohibido "pedido registrado" antes de que el cliente confirme.**
- Emojis: se eliminaron `👋🍰✅🛍️1️⃣2️⃣3️⃣`. Sobreviven dos, puntuales.
- Cada hilo tiene una extensión humana (4–10 ítems): ni un mensaje que lo
  resuelve todo, ni 30 mensajes de relleno.

---

## 3. Modelo temporal — por qué "836 days" no puede volver

El seed pasa de fechas fijas a **offsets relativos** sobre una única base:

```ts
const BASE_MS = Date.now();
const haceMin = (min: number): string => new Date(BASE_MS - min * 60_000).toISOString();
```

Una sola `BASE_MS` compartida por todo el archivo garantiza que los hilos sean
coherentes **entre sí**, no solo dentro de cada uno: si conv-1 es "hace 6 min" y
conv-8 "hace 17 h", el orden es real y no depende de cuándo se abra la demo.

Rango: de **hace 5 minutos** (lo más reciente) a **hace ~17 h / ayer** (el hilo
cerrado). La bandeja muestra así *"ahora · hace X min · hace X h · ayer"*.

### Defecto encontrado y corregido en este mismo paso

El guard temporal detectó que **`conv-8` tenía el header en `haceMin(1_020)` pero
su último mensaje en `haceMin(1_027)`** — una inversión de 7 minutos. Como
`ultimaActividad` es la **clave de orden de la bandeja**, ese valor redondeado
"hacia delante" habría adelantado el hilo por delante de mensajes que en realidad
ocurrieron después. Corregido a `haceMin(1_027)`, derivado del tail real.

> **Invariante ahora protegido por test:** `conv.ultimaActividad === last(lineaDeTiempo(conv.id)).timestamp`
> para los 8 hilos.

---

## 4. Separación conceptual de ejes

No se mezclan, y ahora hay un test que lo impide:

| Eje | Valores | Dónde vive |
|---|---|---|
| **CONVERSACIÓN** | `abierta` · `en_espera` · `atendida` · `cerrada` | `Conversacion.estado` |
| **ATENCIÓN** | `bot` · `humano` (+ `operadorAsignadoId`) | `Conversacion.atencion` |
| **PEDIDO** | `nuevo` → `confirmado` → `en_preparacion` → `listo` → `en_camino` → `entregado` (↘ `cancelado`) | `Pedido.estado` |
| **PAGO** | `Pedido.pagado` | **el PEDIDO**, nunca la conversación |

**El caso que lo demuestra:** `conv-6` habla de un pago pendiente (`pd5`, en
camino, `pagado:false`) y la conversación sigue siendo **`abierta` + `bot`**.
"Pendiente de pago" no es un estado de conversación. El pago se lee del pedido en
el panel de contexto.

**Lo que NO se hizo:** no se inventó un dominio de pago con estados
(pendiente/pagado/fallido/reembolsado). El modelo real solo tiene
`Pedido.pagado?: boolean`, así que se respetó ese contrato en lugar de fabricar
uno nuevo. *Reportar la deriva, no absorberla.*

---

## 5. Los dos seeds ahora concuerdan

El teléfono es la clave de cruce y **los dos seeds guardan formatos distintos**
(pedidos: `+573001112233`; conversaciones: `+57 300 111 2233`). Se alinearon las
identidades y los tiempos:

| Pedido | Cliente | Corrección aplicada |
|---|---|---|
| `pd1` | Ana Silva | dueño corregido (`Juan Carlos` → su cliente real) + teléfono alineado con conv-3 |
| `pd4` | Lucía Torres | `estado:"listo"` — **requisito narrativo**: no se puede cambiar la dirección de un pedido despachado, así que la escalada de conv-5 es legítima |
| `pd5` | Andrés Gil | `estado:"en_camino"`, `pagado:false` — ancla del hilo de pago |
| `pd6` | Sofía Díaz | teléfono corregido (`+573006667788` → `+573017773344`), `pagado:true` |
| `pd7` | Valentina Ríos | teléfono corregido (`+573007778899` → `+573018889900`) |

Resultado verificado — cada hilo resuelve su contexto sin arrastrar pedidos ajenos:

```
conv-1  Juan Carlos      pedidos=0  activo=—            ← consulta pura
conv-2  Carlos Mendoza   pedidos=0  activo=—            ← consulta pura
conv-3  Ana Silva        pedidos=1  activo=P-001/nuevo
conv-4  Sofía Díaz       pedidos=1  activo=—            ← su pedido ya está entregado
conv-5  Lucía Torres     pedidos=1  activo=P-004/listo
conv-6  Andrés Gil       pedidos=1  activo=P-005/en_camino/pagado=false
conv-7  Valentina Ríos   pedidos=1  activo=—
conv-8  Diego Ramírez    pedidos=0  activo=—
```

---

## 6. Revisión del panel de contexto — "no un mini-ERP"

El panel expone: perfil (nombre, teléfono, pedidos totales, total gastado),
acciones rápidas, notas internas y **la lista de pedidos del contacto**. Se
revisó contra el dataset nuevo y se fijaron guardas permanentes:

| Regla | Guarda |
|---|---|
| R1 | Ningún estado de pago se expone como estado de conversación; el contacto no tiene campo `pagado` |
| R1b | `conv-6` sigue `abierta`/`bot` y el pago se lee del pedido |
| R2 | El hilo de consulta resuelve un pedido **preexistente**; abrirlo no crea nada |
| R2b | Todo teléfono del seed cruza sin arrastrar pedidos ajenos |
| R3 | Ningún contacto supera 4 pedidos — techo deliberadamente bajo |
| R3b | Existen **ambos** casos (con pedido / sin pedido) |

**Matiz de dominio documentado:** `pedidoActivoDe` excluye terminales. El pedido
de Sofía (`pd6`) ya está `entregado`, así que su consulta resuelve el histórico y
deja el panel **sin pedido vivo**. Eso es correcto (pregunta por un pedido
cerrado), y el test fija los dos casos: conv-4 sin activo, conv-6 con activo.

---

## 7. Eventos de sistema — cero bucles artificiales

**8 hilos, 2 eventos en total**, ambos hechos reales:

- `evt-5-1` — `handoff_solicitado` (conv-5 escala porque el bot no puede resolver)
- `evt-7-1` — `handoff_solicitado` + `evt-7-2` — `tomada` (conv-7, ciclo completo)

**Cero eventos `devuelta`.** No existe ningún bucle "tomada → devuelta al bot →
tomada". Y **ningún preview de la bandeja es un evento de sistema**: los 8
previews son contenido conversacional real, verificado con diagnóstico.

---

## 8. Verificación

| Comprobación | Antes | Después |
|---|---|---|
| `vitest run` | 375 en 20 archivos | **399 en 22 archivos — todo verde** |
| `tsc --noEmit` | 12 errores preexistentes | **12, delta 0; 0 en archivos tocados** |
| `vite build` | — | **OK, 301 módulos** |
| Invariante D2 | intacto | **intacto** (solo comentarios, cero imports) |

### Guardas nuevas (24 tests)

- `conversaciones.seed.test.ts` — **18 tests**: composición e intenciones,
  separación de ejes, coherencia temporal, previews de bandeja, sin placeholders.
- `panel-contexto.seed.test.ts` — **6 tests**: las reglas R1–R3b del punto 6.

El dataset quedó **blindado**: los defectos eliminados no pueden volver en
silencio.

### Lección de verificación registrada

`serieVentasYCancelaciones` se volvió robusto ante la hora del día. El seed usa
tiempos relativos, así que cuántos pedidos caen en "hoy" **depende de la hora a la
que corra el test** (a las 00:10 casi todos son de hoy; a las 23:50 casi todos de
ayer). Se reescribió para aseverar **la propiedad de separación** derivada del
store, no un número fijo.

---

## 9. Cuestiones abiertas (declaradas, no absorbidas)

1. **Inventario no está conectado.** No existe módulo `inventario` en
   `modules-tools/` (solo `pedidos`). `conv-2` se modela por **ausencia honesta**:
   el bot dice *"no manejo un número exacto de unidades desde aquí"* y ofrece
   alternativas. Es el comportamiento correcto dado el estado real del producto,
   pero conviene decirlo explícitamente: **no hay una conversación que demuestre
   consulta de stock real**, porque esa capacidad no existe todavía.
2. **Las métricas de analítica siguen siendo relativas al arranque.** Es
   inherente al seed (`minutesAgoIso`), no un defecto introducido. El test está
   blindado; la store mantiene su comportamiento por diseño.
3. **`en_espera` solo es alcanzable vía `conv-5`.** Es el único hilo que requiere
   atención humana sin haber sido tomado. Suficiente para poblar la categoría,
   pero es un único punto.
4. **El modelo de pago es binario** (`Pedido.pagado?: boolean`). Los estados del
   mandato (`pendiente` / `pagado` / `fallido` / `reembolsado`) **no están
   modelados**. No se inventó un dominio para cubrirlos.

---

## 10. Archivos modificados

```
M  src/stores/conversaciones.seed.ts             (reescrito: 8 hilos / 8 intenciones)
M  src/stores/pedidos.store.ts                   (seed alineado: identidades, tiempos, pagado)
M  src/stores/conversaciones.store.test.ts       (aserciones acopladas al dataset)
M  src/stores/pedidos.store.test.ts              (test de analítica robusto a la hora)
M  src/pages/conversaciones/components/chat-drawer.resolucion.test.ts
A  src/stores/conversaciones.seed.test.ts        (18 guardas de product rule)
A  src/pages/conversaciones/components/panel-contexto.seed.test.ts  (6 guardas del panel)
M  ../../../../.gitignore                        (dist-v4)
```

**Ningún archivo de contrato, store público o lógica de negocio fue modificado.**
Todo el cambio vive en datos de demo y en los tests que los gobiernan.
