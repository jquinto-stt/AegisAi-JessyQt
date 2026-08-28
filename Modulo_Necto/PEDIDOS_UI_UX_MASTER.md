# PEDIDOS — MASTER UI/UX DESIGN SPECIFICATION
## Necto — Operación + Gestión

**Documento:** `PEDIDOS_UI_UX_MASTER.md`  
**Propósito:** Especificación maestra para diseñar las interfaces del módulo Pedidos de Necto.  
**Audiencia primaria:** IA de diseño/UI, diseñador UX/UI y equipo de producto.  
**Estado:** Base de diseño.  
**Fuente funcional:** `pedidos_especificacion_funcional_v2.md`.  
**Referencia conceptual:** separación entre una experiencia operativa tipo RappiAliados y una experiencia administrativa tipo Portal Partners, adaptada a Necto.

---

# 0. INSTRUCCIÓN PRINCIPAL PARA LA IA DE DISEÑO

Diseña el módulo **Pedidos de Necto** como un único producto con dos contextos funcionales claramente diferenciados:

1. **⚡ Operación** — ejecutar y monitorear pedidos en tiempo real.
2. **📊 Gestión** — administrar, configurar y analizar el ecosistema de pedidos.

NO diseñes dos aplicaciones independientes.

La relación conceptual es:

```text
GESTIÓN
Configura / administra / analiza
        ↓
OPERACIÓN
Ejecuta / monitorea / resuelve
        ↓
DATOS
        ↓
GESTIÓN
Analiza resultados y ajusta
        ↓
OPERACIÓN
```

La experiencia debe sentirse como una plataforma profesional para restaurantes, no como una copia visual de Rappi.

Usa RappiAliados/Partners únicamente como **referencia conceptual de arquitectura y separación de responsabilidades**. No copies branding, textos, componentes visuales, colores, layouts ni identidad de Rappi.

---

# 1. OBJETIVO DEL MÓDULO

El actor principal del módulo es el restaurante.

El sistema debe permitir:

- recibir pedidos;
- procesarlos;
- confirmar o rechazar;
- controlar preparación;
- monitorear tiempos;
- gestionar pedidos programados;
- interpretar pedidos provenientes de IA;
- consultar historial;
- administrar catálogo;
- configurar automatizaciones;
- gestionar recurrencias;
- consultar integración con Turnos;
- analizar desempeño;
- detectar incidencias;
- conectar decisiones administrativas con la operación real.

El principio funcional central es:

> **Operación responde “¿qué está pasando ahora?”**  
> **Gestión responde “¿cómo administramos y mejoramos el proceso?”**

---

# 2. PRINCIPIOS UX

## 2.1 Operación primero

La sección Operación debe estar optimizada para velocidad.

El usuario operativo normalmente:

- está trabajando;
- tiene poco tiempo;
- necesita identificar prioridades;
- necesita actuar con pocos clics;
- no debe navegar por configuraciones complejas.

Priorizar:

1. Pedidos nuevos.
2. Pedidos retrasados.
3. Pedidos próximos a vencer.
4. Pedidos que requieren intervención.
5. Acciones primarias.

---

## 2.2 Gestión primero piensa, después configura

Gestión debe permitir:

- comprender el estado del negocio;
- configurar reglas;
- administrar catálogo;
- administrar automatizaciones;
- consultar Turnos;
- revisar historial;
- analizar resultados.

Debe ser más analítica y menos urgente.

---

## 2.3 Una sola fuente de verdad

El usuario no debe sentir que Operación y Gestión son sistemas separados.

Cuando una configuración cambia en Gestión, la consecuencia debe poder verse en Operación.

Ejemplo:

```text
Gestión
Automatización:
“Confirmar automáticamente pedidos elegibles”
        ↓
Regla activa
        ↓
Operación
Entra pedido elegible
        ↓
Pedido confirmado automáticamente
        ↓
Registro/log
        ↓
Gestión
Resultado visible en métricas
```

---

## 2.4 La interfaz debe explicar consecuencias

Cuando una configuración afecte la operación, comunicarlo.

Ejemplo:

> “Esta regla afectará los pedidos nuevos que cumplan las condiciones configuradas.”

Evitar configuraciones silenciosas.

---

## 2.5 No inventar funcionalidades

