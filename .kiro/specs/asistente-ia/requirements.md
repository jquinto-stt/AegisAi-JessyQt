# Requirements Document

## Introduction

Este documento deriva los requisitos del módulo **Asistente ("Necto Intelligence")** a partir del diseño técnico aprobado (`design.md`), que es la fuente de verdad de este flujo Design-First. El Asistente es un chat conversacional, **100% frontend, sin backend, sin API key y sin LLM real**, que responde preguntas sobre la operación consultando datos ya existentes en los stores de dominio mediante **tool-calling**.

El motor del MVP es **rule-based local** (`LocalRuleEngine`) detrás de un contrato intercambiable `AssistantEngine`. El núcleo del asistente es **agnóstico de dominio**: no importa stores de negocio ni la sesión; cada módulo aporta sus tools por medio de un `AssistantToolProvider`. El asistente distingue de forma estricta entre **HECHOS** (datos leídos de stores) e **INFERENCIAS** (heurísticas), y **nunca afirma causalidad**.

El MVP es de **solo consulta y análisis** (niveles `query` y `analyze`), sin acciones mutativas. El acceso se controla con la capacidad propia `assistant.use`, y las tools visibles se calculan como la intersección de las tools de los módulos habilitados con las tools permitidas por las capacidades del usuario.

## Glossary

- **Asistente**: El módulo "Necto Intelligence"; conjunto de UI, store y núcleo que provee el chat conversacional.
- **AssistantEngine**: Interfaz del motor que interpreta la intención del usuario y orquesta tools; su implementación MVP es `LocalRuleEngine`.
- **LocalRuleEngine**: Implementación rule-based local del `AssistantEngine` para el MVP.
- **RemoteLLMEngine**: Implementación futura del `AssistantEngine` (stub documentado, sin implementación en el MVP).
- **ToolRegistry**: Componente del núcleo que agrega los `AssistantToolProvider` y expone las tools disponibles aplicando el filtro módulos ∩ capacidades.
- **AssistantToolProvider**: Proveedor de tools de un módulo; único punto que importa el store de ese módulo.
- **PedidosToolProvider**: `AssistantToolProvider` del módulo Pedidos; único punto que importa `pedidosStore`.
- **AssistantTool**: Tool que un módulo expone al asistente; declara `id` namespaced, `module`, `level`, `requiredCapabilities` y `params`.
- **AssistantAccessContext**: Snapshot de autorización (módulos habilitados + verificación de capacidades) que entiende el núcleo, construido por un adaptador delgado desde `sessionStore`.
- **AssistantStore**: Store MobX que es fuente de verdad del estado de UI del asistente (historial, "pensando", error) y orquestador que llama al `AssistantEngine`.
- **Fact (Hecho)**: Dato objetivo leído de un store, sin interpretación.
- **Inference (Inferencia)**: Interpretación heurística marcada con su `kind` y `confidence`; nunca causal.
- **ToolResult**: Resultado de ejecutar una tool: `facts`, `inferences?` y `sources`.
- **Capacidad (Capability)**: Permiso atómico verificable del usuario (ej. `assistant.use`, `orders.read`).
- **CapabilityGuard**: Componente que controla el acceso a una ruta según una capacidad.
- **Composer**: Componente de UI con input habilitado y botón enviar.
- **ChatThread**: Componente de UI que renderiza la lista de mensajes.
- **FactsPanel**: Componente de UI que muestra las fuentes consultadas, separando Hechos de Inferencias.
- **Nivel de tool (ToolCapabilityLevel)**: Uno de `query`, `analyze`, `recommend`, `execute`; el MVP implementa solo `query` y `analyze`.

## Requirements

### Requirement 1: Enviar preguntas y mantener el hilo de conversación

**User Story:** Como usuario del Asistente, quiero escribir preguntas y ver la conversación en un hilo, para consultar la operación de forma natural.

#### Acceptance Criteria

