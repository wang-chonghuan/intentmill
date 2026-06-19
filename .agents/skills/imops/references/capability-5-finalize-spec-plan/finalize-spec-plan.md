# Capability 5: Finalize Spec And Plan

Use this reference to generate final `ticket-worktree-t2p refs path/im-spec.md` and `ticket-worktree-t2p refs path/im-plan.md`.

## Purpose

Turn the completed draft/grill context into two implementation-ready artifacts:

- `im-spec.md`: the confirmed requirement contract, answering what must be true after delivery.
- `im-plan.md`: the execution plan, answering how to implement and test the spec without drifting from existing contracts.

The first cause of these artifacts is to make cap6 converge on the intended delivery without ambiguity, misunderstanding, excess freedom, or implementation drift.

- `im-spec.md` exists to give cap6 a non-negotiable delivery contract.
- `im-plan.md` exists to give cap6 a constrained implementation and test route for that contract.

If either artifact looks complete but does not make cap6 less likely to drift, it has failed its reason to exist and must be rewritten.

Cap5 is not only a formatting step. It must perform a first-cause adversarial review before and after writing the artifacts. The output must be specific enough that a capable implementer can execute cap6 without inventing requirements, bypassing existing invariants, silently weakening confirmed requirements, or changing unrelated behavior.

Apply `references/common/spec-plan-dev-review-common-rules.md` for evidence and shared planning principles, then apply `references/common/spec-plan-artifact-rules.md` before writing final spec or final plan content.

## Required Inputs

- `ticket-worktree-t2p refs path/im-draft.md`
- `ticket-worktree-t2p refs path/im-grill.md`, when draft `## Grill Required` is `completed`
- ticket requirement context under `ticket-worktree-t2p path`
- issue worktree `AGENTS.md`
- issue worktree `.evodocs/constitution.md`
- `.evodocs/index.json`
- relevant `.evodocs/mod--*.md` files
- targeted code needed to understand affected contracts
- targeted existing tests, when they reveal behavioral contracts

If `im-draft.md` is missing, run cap3. If draft `## Grill Required` is `completed` and `im-grill.md` is missing, run cap4.

If any `im-grill.md` decision item has an empty or `TBD` `final_decision`, stop and return to cap4.

If `im-draft.md` has `## Grill Required` set to `yes`, stop and return to cap4 so grill decisions can be completed and reflected in the draft.

Cap5 may proceed only when `## Grill Required` is `completed` or `no`.

Before writing `im-spec.md` or `im-plan.md`, read `references/common/spec-plan-dev-review-common-rules.md` and `references/common/spec-plan-artifact-rules.md` from the imops skill directory.

## Output Paths

```text
ticket-worktree-t2p refs path/im-spec.md
ticket-worktree-t2p refs path/im-plan.md
```

Do not create or use `.intentmill/` for cap5. `ticket-worktree-t2p refs path` is the only valid IntentMill artifact directory for final spec and plan.

## Cap5 Workflow

Follow this order.

### 1. Validate Completion State

Confirm:

- `im-draft.md` exists.
- `im-grill.md` exists unless draft `## Grill Required` is `no`.
- `im-draft.md` `## Grill Required` is `completed` or `no`.
- `im-grill.md`, when present, contains no empty or `TBD` final decisions.
- No blocking open question remains in draft, grill, or requirement context.

If a blocking decision remains, stop and return to cap4. Do not paper over an unresolved decision in spec or plan.

### 2. Build Evidence Map

Create an internal evidence map before drafting. Do not write a separate artifact unless the user asks.

The evidence map must cover, when relevant:

- original requirement intent and explicit scope
- confirmed grill decisions
- out-of-scope or rejected options
- affected modules, services, APIs, prompts, UI surfaces, jobs, schemas, configs, dependencies, and tests
- existing runtime contracts such as state machines, tool or callback ordering, lifecycle transitions, validation/repair loops, retry limits, timeout behavior, exception mapping, persistence shape, idempotency, authorization, privacy, tracing, logging, and compatibility behavior
- shared wrappers, helpers, schemas, config, or SSOT files that other consumers already use
- external SDK/API/cloud behavior that must be verified through the repo-required docs workflow

Treat code and existing tests as evidence for behavioral contracts even when the ticket requirement does not spell them out.

### 3. Prepare Gate Context Package

Prepare an internal context package for gate5 and, when the host supports it, for an independent subagent reviewer. Do not write a separate artifact unless the user asks.

The context package must be concrete enough for a reviewer to answer the first-cause question without relying on cap5's unstated assumptions:

- what `im-spec.md` and `im-plan.md` were created to achieve for cap6
- the authoritative source of truth and supporting sources
- the generated spec and plan outputs
- confirmed decisions and rejected options
- relevant evidence from draft, grill, requirement, evodocs, targeted code, and existing tests
- boundaries between spec and plan, scope and non-scope, requirements and implementation
- likely drift risks, including vague wording, missing contracts, weak test plans, silent fallback, shared-consumer regressions, and excessive implementation freedom
- hard shape checks that still must pass

The exact context is issue-specific; include only material needed to judge whether these artifacts achieve their purpose.

### 4. Run First-Cause Adversarial Review Before Drafting

Before writing final artifacts, ask:

- What were `im-spec.md` and `im-plan.md` created to achieve for cap6?
- Could cap6 follow them and still miss that goal because of ambiguity, misunderstanding, too much freedom, or drift?
- Would a capable implementer know exactly which existing behaviors must be preserved?
- Are critical existing contracts promoted into explicit spec requirements instead of being hidden in vague phrases?
- Are there state machines, validation gates, lifecycle rules, retry/repair paths, exception mappings, data contracts, permission checks, privacy controls, or shared-wrapper contracts that could be bypassed if not named?
- Are confirmed requirements weakened by words such as "if possible", "where supported", "likely", "may", "optional", "best effort", or "consider"?
- Does any implementation uncertainty need a fail-fast rule rather than an optional fallback?
- Could shared helper/config/schema/API changes break unrelated consumers?
- Does the test plan cover the highest-risk regressions and not only the happy path?

If cap6 could follow the planned artifacts and still miss their first cause, rewrite the artifacts before gate5. If the answer reveals a missing blocking decision, return to cap4. If it reveals missing evidence, return to cap3 or inspect the targeted code before continuing. If it reveals an artifact-quality gap, fix it in the spec/plan you are about to write.

### 5. Write `im-spec.md`

Use this top-level structure:

```markdown
# IntentMill Spec

## Intent

## Scope

## Non-Scope

## Requirements

## Critical Existing Contracts

## Confirmed Decisions

## Compatibility And Regression Constraints

## Open Questions
```

#### Intent

State the user/business intent in concise declarative language.

#### Scope

List what this issue owns. Scope must be independently deliverable.

#### Non-Scope

List adjacent work that is explicitly out of scope, including rejected options from grill decisions.

#### Requirements

Declare what must be true after delivery. Use the common spec requirements from `references/common/spec-plan-artifact-rules.md`, including input/output contracts, state/data requirements, UI/API/prompt/config/dependency/service requirements, and lifecycle behaviour only when confirmed by the tech issue, evodocs/code facts, targeted code, existing tests, or grill decisions.

Do not write implementation steps.

#### Critical Existing Contracts

Promote implementation-relevant existing behavior into explicit delivery constraints. Include only contracts that matter for this issue, such as:

- state machines and required state variables
- ordering of tools, callbacks, jobs, UI transitions, API calls, or lifecycle steps
- validation gates and quality checks
- retry, repair, timeout, cancellation, and partial-success behavior
- exception and error mapping
- persistence shape, schema, data compatibility, and idempotency
- authorization, permission, privacy, trace, logging, and audit boundaries
- shared wrapper/helper/config/schema contracts relied on by existing consumers
- prompt or model-output contracts that must remain compatible

This section exists to prevent cap6 from replacing a working contract with a simpler-looking implementation that satisfies the headline requirement but breaks behavior.

Each listed contract should help achieve the spec's first cause. Avoid generic contracts that do not protect the delivery goal or prevent a concrete drift path.

#### Confirmed Decisions

Copy or summarise `final_decision` values from `im-grill.md` that final implementation must obey.

#### Compatibility And Regression Constraints

Declare existing behaviours and contracts that must remain compatible, including unrelated consumers of shared modules touched by the plan.

#### Open Questions

This section must be:

```text
None.
```

If a blocking open question remains, do not write a final spec; return to cap4.

### 6. Write `im-plan.md`

Use this top-level structure:

```markdown
# IntentMill Plan

## Source Contract

## Implementation Approach

## Implementation Drift Controls

## Phases

## Unit Test Plan

## Handoff Expectations
```

#### Source Contract

Reference `im-spec.md` as the only requirement contract. Mention `im-draft.md` and `im-grill.md` only as background.

#### Implementation Approach

Describe the implementation strategy in terms of modules, contracts, sequencing, reuse, and boundaries. Use the common plan requirements from `references/common/spec-plan-artifact-rules.md`. Do not add requirements.

Do not compress critical behavior into vague umbrella phrases. If a state machine, validation gate, error path, data shape, permission boundary, or shared-wrapper behavior must be preserved, name the behavior or explicitly point to the spec section that names it.

