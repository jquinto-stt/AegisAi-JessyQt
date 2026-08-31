# webiai bundle align

Align an existing bundle artifact to WebIAI bundle structure.

## Usage

```bash
# Agent mode (default for align)
webiai bundle align --agent

# Plan-only mode (show changes without applying)
webiai bundle align --agent --plan-only
```

## Options

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `--agent` | Use agent-based alignment | No | `true` |
| `--plan-only` | Show plan without executing | No | `false` |

## When to Use

- Converting existing code to bundle structure
- Updating bundle to latest blueprint version
- Verifying bundle compliance
- Testing alignment without making changes (`--plan-only`)

## Execution Context

Must be executed from the bundle directory (root of sub-monorepo):

```bash
cd packages/{category}/{name}
webiai bundle align --agent
```

## Validation

Command validates:
- ✅ Executed from bundle directory
- ✅ `package.json` exists
- ✅ `webiai.config.mjs` exists with `artifact: "bundle"`
- ✅ Connector directory exists

## Alignment Process

1. **Analysis** — Agent reads blueprint and compares with current state
2. **Plan Generation** — Creates list of required changes
3. **User Confirmation** — Shows plan and asks for approval (unless `--plan-only`)
4. **Execution** — Applies changes to files

## Scope

Current alignment covers:
- ✅ Bundle configuration (`webiai.config.mjs`)
- ✅ Bundle package.json (workspaces, naming)
- ✅ Bundle tsconfig.json
- ✅ Connector structure (sst.config.ts, package.json, src/app.ts, src/env.ts)
- ❌ Software modules (not yet implemented)

## Plan-Only Mode

Use `--plan-only` to preview changes without applying them:

```bash
webiai bundle align --agent --plan-only
```

**Output:**
- Shows detailed plan
- Lists files to create/modify
- Returns `"next": "none"` (no execution)
- Useful for CI/CD validation

## Examples

```bash
# Align bundle
cd packages/services/data
webiai bundle align --agent

# Preview alignment plan
webiai bundle align --agent --plan-only

# Verify idempotence (should report no changes)
webiai bundle create --category services --name test
cd packages/services/test
webiai bundle align --agent --plan-only
# Expected: "ALREADY_ALIGNED"
```

## Expected Responses

### Already Aligned

```json
{
  "success": true,
  "code": "ALREADY_ALIGNED",
  "message": "El bundle artifact ya está completamente alineado...",
  "phase": "analysis",
  "next": "none"
}
```

### Changes Required

```json
{
  "success": true,
  "code": "PLAN_READY",
  "phase": "planning",
  "next": "user_confirm",
  "data": {
    "plan": {
      "actions": [...]
    }
  }
}
```

## Idempotence

Bundle commands are 100% idempotent:

```bash
# Create bundle
webiai bundle create --category services --name data

# Align should report no changes
cd packages/services/data
webiai bundle align --agent --plan-only
# Output: "ALREADY_ALIGNED"
```

This is verified by automated tests in:
- `bin/commands/bundle/__tests__/idempotence-deterministic.kiro.spec.md`
- `bin/commands/bundle/__tests__/idempotence-agent.kiro.spec.md`

## Related Commands

- `webiai bundle create` — Create new bundle
- `webiai scan` — Verify structure
- `webiai dev` — Start development

## Blueprint

Follows specification in `blueprints/scaffolding/bundle-v2.md` (v2).