1. WHEN el usuario envía desde el Composer un texto que, tras aplicar `trim`, contiene entre 1 y 4000 caracteres, THE AssistantStore SHALL agregar al final del historial un mensaje con `role="user"` cuyo contenido es el texto con `trim` aplicado.
2. IF el usuario envía un texto que queda vacío tras aplicar `trim`, THEN THE AssistantStore SHALL mantener el historial sin cambios y no invocar `AssistantEngine.ask`.
3. WHEN el AssistantStore inicia el procesamiento de una pregunta, THE AssistantStore SHALL establecer `pensando=true`.
4. WHEN el AssistantEngine devuelve una respuesta, THE AssistantStore SHALL agregar al final del historial un mensaje con `role="assistant"` cuyo contenido es la respuesta y establecer `pensando=false`.
5. WHEN el AssistantStore recibe una pregunta, THE AssistantStore SHALL invocar `AssistantEngine.ask` pasando un `EngineContext` con el `AssistantAccessContext` de la sesión.
6. WHEN el historial contiene uno o más mensajes, THE ChatThread SHALL renderizar cada mensaje en una burbuja cuya alineación y estilo dependen de su `role`, mostrando los mensajes con `role="user"` de forma visualmente distinta a los mensajes con `role="assistant"`.
7. WHEN el usuario solicita limpiar la conversación, THE AssistantStore SHALL vaciar el historial de mensajes.
8. IF `AssistantEngine.ask` falla o no devuelve una respuesta, THEN THE AssistantStore SHALL establecer `pensando=false`, conservar el mensaje del usuario en el historial y establecer un mensaje de error legible.
9. IF el usuario intenta enviar una pregunta WHILE `pensando=true`, THEN THE AssistantStore SHALL rechazar el envío y mantener el historial sin cambios.

### Requirement 2: Filtrado de tools por módulos habilitados y capacidades

**User Story:** Como responsable de seguridad, quiero que el asistente solo use tools de módulos habilitados y permitidos por las capacidades del usuario, para respetar el modelo de acceso.

#### Acceptance Criteria

1. WHEN el ToolRegistry calcula las tools disponibles para un `AssistantAccessContext`, THE ToolRegistry SHALL incluir una AssistantTool en el resultado si y solo si `tool.module` pertenece a `access.enabledModules`.
2. WHEN el ToolRegistry calcula las tools disponibles para un `AssistantAccessContext`, THE ToolRegistry SHALL incluir una AssistantTool en el resultado si y solo si el usuario posee cada una de las `requiredCapabilities` declaradas por esa tool; si `requiredCapabilities` está vacío, la condición de capacidades se considera satisfecha.
3. IF el `AssistantAccessContext` no otorga ninguna de las `requiredCapabilities` de ninguna tool candidata, THEN THE ToolRegistry SHALL devolver una lista de tools disponibles con exactamente 0 elementos.
4. WHEN el ToolRegistry resuelve una tool por su `id` para un `AssistantAccessContext`, THE ToolRegistry SHALL devolver la tool si y solo si esa tool aparece en las tools disponibles calculadas para el mismo contexto.
5. IF una tool solicitada por `id` no aparece en las tools disponibles del contexto, THEN THE ToolRegistry SHALL devolver `null` sin lanzar ninguna excepción.
6. WHEN el ToolRegistry registra un AssistantToolProvider cuyo `module` ya estaba registrado, THE ToolRegistry SHALL reemplazar el provider previo de ese módulo de modo que solo el último provider registrado para ese módulo permanezca activo.
7. IF el `id` solicitado es `null`, vacío o no corresponde a ninguna AssistantTool registrada, THEN THE ToolRegistry SHALL devolver `null` sin lanzar ninguna excepción.
8. WHILE `access.enabledModules` está vacío, THE ToolRegistry SHALL devolver una lista de tools disponibles con exactamente 0 elementos.
9. WHEN el ToolRegistry calcula las tools disponibles para un `AssistantAccessContext`, THE ToolRegistry SHALL devolver la lista sin entradas duplicadas por `id` de tool.

### Requirement 3: Distinción estricta entre Hechos e Inferencias y ausencia de causalidad

**User Story:** Como usuario que toma decisiones, quiero distinguir los datos objetivos de las interpretaciones y que nunca se afirme causalidad, para confiar en la información del asistente.

#### Acceptance Criteria

