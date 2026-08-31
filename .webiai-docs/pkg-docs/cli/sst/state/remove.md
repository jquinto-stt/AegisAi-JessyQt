# wfai infra state remove

Removes a resource from Pulumi state by URN. Proxies `sst state remove` with automatic env loading.

## Usage

    wfai infra state remove <urn> [options]

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `<urn>` | Resource URN to remove | Yes |

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--stage <name>` | SST stage name | `$SST_STAGE` |
| `--env <file>` | Env file to load | `.env` |

## Examples

    # Remove a resource by URN
    wfai infra state remove "urn:pulumi:DevUCA::HCAMSWS::aws:dynamodb/table:Table::MyTable"

    # With specific stage
    wfai infra state remove "urn:pulumi:..." --stage Production

## Notes

- Use `wfai infra state find` to discover URNs first.
- This only removes the resource from Pulumi's state tracking. It does not delete the actual AWS resource.
- Exit code matches the underlying `sst` command.
