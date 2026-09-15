# Pedidos — suite operativa (OMS universal de Necto)

El módulo que **posee el ciclo de vida de la orden**. No es un módulo de cocina, ni de
tienda, ni de logística: piensa en `orden · ítem · cantidad · precio · estado ·
ejecución · entrega · cierre`, y sirve igual para una ferretería, una tienda de ropa,
una panadería, una farmacia, una distribuidora o un restaurante.

> **La regla que resume todo** — *el módulo que posee una capacidad es responsable de
> esa capacidad; los demás la consumen mediante contratos definidos.* Si algo no es de
> Pedidos, Pedidos lo **referencia**, no lo copia.

---

## 1. Arranque rápido

```bash
# desde la raíz del repo, con el dev server vivo (puerto 5173)
node scripts/verify-orders-module.mjs
```

La guarda recorre propiedad (§1, §24), agnosticismo (§7, §22), una sola fuente de
verdad (§4, §8, §13, §14, §16), el registro y la navegación modular del shell (§25, §26)
y el recorrido completo en pantalla: el **Panel** con sus atajos y su deep-link, las cinco
pantallas de trabajo con sus filtros y estados vacíos, el **tablero** de la Bandeja, el
cierre de una orden con su confirmación, el **visor de auditoría** con las duraciones de
cada tramo, la persistencia del umbral de demora, el efecto real de cada ajuste y los
sub-destinos de la barra lateral.

Necesita el dev server y Chrome con `--remote-debugging-port=9222`:

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new \
  --remote-debugging-port=9222 --user-data-dir=/tmp/necto-verify about:blank
```

⚠️ Si Vite no está en el 5173, hay que decírselo: `NECTO_APP_URL=http://localhost:5180`.
Sin eso la guarda habla con un origen muerto y **todo** sale rojo, que es peor que un
fallo real porque entrena a ignorar el rojo.

---

## 2. Mapa del módulo

```
compositions/orders/
├── OrdersModule.tsx              ← shell: los 8 destinos, el detalle único y el movimiento
├── order-status.constants.ts     ← ★ ÚNICA máquina de estados: transiciones, acciones, rótulos
├── operational/
│   ├── order-operations.ts       ← ★ capa operativa: universos, urgencia, atención, filtros
│   └── flow-settings.tsx         ← umbrales del flujo, persistidos por sede (§17)
├── order-presentation.utils.ts   ← colores, iconos, formato de dinero/fecha/duración
├── mock-orders.ts                ← semilla de demostración (7 rubros, 22 órdenes)
├── context/OrdersContext.tsx     ← estado de las órdenes de la sede activa
├── shared/
│   ├── orders-destinations.ts    ← ★ vocabulario de destinos: claves, rótulos, iconos, propósito
│   ├── OrdersScreenHeader.tsx    ← título + descripción + slot `aside` + filtros + alerta
│   ├── OrdersFilterBar.tsx       ← fase · canal · modalidad · búsqueda
│   ├── OrdersTable.tsx           ← tabla de sólo lectura (la fila sólo abre el detalle)
│   ├── OrdersBoard.tsx           ← ★ tablero por carriles (kanban), reutilizable
│   ├── OrdersDayRhythmChart.tsx  ← ★ pulso del día (entradas vs cierres, hora a hora)
│   ├── OrdersEmptyState.tsx      ← vacío explicado, con salida
│   ├── OrdersStagnationAlert.tsx ← alerta de órdenes demoradas
│   ├── OrdersOverdueAlert.tsx    ← alerta de programadas vencidas (§15)
│   ├── OrdersMovementBand.tsx    ← confirmación del movimiento (§27)
│   ├── OrderCells.tsx            ← celdas compartidas entre pantallas
│   ├── use-operational-screen.tsx← cableado común de las 5 pantallas de trabajo
│   ├── use-screen-filters.ts     ← estado de filtros (con remonte de los `Select`)
│   ├── use-order-sort.ts         ← ordenación por columnas
│   ├── use-order-movement.ts     ← memoria de sesión del último movimiento
│   ├── OrderStatusChip.tsx       ← chip de estado (color + icono)
│   ├── OrderSource.tsx           ← origen + panel de origen del detalle (§18)
│   └── OrderTimeline.tsx         ← recorrido con duración por tramo (§10)
├── views/
│   ├── OrdersPanelView.tsx       ← §5  · Panel de Pedidos (atención + destinos + día)
│   ├── OrdersInboxView.tsx       ← §11 · Bandeja de Entrada (lista o tablero)
│   ├── OrdersPreparationView.tsx ← §16 · Mesa de Alistamiento (tarjetas con líneas)
│   ├── OrdersDispatchView.tsx    ← §8  · Despacho y Entrega (por modalidad)
│   ├── OrdersScheduledView.tsx   ← §15 · Programados (por jornada)
│   ├── OrdersHistoryView.tsx     ← §10 · Historial y Auditoría (+ visor)
│   ├── ChannelsView.tsx          ← §18 · Canales de Origen (sólo lectura + puente)
│   ├── OrdersFlowConfigView.tsx  ← §17 · Configuración del Flujo
│   └── OrderDetailDrawer.tsx     ← ★ el detalle §14, única puerta de escritura
└── widgets/PedidosDashboardWidget.tsx  ← §25

contracts/order.contract.ts       ← ★ la frontera del dominio
```

