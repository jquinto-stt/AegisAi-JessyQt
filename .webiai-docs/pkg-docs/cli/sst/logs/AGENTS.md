# Logs Commands — Agent Guide

Commands for filtering and tailing SST log output. Used during development to monitor SST deployments and Lambda function invocations.

## Commands

| Command | Description | Docs |
|---------|-------------|------|
| `sst logs filter` | Read stdin, colorize tags, split into log files | `docs cli/sst/logs/filter` |
| `sst logs tail` | Tail SST or function log files | `docs cli/sst/logs/tail` |

## Log File Structure

Log files are written to `.sst/log/webiai/` (configurable via `--dir`):

| File | Content |
|------|---------|
| `sst.log` | SST deployment, config, and resource logs (no ANSI codes) |
| `function.log` | Lambda function invocation logs (no ANSI codes) |

## How It Works

The `filter` command reads SST dev output from stdin and:
- Colorizes tags: `[SST]` (cyan), `[Function]` (yellow), `[Other]` (green)
- Splits output into `sst.log` and `function.log` based on tag
- Strips ANSI codes from log files

The `tail` command reads the log files and supports follow mode (`-f`) for real-time monitoring.

## Typical Usage

`filter` is used internally by `webiai sst dev`. For standalone use:

```bash
sst dev --mode=mono 2>&1 | webiai sst logs filter
```

`tail` is used in a separate terminal while dev is running:

```bash
webiai sst logs tail sst -f    # Follow SST logs
webiai sst logs tail fn -f     # Follow function logs
```
