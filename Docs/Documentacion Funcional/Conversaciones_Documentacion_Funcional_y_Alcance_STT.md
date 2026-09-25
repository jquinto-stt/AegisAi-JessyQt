# CONVERSACIONES MULTICANAL
## Documentación Funcional y Alcance de Producto
### Módulo de Conversaciones (WhatsApp, Telegram, Instagram y Facebook) / Necto

| Metadato | Valor |
|---|---|
| **Cliente / Área solicitante:** | ST&T |
| **Versión del documento:** | 1.0 |
| **Fecha de elaboración:** | 25/09/2026 |
| **Elaborado por:** | Jessy Quinto T |
| **Clasificación:** | Interno |

---

# CONTROL DE VERSIONES

| Versión | Fecha | Autor | Descripción del cambio |
|---|---|---|---|
| 1.0 | 25/09/2026 | Jessy Quinto T | Versión oficial de alcance funcional del módulo de Conversaciones Multicanal con canales operativos (WhatsApp Business Cloud API y Telegram Bot API) y especificación técnica exhaustiva para canales Meta (Instagram Direct Messages y Facebook Messenger Platform). |
| 1.1 | 25/09/2026 | Jessy Quinto T | Incorporación de trazabilidad IA bajo demanda, tarjetas interactivas de pedido inline, sincronización en tiempo real vía Supabase Realtime Channels y burbujas ergonómicas adaptativas w-fit. |

---

# APROBACIONES

| Rol | Nombre | Cargo | Firma | Fecha |
|---|---|---|---|---|
| Patrocinador / Sponsor | Dirección de Tecnología | Sponsor Ejecutivo ST&T |  | 25/09/2026 |
| Líder de producto | Product Management | Líder de Producto Necto |  | 25/09/2026 |
| Líder técnico | Jessy Quinto T | Senior Architect / Tech Lead |  | 25/09/2026 |
| Stakeholder Operativo | Operaciones y Soporte | Líder de Mesa de Ayuda |  | 25/09/2026 |

---

# 1. OBJETIVO DEL DOCUMENTO

Este documento formaliza y describe de manera exhaustiva el alcance funcional, arquitectónico y operativo del Módulo de Conversaciones Multicanal de la plataforma Necto. Su propósito primordial es establecer un contrato técnico y de producto inequívoco entre ST&T, la dirección de tecnología, los líderes de ingeniería, los equipos de operaciones y el área de aseguramiento de calidad (QA).

El documento detalla con máxima precisión qué información entra al sistema (inbound webhooks, mensajes, audios, payloads, identidades de usuario), cómo es procesada (clasificación de intención con NLU, máquinas de estados discretas, handoff automático/manual) y qué información sale (respuestas omnicanal, órdenes hacia Pedidos, sockets en tiempo real y notificaciones de derivación).

Convención de lectura de capacidades: las funcionalidades construidas, probadas y operativas en producción se presentan sin marcas especiales; las capacidades en fase de integración o roadmap para canales adicionales (Instagram Direct y Facebook Messenger) se declaran explícitamente con su arquitectura de homologación, garantizando total transparencia.

# 2. DESCRIPCIÓN GENERAL DEL PRODUCTO

### 2.1 Qué es el Módulo de Conversaciones
El Módulo de Conversaciones es la consola unificada de atención y ventas conversacionales de Necto. Actúa como el centro neurálgico donde convergen todos los canales de mensajería instantánea del negocio:

- **WhatsApp Business:** Canal prioritario de ventas en Latinoamérica, operando con WhatsApp Business Cloud API vía gateway Zernio.
- **Telegram:** Canal de soporte y transacciones rápidas sin restricciones de ventana horaria, vía Telegram Bot API.
- **Instagram Direct Messages:** Canal de captación de leads visuales, respuestas a Historias (Story Mentions) y DMs desde campañas de influencers.
- **Facebook Messenger:** Canal de conversión desde Facebook Ads (Click-to-Messenger), catálogo de Fan Page y consultas de Marketplace.

A diferencia de un chat tradicional o un CRM desvinculado, Conversaciones está acoplado de forma nativa a los módulos de negocio de Necto (Pedidos e Inventario). Esto permite que el diálogo no sea meramente informativo, sino transaccional: el cliente puede consultar el menú, armar su carrito, registrar su dirección, generar un pedido operativo en tiempo real y consultar el estado de despacho sin salir de su aplicación de mensajería.