La IA de diseño debe respetar esta especificación.

Si un elemento no está definido:

- no inventar una funcionalidad;
- no inventar una integración;
- no inventar un campo obligatorio;
- no inventar estados;
- no inventar acciones críticas.

Puede proponer una mejora visual, pero no cambiar la lógica funcional.

Si una decisión funcional es indispensable y no está definida, marcarla como:

`PENDIENTE DE DEFINICIÓN`

---

# 3. ROLES Y PERMISOS

## 3.1 Usuario operativo

Ejemplos:

- caja;
- cocina;
- encargado de pedidos.

Acceso:

- Operación.

Objetivo:

> Procesar correctamente los pedidos entrantes.

---

## 3.2 Supervisor de turno

Objetivo:

> Monitorear la operación e intervenir en incidencias.

Acceso:

- Operación;
- vistas de solo lectura de Resumen;
- vistas de solo lectura de Turnos.

No debe acceder a configuración administrativa completa.

---

## 3.3 Administrador

Ejemplos:

- dueño;
- gerente;
- administrador.

Acceso:

- Operación;
- Gestión completa.

Objetivo:

> Configurar, controlar y analizar el proceso completo.

---

# 4. ARQUITECTURA GENERAL

```text
NECTO
│
└── PEDIDOS
    │
    ├── ⚡ OPERACIÓN
    │   │
    │   ├── Pedidos en vivo
    │   ├── Preparación
    │   ├── Programados
    │   │
    │   ├── [Panel] Detalle del pedido
    │   ├── [Panel] Incidencias
    │   └── [Flujo] Interpretación IA
    │
    └── 📊 GESTIÓN
        │
        ├── Resumen
        ├── Historial
        ├── Catálogo
        ├── Automatizaciones
        │   └── Recurrencias
        ├── Turnos
        └── Analítica
```

## 4.1 Operación

3 tabs principales:

1. Pedidos en vivo.
2. Preparación.
3. Programados.

Elementos secundarios:

- Detalle del pedido;
- Interpretación IA;
- Incidencias.

---

## 4.2 Gestión

6 tabs principales:

1. Resumen.
2. Historial.
3. Catálogo.
4. Automatizaciones.
5. Turnos.
6. Analítica.

Recurrencias es una sub-sección interna de Automatizaciones.

---

# 5. SHELL / ESTRUCTURA COMPARTIDA

Toda la experiencia debe compartir un shell consistente.

## Header

Debe considerar:

- logo/producto Necto;
- módulo actual: Pedidos;
- sección actual: Operación o Gestión;
- búsqueda cuando corresponda;
- notificaciones;
- perfil/usuario;
- contexto de sucursal si aplica.

La existencia de múltiples sucursales está pendiente de confirmación funcional. No asumir selector de sucursal obligatorio hasta que se confirme.

---

## Navegación

La navegación debe hacer evidente la diferencia:

```text
📦 PEDIDOS

⚡ OPERACIÓN
  Pedidos en vivo
  Preparación
  Programados

📊 GESTIÓN
  Resumen
  Historial
  Catálogo
  Automatizaciones
  Turnos
  Analítica
```

Debe existir una forma clara de cambiar entre Operación y Gestión para los usuarios que tengan permisos.

El usuario operativo no debe ver navegación administrativa que no puede utilizar.

---

# 6. ESTADOS GLOBALES DE UI

Todas las pantallas deben contemplar:

## Loading

Mostrar skeletons en:

- tablas;
- tarjetas;
- métricas;
- listas;
- paneles.

Evitar loaders de pantalla completa salvo operaciones realmente bloqueantes.

---

## Empty state

Debe explicar:

1. qué está vacío;
2. por qué;
3. qué puede hacer el usuario.

Ejemplo:

> “No tienes pedidos activos en este momento.”

---

## Error

Debe ser accionable.

Ejemplo:

> “No pudimos actualizar el pedido. Intenta nuevamente.”

Con acción:

`Reintentar`

---

## Sin conexión

Si se pierde conexión en tiempo real:

- mostrar último estado conocido;
- mostrar aviso:
  `Sin conexión — los datos pueden estar desactualizados`;
- deshabilitar cambios de estado hasta recuperar conexión.

---

## Alertas

Las alertas de alta prioridad deben ser visualmente distinguibles.

