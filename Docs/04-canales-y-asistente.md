# 04 — Canales y Asistente / IA

> Marcas: **[CONFIRMADO]** / **[NO EXISTE]** / **[PARCIAL]** / **[INFERENCIA]**.

---

## PARTE A — Canales

### Qué son Canales hoy [CONFIRMADO]
No son un módulo ni una entidad. Son tres cosas dispersas:
1. **Capacidades** de acceso: `channels.read` (escribir al cliente / abrir WhatsApp) y `channels.manage` (editar plantillas del canal).
2. **Atributo de origen** en Pedido: `origen: "whatsapp" | "operador"`.
3. **Simulador** de WhatsApp de solo lectura (`/wa`) + botones `wa.me` en las páginas de Pedidos.

- **[NO EXISTE]** No hay pantalla/sección "Canales", ni entidad `Canal`, ni configuración de canales por tienda.

### ¿WhatsApp / Web / POS / Mostrador / Instagram?
- **[CONFIRMADO]** Solo existen dos orígenes: `whatsapp` y `operador` (≈ mostrador). Web / POS / Instagram: **[NO EXISTE]**.

### ¿Son módulos, integraciones o interfaces de entrada?
- **[INFERENCIA]** Conceptualmente son **vías de entrada** (interfaces por las que llega un pedido/conversación). No hay integración real con ninguna plataforma (WhatsApp es mock; no hay Meta/webhooks).

### Pregunta clave: ¿un canal pertenece a Pedidos o puede conectarse a varios módulos?
- **[CONFIRMADO hoy]** El canal está **acoplado a Pedidos** (origen del pedido, botones en Pedidos, plantillas en la config de Pedidos).
- **[INFERENCIA / recomendación]** Un canal (WhatsApp) es **transversal**: podría alimentar Pedidos, Turnos, Asistente y soporte. Modelarlo como algo "de Pedidos" limita su reutilización.
  > Esta decisión **cambia dónde debe vivir el módulo WhatsApp**: si es transversal, no debería ser "una pantalla de Pedidos" sino un **módulo/capa de Conversaciones propia** que otros módulos consumen.

---

## PARTE B — Asistente / IA ("Necto Intelligence")

> Fuente: `src/assistant/**`, `assistant.store.ts`, `modules-tools/pedidos/pedidos.tool-provider.ts`, spec en `.kiro/specs/asistente-ia/`.

### Qué es [CONFIRMADO]
- Un **módulo transversal** de consulta en lenguaje natural sobre los datos de otros módulos, vía **tool-calling**. Chat con historial multi-conversación. Ruta `/asistente`, capacidad `assistant.use`.
- Es **frontend-only, sin LLM real**: el motor es **rule-based** (`LocalRuleEngine`) detrás de un contrato `AssistantEngine` intercambiable (existe un `RemoteLLMEngine` stub sin implementar).

### ¿Módulo o capa transversal? [CONFIRMADO]
- Ambas: es un módulo con su página, pero su NÚCLEO es agnóstico de dominio y NO importa stores de negocio. Los módulos "aportan" sus capacidades mediante un `AssistantToolProvider`.

### ¿Un agente por módulo o uno central? [CONFIRMADO]
- **Uno central** (un solo engine + un `ToolRegistry`). Cada módulo registra sus tools (hoy solo `PedidosToolProvider`). **No hay "bot de Pedidos" ni "bot de Inventario" separados** — justo lo que se quería evitar.

### ¿Quién decide qué tool/capacidad usar? [CONFIRMADO]
- El **engine** interpreta la intención (por keywords en el MVP) y elige la tool. El **ToolRegistry** filtra qué tools son visibles = módulos habilitados ∩ capacidades del usuario.

### ¿Quién tiene acceso a Pedidos / Inventario? [CONFIRMADO / N/A]
- El asistente accede a Pedidos SOLO a través de `PedidosToolProvider` (que sí importa `pedidosStore`) y solo si el usuario tiene `orders.read`. Inventario: N/A (no existe; sería otro provider cuando exista).

### ¿Ejecuta acciones o solo consulta? [CONFIRMADO]
- **Solo consulta/análisis** (niveles `query` y `analyze`). Los niveles `recommend`/`execute` están contemplados en el contrato pero **NO implementados** (no muta datos).

### Cómo se conecta con datos [CONFIRMADO]
- Las tools devuelven `ToolResult { facts, inferences?, sources, blocks? }`. Distingue estrictamente **hechos** (datos reales) de **inferencias** (heurísticas, nunca causalidad). Los `blocks` son tarjetas visuales (métricas, tabla+CSV, comparativa, lista) que se renderizan dentro del chat.

### Preparación para coexistir con WhatsApp [INFERENCIA]
- El patrón de "providers por módulo" permite que, cuando exista WhatsApp/Conversaciones, se añada un provider o tools de conversación **sin tocar el núcleo**. Hoy NO hay IA dentro de WhatsApp (deseado: dejar el modelo listo, no implementarla aún).
