---
inclusion: always
version: 0.25.8
---

<!--
  Webi.AI DevTools — Steering File
  © 2026 Unlimitech Cloud LLC. All rights reserved.

  This file is auto-managed by the Webi.AI DevTools MCP server.
  DO NOT EDIT MANUALLY — changes will be overwritten on the next version update.
  To update: run the MCP discovery tool, which will detect if a newer version
  is available and replace this file automatically.
-->

# Webi.AI DevTools — MCP Bridge

The Webi.AI DevTools MCP is the bridge between the agent and the development environment. It controls the lifecycle of project artifacts: query state, run processes, view logs, diagnose errors, verify deployments, and search code semantically.

## Rule: Discovery BEFORE any tool

**BEFORE invoking any `mcp_webiaidevtools_*` tool, run `mcp_webiaidevtools_discovery`.**

This is not optional. The Discovery loads into context:

- **Operational workflows** — mandatory sequences (e.g. always stop runtime before unlock/refresh)
- **Verification recipes** — an exit code of 0 does not guarantee success, logs must be inspected
- **Console channel guide** — which channel to read depending on the problem (log:engine, log:pulumi, cmd:dev, mod:*, cmd:{command})
- **Troubleshooting** — diagnosing stack locked, state drift, failed deployments
- **Deployment lifecycle** — how to track redeployments with lastUpdateId snapshots
- **Semantic search** — parameters, filters, completeness strategies, and dynamic limits

Without the Discovery, the agent can call tools by name but operates without knowing the correct sequences, post-execution verifications, or diagnostic patterns. This leads to errors like running unlock with the runtime active or assuming a deployment succeeded without verifying logs.

### When to run

- **First interaction of the session** involving infrastructure, processes, logs, artifact state, or code search
- No need to re-run in the same session if already loaded
- When in doubt, run it — it's idempotent and cheap


---

## Rule: Semantic search (`search`) as primary exploration tool

### When to use `search` vs native tools

| Need | Tool | Why |
|------|------|-----|
| Conceptual exploration ("where are payments handled?") | `search` | Understands intent, no need to guess keywords |
| Architecture discovery ("which artifacts touch enrollment?") | `search` | Results grouped by artifact with structured context |
| Find a page/component by function | `search` | Finds `CompletedPage` when searching "thank you page" |
| Exact identifier lookup | `grepSearch` | Exhaustive, 100% of occurrences |
| Refactoring ("where is `clearStripeCheckout` used?") | `grepSearch` | Exact text matching |
| Search in configs, JSONs, .env, markdown | `grepSearch` | `search` only indexes code via AST |
| Verify completeness after exploration | `grepSearch` | Complements semantic with exhaustiveness |

### Recommended pattern: Semantic first, grep to verify

```
1. search(projectId, "concept or question")
   → Discovers the relevant files and symbols

2. If exhaustiveness is needed:
   grepSearch("DiscoveredIdentifier", includePattern: "**/discovered/path/**")
   → Verifies no occurrences are missing
```

### Rules for using `search`

**R1: Omit `limit` on the first call.** The tool computes a dynamic default proportional to the project size. Only pass an explicit `limit` if the results feel insufficient.

**R2: Use `filter.keywords` to reinforce the search.** When domain-specific terms are known (e.g. "stripe", "checkout", "payment"), passing them as BM25 keywords dramatically improves precision. Without keywords, a purely vector search may return 0 results if the embedding doesn't have enough overlap.

**R3: Don't rely on semantic search alone for exhaustiveness.** `search` returns the *most relevant*, not *all*. For tasks that require finding every occurrence (refactoring, auditing), always complement with `grepSearch`.

**R4: Trust the structured context in the response.** Each result includes `artifact`, `module`, `taxonomy`, `target` (symbol ancestry). Use that information to orient yourself without needing exploratory `listDirectory` + `readFile` calls.

**R5: If `search` returns 0 results, don't assume it doesn't exist.** It may be an indexing issue. Verify with `grepSearch` as a fallback, and consider `index_refresh` if the index seems outdated.

### Efficiency impact

- **Conceptual exploration:** ~60-70% fewer steps vs. iterative grep + exploratory reading
- **Cross-artifact discovery:** Finds relationships between artifacts that grep cannot discover without prior knowledge of the structure
- **Immediate context:** Eliminates the need for `listDirectory` → `readFile` → "oh, that wasn't it" → repeat
- **Precise lookup:** 0% improvement — grep remains superior for exact text search


---

## Rule: Code documentation for semantic discoverability

Every piece of code the agent generates MUST be documented following these rules. This is not optional — undocumented code is invisible to semantic search and harder for humans to maintain.

### R1: File header comment — MANDATORY on every file

