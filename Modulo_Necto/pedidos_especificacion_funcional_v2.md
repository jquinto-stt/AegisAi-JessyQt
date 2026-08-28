# Documentación Técnica y Funcional — Módulo de Pedidos (Necto)

*Basado en las notas de diseño de `pedidos_reestructuracion.md`. Este documento las reemplaza como referencia de implementación.*

> **Cómo usar este documento:** es la fuente única de verdad para diseñar e implementar el módulo de Pedidos. Sustituye cualquier conversación o nota informal previa. Si durante la implementación aparece una ambigüedad que no está resuelta aquí, debe consultarse — no asumirse ni improvisarse.

## Índice

1. Resumen ejecutivo
2. Actores y permisos
3. Arquitectura de información
4. Ciclo de vida del pedido
5. Pantallas — Sección Operación
6. Pantallas — Sección Gestión
7. Modelo de datos de referencia
8. Reglas de negocio y sinergia
9. Notificaciones y alertas
10. Comportamiento en condiciones degradadas
11. Manejo de errores por componente
12. Matriz de funcionalidades asignadas
13. Árbol de navegación final
14. Supuestos y decisiones tomadas para eliminar ambigüedad
15. Preguntas abiertas
16. Glosario

---

## 1. Resumen ejecutivo

**Contexto.** El módulo de Pedidos se diseñó originalmente con el cliente final como actor principal (hacer un pedido, ver su pedido, interactuar con el restaurante). El requerimiento real es otro: el actor principal es **el restaurante** — su personal operativo y su administrador — que necesita gestionar, controlar y analizar todos los pedidos que recibe desde distintos canales.

**Objetivo del rediseño.** Reorientar el módulo alrededor de dos contextos funcionales complementarios, dentro de la misma plataforma Necto:

- **⚡ Operación** — gestión del pedido en tiempo real ("¿qué está pasando ahora?").
- **📊 Gestión** — administración, configuración y análisis del ecosistema de pedidos ("¿cómo mejorar el proceso?").

**Principio de diseño.** No son dos aplicaciones separadas. Es **un solo módulo de Pedidos**, dentro de una sola plataforma Necto, con dos secciones conectadas por un flujo continuo de datos y decisiones: Gestión configura → Operación ejecuta → Gestión analiza → Gestión ajusta la configuración → el ciclo se repite.

---

## 2. Actores y permisos

| Actor | Roles típicos | Objetivo principal | Acceso |
|---|---|---|---|
| **Usuario operativo** | Caja, cocina, encargado de pedidos | Procesar correctamente los pedidos entrantes | Sección **Operación** únicamente |
| **Supervisor de turno** | Jefe de turno, encargado de sala | Monitorear operación en curso, intervenir en incidencias | Sección **Operación** + vistas de solo lectura de GE-01 y GE-06 |
| **Administrador** | Dueño, gerente, administrador | Configurar, controlar y analizar el proceso completo | Sección **Operación** + Sección **Gestión** completa |

**Notas:**

- El administrador puede operar pedidos directamente (p. ej. cubrir caja); el usuario operativo no tiene acceso a Gestión.
- El supervisor de turno puede gestionar incidencias (OP-06) y consultar la carga del turno en curso (GE-06 en modo solo lectura), pero no puede modificar configuraciones.
- Los permisos se asignan por rol en el módulo de Usuarios de Necto (fuera del alcance de este documento). Esta especificación asume que el control de acceso ya existe y el módulo de Pedidos simplemente lo respeta.

---

## 3. Arquitectura de información

```
NECTO
└── PEDIDOS
     ├── ⚡ OPERACIÓN   (tiempo real)
     └── 📊 GESTIÓN     (administración)
```

Flujo continuo entre secciones — ninguna funciona de forma aislada:

```
📊 GESTIÓN  ──configura reglas, catálogo, turnos──▶  ⚡ OPERACIÓN
     ▲                                                     │
     │                                                     │ genera pedidos
     └──────────────── analiza datos y métricas ◀──────────┘
     │
     ▼
mejora la configuración ──▶ vuelve a alimentar Operación
```

---

## 4. Ciclo de vida del pedido

Estado único y canónico. (El material original usa "ENTREGADO" y "FINALIZADO" como sinónimos en distintos puntos; aquí se unifican en un solo estado terminal — ver sección 14.)

```
NUEVO ──Confirmar──▶ CONFIRMADO ──Enviar a preparación──▶ EN_PREPARACION ──Marcar listo──▶ LISTO ──Entregar/Finalizar──▶ FINALIZADO
  │
  └──Rechazar──▶ RECHAZADO

(NUEVO | CONFIRMADO | EN_PREPARACION) ──Cancelar (con motivo)──▶ CANCELADO
```