La campana de Operación debe mostrar el conteo de incidencias activas sin resolver.

---

# 7. CICLO DE VIDA DEL PEDIDO

Usar este flujo como base:

```text
NUEVO
  ↓
CONFIRMADO
  ↓
EN PREPARACIÓN
  ↓
LISTO
  ↓
FINALIZADO
```

Estado terminal adicional:

```text
CANCELADO
```

No utilizar “ENTREGADO” y “FINALIZADO” como estados distintos: se considera un único estado terminal `FINALIZADO`.

---

# 8. ⚡ OPERACIÓN

# OP-01 — PEDIDOS EN VIVO

## Objetivo

Ser el centro operativo principal.

Pregunta que responde:

> “¿Qué pedidos requieren atención ahora?”

## Usuarios

- Operativo;
- Supervisor;
- Administrador.

## Prioridad

MUY ALTA.

Esta debe ser probablemente la pantalla inicial de Operación.

---

## Estructura

```text
┌─────────────────────────────────────────────┐
│ PEDIDOS EN VIVO             🔔   Buscar     │
├─────────────────────────────────────────────┤
│                                             │
│  NUEVOS   CONFIRMADOS   PREPARANDO   LISTOS │
│    3           4             5          2    │
│                                             │
├─────────────────────────────────────────────┤
│ Filtros                                     │
│ Estado · Canal · Prioridad · Tiempo         │
├─────────────────────────────────────────────┤
│                                             │
│ Pedido cards / lista                       │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Información de cada pedido

Mostrar como mínimo:

- número del pedido;
- cliente;
- productos resumidos;
- cantidad;
- canal de origen;
- hora de creación;
- tiempo transcurrido;
- tiempo estimado;
- estado;
- indicador de prioridad;
- indicador de retraso cuando corresponda;
- indicador de origen IA cuando corresponda.

---

## Acciones

Según estado:

### NUEVO

- Ver detalle;
- Confirmar;
- Rechazar.

### CONFIRMADO

- Ver detalle;
- pasar a preparación.

### EN PREPARACIÓN

- Ver detalle;
- marcar listo.

### LISTO

- Ver detalle;
- finalizar.

No mostrar acciones incompatibles con el estado actual.

---

## Ordenamiento recomendado

Por defecto:

1. Nuevos.
2. Retrasados.
3. Próximos a vencer.
4. Resto por antigüedad.

No esconder pedidos retrasados detrás de filtros.

---

## Incidencias

El icono de notificaciones debe permitir acceder al panel de incidencias.

Las incidencias de alta prioridad deben destacar.

---

## Pedido generado por IA

Si el pedido proviene de interpretación IA:

Mostrar badge:

`IA`

o equivalente visual.

Nunca asumir que puede confirmarse automáticamente.

---

# OP-02 — DETALLE DEL PEDIDO

Debe abrirse preferentemente como:

- panel lateral amplio;
- drawer;
- modal grande;
- o vista dedicada si el detalle es muy complejo.

Preferencia UX:

> abrir desde OP-01 sin perder contexto.

---

## Información

### Identificación

- número de pedido;
- estado;
- hora de creación;
- canal;
- cliente.

### Productos

Para cada producto:

- nombre;
- cantidad;
- personalizaciones/observaciones si existen;
- precio si el modelo lo contempla.

### Operación

- tiempo estimado;
- tiempo transcurrido;
- estado actual;
- historial de cambios.

### Acciones

Dependen del estado.

---

## Confirmación

Al confirmar:

- ejecutar transición;
- actualizar interfaz inmediatamente;
- registrar evento.

---

## Rechazo

Debe requerir motivo.

No permitir confirmar rechazo si el motivo está vacío.

---

## Cancelación

Si se permite desde el contexto correspondiente:

- solicitar motivo;
- validar campo;
- registrar evento.

---

## Auditoría

Mostrar cuando corresponda:

- quién hizo la acción;
- qué acción;
- cuándo.

---

# OP-03 — PREPARACIÓN Y TIEMPOS

## Objetivo

Ser el centro de producción.

Pregunta:

> “¿Qué estamos preparando y qué está en riesgo?”

---

## Organización

Agrupar visualmente:

```text
🟢 A TIEMPO

