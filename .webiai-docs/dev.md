# webiai dev

Run an artifact in dev mode. Auto-detects the artifact type from the current directory and sets up the appropriate dev workflow.

## Usage

```bash
webiai dev [options]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--context <name>` | Target artifact by name (skip auto-detection) | — |
| `--stage <name>` | SST stage name | `$SST_STAGE` from `.env` |
| `--env <file>` | Env file to load | `.env` |
| `--raw` | Skip log filtering, show raw output | `false` |
| `--print-logs` | Pass `--print-logs` to SST | `false` |
| `--logs-dir <path>` | Log output directory | `.sst/log/webiai` |

All options are forwarded to the underlying `webiai sst dev` invocation.

## Context Resolution

Uses SST Context Resolution — walks up from `cwd` looking for `webiai.config.mjs` with `artifact: "infrastructure"` or `artifact: "bundle"`. When `--context <name>` is provided, resolves the named artifact instead of walking up from `cwd`.

| Run from | Resolved artifact | Behavior |
|----------|-------------------|----------|
| Infrastructure dir (e.g., `cloud/core`) | `infrastructure` | Delegates to `webiai sst dev` |
| Bundle root (e.g., `services/data`) | `bundle` | Watch + SST dev (or SST dev only) |
| Connector inside bundle | `bundle` | Walks up to bundle root |
| Service/app inside bundle | `bundle` | Walks up to bundle root |
| Project root | — | Error: cannot dev from project root |
| Library dir | — | Error: cannot dev a library |
| Outside monorepo | — | Error: no config found |

## Modes

### Infrastructure Mode

When the resolved artifact is `infrastructure`, the command delegates directly to `webiai sst dev` with all forwarded options. Equivalent to running `webiai sst dev` manually from the infrastructure directory.

### Bundle Mode (with watch)

When the resolved artifact is `bundle` and the bundle root `package.json` has a `watch` script:

1. Spawns `concurrently` with two processes:
   - `npm run watch` from the bundle root (recompiles software packages)
   - `webiai sst dev` from the connector directory (runs SST infrastructure)
2. Forwards SIGINT/SIGTERM to all child processes
3. Exits with the child exit code

### Bundle Mode (without watch)

When the resolved artifact is `bundle` and no `watch` script exists:

1. Delegates to `webiai sst dev` from the connector directory
2. Forwards SIGINT/SIGTERM to the child process
3. Exits with the child exit code

## Relationship to `webiai sst dev`

| Command | Level | Purpose |
|---------|-------|---------|
| `webiai dev` | High-level | User-facing "run this thing in dev mode" |
| `webiai sst dev` | Low-level | SST orchestration at infrastructure level |

`webiai dev` resolves context, sets up watch if needed, and delegates to `webiai sst dev` internally. Use `webiai dev` for day-to-day development; use `webiai sst dev` when you need direct SST control.

## Examples

```bash
# From a bundle directory (e.g., services/data)
webiai dev

# From inside a service package (walks up to bundle)
cd packages/services/data/packages/service
webiai dev

# From infrastructure directory
cd packages/cloud/core
webiai dev

# Target a specific artifact by name (from anywhere)
webiai dev --context srv.data

# With stage override
webiai dev --stage Production

# With raw output (no log filtering)
webiai dev --raw
```

## Source

`bin/commands/dev/index.mjs`