| Estado | Tipo | Descripción |
|---|---|---|
| `NUEVO` | Inicial | Pedido recibido, pendiente de confirmación |
| `CONFIRMADO` | Activo | Aceptado, pendiente de enviar a preparación |
| `EN_PREPARACION` | Activo | En proceso de elaboración |
| `LISTO` | Activo | Preparación terminada, pendiente de entrega |
| `FINALIZADO` | Terminal | Entregado al cliente |
| `RECHAZADO` | Terminal | No aceptado por el restaurante |
| `CANCELADO` | Terminal | Cancelado en cualquier punto, con motivo registrado |

**Reglas de transición:**

- El sistema no debe permitir transiciones fuera de las definidas en este diagrama. Cualquier intento de transición inválida debe fallar con un error explícito visible al usuario (no silencioso).
- El motivo de cancelación es obligatorio; el campo no puede quedar vacío.
- Los estados terminales (`FINALIZADO`, `RECHAZADO`, `CANCELADO`) son inmutables: un pedido en estado terminal no puede cambiar de estado.
- Un pedido `LISTO` no debe volver a `EN_PREPARACION`; si hay un problema en esta etapa, debe cancelarse con motivo "corrección operativa".

**Caso de borde — pedido programado sin capacidad:** si un pedido recurrente llega a OP-01 como `NUEVO` y GE-06 indica capacidad reducida, el sistema **no lo cancela automáticamente**. Lo ingresa igual, pero genera una incidencia en OP-06 de tipo `capacidad_insuficiente` para que un operativo o supervisor tome la decisión. (Ver también sección 10.)

---

## 5. Pantallas — Sección Operación

### OP-01 — Centro de Pedidos
- **Usuario:** Operativo / Supervisor / Administrador
- **Modo de presentación:** Pantalla principal de Operación (tab **"Pedidos en vivo"**)
- **Objetivo:** ver y actuar sobre todos los pedidos que requieren atención, en tiempo real.
- **Qué muestra:** contadores por estado (Nuevos, En preparación, Listos, Total del día); tablero por columnas de estado con tarjetas de pedido; buscador; ícono de notificaciones/incidencias (campana). Cada tarjeta muestra: número de pedido, tiempo transcurrido, resumen de productos, canal de origen, indicador de urgencia (🟢/🟡/🔴 según OP-03) y una acción contextual según su estado.
- **Acciones:**
  - Aceptar o rechazar un pedido `NUEVO` directamente desde la tarjeta (sin abrir detalle).
  - Marcar como entregado un pedido en estado `LISTO`.
  - Abrir el detalle completo (ver OP-02).
- **Reglas:**
  - Los pedidos nuevos se notifican en tiempo real (ver sección 9).
  - Los contadores se recalculan automáticamente ante cualquier cambio de estado.
  - Los pedidos generados por interpretación de IA (OP-05) ingresan a la columna "Nuevos" con la etiqueta **"Interpretado por IA"** y requieren confirmación manual, independientemente de si la confirmación automática (GE-04) está activa. *Razón: la automatización opera sobre pedidos ya validados; la validación de la interpretación IA es un paso previo.*
  - Si la confirmación automática (GE-04) está activa, los pedidos `NUEVO` que cumplan las condiciones configuradas se confirman automáticamente y pasan a `CONFIRMADO` sin intervención manual — excepto los de origen IA (regla anterior).
- **Conexiones:** OP-02 (detalle), OP-05 (origen conversacional), OP-06 (incidencias).

---

### OP-02 — Detalle del Pedido
- **Usuario:** Operativo / Supervisor / Administrador
- **Modo de presentación:** Vista secundaria (panel lateral o modal) lanzada desde OP-01 — no es una pantalla independiente.
- **Objetivo:** revisar y actuar sobre un pedido específico con toda la información disponible.
- **Qué muestra:** cliente, canal de origen, hora de creación, productos y cantidades, observaciones, tiempo estimado (editable si el pedido está activo), estado actual, historial de eventos del pedido (log de transiciones).
- **Acciones** (el sistema solo habilita las válidas según el estado actual, sección 4):
  - `NUEVO` → Confirmar / Rechazar
  - `CONFIRMADO` → Enviar a preparación
  - `EN_PREPARACION` → Marcar listo
  - `LISTO` → Entregar / Finalizar
  - Cualquier estado activo → Cancelar (requiere motivo; campo obligatorio)
  - Si el pedido viene de interpretación IA: además, Aprobar interpretación / Corregir productos / Modificar cantidades (funciones de OP-05).
- **Reglas:**
  - El tiempo estimado editado aquí debe reflejarse de inmediato en OP-03.
  - El log de eventos es de solo lectura; registra quién realizó cada acción y en qué momento.
  - En estados terminales, el detalle es de solo lectura (no se habilita ninguna acción).
