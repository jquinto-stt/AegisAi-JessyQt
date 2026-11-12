# NECTO (AegisAi-JessyQt): ejecución local y arquitectura

## Respuesta corta
- No hace falta desplegar nada en AWS para correrlo en local. Basta Node 22 (engines `>=22`), `bun` y un proyecto Supabase.
- El frontend arranca solo, en "modo maqueta" con datos seed, sin backend ni variables.
- El backend local usa Supabase (Postgres), Azure OpenAI y Telegram, no AWS. La infra SST (Cognito, DynamoDB, ECS) existe en el repo, pero la ruta real no la usa.

## 1. Cómo correr local
Referencias: `README.md` (Inicio Rápido), `package.json` raíz, `packages/apps/web/modules/app/vite.config.ts`.

Frontend (solo UI):
```bash
npm install --prefix packages/apps/web/modules/app
npm run dev --prefix packages/apps/web/modules/app   # http://localhost:6020
```
- Con `.env.example` no se define nada. `VITE_API_URL` por defecto es `/api`.
- Vite hace proxy de `/api` (quitando el prefijo), `/webhooks` y `/health` hacia `http://localhost:8080`.

Full stack (raíz del repo):
```bash
npm install
# bundle del backend, porque dev:api ejecuta dist/main.js
cd packages/services/api/modules/service && bun run bundle
npm run dev    # concurrently: dev:api (bun --watch dist/main.js, :8080) + dev:web (:6020)
```
- Alternativa solo backend: `bun --watch src/main.ts` (script `dev` del módulo service).
- `main.ts` lee `packages/services/api/modules/service/.env.local` a mano. No existe `.env.example` para el backend.
- Variables del backend, solo nombres (grep en `src`): `PORT` (8080), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_CATALOG_OPENAI_ENDPOINT`, `AZURE_CATALOG_OPENAI_KEY`, `AZURE_CATALOG_OPENAI_DEPLOYMENT`.
- Variables del frontend (`import.meta.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`, `VITE_TELEGRAM_BOT_TOKEN`, `VITE_DEMO_EMAIL`, `VITE_DEMO_PASSWORD`.
- El `.env` del frontend también trae `VITE_USER_POOL_ID`, `VITE_CLIENT_ID` y credenciales AWS (restos del flujo Cognito/stockflow). El código revisado no los usa, solo Supabase.
- Tests del frontend: `npm test --prefix packages/apps/web/modules/app` (vitest).

## 2. Dependencias AWS y externas
| Componente | ¿Necesario en local? |
|---|---|
| SST/webiai (`webiai.config.mjs`, `sst.config.ts`, `infra/*`) | No. Solo para desplegar. |
| Cognito, VPC (`packages/cloud/core/infra/factories`) | No. El login real usa Supabase Auth (`lib/auth.service.ts`, `controllers/Auth.ts`). |
| DynamoDB, API Gateway, ECS/Fargate, Lambda (`packages/services/api/infra`) | No para la ruta actual. Ver riesgo 1. |
| Supabase (esquema `necto`, RLS) | Sí para datos reales. Sin `.env` la UI usa seeds (`stores/*.seed.ts`, `lib/modo-demo.ts`). |
| Azure OpenAI | Solo para el bot de Telegram (`TelegramCognitiveEngine`) y la importación de catálogo con IA (`CatalogoIAService`). Sin llaves esas funciones fallan, el resto funciona. |
| Telegram Bot API | Opcional. El bot se inicia solo si existe `TELEGRAM_BOT_TOKEN`. |
| Zernio (WhatsApp) | Opcional. `POST /webhooks/zernio`. Requiere URL pública (los scripts de `scratch/` usan trycloudflare). |
| Stripe / PayZen | No están en este proyecto. `pasarela_pagos-main/` es una base de referencia con `PAYZEN_MODE=mock|live`. |

## 3. Arquitectura
Monorepo: npm workspaces + Lerna + webiai CLI v0.23.11 (`@webiai/sdk.*`: core, http, ioc, infra, aws). Config en `webiai.config.mjs`.

```
packages/
  apps/web/modules/app     SPA React 18 + Vite 6 + TS (bundle "app")
  services/api/modules/service   microservicio HTTP (bundle "service")
  cloud/core               infra compartida SST (VPC, Cognito)
Docs/                      doc funcional (Conversaciones, Inventario) y 5 flujos conversacionales
.kiro/specs/               specs asistente-ia, conversaciones, elements-library-completion
.webiai-docs/              referencia de la CLI webiai
scratch/                   scripts sueltos de prueba, docs y mantenimiento
pasarela_pagos-main/, Repo-prueba-master/, Esencia_necto/   referencias o duplicados
```

Frontend (`packages/apps/web/modules/app/src`):
- Stack: React Router 7, MobX (`stores/`), Tailwind 4.
- Carpetas: `pages/`, `compositions/`, `elements/` (librería UI), `shell/` (layout y sidebar), `domain/` (lógica pura de pedidos e inventarios), `assistant/` (motor del asistente IA).
- Módulos de negocio: Pedidos (Kanban, crear, historial, config, operadores), Inventarios, Conversaciones (bandeja multicanal), Asistente IA, Menú/Catálogo, Checkout.
- Acceso: roles y capacidades en `session.store` / `roles.store`, con guards `ModuloGuard` y `CapabilityGuard`.
- Datos: `lib/supabase.ts` es un cliente perezoso con esquema `necto` y RLS. Si no hay sesión o configuración, cae a datos demo. `lib/tiempo-real.ts` y los `*.repo.ts` hablan con Supabase.

Backend (`modules/service/src`):
- Framework `@webiai/sdk.http` con IoC (`ServiceManager`). `main.ts` levanta el servidor en `:8080` y arranca el bot de Telegram.
- Rutas en `endpoints.ts`: `/health`, `/webhooks/zernio`, `/conversaciones/:id/mensajes`, `/queues` (CRUD, turnos, call-next, finish), `/auth/register`, catálogo e importación IA (`/pedidos/catalogo/importar-ia`).
- `telegram/`: bot con NLU, FSM y motor cognitivo (function-calling en Azure OpenAI). `TelegramDAO` escribe pedidos en Supabase con service_role.
- Flujo de pedidos: cliente por Telegram o WhatsApp, el backend crea el pedido en Supabase, y el tablero Kanban del frontend lo recibe en tiempo real.

## 4. Notas y riesgos
1. Código heredado de AWS. `TurnosDAO` (DynamoDB, plantilla de turnos/colas) se registra en `services/index.ts`, y `infra/` define Cognito, DynamoDB y Fargate para otro caso de uso. No es la ruta principal del producto actual. Las rutas `/queues` y `/turnos` no coinciden con el dominio de pedidos. Un `bun run dev` sin credenciales AWS puede fallar si el DAO las exige. No lo verifiqué ejecutando.
2. `dev:api` ejecuta `dist/main.js`, que debe estar compilado (`bun run bundle`). Hay un `dist` en el repo, pero puede estar desactualizado.
3. Hay `.env` locales (frontend y `cloud/core`) con credenciales AWS temporales. Están en `.gitignore`, pero conviene rotarlas y no compartirlas. No se leyeron sus valores.
4. El frontend usa `VITE_TELEGRAM_BOT_TOKEN` en el navegador (`MenuCatalogoPage`, `CheckoutGlobalPayPage`). Eso expone el token. Debería pasar por el backend.
5. No hay `.env.example` del backend. Recomendación: crear uno con los nombres de variables de la sección 1.
6. Faltan README y scripts claros para el full stack. El README solo cubre el frontend.
7. Limitaciones del análisis: no ejecuté `npm install`, el backend ni los tests. Tampoco revisé el esquema SQL de Supabase (no vi migraciones en el repo).
