# webiai build

Sync hooks and run the build. Can run from any level in the monorepo.

`build`, `test`, and `clean` share the same execution engine (`_shared/hook-runner.mjs`). Each targets a different hook: `webiai:hook:build`, `webiai:hook:test`, `webiai:hook:clean`. See also: `docs cli/test`, `docs cli/clean`.

## Usage

```bash
webiai build [--verbose]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--context <name>` | Target artifact by name (skip auto-detection) | — |
| `--verbose` | Show detailed build output | `false` |

## Context Resolution

Uses Nearest Config Resolution — walks up from `cwd` and returns the first `webiai.config.mjs` found, regardless of artifact type. When `--context <name>` is provided, resolves the named artifact instead of walking up from `cwd`.

| Run from | Resolved artifact | Behavior |
|----------|-------------------|----------|
| Project root | `project` | Sync all hooks + `lerna run webiai:hook:build` |
| Infrastructure dir | `infrastructure` | Sync hooks + `npm run webiai:hook:build` |
| Bundle root | `bundle` | Sync hooks + `npm run webiai:hook:build` |
| Connector inside bundle | (walks up) `bundle` | Sync hooks + build the bundle |
| Service/app inside bundle | (walks up) `bundle` | Sync hooks + build the bundle |
| Library dir | `library` | Sync hooks + `npm run webiai:hook:build` |

## Flow

### Project Level

1. Scan all artifacts via `getMonorepoTree()` + `enrichTree()`
2. `syncHooks(enriched)` — sync hooks for all artifacts
3. `runHook({ hookName: 'build' })` — `lerna run webiai:hook:build` (respects dependency order)

### Artifact Level

1. `syncHooks(fakeEnriched)` — sync hooks for this artifact only
2. Check if `webiai:hook:build` script exists in `package.json`
3. If exists: `npm run webiai:hook:build`
4. If not: skip gracefully with informational message

## Hook Auto-Detection

If an artifact has a `build` script in `package.json` but no explicit `hooks.build` in `webiai.config.mjs`, the hook is auto-generated as `"webiai:hook:build": "run-s build"`. This also applies to `test` and `clean` scripts.

## Examples

```bash
# From project root — build everything
webiai build

# From a specific artifact — build only that artifact
cd packages/libs/node/core
webiai build

# Target a specific artifact by name (from anywhere)
webiai build --context libs.core

# Verbose output
webiai build --verbose
```

## Source

`bin/commands/build/index.mjs` → `bin/commands/_shared/hook-runner.mjs`