- **Conexiones:** OP-01, OP-03, OP-05.

---

### OP-03 — Preparación y Tiempos
- **Usuario:** Operativo (cocina / producción) / Supervisor
- **Modo de presentación:** Pantalla independiente (tab **"Preparación"**)
- **Objetivo:** monitorear en tiempo real los tiempos de todos los pedidos activos. Es el centro de producción.
- **Qué muestra:** lista de pedidos activos con cronómetro, tiempo estimado, tiempo restante y prioridad, agrupados por indicador de urgencia:
  - 🟢 A tiempo
  - 🟡 Próximo a vencer
  - 🔴 Retrasado
- **Acciones:** cambiar el estado del pedido (mismas transiciones que OP-02); ver alertas de retraso; ajustar el tiempo estimado de un pedido puntual.
- **Reglas de umbral (parámetro configurable — ver sección 15):** por defecto:
  - 🟢 si el tiempo restante supera el 20 % del tiempo estimado.
  - 🟡 si el tiempo restante está entre 0 % y 20 % del tiempo estimado.
  - 🔴 si el tiempo estimado ya se superó.
  - Estos valores son una propuesta inicial; deben confirmarse antes de implementar.
  - Cuando un pedido pasa a 🔴, se genera automáticamente una incidencia en OP-06 de tipo `pedido_retrasado`.
- **Conexiones:** OP-01, OP-02, OP-06, GE-07 (analítica de tiempos).

---

### OP-04 — Pedidos Programados
- **Usuario:** Operativo / Supervisor / Administrador
- **Modo de presentación:** Pantalla independiente (tab **"Programados"**)
- **Objetivo:** anticipar la operación mostrando pedidos futuros y recurrentes.
- **Qué muestra:** agrupación por Hoy / Mañana / Recurrentes, con conteo; por pedido: hora programada, cliente, productos, origen (recurrencia o pedido puntual).
- **Acciones:** consultar un pedido futuro; confirmar programación anticipada; preparar anticipadamente.
- **Reglas:**
  - Los pedidos recurrentes configurados en GE-05 se generan automáticamente según su frecuencia.
  - Al llegar su horario, el pedido pasa a OP-01 como `NUEVO` — o directamente a `CONFIRMADO` si la confirmación automática de GE-04 aplica y el pedido no es de origen IA.
  - Si al momento de generarse el pedido programado hay capacidad reducida (GE-06), el pedido se ingresa igualmente pero genera una incidencia en OP-06 (ver sección 4, caso de borde).
- **Conexiones:** GE-05 (configuración de recurrencia), OP-01, OP-06.

---

### OP-05 — Interpretación de Pedidos por IA
- **Usuario:** Operativo (validación) / sistema (IA)
- **Modo de presentación:** Integrada en el flujo de OP-01/OP-02 — no es un tab aparte.
- **Objetivo:** convertir mensajes en lenguaje natural (p. ej. WhatsApp) en pedidos estructurados y procesables.
- **Qué muestra:** mensaje original junto a la interpretación estructurada propuesta (productos, cantidades) y su nivel de confianza expresado como etiqueta visual (Alta / Media / Baja).
- **Acciones:**
  - Aprobar interpretación → el pedido pasa a `NUEVO` en OP-01, etiquetado "Interpretado por IA".
  - Corregir productos / Modificar cantidades → el operativo ajusta la interpretación antes de aprobar.
  - Rechazar interpretación → el mensaje se descarta; se puede ingresar el pedido manualmente.
- **Reglas:**
  - Si la confianza de interpretación es **Baja** (umbral a definir, sección 15) o si la IA detecta productos que no existen en el catálogo activo (GE-03), el pedido se marca para **revisión manual obligatoria** y genera una incidencia en OP-06 de tipo `error_interpretacion`.
  - Un pedido con origen IA nunca se confirma automáticamente por GE-04, incluso si la confianza es Alta. La aprobación humana es siempre obligatoria en esta etapa.
  - Si el servicio de IA no está disponible (ver sección 11), el mensaje se encola para revisión manual sin bloquear la operación.
- **Conexiones:** OP-01, OP-06, GE-03.

---

### OP-06 — Incidencias Operativas
- **Usuario:** Operativo / Supervisor / Administrador
- **Modo de presentación:** Panel global, accesible desde el ícono de campana (🔔) en toda la sección Operación — no es un tab.
- **Objetivo:** centralizar problemas que requieren atención inmediata.
- **Qué muestra:** lista de incidencias activas con tipo, severidad, pedido relacionado (si aplica) y hora de generación.

