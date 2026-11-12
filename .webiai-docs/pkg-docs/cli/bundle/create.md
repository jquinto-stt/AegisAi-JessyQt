# wfai bundle create

Create a new bundle artifact (sub-monorepo with SST connector).

## Usage

```bash
wfai bundle create --name <name> --dir-name <path> [--stack <stack>] [--app <app>]
```

## Options

| Option | Description | Required |
|--------|-------------|----------|
| `--name <name>` | Artifact name (e.g. srv.data, srv.web) | Yes |
| `--dir-name <path>` | Directory relative to packages/ (e.g. services/data) | Yes |
| `--stack <stack>` | SST stack name override (default: PascalCase of name) | No |
| `--app <app>` | SST app name override | No |
| `--agent` | Agent mode (not supported yet) | No |

## What It Creates

```
packages/<dir-name>/
├── package.json           # @scope/project.name, type: module, workspaces: []
├── webiai.config.mjs  # taxonomy: "bundle", sst.stack, modules: {}
├── tsconfig.json          # extends root, NodeNext, SST paths
├── sst.config.ts          # SST config template
├── .env                   # SST_STAGE template
├── .gitignore             # node_modules, dist, .sst
├── plugins.mjs            # Decorator support for Lambda functions
└── infra/
    ├── app.ts             # Infrastructure entry point with factory pattern
    └── env.ts             # Environment variable namespace
```

## Root Mutations

| File | Change |
|------|--------|
| `package.json` | Adds `packages/<dir-name>` to `workspaces[]` |
| `lerna.json` | Adds `packages/<dir-name>` and `packages/<dir-name>/modules/*` to `packages[]` |
| `webiai.config.mjs` | Adds `core`, `http`, `ioc`, `sst-provider`, `sst` to `sdk.packages` (if not present) |

## Examples

```bash
# Create a data service bundle
wfai bundle create --name srv.data --dir-name services/data

# Create with custom stack name
wfai bundle create --name srv.payments --dir-name services/payments --stack PaymentsInfra
```

## Next Steps

After creating a bundle:
1. Add modules: `wfai bundle create module --name api --type microservice --context srv.data`
2. Run install: `wfai install`
3. Start developing: `wfai infra dev --context srv.data`

## See Also

- [Module creation](module.md) — Add modules to an existing bundle
- [Bundle align](align.md) — Align an existing bundle to WebIAI structure

## Source

`src/commands/bundle/create.ts`, `src/commands/bundle/bundle-generator.ts`
