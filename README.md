# Necto — Monorepo Architecture

> **Necto** — Enterprise Inventory & Live Orders Management Platform.  
> Monorepo de infraestructura AWS (`cloud.core`) y aplicación SPA (`app.web.app`) implementado con **WebiAI SDK + SST v3 + Elements**.

---

## 📐 Estructura del Monorepo

```text
Necto/
├── package.json                   # @stt/necto — raíz del monorepo
├── webiai.config.mjs              # Configuración de WebiAI
├── lerna.json                     # Lerna workspaces
│
└── packages/
    ├── cloud/
    │   └── core/                  # @stt/necto.cloud.core (AWS CDK / SST v3)
    │       ├── infra/
    │       │   ├── app.ts         # Stack principal (CloudCore)
    │       │   ├── env.ts         # Validación de variables con EnvVisitor
    │       │   ├── factories/     # Factories: Auth, Products, Parameters
    │       │   └── handlers/      # Lambda handlers
    │       └── sst.config.ts      # Configuración de SST v3
    │
    └── apps/
        └── web/                   # @stt/necto.app.web
            └── modules/
                └── app/           # @stt/necto.app.web.app (SPA React + Elements)
                    ├── src/
                    │   ├── elements/      # UI Elements (Button, Badge, Card, Dialog, Table...)
                    │   ├── compositions/  # Business Modules (pedidos, inventarios)
                    │   ├── pages/         # Top-level Views (NectoApp, Login, Register)
                    │   └── auth/          # AWS Cognito Auth Context
                    └── vite.config.ts     # Vite + Tailwind CSS
```