| Tipo de incidencia | Generada por | Severidad |
|---|---|---|
| `pedido_retrasado` | OP-03 (🔴) | Alta |
| `producto_no_disponible` | GE-03 (al recibir pedido con producto inactivo) | Media |
| `error_interpretacion` | OP-05 (confianza baja o producto no encontrado) | Media |
| `modificacion_solicitada` | Manual (operativo o cliente) | Baja |
| `pedido_cancelado` | Cualquier cancelación | Baja |
| `pedido_incompleto` | OP-01 (faltan datos al ingresar) | Media |
| `capacidad_insuficiente` | GE-06 / OP-04 (pedido programado sin capacidad) | Alta |
| `servicio_ia_no_disponible` | Sistema (falla de IA) | Media |

- **Acciones:** ver el pedido relacionado (abre OP-02); marcar como resuelta (requiere quién resolvió y cómo).
- **Reglas:**
  - Las incidencias de severidad Alta generan también una notificación push (ver sección 9).
  - Una incidencia marcada como resuelta queda en el historial de la misma — no se elimina.
  - El recuento de incidencias activas se muestra en el ícono de campana en todo momento.
- **Conexiones:** OP-01, OP-02, OP-03, OP-05, GE-03, GE-06.

---

## 6. Pantallas — Sección Gestión

### GE-01 — Resumen
- **Usuario:** Administrador / Supervisor (solo lectura)
- **Modo de presentación:** Pantalla de entrada de Gestión (tab **"Resumen"**)
- **Objetivo:** vista ejecutiva del estado del día.
- **Qué muestra:**
  - Métricas del día en curso: total de pedidos, completados, en proceso, cancelados, rechazados.
  - Tiempo promedio de preparación (comparado con el promedio histórico de los últimos 7 días).
  - Distribución por canal de origen (si hay más de un canal activo).
  - Incidencias del día: total generadas, pendientes de resolver.
  - Alerta si hay pedidos 🔴 activos en Operación en este momento.
- **Acciones:** navegar a Historial para ver pedidos del día con detalle; navegar a Analítica para comparar con otros períodos; navegar a Incidencias para ver el detalle operativo.
- **Reglas:**
  - Se alimenta en tiempo real de los eventos generados en Operación.
  - Las métricas se calculan desde las 00:00 del día actual hasta el momento de consulta.
  - Si no hay pedidos en el día, muestra estado vacío con acceso directo a Catálogo y Configuración.
- **Conexiones:** recibe datos de todas las pantallas OP-*; enlaza a GE-02 y GE-07.

---

### GE-02 — Historial
- **Usuario:** Administrador
- **Modo de presentación:** Pantalla independiente (tab **"Historial"**)
- **Objetivo:** consultar e investigar pedidos pasados.
- **Qué muestra:** buscador, filtros (fecha, sucursal, canal, estado, cliente) y listado de resultados (número, estado final, fecha, cliente/canal).
- **Acciones:** buscar; filtrar; abrir el detalle de un pedido histórico (variante de solo lectura de OP-02, incluyendo el log de eventos); investigar incidencias asociadas al pedido.
- **Reglas:**
  - El historial cubre todos los pedidos en estado terminal (`FINALIZADO`, `CANCELADO`, `RECHAZADO`).
  - Los pedidos activos no aparecen aquí — están en OP-01.
  - Por defecto, muestra los últimos 30 días. El rango máximo de consulta es a definir (pregunta abierta).
- **Conexiones:** OP-06 (incidencias del pedido).

---

### GE-03 — Catálogo Inteligente
- **Usuario:** Administrador
- **Modo de presentación:** Pantalla independiente (tab **"Catálogo"**)
- **Objetivo:** administrar la oferta de productos del restaurante.
- **Qué muestra:** listado de productos por categoría con disponibilidad, precio y etiquetas IA; panel de recomendaciones IA (ejemplos: "producto con alta demanda", "agotado frecuentemente", "sugerencia de promoción").
- **Acciones:** crear, editar, activar/desactivar producto; editar disponibilidad; consultar historial de demanda de un producto.
- **Reglas:**
  - Al desactivar un producto, deja de estar disponible para pedidos nuevos en OP-01/OP-05 **de inmediato** (regla de sinergia, sección 8).
  - Si un pedido entrante incluye un producto desactivado, se genera una incidencia `producto_no_disponible` en OP-06 y el pedido se marca para revisión manual.
  - El campo `precio` es obligatorio para crear un producto.
- **Conexiones:** OP-01, OP-05, GE-07.

---

### GE-04 — Automatizaciones
- **Usuario:** Administrador
- **Modo de presentación:** Pantalla independiente (tab **"Automatizaciones"**), con una sub-pestaña interna **"Recurrencias"** (GE-05).
- **Objetivo:** configurar las reglas de confirmación automática de pedidos.
- **Qué muestra:** activador general de la automatización y constructor de condiciones. Regla base:

