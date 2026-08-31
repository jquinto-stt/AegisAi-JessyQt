# wfai infra remove

> **Note:** `wfai sst remove` is a backward-compatible alias for `wfai infra remove`. Both work identically.

Removes all SST stack resources from AWS with automatic `.env` loading and stage resolution.

Replaces the shell pipeline:
```
dotenv -e .env -- sh -c 'sst remove --stage=$SST_STAGE'
```

## Usage

    wfai infra remove [options]

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--context <name>` | Target artifact by name (skip auto-detection) | — |
| `--stage <name>` | SST stage name | `$SST_STAGE` from env |
| `--env <file>` | Env file to load | `.env` |

## Passthrough Options

These options are forwarded directly to the underlying SST process using the `--sst-*` prefix:

| Option | SST Equivalent | Description |
|--------|---------------|-------------|
| `--sst-target <resource>` | `--target` | Remove only the specified resource(s) |
| `--sst-print-logs` | `--print-logs` | Show internal SST/Pulumi logs in stdout |

## What It Does

1. Loads `.env` file and resolves stage (via shared env-loader)
2. Does not manage `SST_LOCAL` — inherits whatever is in the environment
3. Spawns `sst remove --stage=<stage>`
4. Inherits stdio for interactive output

## Stage Resolution

Priority order:
1. `--stage` CLI option
2. `$SST_STAGE` environment variable
3. `SST_STAGE` from `.env` file

## Examples

    # Default: loads .env, uses $SST_STAGE
    wfai infra remove

    # Override stage
    wfai infra remove --stage Production

    # Use different env file
    wfai infra remove --env .env.production

    # Target a specific artifact by name (from anywhere)
    wfai infra remove --context srv.web

    # Remove only a specific resource
    wfai infra remove --sst-target MyBucket

    # Show internal SST/Pulumi logs during removal
    wfai infra remove --sst-print-logs

## Notes

- Does not manage `SST_LOCAL` — inherits whatever is in the environment.
- This command removes **all** resources provisioned by the stack. Use with caution.
- Signals (SIGINT, SIGTERM) are forwarded to the SST child process.
- The exit code from `sst remove` is propagated.
