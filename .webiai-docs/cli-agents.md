# WebIAI CLI — Agent Guide

The `wfai` CLI provides commands for managing WebIAI projects: initialization, dependency installation, infrastructure lifecycle, scanning, and workflow automation.

Binary: `wfai` (primary), `webiai` (legacy alias)

## Command Groups

| Group | Description | Docs |
|-------|-------------|------|
| `wfai init` | Bootstrap CLI + DevLink into a project | `docs cli/init` |
| `wfai project` | Initialize and align projects | `docs cli/project` |
| `wfai library` | Create and align libraries | `docs cli/library` |
| `wfai install` | Full monorepo setup | `docs cli/install` |
| `wfai scan` | Inspect structure and validate configuration | `docs cli/scan` |
| `wfai run` | Workflow commands (build, test, clean, dev) | `docs cli/run` |
| `wfai hooks` | Sync managed scripts | `docs cli/hooks` |
| `wfai kiro` | Kiro agent management | `docs cli/kiro` |
| `wfai infra` | Infrastructure lifecycle commands (provider-agnostic) | `docs cli/infra` |
| `wfai sst` | SST/Pulumi commands (alias for `wfai infra`) | `docs cli/sst` |
| `wfai docs` | Embedded documentation browser | — |

## Important: Initialization Flow

`wfai init` must be run before other commands. It bootstraps the CLI and DevLink into the project's devDependencies. Without it, commands like `wfai install` will fail with a missing init status error.

## When to Use Each Command Group

- Bootstrapping CLI into a project → `wfai init`
- Creating a new project → `wfai project init`
- Converting existing project → `wfai project align`
- Creating a new library → `wfai library create`
- Aligning existing library → `wfai library align`
- Inspecting project structure → `wfai scan`
- Setting up the monorepo → `wfai install --mode dev`
- Installing Kiro agents → `wfai kiro install`
- Building artifacts → `wfai run build`
- Running tests → `wfai run test`
- Cleaning build artifacts → `wfai run clean`
- Starting a dev environment → `wfai run dev` or `wfai infra dev`
- Deploying to AWS → `wfai infra deploy`
- Removing stack resources → `wfai infra remove`
- Unlocking stuck Pulumi state → `wfai infra unlock`
- Setting up SST types → `wfai infra install`
- Debugging infrastructure → `wfai infra state find`
- Checking logs → `wfai infra logs tail`
- Running database migrations → `wfai infra migrate run`

## Shared Module: Env Loader

Most infrastructure commands share a common env loading and stage resolution mechanism.

### Stage Resolution Order

1. `--stage <name>` CLI option (highest priority)
2. `$SST_STAGE` environment variable
3. `SST_STAGE` from `.env` file

### Behavior

- Loads `.env` (or `--env <file>`) into `process.env` without overwriting existing vars
- If `--env` is specified and the file doesn't exist, exits with error
- If no stage can be resolved, exits with error and instructions

### Common Options

These options appear on most infrastructure commands:

| Option | Description | Default |
|--------|-------------|---------|
| `--context <name>` | Target artifact by name (skip auto-detection) | — |
| `--stage <name>` | SST stage name | `$SST_STAGE` |
| `--env <file>` | Env file to load | `.env` |

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `Init required` | `wfai init` not run | Run `wfai init` first |
| `No stage specified` | No `--stage`, no `$SST_STAGE`, no `.env` | Provide `--stage <name>` or set `SST_STAGE` |
| `sst dev is not running` | Lambda invoked but SST dev not active | Start `wfai infra dev` first |
| `Multiple database migration Lambdas found` | More than one migration component in state | Use `--name` to select one |
| `the stack is currently locked` | Pulumi lock from interrupted deploy | Run `wfai infra unlock` |
| `Could not resolve @webiai/sdk.infra` | Package not in dev-link store or npm | Publish with `dev-link push` or check npm |
| `Env file not found` | Specified `--env` file doesn't exist | Check path or remove `--env` option |

## Named Context Resolution

Most commands support `--context <name>` to target a specific artifact by name from anywhere in the monorepo, bypassing the walk-up auto-detection. This option is available on: `dev`, `build`, `test`, `clean`, `hooks`, `infra dev`, `infra deploy`, `infra remove`, `infra unlock`, `infra install`.

When `--context` is provided, the command walks up to the project root, scans the monorepo tree via `dev-link tree`, and resolves the named artifact's directory. Artifact names must be unique across the monorepo.

```bash
# Run dev mode for srv.data from anywhere
wfai dev --context srv.data

# Build a specific artifact from anywhere
wfai build --context libs.core

# Deploy a specific stack from anywhere
wfai infra deploy --context cloud.core
```

