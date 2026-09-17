# Análisis arquitectónico — Flujo de atención por WhatsApp
## Ambigüedad operativa entre «Consulta de Inventario/Stock» y «Gestión de Pedidos»

**Fecha:** 2026-09-17
**Rol:** Arquitecto de Software / Diseñador de Sistemas Senior
**Ámbito:** `packages/apps/web/modules/app/src` (árbol git-tracked, autoritativo)
**Estado del entrega:** Análisis y propuesta. **Fases 0, 1 y 2 YA IMPLANTADAS** (ver §10 al
final). Fases 3-5 y las superficies de UI: pendientes.

---

## 0. Resumen ejecutivo y veredicto

**El problema no es que falte una etiqueta: es que la bandeja no tiene un eje de
clasificación.** Hoy `BandejaLista` clasifica exclusivamente por **estado de atención**
(`abierta | en_espera | atendida | cerrada`) y por **no leídos**. «Consultó si hay postres» y
«va a comprar dos combos» se renderizan **literalmente igual**. El operador solo distingue
porque lee el preview y el badge de pedido — es decir, distingue *leyendo*, no *mirando*.

**El mecanismo de clasificación ya existe y está huérfano.** `Mensaje.moduloContexto`
(`conversaciones.types.ts:52`) y el selector `modulosDe(convId)`
(`conversaciones.store.ts:551`) fueron diseñados exactamente para esto. `modulosDe` **no tiene
ni un solo consumidor** en todo `src/`. No es un problema de modelo: es un problema de
cableado.

**Pero hay un defecto que lo inutiliza en runtime.** El adaptador del bot devuelve
`{ texto, payload }` y **nunca** propaga el dominio (`conversaciones-bot.adapter.ts:151`), y
`simularRespuestaBot` llama a `agregarMensajeBot(convId, texto, payload)` **sin el cuarto
argumento `moduloContexto`** (`conversaciones.store.ts:920`). Resultado: la clasificación
derivada funciona con los 8 hilos del seed y se **degrada en cuanto el usuario escribe**. Es
una clasificación que muere al primer uso real.

**El dominio no hay que adivinarlo: ya lo declara la herramienta que respondió.**
`ToolResult.sources: ToolSource[]` y `ToolSource { toolId, module: Modulo, detail }`
(`assistant/contracts/tool.contract.ts:61-66`). Quién contestó sabe de qué dominio es la
respuesta. Hoy esa evidencia se tira.

**Veredicto:**

| # | Decisión | Veredicto |
|---|---|---|
| 1 | ¿Dónde vive la clasificación? | **Derivada reactivamente en el store**, nunca persistida como campo de `Conversacion` |
| 2 | ¿Qué clasifica? | **Dos ejes separados: DOMINIO** (pedidos / inventario / general) **e INTENCIÓN** (consultar / comprar / seguir pedido). Son cosas distintas y la UI las necesita por separado |
| 3 | ¿Detección por IA? | **Descartada** para este proyecto (sin backend, motor de reglas local, no determinista, no testeable) |
| 4 | ¿Triage manual? | **No como fuente primaria.** Solo como *override* explícito y auditado, y solo si el negocio demuestra una clase de error que la derivación no cubre |
| 5 | ¿Cómo encaja Inventario sin existir? | **Por etiqueta, no por dependencia.** El canal conoce el *nombre* de la capacidad de negocio (`ModuloDestino`), nunca sus datos. Cero acoplamiento, invariante D2 intacta |
| 6 | Alternativa recomendada | **B: derivación reactiva desde el store** (+ cierre del hueco del adaptador como prerrequisito). D queda como evolución opcional |

---

## 1. Mapa del estado actual (con evidencia)

### 1.1 El modelo

```ts
// conversaciones.types.ts
type EstadoConversacion = "abierta" | "en_espera" | "atendida" | "cerrada";   // :13
type ModoAtencion      = "bot" | "humano";                                    // :16
type ModuloDestino = "pedidos"|"turnos"|"agendamiento"|"inventario"|"general";// :22

interface Mensaje {
  moduloContexto?: ModuloDestino;                    // :52  ← LA SEÑAL
  payload?: { pedidoId?, turnoNumero?, items? };     // :57-61
}

interface Conversacion {
  estado; atencion; operadorAsignadoId; noLeidos; ultimaActividad;
  pedidoActivoId?: string;  // :125 @deprecated — segunda fuente de verdad, nunca poblado
}
```

Observaciones estructurales:

- **Cinco valores en `ModuloDestino`, uno solo implementado.** `modules-tools/` solo contiene
  `pedidos`; `MODULOS_CONOCIDOS` está forzado por test a ser exactamente
  `[new PedidosToolProvider().module]` (`pages/asistente/configuracion.consistencia.test.ts:141`).
  `inventario` es una **declaración de intención hacia el futuro**, no una capacidad.
- **`pedidoActivoId` está deprecado con un argumento arquitectónico impecable** (`:115-124`):
  guardarlo sería una segunda fuente de verdad frente a `pedidosStore`. **Ese mismo argumento
  es el que decide todo este análisis**: lo mismo aplica a «intención» e «inventario».