### 2.2 Qué problema resuelve
- **Dispersión multicanal:** Falta de visibilidad de ventas y dispersión de mensajes entre diferentes celulares y cuentas de redes sociales.
- **Latencia de atención:** Retrasos graves en la primera respuesta que ocasionan pérdida inmediata de clientes potenciales.
- **Fricción operativa:** Operadores que deben alternar manualmente entre chats de WhatsApp/Instagram y el software de pedidos.
- **Ceguera de contexto:** Pérdida del contexto del cliente cuando un operador toma el turno de otro, obligando al cliente a repetir su solicitud.
- **Ausencia de analítica:** Falta de métricas objetivas sobre tiempos de atención, volumen por canal y efectividad de resolución de la IA.

### 2.3 Contexto de negocio y propuesta de valor
Para un comercio minorista, restaurante o negocio de servicios en Colombia y Latinoamérica, las redes sociales y aplicaciones de mensajería representan el canal de más alta conversión:
- **Atención continua 24/7:** El bot atiende el 70%+ de las consultas frecuentes y conduce la toma de pedidos 24/7 sin intervención humana.
- **Handoff transparente:** Cuando la conversación requiere juicio comercial o soporte complejo, se realiza un traspaso suave con historial completo hacia el asesor.
- **Transaccionalidad nativa:** Cada confirmación en el chat se traduce de forma inmediata en una tarjeta en el Tablero Kanban de Pedidos.
- **Consolidación omnicanal:** Un solo operador puede atender simultáneamente conversaciones de WhatsApp, Telegram, Instagram y Facebook desde una misma pantalla.

# 3. ALCANCE DEL MÓDULO

### 3.1 Matriz de Canales en Alcance

| Canal | Protocolo / Proveedor | Estado en Necto | Tipo de Interacción Soportada | Identificador Canónico |
|---|---|---|---|---|
| **WhatsApp Business** | Meta Cloud API / Gateway Zernio | Operativo v1.0 | Texto, botones rápidos, radio lists, notas de voz, plantillas HSM. | Teléfono E.164 (+57...) |
| **Telegram** | Telegram Bot API (Webhook / Polling) | Operativo v1.0 | Texto MarkdownV2, Inline Keyboards, comandos barra (/menu), notas de voz. | chat_id numérico ('tg:...') |
| **Instagram Direct** | Meta Messenger Platform / Graph API v21.0 | Roadmap Integrado | DMs de texto, respuestas a historias (Story Mentions), imágenes, Quick Replies. | IGSID / @usuario |
| **Facebook Messenger** | Meta Messenger Platform / Graph API v21.0 | Roadmap Integrado | Texto enriquecido, carruseles de productos, postbacks, Click-to-Messenger Ads. | PSID (Page-Scoped ID) |

---

### 3.2 Capacidades Funcionales en Alcance (In Scope)
- **Ingesta Multicanal:** Recepción y procesamiento de eventos entrantes vía webhooks HTTP/HTTPS con validación de seguridad de firma HMAC.
- **Consola de Operador:** Bandeja unificada con filtros reactivos (todas, sin atender, en espera, en curso, cerradas) y buscador instantáneo.
- **ChatView Adaptativo:** Hilo de conversación con burbujas adaptativas al ancho del contenido (w-fit), avatares de canal e insignia de IA.
- **Trazabilidad IA On-Demand:** Botón discreto en la burbuja del bot para desplegar un modal con el flujo de ejecución, módulo clasificado y acción ejecutada.
- **Tarjeta de Pedido Inline:** Tarjeta interactiva de pedido incrustada dentro del mensaje del bot con número WEB-XXXX, total en $COP y botón directo.
- **Panel de Contexto Modular:** Panel lateral integrado que consulta en tiempo real el historial de compras y montos del cliente actual.
- **Gobierno de Handoff:** Transición atómica entre atención por bot y atención por asesor humano ('Tomar chat', 'Devolver al bot', 'Resolver').
- **Tiempo Real:** Sincronización instantánea de nuevos mensajes y cambios de estado vía Supabase Realtime Channels.

### 3.3 Fuera del alcance (Out of Scope)
- **Proveedor de red GSM:** Necto no construye una infraestructura celular propia; se conecta a las APIs oficiales de Meta y Telegram.
- **Pasarela de adquirencia directa:** El procesamiento bancario ocurre en pasarelas externas o terminales de pago; el chat valida la confirmación y captura el método.
- **Campañas masivas de cold-messaging:** No se permite spam masivo ni prospección no autorizada que viole las políticas comerciales de Meta.

