# wfai infra state find

Searches resources in Pulumi state by URN pattern.

## Usage

    wfai infra state find [pattern] [options]

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `[pattern]` | Filter resources by URN pattern (case-insensitive) | No |

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--type <pattern>` | Filter by resource type (case-insensitive substring) | — |
| `--json` | Output as JSON array | `false` |
| `--stage <name>` | SST stage name | `$SST_STAGE` |
| `--env <file>` | Env file to load | `.env` |

## What It Does

1. Loads env and resolves stage (silent mode)
2. Runs `sst state export --stage=<stage>` to get Pulumi state
3. Filters resources by URN pattern and/or type
4. Displays results with Name, Type, and URN

## Examples

    # List all resources
    wfai infra state find

    # Filter by URN pattern
    wfai infra state find mongo

    # Filter by resource type
    wfai infra state find --type dynamodb

    # Combine pattern and type filter
    wfai infra state find migration --type lambda

    # JSON output
    wfai infra state find mongo --json

## Output Format

Default (human-readable):
```
Found 3 resource(s) matching "mongo":

  Name: MongoMigration@Core
  Type: wfai:mongodb:MigrationLambdaComponent
  URN:  urn:pulumi:DevUCA::HCAMSWS::...
```

JSON mode outputs an array of `{ name, type, urn }` objects.

## Notes

- Pattern matching is URN-only (case-insensitive substring match).
- Type filtering is also case-insensitive substring match on the resource type field.
- The `name` is extracted from the last `::` segment of the URN.
