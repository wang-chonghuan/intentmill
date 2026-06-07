# Capability 11: Review IntentMill Issue Artifacts

Use this reference when reviewing local IntentMill artifacts before they drive Codex execution or any planning-system update. This is a semantic quality gate, not a deterministic linter.

## Objective

Decide whether the available local refs are ready for downstream agent work. The gate should catch shallow, ungrounded, path-unsafe, over-scoped, or implementation-leaking artifacts before they become execution prompts.

This is a host-LLM semantic review. Mechanical format checks are necessary but not sufficient. An artifact that has the right headings and fields must still fail if it is vague, generic, ungrounded, not actionable, not testable, or unlikely to help the next real workflow.

By default, write the review to:

```text
.t2p/tickets/<ISSUE-ID>/refs/im-gate.md
```

If the user asks for chat-only review, report the same findings in the response instead of writing the file.

## Review Targets

Cap11 supports two modes:

- `all`: review all available generated refs under `.t2p/tickets/<ISSUE-ID>/refs/`. This is the default when the user does not specify a target.
- targeted: review one or more named artifacts after a generation cap completes.

Allowed targeted artifacts:

- `im-req-engineered.md`
- `im-req-summarized.md`
- `im-ac.md`
- `im-solution.md`
- `im-estimation.md`

When cap11 is called immediately after a generation cap:

- After cap3, target `im-req-engineered.md` and `im-req-summarized.md`.
- After cap4, target `im-ac.md`.
- After cap5, target `im-solution.md`.
- After cap6, target `im-estimation.md`.

If a targeted review returns `revise`, the owning generation capability must regenerate or rewrite the failed artifact using the findings, then run cap11 again on the same target before downstream caps continue. Do not paper over a semantic failure with formatting-only edits.

## Evidence Workflow

1. Work from the issue worktree prepared by cap1, normally `.workspace/<project-key>--<ISSUE-ID>`.
2. Ensure cap2 has initialised or refreshed `.t2p/tickets/<ISSUE-ID>/`.
3. Read the raw requirement sources that exist, especially `.t2p/tickets/<ISSUE-ID>/req.md` and `.t2p/tickets/<ISSUE-ID>/notion-*.md`.
4. In `all` mode, read available generated refs under `.t2p/tickets/<ISSUE-ID>/refs/`, especially:
   - `im-req-engineered.md`
   - `im-req-summarized.md`
   - `im-ac.md`
   - `im-solution.md`
   - `im-estimation.md`
5. In targeted mode, read the target artifact plus upstream dependencies needed for semantic judgement. For example, review `im-solution.md` against `im-req-engineered.md` and `im-ac.md`; review `im-estimation.md` against `im-solution.md` and `im-ac.md`.
6. If `.evodocs/index.json` exists, use it to choose relevant `.evodocs/mod--*.md` files for grounding checks.
7. Inspect targeted code paths when the artifact claims concrete modules, files, APIs, config, schemas, jobs, permissions, integrations, or UI surfaces.
8. Treat missing source evidence or missing generated artifacts as findings. Do not invent replacement content unless the user explicitly asks for edits.

For targeted review, do not fail merely because later downstream artifacts do not exist yet.

## Semantic Review Protocol

Use the host LLM to answer these questions before assigning `ready`:

1. **Useful for the real next actor**: Would the next coding agent, test agent, reviewer, or human operator be able to act from this artifact without rediscovering the basics?
2. **Evidence-backed**: Are the important claims grounded in raw requirements, evodocs, code inspection, or explicit uncertainty?
3. **Specific over generic**: Does the artifact name concrete behaviours, modules, flows, contracts, risks, or decisions rather than polished text that could fit any issue?
4. **Downstream fit**: Does the artifact provide the exact kind of input required by the next cap, not just a plausible standalone document?
5. **No hidden invention**: Does it preserve uncertainty and source gaps instead of inventing product decisions, architecture, or facts?
6. **No shallow pass**: Would the artifact still be useful after removing headings and formatting? If not, it is not semantically ready.

When semantic usefulness fails, mark the artifact `revise` even if every format check passes. Recommended edits must say what evidence to gather or what content to rewrite, not just "make it more specific".

## Overall Gate Checks

Score each dimension as pass or fail:

1. **Source coverage**: Raw requirement sources were read, and the generated refs do not contradict them.
2. **Evidence grounding**: Relevant evodocs and code were used when available; claims name actual behaviours, modules, contracts, UI states, APIs, config surfaces, data flows, permissions, or lifecycle rules where reasonably discoverable.
3. **Requirement alignment**: The artifacts cover the requested outcome and do not add unrelated product scope.
4. **Scope discipline**: In-scope and out-of-scope boundaries prevent adjacent refactors, duplicate systems, or speculative work.
5. **Regression awareness**: Important existing UX, API contracts, data integrity, permissions, lifecycle behaviours, integrations, or performance-sensitive flows are protected.
6. **Path safety**: Generated artifacts contain no personal absolute paths, usernames, home directories, skill installation paths, temporary paths, or paths outside the target repo root. Any project paths are repo-root-relative.
7. **Conciseness**: Artifacts are compact enough for future agents to use; they avoid bulky research logs, command dumps, repeated requirements, and code dumps.
8. **Artifact separation**: Requirements explain what and why; acceptance criteria define observable completion; solution explains how at a high level. Test commands and QA procedures stay out of requirement and solution artifacts.

