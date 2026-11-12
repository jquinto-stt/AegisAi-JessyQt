# webiai library create

Create a new library artifact in a WebIAI monorepo project. Generates directory structure, configuration files, and platform-specific scaffolding.

## Usage

```bash
# Deterministic mode (default)
webiai library create --name <name> --platform <platform>

# Agent mode
webiai library create --name <name> --platform <platform> --agent

# Agent mode with auto-confirm
webiai library create --name <name> --platform <platform> --agent --auto-confirm

# Silent mode
webiai library create --name <name> --platform <platform> --silent
```

## Options

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--name <name>` | Library name (kebab-case) | Yes | — |
| `--platform <platform>` | Platform: `node` or `generic` | No | `node` |
| `--agent` | Use agent-based generation | No | `false` |
| `--auto-confirm` | Skip confirmation in agent mode | No | `false` |
| `--silent` | Silent mode (minimal output) | No | `false` |

## Platforms

### node

Node.js/TypeScript library with full tooling support.

**Generated structure:**
```
packages/libs/node/{name}/
├── package.json          # Package configuration
├── webiai.config.mjs # Artifact metadata
├── tsconfig.json         # TypeScript configuration
└── src/
    ├── index.ts          # Main entry point
    └── env.ts            # Environment variables
```

**Features:**
- TypeScript compilation
- Build script (`tsc -p tsconfig.json`)
- Test script placeholder
- Clean script
- Proper exports configuration

### generic

Generic library without language-specific tooling.

**Generated structure:**
```
packages/libs/generic/{name}/
├── package.json          # Minimal package configuration
├── webiai.config.mjs # Artifact metadata
└── README.md             # Documentation
```

**Features:**
- Minimal package.json
- Placeholder build/clean scripts
- No language-specific tooling

## Generation Modes

### Deterministic Mode (Default)

Fast, predictable file generation without AI agent. Ideal for CI/CD and automation.

```bash
webiai library create --name core --platform node
```

**Characteristics:**
- ⚡ Fast (~instant)
- 🎯 Predictable output
- 💰 No Kiro credits consumed
- 🤖 Perfect for automation

**Generated files (node platform):**
- `packages/libs/node/core/package.json`
- `packages/libs/node/core/webiai.config.mjs`
- `packages/libs/node/core/tsconfig.json`
- `packages/libs/node/core/src/index.ts`
- `packages/libs/node/core/src/env.ts`

**Modified files:**
- `package.json` — adds workspace and `@webiai/sdk.core` dependency
- `lerna.json` — adds package path

### Agent Mode

Uses Kiro agent for flexible, adaptive generation. Slower but can handle special cases.

```bash
webiai library create --name core --platform node --agent --auto-confirm
```

**Characteristics:**
- 🤖 Uses `webiai@{version}-library-scaffolder` agent
- 🧠 Adaptive to special requirements
- ⏱️ Slower execution (~20-40s)
- 💰 Consumes Kiro credits (~0.5-1.0 credits)
- 📋 Shows detailed plan before execution (unless `--auto-confirm`)

**Execution phases:**
1. **Validation** — verifies context and prerequisites
2. **Analysis** — reads blueprint and analyzes project state
3. **Planning** — generates detailed action plan
4. **Confirmation** — waits for user approval (unless `--auto-confirm`)
5. **Execution** — creates files and modifies project

## Context Validation

The command validates:

1. **Project root** — must run from monorepo root (has `webiai.config.mjs` and `package.json`)
2. **No duplicate artifact** — uses `webiai scan --json` to verify no artifact with name `libs.{platform}.{name}` exists
3. **Directory state** — target directory must not exist OR be completely empty
4. **Valid platform** — platform must be `node` or `generic`

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `INVALID_CONTEXT` | Not running from project root | Run from directory with `webiai.config.mjs` |
| `LIBRARY_EXISTS` | Artifact with same name exists | Use `webiai scan --json` to see existing artifacts, choose different name |
| `DIRECTORY_NOT_EMPTY` | Target directory exists but not empty | Remove files from directory or choose different name |
| `INVALID_PLATFORM` | Platform not `node` or `generic` | Use `--platform node` or `--platform generic` |

## Naming Convention

Libraries follow a strict naming convention:

**Input:**
- `--name core`
- `--platform node`
- Project scope: `unlimitechcloud`
- Project name: `dssa-over-mcp`

**Output:**
- **Package name:** `@webiai/dssa-over-mcp.libs.node.core`
- **Artifact name:** `libs.node.core`
- **Directory:** `packages/libs/node/core/`
- **Config name:** `libs.node.core`

## Examples

### Create Node.js library (deterministic)

```bash
webiai library create --name core --platform node
```

**Output:**
```
🏗️  Creating new library artifact...

Mode: deterministic

✅ Library created at: packages/libs/node/core

📦 Next steps:
   1. Run: webiai install
   2. Navigate to: packages/libs/node/core
   3. Start developing!
```

### Create generic library (agent mode)

```bash
webiai library create --name shared --platform generic --agent
```

**Output:**
```
🏗️  Creating new library artifact...

Mode: agent

🤖 Starting Kiro agent: webiai@0.4.0-library-scaffolder

[Agent shows plan]

Confirm execution? (y/n): y

✅ Library creation completed

📄 Files created:
   - packages/libs/generic/shared/package.json
   - packages/libs/generic/shared/webiai.config.mjs
   - packages/libs/generic/shared/README.md

✏️  Files modified:
   - package.json
   - lerna.json
```

### Verify before creating

```bash
# Check existing artifacts
webiai scan --json

# Create library
webiai library create --name utils --platform node

# Verify creation
webiai scan
```

## Integration

### Project Registration

The command automatically:

1. **Adds workspace** — adds direct path to `package.json` workspaces array:
   ```json
   {
     "workspaces": [
       "packages/*",
       "packages/libs/node/core"
     ]
   }
   ```

2. **Adds Lerna package** — adds direct path to `lerna.json` packages array:
   ```json
   {
     "packages": [
       "packages/libs/node/core"
     ]
   }
   ```

3. **Adds dependency** — ensures `@webiai/sdk.core` is in root `package.json` dependencies:
   ```json
   {
     "dependencies": {
       "@webiai/sdk.core": "~0.4.0"
     }
   }
   ```

### TypeScript Configuration

Node libraries extend the root TypeScript configuration:

```json
{
  "extends": "../../../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

## Next Steps

After creating a library:

1. **Install dependencies:**
   ```bash
   webiai install
   ```

2. **Navigate to library:**
   ```bash
   cd packages/libs/node/core
   ```

3. **Implement functionality:**
   - Edit `src/index.ts`
   - Add environment variables in `src/env.ts`
   - Add additional source files

4. **Build:**
   ```bash
   webiai run build
   ```

5. **Test:**
   ```bash
   webiai run test
   ```

## Related Commands

- `webiai library align` — align existing package to library structure
- `webiai scan` — verify library structure
- `webiai install` — install dependencies
- `webiai run build` — build library
- `webiai run test` — run tests