```
Confirmar automáticamente SI:
  → productos_disponibles = verdadero
  Y horario_activo = verdadero
  Y capacidad_disponible = verdadero
```

- **Acciones:** activar/desactivar la automatización global; configurar cada condición; definir excepciones (p. ej. excluir ciertos canales o rangos de monto).
- **Reglas:**
  - Una vez activa, la regla se ejecuta en Operación sobre pedidos `NUEVO` que la cumplan — excepto pedidos con origen IA (ver OP-05).
  - `capacidad_disponible` se alimenta dinámicamente de GE-06: si la capacidad operativa es reducida, esta condición pasa a `falso` y la automatización se pausa temporalmente hasta que se restaure la capacidad.
  - Los pedidos que no cumplen las condiciones no se rechazan: permanecen en `NUEVO` para acción manual.
- **Conexiones:** OP-01 (ejecución), GE-06 (condición de capacidad).

---

### GE-05 — Pedidos Recurrentes
- **Usuario:** Administrador
- **Modo de presentación:** Sub-sección dentro de GE-04 (misma pantalla, pestaña interna **"Recurrencias"**) — no es un tab de primer nivel.
- **Objetivo:** configurar pedidos que se generan automáticamente de forma periódica.
- **Qué muestra:** listado de recurrencias activas/pausadas/canceladas; por recurrencia: cliente/empresa, frecuencia, horario, cantidad estimada y estado.
- **Acciones:** crear, modificar, pausar, cancelar una recurrencia.
- **Reglas:**
  - Al llegar el horario programado, el sistema genera el pedido automáticamente en OP-04.
  - Una recurrencia pausada no genera pedidos mientras esté en ese estado.
  - Al cancelar una recurrencia, los pedidos ya generados (en cualquier estado activo) no se afectan.
- **Conexiones:** OP-04, OP-01.

---

### GE-06 — Integración con Turnos
- **Usuario:** Administrador / Supervisor (solo lectura)
- **Modo de presentación:** Pantalla independiente (tab **"Turnos"**)
- **Objetivo:** relacionar la capacidad de personal disponible con la carga de pedidos.
- **Qué muestra:** turno actual, personal asignado, estado de capacidad (disponible / limitada / no disponible), carga actual de pedidos, estimación de pedidos que puede absorber el turno en este momento.
- **Acciones:** consultar capacidad y su relación con la carga de pedidos. (La creación y edición de turnos vive en el módulo Turnos externo; aquí solo se consulta y se relaciona con la carga de pedidos.)
- **Reglas:**
  - Si la capacidad operativa es **limitada**, el sistema aumenta automáticamente el `tiempo_estimado` por defecto usado en OP-02/OP-03, y la condición `capacidad_disponible` de GE-04 pasa a `falso`.
  - Esta condición se restaura automáticamente cuando el módulo Turnos reporta capacidad normal.
  - Si la integración con el módulo Turnos no está disponible (ver sección 11), esta pantalla muestra el estado como "sin datos de turno" y la condición `capacidad_disponible` se mantiene en su último valor conocido.
- **Conexiones:** OP-03, GE-04, módulo externo Turnos.

---

### GE-07 — Analítica
- **Usuario:** Administrador
- **Modo de presentación:** Pantalla independiente (tab **"Analítica"**)
- **Objetivo:** analizar el rendimiento del proceso de pedidos en un período seleccionado.
- **Qué muestra:**
  - Pedidos por período (día / semana / mes).
  - Productos más solicitados (top 10).
  - Tiempo promedio de preparación por período.
  - Tasa de cancelaciones y sus motivos más frecuentes.
  - Distribución de pedidos por canal de origen.
  - Demanda por hora del día (mapa de calor).
  - Rendimiento operativo: % de pedidos entregados a tiempo vs retrasados.
- **Acciones:** seleccionar rango de fechas; exportar los datos a CSV (pendiente de confirmación técnica).
- **Reglas:**
  - El período por defecto es los últimos 30 días.
  - Los datos se basan en pedidos en estado terminal (histórico); los pedidos activos no se incluyen.
- **Conexiones:** recibe datos de todas las pantallas OP-* vía Historial y Resumen.

---

## 7. Modelo de datos de referencia

No es un esquema de base de datos definitivo — es un vocabulario de entidades compartido para que la implementación sea consistente. Debe adaptarse a las convenciones ya existentes en el backend de Necto.

**Pedido**
`id`, `numero`, `cliente_id`, `canal_origen` (enum: ver pregunta abierta sobre canales), `sucursal_id`, `productos` (lista de `{producto_id, nombre, cantidad, precio_unitario}`), `observaciones`, `hora_creacion`, `hora_confirmacion`, `hora_finalizacion`, `tiempo_estimado_min`, `estado` (enum de la sección 4), `origen_ia` (bool), `confianza_interpretacion` (enum: Alta/Media/Baja — si `origen_ia = true`), `recurrencia_id` (opcional), `hora_programada` (opcional), `log_eventos` (lista de `{estado, usuario_id, timestamp}`)

