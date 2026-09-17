# Fase 3 — Reparación Pedidos ↔ Conversaciones

**Rama** `master` @ `55eda1e` · **Fecha** 2026-09-17 · **Rol** Iris (Frontend UX/UI Systems Architect)

---

## Qué se hizo

Se completó la **Fase 3** del mandato: reparar la coherencia entre el módulo de
**Pedidos** y el de **Conversaciones (WhatsApp)**, dejando las cuatro tareas de
coherencia entregadas y verificadas.

**Todas las tareas han quedado entregadas (18.a – 18.d).** Además aparecieron y se
corrigieron **seis defectos** que nadie había reportado: un cruce de datos que
**nunca funcionó**, dos botones que **lanzaban en runtime**, una tabla de estados
**duplicada que ya había divergido**, un getter **definido dos veces**, una guarda
**documentada pero no implementada**, y un aviso de Pedidos que **no marcaba el hilo**.

---

## Verificación

| Puerta | Resultado |
|---|---|
| **Tests** | **375/375** en 20 archivos (línea base: 299) |
| **Tipos** | 12 errores, **todos preexistentes y ajenos**; **0** en los archivos tocados |
| **Build** | OK — 301 módulos, chunks emitidos |
| **Invariante D2** | `conversaciones.store` **no** importa `pedidos.store` |

---

## Los seis defectos reparados

| # | Sev. | Defecto | Reparación |
|---|---|---|---|
| **D1** | Crítica | Pedidos guarda el teléfono compacto y Conversaciones con espacios → el cruce daba **0 resultados, siempre** | Normalización en ambos `porTelefono`; nuevo selector `pedidoActivoDe` |
| **D2** | Alta | `ESTADO_PREP_META`: tabla propia que **ya había divergido** del store en 2 estados | Eliminada; todo sale del catálogo del store |
| **D3** | Alta | `pedidosStore.avanzarEstado()` **no existe** → el botón "Avanzar →" lanzaba | Sustituido por el puente `avanzarPedido` |
| **D4** | Media | Los avisos de Pedidos no llevaban `moduloContexto` → el hilo no se marcaba | 4.º parámetro opcional retrocompatible |
| **D5** | Media | `get requierenAtencion` **definido dos veces**; la 2.ª perdía el orden de cola | Eliminada la variante sin predicado |
| **D6** | Alta | `InicioPage` llamaba a estado inexistente → abrir el chat desde "Clientes" lanzaba | Prop `convId` **implementada de verdad** |

### Los dos más graves, en una línea

- **D1:** el enlace Pedido→WhatsApp **nunca había funcionado** en este mock. Los dos
  seeds guardaban el mismo número en formatos distintos, así que la comparación cruda
  no encontraba nada. Agravante: el teléfono de Ana Silva está **a un dígito** del de
  Juan Carlos, así que comparar en crudo era inseguro en ambos sentidos.
- **D6:** `ChatDrawer` declaraba una prop `convId` con prioridad documentada sobre
  `pedido`… y **el cuerpo del componente no la leía en absoluto**. Un consumidor que
  solo tenía un hilo no podía usar el componente, y el que lo intentaba, rompía.

---

## Funcionalidad entregada

| Tarea | Entrega |
|---|---|
| **18.a** Desconexión WhatsApp | **Cero `wa.me`** en producción. Tablero e Inicio abren `ChatDrawer`; Historial navega. Helper único de resolución de hilo. |
| **18.b** Plantillas | `pedidos.notificaciones.ts`: el avance de estado publica la plantilla en el hilo del cliente. Lee el texto **en el momento del envío**. |
| **18.c** Badge en la bandeja | `BandejaLista` muestra `#PED-XXX` + estado, vía `pedidoActivoDe`. |
| **18.c bis** Avance en vivo | `PanelContexto` avanza el pedido desde el chat, con gating `puedeMoverA`. |
| **18.d** Historial de Atención | Ruta `/conversaciones/historial` con KPIs + tabla, guardada por `channels.read`. |

---

## Evidencia de acuerdo entre superficies

`consistencia-pedidos.test.ts` (5 tests) no prueba una pantalla: prueba **el contrato
que las hace coincidir**, de modo que una derivación local futura **rompa un test**.

Fija que Bandeja y Panel resuelven el **mismo** pedido activo, que el cruce funciona
en **ambos** formatos de teléfono, que etiqueta y color salen de **un solo** catálogo,
que un avance se ve **igual** en las tres superficies, y que `pedidoActivoDe` incluye
`programado` pero excluye terminales.

---

## Preguntas abiertas (reportadas, no decididas unilateralmente)

1. **Dos mecanismos coexisten para abrir el chat.** Tablero e Inicio abren el *drawer*;
   Historial *navega*. La respuesta del usuario fue "navegar", pero el drawer ya venía
   funcionando de antes. **Decidir si se unifica** — afecta a tres superficies.
2. **`activarAhora` no pasa por el puente.** Activar un pedido programado no avisa al
   cliente. (El destino es `nuevo`, sin plantilla — quizá deba mandar `recibido`.)
3. **El drawer abierto por `convId` no muestra el badge del pedido activo.**

---

## Limitaciones del entorno

- **`webiai-devtools`** devuelve un registro vacío → `search`/`runtime`/`kiro_steerings`
  inservibles. El anclaje se hizo leyendo el sistema de archivos.
- **`agent-browser` no soporta Windows** → sin verificación en navegador (se verificó
  por tipos, tests y build).
- **El shim de borrado del sandbox no puede eliminar directorios** del proyecto: los
  `dist-verify*` quedan en disco y se añadieron a `.gitignore`.
- **Incidente de git recuperado:** `.git/refs/` había desaparecido
  (`fatal: not a git repository`). Se restauró `HEAD` desde el reflog. **Sin pérdida de datos.**
