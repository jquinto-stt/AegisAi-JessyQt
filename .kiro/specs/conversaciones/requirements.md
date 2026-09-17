# Requirements Document

## Introduction

**Conversaciones** es una capa transversal de comunicaciones para la aplicación (React 18 + MobX + react-router v7 + Tailwind 4). Su primer y único canal en este MVP es **WhatsApp**, aunque el modelo de dominio se diseña multicanal desde el inicio. El módulo introduce una **consola del operador** en la ruta `/conversaciones` (dentro del `AppShell`) y reconvierte el actual simulador `/wa` en la **vista del cliente** del mismo canal, de modo que ambas superficies consumen el **mismo store** (`conversacionesStore`) y se sincronizan de forma bidireccional en vivo.

La atención de una conversación tiene dos modos: **humana** (un operador toma el chat) y **automática** (el "bot"). Decisión de arquitectura central: el "bot" **no** es un segundo motor. La atención automática es **Necto Intelligence** (el asistente ya existente) respondiendo dentro del canal a través del **Tool Registry central**; no se duplica lógica de intención en el store de conversaciones.

Este documento de requisitos se deriva del documento de diseño aprobado y refleja fielmente el alcance definido: solución **frontend-only** con mock reactivo (sin backend, sin Meta / WhatsApp Cloud API, sin webhooks), motor rule-based solo texto, y un modelo preparado (no implementado) para multimodal y multicanal. El módulo se integra con el contrato de acceso de la app mediante la nueva capacidad `channels.respond`.

## Glossary

- **Conversacion**: Hilo de comunicación entre un contacto del canal y el negocio, con estado del hilo y modo de atención propios.
- **Bandeja**: Lista de conversaciones de la consola del operador, sujeta a filtro y búsqueda.
- **Handoff**: Conjunto de transiciones que traspasan la atención entre el bot y un operador humano (solicitar, tomar, devolver, cerrar).
- **Modo_De_Atencion**: Responsable actual de la conversación; valores `bot` (Necto Intelligence) o `humano` (operador).
- **Estado_Conversacion**: Estado del hilo; valores `abierta`, `en_espera`, `atendida` o `cerrada`.
- **Contacto**: Identidad ligera del cliente en el canal (`telefono`, `nombre`, `origen`); no es una entidad Cliente del dominio.
- **Evento_De_Sistema**: Anotación del hilo que registra transiciones (no es un mensaje de ninguna parte), intercalada en la línea de tiempo.
- **Consola_Operador**: Superficie React en `/conversaciones` dentro del `AppShell`, protegida por la capacidad `channels.read`.
- **Simulador_Cliente**: Superficie React standalone en `/wa` que representa la vista del cliente del canal.
- **Necto_Intelligence**: Asistente existente que actúa como bot mediante `AssistantEngine` y `ToolRegistry`; también referido como "bot".
- **AssistantEngine**: Motor del asistente que resuelve una consulta (`ask`) usando el `ToolRegistry`.
- **ToolRegistry**: Registro central que expone las tools disponibles según módulos habilitados en sesión ∩ capacidades.
- **Conversaciones_Store**: Store MobX dueño único de conversaciones, mensajes y eventos de sistema.
- **Pedidos_Store**: Store de Pedidos, accesible solo por métodos públicos (`porTelefono`, `crearPedido`).
- **Panel_De_Contexto**: Panel colapsable de la consola con las pestañas Pedidos y Turnos.
- **Capability_Guard**: Guardia de ruta que exige una capacidad para renderizar una sección.
- **channels.read**: Capacidad para ver la bandeja, consultar historiales y entrar a `/conversaciones`.
- **channels.respond**: Capacidad para responder en el chat y hacer handoff (tomar / devolver).
- **channels.manage**: Capacidad para editar plantillas, reglas de enrutamiento y configuración del canal.

## Requirements

### Requirement 1: Bandeja de conversaciones en la consola

**User Story:** As a operador, I want ver y filtrar la bandeja de conversaciones en `/conversaciones`, so that pueda localizar rápidamente los chats que necesitan mi atención.

#### Acceptance Criteria

