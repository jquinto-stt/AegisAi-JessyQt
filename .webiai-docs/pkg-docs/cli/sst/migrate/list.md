# wfai infra migrate list

Lists available database migration Lambda functions discovered from Pulumi state.

## Usage

    wfai infra migrate list [options]

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--json` | Output as JSON array | `false` |
| `--stage <name>` | SST stage name | `$SST_STAGE` |
| `--env <file>` | Env file to load | `.env` |

## What It Does

1. Exports Pulumi state for the current stage
2. Finds all resources of type `wfai:mongodb:MigrationLambdaComponent`
3. For each component, resolves the child `aws:lambda/function:Function` to get the AWS function name and ARN
4. Displays results

## Examples

    # List database migration Lambdas
    wfai infra migrate list

    # JSON output
    wfai infra migrate list --json

## Output Format

Default:
```
Found 1 database migration Lambda(s):

  Name:     MongoMigration@Core
  Function: HCAMSWS-DevUCA-MongoMigrationFunction
  ARN:      arn:aws:lambda:us-east-1:123456789:function:...
```

JSON mode outputs an array of `{ name, urn, functionName, functionArn }` objects.

## Notes

- The logical name (e.g., `MongoMigration@Core`) is extracted from the Pulumi URN.
- If the Lambda hasn't been deployed yet, `Function` and `ARN` will show `(not found)`.
