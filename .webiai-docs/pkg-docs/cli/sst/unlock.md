# wfai infra unlock

> **Note:** `wfai sst unlock` is a backward-compatible alias for `wfai infra unlock`. Both work identically.

Unlocks a stuck Pulumi state with automatic `.env` loading and stage resolution.

Replaces the shell pipeline:
```
dotenv -e .env -- sh -c 'sst unlock --stage=$SST_STAGE --mode=mono'
```

## Usage

    wfai infra unlock [options]

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
| `--sst-print-logs` | `--print-logs` | Show internal SST/Pulumi logs in stdout |

## What It Does

1. Loads `.env` file and resolves stage (via shared env-loader)
2. Spawns `sst unlock --stage=<stage> --mode=mono`
3. Inherits stdio for interactive output

## Stage Resolution

Priority order:
1. `--stage` CLI option
2. `$SST_STAGE` environment variable
3. `SST_STAGE` from `.env` file

## When to Use

Pulumi can get stuck with a lock if a deploy is interrupted mid-execution:

```
error: the stack is currently locked by 1 lock(s)
```

Running `wfai infra unlock` releases the lock so you can deploy again.

## Examples

    # Default: loads .env, uses $SST_STAGE
    wfai infra unlock

    # Override stage
    wfai infra unlock --stage Production

    # Target a specific artifact by name (from anywhere)
    wfai infra unlock --context srv.data

    # Show internal SST/Pulumi logs during unlock
    wfai infra unlock --sst-print-logs

## Notes

- Does not manage `SST_LOCAL` — inherits whatever is in the environment.
- Signals (SIGINT, SIGTERM) are forwarded to the SST child process.
- The exit code from `sst unlock` is propagated.