- `Mensaje.payload` solo transporta primitivos/ids — el encapsulamiento está bien resuelto en
  el tipo.

### 1.2 El dataset (8 hilos)

| Hilo | Intención real del cliente | `moduloContexto` dominante | Pedido | Estado / Atención |
|---|---|---|---|---|
| conv-1 Juan Carlos | Consulta de producto (qué trae / cuánto cuesta) | `pedidos` | — | abierta / bot |
| conv-2 Carlos Mendoza | **Disponibilidad / stock** | `inventario` (msg-2-2, msg-2-4) | — | abierta / bot |
| conv-3 Ana Silva | **Crear pedido** (resumen → confirmación) | `pedidos` | `pd1` (nuevo) | atendida / humano |
| conv-4 Sofía Díaz | **Seguir pedido existente** | `pedidos` | `pd6` (entregado) | abierta / bot |
| conv-5 Lucía Torres | Problema con pedido → escala | `pedidos` | `pd4` (listo) | en_espera / humano |
| conv-6 Andrés Gil | Pago pendiente (postventa) | `pedidos` | `pd5` (en_camino) | abierta / bot |
| conv-7 Valentina Ríos | Handoff a humano | `general` | — | atendida / humano |
| conv-8 Diego Ramírez | Consulta general (horarios) → cierra | `general` | — | cerrada / bot |

Distribución: **1 hilo de inventario**, **5 de pedidos**, **2 generales**. Solo **1 de 8**
termina en pedido creado dentro del hilo (conv-3); **2 referencian un pedido previo**
(conv-4, conv-6); **4 no tienen pedido en absoluto** (conv-1, conv-2, conv-7, conv-8).

Esa proporción es el argumento de negocio del cambio: **la mitad de la bandeja no es
transaccional**, y la UI no lo refleja.

### 1.3 Lo que el operador ve hoy (`BandejaLista.tsx`)

```
[Avatar + punto]  NombreContacto  [⚠️ Asesor]  [#P-001][Nuevo]      hace 6 min
                  preview del último mensaje                          [1]
```

- `:218-222` → badge «⚠️ Asesor» si `requiereAtencionHumana(conv)` (≡ `estado === "en_espera"`).
- `:226-241` → badge de número de pedido + estado **solo si** `pedidosStore.pedidoActivoDe(tel)`
  devuelve algo.
- `:244` → `tiempoRelativo(conv.ultimaActividad)`.
- `:181` → preview = `ultimoTexto(conv.id)`.
- `:18-23` + `:93-119` → los mismos filtros en **píldoras y en dropdown**.

Lo que **no** hay: ningún elemento que exprese dominio, intención o naturaleza del hilo.

---

## 2. Matriz de consistencia

| # | Superficie | Elemento | Valor mostrado | Fuente de verdad | Veredicto |
|---|---|---|---|---|---|
| M1 | `BandejaLista:218` | Badge «⚠️ Asesor» | literal embebido + clases ámbar | Debería ser `ESTADO_CONVERSACION_LABEL/BADGE` (`conversaciones.store.ts:70,85`) | **Vocabulario y color hardcodeados**, al margen del catálogo |
| M2 | `BandejaLista:226-241` | Badge pedido + estado | `pedidosStore.estadoLabel/estadoBadgeColor` | `pedidosStore` | **Correcto** |
| M3 | `BandejaLista:190` | Pedido activo del contacto | `pedidosStore.pedidoActivoDe(telefono)` | `pedidosStore` (cruce en UI, D2 respetado) | **Correcto** |
| M4 | `BandejaLista` (ausente) | Dominio del hilo | *nada* | `moduloContexto` vía `modulosDe(convId)` | **Selector huérfano** — la señal existe, nadie la consume |
| M5 | `BandejaLista` (ausente) | Intención del hilo | *nada* | **No existe selector** | **Hueco de modelo** — es el hallazgo de fondo |
| M6 | `BandejaLista:208` | Punto de presencia | `statusDe(conv.estado)` | `conversaciones.utils.ts:25-29` | **Ambiguo**: `atendida` y `cerrada` → ambos `offline`. El punto no distingue «en progreso» de «cerrada» |
| M7 | `BandejaLista:18-23` vs `:93-119` | Filtros | `todas / no_leidas / requieren_atencion / cerradas` | `FiltroBandeja` (`types.ts:131`) | **Duplicados**: píldoras y dropdown ofrecen los mismos valores |
| M8 | `conversaciones.store.ts:920` | Mensaje del bot en runtime | `agregarMensajeBot(convId, texto, payload)` | El `moduloContexto` existe como 4.º parámetro (`:947`) | **Señal perdida**: nunca se pasa |
| M9 | `conversaciones-bot.adapter.ts:151` | Respuesta del bot | `return { texto, payload }` | `RespuestaBot` (`:49-53`) no declara `modulo` | **Evidencia descartada**: `ToolSource.module` existe y no se propaga |
| M10 | `enviarComoNegocio` (`:693`) | Mensaje del operador | firma `(convId, texto)` | — | **Asimétrico**: el operador no puede etiquetar dominio; el bot sí (opcionalmente) |
| M11 | `conversaciones.seed.ts:317` | Stock en conv-2 | «tenemos **6 porciones** … **8.000** c/u» | El comentario `:126-129` afirma que el bot **NO inventa un número** | **Contradicción doc/código**: el seed fabrica dato de inventario que ningún store respalda |
| M12 | `ModuloDestino` | Etiquetas de dominio | no existe catálogo | A diferencia de `ESTADO_CONVERSACION_*` | **Futuro split-truth**: el primer consumidor que escriba «Inventario» como literal abre la divergencia |