### 3.4 Deuda técnica declarada
- **Unificación cross-channel de identidad:** Actualmente las sesiones de diferentes redes se identifican por identificadores nativos; la unificación cross-channel de un mismo cliente con múltiples cuentas requiere vinculación manual o coincidencia estricta de teléfono.
- **Cola asíncrona de audio:** El procesamiento de notas de voz en WhatsApp/Telegram utiliza transcripción estructurada en servidor Node; la inferencia de audio en segundo plano se procesa sincrónicamente en el webhook.

# 4. ACTORES Y MATRIZ RBAC

| Capacidad de Sistema | Descripción Funcional | Admin | Supervisor | Asesor / Operador | Solo Lectura |
|---|---|---|---|---|---|
| `conversations.read` | Visualizar la bandeja multicanal y leer los hilos de mensajes. | Sí | Sí | Sí | Sí |
| `conversations.reply` | Escribir y enviar mensajes manuales de cara al cliente desde la consola. | Sí | Sí | Sí | No |
| `conversations.assign` | Tomar hilos ('Tomar chat'), asignarlos a otros asesores o devolverlos al bot. | Sí | Sí | Sí | No |
| `conversations.close` | Cerrar y archivar hilos resueltos ('Resolver conversación'). | Sí | Sí | Sí | No |
| `conversations.export` | Exportar transcripciones históricas y reportes de atención. | Sí | Sí | No | No |
| `conversations.config` | Configurar conectores de canal (tokens, webhooks, credenciales Meta/Telegram). | Sí | No | No | No |

---

# 5. CANALES Y MODELO DE INTEGRACIÓN

### 5.1 WhatsApp Business Cloud API (Operativo)
- **Conexión Oficial:** Integración directa mediante Meta Graph API v21.0 y gateway de alto rendimiento Zernio.
- **Identificador canónico:** Teléfono en formato internacional E.164 (+573145376069).
- **Capacidades:** Texto libre, mensajes interactivos con botones (Quick Replies), listas desplegables (Radio Lists), plantillas HSM aprobadas y notas de voz en formato OGG/Opus.
- **Políticas Meta:** Ventana de atención estándar de 24 horas posterior al último mensaje entrante del usuario para mensajes libres; plantillas HSM para notificaciones fuera de ventana.

### 5.2 Telegram Bot API (Operativo)
- **Conexión Oficial:** Integración bidireccional vía Telegram Bot API oficial (modo Webhook y modo Polling para desarrollo local).
- **Identificador canónico:** ID numérico único de usuario en Telegram (chat_id, ej. '7965993532') normalizado internamente con prefijo 'tg:'.
- **Capacidades:** Mensajes con formato MarkdownV2, Inline Keyboards interactivos, comandos de barra (/menu, /pedido, /soporte) y notas de voz en formato OGG.
- **Políticas Telegram:** Sin ventana restrictiva de 24 horas; el bot puede emitir actualizaciones proactivas de pedidos al usuario mientras conserve el chat activo.

### 5.3 Instagram Direct Messages (Roadmap Meta Graph API)
- **Conexión Oficial:** Conexión mediante Meta Messenger Platform para Cuentas Profesionales de Instagram (Instagram Messaging API sobre Graph API v21.0).
- **Identificador canónico:** Instagram Scoped ID (IGSID) único asignado por la página de la marca. Se resuelve mediante Graph API para obtener el handle público (@usuario), nombre de perfil y foto de avatar.
- **Permisos de App Meta:** `instagram_manage_messages`, `pages_manage_metadata`, `pages_read_engagement`, `instagram_basic`.
- **Capacidades:** Mensajes directos de texto, respuestas a historias de la marca (Story Mentions / Story Replies), imágenes de productos, Quick Replies y botones Ice Breakers para preguntas frecuentes al iniciar.
- **Políticas y Ventana:** Ventana de atención estándar de 24 horas. Soporte de etiqueta `HUMAN_AGENT` que extiende la ventana hasta 7 días para casos atendidos por asesores humanos de soporte.
- **Visualización en UI:** Badge distintivo en BandejaLista con gradiente morado-fucsia-naranja oficial de Instagram y enlace directo al perfil del cliente.