1. WHEN una tool produce un ToolResult, THE AssistantTool SHALL representar cada dato objetivo como un Fact que contenga un `label` no vacío y un `value`, sin texto interpretativo, comparativo ni causal.
2. WHERE un ToolResult incluye inferencias, THE AssistantTool SHALL asignar a cada Inference un `kind` dentro del conjunto {correlation, pattern, hypothesis}.
3. IF un ToolResult incluye una Inference cuyo `kind` no pertenece al conjunto {correlation, pattern, hypothesis}, THEN THE AssistantTool SHALL rechazar el ToolResult y devolver un error que indique el valor de `kind` inválido, sin emitir la respuesta.
4. WHERE un ToolResult incluye inferencias, THE AssistantTool SHALL asignar a cada Inference un `confidence` dentro del conjunto {baja, media, alta}.
5. WHERE un ToolResult incluye inferencias, THE AssistantTool SHALL proveer para cada Inference un `basedOn` con entre 1 y el número total de Facts del mismo ToolResult, cuyos elementos coincidan exactamente con el `label` de Facts presentes en ese mismo ToolResult.
6. IF una Inference tiene un `basedOn` vacío o contiene algún elemento que no coincide con el `label` de un Fact presente en el mismo ToolResult, THEN THE AssistantTool SHALL rechazar el ToolResult y devolver un error que indique la referencia inválida, sin emitir la respuesta.
7. WHEN el LocalRuleEngine redacta el texto de respuesta a partir de un ToolResult, THE LocalRuleEngine SHALL presentar los Hechos y las Inferencias en secciones separadas e identificadas, sin usar términos que afirmen causalidad (por ejemplo "causa", "provoca", "debido a", "porque").
8. WHEN el FactsPanel muestra las fuentes consultadas, THE FactsPanel SHALL mostrar los Hechos y las Inferencias en áreas visualmente separadas y mostrar junto a cada Inferencia su etiqueta de `confidence` con uno de los valores {baja, media, alta}.

### Requirement 4: Consulta de resumen del día

**User Story:** Como operador, quiero pedir el resumen de pedidos de hoy, para conocer el estado actual de la operación.

#### Acceptance Criteria

1. WHEN el usuario solicita el resumen del día, THE PedidosToolProvider SHALL devolver un ToolResult con Facts del conteo de pedidos nuevos, en curso, entregados y programados correspondientes al día calendario actual.
2. WHERE el usuario invoca la tool de resumen del día, THE PedidosToolProvider SHALL requerir la capacidad `orders.read`.
3. WHEN la tool de resumen del día produce su ToolResult, THE PedidosToolProvider SHALL incluir una ToolSource del módulo `pedidos` que describa los getters consultados.
4. IF el usuario invoca la tool de resumen del día sin la capacidad `orders.read`, THEN THE PedidosToolProvider SHALL rechazar la solicitud sin devolver Facts y SHALL indicar un error de capacidad insuficiente.
5. IF no existen pedidos para el día calendario actual, THEN THE PedidosToolProvider SHALL devolver un ToolResult con cada conteo (nuevos, en curso, entregados, programados) igual a 0.

### Requirement 5: Consulta de ventas por periodo

**User Story:** Como analista, quiero consultar el volumen y monto de ventas en un rango de fechas, para evaluar el desempeño comercial.

#### Acceptance Criteria

1. WHEN el usuario solicita las ventas de un periodo con fecha desde y fecha hasta, THE PedidosToolProvider SHALL devolver un ToolResult con un Fact de volumen (conteo entero de pedidos) y un Fact de monto (suma total) correspondientes a los pedidos cuya fecha esté dentro del rango, incluyendo los límites desde y hasta.
2. WHERE el usuario invoca la tool de ventas por periodo, THE PedidosToolProvider SHALL requerir la capacidad `orders.read`.
3. THE PedidosToolProvider SHALL registrar en el `period` de los Facts de ventas el rango de fechas consultado (fecha desde y fecha hasta).
4. IF la fecha desde es posterior a la fecha hasta, THEN THE PedidosToolProvider SHALL rechazar la solicitud sin devolver Facts y SHALL indicar un error de rango de fechas inválido.
5. IF no existen pedidos dentro del rango de fechas consultado, THEN THE PedidosToolProvider SHALL devolver un ToolResult con volumen igual a 0 y monto igual a 0.

### Requirement 6: Consulta del canal líder

**User Story:** Como analista, quiero saber cuál canal de origen lidera los pedidos, para entender la procedencia de la demanda.

#### Acceptance Criteria

