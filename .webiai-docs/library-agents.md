# WebIAI Library Commands

Commands for creating and managing library artifacts in WebIAI projects.

## Command Overview

| Command | Description | Docs |
|---------|-------------|------|
| `webiai library create` | Create a new library artifact | [create.md](./create.md) |
| `webiai library align` | Align existing package to library structure | [align.md](./align.md) |

## When to Use

- **Creating a new library** → `webiai library create`
- **Converting existing package to library** → `webiai library align`
- **CI/CD automation** → `webiai library create` (deterministic mode)
- **Custom library setup** → `webiai library create --agent` (agent-based mode)

## Library Structure

A WebIAI library is a package within the monorepo with:

- Fixed path convention: `packages/libs/{platform}/{name}/`
- `webiai.config.mjs` — artifact metadata with `artifact: "library"`
- `package.json` — package configuration with naming convention `@{scope}/{project}.libs.{platform}.{name}`
- Platform-specific files (TypeScript config, source files, etc.)

## Supported Platforms

| Platform | Description | Structure |
|----------|-------------|-----------|
| `node` | Node.js/TypeScript library with full tooling | `src/`, `tsconfig.json`, build scripts |
| `generic` | Generic library without language-specific tooling | `README.md`, minimal package.json |

## Validation

Both commands validate the execution context:

- `create` — validates:
  - Must run from project root (has `webiai.config.mjs` and `package.json`)
  - No artifact with same name exists (via `webiai scan --json`)
  - Target directory doesn't exist OR is completely empty
  - Platform is `node` or `generic`

- `align` — validates:
  - Must run from library directory (has `package.json`)
  - Platform is `node` or `generic`

## Naming Convention

Libraries follow a strict naming convention:

- **Package name:** `@{scope}/{project}.libs.{platform}.{name}`
- **Artifact name:** `libs.{platform}.{name}`
- **Directory:** `packages/libs/{platform}/{name}/`

Example:
- Scope: `unlimitechcloud`
- Project: `dssa-over-mcp`
- Platform: `node`
- Name: `core`
- Package: `@webiai/dssa-over-mcp.libs.node.core`
- Path: `packages/libs/node/core/`

## Verification

Use `webiai scan --json` to:
- List all existing artifacts
- Verify library was created correctly
- Check for naming conflicts before creating

## Related Commands

After creating a library:

1. `webiai install` — install dependencies and setup toolchain
2. `webiai scan` — verify library structure
3. `webiai run build` — build the library
4. `webiai run test` — run library tests (if implemented)