⚠️ `shared/orders-destinations.ts` **no** vive en `OrdersModule.tsx` por una razón
mecánica y una de fondo. La mecánica: el Panel es una vista y necesita listar los
destinos, así que tenerlo en el shell cerraba el ciclo
`OrdersModule → OrdersPanelView → OrdersModule` — que en ESM no siempre revienta, sino
que a veces deja la constante en zona muerta temporal y falla según qué módulo se
evalúe primero. La de fondo: **el vocabulario de destinos no es una propiedad del
shell**, lo consumen cinco sitios. `OrdersModule` lo reexporta, así que ningún
importador cambia.

---

## 3. Los ocho destinos (§26)

La suite no es una vista plana con filtros: son **puestos de trabajo**, y el orden es el
recorrido real del trabajo —del estado del día a lo que se cerró—, no el alfabético.

| Destino | Qué se opera | Regla |
|---|---|---|
| **Panel de Pedidos** | El estado del día y un atajo a cada pantalla | Es la **puerta de entrada**: las cifras viven aquí, no repetidas en cada pestaña (§5) |
| **Bandeja de Entrada** | `PENDING` y `CONFIRMED`: triaje | El trabajo es **decidir**, no ejecutar (§11). Lista o **tablero**, a voluntad |
| **Mesa de Alistamiento** | `IN_PREPARATION`, por urgencia | Tarjetas con las líneas a la vista: la tarea es **leer qué lleva** (§16) |
| **Despacho y Entrega** | `READY`, `IN_TRANSIT` y `DELIVERED` | Separado por **modalidad**: entregar en el local y enviar no son el mismo trabajo (§8) |
| **Programados** | Órdenes con `schedule`, por jornada | Programar **no es un estado**: aquí se ve *cuándo*, no *en qué punto* (§15) |
| **Historial y Auditoría** | `COMPLETED`, `CANCELLED`, `RETURNED` | Un cierre es un hecho consumado: se consulta y se audita (§10) |
| **Canales de Origen** | El **origen** de las órdenes | Sólo lectura + puente a Ajustes de Sede (§18) |
| **Configuración del Flujo** | Parámetros **propios de Pedidos** | La configuración global vive en la Tienda (§17) |

`ORDERS_SECTION_META` (en `shared/orders-destinations.ts`) es la **única** tabla de
rótulos, iconos y propósitos: la consumen la barra del módulo, los sub-destinos de la
barra lateral, el breadcrumb del shell y los atajos del Panel. Con listas paralelas,
"Historial y Auditoría" acabaría siendo "Historial" en un sitio y otra cosa en otro.
`DEFAULT_ORDERS_SECTION` (`"panel"`) es la puerta de entrada compartida por el shell, la
barra lateral y el widget del Dashboard.

### 3.1 Por qué el Panel es una pantalla y no una cabecera