### 5.4 Facebook Messenger Platform (Roadmap Meta Graph API)
- **Conexión Oficial:** Conexión mediante Messenger Platform Webhooks vinculada a la Fan Page corporativa de Facebook.
- **Identificador canónico:** Page-Scoped ID (PSID) emitido por Meta para cada usuario que interactúa con la página de Facebook.
- **Permisos de App Meta:** `pages_messaging`, `pages_show_list`.
- **Capacidades:** Texto enriquecido, carruseles horizontales de productos (Generic Templates con imagen, título, precio en COP y botón 'Comprar'), botones de URL directa y respuestas sugeridas.
- **Integración Publicitaria:** Soporte nativo para Click-to-Messenger Ads (reconocimiento automático del `ad_id` o anuncio desde el cual ingresó el cliente para personalizar el saludo).
- **Protocolo Handover:** Handover Protocol de Meta para coordinar la entrega de hilo de atención entre Chatbot Necto y Meta Business Suite Inbox.
- **Visualización en UI:** Badge distintivo en BandejaLista con color azul Messenger corporativo.

# 6. ESPECIFICACIÓN DETALLADA DE ENTRADAS (QUÉ ENTRA)

### 6.1 Ingesta de Webhooks HTTP/HTTPS
Endpoints expuestos por Necto para la recepción de eventos:
```http
POST /api/webhooks/whatsapp   (Firma: X-Hub-Signature-256)
POST /api/webhooks/telegram   (Token secreto en cabecera)
POST /api/webhooks/instagram  (Firma: X-Hub-Signature-256 - Meta Graph API)
POST /api/webhooks/messenger  (Firma: X-Hub-Signature-256 - Meta Messenger Platform)
```

| Campo Entrada | Tipo de Dato | Origen / Canal | Descripción y Regla de Negocio |
|---|---|---|---|
| `canal` | enum ('whatsapp'|'telegram'|'instagram'|'facebook') | HTTP Router | Identifica la red por la que ingresó el paquete de datos. |
| `senderId` | string | Meta / Telegram | Identificador único del remitente (teléfono E.164, chat_id, IGSID o PSID). |
| `senderName` | string opcional | Perfil público | Nombre de perfil o handle (@usuario) reportado por la plataforma. |
| `messageId` | string | ID de proveedor | Identificador único global del mensaje para descarte de duplicados (Idempotencia). |
| `timestamp` | integer (Epoch ms) | Cabecera mensaje | Marca de tiempo exacta del envío en los servidores del canal. |
| `tipoContenido` | enum | Extractor | 'texto', 'audio', 'boton_click', 'seleccion_lista', 'ubicacion', 'imagen', 'story_mention'. |
| `cuerpoTexto` | string opcional | Mensaje usuario | Texto crudo enviado por el usuario o texto transcrito si proviene de nota de voz. |
| `payloadBoton` | string opcional | Botón / Lista / Postback | Valor oculto del botón interactivo o carrusel pulsado (ej. 'CONFIRMAR_PEDIDO_WEB-0010'). |
| `referralAdId` | string opcional | Meta Ads | ID del anuncio de Facebook/Instagram desde el cual el usuario abrió la conversación. |
| `coordenadas` | objeto lat/lng opcional | Location pin | Ubicación geográfica compartida para entrega a domicilio. |

---

### 6.2 Pipeline de Clasificación e Inferencia NLU
- **Intención 'faq':** El cliente saluda, pregunta horarios, ubicación de la sede o políticas generales. Enruta a Base de Conocimiento.
- **Intención 'menu_catalogo':** El cliente solicita la carta, lista de precios o fotos de artículos. Enruta al Catálogo de Pedidos.
- **Intención 'inventario':** El cliente pregunta si queda existencia de un artículo específico ('¿tienen pechuga?'). Enruta a consulta en solo lectura del Inventario.
- **Intención 'pedido_creacion':** El cliente indica cantidades, sabores, combos o pide armar una orden ('quiero pedir 2 combos'). Activa la FSM de Construcción de Carrito.
- **Intención 'pedido_seguimiento':** El cliente pregunta por un pedido previo ('¿dónde viene mi orden?'). Consulta en PedidosStore por el pedido activo del teléfono.
- **Intención 'handoff':** El cliente solicita explícitamente una persona ('quiero hablar con un asesor', 'humano', 'queja'). Dispara el flujo de Handoff.