1. WHERE la capacidad `channels.read` está concedida en la sesión, THE Consola_Operador SHALL mostrar la lista de conversaciones ordenada por última actividad de forma descendente, y ante empates de última actividad SHALL ordenar de forma estable por identificador de conversación ascendente.
2. IF la capacidad `channels.read` no está concedida en la sesión, THEN THE Consola_Operador SHALL no renderizar la Bandeja y SHALL presentar una indicación de acceso denegado.
3. WHEN el operador selecciona el filtro `todas`, THE Conversaciones_Store SHALL incluir en la Bandeja todas las conversaciones que coincidan con la búsqueda activa.
4. WHEN el operador selecciona el filtro `no_leidas`, THE Conversaciones_Store SHALL incluir en la Bandeja únicamente las conversaciones con contador de no leídos mayor que cero que coincidan con la búsqueda activa.
5. WHEN el operador selecciona el filtro `requieren_atencion`, THE Conversaciones_Store SHALL incluir en la Bandeja únicamente las conversaciones cuyo Estado_Conversacion es `en_espera` que coincidan con la búsqueda activa.
6. WHEN el operador selecciona el filtro `cerradas`, THE Conversaciones_Store SHALL incluir en la Bandeja únicamente las conversaciones cuyo Estado_Conversacion es `cerrada` que coincidan con la búsqueda activa.
7. WHEN el operador introduce texto en el buscador, THE Conversaciones_Store SHALL restringir la Bandeja a las conversaciones cuyo nombre o teléfono de contacto contiene el texto introducido, sin distinguir mayúsculas de minúsculas.
8. IF el filtro y la búsqueda activos no producen coincidencias, THEN THE Consola_Operador SHALL presentar un indicador de bandeja vacía.
9. THE Consola_Operador SHALL mostrar en cada conversación de la Bandeja un badge de Estado_Conversacion (`abierta`, `en_espera`, `atendida` o `cerrada`) distinto del badge de responsable (🤖 `bot` o 👤 `humano`).
10. THE Consola_Operador SHALL mostrar en cada conversación de la Bandeja el contador de no leídos.
11. WHEN el operador selecciona una conversación, THE Conversaciones_Store SHALL fijar el contador de no leídos de esa conversación en cero.

### Requirement 2: Vista de chat con línea de tiempo unificada

**User Story:** As a operador, I want ver mensajes y eventos de sistema intercalados con autoría clara, so that pueda seguir el hilo completo de una conversación.

#### Acceptance Criteria

1. WHEN el operador abre una conversación seleccionada, THE Consola_Operador SHALL mostrar una línea de tiempo unificada que intercala mensajes y eventos de sistema ordenados por timestamp de forma ascendente, y ante timestamps idénticos SHALL preservar el orden de inserción.
2. THE Consola_Operador SHALL renderizar los mensajes con autor `cliente` alineados a la derecha y con una etiqueta de autoría visible.
3. THE Consola_Operador SHALL renderizar los mensajes con autor `negocio` o `bot` alineados a la izquierda y con una etiqueta de autoría visible que distinga `negocio` de `bot`.
4. THE Consola_Operador SHALL mostrar cada Evento_De_Sistema como una anotación visualmente diferenciada de los mensajes de `cliente`, `negocio` y `bot`.
5. IF la conversación seleccionada no tiene mensajes ni eventos de sistema, THEN THE Consola_Operador SHALL presentar un indicador de conversación vacía.

### Requirement 3: Envío de mensajes del operador

**User Story:** As a operador con permiso para responder, I want enviar mensajes como negocio dentro del chat, so that pueda atender directamente al cliente.

#### Acceptance Criteria

