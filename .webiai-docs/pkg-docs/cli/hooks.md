# webiai hooks

Sync all managed scripts in `package.json` files. Managed scripts are scripts that WebIAI injects and maintains automatically — build hooks and dev scripts.

Can run from any level in the monorepo.

## Usage

```bash
webiai hooks [--context <name>]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--context <name>` | Target artifact by name (skip auto-detection) | — |

## Context Resolution

Uses Nearest Config Resolution — walks up from `cwd` and returns the first `webiai.config.mjs` found, regardless of artifact type. When `--context <name>` is provided, resolves the named artifact instead of walking up from `cwd`.

| Run from | Resolved artifact | Behavior |
|----------|-------------------|----------|
| Project root | `project` | Syncs managed scripts for ALL artifacts |
| Infrastructure dir | `infrastructure` | Syncs managed scripts for this artifact |
| Bundle root | `bundle` | Syncs managed scripts for this bundle |
| Connector inside bundle | (walks up) `bundle` | Syncs managed scripts for the bundle |
| Service/app inside bundle | (walks up) `bundle` | Syncs managed scripts for the bundle |
| Library dir | `library` | Syncs managed scripts for this artifact |

## Managed Script Categories

| Category | Script Pattern | Description |
|----------|---------------|-------------|
| Build hooks | `webiai:hook:build` | Wires up build targets via `run-s`. Auto-detected from `build` script if no explicit config. |
| Test hooks | `webiai:hook:test` | Wires up test targets via `run-s`. Auto-detected from `test` script if no explicit config. |
| Clean hooks | `webiai:hook:clean` | Wires up clean targets via `run-s`. Auto-detected from `clean` script if no explicit config. |
| Dev scripts | `"{name}"` (bundle root), `"webiai:dev"` (connector) | Wires up dev-mode execution for infrastructure and bundles. |

Both categories are orchestrated by `syncAllManagedScripts()` which calls `syncHooks()` then `syncDevScripts()` in sequence, with short-circuit on failure.

Hook auto-detection applies to `build`, `test`, and `clean`: if the corresponding script exists in `package.json` but no explicit `hooks.<name>` is defined in `webiai.config.mjs`, the hook is auto-generated.

## Examples

```bash
# From project root — sync all artifacts
webiai hooks

# From a specific artifact — sync only that artifact
cd packages/services/data
webiai hooks

# Target a specific artifact by name (from anywhere)
webiai hooks --context srv.data

# From inside a bundle child — walks up to bundle
cd packages/services/data/packages/service
webiai hooks
```

## Source

`bin/commands/hooks/index.mjs`
