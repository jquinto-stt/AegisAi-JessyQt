# wfai infra state export

Exports the full Pulumi state as JSON. Proxies `sst state export` with automatic env loading.

## Usage

    wfai infra state export [options]

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--stage <name>` | SST stage name | `$SST_STAGE` |
| `--env <file>` | Env file to load | `.env` |

## Examples

    # Export state to stdout
    wfai infra state export

    # Save to file
    wfai infra state export > state.json

    # With specific stage
    wfai infra state export --stage Production

## Notes

- Output is the raw JSON from `sst state export`.
- Useful for debugging or piping into other tools (e.g., `jq`).
- Exit code matches the underlying `sst` command.