The overall gate is ready only if all applicable dimensions pass and no blocking artifact-specific checks fail.

## Requirement Artifact Checks

Apply these checks to `im-req-engineered.md`:

1. **Required shape**: Contains `Source Inputs`, `Product Requirement`, `Engineering Context`, `Scope`, `Behavioural Requirements`, `Existing Contracts and Regression Boundaries`, and `Open Questions and Risks`.
2. **Product clarity**: Explains the desired user-visible or system-visible outcome, affected workflow, and why the change matters.
3. **Engineering grounding**: Uses evodocs and code inspection to name relevant modules, flows, contracts, source-of-truth files, data boundaries, integrations, or lifecycle constraints when available.
4. **No premature solution**: Does not prescribe an implementation sequence, new architecture, code snippets, or test commands.
5. **Regression boundaries**: Names specific behaviours or contracts to preserve, rather than generic "existing behaviour still works" wording.
6. **Uncertainty handling**: Records missing evidence, product decisions, and risks instead of pretending certainty.
7. **Downstream usefulness**: Provides enough concrete product and engineering context for cap4 to generate meaningful, testable acceptance criteria without going back to broad discovery.
8. **Semantic substance**: The artifact would still communicate the issue's real scope and constraints if the section headings were removed; it is not just reorganised source text.

## Summary Artifact Checks

Apply these checks to `im-req-summarized.md`:

1. **Consistency**: It does not introduce requirements or facts absent from `im-req-engineered.md`.
2. **Usefulness**: A later agent can understand the issue, primary workflow, and main engineering boundary in one quick read.
3. **Brevity**: It is short and avoids implementation detail, test detail, or copied source text.
4. **Sequencing**: It correctly points later work to generate acceptance criteria before solution.
5. **Signal density**: It preserves the most important product outcome, source-of-truth constraint, and risk rather than summarising into generic project language.

## Acceptance Criteria Checks

Apply these checks to `im-ac.md` when present:

1. **Required shape and tracking**: The section is a Markdown task list under `## Acceptance criteria`; every item starts with a stable unique `AC-N` number; numbering is contiguous from `AC-1`; there are no more than 20 criteria; any item that should be tracked but should not generate a separate test case says `(no separate test case required)` immediately after the number.
2. **Grounded in evidence**: Criteria use relevant evodocs context and direct code inspection when the repository is available.
3. **Requirement alignment**: Criteria cover the requested outcome from `im-req-engineered.md` and do not add unrelated scope.
4. **Acceptance-test ready**: Each normal `AC-N` item can be turned into a manual or automated acceptance/regression test without guessing the expected result; items explicitly marked `(no separate test case required)` are valid tracked conditions but are not expected to generate separate test cases.
5. **Regression-aware**: Criteria protect important existing behaviours, contracts, permissions, data integrity, lifecycle behaviour, integrations, or UX.
6. **Edge-aware**: Criteria include relevant negative, boundary, permission, loading, empty-state, error, or lifecycle cases when the change plausibly affects them.
7. **Path-safe**: Criteria contain no forbidden local paths and use repo-root-relative paths only when paths are necessary.
8. **Concise enough**: Criteria avoid bulky QA matrices, test commands, repeated requirements, code snippets, and over-detailed process text.
9. **No implementation leakage**: Criteria describe observable outcomes, not how to implement the change.
10. **Real verification value**: Criteria would catch meaningful implementation mistakes or regressions; they are not just restated requirements split into numbered lines.

Acceptance criteria are ready only if all ten dimensions pass.

## Solution Checks

Apply these checks to `im-solution.md` when present:

1. **Required shape**: Contains `## Solution`, then exactly `### Overview`, `### Details`, and `### Steps` in that order. `Steps` is a numbered list.
2. **Progressive detail**: Overview is brief, Details is deeper, and Steps is the most concrete; the sections do not merely repeat each other.
3. **Grounded in evidence**: Uses relevant evodocs context and direct code inspection when the repository is available.
4. **Actionable entry point**: Tells the coding agent where to start reading and what implementation path to follow.
5. **Source-of-truth discipline**: Reuses existing canonical configs, contracts, helpers, stores, services, schemas, or data flows when they exist; does not introduce duplicate config, shadow workflows, or fallback paths that hide invalid states.
6. **Requirement and AC alignment**: Solves the behaviour requested in `im-req-engineered.md` and satisfies `im-ac.md` when present without adding unrelated scope.
7. **Path-safe**: Contains no forbidden local paths; all project paths are repo-root-relative.
8. **Preservation constraints**: Calls out important existing UX, performance, data, permission, contract, lifecycle, integration, or compatibility behaviours that must remain unchanged.
9. **No test leakage**: Leaves test cases, verification commands, and QA procedure to acceptance criteria rather than repeating them in Solution.
10. **No code leakage**: Contains no code snippets, pseudo-code blocks, copied implementation code, or diffs.
11. **Implementation usefulness**: A coding agent can start implementation from the artifact and named code areas without first doing broad rediscovery of ownership, source of truth, or change order.
12. **Step quality**: Numbered steps are concrete actions with meaningful sequencing and expected edit areas, not generic commands such as "update backend" or "fix UI".