1. WHERE la capacidad `channels.respond` está concedida en la sesión, THE Consola_Operador SHALL habilitar el composer para enviar mensajes como negocio con un límite máximo de 4096 caracteres por mensaje.
2. IF la capacidad `channels.respond` no está concedida en la sesión, THEN THE Consola_Operador SHALL deshabilitar el composer e impedir la entrada de texto, y mostrar un mensaje indicando que se requiere el permiso `channels.respond`.
3. WHEN el operador envía un mensaje con texto no vacío de entre 1 y 4096 caracteres desde el composer, THE Conversaciones_Store SHALL agregar a la conversación un mensaje con autor `negocio`, con marca de tiempo del momento del envío, y ordenado como el mensaje más reciente de la conversación.
4. IF el operador envía un mensaje con texto vacío o compuesto únicamente por espacios en blanco, THEN THE Conversaciones_Store SHALL ignorar el envío sin crear ningún mensaje y sin modificar el estado de la conversación.
5. IF el operador envía un mensaje cuyo texto excede los 4096 caracteres, THEN THE Conversaciones_Store SHALL rechazar el envío sin crear ningún mensaje y THE Consola_Operador SHALL mostrar un mensaje indicando que se superó el límite máximo de caracteres.
6. WHEN el operador envía un mensaje como negocio, THE Conversaciones_Store SHALL mantener sin incrementar el contador de no leídos de esa conversación.

### Requirement 4: Handoff entre bot y humano

**User Story:** As a operador, I want traspasar la atención entre el bot y un humano mediante transiciones controladas, so that el estado de la conversación refleje siempre quién la atiende.

#### Acceptance Criteria

1. WHEN se ejecuta `solicitarHumano` sobre una conversación cuyo Estado_Conversacion es `abierta`, THE Conversaciones_Store SHALL fijar el Estado_Conversacion en `en_espera` y el Modo_De_Atencion en `humano`.
2. WHERE la capacidad `channels.respond` está concedida, WHEN se ejecuta `tomar` sobre una conversación cuyo Estado_Conversacion es `en_espera` o `abierta`, THE Conversaciones_Store SHALL fijar el Estado_Conversacion en `atendida`, el Modo_De_Atencion en `humano` y asignar el operador indicado.
3. IF se ejecuta `tomar` o `devolver` sin la capacidad `channels.respond` concedida, THEN THE Conversaciones_Store SHALL rechazar la operación sin modificar el estado de la conversación.
4. WHERE la capacidad `channels.respond` está concedida, WHEN se ejecuta `devolver` sobre una conversación cuyo Estado_Conversacion es `atendida`, THE Conversaciones_Store SHALL fijar el Estado_Conversacion en `abierta`, el Modo_De_Atencion en `bot` y liberar el operador asignado.
5. WHEN se ejecuta `cerrar` sobre una conversación cuyo Estado_Conversacion no es `cerrada`, THE Conversaciones_Store SHALL fijar el Estado_Conversacion en `cerrada`.
6. IF se ejecuta `cerrar` sobre una conversación cuyo Estado_Conversacion ya es `cerrada`, THEN THE Conversaciones_Store SHALL mantener el estado sin cambios y sin registrar eventos.
7. WHEN se completa una transición de handoff, THE Conversaciones_Store SHALL registrar un Evento_De_Sistema correspondiente a la transición.
8. IF se solicita una transición no permitida por el Estado_Conversacion actual, THEN THE Conversaciones_Store SHALL mantener el estado sin cambios y sin registrar eventos.
9. WHILE el Estado_Conversacion es `atendida`, THE Conversaciones_Store SHALL mantener el Modo_De_Atencion en `humano` con un operador asignado distinto de nulo.
10. WHILE el Modo_De_Atencion es `bot`, THE Conversaciones_Store SHALL mantener el operador asignado en nulo.

### Requirement 5: Atención automática mediante Necto Intelligence

**User Story:** As a negocio, I want que el bot responda automáticamente a los clientes usando el motor del asistente existente, so that las conversaciones se atiendan sin duplicar lógica de intención.

#### Acceptance Criteria