1. WHEN el usuario solicita el canal líder, THE PedidosToolProvider SHALL devolver un ToolResult con un Fact que identifique el canal de origen con el mayor conteo de pedidos entre los orígenes disponibles.
2. WHERE el usuario invoca la tool de canal líder, THE PedidosToolProvider SHALL requerir la capacidad `orders.read`.
3. WHEN la tool de canal líder produce su ToolResult, THE PedidosToolProvider SHALL incluir una ToolSource del módulo `pedidos` que describa los getters consultados.
4. IF dos o más canales empatan en el mayor conteo de pedidos, THEN THE PedidosToolProvider SHALL identificar en el Fact todos los canales empatados con ese conteo máximo.
5. IF no existen pedidos con canal de origen registrado, THEN THE PedidosToolProvider SHALL devolver un ToolResult cuyo Fact indique que no hay canal líder disponible.

### Requirement 7: Consulta del tiempo promedio de ciclo

**User Story:** Como responsable de operaciones, quiero conocer el tiempo promedio de ciclo de los pedidos, para monitorear la eficiencia.

#### Acceptance Criteria

1. WHEN el usuario solicita el tiempo promedio de ciclo, THE PedidosToolProvider SHALL devolver un ToolResult con un Fact del tiempo promedio de ciclo de los pedidos entregados, expresado en minutos enteros (redondeado al minuto más cercano).
2. WHERE el usuario invoca la tool de tiempo de ciclo, THE PedidosToolProvider SHALL requerir la capacidad `orders.read`.
3. WHEN la tool de tiempo de ciclo produce su ToolResult, THE PedidosToolProvider SHALL incluir una ToolSource del módulo `pedidos` que describa los getters consultados.
4. IF no existen pedidos entregados con los que calcular el promedio, THEN THE PedidosToolProvider SHALL devolver un ToolResult cuyo Fact indique que el tiempo promedio de ciclo no está disponible.

### Requirement 8: Consulta de pedidos cancelados

**User Story:** Como responsable de operaciones, quiero saber cuántos pedidos están cancelados, para dimensionar las pérdidas.

#### Acceptance Criteria

1. WHEN el usuario solicita los pedidos cancelados, THE PedidosToolProvider SHALL devolver un ToolResult con un Fact del conteo entero de pedidos en estado cancelado.
2. WHERE el usuario invoca la tool de cancelados, THE PedidosToolProvider SHALL requerir la capacidad `orders.read`.
3. WHEN la tool de cancelados produce su ToolResult, THE PedidosToolProvider SHALL incluir una ToolSource del módulo `pedidos` que describa los getters consultados.
4. IF no existen pedidos en estado cancelado, THEN THE PedidosToolProvider SHALL devolver un ToolResult con el conteo igual a 0.

### Requirement 9: Consulta de hora pico

**User Story:** Como responsable de operaciones, quiero identificar la hora de mayor volumen de un día, para planificar recursos.

#### Acceptance Criteria

1. WHEN el usuario solicita la hora pico de un día, THE PedidosToolProvider SHALL devolver un ToolResult con un Fact que identifique la franja horaria (de 00 a 23) con el mayor conteo de pedidos de ese día.
2. WHERE el usuario invoca la tool de hora pico, THE PedidosToolProvider SHALL requerir la capacidad `orders.read`.
3. WHEN la tool de hora pico produce su ToolResult, THE PedidosToolProvider SHALL incluir una ToolSource del módulo `pedidos` que describa los getters consultados.
4. IF dos o más franjas horarias empatan en el mayor conteo de pedidos, THEN THE PedidosToolProvider SHALL identificar en el Fact la franja más temprana entre las empatadas.
5. IF no existen pedidos para el día consultado, THEN THE PedidosToolProvider SHALL devolver un ToolResult cuyo Fact indique que no hay hora pico disponible.

### Requirement 10: Comparación de desempeño entre días

**User Story:** Como analista, quiero comparar el desempeño entre días, para detectar patrones de variación.

#### Acceptance Criteria

1. WHEN el usuario solicita la comparación entre dos días, THE PedidosToolProvider SHALL devolver un ToolResult con Facts del conteo de entregados y del volumen de cada uno de los dos días comparados.
2. WHERE la variación relativa de volumen entre los dos días comparados es distinta de cero, THE PedidosToolProvider SHALL emitir una Inference con `kind="pattern"` y `confidence` dentro del conjunto {baja, media, alta}, cuyo `basedOn` referencie los `label` de los Facts de volumen comparados.
3. WHERE el usuario invoca la tool de comparación entre días, THE PedidosToolProvider SHALL requerir la capacidad `orders.read`.
4. IF no existen pedidos en alguno de los dos días comparados, THEN THE PedidosToolProvider SHALL devolver un ToolResult con el volumen de ese día igual a 0 y sin emitir Inference de patrón.

