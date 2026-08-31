# wfai init

Bootstrap the CLI into a WebIAI project.

## Usage

```bash
wfai init [options]
```

## Options

| Option | Description |
|--------|-------------|
| `--json` | Output result as JSON |
| `--upgrade` | Align sdk.version to the running CLI version |
| `--devlink-package <path>` | Install DevLink from a local tarball (development) |

## What it does

1. Detects invocation mode (link vs install)
2. Validates sdk.version >= 0.18.0
3. If --upgrade and CLI version > sdk.version: updates config
4. Installs/links the CLI into devDependencies
5. Installs DevLink as devDependency
6. Verifies delegation (resolveEffectiveBinary)

## Modes

- **Link mode**: When CLI is invoked by direct path AND sdk.version matches CLI version → uses `file:` protocol
- **Install mode**: All other cases → `npm install -D --save-exact @webiai/sdk.cli@<version>`

## Prerequisites

- A valid `webiai.config.mjs` with `artifact: "project"` at the project root
- `sdk.version` field in the config (>= 0.18.0)

## JSON Output

```json
{
  "success": true,
  "mode": "link",
  "cliVersion": "0.18.0",
  "sdkVersion": "0.18.0",
  "versionMatch": true,
  "linkCandidate": true,
  "localBinaryVersion": "0.18.0",
  "localBinaryPath": "node_modules/.bin/wfai",
  "devlinkVersion": "~2.7.0"
}
```

## Relationship to Install

`wfai init` must be run before `wfai install`. The install command checks init status as its first step and will fail if the CLI and DevLink are not properly bootstrapped.

Typical first-time setup flow:

```bash
wfai init
wfai install --mode dev
```

## Source

`src/commands/init/index.ts`