⚠️ Las cinco pantallas de trabajo llevaban **la misma** cabecera de cuatro tarjetas
("Por validar / Confirmadas / Espera larga / En bandeja") — también encima de
Alistamiento, de Despacho y de Programados, donde esos números no responden a la pregunta
de la fase. No eran las métricas de una pantalla: eran un **Dashboard embutido en cada
pestaña**, y por eso se retiraron (`data-orders-metric` ya no existe en el módulo).

Lo que las sustituye es el Panel, que sí es una pantalla y hace tres cosas que la
cabecera no hacía:

1. **Requiere tu atención.** Cuatro condiciones —sin validar hace rato, alistamiento
   demorado, listas y sin despachar, programadas vencidas— en el **orden del flujo**, no
   alfabético: señalar un síntoma antes que su causa hace trabajar en el sitio equivocado.
2. **Cada cifra lleva a su lista, con la fase puesta.** Un contador que no se puede
   accionar es decoración. El destino y la fase se emiten juntos desde `attentionItems()`,
   y la fase tiene que existir de verdad en la pantalla destino.
3. **Tus pantallas.** Un atajo por destino (siete: el Panel no se pone uno a sí mismo) con
   su propósito y **una sola** cifra viva. No se añaden segundas métricas por destino:
   llenarla de números la devolvería al problema que viene a resolver.

⚠️ No hay "Analítica" dentro de Pedidos: el **Dashboard de la Tienda** es otra cosa y
Pedidos sólo aporta un widget (§25). El Panel es una pantalla **del módulo**, con
`ORDERS_SECTIONS` propio, y no toca el Dashboard.

### 3.2 Lo que se dibuja se pulsa; lo que no, no se dibuja

El Panel llegó a tener un conmutador de vista —*Completo / Métricas y Gráficos /
Operativo*— que obligaba a elegir entre **mirar** y **actuar**. Ese conmutador ya no
existe: los gráficos y el operativo son la misma superficie.

La regla que lo sostiene: **todo lo que se dibuja se puede pulsar, y lo que se pulsa
abre exactamente la lista que el dibujo representa.** No es una animación decorativa
sobre una cifra; es un atajo con forma de dato.

| Pieza | Qué dibuja | Qué hace al pulsarla |
| --- | --- | --- |
| `OrdersDayRhythmChart` | El pulso del día: entradas y cierres, hora a hora | — (presenta una *forma*; sus tres totales sí son botones) |
| Cifras del día | Entraron / Completadas / Canceladas | Abre Historial con la fase, o Bandeja sin fase |
| Atajos | Siete destinos, con su cifra viva | Abre ese destino |
| Filas de atención | Lo que se está pasando de tiempo | Abre su pantalla **con la fase puesta** |

Dos decisiones que no son obvias y no conviene deshacer:

1. **`entered` no lleva fase.** Lo que entró hoy está repartido por todo el flujo; ofrecer
   un filtro sería inventar una fase que no existe. Sí lleva fase `completed` y
   `cancelled`, que sí son fases reales de Historial.
2. **El gráfico del día es la única pieza que no navega, y es deliberado.** No presenta
   cifras —presenta una *forma*, con la lectura al pasar el cursor—, así que no incumple
   la regla: no hay ningún número que el operador pueda leer y no pueda accionar.

#### Las dos barras que se retiraron

El Panel tuvo dos barras apiladas —**Flujo por estado** y **Reparto por canal**, en
`shared/OrdersFlowBar.tsx`, hoy en temp— y se retiraron por decisión de producto. El
motivo, para no reponerlas sin querer:

- **El flujo por estado repetía**, en forma de gráfico, la cifra que la tarjeta de destino
  de al lado ya da —y peor: sin el nombre de la pantalla que la resuelve, que es lo que la
  hace accionable—.
- **El reparto por canal es un dato comercial, no operativo.** Quien alista y despacha no
  decide nada por saber el porcentaje que entró por WhatsApp.
- Y las dos juntas ocupaban **la franja más valiosa de la pantalla**, entre lo urgente y
  los atajos.

Con ellas se fueron `stageFlow`, `channelFlow`, `STAGE_FLOW_ORDER` y sus tipos (§7 de
`order-operations.ts`). **`orderCountsBySource` se queda**: lo consume `ChannelsView`. La
guarda lo afirma al revés —`panel.flowBars === 0`—, así que reponerlas la pone roja.