---

## 3. Hallazgos (por severidad, agrupados por causa raíz)

### H1 — CRÍTICO · La bandeja carece del eje de intención
**Causa raíz única de la mayoría de los síntomas.** `FiltroBandeja`
(`types.ts:131`) solo codifica *estado de atención* y *no leídos*. No hay ninguna forma de
responder «¿qué tengo que hacer con este chat?» sin leer el preview.
**Evidencia:** `BandejaLista.tsx:178-259` (render completo de la fila).

### H2 — CRÍTICO · `modulosDe()` es un selector huérfano
`conversaciones.store.ts:551-560`. Búsqueda en todo `src/`: **cero consumidores**. La
capacidad de clasificar está implementada, documentada («una conversación es transversal:
puede tocar varios módulos, p. ej. Pedidos e Inventario en el mismo hilo») y abandonada.

### H3 — CRÍTICO · La señal se pierde en runtime (H2 inútil sin esto)
- `RespuestaBot` no declara `modulo` (`bot/conversaciones-bot.adapter.ts:49-53`).
- `simularRespuestaBot` no pasa `moduloContexto` (`conversaciones.store.ts:920`).
- `enviarComoNegocio` no lo acepta (`:693`).
**Consecuencia:** la clasificación derivada solo funciona sobre el seed. En la sesión de
demostración se desvanece en cuanto alguien escribe. Cualquier propuesta que no cierre este
hueco es decorativa.

### H4 — ALTO · La evidencia del dominio ya existe y se tira
`ToolSource { toolId, module: Modulo, detail }` (`tool.contract.ts:61-66`) y
`ToolResult.sources` (`:145`). La herramienta que responde **declara su módulo**. El adapter
hace `extraerPayload(evidence)` (`:88`) pero no su gemelo `extraerModulo(evidence)`.
**Regla del proyecto violada:** «si un getter/guarda existe, exigir la simétrica».

### H5 — ALTO · Dominio ≠ Intención (y hoy se confunden)
Dominio = *de qué negocio se habla* (`pedidos` / `inventario` / `general`).
Intención = *qué quiere el cliente* (información / comprar / seguimiento / reclamo).
Contraejemplo que rompe cualquier modelo de un solo eje:
- `conv-4` y `conv-6` → dominio **pedidos**, intención **seguimiento/postventa** (no compra).
- `conv-2` → dominio **inventario**, intención **consulta informativa** (y coquetea con
  reserva: «¿se puede reservar una?», msg-2-3 — casi transición).
Un solo eje obligaría a elegir y mentiría en uno de los dos casos.

### H6 — MEDIO · Vocabulario y color por fuera del catálogo (M1)
El badge «⚠️ Asesor» (`BandejaLista.tsx:219-221`) fija texto, emoji y clases Tailwind en el
componente, saltándose `ESTADO_CONVERSACION_LABEL` / `ESTADO_CONVERSACION_BADGE`. Es
exactamente el defecto que ya se corrigió en `PanelContexto.tsx:86-101` (tabla
`ESTADO_PREP_META` eliminada por divergir en dos estados). **El mismo error, otro archivo.**

### H7 — MEDIO · `inventario` es un módulo fantasma en el tipo
Declarado en `ModuloDestino` (`types.ts:22`), usado en el seed (2 mensajes), mencionado en
`AppSidebar.tsx:204` («más adelante, Inventario»)… y sin provider, sin store, sin datos.
**Riesgo:** si la UI muestra un badge «Inventario» sin control de disponibilidad, promete una
capacidad inexistente — el mismo defecto que el test de consistencia del asistente previene
con `MODULOS_CONOCIDOS`.

### H8 — MEDIO · El seed de conv-2 contradice su propia doctrina
`conversaciones.seed.ts:126-129`: «el bot NO inventa un número: dice lo que puede
comprobar». `conversaciones.seed.ts:317`: «tenemos **6 porciones** … **8.000** c/u».
Inventario no está conectado ⇒ ese número **no tiene fuente**. Es dato fabricado presentado
como consulta real.

### H9 — BAJO · Filtros duplicados y punto de presencia ambiguo
Píldoras (`BandejaLista.tsx:18-23`) y dropdown (`:93-119`) ofrecen los mismos tres filtros.
`statusDe` mapea `atendida` y `cerrada` al mismo `offline` (`conversaciones.utils.ts:25-29`).