# 7. MOTOR CONVERSACIONAL Y MÁQUINAS DE ESTADOS

### 7.1 Máquina de Estados del Hilo de Conversación

| Estado | Modo Atención | Responsable | Significado Operativo y Transiciones |
|---|---|---|---|
| **abierta** | bot | Chatbot Necto (operador = null) | Hilo activo gestionado de forma automática por la IA. El cliente interactúa sin requerir intervención humana. |
| **en_espera** | humano | Mesa de ayuda (operador = null) | El cliente solicitó un asesor o la IA detectó que no puede resolver la duda. Requiere atención urgente. |
| **atendida** | humano | Asesor asignado (operador ≠ null) | Un asesor humano específico pulsó 'Tomar chat'. El bot se silencia y el asesor conduce la conversación. |
| **cerrada** | bot / humano | Histórico (operador anterior) | El pedido o la consulta fue completamente resuelta ('Resolver conversación'). Se archiva en el Historial. |

---

### 7.2 Flujo FSM de Construcción de Pedidos
1. **IDLE:** Esperando intención del cliente.
2. **CATALOGO_ACTIVO:** Se presenta la lista de productos y precios disponibles (o carrusel en Facebook/Instagram).
3. **CARRITO_EN_CONSTRUCCION:** El usuario agrega líneas de pedido con cantidades.
4. **SOLICITANDO_ENTREGA:** El bot pregunta si la orden es para 'retiro' en tienda o 'domicilio'.
5. **SOLICITANDO_DIRECCION:** Si es a domicilio, solicita dirección clara o ubicación GPS.
6. **CONFIRMANDO_PEDIDO:** Presenta el resumen total en $COP y solicita aprobación explícita del cliente.
7. **PEDIDO_REGISTRADO:** El pedido se inserta con éxito en la base de datos de Pedidos en estado 'nuevo'.

# 8. ESPECIFICACIÓN DETALLADA DE SALIDAS (QUÉ SALE)

### 8.1 Mensajes Salientes hacia Canales (Outbound Messages)
- **Respuestas Automáticas de IA:** Emitidas por Chatbot Necto con texto formateado en Markdown, emojis institucionales y botones de acción rápida. Se entregan en < 1.5 segundos vía REST API del canal correspondiente.
- **Mensajes Manuales del Asesor:** Generadas por el operador desde el compositor web de Necto. Se transmiten a la API oficial con el nombre del negocio sin revelar el teléfono personal del asesor.
- **Notificaciones de Pedido:** Tarjetas de confirmación enviadas cuando un pedido pasa a 'en preparación', 'listo', 'en camino' o 'entregado'.
- **Formatos Especiales Meta:** Plantillas interactivas enriquecidas con carruseles de fotos para Facebook Messenger y botones de acción rápida para Instagram Direct.

### 8.2 Transacciones hacia el Módulo de Pedidos
Cuando la FSM conversacional culmina la confirmación de una compra, emite una orden operativa completa hacia `necto.pedido` y `necto.pedido_item`:
- **Número de Orden:** Número consecutivo único generado por el sistema (ej. WEB-0038).
- **Contacto:** Nombre del cliente y teléfono normalizado E.164 (o handle @usuario en Instagram/Facebook).
- **Ítems:** Líneas con nombre de producto, cantidad y precio congelado al momento de la venta.
- **Logística:** Dirección estructurada capturada en la conversación.
- **Estado Inicial:** Por defecto 'nuevo' (columna 'Pendiente de pago' en el tablero).
- **Vínculo Bidireccional:** Asociado al mensaje de confirmación (`payload.pedidoId`), permitiendo abrir la tarjeta directamente desde el chat.

### 8.3 Eventos en Tiempo Real (Supabase Realtime)
- **Canal 'necto:mensaje':** Actualiza instantáneamente la vista del operador si entra un mensaje nuevo, sin requerir refrescar la página.
- **Canal 'necto:conversacion':** Actualiza contadores de no leídos, insignias de canal (WhatsApp, Telegram, Instagram, Facebook), estado de urgencia y orden cronológico.
- **Canal 'necto:pedido':** Si el operador o el cliente abonan la orden, el estado de pago se sincroniza en vivo en el chat y en el kanban.

### 8.4 Alertas y Derivaciones de Handoff
- **Notificación de Escalado:** Cuando una conversación pasa a 'en_espera', se emite un sonido discreto en la consola y se marca la pestaña con badge de urgencia para que cualquier asesor disponible tome el control.

