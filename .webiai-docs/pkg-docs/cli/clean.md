# webiai clean

Sync hooks and run clean. Can run from any level in the monorepo.

`clean`, `build`, and `test` share the same execution engine (`_shared/hook-runner.mjs`). Each targets a different hook: `webiai:hook:clean`, `webiai:hook:build`, `webiai:hook:test`. See also: `docs cli/build`, `docs cli/test`.

## Usage

```bash
webiai clean [--verbose]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--context <name>` | Target artifact by name (skip auto-detection) | — |
| `--verbose` | Show detailed clean output | `false` |

## Context Resolution

Uses Nearest Config Resolution — walks up from `cwd` and returns the first `webiai.config.mjs` found, regardless of artifact type. When `--context <name>` is provided, resolves the named artifact instead of walking up from `cwd`.

| Run from | Resolved artifact | Behavior |
|----------|-------------------|----------|
| Project root | `project` | Sync all hooks + `lerna run webiai:hook:clean` |
| Infrastructure dir | `infrastructure` | Sync hooks + `npm run webiai:hook:clean` |
| Bundle root | `bundle` | Sync hooks + `npm run webiai:hook:clean` |
| Connector inside bundle | (walks up) `bundle` | Sync hooks + clean the bundle |
| Service/app inside bundle | (walks up) `bundle` | Sync hooks + clean the bundle |
| Library dir | `library` | Sync hooks + `npm run webiai:hook:clean` |

## Flow

### Project Level

1. Scan all artifacts via `getMonorepoTree()` + `enrichTree()`
2. `syncHooks(enriched)` — sync hooks for all artifacts
3. `runHook({ hookName: 'clean' })` — `lerna run webiai:hook:clean` (respects dependency order)

### Artifact Level

1. `syncHooks(fakeEnriched)` — sync hooks for this artifact only
2. Check if `webiai:hook:clean` script exists in `package.json`
3. If exists: `npm run webiai:hook:clean`
4. If not: skip gracefully with informational message

## Hook Auto-Detection

If an artifact has a `clean` script in `package.json` but no explicit `hooks.clean` in `webiai.config.mjs`, the hook is auto-generated as `"webiai:hook:clean": "run-s clean"`.

## Examples

```bash
# From project root — clean everything
webiai clean

# From a specific artifact — clean only that artifact
cd packages/libs/node/core
webiai clean

# Target a specific artifact by name (from anywhere)
webiai clean --context libs.core

# Verbose output
webiai clean --verbose
```

## Source

`bin/commands/clean/index.mjs` → `bin/commands/_shared/hook-runner.mjs`
