# NECTO — Sistema de Turnos

Sistema de gestion de turnos para negocios pequeños (hospitales, restaurantes, escuelas, oficinas, etc.). El cliente final normalmente NO usa NECTO directamente: interactua con un **bot de WhatsApp** conectado al sistema. El dueño del negocio administra los turnos desde este panel.

## Descripcion

Actores del sistema:

- **Dueño / operador** — Administra colas y turnos, y las citas de sus profesionales, desde el panel: crear/editar/pausar colas, llamar y completar turnos, agendar/reagendar/confirmar citas, ver estadisticas, encuestas y analitica de fidelidad.
- **Profesional** — La persona que atiende las citas de agendamiento (psicologa, nutricionista, etc.), presencial o virtual.
- **Bot de WhatsApp** — Crea turnos y citas automaticamente cuando un cliente los solicita (mismo endpoint que la vista de operador).
- **Cliente final** — Recibe avisos por WhatsApp y, al terminar el servicio, abre un link publico para calificar su experiencia.

## Módulos

NECTO tiene dos módulos: **Turnos** (fila de atención en vivo del día) y
**Agendamiento** (citas programadas a futuro con profesionales, presencial o virtual).

### Turnos

| Ruta | Vista | Descripcion |
|------|-------|-------------|
| `/dashboard` | Panel de control | KPIs, turno en atencion, actividad y overview de colas |
| `/turnos` | Mis Turnos | Atencion en vivo (modo auto/manual, drag-and-drop, no-show) |
| `/recepcion` | Crear turno | Vista de operador: elige cola, campos dinamicos por cola, telefono obligatorio |
| `/colas` | Colas | CRUD de colas + editor de campos personalizados por cola |
| `/encuestas` | Encuestas | Dashboard de satisfaccion + configuracion de la vista publica de encuesta |
| `/display` | Pantalla de sala | Pantalla fullscreen para TV (`?cola=<id>&sound=1`) |
| `/s/:token` | Encuesta (publica) | Vista que abre el cliente desde el link de WhatsApp para calificar |

### Agendamiento (citas con profesionales)

Cada profesional tiene su **agenda independiente**. Agenda y Calendario trabajan por
profesional (`?prof=<id>`).

| Ruta | Vista | Descripcion |
|------|-------|-------------|
| `/agendamiento/profesionales` | Profesionales | Gestion de trabajadores (crear/editar/eliminar, avatar+color) |
| `/agendamiento` | Agenda | Citas de un profesional agrupadas por dia, KPIs propios, acciones rapidas |
| `/agendamiento/calendario` | Calendario | Vista mensual de un profesional + panel del dia + config de horarios |
| `/agendamiento/crear` | Agendar cita | Formulario (con DatePicker), muestra el profesional, presencial/virtual |
| `/agendamiento/detalles` | Detalle de cita | Datos + acciones admin (confirmar/reagendar/cancelar/completar/WhatsApp) |
| `/agendamiento/analitica` | Analitica | Regularidad + fidelidad/recompensas configurables (Oro/Plata/Bronce/En riesgo) |

### Campos personalizados por cola

Cada cola define que datos se piden al crear un turno (ademas de nombre y telefono). Los campos son configurables: texto, texto largo, numero o seleccion, con opcion de obligatorio. Asi un restaurante pide "Pedido/Modalidad" y una clinica "Motivo/Documento", sin cambiar codigo. El bot de WhatsApp y la vista de operador comparten el mismo contrato.

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript + MobX |
| Backend | Express + TypeScript (Bun runtime) |
| Base de datos | DynamoDB (single-table design) |
| Autenticacion | AWS Cognito (User Pool + JWT) |
| Infraestructura | SST v3 + Pulumi (IaC) |
| Compute | AWS Lambda + ECS Fargate |
| API | API Gateway HTTP API |
| Hosting | S3 + CloudFront |
| Monorepo | WebIAI CLI + Lerna + npm workspaces |

## Estructura del Proyecto

```
packages/
├── cloud/core/           Infraestructura compartida (VPC, Cognito)
├── services/api/         Backend (API Gateway, Lambda, Fargate, DynamoDB)
│   └── modules/service/  Microservicio Express
│       └── src/
│           ├── controllers/   Health, Queues, Turnos
│           ├── services/       TurnosDAO (acceso single-table)
│           └── endpoints.ts    Registro de rutas /queues y /queues/:id/turnos
└── apps/web/             Frontend
    └── modules/app/
        └── src/
            ├── pages/         dashboard, turnos, recepcion, colas, encuestas,
            │                  display, survey, agendamiento
            ├── stores/        queues.store.ts (turnos, conectado al API)
            │                  agenda.store.ts (agendamiento, MOCK)
            └── services/      queues.api.ts (cliente fetch al backend de turnos)
```

**Estado del backend:** el módulo de **Turnos** tiene backend real (endpoints abajo)
y el frontend está conectado. El módulo de **Agendamiento** y las **encuestas
persistidas** son por ahora solo frontend con datos mock (ver `docs/frontend-handoff-backend.md`).

### API (backend)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/queues` | Lista colas con sus turnos (waiting/serving/done) |
| POST | `/queues` | Crea una cola (con campos personalizados) |
| PATCH | `/queues/:id` | Actualiza una cola |
| DELETE | `/queues/:id` | Elimina una cola y sus turnos |
| POST | `/queues/:id/turnos` | Crea un turno (bot de WhatsApp u operador) |
| POST | `/queues/:id/call-next` | Llama al siguiente en espera |
| POST | `/queues/:id/finish` | Termina el turno actual (`{ advance }`) |
| PATCH | `/queues/:id/turnos/:numero` | Mueve un turno de estado |
| DELETE | `/queues/:id/turnos/:numero` | No-show: elimina un turno |

## Desarrollo Local

Para correr todo el stack en local (frontend + backend + base de datos) sin desplegar en AWS, consulta la guia detallada en **[`docs/correr-local.md`](docs/correr-local.md)** (incluye levantar DynamoDB Local, crear la tabla y los comandos exactos).

Resumen rapido:

```bash
# Instalar dependencias
npm install

# Base de datos local (DynamoDB Local en Docker) + crear tabla TurnosTable
# (ver docs/correr-local.md para el comando de create-table)
docker run --rm -d --name necto-dynamo -p 8000:8000 amazon/dynamodb-local

# Backend (Express, puerto 8080) — con TABLE_NAME y endpoint local
TABLE_NAME=TurnosTable AWS_ENDPOINT_URL_DYNAMODB=http://localhost:8000 \
AWS_ACCESS_KEY_ID=fake AWS_SECRET_ACCESS_KEY=fake AWS_REGION=us-east-1 PORT=8080 \
bun packages/services/api/modules/service/src/main.ts

# Frontend (Vite, puerto 6020)
npm run dev --prefix packages/apps/web/modules/app
```

Esto levanta:
- Backend (Express) en `http://localhost:8080`
- Frontend (Vite) en `http://localhost:6020` (proxy `/api` -> backend)

El frontend funciona aunque el backend no este disponible: cae a datos de ejemplo en memoria (no persiste).

## Requisitos

- Node.js >= 22
- Bun (para el microservicio)
- Docker (para DynamoDB Local)
- AWS credentials (solo para deploy)

## Arquitectura

El proyecto sigue el patron de WebIAI con comunicacion cross-stack via SSM:

```
cloud.core ──register()──> SSM <──restore()── srv.api
                                              │
                           SSM <──register()──┘
                            │
app.web ──restore()─────────┘
```

Cada bundle (stack) es independiente y desplegable por separado. El orden de deploy es: `cloud.core` → `srv.api` → `app.web`.