⚠️ Y una regla de honestidad, que costó un defecto real: **el gráfico y la frase que lo
interpreta tienen que usar la misma definición de «cerrada».** `todayHours` contaba como
cierre cualquier orden *tocada* hoy —incluidas las que seguían en alistamiento— y llegó a
pintar **20 cierres** con 2 completadas y 1 cancelada al lado. `dayReading` repetía el
error un piso más arriba: restaba sólo las completadas, así que anunciaba «entraron 18
más de las que se cerraron» sobre una leyenda «Se cerraron» que valía 3. **Cerrada =
`COMPLETED | CANCELLED | RETURNED`, y la fecha tiene que ser de hoy: las dos condiciones
a la vez.**

Las animaciones de los gráficos las pone **Recharts** (`animationDuration`, apagada a `0`
con `prefers-reduced-motion`). Las clases propias que quedan en `styles/theme.css` —
`animate-fade-in`, `animate-scale-up`, `animate-view-transition`— están cubiertas por una
guarda `prefers-reduced-motion` de ámbito de proyecto.

---

## 4. Las cuatro reglas que no se pueden romper

### 4.1 La máquina de estados es una sola

`order-status.constants.ts` gobierna **todo**: qué transiciones existen, qué acciones
ofrece el detalle y cómo se rotula cada estado.

```ts
ORDER_TRANSITIONS        // a dónde puede ir cada estado
canTransition(order, to) // ¿vale para ESTA orden? (filtra por modalidad)
orderActionsFor(order)   // las acciones concretas que se ofrecen ahora
```

```ts
PENDING → CONFIRMED → IN_PREPARATION → READY → [IN_TRANSIT] → DELIVERED → COMPLETED
                                          + CANCELLED / RETURNED
```

`IN_TRANSIT` es **condicional a la modalidad** (`modeUsesTransit`): una recogida, una
atención en sitio y un servicio van `READY → DELIVERED` directamente.

⚠️ **Ninguna vista declara transiciones, ni conjuntos de estados, ni asigna `status` a
mano.** La única puerta de escritura es `transitionOrder(orderId, to, { reason? })`, y
`orderActionsFor` se consume en **un solo** componente — el detalle. La guarda comprueba
ambas cosas: si cada fila ofreciera su propio "Confirmar", habría tantas copias de la
máquina de estados como pantallas.

### 4.2 Los conceptos operativos tienen una sola definición

`operational/order-operations.ts` es la capa operativa: traduce el dominio en lo que cada
pantalla necesita saber. **No es una segunda máquina de estados** — no hay ni un mapa de
estados destino.

```ts
INBOX_STATUSES · PREPARATION_STATUSES · DISPATCH_STATUSES · HISTORY_STATUSES
screenForStatus(status)   // estado → en qué pantalla vive (nadie queda huérfano)
minutesInCurrentState(o)  // desde el HISTORIAL, no desde `updatedAt`
minutesBetween(a, b)      // un tramo histórico: si se midiera contra "ahora" crecería solo
urgencyOf(min, umbral)    // fresh / working / late, derivado del umbral configurado
attentionItems(orders, …) // las 4 condiciones del Panel, con su destino Y su fase
destinationFigures(…)     // la cifra viva de cada destino (una por destino, a propósito)
todayRhythm(orders)       // entró / completó / canceló hoy, medido sobre el historial
orderStateVisits(order)   // cuánto duró cada tramo — el "cuánto costó" del visor (§10)
orderCycle(order)         // abrió → cerró, y el total
```

⚠️ `DELIVERED` pertenece a **Despacho**, y es una decisión: una orden entregada sigue
siendo trabajo de despacho porque el cierre (`DELIVERED → COMPLETED`) es un acto explícito
del operador. Dejándola fuera, una entrega sin cerrar no aparecería en ninguna pantalla de
trabajo.

⚠️ Los **umbrales** (`flow-settings.tsx`) los leen cuatro pantallas y los escribe una. El
provider es único a propósito: si cada pantalla leyera el almacén por su cuenta, cambiar
el umbral no repintaría las demás hasta recargar y "demorada" significaría dos cosas a la
vez. Y las **fases** de cada pantalla se derivan del umbral vivo (`buildPhases(thresholds)`),
así que la pestaña "Demoradas" y la cifra de la cabecera no pueden discrepar.

