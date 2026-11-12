# Migrate Commands — Agent Guide

> **Note:** These commands are accessible via both `wfai infra state` and `wfai sst state` (backward-compatible alias).


Commands for managing database migrations via Lambda functions. Migrations are discovered automatically from Pulumi state.

## Supported Databases

| Database | Component Type | Status |
|----------|---------------|--------|
| MongoDB | `wfai:mongodb:MigrationLambdaComponent` | Available |

Additional database types may be added in the future.

## Commands

| Command | Description | Docs |
|---------|-------------|------|
| `sst migrate list` | List migration Lambda functions from state | `docs cli/sst/migrate/list` |
| `sst migrate run` | Invoke a migration Lambda with an action | `docs cli/sst/migrate/run` |

## How Migration Discovery Works

1. Reads Pulumi state via `sst state export`
2. Searches for resources of type `wfai:mongodb:MigrationLambdaComponent`
3. Resolves child `aws:lambda/function:Function` to get the AWS function name and ARN
4. If only one Lambda exists, it is auto-selected; if multiple, `--name` is required

## Migration Actions

| Action | Description |
|--------|-------------|
| `status` | Show current migration status (applied, pending) |
| `up` | Apply all pending migrations |
| `down` | Rollback the last applied migration |
| `down:block` | Rollback in blocking mode |
| `reset` | Reset all migrations (rollback everything) |

## Common Workflow

```bash
# List available database migration Lambdas
wfai infra migrate list

# Check what's pending
wfai infra migrate run

# Apply migrations
wfai infra migrate run up

# Rollback if needed
wfai infra migrate run down
```

## Prerequisites

- SST dev must be running (`wfai infra dev`) for Lambda invocation to work
- AWS CLI must be available for `lambda invoke`
- Stage must be resolvable via env-loader