🟡 PRÓXIMO A VENCER

🔴 RETRASADO
```

Los colores exactos forman parte del sistema visual de Necto; no usar color como único indicador.

---

## Cada pedido debe mostrar

- número;
- cliente;
- estado;
- cronómetro;
- tiempo estimado;
- tiempo transcurrido;
- prioridad;
- indicador de riesgo.

---

## Integración con Turnos

La operación puede consultar información de capacidad para ajustar tiempos estimados.

No diseñar aquí una administración completa de Turnos.

La administración pertenece a GE-06.

---

## Acciones

- cambiar estado;
- abrir detalle;
- priorizar visualmente;
- atender retraso/incidencia.

---

# OP-04 — PROGRAMADOS

## Objetivo

Gestionar pedidos que tienen una ejecución futura.

Pregunta:

> “¿Qué pedidos vienen y cuándo debemos prepararlos?”

---

## Información

Cada pedido programado:

- número;
- cliente;
- fecha;
- hora programada;
- productos;
- estado;
- tiempo restante;
- incidencias si existen.

---

## Estados visuales

- programado;
- próximo;
- listo para entrar en operación;
- ejecutado;
- fallido cuando corresponda.

---

## Alertas

Cuando un pedido programado se acerque a su hora:

Mostrar aviso al operativo.

El requerimiento funcional define una alerta cuando está a 30 minutos de su hora.

---

# OP-05 — INTERPRETACIÓN IA

No crear como tab independiente.

Debe integrarse dentro del flujo de OP-01 / OP-02.

---

## Caso

Un mensaje conversacional, por ejemplo desde WhatsApp, necesita convertirse en pedido.

La IA interpreta:

- productos;
- cantidades;
- observaciones;
- información relevante.

---

## Mostrar

```text
MENSAJE ORIGINAL

↓ 

INTERPRETACIÓN IA

Producto
Cantidad
Observación

↓ 

REVISIÓN HUMANA

[Editar]

[Confirmar pedido]
```

---

## Confianza

Usar:

- Alta;
- Media;
- Baja.

La interfaz debe comunicar que la confianza es una estimación de interpretación, no una garantía.

---

## Regla crítica

Un pedido de origen IA:

> **NUNCA se confirma automáticamente.**

Incluso con confianza Alta.

Debe existir revisión humana.

---

## Si IA falla

Mostrar:

> “No se pudo interpretar el mensaje automáticamente.”

Permitir:

`Ingresar pedido manualmente`

Registrar incidencia.

---

# OP-06 — INCIDENCIAS

No crear como tab principal.

Debe funcionar como:

- panel global;
- drawer;
- centro de alertas.

---

## Información

Cada incidencia:

- tipo;
- severidad;
- pedido relacionado;
- fecha/hora;
- estado;
- responsable si aplica;
- descripción.

---

## Severidad

Como mínimo:

- Alta;
- Media;
- Baja.

---

## Alta prioridad

Debe ser inmediatamente reconocible.

Las alertas de alta prioridad no se silencian durante un turno activo.

---

# 9. 📊 GESTIÓN

# GE-01 — RESUMEN

## Objetivo

Dashboard administrativo del módulo Pedidos.

Pregunta:

> “¿Cómo está funcionando el negocio de pedidos?”

---

## Usuarios

- Administrador;
- Supervisor en solo lectura.

---

## Estructura

```text
GESTIÓN

Resumen
────────────────────────────────

KPIs
Ventas
Pedidos
Tiempo promedio
Cancelaciones
Incidencias

────────────────────────────────

Tendencias

────────────────────────────────

Alertas / oportunidades

────────────────────────────────