**Producto**
`id`, `nombre`, `categoria`, `disponible` (bool), `precio`, `destacado_ia` (bool)

**Cliente**
`id`, `nombre`, `canal_preferido`, `historial_pedidos_ids`

**ReglaAutomatizacion**
`id`, `activa` (bool), `condiciones` (`productos_disponibles`, `horario_activo`, `capacidad_disponible`), `excepciones` (lista de condiciones que excluyen un pedido de la automatización), `accion` = confirmar_automaticamente

**Recurrencia**
`id`, `cliente_id`, `frecuencia` (diaria/semanal/mensual), `dia_semana` (si frecuencia = semanal), `horario`, `cantidad_estimada`, `estado` (activa/pausada/cancelada)

**Turno** *(referenciado, no propiedad de este módulo)*
`id`, `personal_asignado`, `horario`, `capacidad` (disponible/limitada/no_disponible)

**Incidencia**
`id`, `tipo` (enum: ver tabla de OP-06), `pedido_id`, `severidad` (Alta/Media/Baja), `estado` (abierta/resuelta), `hora_generacion`, `hora_resolucion`, `resuelto_por_usuario_id`, `notas_resolucion`

---

## 8. Reglas de negocio y sinergia

Estas son las reglas que conectan ambas secciones. Sin ellas, Operación y Gestión quedarían como dos módulos aislados.

1. **Producto desactivado:** Administrador desactiva un producto en GE-03 → efecto inmediato: OP-01/OP-05 dejan de aceptar ese producto en pedidos nuevos.
2. **Recurrencia programada:** Administrador configura una recurrencia en GE-05 → el sistema genera automáticamente el pedido en OP-04 cuando llega su horario, sin intervención manual.
3. **Retrasos recurrentes:** OP-03 muestra varios pedidos en 🔴 → señal visible en GE-07 → el administrador puede ajustar turnos (GE-06) o reglas (GE-04) → el cambio se refleja de vuelta en Operación.
4. **Confirmación automática:** Administrador activa la regla en GE-04 → efecto: pedidos `NUEVO` que cumplan la condición pasan automáticamente a `CONFIRMADO` en OP-01, sin acción manual (excepto pedidos de origen IA).
5. **Capacidad de turnos:** GE-06 detecta capacidad limitada → efecto: aumenta el `tiempo_estimado` por defecto en OP-02/OP-03, y `capacidad_disponible` de GE-04 pasa a `falso` mientras dure.
6. **Ciclo completo:** Administrador crea y activa un producto en GE-03 → disponible en OP-01/OP-05 → cliente lo pide por algún canal → se procesa en Operación hasta `FINALIZADO` → la venta alimenta métricas de GE-01 y GE-07.

---

## 9. Notificaciones y alertas

Esta sección define qué eventos generan notificaciones, a quién, y por qué canal.

| Evento | Destinatario | Canal | Prioridad |
|---|---|---|---|
| Pedido `NUEVO` entrante | Operativo / Supervisor | Push en app + sonido | Alta |
| Pedido pasa a 🔴 en preparación | Operativo / Supervisor | Push en app | Alta |
| Incidencia de severidad Alta abierta | Supervisor / Administrador | Push en app | Alta |
| Pedido programado a 30 min de su hora | Operativo | Aviso en OP-04 | Media |
| Confirmación automática ejecutada | Solo visible en log | — | Informativa |
| IA no disponible (ver sección 11) | Operativo | Aviso en OP-01 | Media |
| Producto desactivado mientras hay pedidos activos con ese producto | Administrador | Aviso en GE-03 | Media |

**Reglas generales:**

- Las notificaciones de prioridad Alta no pueden silenciarse durante un turno activo.
- El ícono de campana (🔔) en Operación siempre muestra el conteo de incidencias activas sin resolver, visible para todos los roles con acceso a Operación.
- Las notificaciones informativas solo se registran en el log; no generan alertas visuales.

---

## 10. Comportamiento en condiciones degradadas

Define cómo debe comportarse el sistema cuando algún componente externo no está disponible.

