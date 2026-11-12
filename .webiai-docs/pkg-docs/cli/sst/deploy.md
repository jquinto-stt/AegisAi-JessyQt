# wfai infra deploy

> **Note:** `wfai sst deploy` is a backward-compatible alias for `wfai infra deploy`. Both work identically.

Deploys the SST stack to AWS with automatic `.env` loading and stage resolution.

Replaces the shell pipeline:
```
dotenv -e .env -- sh -c 'sst deploy --stage=$SST_STAGE'
```

## Usage

    wfai infra deploy [options]

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--context <name>` | Target artifact by name (skip auto-detection) | — |
| `--stage <name>` | SST stage name | `$SST_STAGE` from env |
| `--env <file>` | Env file to load | `.env` |
| `--docker-enable-attestations` | Enable Docker buildx attestations | Disabled |

## Passthrough Options

These options are forwarded directly to the underlying SST process using the `--sst-*` prefix:

| Option | SST Equivalent | Description |
|--------|---------------|-------------|
| `--sst-target <resource>` | `--target` | Deploy only the specified resource(s) |
| `--sst-exclude <resource>` | `--exclude` | Exclude specific resource(s) from deploy |
| `--sst-continue` | `--continue` | Continue deploying on error |
| `--sst-dev` | `--dev` | Deploy in dev mode (keep dev resources) |
| `--sst-print-logs` | `--print-logs` | Show internal SST/Pulumi logs in stdout |

## What It Does

1. Loads `.env` file and resolves stage (via shared env-loader)
2. Sets `SST_LOCAL=false` (remote deploy operation)
3. Spawns `sst deploy --stage=<stage>`
4. Inherits stdio for interactive output

## Stage Resolution

Priority order:
1. `--stage` CLI option
2. `$SST_STAGE` environment variable
3. `SST_STAGE` from `.env` file

## Examples

    # Default: loads .env, uses $SST_STAGE
    wfai infra deploy

    # Override stage
    wfai infra deploy --stage Production

    # Use different env file
    wfai infra deploy --env .env.production

    # Target a specific artifact by name (from anywhere)
    wfai infra deploy --context cloud.core

    # Deploy only a specific resource
    wfai infra deploy --sst-target MyBucket

    # Exclude a resource from deploy
    wfai infra deploy --sst-exclude MySlowResource

    # Continue deploying even if some resources fail
    wfai infra deploy --sst-continue

    # Deploy in dev mode (keep dev resources like function live-reload)
    wfai infra deploy --sst-dev

    # Show internal SST/Pulumi logs
    wfai infra deploy --sst-print-logs

## Notes

- `SST_LOCAL` is explicitly set to `false` — this is a remote operation that deploys real AWS resources.
- `BUILDX_NO_DEFAULT_ATTESTATIONS=1` is set by default to prevent Docker buildx from generating attestation manifests during image builds. Some registries (ECR, private registries) have issues with multi-platform attestation manifests. Use `--docker-enable-attestations` to opt back in if your registry supports them.
- Signals (SIGINT, SIGTERM) are forwarded to the SST child process.
- The exit code from `sst deploy` is propagated.