Accesos rápidos
```

---

## KPI

Usar solamente métricas definidas por la especificación.

Posibles categorías:

- volumen de pedidos;
- tiempos;
- cancelaciones;
- errores;
- disponibilidad;
- rendimiento.

No inventar métricas financieras si no están definidas.

---

## Conexión con Operación

Desde un problema detectado:

`Ver pedidos afectados`

debe llevar al contexto operativo correspondiente cuando tenga sentido.

---

# GE-02 — HISTORIAL

## Objetivo

Consultar pedidos pasados.

Pregunta:

> “¿Qué ocurrió?”

---

## Componentes

- búsqueda;
- rango de fechas;
- filtros;
- tabla/lista;
- detalle.

---

## Filtros potenciales definidos por el modelo

- estado;
- canal;
- fecha;
- cliente;
- sucursal si existe.

La existencia de múltiples sucursales está pendiente de confirmación.

---

## Tabla

Columnas recomendadas:

- pedido;
- fecha/hora;
- cliente;
- canal;
- estado;
- tiempo;
- incidencias.

---

## Detalle

Debe reutilizar patrones de OP-02.

No crear dos diseños diferentes para el mismo concepto de pedido.

---

# GE-03 — CATÁLOGO

## Objetivo

Administrar los productos que participan en los pedidos.

---

## Acciones

- crear producto;
- editar producto;
- cambiar precio;
- activar;
- desactivar.

---

## Estado

Cada producto debe comunicar:

- activo;
- inactivo.

---

## Desactivación

Si un producto está asociado a pedidos activos:

Mostrar advertencia.

Ejemplo conceptual:

> “Este producto tiene pedidos activos asociados. Desactivarlo no modificará los pedidos existentes.”

No inventar comportamiento adicional.

---

## Relación con Operación

Catálogo define disponibilidad.

Operación consume esa disponibilidad.

```text
GESTIÓN
Catálogo
Producto activo
       ↓
OPERACIÓN
Producto disponible
       ↓
Pedido
```

---

# GE-04 — AUTOMATIZACIONES

## Objetivo

Crear y administrar reglas que afectan la operación.

Esta es una de las pantallas más importantes para representar la filosofía de Necto.

---

## Estructura

```text
AUTOMATIZACIONES

[Activas] [Inactivas]

Regla 1
Estado: Activa
Condiciones...
Acción...

Regla 2
Estado: Activa
...
```

---

## Cada automatización debe mostrar

- nombre;
- estado;
- condición;
- acción;
- última ejecución si existe;
- impacto o contexto si está definido;
- editar;
- activar/desactivar.

---

## Confirmación automática

Ejemplo:

```text
SI
pedido cumple condiciones

ENTONCES
confirmar automáticamente
```

La interfaz debe separar claramente:

- condición;
- acción;
- estado de la regla.

---

## Sinergia

```text
GE-04
Configurar regla
       ↓
Regla guardada
       ↓
OP-01
Pedido entra
       ↓
Regla evaluada
       ↓
Acción ejecutada
       ↓
Log
```

---

# GE-05 — RECURRENCIAS

Es una sub-pestaña o sub-sección de Automatizaciones.

---

## Objetivo

Administrar pedidos recurrentes/programados.

---

## Mostrar

- recurrencia;
- cliente/contexto;
- frecuencia;
- próxima ejecución;
- estado;
- incidencias;
- acción de editar/desactivar cuando corresponda.

---

## Estados

- activa;
- pausada/inactiva si la lógica lo contempla;
- próxima;
- error.

No inventar más estados.

---

## Error de generación

Si una recurrencia no puede generarse:

- registrar intento;
- generar incidencia;
- mostrar motivo cuando esté disponible;
- informar al administrador.

---

# GE-06 — TURNOS

## Objetivo

Administrar/consultar relación entre:

- personal;
- capacidad;
- carga;
- operación.

---

## Usuarios

- Administrador: edición/gestión;
- Supervisor: solo lectura.

---

## Mostrar

- turno;
- personal;
- capacidad;
- carga;
- disponibilidad;
- impacto en pedidos.

---

## Relación con Operación

```text
GESTIÓN
Turnos
   ↓
Capacidad disponible
   ↓
OPERACIÓN
Tiempo estimado
```

---

## Si Turnos no está disponible

Mostrar:

> “Sin datos de turno.”

No asumir automáticamente disponibilidad o indisponibilidad.

Mantener último valor conocido cuando la regla funcional lo indique.

---

# GE-07 — ANALÍTICA

## Objetivo

Convertir datos operativos en información para decisiones.

Pregunta:

> “¿Qué está funcionando y qué debemos mejorar?”

---

## Categorías

- pedidos;
- tiempos;
- cancelaciones;
- errores;
- disponibilidad;
- incidencias;
- canales.

---

## Visualizaciones

Usar:

- KPI;
- gráficos de tendencia;
- distribución;
- comparaciones;
- tablas.

No sobrecargar.

---

## Conexión con Operación

Ejemplo:

```text
Analítica
“Tiempo promedio elevado”