Solution is ready only if all twelve dimensions pass.

## Estimation Checks

Apply these checks to `im-estimation.md` when present:

1. **Required shape**: Contains `## Estimation` and exactly three fields: `Development mode`, `Hours`, and `Rationale`, with blank lines separating the field lines for Markdown readability.
2. **Mode enum**: `Development mode` is exactly one of `agent`, `agent-led`, or `human-led`.
3. **Single precise value**: `Hours` is one numeric value, rounded sensibly to quarter-hour increments when needed; it is not a range and does not include alternative mode estimates.
4. **Grounded drivers**: `Rationale` briefly names the measurable drivers, especially solution step count/complexity and normal test-case AC count.
5. **Human involvement alignment**: The selected mode matches the work shape: `agent` for direct low-risk work with only pre-PR review, `agent-led` when human checkpoints are needed, and `human-led` when humans must steer multiple plan adjustments and agent iterations.
6. **Acceptance-test inclusion**: The estimate includes agent-driven acceptance-test execution and likely fix iteration time, not only code-writing time.
7. **No scoring leakage**: The artifact does not include scoring tables, subtotals, assumptions blocks, confidence labels, or per-mode breakdowns.
8. **Path-safe**: Contains no forbidden local paths.
9. **Decision usefulness**: The estimate would help choose whether to run the work as `agent`, `agent-led`, or `human-led`; it is not a decorative number detached from steps, AC, or risk.

Estimation is ready only if all nine dimensions pass.

## Path Hygiene

Before finalising the gate, scan all reviewed generated artifacts for forbidden patterns:

- `/home/`
- `/Users/`
- `~`
- local usernames
- `.skillhost`
- `.codex`
- skill installation paths
- temporary paths
- paths outside the target repo root

If a forbidden path appears, mark the gate as `revise` and recommend converting it to a repo-root-relative path or removing it.

## Review Output

Write `im-gate.md` in this shape:

```markdown
# IntentMill Gate Review: <ISSUE-ID>

## Review Target

<all | im-req-engineered.md | im-req-summarized.md | im-ac.md | im-solution.md | im-estimation.md | comma-separated targets>

## Decision

<ready | revise>

## Blocking Findings

- <material semantic or shape failure and why it blocks downstream agent work>

## Recommended Edits

- <owning cap to rerun and exact rewrite direction, not a vague quality comment>

## Non-Blocking Notes

- <minor risk or observation, or "None">

## Artifact Status

- `refs/im-req-engineered.md`: <ready | revise | missing | not reviewed>
- `refs/im-req-summarized.md`: <ready | revise | missing | not reviewed>
- `refs/im-ac.md`: <ready | revise | missing | not reviewed>
- `refs/im-solution.md`: <ready | revise | missing | not reviewed>
- `refs/im-estimation.md`: <ready | revise | missing | not reviewed>
```

Report only material failures and exact recommended edits. Do not dump every rubric item when it passes. If everything reviewed is ready, say so briefly and list only residual non-blocking risks.

When a targeted review is requested, set non-target artifacts to `not reviewed` unless they were necessary upstream dependencies for semantic judgement. Missing downstream artifacts are not blocking in targeted mode. Missing upstream artifacts are blocking when the target depends on them.

Map revise findings back to the owning cap:

- `im-req-engineered.md` and `im-req-summarized.md`: rerun or rewrite cap3.
- `im-ac.md`: rerun or rewrite cap4.
- `im-solution.md`: rerun or rewrite cap5.
- `im-estimation.md`: rerun or rewrite cap6.

## Common Failures and Fixes

- If `im-req-engineered.md` only restates raw ticket text, require evodocs/code grounding and named regression boundaries.
- If `im-req-summarized.md` adds new scope, align it back to `im-req-engineered.md`.
- If acceptance criteria lack `AC-N` numbering, duplicate numbers, or include implementation steps, require a rewrite before solution generation.
- If solution content says only "update relevant files", require targeted code inspection and named entry points.
- If estimation output contains multiple modes, a table, or a range, require exactly one recommended mode and one numeric hour value.
- If estimation rationale does not mention solution steps and test-case AC count, require a grounded rewrite.
- If any artifact says "existing behaviour still works", require the exact behaviour or contract to be named.
- If generated content includes test commands or QA process text outside acceptance criteria, remove the process text and preserve only expected outcomes where appropriate.
- If forbidden local paths appear, convert them to repo-root-relative paths or remove them.
