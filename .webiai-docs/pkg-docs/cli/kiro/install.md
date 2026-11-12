# webiai kiro install

Install Kiro agents from the WebIAI SDK package. Optionally installs Kiro CLI if not present.

## Usage

```bash
# Install agents (requires Kiro CLI already installed)
webiai kiro install

# Install Kiro CLI + agents
webiai kiro install --cli
```

## Requirements

- **Without `--cli`**: Kiro CLI must be already installed
- **With `--cli`**: No requirements, installs everything

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--cli` | Install Kiro CLI if not present | `false` |

## What It Does

### Without `--cli` flag

Requires Kiro CLI to be already installed. If not found, exits with error.

Then executes the `agents:kiro` npm script from the WebIAI SDK package:

1. **Converts agents** — transforms `.md` agent definitions to `.yml` format
2. **Builds agents** — compiles `.yml` to `.json` format
3. **Installs agents** — registers agents with Kiro CLI
4. **Checks authentication** — verifies if user is logged in and shows warning if not

### With `--cli` flag

1. **Checks Kiro CLI** — verifies if `kiro-cli` command is available
2. **Installs Kiro CLI** (if not found) — runs `curl -fsSL https://cli.kiro.dev/install | bash`
3. **Installs agents** — same as above (converts, builds, installs)
4. **Checks authentication** — verifies if user is logged in and shows warning if not

## Execution Flow

### Basic (requires Kiro CLI installed)
```
webiai kiro install
  ↓
Check if kiro-cli exists
  ↓
[If not found] Exit with error
  ↓
npm run agents:kiro (in SDK root)
  ↓
npm run kiro-agents:md2yml    # Convert .md → .yml
  ↓
npm run kiro-agents:build     # Build .yml → .json
  ↓
npm run kiro-agents:install   # Install to Kiro
  ↓
Check authentication (kiro-cli whoami)
  ↓
[If not authenticated] Show warning
```

### With CLI installation
```
webiai kiro install --cli
  ↓
Check if kiro-cli command exists
  ↓
[If not found] curl -fsSL https://cli.kiro.dev/install | bash
  ↓
npm run agents:kiro (in SDK root)
  ↓
[same as above: md2yml → build → install]
  ↓
Check authentication (kiro-cli whoami)
  ↓
[If not authenticated] Show warning
```

## Output

### Without `--cli` flag (Kiro installed, authenticated)
```bash
📦 Installing Kiro agents...

> @webiai/sdk.cli@0.4.0 agents:kiro
> npm run kiro-agents

📦 Convirtiendo 3 agentes a YAML (versión 0.4.0)...
✓ project-scaffolder → webiai@0.4.0-project-scaffolder.yml

🔨 Construyendo 1 agentes JSON...
✓ webiai@0.4.0-project-scaffolder.yml → webiai@0.4.0-project-scaffolder.json

📦 Instalando 1 agentes en Kiro...
✓ webiai@0.4.0-project-scaffolder.json instalado

✓ Kiro agents installed successfully

📋 Installed WebIAI agents:

   ✓ webiai@0.4.0-project-scaffolder

✓ Authenticated with Kiro
```

### Without `--cli` flag (Kiro NOT installed)
```bash
❌ Kiro CLI is not installed
   Install it with: webiai kiro install --cli
   Or manually: curl -fsSL https://cli.kiro.dev/install | bash
```

### Without `--cli` flag (not authenticated)
```bash
📦 Installing Kiro agents...
[installation output]

✓ Kiro agents installed successfully

📋 Installed WebIAI agents:

   ✓ webiai@0.4.0-project-scaffolder

⚠️  Not authenticated with Kiro
   For Kiro integration to work, you must authenticate.
   Run: webiai kiro login
```

### With `--cli` flag (Kiro not installed)
```bash
⚠️  Kiro CLI not found

📥 Installing Kiro CLI...

[Kiro installation output]

✓ Kiro CLI installed successfully

📦 Installing Kiro agents...
[installation output]

✓ Kiro agents installed successfully

📋 Installed WebIAI agents:

   ✓ webiai@0.4.0-project-scaffolder

⚠️  Not authenticated with Kiro
   For Kiro integration to work, you must authenticate.
   Run: webiai kiro login
```

## When to Use

- **First-time setup** → `webiai kiro install --cli` (installs CLI + agents)
- After installing or updating `@webiai/sdk.cli` globally → `webiai kiro install`
- When agent definitions have been updated → `webiai kiro install`
- To reinstall agents after Kiro CLI updates → `webiai kiro install`
- When troubleshooting agent availability issues → `webiai kiro install`

## Available Agents

After installation, the following agents are available:

| Agent | Name | Description |
|-------|------|-------------|
| Project Scaffolder | `webiai@0.4.0-project-scaffolder` | Scaffolds WebIAI project structure |

## Automatic Installation

The SDK package includes a `postinstall` hook that automatically runs `agents:kiro` when the package is installed. This command is useful for:

- Manual reinstallation
- Troubleshooting
- Development workflows

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `Kiro CLI is not installed` | Kiro CLI not found (without `--cli`) | Use `--cli` flag or install manually |
| `npm run agents:kiro exited with code 1` | Script execution failed | Check npm and Kiro CLI installation |
| `Kiro CLI installation failed` | Network or permission error | Check internet connection and permissions |
| `Not authenticated with Kiro` (warning) | User not logged in | Run `webiai kiro login` |

## Related Commands

- `webiai project init --agent` — uses installed Kiro agents
- `webiai project align` — uses installed Kiro agents

## Examples

### First-time setup (install everything)
```bash
webiai kiro install --cli
```

### Reinstall agents only
```bash
webiai kiro install
```

### After SDK update
```bash
npm install -g @webiai/sdk.cli@latest
webiai kiro install
```

## Manual Alternative

You can also run the script directly from the SDK package:

```bash
cd $(npm root -g)/@webiai/sdk.cli
npm run agents:kiro
```

Or install Kiro CLI manually:

```bash
curl -fsSL https://cli.kiro.dev/install | bash
```

## Development

For SDK development, additional scripts are available:

```bash
npm run kiro-agents:md2yml    # Convert only
npm run kiro-agents:build     # Build only
npm run kiro-agents:install   # Install only
npm run kiro-agents:remove    # Remove agents
npm run kiro-agents:clean     # Clean build artifacts
```
