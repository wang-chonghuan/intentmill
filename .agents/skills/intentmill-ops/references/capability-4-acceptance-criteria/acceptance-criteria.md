# Capability 4: Generate Acceptance Criteria

Use this reference when creating or rewriting local IntentMill acceptance criteria. The real reader is a future test agent and coding agent who should be able to verify the requested behaviour without rediscovering the project context.

Cap4 writes exactly:

```text
.t2p/tickets/<ISSUE-ID>/refs/im-ac.md
```

## Objective

Create acceptance criteria that translate `refs/im-spec.md` into observable verification conditions. Criteria must cover the requested outcome, relevant edge or negative cases, and important regression-preservation constraints from `.evodocs` and code inspection. Every criterion must carry a stable tracking number. Criteria that should become test cases must be left as normal `AC-N` items. Criteria that should be tracked but should not generate separate test cases must be marked immediately after the number.

Good acceptance criteria answer:

- What user-visible or system-visible outcome must be true?
- What existing behaviour, contract, data flow, permission, lifecycle rule, integration, or UX must remain unchanged?
- What edge case or negative path is important enough to verify?
- What project-specific context from `.evodocs` or code changes the acceptance boundary?

Do not include implementation steps, solution sequencing, test commands, code snippets, or QA process text.

## Evidence Workflow

Before writing `im-ac.md`:

1. Work from the issue worktree prepared by cap1, normally `.workspace/<project-key>--<ISSUE-ID>`.
2. Ensure cap2 has initialised or refreshed `.t2p/tickets/<ISSUE-ID>/`.
3. Require `.t2p/tickets/<ISSUE-ID>/refs/im-spec.md`. If missing, run cap8 first instead of drafting acceptance criteria directly from pre-grill requirements or raw notes.
4. Read `.t2p/tickets/<ISSUE-ID>/refs/im-spec.md`.
5. Read `.t2p/tickets/<ISSUE-ID>/refs/im-req-engineered.md` and `.t2p/tickets/<ISSUE-ID>/refs/im-req-summarized.md` only as background when needed to understand source context; the spec is the requirement contract.
6. Read raw sources such as `.t2p/tickets/<ISSUE-ID>/req.md` and `.t2p/tickets/<ISSUE-ID>/notion-*.md` only as fallback or clarification, not as replacements for the spec.
7. If `.evodocs/index.json` exists at the issue worktree repo root, read it first and use it as the module map. Select only module docs relevant to the requested product area, workflow, surface, backend service, integration, data flow, or risk area.
8. Read selected `.evodocs/mod--*.md` files when they sharpen acceptance boundaries, regression risks, contracts, permissions, data integrity, lifecycle rules, or integration behaviour.
9. Inspect relevant repo-root-relative code paths directly when the repository is available. Search for affected UI text, routes, components, API endpoints, config keys, constants, schema fields, background jobs, permissions, integrations, or existing tests that reveal current behaviour.
10. Identify critical existing contracts and regression boundaries. Prefer criteria that protect actual flows shown by evodocs and code over generic "does not break existing behaviour" wording.
11. Keep the grilled spec central. Evidence should sharpen the criteria, not replace the request with broad module coverage or pre-grill assumptions.

Do not rely on `.evodocs` alone when the repository is available. Evodocs provide orientation; code confirms concrete behaviour and boundaries.

## Output Shape

`im-ac.md` must contain the acceptance criteria section and nothing else unless the user explicitly asks for review notes.

Use this exact shape:

```markdown
## Acceptance criteria

- [ ] **AC-1** {observable requested outcome}
- [ ] **AC-2** {important edge/negative case when relevant}
- [ ] **AC-3** {specific regression-preservation condition grounded in evodocs or code}
- [ ] **AC-4 (no separate test case required)** {tracked acceptance condition that genuinely does not need its own separate test case}
```

Rules:

- Use a Markdown task list.
- Every criterion starts with stable `**AC-N**` numbering.
- Numbering is contiguous from `AC-1` within the file.
- Choose the number of criteria from the actual requirement complexity. There is no recommended default count.
- Use at most 20 criteria. Treat 20 as a hard upper bound, not a target.
- Each normal `AC-N` item is expected to map to a separate manual or automated acceptance/regression test case.
- Each normal `AC-N` item must be independently verifiable and specific enough to drive that test case without guessing the expected result.
- Use `(no separate test case required)` only when the condition should be tracked but should not generate its own separate test case.
- Do not mark a behaviour-critical happy path, regression boundary, negative case, permission case, data integrity case, lifecycle case, or integration case as no-test merely to reduce test count.
- Write criteria at the behaviour or contract level, not the implementation-step level.
- Prefer precise observable behaviour over vague phrasing such as "works correctly".

