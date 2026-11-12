# webiai sst logs filter

Reads SST dev output from stdin, colorizes tags, and splits logs into separate files by type.

## Usage

    sst dev --mode=mono 2>&1 | webiai sst logs filter [options]

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--dir <path>` | Log output directory | `.sst/log/webiai` |

## Tag Colors

| Tag | Color | Log File |
|-----|-------|----------|
| `[SST]` | Cyan | `sst.log` |
| `[Function]` | Yellow | `function.log` |
| `[Other]` | Green | `sst.log` |

## What It Does

1. Reads lines from stdin
2. Detects `[TagName]` prefix at start of each line
3. Colorizes the tag for terminal display
4. Routes the line (stripped of ANSI) to the appropriate log file
5. Continuation lines (no tag) are routed to the same file as the last tagged line

## Output Files

- `<dir>/sst.log` — SST deployment, config, infrastructure logs
- `<dir>/function.log` — Lambda function invocation logs

Both files are written without ANSI escape codes.

## Examples

    # Default usage (piped from sst dev)
    sst dev --mode=mono 2>&1 | webiai sst logs filter

    # Custom log directory
    sst dev --mode=mono 2>&1 | webiai sst logs filter --dir /tmp/logs

## Notes

- This command is typically not used directly. `webiai sst dev` uses it internally.
- Handles broken pipe gracefully (e.g., when piped to `head`).
- Log files are overwritten on each run (flag `w`).
