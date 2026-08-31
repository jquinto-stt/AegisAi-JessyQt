# wfai bundle create module

Create a new module inside an existing bundle artifact.

## Usage

```bash
wfai bundle create module --name <name> --type <type> [--context <bundle>]
```

## Options

| Option | Description | Required |
|--------|-------------|----------|
| `--name <name>` | Module directory name (e.g. api, worker, spa) | Yes |
| `--type <type>` | Module type: `microservice`, `web-app`, `generic` | Yes |
| `--context <name>` | Bundle artifact name (required if not inside a bundle directory) | Conditional |

## Module Types

### microservice

A full HTTP microservice with Express, IoC, and controller pattern.

Creates:
```
modules/<name>/
├── package.json          # Dependencies on parent bundle
├── tsconfig.json         # Extends root, bundler module resolution
├── .gitignore
└── src/
    ├── main.ts           # Entry point (bootstrap + listen)
    ├── bootstrap.ts      # IoC container setup
    ├── application.ts    # Express app configuration
    ├── endpoints.ts      # Route registration
    ├── controllers/
    │   ├── index.ts      # Controller barrel export
    │   └── Health.ts     # Health check endpoint
    └── services/
        └── index.ts      # Service barrel export
```

SDK packages added to root config: `http`, `ioc`

### web-app

A React/SPA web application module.

Creates:
```
modules/<name>/
├── package.json
├── tsconfig.json
├── .gitignore
└── src/
    └── index.ts
```

### generic

A minimal module with just package.json and .gitignore.

Creates:
```
modules/<name>/
├── package.json
└── .gitignore
```

## Bundle Mutations

| File | Change |
|------|--------|
| `<bundle>/package.json` | Adds `modules/<name>` to `workspaces[]` |
| `<bundle>/webiai.config.mjs` | Adds module entry to `modules` section |

## Context Resolution

If `--context` is not provided, the command resolves the bundle from the current working directory:
- If cwd is inside a bundle → uses that bundle
- If cwd is the project root or a non-bundle artifact → fails with error

With `--context`, the command finds the named bundle anywhere in the monorepo.

## Examples

```bash
# Create a microservice API module in srv.data
wfai bundle create module --name api --type microservice --context srv.data

# Create a worker module
wfai bundle create module --name worker --type generic --context srv.data

# Create a web app module (from inside the bundle directory)
cd packages/services/web
wfai bundle create module --name spa --type web-app
```

## Next Steps

After creating a module:
1. Run install: `wfai install`
2. Navigate to the module: `cd packages/<bundle>/modules/<name>`
3. Start developing

## See Also

- [Bundle creation](create.md) — Create the bundle container first
- [Bundle align](align.md) — Align an existing bundle

## Source

`src/commands/bundle/module.ts`, `src/commands/bundle/microservice-generator.ts`, `src/commands/bundle/webapp-generator.ts`, `src/commands/bundle/generic-generator.ts`