### Requirement 11: Diagnóstico heurístico de desempeño sin causalidad

**User Story:** Como responsable de operaciones, quiero un diagnóstico de desempeño que combine varios indicadores, para identificar factores de riesgo sin conclusiones causales infundadas.

#### Acceptance Criteria

1. WHEN el usuario solicita el diagnóstico de desempeño, THE PedidosToolProvider SHALL devolver un ToolResult con Facts del volumen de los últimos 7 días, del tiempo promedio de ciclo en minutos y del conteo de pedidos urgentes actuales.
2. IF el número de pedidos urgentes es mayor que cero y el tiempo promedio de ciclo supera el umbral de urgencia configurado, THEN THE PedidosToolProvider SHALL emitir una Inference con `kind="correlation"` y `confidence` dentro del conjunto {baja, media, alta} que relacione el ciclo alto con los pedidos urgentes pendientes, sin afirmar causalidad.
3. WHERE el diagnóstico emite una Inference, THE PedidosToolProvider SHALL asignarle un `basedOn` no vacío cuyos elementos referencien los `label` de Facts presentes en el mismo ToolResult.
4. WHERE el usuario invoca la tool de diagnóstico, THE PedidosToolProvider SHALL requerir la capacidad `orders.read`.
5. IF no se cumple la condición de urgencia y ciclo alto, THEN THE PedidosToolProvider SHALL devolver un ToolResult con los Facts del diagnóstico y sin emitir Inference.

### Requirement 12: Manejo de ausencia de tools por permisos insuficientes

**User Story:** Como usuario sin permisos suficientes, quiero recibir una respuesta clara cuando el asistente no tiene herramientas disponibles, para entender por qué no puede ayudarme.

#### Acceptance Criteria

1. IF las tools disponibles para el `AssistantAccessContext` tienen exactamente 0 elementos, THEN THE LocalRuleEngine SHALL responder con un AssistantMessage que indique que no hay herramientas disponibles para los permisos actuales.
2. WHEN el LocalRuleEngine responde por ausencia de tools, THE LocalRuleEngine SHALL devolver un AssistantMessage sin evidencia adjunta.
3. WHEN el LocalRuleEngine responde por ausencia de tools, THE AssistantStore SHALL establecer `pensando=false` y mantener el hilo de conversación utilizable para nuevos envíos.

### Requirement 13: Manejo de intención no reconocida

**User Story:** Como usuario, quiero orientación cuando el asistente no entiende mi pregunta, para reformularla hacia algo que sí pueda responder.

#### Acceptance Criteria

1. IF el texto de la pregunta no coincide con ninguna tool disponible, THEN THE LocalRuleEngine SHALL responder con un AssistantMessage de ayuda que enumere hasta 20 de las tools disponibles según el contexto.
2. WHEN el LocalRuleEngine responde por intención no reconocida, THE LocalRuleEngine SHALL devolver un AssistantMessage sin evidencia adjunta.
3. WHEN el texto de la pregunta coincide exactamente con una tool disponible, THE LocalRuleEngine SHALL ejecutar esa tool y adjuntar su ToolResult como evidencia del AssistantMessage.
4. IF el texto de la pregunta coincide con más de una tool disponible, THEN THE LocalRuleEngine SHALL ejecutar la tool de mayor prioridad según un orden determinista y adjuntar su ToolResult como evidencia.

### Requirement 14: Manejo de fallo al ejecutar una tool

**User Story:** Como usuario, quiero que el asistente se recupere de un fallo interno sin perder la conversación, para poder reintentar.

#### Acceptance Criteria

1. IF la ejecución de una tool lanza un error, THEN THE AssistantStore SHALL establecer un mensaje de error legible y establecer `pensando=false`.
2. WHEN la ejecución de una tool falla, THE AssistantStore SHALL conservar el historial de mensajes existente previo al fallo.
3. WHEN el usuario envía una nueva pregunta después de un error, THE AssistantStore SHALL limpiar el error previo antes de procesar la nueva pregunta.
4. IF la ejecución de una tool falla, THEN THE AssistantStore SHALL descartar cualquier ToolResult parcial y no adjuntarlo como evidencia de ningún mensaje.