1. WHEN llega un mensaje del cliente en una conversación cuyo Modo_De_Atencion es `bot` y cuyo Estado_Conversacion no es `cerrada`, THE Conversaciones_Store SHALL solicitar la respuesta automática al AssistantEngine a través del adaptador del módulo.
2. THE Conversaciones_Store SHALL obtener la respuesta automática exclusivamente mediante el AssistantEngine, sin contener detección de intención ni ramas por palabra clave del cliente.
3. WHEN el AssistantEngine devuelve una respuesta con contenido, THE Conversaciones_Store SHALL agregar a la conversación un único mensaje con autor `bot` cuyo texto coincide con la respuesta devuelta.
4. THE Necto_Intelligence SHALL disponer únicamente de las tools resultantes de la intersección entre los módulos habilitados en la sesión y las capacidades concedidas, excluyendo cualquier tool fuera de esa intersección.
5. IF la sesión no es válida al construir el contexto de acceso, THEN THE ToolRegistry SHALL exponer un conjunto vacío de tools al bot.
6. IF el AssistantEngine falla, rechaza la solicitud o no responde dentro de 30 segundos, THEN THE Conversaciones_Store SHALL agregar un único mensaje de bot de fallback que indique que un asesor atenderá al cliente.
7. IF el AssistantEngine devuelve una respuesta sin contenido, THEN THE Conversaciones_Store SHALL no agregar ningún mensaje con autor `bot`.

### Requirement 6: Simulador del cliente en /wa

**User Story:** As a cliente simulado, I want escribir libremente en `/wa` y poder pedir un asesor, so that pueda demostrar el flujo de conversación de extremo a extremo.

#### Acceptance Criteria

1. THE Simulador_Cliente SHALL consumir el mismo Conversaciones_Store que la Consola_Operador.
2. WHEN el cliente escribe un mensaje de entre 1 y 2000 caracteres en el Simulador_Cliente, THE Conversaciones_Store SHALL registrar un mensaje con autor `cliente` observable en la Consola_Operador.
3. IF el cliente intenta enviar un mensaje vacío o que excede los 2000 caracteres, THEN THE Simulador_Cliente SHALL rechazar el envío, conservar el texto introducido y presentar una indicación al usuario.
4. WHEN el operador envía un mensaje como negocio o el bot agrega una respuesta, THE Simulador_Cliente SHALL mostrar ese mensaje en su vista.
5. THE Simulador_Cliente SHALL ofrecer un campo de entrada editable en todo momento, sin candado de solo lectura.
6. WHEN el cliente usa el comando rápido "Hablar con un asesor" sobre una conversación activa, THE Conversaciones_Store SHALL ejecutar `solicitarHumano` sobre esa conversación.
7. IF el cliente usa el comando rápido "Hablar con un asesor" sin una conversación activa, THEN THE Simulador_Cliente SHALL presentar una indicación de que no hay conversación activa.
8. THE Simulador_Cliente SHALL permanecer como ruta standalone fuera del `AppShell`.

### Requirement 7: Panel de contexto colapsable

**User Story:** As a operador, I want consultar los pedidos del contacto y crear pedidos desde el chat, so that pueda gestionar la operación sin salir de la conversación.

#### Acceptance Criteria

1. THE Consola_Operador SHALL presentar el Panel_De_Contexto como panel colapsable e inicialmente colapsado.
2. WHEN el operador activa el control de expandir o colapsar del Panel_De_Contexto, THE Consola_Operador SHALL alternar entre el estado expandido y el estado colapsado.
3. WHEN el operador abre la pestaña Pedidos del Panel_De_Contexto, THE Consola_Operador SHALL mostrar los pedidos del contacto obtenidos mediante `pedidosStore.porTelefono` usando el teléfono del contacto, ordenados del más reciente al más antiguo.
4. IF el contacto no tiene pedidos asociados, THEN THE Consola_Operador SHALL mostrar un mensaje indicando la ausencia de pedidos en la pestaña Pedidos.
5. THE Consola_Operador SHALL mostrar por cada pedido del contacto su estado de preparación y su estado de pago.
6. WHEN el operador activa el botón "Crear pedido", THE Consola_Operador SHALL prellenar cliente, teléfono y origen `whatsapp`, e invocar `pedidosStore.crearPedido`.
7. IF la invocación de `pedidosStore.crearPedido` falla, THEN THE Consola_Operador SHALL mostrar un mensaje de error indicando que el pedido no se pudo crear y SHALL conservar los datos prellenados de cliente, teléfono y origen.
8. THE Consola_Operador SHALL mostrar la pestaña Turnos del Panel_De_Contexto como placeholder reservado para uso futuro.

### Requirement 8: Integración con acceso y roles

**User Story:** As a administrador de acceso, I want gobernar Conversaciones mediante capacidades y roles, so that cada rol disponga solo de las acciones que le corresponden.