---

## 4. Taxonomía propuesta: tres ejes ortogonales

```
EJE A — DOMINIO      ¿de qué negocio se habla?     pedidos | inventario | general
EJE B — INTENCIÓN    ¿qué quiere el cliente?       consultar | comprar | seguir_pedido | reclamar
EJE C — ATENCIÓN     ¿quién y cómo se atiende?     YA EXISTE (estado + atencion + operador)
```

**Regla: el eje C no se toca.** Está bien modelado, tiene catálogo, tiene tests y cubre la
pregunta «urgencia / quién responde». El problema es que la bandeja **solo** tiene el eje C.

### 4.1 Intención: definición operativa sin IA

La intención se **deriva de efectos observables**, no de semántica del texto:

| Intención | Regla derivada (determinista) | Hilos del seed |
|---|---|---|
| `comprar` | El hilo referencia un pedido **cuyo `createdAt` es posterior al primer mensaje del hilo** (el pedido **nació aquí**) | conv-3 |
| `seguir_pedido` | El hilo referencia un pedido **anterior** al inicio del hilo (o `pedidoActivoDe` sin nacimiento en el hilo) | conv-4, conv-6 |
| `reclamar` | Existe `EventoSistema` de `handoff_solicitado` **o** el hilo está `en_espera` | conv-5, conv-7 |
| `consultar` | Ninguna de las anteriores | conv-1, conv-2, conv-8 |

**Por qué funciona la transición automáticamente:** la intención se calcula **sobre toda la
línea de tiempo**, no se congela al primer mensaje. Un hilo que empieza «¿qué trae el combo?»
(`consultar`) y termina con «sí, así está bien» + pedido registrado (`comprar`) **cambia de
intención solo**, sin máquina de estados, sin campo persistido, sin sincronización. Ese es el
argumento decisivo contra el triage manual: **una etiqueta manual no se entera de la
transición**.

### 4.2 Dominio: de dónde sale (y por qué no hace falta IA)

```
cliente escribe
   → simularRespuestaBot            (conversaciones.store.ts:889)
   → conversacionesBotAdapter.responder(...)
   → AssistantEngine → ToolRegistry → tool resuelve
   → ToolResult.sources[0].module   ← «pedidos» | (futuro) «inventario»
   → RespuestaBot { texto, payload, modulo }      ← HUOY: falta `modulo`
   → agregarMensajeBot(..., moduloContexto)        ← HUOY: falta el 4.º arg
   → Mensaje.moduloContexto
   → modulosDe(convId)                             ← YA EXISTE, sin consumidor
```

**El dominio lo declara el módulo que responde.** No se infiere, no se adivina, no se
clasifica: **se copia de la fuente**. Es la solución de Clean Architecture correcta — la
verdad la produce quien la posee.

**Nota de integración:** `Modulo` (assistant) y `ModuloDestino` (conversaciones) no son el
mismo tipo. Hoy `Modulo` efectivamente colapsa a `"pedidos"` (de ahí los 12 errores
preexistentes de `tsc` en `session.store.ts:37`). El adapter debe hacer el mapeo explícito
`Modulo → ModuloDestino` — y ese mapeo es el único sitio donde se toca el tema.

### 4.3 Inventario: cero acoplamiento por construcción

El requisito es explícito: **Inventario es un módulo absolutamente independiente de Pedidos y
todavía no existe.** El diseño propuesto lo respeta sin condiciones:

- Conversaciones **no importa nada** de inventario. Ni hoy ni mañana. Solo conoce el *string*
  `"inventario"` dentro de `ModuloDestino` — una etiqueta de tipo, no una dependencia.
- **No se crea ningún store, provider ni dato de inventario.** El análisis no lo propone y la
  propuesta no lo necesita.
- Cuando Inventario se implemente: registrar `InventarioToolProvider` con
  `module: "inventario"`, añadirlo a `MODULOS_CONOCIDOS`, añadir `"Inventario"` a
  `MODULO_DESTINO_LABEL`. **La bandeja no se toca** — el badge aparece solo porque lee del
  catálogo. Ese es el criterio de aceptación del diseño.
- Mientras tanto: `MODULO_DESTINO_LABEL` debe declarar `disponible: false` para
  `inventario`, de modo que la UI **no ofrezca filtros de un dominio sin datos** (previene H7).

---

## 5. Alternativas y trade-offs

### A · Detección de intención por IA / NLP

Un clasificador (remoto o embebido) que lee el texto del cliente y asigna intención + confianza.