### 4.3 El vocabulario del núcleo es universal

⚠️ **Nada de `cocina`, `mesero`, `receta`, `comanda`.** Una orden de tornillos y una de
hamburguesas caben en el mismo tipo `Order` sin un solo campo condicional — y eso lo
comprueba la guarda, con una semilla de **siete rubros** que es la única excepción
declarada al barrido (nombra "Cocina" o "Mesa 7" porque son *datos* de una orden de
restaurante, no vocabulario del modelo).

⚠️ "Mesa" sí es vocabulario del módulo —**Mesa de Alistamiento** es un puesto de trabajo—
así que lo que se prohíbe es la **mesa como sujeto de la orden**: un campo `mesaId` o una
orden identificada por su mesa en vez de por su número.

### 4.4 El estado no se comunica sólo con color

`ORDER_STATUS_TONES` alimenta color **e** icono (`ORDER_STATUS_ICONS`). §27 exige que un
estado se identifique sin depender del color, así que el chip siempre lleva su icono además
del tinte. Lo mismo con la urgencia (`URGENCY_TO_BADGE`) y con la programación
(`SCHEDULE_STATE_TO_BADGE`).

---

## 5. Fronteras de propiedad

| Pedidos **es dueño de** (§24) | Pedidos **no es dueño de** (§24) |
|---|---|
| `Order`, `OrderItem`, `OrderStatus` | `Product` — guarda sólo la **referencia** + el precio histórico |
| `OrderStatusHistoryEntry` (§10) | `Inventory` / stock (§19 — no hay existencias aquí) |
| `OrderFulfillment` (dirección, ventana) | `Store` — `businessId` como referencia (§2) |
| `OrderPayment` (estado del pago de la orden) | `Customer` como dominio global (guarda `OrderRequester`) |
| `OrderSchedule` (§15) | `Channel` / WhatsApp (§18 — sólo acepta un origen normalizado) |
| `OrderSource` (origen normalizado) | `AI Assistant` (§21 — no hay agente aquí) |

```ts
// ✅ Así se referencia el catálogo sin poseerlo:
item.productRef        // id/name del artículo — no el artículo
item.unitPrice         // precio VIGENTE al momento de la orden: es un hecho suyo
```

`OrderItem` **no** tiene `stock`, ni `available`, ni `reserved`. El inventario es otro
módulo; si Pedidos lo consultara, dejaría de ser reemplazable (§29).

**Canales de Origen** es la frontera más delicada: Pedidos necesita saber *qué orígenes
puede esperar* (lo lee de `channelConnections` de la tienda con `isChannelConnected`) y
**cuánto** entra por cada uno (lo calcula sobre `order.source`, un dato suyo). No conecta
WhatsApp: ni QR, ni Embedded Signup, ni tokens, ni webhooks. La guarda lo comprueba por
los **controles** que existen —el único botón es el puente a Ajustes de Sede y no hay ni
un campo de formulario—, no por las palabras que se leen.

---

## 6. El detalle (§14) — la superficie crítica

El detalle se monta **una sola vez**, en el shell, no en cada vista: si cada pantalla
abriera su propio drawer, dos pantallas podrían divergir en qué acciones ofrecen. Y sus
acciones **no son botones estáticos**: salen de `orderActionsFor(order)`.

```
PENDIENTE  → Confirmar orden · Cancelar orden      ← el ejemplo de §14
READY      → Marcar como entregada · Despachar* · Cancelar
ENTREGADA  → Completar orden
COMPLETADA → Registrar devolución
```

`*` Despachar sólo si la modalidad usa transporte (§8).

Cancelar y devolver **exigen motivo** (`requiresReason`): el historial tiene que poder
responder *por qué* (§10), así que el botón queda bloqueado hasta que se escriba. Cada
acción lleva además su **consecuencia escrita** (§27): "Despachar" y "Marcar como
entregada" son indistinguibles para quien no memorizó la máquina de estados.

> ⚠️ **Trampa del DS** — `Textarea` recibe `onChange(value: string)`, **no** el evento (al
> revés que `Input`). `(e) => setReason(e.target.value)` guardaría `undefined` en silencio
> y compilaría igual. En el drawer ya está bien hecho; no lo "arregles".

