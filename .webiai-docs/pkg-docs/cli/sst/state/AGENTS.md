# State Commands — Agent Guide

> **Note:** These commands are accessible via both `wfai infra state` and `wfai sst state` (backward-compatible alias).


Commands for inspecting and managing Pulumi state. Useful for debugging infrastructure, finding resource URNs, and cleaning up state after failed deployments.

## Commands

| Command | Description | Docs |
|---------|-------------|------|
| `sst state find` | Search resources by URN pattern or type | `docs cli/sst/state/find` |
| `sst state export` | Export full Pulumi state as JSON | `docs cli/sst/state/export` |
| `sst state remove` | Remove a resource from state by URN | `docs cli/sst/state/remove` |

## When to Use

- `find` — Locate resources by name or type (e.g., find all DynamoDB tables, find a specific Lambda)
- `export` — Dump full state for offline analysis or backup
- `remove` — Remove orphaned resources from state tracking (does not delete the actual AWS resource)

## Shared Infrastructure

All state commands use `state-helper.mjs` which provides:
- `exportState(stage)` — Runs `sst state export` and parses JSON
- `getResources(state)` — Extracts resource array from state
- `nameFromUrn(urn)` — Extracts human-readable name from Pulumi URN

All commands support `--stage` and `--env` options via the shared env-loader.
