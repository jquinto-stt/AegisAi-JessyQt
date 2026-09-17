# Reparación — Defecto de handoff en Conversaciones

**Fecha:** 2026-09-17 · **Commit base:** `55eda1e` · **Estado:** reparado y verificado

---

## 1. Síntoma reportado

Tras pulsar **"Tomar chat"** y luego **"Devolver al bot"**, al escribir desde la consola de
`/conversaciones`:

1. El mensaje aparecía con la etiqueta **"Asesor Humano"** en vez de la del bot.
2. La **barra de escritura seguía habilitada**.

Ambos síntomas son correctos de reportar: sí son dos defectos reales.

---

## 2. Diagnóstico

Reproducido con una prueba de runtime (`tomar()` → `devolver()` → escribir), no por lectura.
Dos causas con un origen común: **el autor del mensaje no correspondía con quién atendía el
hilo.**

### Causa A — `Composer` solo se bloqueaba por capacidad

`Composer.tsx:15` decidía con `puedeResponderConversacion()` (capacidad
`channels.respond`) y **nunca leía `conv.atencion`**. En modo bot el campo permanecía vivo.

### Causa B — `enviarComoNegocio` no tenía guarda de modo

`conversaciones.store.ts:598` fijaba `autor:"negocio"` sin mirar el modo de atención.

La firma del defecto: `simularRespuestaBot` **sí** tenía la guarda **inversa**
(`atencion !== "bot"` → no-op), pero su simétrica en `enviarComoNegocio` no existía.
**Una guarda asimétrica** es exactamente lo que permite escribir como humano en un hilo
que lleva el bot.

### Un dato clave que descarta la hipótesis obvia

El bot **no** está roto en la ruta de autoría: `agregarMensajeBot` escribe `autor:"bot"`
correctamente (`store:853`). La etiqueta "Asesor Humano" venía de que **lo que escribía el
operador** se persistía como `negocio`. El bot solo interviene desde `enviarComoCliente`
(`store:585`), así que **escribir desde la consola nunca invoca al bot** — por diseño.

---

## 3. Cambios aplicados

Todo en capa de presentación, más una guarda de defensa en profundidad. **Ningún cambio de
contrato de dominio ni de regla de negocio.**

### `pages/conversaciones/components/Composer.tsx`

```ts
const conv = conversacionesStore.getConversacion(convId);
const esModoBot = conv?.atencion === "bot";
const puedeEnviar = puedeResponder && !esModoBot && !vacio && !excedido;
```

- El `disabled` del `<input>` y del botón de envío pasan a incluir `esModoBot`.
- Lectura **reactiva** (el componente ya es `observer`): pulsar "Tomar chat" / "Devolver al
  bot" habilita y bloquea el campo sin recargar.
- **Placeholder y nota inferior propios del modo**, distintos del mensaje de permisos.
  Reutilizar `motivoSinPermiso("channels.respond")` habría sido **falso** —el operador sí
  tiene la capacidad— y habría mandado a revisar permisos que no son el problema.

### `stores/conversaciones.store.ts` → `enviarComoNegocio`

```ts
if (conv.atencion !== "humano") return; // el bot lleva el hilo: no hay emisor humano
```

Simétrica de la guarda de `simularRespuestaBot`. Sin ella, ocultar el campo sería cosmético:
cualquier otro llamador seguiría corrompiendo el hilo.

---

## 4. Invariante fijada y testeada

> **`atencion "bot"` ⟹ ningún mensaje con `autor:"negocio"` puede entrar al hilo.**

Test nuevo: `src/stores/conversaciones.handoff.test.ts` (4 tests).

Incluye uno que fija que la guarda debe leer **`atencion` y no `estado`**: `devolver()` deja
`estado:"abierta"`, que es **el mismo string que el estado inicial del seed**, así que
`estado` no distingue "el bot lo lleva" de "nadie lo ha tocado". Solo `atencion` lo hace.

---

## 5. Verificación

| Comprobación | Antes | Después |
|---|---|---|
| `vitest run` | 299 tests / 16 archivos | **303 tests / 17 archivos** ✅ |
| `tsc --noEmit` (archivos tocados) | 0 errores | **0 errores** ✅ |
| `tsc --noEmit` (total) | 12 preexistentes | **12 preexistentes** (sin cambios) ✅ |
| Escribir en modo bot | inserta `autor:"negocio"` ❌ | **no-op** ✅ |
| Escribir tras "Tomar chat" | inserta `autor:"negocio"` | inserta `autor:"negocio"` ✅ |

Los 12 errores de `tsc` son preexistentes y ajenos a esta tarea: todos por
`type Modulo = "pedidos"` mientras queda código con `"turnos"`/`"agendamiento"`.

---

## 6. Pendiente — hallazgo separado, NO tocado

El bot devolvió el texto:

> *"No tengo herramientas disponibles con tus permisos actuales. Es posible que no tengas
> acceso a los módulos necesarios o que el asistente aún no haya terminado de
> inicializarse."*

**Es frontend puro.** El asistente es un motor de reglas local
(`assistant/engine/local-rule-engine`); no hay backend. El `ToolRegistry` no está poblado
cuando se dispara `simularRespuestaBot`.

No forma parte de este defecto, pero conviene mirarlo porque **se está mostrando un texto de
error interno como si fuera contenido del bot**.
