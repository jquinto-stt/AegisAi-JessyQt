# 01 — Modelo de negocio y arquitectura de Necto

> No existe documentación de producto en el repo. Esto se deriva del CÓDIGO y de
> `outputs/contrato-arquitectura-acceso-necto.md`, `outputs/analisis-perfiles-necto.md` y `README.md`.
> Marcas: **[CONFIRMADO]** lo demuestra el código · **[NO EXISTE]** no hay nada · **[INFERENCIA]** deducción a validar.

---

## PARTE A — Modelo de negocio

### Qué es Necto
- **[CONFIRMADO]** Plataforma de operación para pequeños negocios, organizada por MÓDULOS. El módulo real y activo es **Pedidos**; además hay **Asistente IA** ("Necto Intelligence") y legado de **Turnos/Agendamiento**.
- **[CONFIRMADO]** La lógica de negocio es **mock 100% frontend** (React 18 + MobX, datos en memoria/localStorage). Cita del contrato de acceso: "mock 100 % frontend. Sin backend, sin Cognito, sin persistencia de operadores." La única pieza con backend real es **Turnos/Colas** (DynamoDB), un dominio distinto de Pedidos.

### ¿Qué problema resuelve?
- **[INFERENCIA]** Recibir/despachar pedidos (multicanal, foco WhatsApp), medir la operación (dashboard de ventas/tiempos) y —a futuro— controlar inventario. No hay enunciado de problema escrito.

### ¿Quién paga?
- **[NO EXISTE]** Sin facturación, planes, suscripción ni pasarela en el código.

### ¿Qué es una "Tienda"?
- **[NO EXISTE / RESERVADO]** La entidad **Tienda** y el multi-tenant están listados como **fuera de alcance** en el contrato de acceso. Hay nombres ("Administrador de tienda") pero no modelo de datos.
- **[INFERENCIA]** Sería el tenant: agrupa operadores, módulos activados y datos. Hoy se asume **una sola tienda**.

### cuenta / usuario / tienda / sucursal / operador / cliente
| Concepto | Estado | Evidencia |
|---|---|---|
| Cuenta | [NO EXISTE] | Sin entidad ni billing |
| Usuario | [PARCIAL] | Login falso ("TODO: integrate with Cognito auth"); el usuario se auto-declara admin/operador |
| Tienda | [NO EXISTE] | Fuera de alcance; multi-tenant no implementado |
| Sucursal | [NO EXISTE] | Ninguna entidad |
| Operador | [CONFIRMADO] | Operador { id, nombre, email, telefono, estado: activo/pendiente/inactivo, modulo, rolId?, capacidadesExtra?, capacidadesRemovidas?, permisos[] (legado) }, en memoria |
| Cliente | [PARCIAL] | Sin entidad propia; embebido en Pedido.cliente/telefono y en el contacto del simulador |

### Modelo de módulos: ¿se compran/activan?
- **[CONFIRMADO parcial]** La sesión tiene `modulos: Modulo[]` y se "eligen" en `/seleccionar`. Hoy `type Modulo = "pedidos"` (único valor real). El array está preparado para multi-módulo que aún no existe.
- **[NO EXISTE]** Sin lógica de compra/activación/facturación de módulos. "Activar" hoy es solo elegirlo (mock).
- **[INFERENCIA]** Intención: activación por tienda tipo marketplace, no construido.

### Módulos existentes / previstos
- **[CONFIRMADO] Implementados:** **Pedidos** (activo, mock), **Asistente IA** (ruta `/asistente`, capacidad `assistant.use`). Legado congelado: **Turnos**, **Agendamiento** (backend DynamoDB de Colas/Turnos, sin UI activa en `App.tsx`).
- **[ROADMAP / NO IMPLEMENTADO] Inventario** — solo en `README.md`: catálogo de productos/insumos, existencias, **deducción automática de stock por pedido confirmado**, alertas de stock mínimo, movimientos y ajustes. Cero código.
- **[CONFIRMADO] Canales** existe como CAPACIDAD (`channels.read`, `channels.manage`), no como módulo/pantalla propia.

### Capacidades obligatorias vs opcionales
- **[CONFIRMADO]** No hay "obligatorias". Un **Rol** agrupa **capacidades**; un operador recibe un rol + extras/removidas. 17 capacidades hoy (16 de pedidos + `assistant.use`):
  - orders.read, orders.create, orders.confirm, orders.cancel, orders.edit(reservada), orders.delete(reservada)
  - preparation.read, preparation.manage
  - scheduled.read, scheduled.manage
  - channels.read, channels.manage
  - settings.read, settings.manage
  - team.read, team.manage
  - assistant.use
- `orders.edit`/`orders.delete` reservadas (sin UI). El rol `admin_tienda` incluye todas. "La denegación gana"; sin rol resoluble ⇒ sin capacidades (fail-closed).