## Required Content Checklist

Developer-ready acceptance criteria must include:

- Stable `AC-N` numbering on every criterion, starting at `AC-1` and remaining unique within the file.
- `(no separate test case required)` immediately after the AC number on any criterion that should be tracked but should not generate its own separate test case.
- No more than 20 criteria, with the final count justified by the actual requirement complexity.
- At least one criterion for the requested happy path.
- Regression-preservation criteria for important existing behaviours or contracts found in evodocs/code.
- Edge, negative, permission, lifecycle, data integrity, loading, empty-state, error, or integration criteria when relevant to the change.
- Clear observable outcomes, not vague "works correctly" phrasing.
- No implementation plan, solution content, code snippets, test commands, or QA process text.
- Repo-root-relative paths only when paths are necessary.

## Readiness Review

Before finalising `im-ac.md`, run this semantic review internally. Acceptance criteria are ready only if all ten dimensions pass.

1. **Required shape and tracking**: The section is a Markdown task list under `## Acceptance criteria`; every item starts with a stable unique `AC-N` number; there are no more than 20 criteria; any item that should be tracked but should not generate a separate test case says `(no separate test case required)` immediately after the number; each item is an acceptance condition, not implementation guidance.
2. **Grounded in evidence**: Uses relevant `.evodocs` context and direct code inspection when the repository is available. Names actual behaviours, contracts, UI states, API effects, config behaviour, data flows, or lifecycle rules where reasonably discoverable.
3. **Requirement alignment**: Covers the requested outcome from `refs/im-spec.md` and does not add unrelated product scope.
4. **Acceptance-test ready**: Each normal `AC-N` item can be turned into a manual or automated acceptance/regression test without guessing the expected result; items explicitly marked `(no separate test case required)` are valid tracked conditions but are not expected to generate separate test cases.
5. **Regression-aware**: Protects important existing behaviours, contracts, permissions, data integrity, lifecycle behaviour, integrations, or UX that evodocs/code shows could be affected.
6. **Edge-aware**: Includes relevant negative, boundary, permission, loading, empty-state, error, or lifecycle cases when the change plausibly affects them.
7. **Path-safe**: Contains no personal absolute paths, usernames, home directories, skill installation paths, temporary paths, or paths outside the target repo root. Any published paths are repo-root-relative.
8. **Concise enough**: Avoids bulky QA matrices, test commands, repeated requirements, code snippets, and over-detailed process text.
9. **No implementation leakage**: Does not describe how to implement the change; implementation belongs in the later solution artifact.
10. **Real verification value**: Criteria would catch meaningful implementation mistakes or regressions; they are not just restated requirements split into numbered lines.

If one or more dimensions fail, revise the criteria before writing `im-ac.md` unless the user explicitly asks for a rough draft. When revising, prefer adding or tightening the weakest missing observable condition rather than expanding every criterion.

After writing `im-ac.md`, run cap11 targeting `im-ac.md`. If cap11 returns `revise`, rewrite the acceptance criteria from cap4 using the gate findings and run the same targeted cap11 review again before cap5 starts.

## Path Hygiene

Generated acceptance criteria must not expose local machine details. Before finalising, scan for forbidden patterns and remove or convert them:

- `/home/`
- `/Users/`
- `~`
- local usernames
- `.skillhost`
- `.codex`
- skill installation paths
- temporary paths
- paths outside the target repo root

Published project paths must be relative to the issue worktree repo root. Avoid paths unless they make a criterion clearer.

## Common Bad Outputs

- Missing AC numbers, duplicate AC numbers, or numbering that restarts inside one file.
- Marking a criterion as no-test without saying `(no separate test case required)` immediately after the AC number.
- Only restating the requirement as one checkbox.
- Generic criteria such as "existing functionality still works" without naming the preserved behaviour.
- Implementation tasks disguised as acceptance criteria.
- Criteria that require reading the agent's mind rather than observing product or system behaviour.
- Bulky test plans, test commands, QA procedure, or exhaustive matrices.
- Criteria based only on raw user wording or pre-grill `im-req-engineered.md` when `im-spec.md`, `.evodocs`, and relevant code are available.