| Dimensión | Valoración |
|---|---|
| **Ventajas** | Cubre lenguaje libre y giros no previstos; no exige reglas por intención; escala a intenciones nuevas sin tocar código de derivación |
| **Desventajas** | El proyecto es **mock 100 % frontend, sin backend** — exigiría conectar `RemoteLLMEngine` (hoy sin conectar); **no determinista ⇒ no testeable** con la suite actual; introduce latencia y un modo de fallo nuevo en el camino crítico del chat; requiere umbral de confianza, fallback y UI que exprese incertidumbre; el operador no puede corregir un etiquetado que cambia solo |
| **Costo técnico** | **Alto**: contrato de engine ampliado, prompt/plantilla, golden set, manejo de timeout y degradación, UI de confianza, tests endebles |
| **Impacto en el operador** | Bajo al principio, **riesgo alto**: etiquetas inestables destruyen la confianza en la bandeja, que es justo lo que se intenta arreglar |
| **Alineación Clean Architecture** | **Baja**. Acopla la capa de presentación a un componente no determinista y introduce una fuente de verdad externa no trazable |

### B · Derivación reactiva desde el store ← **RECOMENDADA**

Catálogos + selectores en `conversaciones.store.ts`; la UI solo lee.

| Dimensión | Valoración |
|---|---|
| **Ventajas** | Una sola fuente de verdad; **determinista y testeable**; se actualiza sola ante la transición informativa → transaccional; **cero estado nuevo que sincronizar** (no repite el error de `pedidoActivoId`); respeta D2 (el cruce con Pedidos sigue ocurriendo fuera del store de conversaciones); cuando exista Inventario el mismo mecanismo lo absorbe **sin tocar la UI** |
| **Desventajas** | Clasifica *lo que el sistema sabe*, no *lo que el cliente quiso decir*: un «¿y si pido dos?» sin confirmación no se marca como intención de compra; **depende de que `moduloContexto` llegue a los mensajes** (H3: hoy no llega); no captura ironía ni cambios de tema sin señal explícita |
| **Costo técnico** | **Bajo-medio**: 2 catálogos (`MODULO_DESTINO_*`, `INTENCION_*`), 2 selectores (`moduloPrincipalDe`, `intencionDe`), cerrar H3/H4 en adapter + store, tests de derivación |
| **Impacto en el operador** | **Alto y positivo**: badge accionable en cada fila, filtro por «qué hay que hacer», sin trabajo extra |
| **Alineación Clean Architecture** | **Alta**. La regla vive en el dominio, la presentación consume, nada se persiste dos veces |

### C · Triage manual del operador

Etiqueta elegida por el operador desde la cabecera o el panel de contexto.

| Dimensión | Valoración |
|---|---|
| **Ventajas** | Máxima precisión semántica; el operador corrige lo que el sistema no ve; fácil de explicar |
| **Desventajas** | Trabajo repetitivo que **no escala**; inconsistente entre operadores (sin taxonomía compartida cada uno etiqueta distinto); **se queda obsoleto** en cuanto el hilo evoluciona; exige persistencia, permiso (`channels.manage` o nuevo) y auditoría; **es un campo que hay que mantener sincronizado a mano** — literalmente el argumento por el que `Conversacion.pedidoActivoId` está deprecado (`types.ts:115-124`) |
| **Costo técnico** | Medio: campo en el modelo, migración de persistencia, UI, capacidad, auditoría |
| **Impacto en el operador** | **Negativo**: suma clics y carga cognitiva a quien ya va retrasado |
| **Alineación Clean Architecture** | **Baja**. Estado derivado persistido = segunda fuente de verdad |

### D · Híbrido: derivado por defecto + override manual explícito

B como fuente, con una corrección manual opcional que **gana** y queda registrada.

| Dimensión | Valoración |
|---|---|
| **Ventajas** | Precisión donde importa sin carga general; el override es auditado; el derivado sigue siendo la fuente |
| **Desventajas** | Dos fuentes *aparentes*: hay que dejar explícito cuál gana y **mostrar** cuándo el valor es manual; riesgo de que el override enmascare un bug de derivación |
| **Costo técnico** | B + override (campo opcional + UI + motivo) |
| **Impacto en el operador** | Positivo **si el override es raro**; confuso si se usa mucho |
| **Alineación Clean Architecture** | Media-alta: aceptable solo si el override se modela como **corrección explícita**, no como valor primario |

### 5.1 Recomendación

> **Implantar B ahora. Mantener D como evolución condicionada: solo si el negocio identifica
> una clase de error recurrente que la derivación no pueda corregir. Rechazar A.**

Justificación en una frase: **B es la única alternativa que clasifica sin añadir una segunda
fuente de verdad, y el proyecto ya pagó el precio de tenerlas** (`pedidoActivoId` deprecado,
`ESTADO_PREP_META` eliminada en `PanelContexto`, `ESTADO_CONVERSACION_*` centralizado). A
añade no-determinismo a un entorno que no tiene backend para sostenerlo; C revive el
antipatrón que el propio modelo documenta como prohibido.

---

## 6. Diseño de la solución recomendada

### 6.1 Contratos (aditivos, nada se rompe)

```ts
// conversaciones.types.ts — ADICIONES
export type IntencionConversacion =
  | "consultar"      // información pura (catálogo, horarios, disponibilidad)
  | "comprar"        // el pedido nació en este hilo
  | "seguir_pedido"  // postventa sobre un pedido existente
  | "reclamar";      // problema o escalamiento
```