#### Acceptance Criteria

1. THE Conversaciones_Store SHALL incorporar la capacidad `channels.respond` al modelo de acceso en el orden jerárquico exacto: `channels.read`, seguida de `channels.respond`, seguida de `channels.manage`.
2. THE Consola_Operador SHALL registrar en el catálogo de secciones una entrada con etiqueta "Conversaciones", ruta `/conversaciones` y capacidad requerida `channels.read`, verificable como una única entrada sin duplicados.
3. WHERE la capacidad `channels.read` está concedida en la sesión activa, THE AppSidebar SHALL mostrar el ítem de navegación "Conversaciones" enlazado a la ruta `/conversaciones`.
4. IF una sesión sin la capacidad `channels.read` intenta acceder a `/conversaciones`, THEN THE Capability_Guard SHALL impedir el renderizado de la sección, no exponer contenido de Conversaciones y presentar una indicación de acceso denegado al usuario.
5. THE modelo de roles SHALL conceder exactamente las capacidades `channels.read`, `channels.respond` y `channels.manage`, sin capacidades de canales adicionales, a cada uno de los roles `admin_tienda` y `supervisor_pedidos`.
6. THE modelo de roles SHALL conceder exactamente las capacidades `channels.read` y `channels.respond`, y no conceder `channels.manage`, al rol `vendedor`.
7. THE modelo de roles SHALL conceder cero capacidades de canales (`channels.read`, `channels.respond` y `channels.manage` todas ausentes) al rol `preparacion`.

### Requirement 9: Persistencia y arranque

**User Story:** As a negocio, I want que el estado de conversaciones persista entre sesiones con datos iniciales, so that la demo arranque con contenido y conserve los cambios.

#### Acceptance Criteria

1. WHEN el estado del Conversaciones_Store cambia, THE Conversaciones_Store SHALL persistir su estado en `localStorage` bajo una clave propia.
2. IF `localStorage` no está disponible o su contenido es inválido al hidratar, THEN THE Conversaciones_Store SHALL continuar operando en memoria sin interrumpir la ejecución y sin exponer errores al usuario.
3. WHEN el Conversaciones_Store se inicializa y existe estado persistido válido, THE Conversaciones_Store SHALL restaurar las conversaciones y mensajes almacenados sin cargar el seed.
4. WHEN el Conversaciones_Store se inicializa sin estado persistido válido, THE Conversaciones_Store SHALL cargar el seed inicial de conversaciones.
5. THE Simulador_Cliente SHALL leer sus conversaciones del Conversaciones_Store en lugar de `chats.mock.ts`.

### Requirement 10: Restricciones de alcance y encapsulamiento

**User Story:** As a arquitecto del sistema, I want mantener el módulo frontend-only y estrictamente encapsulado, so that el diseño permanezca coherente y extensible.

#### Acceptance Criteria

1. THE módulo Conversaciones SHALL operar exclusivamente en el frontend, sin realizar llamadas de red a un backend propio, sin integración con Meta / WhatsApp Cloud API y sin registrar ni exponer webhooks.
2. IF se recibe o procesa un mensaje cuyo tipo no sea `texto`, THEN THE módulo Conversaciones SHALL rechazar el mensaje y conservar el estado de la conversación sin modificar.
3. THE módulo Conversaciones SHALL aceptar mensajes de tipo `texto`, manteniendo el modelo de datos preparado para contenido multimodal sin implementar dicho procesamiento.
4. IF se intenta procesar un mensaje cuyo canal no sea `whatsapp`, THEN THE módulo Conversaciones SHALL rechazar el mensaje y conservar el estado de la conversación sin modificar.
5. THE archivo `conversaciones.store.ts` SHALL abstenerse de importar `pedidos.store`, accediendo a Pedidos únicamente mediante los métodos públicos `porTelefono` y `crearPedido`.
6. THE campo `Mensaje.payload` SHALL contener únicamente valores primitivos e identificadores, sin incrustar la entidad `Pedido` ni ninguna otra entidad completa.
7. THE atención automática SHALL procesar cada mensaje entrante mediante un único motor accesible a través del AssistantEngine, sin invocar ningún motor de bot separado ni alternativo.