### Requirement 15: Capacidad de acceso y su integración con navegación y guards

**User Story:** Como administrador, quiero controlar el acceso al asistente con una capacidad propia, para gestionar quién puede usarlo.

#### Acceptance Criteria

1. THE roles.store SHALL definir la capacidad `assistant.use` con su etiqueta legible y agruparla bajo un grupo de capacidades "Asistente".
2. THE roles.store SHALL incluir la capacidad `assistant.use` entre las capacidades del rol `admin_tienda`.
3. THE operadores.store SHALL definir una sección para la ruta `/asistente` asociada a la capacidad `assistant.use`.
4. IF el usuario carece de la capacidad `assistant.use`, THEN THE CapabilityGuard SHALL impedir el acceso a la ruta `/asistente` sin renderizar la vista del Asistente.
5. WHERE el usuario tiene la capacidad `assistant.use`, THE AppSidebar SHALL mostrar el ítem de menú del Asistente; en caso contrario SHALL ocultarlo.
6. WHEN se construye el `AssistantAccessContext`, THE adaptador de sesión SHALL derivarlo de `sessionStore.accessContext`, exponiendo los módulos habilitados y una verificación de capacidades que retorna un booleano.
7. IF `sessionStore.accessContext` no está disponible o no otorga capacidades, THEN THE adaptador de sesión SHALL construir un `AssistantAccessContext` sin módulos habilitados y cuya verificación de capacidades retorna falso para toda capacidad.

### Requirement 16: Independencia de dominio del núcleo del asistente

**User Story:** Como arquitecto, quiero que el núcleo del asistente sea agnóstico de dominio, para poder evolucionar módulos y motores sin acoplar la lógica central.

#### Acceptance Criteria

1. THE núcleo `src/assistant` SHALL excluir de su grafo de imports directos y transitivos cualquier store de dominio y el SessionStore.
2. THE PedidosToolProvider SHALL ser el único archivo del código fuente que importe `pedidosStore`.
3. THE ToolRegistry SHALL orquestar providers y aplicar el filtro de intersección módulos ∩ capacidades sin importar stores de dominio.
4. WHEN una tool declara su `id`, THE AssistantTool SHALL usar un `id` con el prefijo de su `module` y único entre las tools registradas.
5. IF dos tools registradas declaran el mismo `id`, THEN THE ToolRegistry SHALL considerar esa condición un conflicto y no exponer entradas duplicadas por `id`.

### Requirement 17: Intercambiabilidad del motor del asistente

**User Story:** Como arquitecto, quiero poder sustituir el motor del asistente sin tocar la UI ni el registro de tools, para migrar a un LLM remoto en el futuro.

#### Acceptance Criteria

1. THE AssistantStore SHALL depender solo de la interfaz `AssistantEngine` y no de la implementación concreta `LocalRuleEngine`.
2. WHERE se sustituye la implementación de `AssistantEngine` inyectada en el AssistantStore, THE AssistantStore SHALL conservar su firma pública (nombres, parámetros y tipos de retorno) sin cambios.
3. WHERE se sustituye la implementación de `AssistantEngine`, THE UI SHALL permanecer sin cambios en sus archivos fuente.
4. THE Asistente SHALL implementar en el MVP únicamente los niveles de tool `query` y `analyze`, y ningún otro nivel.
5. IF una tool declara un `level` distinto de `query` o `analyze`, THEN THE Asistente SHALL rechazar su ejecución en el MVP.

### Requirement 18: Arranque y registro de providers

**User Story:** Como desarrollador, quiero que el asistente registre sus proveedores de tools al arrancar, para que las tools estén disponibles cuando el usuario pregunte.

#### Acceptance Criteria

1. WHEN el módulo del asistente arranca, THE bootstrap SHALL registrar el `PedidosToolProvider` en el `ToolRegistry` antes de aceptar la primera pregunta.
2. WHEN el LocalRuleEngine procesa una pregunta, THE LocalRuleEngine SHALL usar la instancia del `ToolRegistry` inicializada por el bootstrap.
3. IF el usuario envía una pregunta antes de que el bootstrap haya completado el registro de providers, THEN THE LocalRuleEngine SHALL responder como en el caso de ausencia de tools disponibles.