### Tensiones detectadas en las fuentes
- **[CONFIRMADO]** El `README.md` describe "Pedidos e Inventario" y cita rutas que no existen (hallazgo H12 del análisis de perfiles). El backend real es de **Turnos**, no de Pedidos → el repo mezcla dos linajes (producto de Turnos anterior + Pedidos actual).

### Resumen (una línea)
- **[INFERENCIA]** Necto = plataforma modular para pequeños negocios; hoy lo real y funcional es **Pedidos** (mock) + **Asistente IA**; **Inventario** en roadmap; **Tienda/multi-tenant/facturación** inexistentes.

---

## PARTE B — Arquitectura conceptual

### Mapa general (lo que hay hoy)
```
Necto (plataforma, mock frontend)
├── Sesión + Acceso (transversal)          [CONFIRMADO]
│   ├── Sesión (session.store)   ├── Rol (roles.store)   ├── Capacidad (roles.store)
│   ├── Sección (operadores.store SECCIONES)  ├── Scope de datos (solo legado)  └── Simulación ("Viendo como")
├── Módulo Pedidos                          [CONFIRMADO]  (/pedidos tablero, /pedidos/inicio, /crear, /historial, /config, /equipo)
├── Módulo Asistente IA                     [CONFIRMADO]  (núcleo src/assistant + assistant.store + PedidosToolProvider + /asistente)
├── Canal WhatsApp                          [PARCIAL/MOCK]  (simulador /wa, Pedido.origen="whatsapp", capacidades channels.*)
├── Legado: Turnos, Agendamiento            [CONFIRMADO]  (backend DynamoDB de Colas/Turnos)
└── Inventario                              [NO EXISTE — roadmap README]
```

### Definiciones (vocabulario real del repo)
| Término | Definición en Necto | Estado |
|---|---|---|
| **Dominio** | Prefijo de las capacidades (orders.*, channels.*…). No es entidad, es convención de nombres. | [INFERENCIA] |
| **Módulo** | Unidad que la sesión activa (type Modulo, hoy "pedidos"); tiene páginas, store y secciones. El Asistente es módulo transversal. | [CONFIRMADO] |
| **Submódulo** | No hay concepto formal; lo más cercano son las secciones. | [NO EXISTE] |
| **Entidad** | Pedido, Operador, Rol, Conversacion (asistente); en backend Queue/Ticket. | [CONFIRMADO] |
| **Servicio** | Backend: TurnosDAO (DynamoDB). Frontend: stores MobX (no "servicios"). | [CONFIRMADO backend] |
| **Integración** | No hay integraciones externas reales (ni Meta ni pasarelas). Cognito en infra sin uso real. | [NO EXISTE real] |
| **Canal** | Vía de entrada; hoy solo Pedido.origen + capacidades channels.*. Sin entidad Canal. (Ver doc 04.) | [PARCIAL] |
| **Capacidad** | Unidad atómica de autorización, <dominio>.<accion>, "¿puede hacer esto?". | [CONFIRMADO] |

### Tubería de autorización [CONFIRMADO]
```
Sesión → AccessContext → Rol→capacidades efectivas → hasPermission(cap) → (DataScope aparte)
```
- **Sesión**: módulos + tipoSesion (localStorage). No contiene permisos.
- **AccessContext**: snapshot derivado, SOLO autorización (autenticado, tipoSesion, operadorId, rolId, capacidades, modulos).
- **hasPermission(cap)**: única API de "¿puede hacer esto?".
- **DataScope**: capa aparte "¿qué registros ve?"; hoy solo turnos/agendamiento (legado). Pedidos no tiene scope de datos.

### Quién es dueño de cada dato y operación
| Dato / operación | Dueño en el código | Persistencia |
|---|---|---|
| Sesión (módulos, tipoSesion, simulación) | sessionStore | localStorage (necto.session) |
| Roles y capacidades | rolesStore | memoria (seed) |
| Operadores del equipo | operadoresStore | memoria (seed) |
| Pedidos | pedidosStore | memoria (seed); CONFIG en localStorage (necto.pedidosConfig) |
| Conversaciones del asistente | assistantStore | localStorage |
| Tools del asistente sobre Pedidos | PedidosToolProvider (único que importa pedidosStore) | — |
| Colas y tickets (Turnos) | TurnosDAO → DynamoDB TurnosTable | **backend real (AWS)** |
| Autenticación | **nadie real** | login mock; Cognito en infra sin uso |

### Invariantes de arquitectura [CONFIRMADO]
- El **admin es un rol normal** (no hay if (esAdmin)).
- Las **capacidades nombran acciones, no pantallas**.
- **Entrar a una sección ≠ poder operarla** (settings.read para entrar; settings.manage para guardar).
- El **núcleo del Asistente no importa stores de dominio**; solo su provider los conoce.
- Fail-closed: sin rol/capacidades ⇒ sin acceso.

### Fuera de alcance declarado [CONFIRMADO]
Backend/API/Cognito real, persistencia de operadores/roles, **entidad Tienda y multi-tenant**, invitaciones/tokens, migración de turnos/agendamiento a capacidades.