```ts
// bot/conversaciones-bot.adapter.ts — RespuestaBot gana un campo OPCIONAL
export interface RespuestaBot {
  texto: string;
  payload?: Mensaje["payload"];
  modulo?: ModuloDestino;   // ← NUEVO; opcional ⇒ retrocompatible
}
```

```ts
// conversaciones.store.ts — FIRMAS EXISTENTES NO CAMBIAN, solo se extienden
agregarMensajeBot(convId, texto, payload?, moduloContexto?)  // ya existe con 4 params
enviarComoNegocio(convId, texto, moduloContexto?)            // ← 3.º param OPCIONAL
simularRespuestaBot(...)                                      // pasa resultado.modulo
```

**Nada de esto cambia `Conversacion`.** No se añade ningún campo persistido. Es la propiedad
central del diseño.

### 6.2 Catálogos (junto a `ESTADO_CONVERSACION_*`)

```ts
// conversaciones.store.ts
export const MODULO_DESTINO_LABEL: Record<ModuloDestino, { etiqueta: string; disponible: boolean }> = {
  pedidos:      { etiqueta: "Pedidos",      disponible: true  },
  inventario:   { etiqueta: "Inventario",   disponible: false }, // ← H7: hasta que exista
  turnos:       { etiqueta: "Turnos",       disponible: false },
  agendamiento: { etiqueta: "Agendamiento", disponible: false },
  general:      { etiqueta: "General",      disponible: true  },
};

export const INTENCION_LABEL: Record<IntencionConversacion, string> = {
  consultar:     "Consulta",
  comprar:       "Venta",
  seguir_pedido: "Seguimiento",
  reclamar:      "Reclamo",
};

export const INTENCION_BADGE: Record<IntencionConversacion, BadgeColor> = {
  consultar:     "light",
  comprar:       "success",
  seguir_pedido: "info",
  reclamar:      "warning",
};
```

`Record<..., BadgeColor>` **obliga** a añadir la entrada al añadir una intención (mismo
mecanismo ya usado en `ESTADO_CONVERSACION_BADGE`: un color inexistente es error de
compilación, no una clase que Tailwind descarta en silencio).

### 6.3 Selectores

```ts
/** Dominio(s) que ha tocado el hilo (YA EXISTE — solo hay que consumirlo). */
modulosDe(convId): ModuloDestino[]                    // :551

/** Dominio principal: el del ÚLTIMO mensaje etiquetado; "general" si no hay ninguno. */
moduloPrincipalDe(convId): ModuloDestino              // NUEVO

/** Intención derivada de efectos observables. Ver §4.1. */
intencionDe(conv): IntencionConversacion              // NUEVO

/** Simétrica de modulosDe: todas las intenciones por las que pasó el hilo. */
intencionesDe(convId): IntencionConversacion[]        // NUEVO (opcional, fase 3)
```

`intencionDe` es una **función pura sobre el estado**, no un campo. MobX la re-evalúa en cada
lectura reactiva: cuando el pedido nace, la bandeja se re-renderiza con la nueva intención sin
que nadie «notifique» nada.

### 6.4 Cierre del hueco (prerrequisito, H3 + H4)

1. `extraerModulo(evidence?: ToolResult): ModuloDestino | undefined` — gemelo simétrico de
   `extraerPayload`, leyendo `evidence?.sources?.[0]?.module` y mapeando `Modulo → ModuloDestino`.
   **Fail-closed:** sin fuente ⇒ `undefined` ⇒ el mensaje no etiqueta ⇒ no miente.
2. `responder()` devuelve `{ texto, payload, modulo }`.
3. `simularRespuestaBot` → `agregarMensajeBot(convId, resultado.texto, resultado.payload, resultado.modulo)`.
4. `enviarComoNegocio(convId, texto, moduloContexto?)` — opcional, para que el operador pueda
   etiquetar explícitamente (sin obligarle).

**Todo ocurre en la capa de UI / adaptador.** El store de conversaciones sigue sin saber qué
es un Pedido ni qué es un Inventario. **Invariante D2 intacta.**

---

## 7. Experiencia del operador: propuesta concreta

### 7.1 Fila de la bandeja (máximo 2 badges + 1 de pedido)

```
[Avatar]  NombreContacto  [Consulta] [Inventario]      hace 52 min
          preview del último mensaje                          [2]
```

**Orden y precedencia de los badges:**

1. **Intención** — siempre. Es el badge *accionable*: le dice al operador qué hacer.
2. **Dominio** — solo si ≠ `general` y si `disponible: true` en el catálogo (previene H7).
3. **Pedido** (`#P-001` + estado) — se mantiene igual (M2/M3 ya son correctos).

**Regla de techo:** nunca más de dos badges de clasificación. Si un hilo toca más de un
dominio, se muestra el **principal** (el del último mensaje etiquetado) y el resto queda en el
`title` del badge — no se apilan.

### 7.2 Filtros: un eje por superficie, sin duplicados

