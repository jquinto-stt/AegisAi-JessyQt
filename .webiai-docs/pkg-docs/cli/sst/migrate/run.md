# wfai infra migrate run

Invokes a migration Lambda function to execute database migrations.

## Usage

    wfai infra migrate run [action] [options]

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `[action]` | Migration action | `status` |

## Valid Actions

| Action | Description |
|--------|-------------|
| `status` | Show current migration status (applied, pending) |
| `up` | Apply all pending migrations |
| `down` | Rollback the last applied migration |
| `down:block` | Rollback the last applied migration (blocking mode) |
| `reset` | Reset all migrations (rollback everything) |

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--name <name>` | Logical name of the migration Lambda | Auto-select if only one |
| `--quiet` | Output only result JSON | `false` |
| `--region <region>` | AWS region | `$AWS_REGION` or `us-east-1` |
| `--profile <name>` | AWS CLI profile | — |
| `--stage <name>` | SST stage name | `$SST_STAGE` |
| `--env <file>` | Env file to load | `.env` |

## Lambda Selection

- If only one migration Lambda exists in state, it is auto-selected.
- If multiple exist, the command fails with a list and example command:
  ```
  ✗ Multiple database migration Lambdas found. Use --name to select one.

    Available database migration Lambdas:
      MongoMigration@Core  →  HCAMSWS-DevUCA-MongoMigrationFunction

    Example: wfai infra migrate run up --name MongoMigration@Core
  ```

## Examples

    # Check migration status (default action)
    wfai infra migrate run

    # Apply pending migrations
    wfai infra migrate run up

    # Rollback last migration
    wfai infra migrate run down

    # Select specific Lambda
    wfai infra migrate run up --name MongoMigration@Core

    # JSON output only
    wfai infra migrate run status --quiet

## SST Dev Wrapper Detection

When running in SST dev mode, the Lambda invoke goes through SST's dev wrapper. If SST dev is not running, the command detects the wrapper response (`statusCode: 500`) and shows:

```
  ✗ SST returned 500: sst dev is not running...
    Start the dev environment first: wfai infra dev
```

## Notes

- Uses `aws lambda invoke` under the hood (requires AWS CLI).
- The `--profile` option is passed directly to the AWS CLI.
- The `down:block` action sends `{ action: "down", block: true }` as payload.
