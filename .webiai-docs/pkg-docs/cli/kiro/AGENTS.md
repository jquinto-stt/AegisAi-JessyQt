# WebIAI Kiro Commands

Commands for managing Kiro agents provided by the WebIAI SDK.

## Command Overview

| Command | Description | Docs |
|---------|-------------|------|
| `webiai kiro install` | Install Kiro agents from SDK | [install.md](./install.md) |
| `webiai kiro login` | Authenticate with Kiro CLI | [login.md](./login.md) |

## When to Use

- **After SDK installation** → `webiai kiro install --cli` (installs CLI + agents)
- **Manual reinstallation** → `webiai kiro install`
- **Authentication** → `webiai kiro login` (shows how to authenticate)
- **Troubleshooting agents** → `webiai kiro install`

## Available Agents

The WebIAI SDK provides specialized Kiro agents for project scaffolding and management:

### Project Scaffolder

**Name:** `webiai@0.4.0-project-scaffolder`

**Purpose:** Scaffolds WebIAI project structure with proper configuration files.

**Used by:**
- `webiai project align` — aligns existing projects
- `webiai project init --agent` — initializes new projects (agent mode)

**Generates:**
- `webiai.config.mjs` — project configuration
- `lerna.json` — Lerna monorepo setup
- `tsconfig.json` — TypeScript configuration
- Updates `package.json` with WebIAI structure

## Installation Process

The installation process consists of three phases:

1. **Convert** — Transform `.md` agent definitions to `.yml` format
2. **Build** — Compile `.yml` to `.json` format for Kiro
3. **Install** — Register agents with Kiro CLI

## Automatic vs Manual Installation

### Automatic (Recommended)

The SDK includes a `postinstall` hook that automatically installs agents when you install the package:

```bash
npm install -g @webiai/sdk.cli
# Agents are automatically installed
```

### Manual

Use the CLI command when you need to reinstall:

```bash
webiai kiro install
```

## Agent Versioning

Agents are versioned with the SDK version:

```
webiai@0.4.0-project-scaffolder
         ↑       ↑
    SDK version  Agent name
```

When you update the SDK, new agent versions are installed alongside old ones, allowing backward compatibility.

## Related Commands

- `webiai project init` — uses agents for project initialization
- `webiai project align` — uses agents for project alignment

## Troubleshooting

### Agents not found

If Kiro can't find WebIAI agents:

```bash
webiai kiro install
```

### Wrong agent version

After updating the SDK, reinstall agents:

```bash
npm install -g @webiai/sdk.cli@latest
webiai kiro install
```

### Permission errors

Check Kiro configuration directory permissions:

```bash
ls -la ~/.kiro/agents/
```