- **Píldoras** → **INTENCIÓN**: `Todas · Consulta · Venta · Seguimiento · Reclamo`.
  Resuelve H1 y **elimina H9** (ya no hay dos controles con los mismos valores).
- **Dropdown (3 puntos)** → **ESTADO/ATENCIÓN**: `Todas · No leídas · Requieren atención ·
  Cerradas`. Ya existe; se deja donde está.
- **Dominio** → **no** se añade como filtro hasta que haya más de un dominio disponible
  (hoy solo `pedidos`). Evita un control de una sola opción.

Dos ejes, dos controles, cero solapamiento: el operador filtra por «qué hay que hacer» y por
«urgencia» de forma independiente.

### 7.3 Por qué **no** agrupar la bandeja por intención

`ultimaActividad` es la **clave de orden de la bandeja** y está protegida por test
(`conversaciones.seed.test.ts`), incluido el defecto real de `conv-8` por redondear su
timestamp. Agrupar destruye ese orden y con él la capacidad de ver *qué lleva más tiempo sin
responder* — que es la función primaria de una bandeja de atención. **Filtrar sí, agrupar no.**

### 7.4 Panel de contexto

Añadir una sección «Clasificación» sobre el mismo patrón ya usado para el estado del pedido:
etiqueta y color leídos del catálogo, con la **procedencia** explícita («Derivado de:
2 mensajes de inventario»). Nada de literales.

### 7.5 Sin emojis

Todos los badges son texto del catálogo. El «⚠️ Asesor» actual (H6) se migra a
`ESTADO_CONVERSACION_LABEL/BADGE`, lo que de paso elimina el emoji.

---

## 8. Plan de implantación

| Fase | Contenido | Criterio de aceptación |
|---|---|---|
| **0** | Cerrar H3/H4: `extraerModulo`, `RespuestaBot.modulo`, paso del 4.º arg, `enviarComoNegocio` opcional | Un mensaje de bot escrito **en runtime** queda etiquetado con el módulo de la tool que respondió. Test: `enviarComoCliente` → el mensaje del bot tiene `moduloContexto === "pedidos"` |
| **1** | Catálogos `MODULO_DESTINO_LABEL` / `INTENCION_LABEL` / `INTENCION_BADGE` | Añadir una intención sin añadir su entrada es **error de compilación** |
| **2** | Selectores `moduloPrincipalDe` / `intencionDe` + tests de derivación | Los 8 hilos del seed clasifican según la tabla del §4.1. Un hilo que pasa de consulta a pedido cambia de intención **sin intervención** |
| **3** | Bandeja: badges + píldoras de intención (dropdown = estado) | `tsc` sin delta propio; los 431 tests siguen en verde |
| **4** | Panel de contexto: sección «Clasificación» | Etiqueta y color **solo** del catálogo; cero literales en el componente |
| **5** | Corregir H8 (seed conv-2) y H6 (badge hardcodeado) | El bot de conv-2 no afirma un stock que ningún store respalda |
| **Futura** | Al implementar Inventario: `InventarioToolProvider` + `MODULOS_CONOCIDOS` + `disponible: true` | **La bandeja muestra «Inventario» sin haber tocado `BandejaLista.tsx`** |

---

## 9. Riesgos y preguntas abiertas

1. **¿El catálogo es de Pedidos o de Inventario?** Hoy vive en
   `pedidosStore.config.catalogo` y por eso `conv-1` («¿qué trae el combo?») está etiquetada
   `pedidos`. Cuando exista Inventario, precio y descripción probablemente migren allí, y con
   ellas la etiqueta de ese hilo. **Decisión pendiente del negocio**; el diseño la absorbe
   cambiando una sola línea del catálogo.
2. **¿La «reserva» de conv-2 es inventario o pedidos?** «¿Se puede reservar una para recoger?»
   (msg-2-3) es una intención de compra abortada. Con la regla del §4.1 queda `consultar`
   (no hay pedido). **¿Es aceptable para el negocio?** Si no, la regla necesita una quinta
   intención o una señal explícita de reserva.
3. **`Modulo` vs `ModuloDestino`** — dos tipos con valores solapados y distinto propósito. El
   mapeo en el adapter es el punto único de fricción; conviene no unificarlos (pertenecen a
   capas distintas) sino documentarlos.
4. **Riesgo de H8 normalizado**: si el seed fabrica datos de inventario, alguien puede
   interpretar que el módulo existe. La etiqueta `disponible: false` mitiga, pero el texto del
   mensaje también debe ser honesto.
5. **Override manual (D)**: si se acaba implantando, hay que decidir quién puede hacerlo
   (`channels.manage` parece la capacidad natural) y **mostrar siempre** que el valor es
   manual, o se convierte en una segunda fuente de verdad silenciosa.

### Qué NO hacer

