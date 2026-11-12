# WebIAI Project Commands

Commands for initializing and managing WebIAI monorepo projects.

## Command Overview

| Command | Description | Docs |
|---------|-------------|------|
| `webiai project init` | Initialize a new WebIAI project | [init.md](./init.md) |
| `webiai project align` | Align existing project to WebIAI structure | [align.md](./align.md) |

## When to Use

- **Starting a new project** → `webiai project init`
- **Converting existing npm project** → `webiai project align`
- **CI/CD automation** → `webiai project init` (deterministic mode)
- **Custom project setup** → `webiai project init --agent` (agent-based mode)

## Project Structure

A WebIAI project is an npm monorepo with:

- `webiai.config.mjs` — project metadata and DevLink configuration
- `package.json` — npm workspaces root with `private: true`
- `lerna.json` — Lerna monorepo configuration
- `tsconfig.json` — shared TypeScript configuration

## Validation

Both commands validate the execution context:

- `init` — validates target directory is empty
- `align` — validates current directory is an npm project root (has `package.json`)

Use `--force` to skip validation (not recommended).

## Related Commands

After initializing a project:

1. `webiai install --mode dev` — setup toolchain and dependencies
2. `webiai scan` — validate project structure
3. Add artifacts (libraries, services, infrastructure) to `packages/`
4. `webiai run build` — build all artifacts
