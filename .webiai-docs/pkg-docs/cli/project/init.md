# webiai project init

Initialize a new WebIAI monorepo project. Creates directory structure, generates configuration files, and sets up the project foundation.

## Usage

```bash
# Interactive mode
webiai project init

# Non-interactive mode
webiai project init --scope <org> --name <project>

# Create in new directory
webiai project init --scope myorg --name myproject --dir-name my-project

# Use agent-based generation
webiai project init --scope myorg --name myproject --agent
```

## Options

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--scope <scope>` | Organization name (npm scope) | Yes (or interactive) | — |
| `--name <name>` | Project name | Yes (or interactive) | — |
| `--dir-name <dir>` | Create project in new directory | No | Current directory |
| `--agent` | Use agent-based generation (slower, flexible) | No | `false` |
| `--silent` | Silent mode (minimal output) | No | `false` |

## Generation Modes

### Deterministic Mode (Default)

Fast, predictable file generation without AI agent. Ideal for CI/CD and automation.

```bash
webiai project init --scope myorg --name myproject
```

**Characteristics:**
- ⚡ Fast (no LLM calls)
- 🎯 Predictable output
- 💰 No Kiro credits consumed
- 🤖 Perfect for automation

**Generated files:**
- `webiai.config.mjs` — project configuration
- `lerna.json` — Lerna monorepo setup
- `tsconfig.json` — TypeScript configuration
- `package.json` — updated with WebIAI structure

### Agent Mode

Uses Kiro agent for flexible, adaptive generation. Slower but can handle special cases.

```bash
webiai project init --scope myorg --name myproject --agent
```

**Characteristics:**
- 🤖 Uses Kiro agent
- 🧠 Adaptive to special requirements
- ⏱️ Slower execution
- 💰 Consumes Kiro credits

## Execution Flow

1. **Create directory** (if `--dir-name` specified)
2. **Validate empty** — ensures target directory is empty
3. **npm init** — creates initial `package.json`
4. **Generate files** — deterministic mode or agent mode
5. **Install dependencies** — runs `webiai install`

## Context Validation

The command validates:
- Target directory exists (if `--dir-name`)
- Target directory is empty (no files except hidden)
- Current directory is writable

## Generated Structure

```
my-project/
├── webiai.config.mjs    # Project metadata + DevLink config
├── package.json             # npm workspaces root (private: true)
├── lerna.json              # Lerna configuration
├── tsconfig.json           # Shared TypeScript config
└── node_modules/           # Dependencies (after install)
```

## webiai.config.mjs

```javascript
export default {
  scope: "myorg",
  name: "myproject",
  artifact: "project",
  
  devlink: {
    packages: {
      "@webiai/sdk.infra": { version: "0.4.0", synthetic: true }
    },
    dev: () => ({ manager: "store", namespaces: ["global"] }),
    remote: () => ({ manager: "npm" })
  }
};
```

## package.json Structure

```json
{
  "name": "@myorg/myproject",
  "version": "0.1.0",
  "private": true,
  "engines": { "node": ">=22.0.0" },
  "workspaces": [],
  "overrides": { "google-protobuf": "3.21.2" },
  "dependencies": {
    "@webiai/sdk.cli": "~0.4.0",
    "@webiai/sdk.core": "~0.4.0",
    "@webiai/sdk.http": "~0.4.0",
    "@webiai/sdk.ioc": "~0.4.0"
  }
}
```

## Next Steps

After initialization:

1. **Install dependencies:**
   ```bash
   cd my-project
   webiai install --mode dev
   ```

2. **Validate structure:**
   ```bash
   webiai scan
   ```

3. **Add artifacts:**
   - Create `packages/` directory
   - Add libraries, services, or infrastructure artifacts
   - Update `workspaces` in `package.json`

4. **Build project:**
   ```bash
   webiai run build
   ```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `Directory not empty` | Target has existing files | Use empty directory or remove files |
| `npm init failed` | npm not installed or error | Check npm installation |
| `Missing scope or name` | Required params not provided | Provide `--scope` and `--name` or use interactive mode |
| `Install failed` | Dependency resolution error | Check network, npm registry access |

## Examples

### Basic initialization
```bash
webiai project init --scope acme --name api
```

### Create in new directory
```bash
webiai project init --scope acme --name api --dir-name acme-api
cd acme-api
```

### Silent mode for scripts
```bash
webiai project init --scope acme --name api --silent
```

### Agent-based for custom setup
```bash
webiai project init --scope acme --name api --agent
```

## Related Commands

- `webiai project align` — align existing project
- `webiai install` — setup dependencies
- `webiai scan` — validate structure
