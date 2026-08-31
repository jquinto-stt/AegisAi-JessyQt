# webiai library align

Align an existing npm package to WebIAI library structure. Analyzes the current package and generates/updates configuration files to match library conventions.

## Usage

```bash
# Agent mode (default and only mode)
webiai library align --name <name> --platform <platform>

# With auto-confirm
webiai library align --name <name> --platform <platform> --auto-confirm

# Silent mode
webiai library align --name <name> --platform <platform> --silent
```

## Options

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--name <name>` | Library name in format `libs.{platform}.{name}` | Yes | — |
| `--platform <platform>` | Platform: `node` or `generic` | No | `node` |
| `--auto-confirm` | Skip confirmation prompt | No | `false` |
| `--silent` | Silent mode (minimal output) | No | `false` |

## Agent Mode Only

Unlike `library create`, the `align` command **only supports agent mode**. This is because alignment requires:

- Analysis of existing package structure
- Intelligent decision-making about what to preserve vs. update
- Handling of edge cases and non-standard configurations
- Adaptive generation based on current state

**Characteristics:**
- 🤖 Uses `webiai@{version}-library-scaffolder` agent
- 🧠 Analyzes existing package structure
- ⏱️ Execution time: ~20-40s
- 💰 Consumes Kiro credits (~0.5-1.0 credits)
- 📋 Shows detailed plan before execution (unless `--auto-confirm`)

## Context Validation

The command validates:

1. **Library directory** — must run from library directory (has `package.json`)
2. **Valid platform** — platform must be `node` or `generic`
3. **Project root accessible** — can find project root with `webiai.config.mjs`

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `INVALID_CONTEXT` | Not running from library directory | Run from directory with `package.json` |
| `INVALID_PLATFORM` | Platform not `node` or `generic` | Use `--platform node` or `--platform generic` |
| `MISSING_PROJECT_ROOT` | Cannot find project root | Ensure library is within a WebIAI project |

## Execution Flow

1. **Validation** — verifies context and prerequisites
2. **Analysis** — reads blueprint and analyzes current package state
3. **Planning** — generates detailed alignment plan
4. **Confirmation** — waits for user approval (unless `--auto-confirm`)
5. **Execution** — updates/creates files to align with library structure

## What Gets Aligned

### Node Platform

- **package.json** — updates name, exports, scripts, devDependencies
- **webiai.config.mjs** — creates/updates with `artifact: "library"`
- **tsconfig.json** — creates/updates with proper extends path
- **src/index.ts** — creates if missing
- **src/env.ts** — creates if missing

### Generic Platform

- **package.json** — updates name and scripts
- **webiai.config.mjs** — creates/updates with `artifact: "library"`
- **README.md** — creates if missing

## Examples

### Align existing Node.js package

```bash
cd packages/libs/node/core
webiai library align --name libs.node.core --platform node
```

### Align with auto-confirm

```bash
cd packages/libs/generic/shared
webiai library align --name libs.generic.shared --platform generic --auto-confirm
```

## Next Steps

After aligning a library:

1. **Verify alignment:**
   ```bash
   webiai scan
   ```

2. **Install dependencies:**
   ```bash
   cd ../../../.. && webiai install
   ```

3. **Build:**
   ```bash
   webiai run build
   ```

## Related Commands

- `webiai library create` — create new library from scratch
- `webiai scan` — verify library structure
- `webiai install` — install dependencies
- `webiai run build` — build library

---

**Note:** Full implementation and detailed examples will be added after the command is implemented.