The first thing after imports. Format: `Name — One-line description` followed by an optional short paragraph with context, relationships, or constraints.

```typescript
/**
 * CheckoutCompleted — SNS subscriber for Stripe checkout.session.completed events.
 *
 * Extracts enrollmentSessionId from Stripe metadata, transitions the session
 * to 'paid' status, and dispatches a confirmation email via the email queue.
 * Idempotent: duplicate webhooks are detected and skipped.
 */
```

Without this, the file-level vector embedding has no semantic signal and `search` cannot find the file by concept.

### R2: Exported symbols — JSDoc with purpose and contract

Every exported function, class, interface, type, and const MUST have JSDoc. Describe the *purpose* (what and why), not the *implementation* (how). Include `@param` with domain semantics and `@returns` with the contract.

```typescript
/**
 * Transitions an enrollment session to 'paid' status.
 *
 * Idempotent — if the session is already paid (duplicate webhook),
 * skips the update and returns the existing state.
 *
 * @param sessionId - DynamoDB partition key for the enrollment session
 * @param stripeEvent - Raw Stripe checkout.session.completed event
 * @returns The updated session, or the existing one if already paid
 */
export async function markSessionPaid(sessionId: string, stripeEvent: StripeEvent): Promise<EnrollmentSession> {
```

### R3: Internal symbols — At least a one-line comment

Every non-exported function, class, helper, or significant const MUST have at least one comment line describing what it does in domain terms.

```typescript
/** Validates that the Stripe event contains the required metadata fields. */
function validateEventMetadata(event: StripeEvent): asserts event is ValidatedStripeEvent {
```

### R4: Sequence comments inside long functions

Functions longer than ~15 lines MUST have numbered step comments that narrate the logical sequence. Each logical block is preceded by a comment explaining the step.

```typescript
async function handleCheckoutCompleted(event: SNSEvent): Promise<void> {
  // 1. Extract and validate the Stripe event from the SNS message
  const stripeEvent = parseStripeEvent(event.Records[0].Sns.Message);

  // 2. Look up the enrollment session from the event metadata
  const sessionId = stripeEvent.metadata.enrollmentSessionId;
  const session = await dao.findById(sessionId);

  // 3. Guard: skip if already processed (idempotent webhook handling)
  if (session.status === 'paid') {
    logger.info('Session already paid, skipping duplicate webhook', { sessionId });
    return;
  }

  // 4. Transition session to paid and record Stripe details
  await dao.updateStripe(sessionId, {
    checkoutSessionId: stripeEvent.id,
    paymentStatus: 'paid',
    paidAt: new Date().toISOString(),
  });

  // 5. Dispatch confirmation email via SQS
  await emailQueue.send({ type: 'payment_completed', sessionId, email: session.lead.email });
}
```

### R5: Semantic naming — Code reads like prose

Variables, functions, and classes MUST read as natural English phrases. Names reflect the business domain, not technical mechanics. Cryptic abbreviations are prohibited.

```typescript
// ❌ Prohibited
const s = await db.get(id);
if (s.st === 'p') return;
await db.upd(id, { st: 'p' });

// ✅ Required
const enrollmentSession = await dao.findById(sessionId);
if (enrollmentSession.status === 'paid') return;
await dao.markAsPaid(sessionId, { paidAt: new Date().toISOString() });
```

### R6: Guards and edge cases documented inline

Every early return, guard clause, or edge case handling MUST have a comment explaining *why* it exits, not just *what* it checks.

```typescript
// Guard: Stripe may send duplicate webhooks for the same event — skip if already processed
if (existingSession.stripe?.checkoutSessionId === stripeEvent.id) {
  return existingSession;
}
```

### R7: OpenAPI documentation for endpoint controllers — OPTIONAL, user-assisted

This rule applies **only** when the file is an HTTP endpoint controller (a class with `@Endpoint` decorators). It is not required for services, DAOs, models, utilities, or Lambda handlers.

OpenAPI documentation on controllers serves two audiences: the semantic index (richer embeddings for API-related queries) and the generated Swagger/OpenAPI spec consumed by frontend developers and API consumers.

**When this rule applies:** The agent detects that a file contains `@Endpoint` decorators or imports from `@webiai/sdk.openapi`. When it does, the agent MUST enter an **assisted documentation flow** with the user — it does NOT auto-generate OpenAPI decorators silently.

#### Assisted flow

The agent walks the user through each aspect of the OpenAPI documentation, proposing values inferred from the code and asking for confirmation or correction. The flow follows this sequence:

**Step 1 — Tag classification**
Propose the `@ApiUseTag` value based on the module or domain area. Ask the user to confirm or provide the correct tag.