# 9. SUPERFICIES OPERATIVAS DEL SISTEMA

### 9.1 Bandeja de Entrada Multicanal (BandejaLista)
Panel lateral izquierdo que lista todos los hilos ordenados por última actividad descendente. Muestra avatar del contacto con badge distintivo del canal:
- **WhatsApp:** Badge verde esmeralda con isotipo oficial.
- **Telegram:** Badge azul celeste.
- **Instagram Direct:** Badge con gradiente morado-fucsia-naranja de Instagram.
- **Facebook Messenger:** Badge azul Messenger corporativo.

Incluye nombre del cliente, previsualización de texto limpio (sin etiquetas HTML), hora relativa y contador de mensajes no leídos. Permite filtrar instantáneamente por 'Todas', 'Sin atender', 'En espera', 'En curso' y 'Resueltas'.

### 9.2 ChatView Adaptativo con Burbujas 'w-fit'
Área central del chat optimizada ergonómicamente:
- **Burbujas Adaptativas:** Las burbujas se encogen para textos breves ('Hola', 'Sí') y crecen armónicamente hasta el límite visual máximo para párrafos extensos.
- **Burbuja de Bot:** Fondo lavanda suave (`secondary-25`), avatar de robot, cabecera con badge `IA` y hora de entrega.
- **Burbuja de Cliente:** Fondo gris suave neutro (`gray-100` / dark mode `white/[0.07]`), alineado a la izquierda.
- **Burbuja de Asesor:** Fondo índigo institucional de marca (`secondary-600`), alineado a la derecha con distintivo 'Asesor Humano'.
- **Tarjeta de Pedido Inline:** Tarjeta incrustada dentro del mensaje del bot que muestra número de pedido, badge de estado, total en COP, badge de pago y botón directo 'Ver pedido'.
- **Inspección IA On-Demand:** Botón discreto 'Trazabilidad' con icono AiIcon que despliega un modal con el flujo detectado, módulo clasificado y acción técnica.

### 9.3 Panel de Contexto Modular
Panel lateral derecho que responde a la pregunta clave del operador: ¿Qué sabe cada módulo de este contacto?
- **Pestaña 'Pedidos':** Lista en tiempo real todos los pedidos históricos del cliente, con desglose de ítems, montos, estado de despacho y botón para registrar pago.
- **Pestaña 'Inventario':** Muestra el motivo semántico de diseño: el stock físico es global del almacén y no pertenece a un cliente individual, guiando al operador a la consulta de existencias.

### 9.4 Historial de Atención y Auditoría
Superficie analítica donde se revisan todas las sesiones cerradas, los tiempos totales de conversación, qué operador atendió cada ticket y qué pedidos se originaron en cada charla.

### 9.5 Configuración de Canales y Asistente
Panel administrativo para gestionar las credenciales de los conectores (Meta App ID, WhatsApp Phone Number ID, Telegram Bot Token, Instagram Account ID, Facebook Page Access Token), definir horarios de atención y personalizar las plantillas de notificación.

# 10. REGLAS DE NEGOCIO E INVARIANTES DE CONSISTENCIA

| ID | Invariante de Consistencia | Criterio Técnico y Regla de Cumplimiento |
|---|---|---|
| **C1** | Aislamiento Estricto de Canales | Cada hilo pertenece estrictamente a un único canal ('whatsapp', 'telegram', 'instagram', 'facebook'). No se mezclan mensajes de distintas redes en un mismo identificador de conversación. |
| **C2** | Unicidad de Hilo Activo por Contacto y Canal | Un contacto sólo puede tener UNA conversación viva (abierta, en_espera o atendida) a la vez en un canal determinado. |
| **C3** | Invariante de Atención de Handoff | Si estado = 'atendida', atencion DEBE ser 'humano' y operadorAsignadoId ≠ null. Si atencion = 'bot', operadorAsignadoId DEBE ser null. |
| **C4** | Silenciamiento Estricto del Bot | Cuando un operador pulsa 'Tomar chat', el bot queda inhibido de emitir respuestas automáticas hacia ese cliente hasta que el hilo sea devuelto explícitamente al bot. |
| **C5** | Consistencia Temporal Monótona | El campo ultimaActividad de la conversación debe coincidir exactamente con el timestamp del último mensaje o evento registrado en el hilo. |
| **C6** | Idempotencia en Webhooks | Todo mensaje entrante con un messageId ya procesado en los últimos 7 días debe ser descartado silenciosamente sin duplicar registros. |
| **C7** | Desacoplamiento de Pago | El estado de pago pertenece exclusivamente a la entidad Pedido (Pedido.pagado), NUNCA a la conversación. Una conversación no se etiqueta como 'pagada'. |
| **C8** | Normalización Canónica de Identidad | WhatsApp normaliza a E.164 (+57...). Telegram a 'tg:<chat_id>'. Instagram a 'ig:<igsid>' con @handle. Facebook Messenger a 'fb:<psid>'. |
| **C9** | Sanitización Visual de Previews | Los textos de vista previa en la bandeja deben purgar cualquier etiqueta HTML o Markdown para evitar contaminación visual y ataques XSS. |
| **C10** | Trazabilidad Inmutable de Pedido | El vínculo payload.pedidoId dentro del mensaje del bot es de solo lectura una vez emitido; refleja la orden creada sin alterar el historial. |