### El movimiento es un hecho visible (§27)

Cuando una orden avanza, su fila **desaparece** de la pantalla. Sin confirmación, eso se
lee como "se perdió", no como "avanzó". La cadena es:

```
OrderDetailDrawer  --onTransition-->  OrdersModule (useOrderMovement)
                                            |
                          OrdersMovementNotice (la vista activa lo pinta)
                                            |
                          «Ver en <destino>» -> screenForStatus(to)
```

⚠️ El rótulo del destino lo calcula **una** pieza (`OrdersMovementNotice`), no cada vista:
si la Bandeja lo escribiera a mano, diría "Ver en Historial" para una orden que en realidad
está en Despacho.

---

## 7. El widget en el Dashboard de Tienda (§25)

`PedidosDashboardWidget` vive en `widgets/` **pero pertenece al módulo**. Se declara en
`store-dashboard/dashboard-widgets.tsx` con `source: "pedidos"`, y el shell lo filtra por
`business.activeModules`: si el módulo se desacopla, el widget desaparece sin que el
Dashboard sepa que existió.

```tsx
{ id: "pedidos-summary", source: "pedidos", span: "full", order: 20, render: … }
```

⚠️ El widget **no navega por su cuenta**: pide
(`ctx.onOpenModuleView?.("pedidos", DEFAULT_ORDERS_SECTION)`) y el shell decide a dónde
lleva. Duplicar la navegación en el widget sería dos fuentes de verdad para la misma ruta
— y escribir un literal en vez de la constante del módulo es lo que hizo que pidiera una
sección que ya no existía y "funcionara" sólo por el fallback.

---

## 8. El `OrdersProvider` se monta una sola vez

```
NectoApp
└── <OrdersProvider businessId={activeBusiness?.id}>
    ├── <StoreDashboard>          ← el widget lee de aquí
    └── <OrdersModule>            ← la vista lee de aquí
        └── <OrdersFlowSettingsProvider>   ← los umbrales son de Pedidos, no de la Tienda
```

⚠️ **No montes un segundo provider dentro de `OrdersModule`.**

- Si viviera sólo dentro del módulo → el widget (que se pinta **fuera**) lanzaría
  `useOrders must be used within an OrdersProvider`.
- Si viviera en los dos sitios → serían **dos almacenes**: confirmar una orden en el módulo
  no la cambiaría en el widget.

El `businessId` dentro del provider es lo que hace que al cambiar de sede se recargue el
subconjunto correcto. La persistencia (`necto_orders_v1`) guarda **todas** las sedes y
`mergeWithOtherStores` preserva las ajenas al escribir. Lo mismo con `necto_orders_flow_v1`
para los umbrales: se reescribe sólo la sede actual.

---

## 9. Añadir un módulo al shell (patrón reutilizable)

Pedidos es el primer módulo con vista. Para que otro aterrice:

1. **`NectoApp.tsx`** → añade su clave a `MODULES_WITH_VIEWS` y ramifica el cuerpo por
   `surface === "module-view"`.
2. **`StockFlowSidebar.tsx`** → añade una entrada a `MODULE_NAV_ENTRIES` (la barra sólo
   lista módulos **acoplados** y **con vista**), y si tiene sub-destinos, pásalos desde el
   shell como datos — la barra **no conoce el módulo**.
3. **`dashboard-widgets.tsx`** → declara su widget con `source: "<módulo>"`.

El shell no pregunta por módulos concretos: filtra por `source` y por `activeModules`. Eso
es lo que permite que un módulo nuevo no toque el shell — y lo que la guarda
`verify-store-dashboard.mjs` defiende.

---

## 10. Cómo ampliar sin romper

