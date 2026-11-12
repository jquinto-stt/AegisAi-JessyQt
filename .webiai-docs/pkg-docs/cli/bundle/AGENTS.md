# WebIAI Bundle Commands

Commands for creating and managing bundle artifacts (sub-monorepos with SST connector) in WebIAI projects.

## Command Overview

| Command | Description | Docs |
|---------|-------------|------|
| `wfai bundle create` | Create a new bundle artifact | [create.md](./create.md) |
| `wfai bundle create module` | Add a module to an existing bundle | [module.md](./module.md) |
| `wfai bundle align` | Align existing bundle to WebIAI structure | [align.md](./align.md) |

## When to Use

- **Creating bundle** → `wfai bundle create --name srv.data --dir-name services/data`
- **Adding microservice** → `wfai bundle create module --name api --type microservice --context srv.data`
- **Adding web app** → `wfai bundle create module --name spa --type web-app --context srv.data`
- **Adding generic module** → `wfai bundle create module --name worker --type generic --context srv.data`
- **Converting existing code** → `wfai bundle align`

## Bundle Structure

A WebIAI bundle is a sub-monorepo that orchestrates infrastructure + software modules:

- Flexible path: `packages/{dir-name}/`
- `webiai.config.mjs` — artifact metadata with `taxonomy: "bundle"`
- `package.json` — sub-monorepo with explicit workspaces
- `tsconfig.json` — TypeScript configuration base
- `sst.config.ts` — SST infrastructure connector
- `infra/` — Infrastructure entry point with factory pattern
- `modules/{module}/` — Software modules (microservices, web apps, generic)

## Module Types

| Type | Description | Example |
|------|-------------|---------|
| `microservice` | Express HTTP API with IoC and controllers | `modules/api/` |
| `web-app` | React/SPA web application | `modules/spa/` |
| `generic` | Minimal module structure | `modules/worker/` |

## Key Features

- **Sub-Monorepo** — Bundle has its own workspaces
- **Flexible Directory** — Custom paths with `--dir-name`
- **Module Creation** — Separate subcommand for adding modules
- **Automatic Updates** — Config and workspaces updated automatically
- **Explicit Workspaces** — No glob patterns (avoids conflicts)
- **SST Connector** — Infrastructure-as-code ready out of the box
- **Context Resolution** — Modules find their bundle by name or cwd

## Naming Convention

Bundles and modules follow a consistent naming:

- **Bundle package:** `@{scope}/{project}.{name}`
- **Module package:** `@{scope}/{project}.{bundle}.{module}`
- **Artifact name:** `{name}` (from config)
- **Directory:** `packages/{dir-name}/`

Example:
- Scope: `unlimitechcloud`
- Project: `dssa-over-mcp`
- Bundle name: `srv.data`
- Bundle package: `@webiai/dssa-over-mcp.srv.data`
- Module package: `@webiai/dssa-over-mcp.srv.data.api`
- Path: `packages/services/data/`

## Development Workflow

```bash
# 1. Create bundle
wfai bundle create --name srv.data --dir-name services/data

# 2. Add microservice module
wfai bundle create module --name api --type microservice --context srv.data

# 3. Add web app module
wfai bundle create module --name spa --type web-app --context srv.data

# 4. Install dependencies
wfai install

# 5. Start development
wfai infra dev --context srv.data
```

## Workspaces Configuration

Bundles use **explicit workspaces**:

```json
{
  "workspaces": [
    "modules/api",
    "modules/spa"
  ]
}
```

**Why explicit?**
- Clear declaration of all modules
- No glob pattern conflicts
- Explicit dependency management

## Related Commands

After creating bundle:

1. `wfai install` — install dependencies and setup toolchain
2. `wfai infra dev --context <bundle>` — start development mode
3. `wfai bundle align` — align existing bundle to expected structure

## Blueprint Reference

Bundle artifacts follow the specification in:
- `blueprints/scaffolding/bundle-v2.md` (v2)

See blueprint for:
- Complete file structure
- SST connector specification
- Software module types (microservice, web-app, generic)
- Configuration options
