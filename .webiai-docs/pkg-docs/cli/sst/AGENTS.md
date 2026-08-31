# Infrastructure Commands — Agent Guide

> **Note:** `wfai sst` is a backward-compatible alias for `wfai infra`. Both work identically.

> **Migration:** The preferred command is now `wfai infra` (previously `webiai sst`). The old `wfai sst` form still works and will continue to work, but new documentation and examples use `wfai infra`.

Commands for managing SST v3 + Pulumi infrastructure. All commands are prefixed with `wfai infra`.

## Commands Overview

| Command | Description | Docs |
|---------|-------------|------|
| `infra install` | Eject SST platform types and `@webiai/sdk.infra` | `docs cli/sst/install` |
| `infra dev` | Run SST in dev mode with env loading and log filtering | `docs cli/sst/dev` |
| `infra deploy` | Deploy SST stack to AWS | `docs cli/sst/deploy` |
| `infra remove` | Remove SST stack resources from AWS | `docs cli/sst/remove` |
| `infra unlock` | Unlock stuck Pulumi state | `docs cli/sst/unlock` |
| `infra logs` | Log filtering and tailing | `docs cli/sst/logs` |
| `infra state` | Pulumi state inspection and management | `docs cli/sst/state` |
| `infra migrate` | Database migration management via Lambda | `docs cli/sst/migrate` |

## Environment Loading

All commands (except `install`) share the env-loader module:

1. Loads `.env` (or `--env <file>`) into `process.env`
2. Resolves stage: `--stage` flag → `$SST_STAGE` env var → `.env` file
3. Fails with instructions if no stage can be resolved

Common options: `--context <name>`, `--stage <name>`, `--env <file>`.

## Common Workflows

### Initial Setup

```bash
# From the connector directory (e.g., packages/cloud/core)
wfai infra install --dev-link
```

### Development Cycle

```bash
# High-level: auto-detect artifact and run dev mode
wfai dev

# Target a specific artifact by name (from anywhere)
wfai dev --context srv.data

# Low-level: run SST dev directly (from infrastructure or connector)
wfai infra dev

# In another terminal, follow logs
wfai infra logs tail sst -f
wfai infra logs tail fn -f
```

### Deploy & Remove

```bash
# Deploy stack to AWS
wfai infra deploy

# Deploy with specific stage
wfai infra deploy --stage Production

# Remove all stack resources
wfai infra remove
```

### Unlock Stuck State

```bash
# Unlock Pulumi state after interrupted deploy
wfai infra unlock
```

### State Inspection

```bash
# Find resources by pattern
wfai infra state find mongo

# Filter by type
wfai infra state find --type dynamodb

# Export full state
wfai infra state export > state.json
```

### Database Migrations

```bash
# Check migration status
wfai infra migrate run

# Apply pending migrations
wfai infra migrate run up

# Rollback last migration
wfai infra migrate run down
```