↓
Detalle / filtro

↓
Pedidos afectados

↓
Operación
```

---

# 10. MATRIZ DE SINERGIA

| Funcionalidad | Operación | Gestión |
|---|---|---|
| Pedidos activos | Ejecuta | Consulta resultados |
| Preparación | Monitorea | Analiza tiempos |
| IA | Revisa/ejecuta pedido | Configura contexto cuando corresponda |
| Confirmación automática | Ejecuta | Configura |
| Recurrencias | Ejecuta pedidos generados | Configura |
| Catálogo | Consume disponibilidad | Administra |
| Turnos | Consulta capacidad | Administra |
| Incidencias | Resuelve | Analiza impacto |
| Historial | Consulta contexto | Analiza |
| Analítica | Produce datos | Interpreta |

---

# 11. SISTEMA DE ESTADOS

El diseño debe representar claramente estados sin depender únicamente de color.

Usar combinación de:

- texto;
- icono;
- color;
- posición;
- badge.

Estados principales:

```text
NUEVO
CONFIRMADO
EN PREPARACIÓN
LISTO
FINALIZADO
CANCELADO
```

Riesgo operativo:

```text
A TIEMPO
PRÓXIMO A VENCER
RETRASADO
```

---

# 12. NOTIFICACIONES

Eventos relevantes:

| Evento | Usuario | Prioridad |
|---|---|---|
| Pedido nuevo | Operativo / Supervisor | Alta |
| Pedido pasa a retrasado | Operativo / Supervisor | Alta |
| Incidencia alta | Supervisor / Administrador | Alta |
| Pedido programado próximo | Operativo | Media |
| Confirmación automática | Log | Informativa |
| IA no disponible | Operativo | Media |
| Producto desactivado con pedidos activos | Administrador | Media |

---

# 13. RESPONSIVE

El diseño debe priorizar:

## Desktop

Principal experiencia de Gestión.

Ideal para:

- dashboard;
- tablas;
- configuración;
- analítica;
- catálogo.

## Tablet

Muy importante para Operación.

Debe funcionar bien para:

- cocina;
- caja;
- supervisión.

## Mobile

Debe priorizar:

- alertas;
- pedidos;
- detalle;
- acciones rápidas;
- incidencias.

No intentar replicar literalmente tablas complejas de desktop.

---

# 14. ACCESIBILIDAD

El diseño debe:

- no depender solo del color;
- mantener contraste adecuado;
- tener targets táctiles suficientes;
- tener estados de foco;
- permitir navegación por teclado;
- usar labels claros;
- comunicar errores de forma textual;
- evitar iconos ambiguos sin tooltip/label.

---

# 15. SISTEMA VISUAL

La IA debe respetar el sistema visual existente de Necto si existe.

Si el sistema visual no está disponible, crear una propuesta coherente y profesional, pero separarla claramente como:

`PROPUESTA VISUAL`

No alterar la identidad de Necto sin autorización.

---

## Personalidad visual

Debe comunicar:

- profesional;
- confiable;
- rápido;
- operativo;
- inteligente;
- limpio;
- orientado a datos.

Evitar:

- apariencia excesivamente juguetona;
- exceso de colores;
- dashboards saturados;
- interfaces parecidas a redes sociales;
- ornamentación que dificulte la operación.

---

# 16. COMPONENTES REUTILIZABLES

Crear una librería de componentes específica del módulo.

## Componentes base

- Header;
- Sidebar;
- Tabs;
- Buttons;
- Badges;
- Tooltips;
- Dropdowns;
- Search;
- Date picker;
- Toast;
- Modal;
- Drawer;
- Pagination.

## Componentes Pedidos

- OrderCard;
- OrderList;
- OrderStatus;
- OrderTimer;
- OrderPriority;
- OrderChannel;
- OrderTimeline;
- OrderDetail;
- OrderActionBar;
- PreparationCard;
- IncidentBadge;
- IncidentPanel;
- AIInterpretationPanel;
- ScheduledOrderCard.

## Componentes Gestión

- KPI Card;
- MetricTrend;
- AnalyticsChart;
- DataTable;
- FilterBar;
- AutomationCard;
- RuleBuilder;
- ProductCard;
- ProductStatus;
- RecurrenceCard;
- ShiftCapacityCard.

---

# 17. PATRONES DE INTERACCIÓN

## Confirmar

Siempre que una acción cambie un estado importante:

1. usuario inicia acción;
2. sistema valida;
3. acción se ejecuta;
4. UI refleja nuevo estado;
5. mostrar feedback;
6. registrar evento cuando corresponda.

---

## Rechazar

Debe solicitar motivo.

---

## Desactivar

Para configuración sensible:

- explicar impacto;
- permitir cancelar;
- confirmar.

---

## Cambios automáticos

Cuando una automatización cause un efecto:

mostrar claramente:

> “Esta acción fue realizada automáticamente por la regla [nombre].”

Esto ayuda a diferenciar acción humana vs. acción automática.

---

# 18. AUDITORÍA

Las transiciones importantes deben poder rastrearse.

Ejemplo:

```text
10:42
Pedido #024
NUEVO → CONFIRMADO
Por: María