| Condición | Comportamiento esperado |
|---|---|
| **Pérdida de conexión en tiempo real** | El sistema muestra el último estado conocido con un aviso de "Sin conexión — datos pueden estar desactualizados". Las acciones de cambio de estado se deshabilitan hasta restablecer la conexión. |
| **Servicio de IA no disponible** | Los mensajes conversacionales (WhatsApp) se encolan en una bandeja de "Mensajes pendientes" dentro de OP-01. El operativo puede ingresar el pedido manualmente. Se genera una incidencia `servicio_ia_no_disponible`. |
| **Módulo Turnos no disponible** | GE-06 muestra "sin datos de turno". La condición `capacidad_disponible` de GE-04 se mantiene en su último valor conocido (no se asume disponibilidad ni indisponibilidad). El operativo recibe un aviso en OP-01. |
| **Pedido recurrente que no puede generarse** | Se registra el intento fallido y se genera una incidencia `capacidad_insuficiente` o `error_generacion_recurrencia`. El administrador ve el fallo en GE-05. |

---

## 11. Manejo de errores por componente

Define el comportamiento esperado ante errores específicos, para que la implementación tenga criterios claros.

| Componente | Error | Comportamiento |
|---|---|---|
| **OP-01 / Confirmación** | Transición de estado inválida | Error visible al usuario: "Esta acción no está disponible para el estado actual del pedido." No se modifica el estado. |
| **OP-02 / Cancelación** | Campo motivo vacío | El botón de confirmar cancelación permanece deshabilitado hasta que el campo tenga contenido. |
| **OP-05 / IA** | Servicio IA no responde en N segundos (timeout a definir) | Se muestra: "No se pudo interpretar el mensaje automáticamente." El operativo puede ingresar el pedido manualmente. Se genera incidencia. |
| **GE-03 / Catálogo** | Intento de desactivar un producto con pedidos activos que lo incluyen | El sistema solicita confirmación con el aviso: "Este producto aparece en X pedidos activos. ¿Continuar?" y permite proceder o cancelar. |
| **GE-04 / Automatización** | Condiciones incoherentes (p. ej. horario activo pero sin turnos configurados) | El sistema muestra una advertencia al guardar, pero permite activar la regla. |
| **GE-06 / Turnos** | Módulo externo no responde | Ver sección 10. |

---

## 12. Matriz de funcionalidades asignadas

| Funcionalidad | Rol en Operación | Rol en Gestión | Pantallas |
|---|---|---|---|
| Catálogo inteligente | Consulta disponibilidad al procesar pedidos | Administra productos y recomendaciones IA | OP-01, OP-05 / GE-03 |
| IA para interpretar pedidos | Ejecuta la interpretación; requiere aprobación humana | Catálogo activo valida los productos interpretados | OP-05 / GE-03 |
| Pedidos recurrentes y programados | Recibe y muestra los pedidos generados al llegar su horario | Configura frecuencia, horario, cliente | OP-04 / GE-05 |
| Confirmación automática | Ejecuta sin intervención manual (excepto origen IA) | Configura condiciones y excepciones | OP-01 / GE-04 |
| Integración con Turnos | Consulta capacidad para ajustar tiempos estimados | Administra relación personal–capacidad–carga | OP-03 / GE-06 |
| Panel de preparación y tiempos | Función principal: monitoreo en tiempo real | Analiza métricas de tiempo derivadas | OP-03 / GE-07 |
| Incidencias operativas | Gestión inmediata de problemas activos | Analítica muestra frecuencia e impacto histórico | OP-06 / GE-07 |

---

## 13. Árbol de navegación final

```
PEDIDOS
│
├── ⚡ OPERACIÓN
│   ├── Pedidos en vivo         (OP-01 + detalle OP-02 + interpretación IA OP-05 integrada)
│   ├── Preparación             (OP-03)
│   ├── Programados             (OP-04)
│   └── 🔔 Incidencias          (OP-06 — panel global, no tab)
│
└── 📊 GESTIÓN
    ├── Resumen                 (GE-01)
    ├── Historial               (GE-02)
    ├── Catálogo                (GE-03)
    ├── Automatizaciones        (GE-04)
    │      └── Recurrencias     (GE-05 — pestaña interna)
    ├── Turnos                  (GE-06)
    └── Analítica               (GE-07)
```

Operación: 3 tabs + 1 panel global.
Gestión: 6 tabs (con una sub-pestaña interna en Automatizaciones).
Ninguna pantalla del inventario original se pierde: todas están ubicadas dentro de este árbol como tab, vista secundaria, panel o sub-pestaña.

---

## 14. Supuestos y decisiones tomadas para eliminar ambigüedad

