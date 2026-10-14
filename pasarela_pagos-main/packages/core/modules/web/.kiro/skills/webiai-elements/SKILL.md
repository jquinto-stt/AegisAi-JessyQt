---
name: webiai-elements
description: >
  Skill for interacting with the WebiAI Elements MCP — a component search, recommendation,
  and packaging system for UI development. Includes the Advisory Flow (requirement →
  discovery → refine → implement), project scaffolding, and direct lookup. Use when you
  need to search for components, build a new UI, or understand the Elements catalog.
allowed-tools:
  - mcp_webiai_elements_ui_dsl
  - mcp_webiai_elements_ui_requirement
  - mcp_webiai_elements_ui_discovery
  - mcp_webiai_elements_ui_refine
  - mcp_webiai_elements_ui_implement
  - mcp_webiai_elements_ui_lookup
  - mcp_webiai_elements_ui_scaffolding
---

# WebiAI Elements MCP — Skill Guide

## Step 0: Contextualization (MANDATORY)

Before using any tool, read the descriptions of ALL available tools from this MCP.
The descriptions contain full documentation: parameters, flows, rules, and relationships
between tools. Do not guess — read the descriptions.

The tools are:
- `mcp_webiai_elements_ui_dsl`
- `mcp_webiai_elements_ui_requirement`
- `mcp_webiai_elements_ui_discovery`
- `mcp_webiai_elements_ui_refine`
- `mcp_webiai_elements_ui_implement`
- `mcp_webiai_elements_ui_lookup`
- `mcp_webiai_elements_ui_scaffolding`

## What the system is

An MCP that exposes a catalog of UI components with semantic search, AI-powered
recommendation, and packaging for download.

## Entry Points (5)

### 1. Full Advisory Flow (greenfield — text description)
```
ui_dsl → ui_requirement(prompt) → ui_discovery → ui_refine × N → ui_implement
```
When the user describes a UI they want to build from scratch.

### 2. Brownfield Advisory Flow (existing design → components)
```
ui_dsl → ui_requirement(prompt + design) → ui_discovery → ui_refine × N → ui_implement
```
When a Design DSL already exists (e.g. from OpenPencil/Stitch) and you need to find
components to materialize it. Requires calling `ui_dsl` FIRST to understand the grammar.

### 3. Standalone Refine (single specific component)
```
ui_refine(intent="description of the component I need")
```
Skips requirement and discovery. Describe a single component and refine searches/ranks.
Then pass the chosen CNAME to ui_implement.

### 4. Direct Implement (you already know the CNAMEs)
```
ui_implement(select=[{cname:"Button"}, {cname:"Modal"}], commit=true)
```
No Advisory Flow needed. You know exactly which components you want. Just package them.

### 5. Scaffolding (new project)
```
ui_scaffolding()
```
Returns the base project package (shell, config, utils, icons, layouts) to bootstrap a
project. Includes a bash recipe to download and extract. ALWAYS create an empty directory
first.

## When to use each entry point

| Situation | Entry point |
|-----------|-------------|
| "Build a dashboard page with metrics and charts" | Full Advisory Flow (#1) |
| "I have this mockup/DSL, what components do I need" | Brownfield Advisory Flow (#2) |
| "I need a date picker with range selection" | Standalone Refine (#3) |
| "Give me Button and Modal packaged" | Direct Implement (#4) |
| "I want to start a new project with Elements" | Scaffolding (#5) |
| "Does a toast component exist?" | `ui_lookup` (not a flow entry point) |

## Critical rules

1. **ui_lookup is NOT for building UIs.** Only for verifying existence. To build, use the
   Advisory Flow or standalone refine.

2. **ALWAYS show the DSL to the user.** When `ui_requirement` returns a Design DSL,
   present it verbatim. Never summarize it.

3. **ui_dsl is a prerequisite for ui_requirement with a `design` param.** If you are
   passing an existing DSL, call `ui_dsl()` first to understand the grammar.

4. **ui_discovery consumes a requirement session.** Pass the session_id from requirement.

5. **ui_refine has two start modes:**
   - From discovery: `ui_refine(session_id="<discovery>", intent_id="<id>")`
   - Standalone: `ui_refine(intent="free-text description")`

6. **ui_implement is an accumulative cart.** You can make multiple select/drop calls before
   commit. Commit generates the final package.

7. **ui_scaffolding is a COMPLETE project.** Contains package.json, vite config, tailwind,
   the shell (sidebar, header, menu), layouts, utils, hooks, and icons. Extract into an
   EMPTY directory — never over an existing project.

## Catalog taxonomies

| Taxonomy | What it is | Examples |
|----------|-----------|----------|
| `element` | Atomic reusable component | Button, Alert, Card, Input, Table |
| `composition` | Functional composition of elements | MetricCard, ChatBox, EmailSidebar |

## Session model

```
ui_requirement  → multi-turn session (prompt → questions → refinement → DSL)
ui_discovery    → consumes requirement session, produces intents with candidates
ui_refine       → own session per intent (ranking → conversation → selection)
ui_implement    → cart (select/drop × N → commit → package URL)
```

Sessions are independent. You can have multiple refine sessions in parallel (one per
intent). Implement accumulates from any source.

## Model profile

Some tools accept an optional `profile` parameter. Do NOT pass it unless the user
explicitly requests a specific profile. It can only be set on the first call of a
session and cannot be changed after.
