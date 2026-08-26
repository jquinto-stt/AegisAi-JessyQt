# StockFlow

Proyecto de aprendizaje para demostrar el uso del SDK WebiAI y su infraestructura asociada (AWS, SST/Pulumi).

- **Scope:** `@stt/stockflow`
- **SDK:** `@webiai/sdk.cli` v0.23.11
- **Node.js:** >= 22.0.0
- **Package Manager:** npm
- **CLI:** `webiai`
- **GitHub:** https://github.com/jquinto-stt/StockFlow

---

## Arquitectura

El proyecto es un monorepo gestionado por el SDK WebIAI con dos bundles:

### 1. cloud.core (`packages/cloud/core/`)

Bundle de infraestructura que despliega:

- AWS Cognito User Pool + Client (autenticación)
- SSM Parameters para exportaciones cross-stack (`project-info`, `auth-config`)

### 2. app.web (`packages/apps/web/`)

Bundle de aplicación con:

- Módulo React + Vite SPA (`modules/app/`)
- Flujo de autenticación: Registro → Confirmación → Login → Dashboard protegido
- Usa `amazon-cognito-identity-js` para integración client-side con Cognito

---

## Estructura del Proyecto

```
StockFlow/
├── webiai.config.mjs              # Configuración del proyecto (scope: stt, taxonomy: project)
├── package.json                   # @stt/stockflow — raíz del monorepo
├── lerna.json                     # Orquestación con Lerna
├── tsconfig.json                  # Configuración base de TypeScript
├── packages/
│   ├── cloud/core/                # Bundle de infraestructura
│   │   ├── infra/
│   │   │   ├── app.ts            # CloudCore extends Stack — orquesta fases de init
│   │   │   ├── env.ts            # CloudCoreEnv schema + EnvVisitor
│   │   │   └── factories/
│   │   │       ├── index.ts      # Barrel
│   │   │       ├── auth.ts       # Auth.UserPool + Auth.Client (Cognito)
│   │   │       └── parameters.ts # Params.ProjectInfo + Params.AuthConfig (SSM)
│   │   ├── sst.config.ts         # Punto de entrada SST (fijo, no modificar)
│   │   ├── plugins.mjs           # Plugins esbuild para Lambda
│   │   ├── .env.example          # Referencia de variables de entorno
│   │   └── webiai.config.mjs     # Config del bundle (name: cloud.core, stack: CloudCore)
│   └── apps/web/                  # Bundle de aplicación
│       ├── infra/
│       │   ├── app.ts            # AppWeb stack (placeholder para deploy de sitio estático)
│       │   └── env.ts            # AppWebEnv schema
│       ├── modules/app/           # Módulo React SPA
│       │   ├── src/
│       │   │   ├── App.tsx       # Router + AuthProvider + Routes
│       │   │   ├── main.tsx      # Punto de entrada React
│       │   │   ├── auth/
│       │   │   │   ├── cognito.ts        # Configuración de CognitoUserPool
│       │   │   │   ├── AuthContext.tsx    # Contexto React (signUp, signIn, signOut, confirmSignUp)
│       │   │   │   └── ProtectedRoute.tsx # Guard de rutas
│       │   │   └── pages/
│       │   │       ├── Register.tsx  # Registro + confirmación por email
│       │   │       ├── Login.tsx     # Login con email/password
│       │   │       └── Home.tsx      # Dashboard protegido
│       │   ├── index.html
│       │   ├── vite.config.ts
│       │   └── .env.example
│       └── webiai.config.mjs      # Config del bundle (name: app.web)
```

---

## Conceptos del SDK Demostrados

| Concepto | Implementación |
|----------|----------------|
| Artefacto proyecto | `webiai.config.mjs` en la raíz con `taxonomy: "project"` |
| Artefacto bundle | `cloud.core` y `app.web` con `taxonomy: "bundle"` |
| Clase Stack | `CloudCore extends Stack<CloudCoreEnv>` con esquema de env tipado |
| EnvVisitor | `cloudCoreEnvVisitor` transforma variables de entorno raw a esquema tipado |
| Patrón Factory | Namespaces (`Auth`, `Params`) con funciones que reciben instancia del stack |
| Fases de init | `run()` → `initAuth()` → `initParameters()` orquestación |
| Globals de SST | `$app.name`, `$app.stage`, `$interpolate`, `$jsonStringify` |
| Managed paths | `@sst/platform/*`, `@webiai/sdk.infra/*` en tsconfig |
| Módulo web-app | React + Vite dentro de `modules/app/` del bundle |

---

## Prerrequisitos

- Node.js >= 22.0.0
- npm (no yarn, no pnpm)
- `@webiai/sdk.cli` instalado globalmente (`npm install -g @webiai/sdk.cli`)
- Credenciales AWS configuradas (vía entorno, `.env`, o IRSA)
- Variable de entorno `SST_STAGE` definida (ej. `dev`)

---

## Inicio Rápido

```bash
# Clonar el repositorio
git clone https://github.com/jquinto-stt/StockFlow.git
cd StockFlow

# Inicializar el CLI en el proyecto
webiai init

# Instalar todo (dependencias + hooks + tipos SST + build)
webiai install

# Instalar dependencias de la web-app
npm install --prefix packages/apps/web/modules/app
```

---

## Desplegar Infraestructura

```bash
# Desplegar cloud.core (crea Cognito User Pool + SSM Parameters)
webiai infra deploy --context cloud.core

# Anotar los outputs: User Pool ID y Client ID
```

---

## Configurar y Ejecutar la SPA

```bash
# Crear .env para la web app con los outputs de Cognito
cat > packages/apps/web/modules/app/.env << EOF
VITE_USER_POOL_ID=<user-pool-id-del-deploy>
VITE_CLIENT_ID=<client-id-del-deploy>
EOF

# Iniciar el servidor de desarrollo Vite
cd packages/apps/web/modules/app
npx vite
```

---

## Comandos de Desarrollo

| Comando | Descripción |
|---------|-------------|
| `webiai install` | Instalación completa (deps + hooks + wiring + tipos SST + build) |
| `webiai infra dev --context cloud.core` | Modo dev en vivo para infraestructura |
| `webiai infra deploy --context cloud.core` | Desplegar stack cloud.core en AWS |
| `webiai infra remove --context cloud.core` | Destruir stack cloud.core |
| `webiai scan` | Inspeccionar estructura del monorepo y artefactos |
| `cd packages/apps/web/modules/app && npx vite` | Ejecutar SPA localmente |
| `cd packages/apps/web/modules/app && npx vite build` | Build de la SPA para producción |

---

## Flujo de Autenticación

```
Usuario → /register → email + password → Cognito signUp()
  → /register (paso de confirmación) → código de verificación → Cognito confirmRegistration()
  → /login → email + password → Cognito authenticateUser()
  → Token JWT almacenado en localStorage
  → / (home) → ProtectedRoute verifica sesión → Dashboard
```

---

## Variables de Entorno

### cloud.core (.env)

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `SST_STAGE` | Sí | Stage de despliegue (ej. `dev`, `staging`, `prod`) |
| `AWS_REGION` | No | Región AWS (por defecto: `us-east-1`) |

### app.web/modules/app (.env)

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `VITE_USER_POOL_ID` | Sí | ID del Cognito User Pool (del deploy de cloud.core) |
| `VITE_CLIENT_ID` | Sí | ID del Cognito Client (del deploy de cloud.core) |

---

## Limpieza

```bash
# Eliminar todos los recursos desplegados
webiai infra remove --context cloud.core
```

---

## Licencia

Private — Unlimitech Cloud LLC
