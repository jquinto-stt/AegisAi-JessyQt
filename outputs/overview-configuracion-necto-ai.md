# Configuración de NECTO AI — `/asistente/config`

**Estado: terminado y verificado.** 499/499 tests · `tsc` 0 errores nuevos · build OK · **31/31**
comprobaciones en Chrome real (CDP).

---

## 1. El análisis previo (prerrequisito del pedido)

El pedido exigía analizar el propósito de NECTO AI antes de construir nada. La conclusión es
que **NECTO AI no es el bot de WhatsApp**: son dos asistentes distintos que conviven en la
misma app y comparten el núcleo, pero no el propósito.

| | Bot de WhatsApp | **NECTO AI** |
|---|---|---|
| A quién sirve | al **CLIENTE** final | al **EQUIPO** interno |
| Canal | hilo de WhatsApp | pantalla interna |
| Qué hace | **atiende** pedidos | **consulta y analiza** datos |
| Motor | delega en el mismo engine | `LocalRuleEngine` (reglas) |
| Habla | **como** el negocio | **al** operador |
| Capacidad | `channels.*` | **`assistant.use`** |
| Se configura en | `/conversaciones/config` | **`/asistente/config`** |

NECTO AI es un asistente **interno, de solo lectura, determinista**: responde preguntas sobre
Pedidos con un motor de reglas por palabras clave. No hay modelo de lenguaje, ni servidor, ni
clave de API. El bot de WhatsApp **delega** en el mismo engine y registry
(`conversaciones-bot.adapter.ts`), pero atiende a otro público con otro propósito.

Esta distinción quedó escrita como comentario de cabecera en `configuracion.secciones.ts`
para que no se pierda, y la página la declara en pantalla con un aviso explícito:
*«Este no es el bot de WhatsApp»*.

### Consecuencia de diseño: casi nada es configurable

Como el motor es determinista y no hay servicio externo, **no existe** ningún parámetro de
modelo que configurar. Podría haberse rellenado la página con los controles típicos de un
asistente de IA (clave de API, modelo, temperatura, tokens, memoria, conectores, facturación).
Todos ellos **mentirían**: no hay nada al otro lado que los leyera.

La página muestra en cambio el **estado real del sistema** y lo explica. Las dos únicas
preferencias son de UI y están etiquetadas como tales (densidad y longitud de respuesta).
Y **no hay botón «Guardar»**, porque no hay nada que guardar: un pie de guardado decorativo
sería un control que promete una persistencia inexistente.

---

## 2. Archivos

**Creados**

| Archivo | Qué es |
|---|---|
| `pages/asistente/configuracion.secciones.ts` | Catálogo de presentación, **sin JSX** (importable desde tests Node). Vocabulario de las 6 secciones, motor, niveles, inferencias, límites y ejemplos. |
| `pages/asistente/ConfigPage.tsx` | La página. |
| `pages/asistente/configuracion.secciones.test.ts` | 42 tests del catálogo. |
| `pages/asistente/configuracion.consistencia.test.ts` | 15 tests que impiden que la página se separe del store. |

**Modificados**

| Archivo | Cambio |
|---|---|
| `stores/assistant.store.ts` | Getter **solo lectura** `get motor()` → `engine.kind`. Aditivo: no permite cambiar el motor, no persiste, no altera ningún camino existente. |
| `pages/asistente/index.ts` | Exporta `AsistenteConfigPage`. |
| `app/App.tsx` | Ruta `/asistente/config` tras `CapabilityGuard capacidad="assistant.use"`. |
| `app/AppSidebar.tsx` | Ítem «Configuración» bajo «Inteligencia», sección **ya** permisionada con `assistant.use`. |

---

## 3. Hallazgo real: un ejemplo que apuntaba a una herramienta inexistente

`EJEMPLOS_PREGUNTA` incluía una pregunta de ejemplo mapeada a `pedidos.getTopProductos`. Esa
tool está **declarada** en el provider pero **no** figura en `QUERY_TOOLS` ni en
`ANALYZE_TOOLS`, así que el registry nunca la resuelve: la página habría prometido una
herramienta que no existe.

- **Corregido:** el ejemplo apunta ahora a `pedidos.getVentasPeriodo`.
- **Cerrado el hueco:** el test solo comprobaba el *namespace* (`pedidos.`). Ahora exige que
  `toolRegistry.resolve()` encuentre la tool de verdad. Sin este test, el defecto pasa.

**Inventario real: 10 herramientas** (7 `query` + 3 `analyze`). `getTopProductos` queda como
**huérfana**: se reporta, no se toca (está fuera del alcance de presentación).

---

## 4. Verificación

| Puerta | Resultado |
|---|---|
| `vitest run` | **499/499**, 27 archivos |
| `tsc --noEmit` | 12 errores **preexistentes** (familia `Modulo`); **0** en lo tocado |
| `vite build` | OK |
| CDP en Chrome real | **31/31** |

El arnés (`outputs/asistente-config-verify/verify.mjs`) comprueba en un navegador real: el
enlace y la entrada de menú, el título, el aviso de distinción con el bot de WhatsApp, las
6 secciones en 3 grupos, que **solo una sección está montada**, el motor activo leído del
store, el recuento «10 de 10 herramientas» calculado por el registry, la ausencia de controles
de backend, la ausencia de pie «Guardar», y que **un rol sin `assistant.use` no monta la
página** y pierde la entrada del menú.

### Seis errores del arnés, ninguno de la aplicación

Cada fallo se diagnosticó antes de tocar nada, y en todos la página era correcta:

1. `.sort()` sin comparador en un test → orden lexicográfico (`compacta` < `comoda`).
2. Supuse que el catálogo era `ROLES` (es `ROLES_SEED`) y que el store arrancaba con mensajes
   (nace con una conversación **vacía**).
3. **El más costoso:** serví el build con un servidor Node propio cuya raíz era una ruta POSIX
   de Git Bash (`/c/Users/...`). Node en Windows no la resuelve → 404 en todo → aplicación en
   blanco → 7/27 con **falsos negativos**. Se sustituyó por `vite preview`.
4. Aserciones con el vocabulario equivocado: «no implementado» vs el texto real «no **está**
   implementado»; un h3 de tarjeta buscado entre los h2; los límites leídos en la sección
   equivocada.
5. Escanear `innerText` por líneas separa «Clave de API» de su propia negación «No existe».
   Se pasó a escanear el DOM y buscar la negación en el **contenedor**.
6. Ese escaneo debe repetirse **por sección**: solo una está montada a la vez.

---

## 5. Abierto / para decidir

- **`getTopProductos` huérfana** en `PedidosToolProvider` (declarada, no registrada). Está
  fuera del alcance de presentación; decidir si se registra o se elimina.
- **`.git` sigue corrupto** (`bad tree object HEAD`). Es la tercera corrupción registrada en
  este sandbox; requiere `git fetch origin` desde un clon sano.
- Los directorios `dist-v*` quedan en disco (el shim `safe-delete` impide limpiarlos); están
  en `.gitignore`.