---

# 11. MODELO DE DATOS RELACIONAL (SUPABASE)

| Tabla PostgreSQL | Propósito y Relaciones Clave | Campos Relevantes |
|---|---|---|
| `necto.contacto` | Directorio maestro de clientes que interactúan por cualquier canal. | id, organizacion_id, nombre, telefono, telefono_norm, origen ('whatsapp'|'telegram'|'instagram'|'facebook'), red_social_id |
| `necto.conversacion` | Cabecera del hilo de atención y máquina de estados. | id, organizacion_id, contacto_id, canal ('whatsapp'|'telegram'|'instagram'|'facebook'), estado ('abierta'|'en_espera'|'atendida'|'cerrada'), modo_atencion ('bot'|'humano'), agente_id, ultima_actividad |
| `necto.mensaje` | Línea de mensaje individual en el hilo. | id, conversacion_id, autor_tipo ('cliente'|'bot'|'agente'), contenido (JSONB: texto, media, payload), creado_en |
| `necto.evento_sistema` | Auditoría de eventos ocurridos en el hilo (handoff, cambio de estado). | id, conversacion_id, tipo_evento, payload, creado_en |
| `necto.integracion_canal` | Credenciales y estado de conexión de cada canal. | id, organizacion_id, canal, credenciales (JSON cifrado: tokens, app_secret), webhook_secret, activo |

---

# 12. CASOS DE USO Y FLUJOS DETALLADOS

### CU-01: Atención Automática de Consulta de Catálogo y Menú (WhatsApp / Telegram)
**Actor:** Cliente final a través de WhatsApp o Telegram.

**Flujo principal:**
1. El cliente escribe: 'Hola, ¿qué venden?' o '/menu'.
2. El webhook recibe el evento y el NLU clasifica intención 'menu_catalogo'.
3. Chatbot Necto consulta el catálogo simple de PedidosStore y compone una respuesta estructurada con los productos y precios.
4. El mensaje se envía al canal en < 1 segundo; en Necto se renderiza la burbuja lavanda adaptativa del bot.

### CU-02: Generación Conversacional de Pedido y Tarjeta Inline
**Actor:** Cliente y Chatbot Necto.

**Flujo principal:**
1. El cliente selecciona 2 artículos y especifica su dirección de entrega.
2. El bot resume la orden: 'Total $54.000 COP a Calle 100 # 15-20. ¿Confirmas tu pedido?'.
3. El cliente responde 'Sí, confirmar'.
4. El backend inserta la orden en `necto.pedido` con número consecutivo WEB-XXXX y modalidad 'domicilio'.
5. El bot emite la confirmación adjuntando `payload: { pedidoId: 'WEB-XXXX' }`.
6. En la interfaz de Necto, el mensaje del bot dibuja la Tarjeta de Pedido Inline con botón interactivo 'Ver pedido'.

### CU-03: Solicitud de Asesor Humano (Handoff) y Toma de Control
**Actor:** Cliente, Bot y Asesor Humano.

**Flujo principal:**
1. El cliente escribe: 'Necesito hablar con una persona, tengo un inconveniente'.
2. El bot clasifica intención 'handoff', responde cordialmente: 'Comprendo, te transfiero de inmediato con un asesor del equipo', y cambia el estado a 'en_espera'.
3. En la consola de Necto, la conversación se resalta en la sección de atención urgente con indicador de espera.
4. El asesor pulsa 'Tomar chat': la conversación pasa a 'atendida', se asigna a su ID y el bot se silencia.
5. El asesor responde directamente desde el compositor web con burbujas índigo de 'Asesor Humano'.

