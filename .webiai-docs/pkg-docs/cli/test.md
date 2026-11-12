# webiai test

Sync hooks and run tests. Can run from any level in the monorepo.

`test`, `build`, and `clean` share the same execution engine (`_shared/hook-runner.mjs`). Each targets a different hook: `webiai:hook:test`, `webiai:hook:build`, `webiai:hook:clean`. See also: `docs cli/build`, `docs cli/clean`.

## Usage

```bash
webiai test [--verbose]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--context <name>` | Target artifact by name (skip auto-detection) | — |
| `--verbose` | Show detailed test output | `false` |

## Context Resolution

Uses Nearest Config Resolution — walks up from `cwd` and returns the first `webiai.config.mjs` found, regardless of artifact type. When `--context <name>` is provided, resolves the named artifact instead of walking up from `cwd`.

| Run from | Resolved artifact | Behavior |
|----------|-------------------|----------|
| Project root | `project` | Sync all hooks + `lerna run webiai:hook:test` |
| Infrastructure dir | `infrastructure` | Sync hooks + `npm run webiai:hook:test` |
| Bundle root | `bundle` | Sync hooks + `npm run webiai:hook:test` |
| Connector inside bundle | (walks up) `bundle` | Sync hooks + test the bundle |
| Service/app inside bundle | (walks up) `bundle` | Sync hooks + test the bundle |
| Library dir | `library` | Sync hooks + `npm run webiai:hook:test` |

## Flow

### Project Level

1. Scan all artifacts via `getMonorepoTree()` + `enrichTree()`
2. `syncHooks(enriched)` — sync hooks for all artifacts
3. `runHook({ hookName: 'test' })` — `lerna run webiai:hook:test` (respects dependency order)

### Artifact Level

1. `syncHooks(fakeEnriched)` — sync hooks for this artifact only
2. Check if `webiai:hook:test` script exists in `package.json`
3. If exists: `npm run webiai:hook:test`
4. If not: skip gracefully with informational message

## Hook Auto-Detection

If an artifact has a `test` script in `package.json` but no explicit `hooks.test` in `webiai.config.mjs`, the hook is auto-generated as `"webiai:hook:test": "run-s test"`.

## Examples

```bash
# From project root — test everything
webiai test

# From a specific artifact — test only that artifact
cd packages/libs/node/core
webiai test

# Target a specific artifact by name (from anywhere)
webiai test --context libs.core

# Verbose output
webiai test --verbose
```

## Source

`bin/commands/test/index.mjs` → `bin/commands/_shared/hook-runner.mjs`
