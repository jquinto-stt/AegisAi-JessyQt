# webiai sst install

Resolves the `@webiai/sdk.infra` package and ejects its precompiled types into `.sst/webiai/` for SST platform integration.

## Usage

    webiai sst install [options]

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--context <name>` | Target artifact by name (skip auto-detection) | — |
| `--target <dir>` | Target directory for ejected types | `.sst/webiai` |
| `--dry-run` | Show what would be done without writing | `false` |

## Context Resolution

Uses SST Context Resolution — walks up from `cwd` looking for `webiai.config.mjs` with `artifact: "infrastructure"` or `artifact: "bundle"`. For bundles, resolves to the connector directory. When `--context <name>` is provided, resolves the named artifact instead of walking up from `cwd`.

## Resolution Order

The `@webiai/sdk.infra` package is resolved automatically:

1. `.devlink/` store (walks up from cwd, checks versioned then flat layout)
2. npm registry (`npm pack` to a temp directory)

The version is auto-detected from the nearest `package.json` with name `@webiai/sdk.infra` or from `devlink.packages` in `webiai.config.mjs`.

## What It Does

1. Resolves SST context (infrastructure or bundle → connector)
2. Detects the version from devlink.packages or nearest package.json
3. Resolves `@webiai/sdk.infra` source package (store → npm)
4. Copies `dist/`, `src/sst.d.ts`, and `package.json` to target directory

## Examples

    # Install from auto-resolved source (store or npm)
    webiai sst install

    # Preview without writing files
    webiai sst install --dry-run

    # Custom target directory
    webiai sst install --target .sst/custom

    # Target a specific artifact by name (from anywhere)
    webiai sst install --context cloud.core

## Notes

- The source package must contain a precompiled `dist/` directory.
- Existing target directory is replaced completely on each install.
- When used via `webiai install` (the top-level command), the resolution and caching is handled centrally with `prepareSstCache()` for all SST targets at once.