- No crear un store, provider ni datos de inventario «para que el badge funcione».
- No persistir `intencion` ni `modulo` en `Conversacion`.
- No escribir «Inventario», «Consulta» ni ninguna etiqueta como literal en un componente.
- No deducir intención de la posición en el array ni de la antigüedad del último mensaje.
- No agrupar la bandeja por intención (rompe el orden cronológico protegido por test).
- No introducir IA ni backend: el proyecto es un mock frontend por decisión explícita.

## 10. Estado de implantación (actualizado 2026-09-17)

Lo que sigue ya está en el código. Nada de esto cambia `Conversacion`: no se añadió ningún
campo persistido, que era la propiedad central del diseño.

| Fase | Estado | Dónde |
|---|---|---|
| **0** — Cerrar H3/H4 | ✅ Hecha | `extraerModulo()` en `bot/conversaciones-bot.adapter.ts` (simétrico de `extraerPayload`), `RespuestaBot.modulo`, 4.º argumento en `simularRespuestaBot`, 3.er parámetro opcional en `enviarComoNegocio` |
| **1** — Catálogos | ✅ Hecha | `MODULO_DESTINO_LABEL` en `conversaciones.store.ts` (junto a `ESTADO_CONVERSACION_*`); `INTENCION_LABEL` / `INTENCION_BADGE` en el archivo de clasificación |
| **2** — Selectores | ✅ Hecha | `moduloPrincipalDe()` en el store; `intencionDe()` en `pages/conversaciones/conversaciones.clasificacion.ts` |
| **3** — Bandeja | ⬜ Pendiente | — |
| **4** — Panel de contexto | ⬜ Pendiente | — |
| **5** — H8 (seed conv-2) y H6 (badge hardcodeado) | ⬜ Pendiente | — |
| Futura — Inventario | ⬜ Pendiente | — |

### 10.1 Desviaciones respecto al §6, y por qué

1. **`intencionDe` vive en `pages/` y no en el store.** El §6.3 lo situaba en
   `conversaciones.store.ts`, pero derivar la intención exige cruzar Pedidos con
   Conversaciones, y ese cruce pertenece a la capa de UI (**invariante D2**): el
   `conversacionesStore` no importa `pedidosStore` y no debe empezar a hacerlo. El store
   expone hechos de su propio dominio (`modulosDe`, `lineaDeTiempo`); la interpretación que
   combina dos dominios se hace encima de los dos. El `types.ts` ya apuntaba a esa ruta.
2. **`intencionDe(convId)` en vez de `intencionDe(conv)`.** Coherencia con `modulosDe` y
   `moduloPrincipalDe`: el llamador no resuelve la entidad antes de preguntar y no puede
   pasar por accidente una copia obsoleta.
3. **`MODULO_DESTINO_BADGE` NO se creó.** El §7.1 muestra dos badges con color distinto,
   pero el catálogo de dominio del §6.2 solo define `{etiqueta, disponible}`. Inventar
   ahora una escala cromática para el dominio sería inventar semántica antes de decidir la
   superficie. Se añadirá (si hace falta) al pintar la bandeja, no antes.
4. **`intencionesDe` (fase 3, opcional) NO se implementó.** `modulosDe` sigue siendo un
   export huérfano (H2); añadir otro export sin consumidor repetiría el defecto que este
   análisis denuncia. Se añadirá cuando exista su superficie.

### 10.2 Precedencia de `intencionDe` — es contrato, no detalle

**`reclamar` → `comprar` → `seguir_pedido` → `consultar`.**

El §4.1 enumeraba las reglas sin fijar el orden, y el orden importa. La fila del dataset que
lo decide es **conv-5**: tiene a la vez `pd4` (creado 140 min atrás, anterior al primer
mensaje del hilo, 13 min) y un escalamiento (`en_espera` + evento `handoff_solicitado`). Con
la regla del pedido sola daría `seguir_pedido`; el diseño dice `reclamar`. Lo único que
exige criterio humano no puede quedar enmascarado por nada.

### 10.3 Verificación

`547 tests / 30 archivos` en verde (base: 499/27). `tsc` sin delta en los archivos tocados
(la línea base del proyecto son 15 errores preexistentes en 8 archivos, ajenos a esto).
`vite build` OK. Los tests nuevos blindan: la tabla de los 8 hilos, la precedencia de
conv-5, la transición consulta→venta sin intervención, el fail-closed sin fuente y —el
criterio de aceptación de la fase 0— que **un mensaje de bot escrito en runtime queda
etiquetado** por la cadena real `sesión → engine → registry → provider → ToolSource.module`.

### 10.4 Lo que sigue bloqueado

**H8 bloquea el chip de dominio en el chat.** El seed de conv-2 afirma «tenemos 6 porciones
… 8.000 c/u» sin ningún store que lo respalde. Etiquetar ese mensaje con «Inventario» lo
presenta como dato verificado, que es peor que no etiquetarlo: convierte un dato fabricado
en un dato con procedencia. **H8 se arregla antes o a la vez, no después.** Las preguntas 1
y 2 del §9 (de quién es el catálogo, si la reserva de conv-2 es inventario o pedidos)
siguen abiertas y las decide el negocio, no el código.