| Quiero… | Hazlo en | No lo hagas en |
|---|---|---|
| Un estado nuevo | `order-status.constants.ts` (mapa + rótulo + tono) **y** asignarlo a un universo en `order-operations.ts` | Ninguna vista |
| Una acción nueva | `ORDER_TRANSITION_REQUIREMENTS` + `ACTION_LABELS` | Un botón a mano en el drawer |
| Un campo de la orden | `contracts/order.contract.ts` | Un campo condicional por rubro |
| Una cifra que reclame atención | `attentionItems()` (condición + destino + fase + rótulo + detalle) | Un contador suelto en una vista |
| Un destino nuevo | `ORDERS_SECTIONS` + `ORDERS_SECTION_META` (clave, rótulos, icono y **propósito**) | Un literal en una barra o en el breadcrumb |
| Un concepto operativo | `order-operations.ts` (una sola definición) | `Date.now()` suelto en una vista |
| Un umbral del flujo | `flow-settings.tsx` + su control en `OrdersFlowConfigView` **con su efecto medido** | Una constante copiada en cada pantalla |
| Un dato de rubro | `BusinessSemanticConfig` (**de la Tienda**) | El contrato de Pedidos |
| Una pantalla nueva | `views/` + registrarla en `ORDERS_SECTIONS` y `ORDERS_SECTION_META` | Un modo más dentro de otra pantalla (§11) |
| Un gráfico nuevo | `order-operations.ts` (la serie, **medida**) + un componente de `shared/` que la pinte **y la accione** | Una serie calculada dentro del JSX, o un `|| 14` de relleno |

⚠️ Al añadir una sección a `ORDERS_SECTIONS`, el shell **rompe la compilación** hasta que
le pongas rótulo en `ORDERS_SECTION_META`: es deliberado, para que la URL, el breadcrumb y
las tres navegaciones no puedan divergir.

⚠️ Al añadir un ajuste a `OrdersFlowConfigView`, hay que darle su **efecto medido**
(`data-orders-effect`) sobre órdenes reales. Un control sin efecto es exactamente el
adorno que había antes: se guarda un número y ninguna superficie lo lee. Si el ajuste no
cambia nada que se pueda ver, no es un ajuste.

⚠️ Al añadir un **estado** al contrato, hay que decidir en qué pantalla se opera. Si no, cae
en el `return` final de `screenForStatus` y aparecería en Historial como si fuera un cierre.

⚠️ Al añadir una **serie** a un gráfico del Panel, la cifra se mide en `order-operations.ts`
y la vista sólo la pinta. La analítica que hubo aquí se retiró justamente por esto: pintaba
`counts.whatsapp || 14` canales, un `factor = 1.4` de fin de semana y un `+12.5%` escrito a
mano — 63 canales sobre un almacén de 25 órdenes. Y leía `order.source.channel`, un campo
que **no existe** en el contrato, así que el `||` disparaba siempre. Una serie que no sale
de una medición no es un dato: es una opinión con forma de gráfico.

---

## 11. Estado actual y lo que falta

**Implementado:** la suite completa —8 destinos, el **Panel** como puerta de entrada con
sus **siete tarjetas de destino** (cada una abre su lista, con la cifra viva al lado) y su
**gráfico del día** en Recharts, 5 pantallas de
trabajo con filtros con conteo, el **tablero** de la Bandeja, el detalle con acciones
derivadas, el **visor de auditoría** con duración por tramo, los umbrales persistidos por
sede con **efecto medido**, los dos avisos con consumidor real, el movimiento confirmado, la
semilla de 22 órdenes y 7 rubros, y el widget del Dashboard— y su guarda de regresión
(199 aserciones).

**Backend / futuro** (fuera del alcance por decisión explícita del usuario):

- Multi-tenant real: hoy es `localStorage`. El `businessId` ya va dentro de cada orden, así
  que el registro puede moverse fuera del navegador sin cambiar el contrato.
- Los módulos `referidos`·`agendamiento`·`reservas`·`inventarios`·`turnos` siguen **sin
  implementar**: Pedidos es el único con vista.
- Los eventos (`pedidos.order.lifecycle`) se publican pero nadie los consume todavía.
- Sin paginación ni virtualización: con 22 órdenes sembradas no hace falta, y añadirla
  antes de que la lista lo pida sería complejidad sin dueño.
- El **tablero** sólo existe en la Bandeja. Alistamiento, Despacho y Programados podrían
  tener el suyo reutilizando `OrdersBoard`, pero cada uno tendría que declarar sus
  carriles: el tablero no se generaliza solo, y un kanban con carriles inventados es peor
  que una tabla.