```
Inferred tag: "Invitations" (from module name).
Is this correct, or should it be something else?
```

**Step 2 — Operation identity**
Propose `@ApiOperationId` (camelCase, unique across the API) and `@ApiOperationSummary` (short, human-readable). The operationId should follow the pattern `{verb}{Resource}` (e.g. `acceptInvitation`, `createTenant`, `listUsers`).

```
Proposed:
  operationId: "acceptInvitation"
  summary: "Accept an invitation"
Confirm or adjust?
```

**Step 3 — Operation description**
Propose `@ApiOperationDescription` — a one-paragraph description of what the endpoint does, its preconditions, and its side effects. This is the most important field for semantic discoverability.

```
Proposed description:
  "Transitions a pending invitation to accepted state. Accepts either
   { userId } for existing users or { user: { email, password } } for
   new user registration via Auth0."
Confirm, expand, or rewrite?
```

**Step 4 — Security requirements**
Propose `@ApiSecurityRequirement` based on whether the endpoint requires authentication. Most endpoints use `{ bearerAuth: [] }`. Public endpoints (e.g. health checks) omit this decorator.

```
This endpoint requires authentication: @ApiSecurityRequirement({ bearerAuth: [] })
Correct?
```

**Step 5 — Path parameters**
For each path parameter (extracted from the `@Endpoint` route), propose an `@ApiParameter` with name, location (`in: 'path'`), description, required flag, and schema type.

```
Path parameter detected: "token"
Proposed:
  @ApiParameter({
    name: 'token', in: 'path',
    description: 'Invitation token UUID',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
Confirm or adjust?
```

**Step 6 — Query parameters** (if applicable)
Same as path parameters but with `in: 'query'`. Skip this step if the endpoint has no query parameters.

**Step 7 — Request body**
If the endpoint accepts a body (POST, PUT, PATCH), propose the `@ApiRequestBody` with content type and schema. The schema can reference a `$ref` to a shared component or be defined inline.

```
Request body detected from AcceptBody interface:
  Content-Type: application/json
  Schema: { user: { email: string, password?: string } }
Should this reference a shared schema ($ref) or be inline?
```

**Step 8 — Response codes and bodies**
For each possible HTTP response (success + errors), propose an `@ApiResponse` with status code, description, and response schema. Walk through them one by one:

```
Responses detected from the code:
  200 — Invitation accepted (token, email, tenantId, type, status)
  400 — Validation error (missing token, invalid body, password too short, etc.)
  404 — Invitation not found or email mismatch
  500 — Internal server error
Want to adjust any descriptions or add/remove response codes?
```

**Step 9 — Review and apply**
Present the complete set of decorators as a preview. The user confirms, and the agent applies them to the code.

#### Rules for the assisted flow

- **Never auto-generate OpenAPI decorators without user interaction.** The agent proposes, the user confirms.
- **Infer as much as possible from the code** — read the method body, the interfaces, the error responses, and the route definition to minimize what the user needs to type.
- **One step at a time.** Don't dump all 9 steps in a single message. Walk through them conversationally.
- **If decorators already exist**, audit them for completeness against the 9 steps and only ask about missing or incomplete aspects.
- **The description (Step 3) is the highest-value field** for semantic search. Invest effort in making it rich and domain-specific.
- **Error codes should include the `code` field** when the controller returns structured error objects (e.g. `{ error: string, code: string }`). Document the possible `code` values in the response description.

#### Example — Complete OpenAPI decoration

```typescript
@ApiUseTag('Invitations')
class AcceptInvitation {

  @Endpoint(EP.$AcceptInvitation)
  @ApiOperationId('acceptInvitation')
  @ApiOperationSummary('Accept an invitation')
  @ApiOperationDescription(
    'Transitions a pending invitation to accepted state. ' +
    'Accepts { user: { email, password } } for new user registration ' +
    'or { user: { email } } for authenticated users via IDP.',
  )
  @ApiSecurityRequirement({ bearerAuth: [] })
  @ApiParameter({
    name: 'token',
    in: 'path',
    description: 'Invitation token UUID',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse(200, {
    description: 'Invitation accepted',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/InvitationToken' },
      },
    },
  })
  @ApiResponse(400, {
    description: 'Validation error — codes: MISSING_TOKEN, INVALID_BODY, ...',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
      },
    },
  })
  @ApiResponse(404, { description: 'Invitation not found or email mismatch' })
  @ApiResponse(500, { description: 'Internal server error' })
  async handle(ctx: Context) {
```


### Why this matters

These rules have a dual purpose:
- **For humans:** code reads as documentation, reduces onboarding time and review friction
- **For the semantic index:** file comments, JSDoc, and sequence comments become text that the embedding model captures. Well-documented code is found by `search` using business concepts ("payment webhook handler") instead of only technical identifiers