10:49
CONFIRMADO → EN PREPARACIÓN
Por: Carlos

11:02
EN PREPARACIÓN → LISTO
Por: Sistema
Regla: Confirmación/automatización X
```

No inventar nombres de usuarios ni reglas en producción.

---

# 19. CONDICIONES DEGRADADAS

## Sin conexión

Mostrar último estado conocido.

Acciones de transición deshabilitadas.

---

## IA no disponible

Mensaje:

> “La interpretación automática no está disponible.”

Permitir ingreso manual.

---

## Turnos no disponible

Mostrar estado de datos de Turnos.

No inventar capacidad.

---

## Recurrencia fallida

Mostrar error y crear incidencia.

---

# 20. REGLAS DE DISEÑO DE INFORMACIÓN

## Regla 1

La acción primaria debe ser obvia.

## Regla 2

La información urgente va arriba.

## Regla 3

Los detalles secundarios pueden abrirse bajo demanda.

## Regla 4

No llenar la pantalla con información que el usuario no necesita para su tarea.

## Regla 5

Operación debe sentirse rápida.

## Regla 6

Gestión debe sentirse controlable.

## Regla 7

Los mismos conceptos deben utilizar los mismos patrones visuales.

Ejemplo:

`Pedido #024` debe verse consistentemente igual en:

- Operación;
- Historial;
- Analítica;
- Incidencias.

---

# 21. ORDEN RECOMENDADO DE DISEÑO

La IA debe diseñar en este orden:

## Fase 1 — Foundation

1. Shell Necto;
2. navegación;
3. tipografía;
4. espaciado;
5. estados;
6. botones;
7. badges;
8. cards;
9. tablas;
10. drawers/modals.

## Fase 2 — Operación

11. OP-01 Pedidos en vivo;
12. OP-02 Detalle;
13. OP-03 Preparación;
14. OP-04 Programados;
15. OP-05 IA integrada;
16. OP-06 Incidencias.

## Fase 3 — Gestión

17. GE-01 Resumen;
18. GE-02 Historial;
19. GE-03 Catálogo;
20. GE-04 Automatizaciones;
21. GE-05 Recurrencias;
22. GE-06 Turnos;
23. GE-07 Analítica.

## Fase 4 — Conexiones

Diseñar explícitamente:

- Gestión → Operación;
- Operación → Gestión;
- estados automáticos;
- alertas;
- auditoría;
- errores.

---

# 22. ENTREGABLE ESPERADO DE LA IA DE DISEÑO

Para cada pantalla entregar:

1. Nombre;
2. objetivo;
3. usuario;
4. navegación de entrada;
5. navegación de salida;
6. jerarquía de información;
7. layout;
8. componentes;
9. acciones;
10. estados;
11. loading;
12. empty;
13. error;
14. responsive;
15. permisos;
16. conexiones con otras pantallas.

---

# 23. CRITERIO DE CALIDAD

Un diseño se considera correcto si:

### Operación

Un usuario puede responder rápidamente:

- ¿qué pedidos entraron?
- ¿cuáles requieren acción?
- ¿cuál está retrasado?
- ¿qué debo hacer?
- ¿qué ocurrió con este pedido?

### Gestión

Un administrador puede responder:

- ¿cómo está funcionando el sistema?
- ¿qué está causando problemas?
- ¿qué puedo configurar?
- ¿qué automatizaciones están activas?
- ¿cómo está funcionando el catálogo?
- ¿qué capacidad tengo?
- ¿qué tendencias veo?
- ¿qué debería cambiar?

### Integración

Debe poder entenderse:

> “Lo que configuro en Gestión modifica lo que ocurre en Operación.”

Y:

> “Lo que ocurre en Operación genera información que puedo analizar en Gestión.”

---

# 24. PREGUNTAS ABIERTAS — NO RESOLVER POR CUENTA PROPIA

Estas decisiones siguen pendientes y no deben ser inventadas por la IA:

1. Canales reales soportados:
   - WhatsApp;
   - web;
   - app propia;
   - presencial;
   - otros.

2. Si Necto soporta múltiples sucursales por cuenta.

3. Stack tecnológico.

4. Modelo real del módulo Turnos.

5. Umbral exacto de confianza IA para revisión manual.

6. Umbrales exactos de tiempo para:
   - verde;
   - amarillo;
   - rojo.

7. Si esos umbrales son globales o configurables.

8. Rango máximo de consulta para Historial.

9. Rango máximo de consulta para Analítica.

10. Si exportación CSV es parte de la primera versión.

Si una de estas decisiones afecta directamente el diseño, marcar el punto como:

`PENDIENTE DE DEFINICIÓN`

y diseñar una alternativa neutral.

---

# 25. REGLA FINAL PARA LA IA

No diseñes “pantallas bonitas” de forma aislada.

Diseña un **sistema operativo para el restaurante**.

La experiencia completa debe contar esta historia:

```text
                    NECTO
                      │
                   PEDIDOS
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
      ⚡ OPERACIÓN            📊 GESTIÓN
       “Ahora”                “Mejorar”
          │                       │
          │                       │
       Pedidos                 Resumen
       Preparación             Historial
       Programados             Catálogo
       Incidencias             Automatización
       IA                      Turnos
          │                    Analítica
          │                       │
          └──────────┬────────────┘
                     │
                   DATOS
                     │
                     ▼
                DECISIONES
                     │
                     ▼
                 OPERACIÓN
```

La arquitectura debe sentirse como **una sola plataforma con dos modos de trabajo**:

> **Operación ejecuta. Gestión configura y aprende.**

Ese principio es más importante que cualquier componente individual.

---

# 26. CHECKLIST ANTES DE ENTREGAR CADA PANTALLA

La IA debe verificar:

- [ ] ¿Sé quién utiliza esta pantalla?
- [ ] ¿Sé qué objetivo tiene?
- [ ] ¿La pantalla pertenece a Operación o Gestión?
- [ ] ¿La información más importante está primero?
- [ ] ¿La acción principal es evidente?
- [ ] ¿Los estados están contemplados?
- [ ] ¿Existe loading?
- [ ] ¿Existe empty state?
- [ ] ¿Existe error state?
- [ ] ¿Existe estado sin conexión si aplica?
- [ ] ¿Los permisos son correctos?
- [ ] ¿La pantalla conecta con otras?
- [ ] ¿Estoy reutilizando componentes?
- [ ] ¿Estoy inventando alguna funcionalidad?
- [ ] ¿Estoy copiando visualmente a Rappi?
- [ ] ¿La interfaz funciona en el contexto real de un restaurante?
- [ ] ¿La relación Operación ↔ Gestión queda clara?

---

# 27. DEFINICIÓN RESUMIDA DEL PRODUCTO

**Pedidos de Necto no es solamente una bandeja de pedidos.**

Es un sistema de gestión de pedidos para restaurantes compuesto por dos experiencias:

### ⚡ OPERACIÓN

Centro de trabajo en tiempo real.

> Recibir → confirmar → preparar → monitorear → finalizar → resolver incidencias.

### 📊 GESTIÓN

Centro administrativo y analítico.

> Configurar → administrar → analizar → detectar oportunidades → ajustar.

### 🔄 CICLO

> **Gestión configura → Operación ejecuta → los datos se generan → Gestión analiza → Gestión mejora → Operación vuelve a ejecutar.**

Toda decisión de UX/UI debe reforzar este ciclo.