### CU-04: Captación y Atención desde Historia de Instagram (Story Mention)
**Actor:** Cliente en Instagram y Asesor Necto.

**Flujo principal:**
1. El cliente etiqueta a la marca en una Historia de Instagram o responde a una Historia activa preguntando por disponibilidad.
2. El webhook de Meta (`POST /api/webhooks/instagram`) recibe el evento con `tipoContenido: 'story_mention'` y el `IGSID` del usuario.
3. Necto crea o vincula el contacto registrando su `@usuario` y abre un hilo con insignia de Instagram en BandejaLista.
4. El chatbot saluda amablemente, presenta el menú con Quick Replies y el cliente confirma su orden.

### CU-05: Conversión desde Anuncio de Facebook (Click-to-Messenger)
**Actor:** Cliente desde Facebook Ads y Chatbot Necto.

**Flujo principal:**
1. El usuario pulsa el botón 'Enviar mensaje' en una publicación promocionada en Facebook.
2. El webhook de Messenger recibe el payload con `referralAdId` identificando la campaña publicitaria.
3. Chatbot Necto despliega un carrusel de productos enfocado en la promoción específica del anuncio.
4. El usuario pulsa el botón interactivo 'Pedir ahora', ingresa sus datos y se genera la orden en Pedidos.

# 13. HISTORIAL DE ENTREGABLES Y ROADMAP

| Hito / ID | Fase / Módulo | Entregable Técnico y Funcional | Fecha | Líder Técnico |
|---|---|---|---|---|
| **H-CONV-01** | Fase 1: Gateway Base | Arquitectura de webhooks HTTP/HTTPS con validación de tokens y soporte inicial WhatsApp Business Cloud API. | 21-sep-2026 | Jessy Quinto T |
| **H-CONV-02** | Fase 2: Motor NLU & FSM | Implementación de la máquina de estados de pedidos conversacionales y clasificación de intenciones. | 22-sep-2026 | Jessy Quinto T |
| **H-CONV-03** | Fase 3: Canal Telegram | Integración completa de Telegram Bot API con soporte de comandos, Inline Keyboards y modo dual. | 23-sep-2026 | Jessy Quinto T |
| **H-CONV-04** | Fase 4: Consola y Bandeja | Desarrollo de BandejaLista con filtros reactivos, buscador en tiempo real e insignias de canal. | 24-sep-2026 | Jessy Quinto T |
| **H-CONV-05** | Fase 5: ChatView Adaptativo | Rediseño de burbujas ergonómicas w-fit, eliminación de ruido visual y trazabilidad IA bajo demanda. | 25-sep-2026 | Jessy Quinto T |
| **H-CONV-06** | Fase 6: Tarjetas Pedido Inline | Vinculación nativa payload.pedidoId con tarjeta interactiva dentro de la burbuja del bot. | 25-sep-2026 | Jessy Quinto T |
| **H-CONV-07** | Fase 7: Sincronización Realtime | Conexión a canales Supabase Realtime para actualización instantánea de mensajes y estados. | 25-sep-2026 | Jessy Quinto T |
| **H-CONV-08** | Fase 8: Depuración de Datos | Saneamiento de base de datos preservando contactos y pedidos reales de producción. | 25-sep-2026 | Jessy Quinto T |
| **H-CONV-09** | Fase 9: Instagram Direct API | Homologación en Meta Graph API para recepción y despacho de DMs de Instagram en la bandeja. | Q4 2026 | Jessy Quinto T |
| **H-CONV-10** | Fase 10: Facebook Messenger | Activación del conector Messenger Platform para atención omnicanal centralizada y carruseles. | Q4 2026 | Jessy Quinto T |
| **H-CONV-11** | Fase 11: Campañas HSM Masivas | Gestión de plantillas aprobadas por Meta para recordatorios proactivos y seguimiento post-venta. | Q1 2027 | Jessy Quinto T |
| **H-CONV-12** | Fase 12: Voicebot con LLM | Transmisión de voz bidireccional mediante modelos de voz en tiempo real. | Q1 2027 | Jessy Quinto T |
