# 05 — WhatsApp actual (estado real en el código)

> Fuente: `pages/simulador/SimuladorWhatsApp.tsx` + `chats.mock.ts`, `pedidos.store.ts`, páginas de Pedidos, backend Turnos.
> Marcas: **[CONFIRMADO]** / **[NO EXISTE]** / **[PARCIAL]** / **[INFERENCIA]**.

## Resumen
Todo es **MOCK, de solo lectura y acoplado a Pedidos**. No hay integración real con Meta.

## Arquitectura actual [CONFIRMADO]
No hay entidad Canal ni store de conversaciones de cliente. WhatsApp se manifiesta en 4 lugares:
1. **Simulador** `/wa` (vista del cliente, solo lectura, standalone fuera del AppShell).
2. **Origen** de pedido: `Pedido.origen = "whatsapp"`.
3. **wa.me**: helper `abrirWhatsApp(telefono)` **DUPLICADO** en `InicioPage`, `TableroPage`, `HistorialPage` (abre chat externo en pestaña nueva).
4. **Plantillas** `PlantillasWhatsApp` en la config de Pedidos (texto por transición, "SOLO REFERENCIA — no se envía nada").

## Pantallas / rutas
- **[CONFIRMADO]** `/wa` → `SimuladorWhatsApp` (standalone, sin sesión ni guard). **NO existe `/whatsapp`**. No hay ítem en el sidebar.

## Flujo del simulador [CONFIRMADO]
- Layout 2 columnas (`h-screen`): lista de chats (izq) + hilo de burbujas (der). Barra de escritura **DESHABILITADA** (candado "Vista de solo lectura").
- Burbujas: cliente a la derecha (verde), bot a la izquierda (blanco). Un mensaje del bot puede traer:
  - `link` → navega dentro de la app (p. ej. encuesta `/s/demo`).
  - `pedido` → botón que **INYECTA** el pedido en `pedidosStore.crearPedido({ origen: "whatsapp" })`.

## Modelo de datos (mock) [CONFIRMADO]
```
Autor = "cliente" | "bot"
ChatLink   { label, to }
ChatPedido { label, cliente, telefono, modalidad, items[], notas? }
ChatMensaje{ autor, texto, hora, link?, pedido? }
Chat       { id, nombre, telefono, escenario, mensajes[] }
CHATS = 5 escenarios guionados (3 de turnos en clínica + 2 de pedidos)
```
- **[NO EXISTE]** estado de leído/no leído, timestamps reales (solo string `hora`), orden temporal, envío.

## Configuración de WhatsApp
- **[PARCIAL]** Solo las `PlantillasWhatsApp` editables en `/pedidos/config` (gated por `channels.manage`). No hay conexión de número, tokens, ni ajustes de canal.

## Bot / conversaciones / store / context existentes
- **[NO EXISTE]** No hay bot real, ni store de conversaciones de cliente, ni context. El "bot" son mensajes guionados en `chats.mock.ts`. (El `assistant.store` es del Asistente IA, no de WhatsApp.)

## Backend
- **[CONFIRMADO]** Cero WhatsApp en `packages/services/api` (ni webhooks, ni firma, ni Meta). Lo único: los tickets de **Turnos** tienen `telefono?` con comentario "used by the WhatsApp bot to notify the client" y el endpoint `POST /queues/:id/turnos` documentado como "called by the WhatsApp bot" — pero el envío/recepción **NO** está implementado; solo se guarda el teléfono.

## Capacidades relacionadas [CONFIRMADO]
- `channels.read` → `puedeEscribirCliente()` (muestra botones WhatsApp en Pedidos).
- `channels.manage` → `puedeEditarPlantillas()` (edita plantillas en config).

## Implicación para el módulo WhatsApp que se quiere construir
- **[INFERENCIA]** Hoy WhatsApp está mal ubicado si se piensa como transversal: vive como accesorio de Pedidos y como demo oculta. Para un "módulo interactivo de WhatsApp", la decisión de fondo (ver doc 04, Parte A) es si el **canal es transversal** (módulo de Conversaciones propio que Pedidos/Turnos/Asistente consumen) o sigue atado a Pedidos.