- Necto es **una sola plataforma** con control de acceso por rol, no dos aplicaciones separadas (esto ya era explícito en el material original).
- Se unificaron "ENTREGADO" y "FINALIZADO" — usados como sinónimos en el material original — en un único estado terminal: `FINALIZADO`.
- Se agregó `CANCELADO` como estado terminal explícito: se menciona en métricas pero no formaba parte del ciclo de vida principal original.
- Se definieron umbrales por defecto para los indicadores 🟢🟡🔴 de OP-03, ya que el original no daba valores exactos. Quedan marcados como parámetro a confirmar.
- Se agregó el campo `confianza_interpretacion` como enum (Alta/Media/Baja) en lugar de un valor numérico abierto, para simplificar la presentación en OP-05 sin pre-definir umbrales exactos.
- Se estableció que un pedido de **origen IA nunca se confirma automáticamente**, incluso si la confianza es Alta. Esta decisión elimina el riesgo de que un error de interpretación genere un pedido erróneo sin revisión humana.
- Se resolvió que GE-05 (Recurrencias) es una sub-pestaña de GE-04 (Automatizaciones), y que OP-05 (Interpretación IA) y OP-06 (Incidencias) no son tabs propios sino integraciones/paneles.
- Se agregó `precio_unitario` en la lista de productos dentro del modelo de datos de Pedido, además del `precio` en Producto: es necesario para registrar el precio al momento del pedido, que puede cambiar con el tiempo.
- Se agregó un rol intermedio **Supervisor de turno** para cubrir el caso — frecuente operativamente — de alguien que necesita ver el resumen del día y gestionar incidencias sin tener acceso a la configuración completa.
- Se agregó `log_eventos` al modelo de Pedido para soportar la auditoría de transiciones de estado, mencionada implícitamente en el material original ("quién hizo qué y cuándo").
- No se define aquí stack tecnológico, backend, mecanismo de tiempo real, ni el modelo de datos real del módulo Turnos — se asume que Turnos ya existe como módulo externo de Necto.

---

## 15. Preguntas abiertas

Esto es lo que no puede resolverse sin confirmación explícita. Si la implementación llega a alguno de estos puntos antes de tener respuesta, debe detenerse y consultar — no asumir ni improvisar.

| # | Pregunta | Impacto si no se resuelve |
|---|---|---|
| 1 | ¿Qué canales de origen reales debe soportar el sistema (WhatsApp, web, app propia, presencial, otros)? | Afecta el enum `canal_origen`, los filtros de GE-02 y la distribución por canal de GE-07. |
| 2 | ¿Necto maneja múltiples sucursales por cuenta de restaurante? | Afecta el campo `sucursal_id` y todos los filtros de Historial y Analítica. |
| 3 | ¿Cuál es el stack tecnológico de Necto (frontend, backend, base de datos, mecanismo de tiempo real)? | Necesario antes de implementar cualquier pantalla de Operación. |
| 4 | ¿El módulo de Turnos ya existe? ¿Cuál es su modelo de datos y su mecanismo de integración? | Necesario para implementar GE-06 y la condición `capacidad_disponible` de GE-04. |
| 5 | ¿Qué nivel de confianza (en términos de la escala Alta/Media/Baja) activa la revisión manual obligatoria en OP-05? ¿Media y Baja, o solo Baja? | Afecta cuántos pedidos IA llegan automáticamente a `NUEVO` vs. cuántos pasan por revisión. |
| 6 | ¿Los umbrales de tiempo 🟢🟡🔴 de OP-03 deben ser globales o configurables por producto/categoría? ¿En qué pantalla de Gestión vivirían si son configurables? | Afecta el diseño de GE-04 o GE-03, y el campo `tiempo_estimado_min` del modelo. |
| 7 | ¿Cuál es el rango máximo de consulta en GE-02 (Historial) y GE-07 (Analítica)? | Afecta el diseño de la UI (pickers de fecha) y el rendimiento de las consultas. |
| 8 | ¿La exportación a CSV en GE-07 es un requerimiento confirmado, o es opcional para una segunda versión? | Afecta el alcance de la primera entrega. |

---

## 16. Glosario

- **Necto** — plataforma de gestión para restaurantes.
- **Pedido** — unidad central del módulo; una orden realizada por un cliente a través de cualquier canal.
- **Operación** — sección del módulo enfocada en el ciclo de vida en tiempo real de los pedidos.
- **Gestión** — sección del módulo enfocada en administración, configuración y análisis del proceso de pedidos.
- **Sinergia** — relación bidireccional de datos y decisiones entre Operación y Gestión (sección 8).
- **Origen IA** — pedido cuyo contenido fue interpretado a partir de un mensaje en lenguaje natural por el componente OP-05.
- **Estado terminal** — estado que no admite transición posterior: `FINALIZADO`, `RECHAZADO`, `CANCELADO`.
- **Capacidad disponible** — condición evaluada por GE-06: verdadera cuando el turno activo tiene suficiente personal para absorber la carga de pedidos actual.
- **Incidencia** — problema operativo registrado en OP-06 que requiere atención; puede generarse automáticamente o manualmente.
- **Recurrencia** — configuración en GE-05 que genera pedidos periódicos automáticamente según una frecuencia y horario definidos.
