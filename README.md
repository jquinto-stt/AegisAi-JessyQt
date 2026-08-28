# Necto — Monorepo Architecture

> **Necto** — Plataforma SaaS de propósito general para operaciones de negocios.  
> Ofrece módulos de servicio (Pedidos, Inventarios, …) que cada empresa activa según su rubro.  
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
    │       │   ├── factories/     # Factories: Auth, Inventarios, Pedidos, Parameters
    │       │   └── handlers/      # Lambda handlers (inventarios, pedidos)
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

---

## 🧩 Plataforma vs. Módulos

**Necto es la plataforma**; **Pedidos** e **Inventarios** son **módulos de servicio** que una empresa activa como producto según su rubro. Necto sirve a múltiples rubros — restaurantes, centros deportivos, clínicas, inmobiliarias, coworkings, retail, hoteles, servicios técnicos, negocios de barrio, entre otros — resolviendo problemas transversales: atención lenta, falta de automatización, trazabilidad, métricas y orden operativo.

| Concepto | Qué es | Ejemplo |
| --- | --- | --- |
| **Plataforma** | Necto — shell, autenticación, navegación y servicios compartidos | `NectoApp`, `auth/`, `elements/` |
| **Módulo** | Un servicio de dominio que una empresa activa | `compositions/pedidos`, `compositions/inventarios` |
| **Recurso backend** | Infra dedicada por dominio, **no compartida entre módulos** | `Pedidos@Table` / `Inventarios@Table` |

### Propiedad de recursos por módulo

Cada módulo tiene su propia capa de datos y recurso backend. No se comparten tablas entre dominios distintos:

- **Módulo Pedidos** → Catálogo de productos y órdenes, respaldado por `Pedidos@Table` + `Pedidos@Api` (WebiAI `cloud.core`). Aislamiento por `ownerId` (claim `sub` del JWT de Cognito). Capa frontend: `src/api/products.ts`, `src/api/mockProducts.ts`, `src/compositions/pedidos/adapters/productAdapter.ts`.
- **Módulo Inventarios** → Dominio de control físico de activos y evidencias; respaldado por `Inventarios@Table` + `Inventarios@Api`. **No** monta sobre el recurso de Pedidos.

> **Nomenclatura**: Lo que el módulo Pedidos llama "catálogo de productos" pertenece a **ese módulo específico**, no a la plataforma Necto en general.