## Documentation Structure

```
docs/
├── cli/
│   ├── AGENTS.md               # CLI overview, env loader, errors, source structure
│   ├── init.md                 # wfai init
│   ├── install.md              # wfai install
│   ├── scan.md                 # wfai scan
│   ├── build.md                # wfai run build
│   ├── clean.md                # wfai run clean
│   ├── dev.md                  # wfai run dev
│   ├── test.md                 # wfai run test
│   ├── hooks.md                # wfai hooks
│   ├── design.md               # Architecture notes
│   ├── project/
│   │   ├── AGENTS.md           # Project commands overview
│   │   ├── init.md             # project init
│   │   └── align.md            # project align
│   ├── library/
│   │   ├── AGENTS.md           # Library commands overview
│   │   ├── create.md           # library create
│   │   └── align.md            # library align
│   ├── infrastructure/
│   │   ├── AGENTS.md           # Infrastructure commands overview
│   │   ├── create.md           # infrastructure create
│   │   └── align.md            # infrastructure align
│   ├── infra/
│   │   └── AGENTS.md           # Infra lifecycle commands overview
│   ├── sst/
│   │   ├── AGENTS.md           # SST commands overview, common workflows
│   │   ├── dev.md              # sst dev
│   │   ├── deploy.md           # sst deploy
│   │   ├── remove.md           # sst remove
│   │   ├── unlock.md           # sst unlock
│   │   ├── install.md          # sst install
│   │   ├── logs/
│   │   │   ├── AGENTS.md       # Logs overview
│   │   │   ├── filter.md       # sst logs filter
│   │   │   └── tail.md         # sst logs tail
│   │   ├── state/
│   │   │   ├── AGENTS.md       # State overview
│   │   │   ├── find.md         # sst state find
│   │   │   ├── export.md       # sst state export
│   │   │   └── remove.md       # sst state remove
│   │   └── migrate/
│   │       ├── AGENTS.md       # Migrate overview
│   │       ├── list.md         # sst migrate list
│   │       └── run.md          # sst migrate run
│   ├── bundle/
│   │   └── ...                 # Bundle commands
│   └── kiro/
│       └── ...                 # Kiro commands
```

## Source Code Structure

```
src/
├── cli.ts                      # CLI entry point (TypeScript)
├── commands/
│   ├── init/
│   │   └── index.ts            # wfai init command
│   ├── install/
│   │   ├── index.ts            # Install orchestrator
│   │   ├── scan.ts             # Shared scan + validation
│   │   ├── config-loader.ts    # Config loading + nearest config resolution
│   │   ├── context-by-name.ts  # Named context resolution (--context)
│   │   ├── console-output.ts   # Shared console output formatting
│   │   ├── devlink-integration.ts # DevLink CLI integration
│   │   ├── tree-enricher.ts    # Monorepo tree enrichment
│   │   ├── hook-sync.ts        # Hook synchronization (build, test, clean)
│   │   ├── build-orchestrator.ts # Hook execution via Lerna
│   │   ├── dev-sync.ts         # Dev script synchronization
│   │   └── managed-scripts.ts  # Managed script orchestrator
│   ├── scan/
│   │   └── index.ts            # Scan command (standalone)
│   ├── infra/
│   │   ├── index.ts            # Infra subcommand registry
│   │   ├── dev.ts              # infra dev
│   │   ├── deploy.ts           # infra deploy
│   │   ├── remove.ts           # infra remove
│   │   ├── refresh.ts          # infra refresh
│   │   ├── unlock.ts           # infra unlock
│   │   ├── install.ts          # infra install
│   │   ├── state.ts            # infra state
│   │   ├── migrate.ts          # infra migrate
│   │   └── env-loader.ts       # Shared: .env loading + stage resolution
│   ├── sst/
│   │   └── index.ts            # SST alias (delegates to infra)
│   ├── project/
│   │   ├── index.ts            # Project subcommand registry
│   │   ├── init.ts             # project init
│   │   └── align.ts            # project align
│   ├── library/
│   │   ├── index.ts            # Library subcommand registry
│   │   ├── create.ts           # library create
│   │   └── align.ts            # library align
│   ├── run/
│   │   └── index.ts            # Run subcommand registry (build, test, clean, dev)
│   ├── hooks/
│   │   └── index.ts            # Hooks command
│   ├── kiro/
│   │   ├── index.ts            # Kiro subcommand registry
│   │   └── install.ts          # kiro install
│   └── docs/
│       └── index.ts            # Documentation command
```

