# webiai project align

Align an existing npm project to WebIAI monorepo structure. Generates configuration files and updates `package.json` to match WebIAI conventions.

## Usage

```bash
# Interactive mode (prompts for scope and name)
webiai project align

# Non-interactive mode
webiai project align --scope <org> --name <project>

# Auto-confirm (skip confirmation prompt)
webiai project align --scope myorg --name myproject --auto-confirm

# Silent mode
webiai project align --scope myorg --name myproject --auto-confirm --silent
```

## Options

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--scope <scope>` | Organization name (npm scope) | Yes (or interactive) | — |
| `--name <name>` | Project name | Yes (or interactive) | — |
| `--auto-confirm` | Skip confirmation prompt | No | `false` |
| `--force` | Skip context validation | No | `false` |
| `--silent` | Silent mode (minimal output) | No | `false` |

## Context Validation

The command validates that you're running from an npm project root:

- Current directory must contain `package.json`
- `package.json` must be valid JSON

Use `--force` to skip validation (not recommended).

## What It Does

1. **Validates context** — ensures you're in a project root
2. **Prompts for confirmation** — shows what will be generated (unless `--auto-confirm`)
3. **Invokes Kiro agent** — uses `project-scaffolder` agent to generate files
4. **Generates files:**
   - `webiai.config.mjs`
   - `lerna.json`
   - `tsconfig.json`
   - Updates `package.json`

## Generated Files

### webiai.config.mjs

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

### lerna.json

```json
{
  "version": "0.1.0",
  "packages": []
}
```

### tsconfig.json

Shared TypeScript configuration with:
- `target: "ES2022"`
- `module: "NodeNext"`
- `strict: true`
- Decorator support
- Declaration maps

### package.json Updates

Adds/updates:
- `name: "@scope/project"`
- `private: true`
- `engines: { node: ">=22.0.0" }`
- `workspaces: []`
- `overrides: { "google-protobuf": "3.21.2" }`
- Base dependencies (`@webiai/*` packages)

## Agent-Based Generation

This command uses the Kiro `project-scaffolder` agent, which:

1. **Validates context** — ensures monorepo root
2. **Reads existing files** — preserves existing configuration
3. **Generates files** — creates missing files
4. **Updates package.json** — merges with existing content
5. **Reports results** — shows what was created/updated

## Use Cases

### Convert existing npm project

```bash
cd my-existing-project
webiai project align --scope myorg --name myproject
```

### Automated CI/CD setup

```bash
webiai project align --scope myorg --name myproject --auto-confirm --silent
```

### Fix broken project structure

```bash
# Force alignment even if validation fails
webiai project align --scope myorg --name myproject --force
```

## Execution Flow

1. **Load context** — read current directory
2. **Validate** — check for `package.json` (unless `--force`)
3. **Prompt** — ask for scope/name if not provided
4. **Confirm** — show plan and ask for confirmation (unless `--auto-confirm`)
5. **Invoke agent** — run Kiro `project-scaffolder` agent
6. **Report** — show generated files

## Context Validation Details

The command uses `validateNpmProjectContext()` which:

- Walks up from current directory
- Looks for `package.json`
- Validates JSON structure
- Returns project root path

This ensures you're running from a valid npm project, even if it doesn't have `webiai.config.mjs` yet.

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `Not in npm project root` | No `package.json` found | Run from project root or use `--force` |
| `Invalid package.json` | Malformed JSON | Fix `package.json` syntax |
| `Agent invocation failed` | Kiro agent error | Check Kiro installation and credentials |
| `Missing scope or name` | Required params not provided | Provide `--scope` and `--name` or use interactive mode |

## Comparison with `project init`

| Feature | `project init` | `project align` |
|---------|---------------|-----------------|
| **Target** | New project | Existing project |
| **Creates directory** | Yes (with `--dir-name`) | No |
| **Runs npm init** | Yes | No |
| **Validates empty** | Yes | No |
| **Validates npm project** | No | Yes |
| **Generation mode** | Deterministic or agent | Agent only |
| **Use case** | Start from scratch | Convert existing |

## Examples

### Basic alignment
```bash
cd my-project
webiai project align --scope acme --name api
```

### Non-interactive
```bash
webiai project align --scope acme --name api --auto-confirm
```

### Silent mode for scripts
```bash
webiai project align --scope acme --name api --auto-confirm --silent
```

### Force alignment
```bash
# Skip validation (use with caution)
webiai project align --scope acme --name api --force
```

## Next Steps

After alignment:

1. **Review generated files** — check `webiai.config.mjs`, `lerna.json`, etc.
2. **Install dependencies:**
   ```bash
   webiai install --mode dev
   ```
3. **Validate structure:**
   ```bash
   webiai scan
   ```
4. **Add workspaces** — update `workspaces` in `package.json` if you have packages

## Related Commands

- `webiai project init` — initialize new project
- `webiai install` — setup dependencies
- `webiai scan` — validate structure
