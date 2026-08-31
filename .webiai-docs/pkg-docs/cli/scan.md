# wfai scan

Inspect monorepo structure, artifacts, and validate configuration.

## Usage

```bash
wfai scan
```

Run from the project root or any nested directory. The command walks upward to find the project root (`webiai.config.mjs` with `artifact: "project"`).

## What It Does

1. Loads the project config (`webiai.config.mjs`)
2. Scans the monorepo tree via `dev-link tree --json`
3. Enriches the tree with WebIAI semantics (artifact types, SST/build targets)
4. Validates structure for configuration errors
5. Prints a detailed report

## Output

The scan prints:

- Project name and root path
- Artifact tree (sorted: lib → infra → bundle) with icons for SST (⚡) and Build (🔨)
- Bundle children (connector first, then apps)
- SST and Build target summary lists
- Unmanaged modules (no `webiai.config.mjs`)
- Validation errors (if any)

## Validation Errors

The scan detects structural misconfigurations that would cause downstream commands to fail. These are reported as errors and cause `exit(1)`:

| Code | Description |
|------|-------------|
| `DUPLICATE_NAME` | Two or more artifacts share the same name |
| `BUNDLE_NOT_SUB_MONOREPO` | Bundle artifact without workspaces (must be a sub-monorepo) |
| `INFRA_HAS_WORKSPACES` | Infrastructure artifact with workspaces (must be standalone) |
| `LIBRARY_HAS_WORKSPACES` | Library artifact with workspaces (must be standalone) |
| `BUNDLE_MISSING_CONNECTOR` | Bundle has workspaces but no connector child found |

## Pipeline Plan Table

After the artifact tree and validation, scan outputs a **Pipeline Plan** table showing what each artifact needs from the install pipeline:

| Artifact | npm | hooks | wiring | SST | depends on |
|----------|-----|-------|--------|-----|------------|
| libs.core | ✓ | build | — | — | — |
| cloud.core | ✓ | — | — | ✓ | libs.core |
| srv.data/connector | ✓ | — | — | ✓ | cloud.core |
| srv.data/service | ✓ | build | dev | — | libs.core |

Columns:
- **npm**: Whether the artifact has dependencies to install
- **hooks**: Which managed hooks apply (build, test, clean)
- **wiring**: Inter-artifact wiring needed (dev scripts, cross-references)
- **SST**: Whether SST types need to be installed
- **depends on**: Other artifacts this one depends on (determines install/build order)

This table helps visualize the install plan before running `wfai install`.

## Relationship to Install

The `scan` command runs the same scan phase as `wfai install`, but without executing any install/build phases. It's useful for:

- Inspecting how the CLI sees your project structure
- Verifying configuration before running install
- Debugging artifact detection issues
- CI/CD validation gates
- Previewing the install pipeline plan

The `install` command also aborts if validation errors are found during its scan phase.

## Source

- `src/commands/scan/index.ts` — Command entry point
- `src/commands/install/scan.ts` — Shared scan + validation logic
- `src/commands/install/tree-enricher.ts` — Tree enrichment
- `src/commands/install/console-output.ts` — Output formatting

## Example Output

```
🔍 wfai scan

── Scan ──────────────────────────────────────────

  📦 mastertech.hcamsws  (/workspaces/mastertech.hcamsws)

  ├─ @mastertech/hcamsws.libs.core  [lib] 🔨
  ├─ @mastertech/hcamsws.cloud.core  [infra] ⚡
  ├─ @mastertech/hcamsws.srv.data  [bundle]
  │   ├─ connector  [connector] ⚡
  │   └─ service  [app] 🔨
  └─ @mastertech/hcamsws.srv.web  [bundle]
      ├─ connector  [connector] ⚡
      └─ service  [app] 🔨

  ⚡ SST:   cloud/core, services/data/connector, services/web/connector
  🔨 Build: libs/node/core, services/data/service, services/web/service

  ── Pipeline Plan ───────────────────────────────

  | Artifact              | npm | hooks | wiring | SST | depends on  |
  |-----------------------|-----|-------|--------|-----|-------------|
  | libs.core             | ✓   | build | —      | —   | —           |
  | cloud.core            | ✓   | —     | —      | ✓   | libs.core   |
  | srv.data/connector    | ✓   | —     | —      | ✓   | cloud.core  |
  | srv.data/service      | ✓   | build | dev    | —   | libs.core   |
  | srv.web/connector     | ✓   | —     | —      | ✓   | cloud.core  |
  | srv.web/service       | ✓   | build | dev    | —   | libs.core   |

  ✓ Scan complete (0.2s)

  ✅ No configuration errors found.
```