### Strategy: Context-aware documentation via `search`

When documenting a file, **do not document it in isolation**. Use `search`, `grepSearch`, and `readFile` to discover the file's relationships before writing any documentation. This applies to every file type — controllers, models, DAOs, services, stores, pages, factories, Lambda handlers, utilities — and to every documentation rule (R1 through R7).

The goal: produce documentation that describes not just *what* the file does, but *where it fits* in the system.

#### Workflow

**Step 1 — Read the file.** Understand its internal logic, imports, and exported symbols.

**Step 2 — Discover relationships.** Use `search` with queries derived from the file's imports, class names, and domain concepts to find:
- **Who consumes this file** — callers, importers, route registrations, DI wiring
- **What this file depends on** — models, DAOs, services, clients, shared utilities
- **What domain concepts it participates in** — state machines, workflows, data flows
- **Sibling files in the same module** — related files that share context or conventions

Then **deepen with `grepSearch` and `readFile`** where `search` gives you the direction but not the detail:
- **Exact usages** — `grepSearch("ClassName", includePattern: "**/factories/**")` to find every place that references the symbol by name
- **State machines and enums** — `grepSearch("Status.Pending")` to find all places that check or transition the same status, revealing the full lifecycle
- **Error codes and constants** — `grepSearch("ERROR_CODE")` to see if other files use the same codes, ensuring consistency in the documentation
- **Shared interfaces and contracts** — `readFile` on the model/interface files discovered by `search` to extract field names, types, and JSDoc that should be referenced
- **Config and environment** — `grepSearch("ENV_VAR_NAME", includePattern: "**/env.ts")` to discover environment dependencies worth mentioning

The pattern is: **`search` for discovery (find the right files), `grepSearch` for exhaustiveness (find every occurrence), `readFile` for detail (understand the contract).**

**Step 3 — Synthesize context into documentation.** Use the discovered relationships to enrich whichever rules apply to the file:
- **R1 (file header)** — mention callers, consumers, the module it belongs to, and the domain flow it participates in
- **R2/R3 (symbol JSDoc)** — reference related entities by name so the embedding captures cross-file relationships
- **R4 (sequence comments)** — use domain terms from the model's state machine or workflow steps, not just generic descriptions
- **R6 (guard comments)** — explain *why* in terms that reference the model's constraints (e.g. "only pending tokens can transition — see Status enum")
- **R7 (OpenAPI)** — use the discovered route, parameters, and response shapes to propose accurate decorators
- **"Related files" section** in the header — list discovered files with relative paths so future readers (and the semantic index) can navigate the dependency graph

#### Examples

The same workflow applies regardless of file type. Here are three different scenarios:

**Documenting a controller** — search for its Lambda proxy, route registration, endpoint definition, and the models it operates on. The header mentions the HTTP route, the caller, and the entities it provisions.

**Documenting a model/DAO** — search for which controllers, services, and Lambda functions consume it. The header mentions who reads/writes this entity and what state transitions are valid. Guard comments in the DAO reference the status enum.

**Documenting a store or page component** — search for which API client methods it calls, which routes render it, and which other stores it depends on. The header mentions the user-facing flow step it represents and the API endpoints it consumes.

In all cases, the agent runs 2–4 `search` queries + targeted `grepSearch` calls before writing a single line of documentation.

#### Concrete example — Controller

```
1. search("InvitationToken model DAO status transitions")
   → Discovers the model (Status enum, isExpired) and DAO (findByToken, transition)

2. search("accept invitation Lambda proxy endpoint route")
   → Discovers the Lambda wiring, API Gateway route, and path definition

3. grepSearch("AcceptInvitation", includePattern: "**/factories/**")
   → Confirms the exact route registration (POST /user/:token/accept)

4. grepSearch("Status.Pending", includePattern: "**/invitation-token/**")
   → Reveals the full status lifecycle: Pending → Accepted | Rejected | Revoked | Expired

5. readFile on the model file
   → Extracts interface fields, Type enum, and expiration logic
```

This produces a header that references the Lambda proxy, the route, the model, and the related files — instead of a generic description of the file's internal logic.

#### Why this produces better embeddings

When the file header and JSDoc mention related files, entity names, module names, and route paths, the embedding model captures those terms as part of the file's semantic signature. This means:
- Searching for "invitation Lambda proxy" finds both the proxy AND the controller
- Searching for "where is UserTenantCompany created" finds the controller even though `UserTenantCompany` is defined in a different artifact
- Searching for "POST /user/:token/accept" finds the controller via the route mentioned in the header

Without cross-referencing, each file is an island. With it, the semantic index becomes a navigable graph.
