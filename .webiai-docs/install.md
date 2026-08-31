# wfai install

Full monorepo setup orchestrator. Runs a simplified pipeline: check init status, resolve SDK packages, scan, install DevLink, sync hooks, wire artifacts, and install SST types.

## Usage

```bash
wfai install --mode <dev|remote> [options]
```

## Prerequisites

`wfai init` must be run first. The install command checks init status as its first step and aborts if the CLI and DevLink are not properly bootstrapped.

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--mode <mode>` | Install mode: `dev` or `remote` (required) | — |
| `--skip-sst` | Skip SST Install phase | `false` |
| `--skip-build` | Skip Build phase | `false` |
| `--verbose` | Show detailed output | `false` |
| `--json` | Output result as JSON | `false` |

## Context Resolution

Uses Project Root Resolution — walks up from `cwd` looking for `webiai.config.mjs` with `artifact: "project"`. Skips bundle, library, and infrastructure configs during walk-up.

| Run from | Result |
|----------|--------|
| Project root | Full install |
| Any artifact inside | Walks up to project root, same result |
| Outside monorepo | Error: no config found |

## Pipeline

### 1. Check Init Status

Verifies that `wfai init` has been run. Checks for CLI and DevLink in devDependencies. Aborts with instructions if not initialized.

### 2. SDK Packages Map

Resolves the SDK packages required by the project based on `sdk.version` in the config. Builds a dependency map for all `@webiai/*` packages.

### 3. Clean Dependencies

Removes stale or conflicting dependencies before installing fresh ones.

### 4. DevLink Install

Runs `dev-link install --recursive --npm --mode <mode>` to resolve all packages from the DevLink store (dev mode) or npm registry (remote mode).

### 5. Scan

Executes the same scan as `wfai scan`: loads the project config, scans the monorepo tree, enriches with artifact semantics, and validates structure. If validation errors are found, install aborts with `exit(1)`.

### 6. Hooks

Calls `syncHooks()` — injects `wfai:hook:*` scripts in each artifact's `package.json` (build, test, clean — auto-detected from existing scripts or explicitly declared in `hooks` config).

### 7. Wiring

Wires inter-artifact dependencies and dev-mode scripts. Injects dev scripts (`"{name}"`, `"wfai:dev"`) for artifacts that declare dev commands.

### 8. SST

For each SST target (infrastructure artifacts and bundle connectors):
1. Prepares cache: downloads `@webiai/sdk.infra` + SST platform types
2. Registers provider plugin globally
3. Ejects types into each target's `.sst/webiai/`

Skipped if `--skip-sst` is provided.

## JSON Output

When `--json` is provided, outputs a structured result:

```json
{
  "sdk": { "version": "0.18.0", "packages": [...] },
  "scan": { "artifacts": [...], "errors": [] },
  "dependencies": { "installed": 12, "cleaned": 2 },
  "hooks": { "synced": 5 },
  "wiring": { "devScripts": 3, "interArtifact": 4 },
  "sst": { "targets": 3, "installed": true },
  "summary": { "success": true, "duration": "4.2s" }
}
```

## Examples

```bash
# Development install (from DevLink store)
wfai install --mode dev

# Remote install (from npm)
wfai install --mode remote

# Skip SST and build phases
wfai install --mode dev --skip-sst --skip-build

# Verbose output
wfai install --mode dev --verbose

# JSON output for CI
wfai install --mode remote --json
```

## Source

`src/commands/install/index.ts`

