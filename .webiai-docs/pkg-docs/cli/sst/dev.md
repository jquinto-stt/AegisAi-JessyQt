# wfai infra dev

> **Note:** `wfai sst dev` is a backward-compatible alias for `wfai infra dev`. Both work identically.

Runs SST in dev mode with automatic `.env` loading, stage resolution, and log filtering.

Replaces the shell pipeline:
```
dotenv -e .env -- sh -c 'sst dev --stage=$SST_STAGE --mode=mono 2>&1 | wfai infra logs filter'
```

## Usage

    wfai infra dev [options]

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--context <name>` | Target artifact by name (skip auto-detection) | — |
| `--stage <name>` | SST stage name | `$SST_STAGE` from env |
| `--env <file>` | Env file to load | `.env` |
| `--raw` | Skip log filtering, show raw output | `false` |
| `--verbose` | Enable verbose output for both wfai and SST (symmetric) | `false` |
| `--print-logs` | Pass `--print-logs` to SST (shows internal SST/Pulumi logs in stdout) | `false` |
| `--logs-dir <path>` | Log output directory | `.sst/log/webiai` |

## Passthrough Options

These options are forwarded directly to the underlying SST process using the `--sst-*` prefix:

| Option | SST Equivalent | Description |
|--------|---------------|-------------|
| `--sst-mode <mode>` | `--mode` | SST execution mode (default: `mono`, overridable) |
| `--sst-print-logs` | `--print-logs` | Show internal SST/Pulumi logs in stdout |

> `--mode=mono` is the default and does not need to be specified explicitly. Use `--sst-mode` only to override it (e.g., `--sst-mode=basic`).

## What It Does

1. Loads `.env` file and resolves stage (via shared env-loader)
2. Injects `SST_LOCAL=true` into the environment
3. Spawns `sst dev --stage=<stage> --mode=mono` (with `--print-logs` if requested)
4. Filters output: colorizes `[SST]`, `[Function]`, `[Other]` tags
5. Splits logs into separate files:
   - `<logs-dir>/sst.log` — SST deployment and config logs (no ANSI)
   - `<logs-dir>/function.log` — Lambda function logs (no ANSI)

## Stage Resolution

Priority order:
1. `--stage` CLI option
2. `$SST_STAGE` environment variable
3. `SST_STAGE` from `.env` file

## Examples

    # Default: loads .env, uses $SST_STAGE
    wfai infra dev

    # Override stage
    wfai infra dev --stage MyStage

    # Use different env file
    wfai infra dev --env .env.production

    # Raw output (no filtering)
    wfai infra dev --raw

    # Target a specific artifact by name (from anywhere)
    wfai infra dev --context srv.data

    # Show internal SST/Pulumi logs (useful for debugging provider issues)
    wfai infra dev --print-logs

    # Verbose mode (symmetric: enables verbose for both wfai and SST)
    wfai infra dev --verbose

    # Override SST mode (default is mono)
    wfai infra dev --sst-mode=basic

    # Passthrough: enable SST print-logs via --sst-* prefix
    wfai infra dev --sst-print-logs

## Notes

- After starting, use `wfai infra logs tail sst -f` or `wfai infra logs tail fn -f` to follow logs in another terminal.
- If you modify a dev command or its injected variables, SST may need 2-3 full restarts to pick up changes. A hot reload alone is usually not enough.
- Signals (SIGINT, SIGTERM) are forwarded to the SST child process.
- `--print-logs` is useful for debugging Pulumi provider resolution, plugin loading, and resource creation errors that are normally hidden from the filtered output.
- `--verbose` is symmetric: it enables verbose output for both the wfai wrapper and the underlying SST process.
- `--mode=mono` is the default SST mode. Override with `--sst-mode` if needed.