#### Implementation Drift Controls

List the controls that prevent cap6 from drifting from `im-spec.md`. This section must include, when relevant:

- what existing contracts cannot be bypassed
- which confirmed requirements are mandatory and what must happen if implementation-time verification shows they cannot be expressed
- which shared consumers or adjacent flows must not regress
- which rejected options must not reappear
- which implementation shortcuts are disallowed because they would violate spec or compatibility
- which uncertainties must fail fast or be recorded in `im-handoff.md` instead of silently falling back

If a confirmed requirement depends on an SDK, cloud service, framework, database, or other external component, the plan must say how cap6 should verify support through the repo-required docs workflow or static code evidence. Confirmed requirements must not be weakened into optional behavior.

Each drift control should be tied to the plan's first cause: enabling cap6 to implement and test the spec without ambiguity, misunderstanding, unnecessary freedom, or silent fallback.

#### Phases

Use numbered phases with concrete steps. Each step should name expected changes or inspections and a verification point.

Every phase that touches a shared wrapper, helper, schema, config, API, prompt, service, or lifecycle path must include a regression check for existing consumers or explicitly state why no other consumer exists.

#### Unit Test Plan

Describe where ticket-scoped unit tests should live under `ticket-worktree-t2p tests path`, which existing tests are relevant, and which commands should be run when known.

The unit test plan must include high-risk assertions, not only happy-path coverage. Cover, when relevant:

- confirmed config/model/prompt/API parameters actually reaching the integration boundary
- state-machine ordering and required gates
- validation/repair/retry/timeout/error behavior
- exception mapping and partial-success behavior
- permission, privacy, trace, logging, and data-leakage boundaries
- persistence/data-shape compatibility
- shared wrapper/helper/schema/config/API consumers that could regress
- rejected options staying absent

If a high-risk behavior cannot be covered by unit tests, the plan must say why and identify the closest lower-level static, contract, or integration check available inside cap6.

#### Handoff Expectations

Describe that cap6 must write `ticket-worktree-t2p refs path/im-handoff.md` after development. The handoff should summarize actual changes at feature/module/file granularity, state whether implementation differs from `im-spec.md` or `im-plan.md` and why, list any missed user-review points that should have been grilled earlier, and record residual issues or future improvements.

Do not instruct cap6 to return to cap4 for new decisions after cap4 has completed.

### 7. Run Internal First-Cause Drift Review After Drafting

Before running gate5, review the generated `im-spec.md` and `im-plan.md` from the perspective of an implementer who might take shortcuts.

Fail your own cap5 output and rewrite it when:

- cap6 could follow the artifacts and still miss the delivery goal
- either artifact exists as shape-complete content but lacks existential justification
- a spec requirement can be satisfied while bypassing an important existing contract
- a plan step uses umbrella wording that hides required ordering, state, validation, compatibility, or error behavior
- a confirmed requirement is weakened with optional language
- an uncertain implementation detail is allowed to silently degrade
- shared code can be changed without a corresponding regression check
- the test plan lacks assertions for the highest-risk behavior
- the artifacts contain stale evidence references, deleted rule files, local absolute paths, or machine-specific paths

Only proceed to gate5 after this review passes.

## Rules

- Apply `references/common/spec-plan-artifact-rules.md`.
- Apply `references/common/spec-plan-dev-review-common-rules.md`.
- `im-spec.md` owns what to build.
- `im-plan.md` owns how to build and test it.
- `im-plan.md` must not add, reinterpret, or expand requirements beyond `im-spec.md`.
- Options rejected by `final_decision` values in `im-grill.md` must not reappear in `im-plan.md`.
- Confirmed requirements must be written as mandatory requirements. Do not use optional language to hide implementation uncertainty.
- Implementation uncertainty must become a fail-fast condition, a verification step, a handoff item, or a cap4 decision. It must not become silent fallback behavior.
- Existing critical contracts discovered in targeted code or tests must appear in `im-spec.md` or be explicitly ruled irrelevant.
- High-risk behaviors must have tests or explicit cap6 verification steps.
- Do not write any IntentMill artifact outside `ticket-worktree-t2p refs path`.
- Do not generate AutoQA ac-cases.
- Do not run t2p-review.
- Do not generate PRs.

## Gate

After writing both files, run `references/gate-5-finalize-spec-plan/gate.md`. For substantial semantic review, prefer an independent subagent when the host supports it, and give it the gate context package prepared by cap5.

If gate5 fails and the problem can be repaired without user input, rerun cap5 with gate findings as constraints. If gate5 finds a blocking unresolved decision, stop and return to cap4.
