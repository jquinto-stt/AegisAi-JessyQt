# WebIAI CLI — Command Design Document

Comprehensive design reference for every command in the `webiai` CLI.
Each command is numbered for audit and cross-reference.

---

## Table of Contents

- [1. Nomenclature and Artifact Tree](#1-nomenclature-and-artifact-tree)
- [2. Command Tree Overview](#2-command-tree-overview)
- [3. Context Resolution Strategies](#3-context-resolution-strategies)
  - [3.1 Project Root Resolution](#31-project-root-resolution)
  - [3.2 Nearest Config Resolution](#32-nearest-config-resolution)
  - [3.3 SST Context Resolution](#33-sst-context-resolution)
  - [3.4 No Context Resolution (stdin/cwd-relative)](#34-no-context-resolution-stdincwd-relative)
  - [3.5 Named Context Resolution (--context)](#35-named-context-resolution---context)
- [4. Top-Level Commands](#4-top-level-commands)
  - [4.1 webiai install](#41-webiai-install)
  - [4.2 webiai scan](#42-webiai-scan)
  - [4.3 webiai build / test / clean](#43-webiai-build--test--clean)
  - [4.4 webiai hooks](#44-webiai-hooks)
  - [4.5 webiai dev](#45-webiai-dev)
  - [4.6 webiai docs](#46-webiai-docs)
- [5. SST Commands](#5-sst-commands)
  - [5.1 webiai sst dev](#51-webiai-sst-dev)
  - [5.2 webiai sst deploy](#52-webiai-sst-deploy)
  - [5.3 webiai sst remove](#53-webiai-sst-remove)
  - [5.4 webiai sst unlock](#54-webiai-sst-unlock)
  - [5.5 webiai sst install](#55-webiai-sst-install)
- [6. SST Logs Commands](#6-sst-logs-commands)
  - [6.1 webiai sst logs filter](#61-webiai-sst-logs-filter)
  - [6.2 webiai sst logs tail](#62-webiai-sst-logs-tail)
- [7. SST State Commands](#7-sst-state-commands)
  - [7.1 webiai sst state find](#71-webiai-sst-state-find)
  - [7.2 webiai sst state export](#72-webiai-sst-state-export)
  - [7.3 webiai sst state remove](#73-webiai-sst-state-remove)
- [8. SST Migrate Commands](#8-sst-migrate-commands)
  - [8.1 webiai sst migrate list](#81-webiai-sst-migrate-list)
  - [8.2 webiai sst migrate run](#82-webiai-sst-migrate-run)
- [9. Shared Modules](#9-shared-modules)

---

## 1. Nomenclature and Artifact Tree

### 1.1 Formal Definitions

The WebIAI architecture is organized as a tree of **artifacts**. Each artifact
is declared via a `webiai.config.mjs` file with an `artifact` field.

| Term               | Definition                                                                                                   |
|--------------------|--------------------------------------------------------------------------------------------------------------|
| **project**        | The highest-level artifact. Represents the monorepo root. Contains all other artifacts.                      |
| **infrastructure** | A standalone Node package containing SST/Pulumi infrastructure code. It is an **explicit infrastructure artifact** — SST commands execute directly in its directory. |
| **bundle**         | A sub-monorepo root containing a **connector** (implicit infrastructure) and one or more **software packages** (apps, services) that are injected into the system through the connector. |
| **library**        | A shared library package. Not runnable, not deployable. Used as a dependency by other artifacts.             |
| **connector**      | A Node package inside a bundle that contains SST/Pulumi infrastructure. It is an **implicit infrastructure artifact** within the bundle. SST commands targeting a bundle always resolve to its connector. |
| **package**        | A Node/software package. Generic term for any `package.json`-based unit. Connectors, apps, and services inside a bundle are all packages. |

### 1.2 Terms That Do NOT Exist

| Avoided Term | Why                                                                                     |
|--------------|-----------------------------------------------------------------------------------------|
| **module**   | Does not exist in this architecture. Use "artifact", "package", or the specific artifact type instead. |

### 1.3 Artifact Tree Structure

```
project (monorepo root)
├── infrastructure          ← explicit infrastructure (standalone SST package)
├── bundle                  ← sub-monorepo root
│   ├── connector           ← implicit infrastructure (SST package within bundle)
│   ├── service/app         ← software package (injected through connector)
│   └── ...                 ← additional software packages
├── library                 ← shared library
└── ...
```

### 1.4 Infrastructure: Explicit vs Implicit

SST commands are **only valid at the infrastructure level**:

- **Explicit infrastructure**: An artifact with `artifact: "infrastructure"`. SST commands execute in its own directory.
- **Implicit infrastructure**: The connector inside a bundle. When SST commands target a bundle, they resolve to the connector subdirectory (`packages/{connector}`).

Both are functionally equivalent from SST's perspective — the distinction is whether the infrastructure stands alone or lives inside a bundle.

### 1.5 Config File Format

```js
// webiai.config.mjs
export default {
  name: "srv.data",           // Logical name (must be unique across the monorepo)
  artifact: "bundle",         // Artifact type: project | infrastructure | bundle | library
  connector: "connector",     // Connector folder name (bundle only, default: "connector")
  apps: ["service"],          // Software package folders (bundle only)
  hooks: {                    // Hooks (optional)
    build: ["build"],         // Targets for webiai:hook:build
    test: ["test"],           // Targets for webiai:hook:test
    clean: ["clean"],         // Targets for webiai:hook:clean
  },
};
```

The `name` field is used by `--context <name>` (§3.5) to resolve artifacts by name from anywhere in the monorepo. Names must be unique across all artifacts — if duplicates are detected, commands that use named context resolution will error.

### 1.6 Context Resolution Direction

All context resolution strategies walk **upward** in the directory tree (from cwd toward the filesystem root), never downward. The only downward navigation occurs after resolution — e.g., when a bundle resolves, the command walks down into `packages/{connector}` to find the execution directory.

---

## 2. Command Tree Overview

```
webiai
├── install          # Monorepo setup orchestrator (project-level)
├── scan             # Inspect structure + validate configuration (project-level)
├── build            # Sync hooks + build (any level)
├── test             # Sync hooks + test (any level)
├── clean            # Sync hooks + clean (any level)
├── hooks            # Sync all managed scripts (any level)
├── dev              # Run artifact in dev mode (bundle/infrastructure level)
├── docs [document]  # Embedded documentation browser
└── sst              # SST infrastructure commands (low-level)
    ├── dev          # Run SST in dev mode
    ├── deploy       # Deploy SST stack
    ├── remove       # Remove SST stack
    ├── unlock       # Unlock stuck Pulumi state
    ├── install      # Eject @webiai/sdk.infra types
    ├── logs
    │   ├── filter   # Filter SST output from stdin
    │   └── tail     # Tail log files
    ├── state
    │   ├── find     # Search Pulumi state resources
    │   ├── export   # Export full state JSON
    │   └── remove   # Remove resource from state
    └── migrate
        ├── list     # List migration Lambdas
        └── run      # Invoke migration Lambda
```

### 2.1 Command Level Distinction

| Command             | Level      | Purpose                                                    |
|---------------------|------------|------------------------------------------------------------|
| `webiai build`  | High-level | Sync hooks + build (any level)                             |
| `webiai test`   | High-level | Sync hooks + test (any level)                              |
| `webiai clean`  | High-level | Sync hooks + clean (any level)                             |
| `webiai dev`    | High-level | Run an artifact in dev mode (orchestrates watch + SST)     |
| `webiai sst dev`| Low-level  | Run SST in dev mode directly (infrastructure-level only)   |

`webiai dev` is the user-facing "run this thing in dev mode" command.
`webiai sst dev` is the low-level SST orchestration that `webiai dev` delegates to internally.

---

## 3. Context Resolution Strategies

There are four distinct context resolution strategies used across commands.
All walk **upward** from `cwd` (see §1.6).

### 3.1 Project Root Resolution (`config-loader.mjs → loadConfig`)

Used by: `webiai install`

- Scans upward from `cwd` looking for `webiai.config.mjs`
- Skips configs with `artifact !== "project"` (bundle, library, infrastructure)
- Stops at the first config with `artifact: "project"`
- Validates the config (requires `devlink.packages`, `devlink.modes`)
- Changes `cwd` to the project root directory
- Max scan depth: 10 levels

**Result by location:**

| Run from              | Behavior                                                |
|-----------------------|---------------------------------------------------------|
| Project root          | Uses config directly                                    |
| Any artifact inside   | Walks up, skips non-project configs, finds project root |
| Outside monorepo      | Error: no config found                                  |

### 3.2 Nearest Config Resolution (`config-loader.mjs → loadNearestConfig`)

Used by: `webiai build`, `webiai test`, `webiai clean`, `webiai hooks`

- Scans upward from `cwd` looking for `webiai.config.mjs`
- Returns the **first** config found (nearest to cwd), regardless of artifact type
- Does NOT skip any artifact types
- Changes `cwd` to the config's directory
- Max scan depth: 10 levels

**Result by location:**

| Run from                               | Resolved artifact   | Behavior                                    |
|----------------------------------------|---------------------|---------------------------------------------|
| Project root                           | `project`           | Syncs hooks / builds for ALL artifacts (lerna) |
| `cloud/core`                           | `infrastructure`    | Syncs hooks / builds for this artifact only |
| `services/data`                        | `bundle`            | Syncs hooks / builds for this artifact only |
| `services/data/packages/connector`     | (walks up) `bundle` | Finds bundle config, operates on bundle     |
| `services/data/packages/service`       | (walks up) `bundle` | Finds bundle config, operates on bundle     |
| `libs/node/core`                       | `library`           | Syncs hooks / builds for this artifact only |
| Outside monorepo                       | —                   | Error: no config found                      |

### 3.3 SST Context Resolution (`context-resolver.mjs → resolveSstContext`)

Used by: `webiai sst dev`, `sst deploy`, `sst remove`, `sst unlock`, `sst install`

- Scans upward from `cwd` looking for `webiai.config.mjs`
- Only accepts `infrastructure` or `bundle` artifacts
- Stops with error at `project` or `library` artifacts
- For `infrastructure` (explicit): execDir = artifact directory itself
- For `bundle`: execDir = `packages/{connector}` subdirectory (the implicit infrastructure)
- Changes `cwd` to `execDir` via `process.chdir()`
- Max scan depth: 10 levels

The key insight: SST commands are only valid at the **infrastructure level** (§1.4).
When context resolves to a bundle, the command walks **down** into the connector
because the connector is the implicit infrastructure within that bundle.

**Result by location:**

| Run from                               | Resolved artifact   | execDir                              | redirected |
|----------------------------------------|---------------------|--------------------------------------|------------|
| `cloud/core`                           | `infrastructure`    | `cloud/core`                         | `false`    |
| `services/data`                        | `bundle`            | `services/data/packages/connector`   | `true`     |
| `services/data/packages/connector`     | `bundle`            | `services/data/packages/connector`   | `false`    |
| `services/data/packages/service`       | `bundle`            | `services/data/packages/connector`   | `true`     |
| `services/web/packages/service`        | `bundle`            | `services/web/packages/connector`    | `true`     |
| Project root                           | —                   | Error: "Cannot run SST commands from the project root" |            |
| `libs/node/core`                       | —                   | Error: "Cannot run SST commands from a library" |            |
| Outside monorepo                       | —                   | Error: "No webiai.config.mjs found" |            |

### 3.4 No Context Resolution (stdin/cwd-relative)

Used by: `sst logs filter`, `sst logs tail`, `sst state find`, `sst state export`, `sst state remove`, `sst migrate list`, `sst migrate run`

- These commands operate on the current working directory as-is
- They load `.env` from `cwd` for stage resolution (state/migrate commands)
- `logs filter` reads from stdin (piped)
- `logs tail` reads from `cwd/.sst/log/webiai/`
- The user must be in the correct directory (connector or infrastructure)

### 3.5 Named Context Resolution (`--context <name>`)

Used by: `webiai dev`, `webiai build`, `webiai hooks`, and all `webiai sst` commands (dev, deploy, remove, unlock, install)

The `--context <name>` option allows running any context-aware command from anywhere in the monorepo by specifying the artifact name directly, bypassing the walk-up auto-detection.

**Source:** `context-by-name.mjs → resolveContextByName`

#### 3.5.1 Flow

```
1. findProjectRoot(cwd)               → Walk up to find artifact: "project"
2. scanArtifacts(rootDir)              → dev-link tree + enrichTree to discover all artifacts
3. validateUniqueness(artifacts)       → Ensure no duplicate names across the monorepo
4. Find artifact by name              → Match contextName against artifact names
5. Return { dir, artifact, name }     → Caller uses dir as the starting point for its own resolution
```

#### 3.5.2 Behavior

- When `--context` is provided, the command does NOT walk up from `cwd`
- Instead, it walks up to the project root, scans the entire monorepo tree, and locates the named artifact
- The resolved artifact directory is then passed to the command's normal resolution strategy:
  - For `build` / `hooks`: passed to `loadNearestConfig()` which returns the config at that directory
  - For `dev` / SST commands: passed to `resolveSstContext()` which resolves from that directory
- Artifact names must be unique across the entire monorepo (§1.5)
- If duplicates are found, the command errors with a list of duplicate names

#### 3.5.3 Result by Context

| `--context` value | Resolved artifact | Behavior |
|-------------------|-------------------|----------|
| `srv.data` | `bundle` | Resolves to `services/data`, then normal command resolution |
| `cloud.core` | `infrastructure` | Resolves to `cloud/core`, then normal command resolution |
| `libs.core` | `library` | Resolves to `libs/node/core`, then normal command resolution |
| `hcamsws` | `project` | Resolves to project root, then normal command resolution |
| `nonexistent` | — | Error: artifact not found, lists available artifacts |

#### 3.5.4 Interaction with Other Strategies

When `--context` is provided:
- §3.1 (Project Root): Not affected — `install` does not support `--context`
- §3.2 (Nearest Config): `loadNearestConfig()` receives the named artifact's directory, returns its config directly
- §3.3 (SST Context): `resolveSstContext()` receives the named artifact's directory, applies normal SST validation (rejects project/library)
- §3.4 (No Context): Not affected — stdin/cwd-relative commands do not support `--context`

When `--context` is NOT provided, all commands fall back to their existing walk-up behavior.

---

## 4. Top-Level Commands

### 4.1 webiai install

**Source:** `bin/commands/install/index.mjs`
**Context resolution:** Project Root Resolution (§3.1)
**Required options:** `--mode <dev|remote>`

#### 4.1.1 Flow

```
1.  loadConfig(cwd)                    → Find project root (artifact: "project")
2.  chdir(config.rootDir)              → Move to project root
3.  checkDevlinkAvailable()            → Verify dev-link binary exists
4.  getMonorepoTree()                  → Scan workspaces via dev-link tree
5.  enrichTree(tree)                   → Load webiai.config.mjs for each artifact
                                         Classify: sstTargets, buildTargets, etc.
── Phase 0: Toolchain ──
6.  ensureToolchain(rootDir)           → Ensure lerna, npm-run-all2, concurrently
                                         in root devDependencies
── Phase 1: Dependencies ──
7.  runRecursiveInstall(mode)          → dev-link install --recursive --npm --mode <mode>
── Section: Managed Scripts ──
8.  syncAllManagedScripts(enriched)    → Orchestrate all managed script sync:
    a. syncHooks(enriched)             → Inject webiai:hook:* scripts (build, test, clean)
    b. syncDevScripts(enriched)        → Inject dev-mode scripts
── Phase 2: SST Install ──
9.  prepareSstCache(version, rootDir)  → Download @webiai/sdk.infra + sst platform
10. registerProviderPlugin(rootDir)    → Register provider plugin globally
11. for each sstTarget:
      runSstInstallForTarget(path)     → Eject types into .sst/webiai/
12. cleanupSstCache()                  → Remove temp cache
── Phase 3: Build ──
13. runBuild({ rootDir })              → lerna run webiai:hook:build (via runHook)
```

#### 4.1.2 Context Resolution

- Uses `loadConfig()` which walks up to find `artifact: "project"`
- Skips bundle/library/infrastructure configs during walk-up
- Changes cwd to project root before any operations
- All phases operate from the project root

#### 4.1.3 Result by Context

| Run from           | Result                                          |
|--------------------|-------------------------------------------------|
| Project root       | Full install: deps → managed scripts → sst → build |
| Any artifact inside| Walks up to project root, same result            |
| Outside monorepo   | Error: no config found                           |

---

### 4.2 webiai scan

**Source:** `bin/commands/scan/index.mjs`, `bin/commands/install/scan.mjs`
**Context resolution:** Project Root Resolution (§3.1)

#### 4.2.1 Purpose

`webiai scan` is a standalone inspection command that prints the same scan output
as `webiai install` but without executing any install/build phases. It is useful for:

- Inspecting how the CLI sees the project structure
- Verifying configuration before running install
- Debugging artifact detection issues
- CI/CD validation gates

#### 4.2.2 Flow

```
1. runScan()                           → Shared scan orchestration:
   a. checkDevlinkAvailable()          → Verify dev-link binary exists
   b. loadConfig(cwd)                  → Find project root (artifact: "project")
   c. chdir(config.rootDir)            → Move to project root
   d. getMonorepoTree()               → Scan workspaces via dev-link tree
   e. enrichTree(tree)                 → Load webiai.config.mjs for each artifact
   f. validateStructure(enriched)      → Check for structural errors
2. printProjectTree(enriched)          → Print artifact tree, SST/build targets
3. If validation errors:
   a. printValidationErrors(errors)    → Print error banner with codes
   b. exit(1)
4. Print "No configuration errors found"
```

#### 4.2.3 Validation Errors

The scan detects structural misconfigurations that would cause downstream commands to fail:

| Code | Condition |
|------|-----------|
| `DUPLICATE_NAME` | Two or more artifacts share the same `name` field |
| `BUNDLE_NOT_SUB_MONOREPO` | Bundle artifact without workspaces (must be a sub-monorepo) |
| `INFRA_HAS_WORKSPACES` | Infrastructure artifact with workspaces (must be standalone) |
| `LIBRARY_HAS_WORKSPACES` | Library artifact with workspaces (must be standalone) |
| `BUNDLE_MISSING_CONNECTOR` | Bundle has workspaces but no connector child matching the declared connector name |

These are **errors** (not warnings) — they cause `exit(1)` and block execution.

#### 4.2.4 Shared Scan Module

The scan logic is shared between `webiai scan` and `webiai install`:

- `scan.mjs → runScan()` — orchestrates config load + tree scan + enrich + validate
- `scan.mjs → validateStructure()` — returns `ValidationError[]` with error codes
- `install/index.mjs` calls `runScan()` as its first phase and aborts if errors are found

#### 4.2.5 Context Resolution

- Uses `loadConfig()` internally (via `runScan()`) which walks up to find `artifact: "project"`
- Works from the project root or any nested directory

#### 4.2.6 Result by Context

| Run from           | Result                                          |
|--------------------|-------------------------------------------------|
| Project root       | Full scan: tree + validation                    |
| Any artifact inside| Walks up to project root, same result           |
| Outside monorepo   | Error: no config found                          |

---

### 4.3 webiai build / test / clean

**Source:** `bin/commands/build/index.mjs`, `bin/commands/test/index.mjs`, `bin/commands/clean/index.mjs` → `bin/commands/_shared/hook-runner.mjs`
**Context resolution:** Nearest Config Resolution (§3.2), or Named Context Resolution (§3.5) with `--context`

`build`, `test`, and `clean` are three separate commands that share the same execution engine (`_shared/hook-runner.mjs`). Each targets a different managed hook script:

| Command | Hook script | Icon |
|---------|-------------|------|
| `webiai build` | `webiai:hook:build` | 🔨 |
| `webiai test` | `webiai:hook:test` | 🧪 |
| `webiai clean` | `webiai:hook:clean` | 🧹 |

The flow below uses `build` as the example, but `test` and `clean` follow the identical pattern with their respective hook name.

#### 4.3.1 Flow

```
── At project level (artifact: "project") ──
1. loadNearestConfig(cwd)             → Find nearest webiai.config.mjs
2. chdir(configDir)                   → Move to config directory
3. checkDevlinkAvailable()            → Verify dev-link binary
4. getMonorepoTree() + enrichTree()   → Scan all artifacts
5. syncHooks(enriched)                → Sync hooks for ALL artifacts
6. runHook({ hookName })              → lerna run webiai:hook:<hookName>

── At artifact level (any other artifact) ──
1. loadNearestConfig(cwd)             → Find nearest webiai.config.mjs
2. chdir(configDir)                   → Move to config directory
3. syncHooks(fakeEnriched)            → Sync hooks for THIS artifact only
4. Check if webiai:hook:<hookName> exists in package.json
5. If exists: execSync("npm run webiai:hook:<hookName>")
6. If not: skip gracefully with informational message
```

#### 4.3.2 Graceful Skip

At the artifact level, if the hook script does not exist in `package.json` after sync (e.g., the artifact has no `test` script and no explicit `hooks.test` config), the command prints an informational message and exits with code 0. This allows running `webiai test` from any artifact without errors, even if that artifact has no tests.

At the project level, Lerna silently skips artifacts that don't have the target script — no special handling needed.

#### 4.3.3 Context Resolution

- Uses `loadNearestConfig()` which returns the FIRST config found (nearest)
- Does NOT skip any artifact type
- Behavior branches based on resolved artifact type

#### 4.3.4 Result by Context

| Run from                               | Resolved artifact   | Behavior                            |
|----------------------------------------|---------------------|-------------------------------------|
| Project root                           | `project`           | Sync all hooks + lerna run all      |
| `cloud/core`                           | `infrastructure`    | Sync hooks + run this artifact      |
| `services/data`                        | `bundle`            | Sync hooks + run this bundle        |
| `services/data/packages/connector`     | (walks up) `bundle` | Sync hooks + run bundle             |
| `services/data/packages/service`       | (walks up) `bundle` | Sync hooks + run bundle             |
| `libs/node/core`                       | `library`           | Sync hooks + run this artifact      |

---

### 4.4 webiai hooks

**Source:** `bin/commands/hooks/index.mjs`
**Context resolution:** Nearest Config Resolution (§3.2), or Named Context Resolution (§3.5) with `--context`

The `hooks` command is the central mechanism for managing all **managed scripts**
in `package.json` files. Managed scripts are scripts that WebIAI injects and
maintains automatically — they are "implicit hooks" that wire up the build, dev,
and operational workflows.

#### 4.4.1 Hook Taxonomy

Hooks are categorized by their purpose:

| Category        | Script Pattern          | Source                | Description                                                    |
|-----------------|-------------------------|-----------------------|----------------------------------------------------------------|
| **Build hooks** | `webiai:hook:build` | `hooks.build` in config or auto-detected from `build` script | Wires up build targets via `run-s`. Lerna orchestrates these at project level. |
| **Test hooks**  | `webiai:hook:test`  | `hooks.test` in config or auto-detected from `test` script   | Wires up test targets via `run-s`. Lerna orchestrates these at project level. |
| **Clean hooks** | `webiai:hook:clean` | `hooks.clean` in config or auto-detected from `clean` script | Wires up clean targets via `run-s`. Lerna orchestrates these at project level. |
| **Dev scripts** | `"{name}"` (bundle root), `"webiai:dev"` (connector) | `artifact` + `name` in config | Wires up dev-mode execution. Infrastructure gets a direct script; bundles get connector delegation + optional watch concurrency. |

All managed script categories are orchestrated by `syncAllManagedScripts()` in
`managed-scripts.mjs`, which calls `syncHooks()` then `syncDevScripts()` in
sequence with short-circuit on failure.

#### 4.4.2 Hook Operations

Each hook category involves three operations:

1. **Read** — Read the artifact's `webiai.config.mjs` to determine what scripts should exist
2. **Write** — Inject/update/remove managed scripts in `package.json`
3. **Detect** — Auto-detect implicit hooks (e.g., if `build` script exists but no explicit `hooks.build` config)

#### 4.4.3 Flow

```
── At project level (artifact: "project") ──
1. loadNearestConfig(cwd)             → Find nearest webiai.config.mjs
2. chdir(configDir)                   → Move to config directory
3. checkDevlinkAvailable()            → Verify dev-link binary
4. getMonorepoTree() + enrichTree()   → Scan all artifacts
5. syncAllManagedScripts(enriched)    → Sync ALL managed script categories:
   a. syncHooks(enriched)             → Build hooks (webiai:hook:*)
   b. syncDevScripts(enriched)        → Dev scripts ("{name}", "webiai:dev")

── At artifact level (any other artifact) ──
1. loadNearestConfig(cwd)             → Find nearest webiai.config.mjs
2. chdir(configDir)                   → Move to config directory
3. syncAllManagedScripts(fakeEnriched) → Sync ALL managed script categories for THIS artifact
```

#### 4.4.4 Context Resolution

Same as `build` (§4.3.2) — uses `loadNearestConfig()`.

#### 4.4.5 Result by Context

| Run from                               | Resolved artifact   | Behavior                          |
|----------------------------------------|---------------------|-----------------------------------|
| Project root                           | `project`           | Sync all managed scripts for all artifacts |
| `cloud/core`                           | `infrastructure`    | Sync managed scripts for this artifact |
| `services/data`                        | `bundle`            | Sync managed scripts for this bundle |
| `services/data/packages/connector`     | (walks up) `bundle` | Sync managed scripts for bundle   |
| `services/data/packages/service`       | (walks up) `bundle` | Sync managed scripts for bundle   |
| `libs/node/core`                       | `library`           | Sync managed scripts for this artifact |

---

### 4.5 webiai dev

**Source:** `bin/commands/dev/index.mjs`
**Context resolution:** SST Context Resolution (§3.3), or Named Context Resolution (§3.5) with `--context`
**Options:** `--context`, `--stage`, `--env`, `--raw`, `--print-logs`, `--logs-dir`

#### 4.5.1 Purpose

`webiai dev` is the high-level "run this artifact in dev mode" command.
It differs from `webiai sst dev` (§5.1) in that:

- `webiai sst dev` is the low-level SST orchestration command that runs
  directly at the infrastructure level (connector or standalone infrastructure).
- `webiai dev` is the user-facing command that resolves the artifact context,
  sets up watch processes if needed, and delegates to `webiai sst dev` internally.

For a **bundle**, `webiai dev` orchestrates:
1. Watch compilation of software packages (e.g., `tsc --watch` on the service)
2. SST dev mode on the connector (via `webiai sst dev`)
3. Both run concurrently

For an **infrastructure** artifact, `webiai dev` is equivalent to `webiai sst dev`.

#### 4.5.2 Flow

```
1. Resolve context (walk up to find infrastructure or bundle)
2. If infrastructure:
   └── Delegate directly to webiai sst dev (equivalent behavior)
3. If bundle:
   a. Resolve connector directory (packages/{connector})
   b. Check for watch capability in software packages
   c. If watch exists:
      └── concurrently: watch + webiai sst dev (from connector)
   d. If no watch:
      └── Delegate to webiai sst dev (from connector)
```

#### 4.5.3 Context Resolution

- Can be run from: connector, bundle root, or any software package inside a bundle
- In ALL cases for a bundle, execution happens at the **bundle level**
  (the bundle root orchestrates watch + SST)
- For infrastructure, execution happens at the artifact directory itself

**Result by location:**

| Run from                               | Resolved artifact   | Execution level                    |
|----------------------------------------|---------------------|-------------------------------------|
| `cloud/core`                           | `infrastructure`    | `cloud/core` (direct SST dev)       |
| `services/data`                        | `bundle`            | `services/data` (watch + SST)       |
| `services/data/packages/connector`     | `bundle`            | `services/data` (watch + SST)       |
| `services/data/packages/service`       | `bundle`            | `services/data` (watch + SST)       |
| Project root                           | —                   | Error: cannot dev from project root |
| `libs/node/core`                       | —                   | Error: cannot dev a library         |

#### 4.5.4 Relationship to Dev Scripts

The dev scripts injected by `syncDevScripts()` during `webiai install` (§4.1.1 step 9)
are essentially a **static snapshot** of what `webiai dev` would do dynamically:

| Artifact        | Injected script                                              | Equivalent to                |
|-----------------|--------------------------------------------------------------|------------------------------|
| infrastructure  | `"{name}": "webiai sst dev"`                             | `webiai dev` from infra  |
| bundle (watch)  | `"{name}": "concurrently ... watch ... webiai sst dev"`  | `webiai dev` from bundle |
| bundle (no watch)| `"{name}": "npm run webiai:dev --prefix packages/{connector}"` | `webiai dev` from bundle |

Once `webiai dev` is implemented, the injected scripts could optionally delegate
to `webiai dev` instead of inlining the concurrently logic.

---

### 4.6 webiai docs

**Source:** `bin/commands/docs.mjs`
**Context resolution:** None (reads from SDK package directory)

#### 4.6.1 Flow

```
1. Resolve docs path relative to the SDK package (not cwd)
2. If no argument: build and print documentation tree
3. If argument is "agents" / "agent" / "ai": show root AGENTS.md
4. If argument ends with "/agents": show AGENTS.md from that directory
5. If argument matches a directory: show directory listing
6. If argument matches a file: show file content
```

#### 4.6.2 Context Resolution

- No context resolution — operates on the SDK's own `docs/` directory
- Path resolution is relative to the binary location, not cwd
- Works from any directory

---

## 5. SST Commands

All SST commands in this section share the SST Context Resolution strategy (§3.3).

SST commands are **low-level infrastructure commands**. They operate exclusively at
the infrastructure level — either an explicit `infrastructure` artifact or the
implicit infrastructure (connector) within a `bundle` (see §1.4).

### 5.1 webiai sst dev

**Source:** `bin/commands/sst/dev.mjs`
**Context resolution:** SST Context Resolution (§3.3), or Named Context Resolution (§3.5) with `--context`
**Options:** `--context`, `--stage`, `--env`, `--raw`, `--print-logs`, `--logs-dir`

#### 5.1.1 Flow

```
1. resolveSstContext()                → Walk up to find infrastructure/bundle config
2. process.chdir(context.execDir)     → Move to infrastructure-level directory
3. printContext(context)              → Show resolved context
4. resolveEnvAndStage(opts)           → Load .env from cwd (now execDir), resolve stage
5. process.env.SST_LOCAL = 'true'     → Mark as local dev
6. Print log file paths and tail commands
7. spawn('sst', ['dev', '--stage=X', '--mode=mono'])
   ├── If --raw: pipe stdout/stderr directly
   └── If filtered (default):
       ├── Create .sst/log/webiai/sst.log
       ├── Create .sst/log/webiai/function.log
       ├── Parse [Tag] prefixes from output
       ├── Route [SST] → sst.log (cyan)
       ├── Route [Function] → function.log (yellow)
       └── Route [Other] → sst.log (green)
8. Forward SIGINT/SIGTERM to child
9. Exit with child's exit code
```

#### 5.1.2 Context Resolution

- Uses `resolveSstContext()` (§3.3)
- After chdir, `.env` is loaded from the infrastructure-level directory:
  - For explicit infrastructure: the artifact's own directory
  - For bundle: the connector directory (implicit infrastructure)
- Log files are created relative to the new cwd (execDir)

#### 5.1.3 Result by Context

| Run from                               | execDir                            | .env loaded from                         |
|----------------------------------------|------------------------------------|------------------------------------------|
| `cloud/core`                           | `cloud/core`                       | `cloud/core/.env`                        |
| `services/data`                        | `services/data/packages/connector` | `services/data/packages/connector/.env`  |
| `services/data/packages/connector`     | `services/data/packages/connector` | `services/data/packages/connector/.env`  |
| `services/data/packages/service`       | `services/data/packages/connector` | `services/data/packages/connector/.env`  |
| Project root                           | Error                              | —                                        |
| `libs/node/core`                       | Error                              | —                                        |

---

### 5.2 webiai sst deploy

**Source:** `bin/commands/sst/deploy.mjs`
**Context resolution:** SST Context Resolution (§3.3), or Named Context Resolution (§3.5) with `--context`
**Options:** `--context`, `--stage`, `--env`

#### 5.2.1 Flow

```
1. resolveSstContext()                → Walk up to find infrastructure/bundle config
2. process.chdir(context.execDir)     → Move to infrastructure-level directory
3. printContext(context)              → Show resolved context
4. resolveEnvAndStage(opts)           → Load .env, resolve stage
5. process.env.SST_LOCAL = 'false'    → Mark as remote deploy
6. spawn('sst', ['deploy', '--stage=X'])
7. Forward SIGINT/SIGTERM to child
8. Exit with child's exit code
```

#### 5.2.2 Context Resolution

Same as `sst dev` (§5.1.2).

#### 5.2.3 Result by Context

Same table as `sst dev` (§5.1.3). Errors on project root and library.

---

### 5.3 webiai sst remove

**Source:** `bin/commands/sst/remove.mjs`
**Context resolution:** SST Context Resolution (§3.3), or Named Context Resolution (§3.5) with `--context`
**Options:** `--context`, `--stage`, `--env`

#### 5.3.1 Flow

```
1. resolveSstContext()                → Walk up to find infrastructure/bundle config
2. process.chdir(context.execDir)     → Move to infrastructure-level directory
3. printContext(context)              → Show resolved context
4. resolveEnvAndStage(opts)           → Load .env, resolve stage
5. Print warning about resource removal
6. spawn('sst', ['remove', '--stage=X'])
7. Forward SIGINT/SIGTERM to child
8. Exit with child's exit code
```

#### 5.3.2 Context Resolution

Same as `sst dev` (§5.1.2).

#### 5.3.3 Result by Context

Same table as `sst dev` (§5.1.3). Errors on project root and library.

---

### 5.4 webiai sst unlock

**Source:** `bin/commands/sst/unlock.mjs`
**Context resolution:** SST Context Resolution (§3.3), or Named Context Resolution (§3.5) with `--context`
**Options:** `--context`, `--stage`, `--env`

#### 5.4.1 Flow

```
1. resolveSstContext()                → Walk up to find infrastructure/bundle config
2. process.chdir(context.execDir)     → Move to infrastructure-level directory
3. printContext(context)              → Show resolved context
4. resolveEnvAndStage(opts)           → Load .env, resolve stage
5. spawn('sst', ['unlock', '--stage=X', '--mode=mono'])
6. Forward SIGINT/SIGTERM to child
7. Exit with child's exit code
```

#### 5.4.2 Context Resolution

Same as `sst dev` (§5.1.2).

#### 5.4.3 Result by Context

Same table as `sst dev` (§5.1.3). Errors on project root and library.

---

### 5.5 webiai sst install

**Source:** `bin/commands/sst/install.mjs`
**Context resolution:** SST Context Resolution (§3.3), or Named Context Resolution (§3.5) with `--context`
**Options:** `--context`, `--target`, `--dry-run`

#### 5.5.1 Flow

```
1. resolveSstContext()                → Walk up to find infrastructure/bundle config
2. process.chdir(context.execDir)     → Move to infrastructure-level directory
3. printContext(context)              → Show resolved context
4. resolveSDKVersion()                → Read version from SDK's own package.json
5. runSstInstallForTarget(cwd, { version })
   ├── Resolve @webiai/sdk.infra from .devlink/ store or npm
   └── Eject dist/ into .sst/webiai/
6. Print result (source, success/failure)
```

#### 5.5.2 Context Resolution

Same as `sst dev` (§5.1.2).
Note: `resolveSDKVersion()` scans upward from the **binary's own directory** (not cwd) to find the SDK's package.json version.

#### 5.5.3 Result by Context

Same table as `sst dev` (§5.1.3). Errors on project root and library.

---

## 6. SST Logs Commands

### 6.1 webiai sst logs filter

**Source:** `bin/commands/sst/logs-filter.mjs`
**Context resolution:** None (§3.4) — reads from stdin
**Options:** `--dir`

#### 6.1.1 Flow

```
1. Create output directory (default: .sst/log/webiai/)
2. Open write streams: sst.log, function.log
3. Read stdin line by line
4. For each line:
   ├── Strip ANSI codes for clean version
   ├── Match [Tag] prefix pattern
   ├── If [SST]: write to sst.log, colorize cyan
   ├── If [Function]: write to function.log, colorize yellow
   ├── If [Other]: write to sst.log, colorize green
   └── If no tag: route to same file as last tagged line
5. On stdin close: end write streams
```

#### 6.1.2 Context Resolution

- No context resolution
- Operates on stdin (piped from `sst dev --mode=mono 2>&1`)
- Output directory is relative to cwd
- User must pipe output to this command

#### 6.1.3 Result by Context

| Scenario                                    | Result                                |
|---------------------------------------------|---------------------------------------|
| Piped from sst dev                          | Filters and splits logs               |
| No stdin                                    | Hangs waiting for input               |
| Any directory                               | Creates log files relative to cwd     |

---

### 6.2 webiai sst logs tail

**Source:** `bin/commands/sst/logs-tail.mjs`
**Context resolution:** None (§3.4) — reads from cwd-relative path
**Arguments:** `<type>` (sst, function, fn)
**Options:** `-n`, `-f`, `--dir`

#### 6.2.1 Flow

```
1. Map type argument: sst → sst, function/fn → function
2. Resolve log file path: {dir}/{type}.log
3. Check file exists
4. If --follow (-f):
   ├── Print last N lines
   └── Poll file every 200ms for new content
5. If not follow:
   └── Print last N lines and exit
```

#### 6.2.2 Context Resolution

- No context resolution
- Log file path is relative to cwd (default: `.sst/log/webiai/`)
- User must be in the correct directory (connector or infrastructure)

#### 6.2.3 Result by Context

| Run from                               | Log file path                                                  |
|----------------------------------------|----------------------------------------------------------------|
| `services/data/packages/connector`     | `services/data/packages/connector/.sst/log/webiai/sst.log` |
| `cloud/core`                           | `cloud/core/.sst/log/webiai/sst.log`                       |
| Wrong directory                        | Error: "Log file not found"                                    |

---

## 7. SST State Commands

All state commands use env-loader for stage resolution but no context resolution.

### 7.1 webiai sst state find

**Source:** `bin/commands/sst/state-find.mjs`
**Context resolution:** None (§3.4) — env-loader only
**Arguments:** `[pattern]`
**Options:** `--stage`, `--env`, `--type`, `--json`

#### 7.1.1 Flow

```
1. resolveEnvAndStage(opts, { silent: true })  → Load .env from cwd, resolve stage
2. exportState(stage)                          → Run sst state export --stage=X
3. getResources(stateData)                     → Extract resource list
4. Filter by pattern (URN substring, case-insensitive)
5. Filter by --type (resource type substring, case-insensitive)
6. If --json: output JSON array
7. Else: print formatted list (Name, Type, URN)
```

#### 7.1.2 Context Resolution

- No walk-up or context detection
- Loads `.env` from cwd for `SST_STAGE`
- Spawns `sst state export` in cwd
- User must be in a directory with `.env` containing `SST_STAGE`

#### 7.1.3 Result by Context

| Run from                               | .env loaded from                   | State exported from |
|----------------------------------------|------------------------------------|---------------------|
| `cloud/core`                           | `cloud/core/.env`                  | cloud/core stack    |
| `services/data/packages/connector`     | `connector/.env`                   | srv.data stack      |
| Wrong directory (no .env)              | No env loaded, needs --stage flag  | Depends on stage    |

---

### 7.2 webiai sst state export

**Source:** `bin/commands/sst/state-export.mjs`
**Context resolution:** None (§3.4) — env-loader only
**Options:** `--stage`, `--env`

#### 7.2.1 Flow

```
1. resolveEnvAndStage(opts, { silent: true })  → Load .env, resolve stage
2. spawn('sst', ['state', 'export', '--stage=X'])
3. Pipe all stdio to parent (inherit)
4. Exit with child's exit code
```

#### 7.2.2 Context Resolution

Same as `state find` (§7.1.2).

---

### 7.3 webiai sst state remove

**Source:** `bin/commands/sst/state-remove.mjs`
**Context resolution:** None (§3.4) — env-loader only
**Arguments:** `<urn>`
**Options:** `--stage`, `--env`

#### 7.3.1 Flow

```
1. Validate URN argument is provided
2. resolveEnvAndStage(opts, { silent: true })  → Load .env, resolve stage
3. spawn('sst', ['state', 'remove', urn, '--stage=X'])
4. Pipe all stdio to parent (inherit)
5. Exit with child's exit code
```

#### 7.3.2 Context Resolution

Same as `state find` (§7.1.2).

---

## 8. SST Migrate Commands

All migrate commands use env-loader for stage resolution but no context resolution.

### 8.1 webiai sst migrate list

**Source:** `bin/commands/sst/migrate-list.mjs`
**Context resolution:** None (§3.4) — env-loader only
**Options:** `--stage`, `--env`, `--json`

#### 8.1.1 Flow

```
1. resolveEnvAndStage(opts, { silent: true })  → Load .env, resolve stage
2. discoverMigrationLambdas(stage)
   ├── exportState(stage)                      → sst state export
   ├── Filter resources by type: webiai:mongodb:MigrationLambdaComponent
   └── For each component: find child aws:lambda/function:Function
3. If --json: output JSON array
4. Else: print formatted list (Name, Function, ARN)
```

#### 8.1.2 Context Resolution

Same as `state find` (§7.1.2).

---

### 8.2 webiai sst migrate run

**Source:** `bin/commands/sst/migrate-run.mjs`
**Context resolution:** None (§3.4) — env-loader only
**Arguments:** `[action]` (status, up, down, down:block, reset)
**Options:** `--name`, `--stage`, `--env`, `--region`, `--profile`, `--quiet`

#### 8.2.1 Flow

```
1. Validate action (default: "status")
2. resolveEnvAndStage(opts, { silent: true })  → Load .env, resolve stage
3. discoverMigrationLambdas(stage)             → Find migration Lambdas in state
4. Select target Lambda:
   ├── If --name: find by name, error if not found
   ├── If 1 Lambda: auto-select
   └── If multiple: error with list, require --name
5. Validate target has functionName (deployed)
6. Build payload: { action } (or { action: "down", block: true } for down:block)
7. invokeLambda(functionName, payload)
   ├── aws lambda invoke --function-name X --payload Y
   └── Read response from temp file
8. parseAndPrint(output)
   ├── Parse JSON response
   ├── Handle SST dev wrapper (statusCode + body)
   └── Print migration result (success, action, migrations, details)
```

#### 8.2.2 Context Resolution

Same as `state find` (§7.1.2).

---

## 9. Shared Modules

### 9.1 env-loader.mjs

**Source:** `bin/commands/sst/env-loader.mjs`
**Used by:** All SST commands (dev, deploy, remove, unlock, state/*, migrate/*)

```
resolveEnvAndStage(opts, { silent })
  1. Resolve env file path: opts.env || ".env" (relative to cwd)
  2. If file exists: parse key=value pairs, inject into process.env (skip existing)
  3. If opts.env specified but file missing: error + exit
  4. Resolve stage: opts.stage || process.env.SST_STAGE
  5. If no stage: error + exit
  6. Set process.env.SST_STAGE = stage
  7. Return { stage, envFile }
```

### 9.2 context-resolver.mjs

**Source:** `bin/commands/sst/context-resolver.mjs`
**Used by:** sst dev, deploy, remove, unlock, install

```
resolveSstContext(cwd?)
  1. Start from cwd (or process.cwd())
  2. For each directory (up to 10 levels):
     a. Try to load webiai.config.mjs
     b. If artifact === "project": return error
     c. If artifact === "library": return error
     d. If artifact === "infrastructure" (explicit): return { execDir: dir, ... }
     e. If artifact === "bundle":
        - connectorDir = dir/packages/{connector}
        - connector = implicit infrastructure within the bundle
        - If connectorDir exists: return { execDir: connectorDir, ... }
        - Else: return error (connector not found)
     f. If no config or unknown artifact: walk up
  3. If no config found after 10 levels: return error

printContext(ctx)
  - Print "✓ Context: {name} [artifact]"
  - If redirected: print "↪ Executing in: {execDir}"
```

### 9.3 config-loader.mjs

**Source:** `bin/commands/install/config-loader.mjs`
**Used by:** install, build, hooks

Two exported functions:

```
loadConfig(startDir)           → Project Root Resolution
  - Walks up, skips non-project configs
  - Validates devlink.packages and devlink.modes
  - Returns { config, error }

loadNearestConfig(startDir)    → Nearest Config Resolution
  - Walks up, returns FIRST config found
  - Returns { moduleConfig: { artifact, configPath, moduleDir, moduleName }, error }
```

### 9.4 state-helper.mjs

**Source:** `bin/commands/sst/state-helper.mjs`
**Used by:** state find, state export (indirectly), migrate list, migrate run

```
exportState(stage)       → Spawns sst state export, returns parsed JSON
getResources(stateData)  → Extracts resource array from state
findByType(resources, p) → Filter by type substring
findChildren(res, urn)   → Find child resources by URN prefix
nameFromUrn(urn)         → Extract last segment from URN
```

### 9.5 migrate-helper.mjs

**Source:** `bin/commands/sst/migrate-helper.mjs`
**Used by:** migrate list, migrate run

```
discoverMigrationLambdas(stage)
  1. exportState(stage)
  2. Filter by type: webiai:mongodb:MigrationLambdaComponent
  3. For each component: find child aws:lambda/function:Function
  4. Return [{ name, urn, functionName, functionArn }]
```

### 9.6 hook-sync.mjs

**Source:** `bin/commands/install/hook-sync.mjs`
**Used by:** install, build, test, clean, hooks

```
AUTO_DETECT_HOOKS = ['build', 'test', 'clean']

syncHooks(enriched)
  For each artifact in enriched.modules:
    1. Load webiai.config.mjs → extract hooks config
    2. Skip if artifact is "project" (lerna orchestrates root)
    3. Build desired hooks map:
       a. From explicit config: hooks.build, hooks.test, hooks.clean → targets
       b. Auto-detection: for each hook in AUTO_DETECT_HOOKS, if no explicit
          config but the corresponding script exists in package.json,
          auto-generate: "webiai:hook:<name>": "run-s <name>"
    4. Compare with existing webiai:hook:* scripts in package.json
    5. Add new hooks, update changed hooks, remove stale hooks
    6. Write package.json if modified
```

### 9.7 hook-runner.mjs

**Source:** `bin/commands/_shared/hook-runner.mjs`
**Used by:** build, test, clean

Shared execution engine for hook-based CLI commands. Each command (`build/index.mjs`, `test/index.mjs`, `clean/index.mjs`) calls `createHookRunner()` with its hook name, icon, and label.

```
createHookRunner(Command, { hookName, icon, label, description })
  → Returns a Commander command that runs the hook

runHookCommand(hookName, icon, label, opts)
  1. loadNearestConfig(cwd)           → Find nearest webiai.config.mjs
  2. If artifact === "project":       → runProjectHook()
  3. Else:                            → runModuleHook()

runProjectHook(hookName, ...)
  1. getMonorepoTree() + enrichTree() → Scan all artifacts
  2. syncHooks(enriched)              → Sync hooks for ALL artifacts
  3. runHook({ hookName })            → lerna run webiai:hook:<hookName>

runModuleHook(hookName, ...)
  1. syncHooks(fakeEnriched)          → Sync hooks for THIS artifact only
  2. Check if webiai:hook:<hookName> exists in package.json
  3. If exists: execSync("npm run webiai:hook:<hookName>")
  4. If not: skip gracefully (exit 0 with informational message)
```

### 9.8 build-orchestrator.mjs

**Source:** `bin/commands/install/build-orchestrator.mjs`
**Used by:** install (via runBuild), build/test/clean (via runHook from hook-runner)

```
runHook({ rootDir, hookName, verbose })
  → Runs: npx lerna run webiai:hook:<hookName>
  → Returns { success, error }

runBuild(opts)
  → Backwards-compatible wrapper: calls runHook({ ...opts, hookName: 'build' })
```

### 9.9 dev-sync.mjs

**Source:** `bin/commands/install/dev-sync.mjs`
**Used by:** install, hooks (via managed-scripts.mjs)

```
syncDevScripts(enriched)
  For each artifact in enriched.modules:
    - project/library: skip
    - infrastructure: inject "{name}": "webiai sst dev" in package.json
    - bundle:
      1. Inject "webiai:dev": "webiai sst dev" in connector's package.json
      2. Check if watch script exists at bundle root
      3. If watch: inject "{name}": concurrently watch + webiai:dev
      4. If no watch: inject "{name}": delegate to connector's webiai:dev
```

### 9.10 managed-scripts.mjs

**Source:** `bin/commands/install/managed-scripts.mjs`
**Used by:** install, hooks

```
syncAllManagedScripts(enriched)
  1. Call syncHooks(enriched)
     - If failure: short-circuit, return { success: false, hookResult, devResult: null }
  2. Call syncDevScripts(enriched)
     - If failure: return { success: false, hookResult, devResult }
  3. Return { success: true, hookResult, devResult, error: null }
```

Orchestrates all managed script categories in sequence. Short-circuits on first
failure to prevent partial state. Both `install` and `hooks` commands delegate
to this orchestrator instead of calling sync functions individually.

### 9.11 context-by-name.mjs

**Source:** `bin/commands/install/context-by-name.mjs`
**Used by:** config-loader.mjs (build, hooks), context-resolver.mjs (dev, sst dev/deploy/remove/unlock/install)

```
findProjectRoot(startDir)
  - Walks up from startDir looking for webiai.config.mjs with artifact: "project"
  - Returns { rootDir, error }

scanArtifacts(rootDir)
  - Runs dev-link tree --json from rootDir
  - Enriches tree with enrichTree()
  - Collects all artifacts with names
  - Returns { artifacts: [{ name, artifact, dir }], error }

validateUniqueness(artifacts)
  - Checks all artifact names are unique
  - Returns { valid, duplicates }

resolveContextByName(contextName, cwd?)
  1. findProjectRoot(cwd)
  2. scanArtifacts(rootDir)
  3. validateUniqueness(artifacts)
  4. Find artifact by name
  5. Return { dir, artifact, name, error }
```
