# wfai infra — Infrastructure Commands

Provider-agnostic infrastructure lifecycle commands. Replaces `wfai sst` with the same functionality but decoupled naming.

## Commands

| Command | Description | SST Equivalent |
|---------|-------------|----------------|
| `wfai infra dev` | Local development mode | `sst dev` |
| `wfai infra deploy` | Deploy to cloud | `sst deploy` |
| `wfai infra remove` | Destroy stack | `sst remove` |
| `wfai infra refresh` | Sync state with cloud | `sst refresh` |
| `wfai infra unlock` | Unlock stuck state | `pulumi cancel` |
| `wfai infra install` | Install SST types | `sst install` |
| `wfai infra state` | Inspect Pulumi state | — |
| `wfai infra migrate` | Database migrations | — |

## Shared Options (all lifecycle commands)

| Option | Description |
|--------|-------------|
| `--stage <name>` | Stage name (resolved: flag → $SST_STAGE → .env) |
| `--app <name>` | Override SST_APP config chain |
| `--stack <name>` | Override SST_STACK config chain |
| `--env <file>` | Custom .env file (default: .env) |
| `--context <name>` | Target artifact by name |
| `--verbose` | Verbose output (symmetric: wfai + SST) |

## Passthrough Options (--sst-*)

Options prefixed with `--sst-` are passed directly to SST as native flags:

| wfai flag | SST flag | Available on |
|-----------|----------|--------------|
| `--sst-mode <value>` | `--mode` | dev |
| `--sst-print-logs` | `--print-logs` | all |
| `--sst-target <name>` | `--target` | deploy, remove, refresh |
| `--sst-exclude <name>` | `--exclude` | deploy, refresh |
| `--sst-continue` | `--continue` | deploy |
| `--sst-dev` | `--dev` | deploy, refresh |

## Pipeline (shared by all lifecycle commands)

1. Resolve context (scan → EnrichedTree → artifact detection)
2. Load .env into process.env
3. Resolve SST config (app, stack) via precedence chain
4. Resolve stage
5. Inject environment variables
6. Build SST args (direct + passthrough)
7. Spawn SST binary with stdio: inherit

## Stage Resolution

Stage is resolved in this order (first wins):

1. `--stage <name>` CLI flag
2. `$SST_STAGE` environment variable
3. `SST_STAGE` from `.env` file

If no stage can be resolved, the command exits with an error and instructions.

## Context Resolution

All lifecycle commands support `--context <name>` to target a specific artifact by name from anywhere in the monorepo. Without `--context`, the command walks up from `cwd` to find the nearest infrastructure artifact.

```bash
# Deploy from anywhere in the monorepo
wfai infra deploy --context cloud.core --stage dev

# Dev mode for a specific connector
wfai infra dev --context srv.data
```

## Backward Compatibility

`wfai sst` still works and is functionally identical. `wfai infra` is the preferred form going forward. All subcommands, options, and behavior are the same between the two.

## Source

`src/commands/infra/index.ts`
