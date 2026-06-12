# Capability 4: Generate Acceptance Criteria

Use this reference when creating or rewriting local IntentMill acceptance criteria. The real reader is a future test agent and coding agent who should be able to verify the requested behaviour without rediscovering the project context.

Cap4 writes exactly:

```text
.t2p/tickets/<ISSUE-ID>/refs/im-ac.md
```

## Objective

Create acceptance criteria that translate `refs/im-spec.md` into observable verification conditions grouped by the verification workflow that should own them. Use `im-spec.md` as the grilled requirement contract and use `im-req-engineered.md` only as engineering background for context, source-of-truth boundaries, regression risks, data flows, and existing contracts. Criteria must cover the requested outcome, relevant edge or negative cases, important regression-preservation constraints from `.evodocs` and code inspection, and any repeatable test-data setup needed to make downstream tests executable. Every criterion must carry a stable globally numbered `AC-N` tracking number. Classification is owned by the `###` section that contains the criterion, not by tags in the AC id or text.

Good acceptance criteria answer:

- What user-visible or system-visible outcome must be true?
- What existing behaviour, contract, data flow, permission, lifecycle rule, integration, or UX must remain unchanged?
- What edge case or negative path is important enough to verify?
- What project-specific context from `.evodocs` or code changes the acceptance boundary?
- What repeatable test data, fixture state, seeded event, cross-day state, or reset condition is required before verification can run?

Do not include implementation steps, solution sequencing, test commands, code snippets, or QA process text. Keep expected outcomes at the behaviour, contract, or test-data-precondition level.

## Verification Sections

Group acceptance criteria under these sections when they have content, in this order:

- `### Frontend tests`: Browser-visible behaviours suitable for frontend automated testing such as Playwright or AutoQA. These criteria must be observable through the UI or browser-level network effects and must not require direct DB/event-table assertions.
- `### Backend tests`: API, service, schema, DB, permission, event-chain, lifecycle, idempotency, tenant/user isolation, or state-machine behaviours suitable for backend automated tests or integration tests.
- `### Test data setup`: Repeatable preconditions needed before automated or manual tests can run, especially fixture state, cross-day state, distinct item counts, seeded events, tenant/user records, or reset requirements. These criteria describe data readiness, not product completion.
- `### Manual tests`: Product, UX, visual, third-party, environment-sensitive, or judgement-heavy checks where automated coverage is not appropriate or would be materially brittle.
- `### No separate test required`: Scope exclusions, future-work confirmations, or tracked conditions that are already covered by other criteria and do not need an independent test case.

When one requirement has both frontend and backend verification concerns, split it into separate AC items under the appropriate sections. For example, button visibility belongs under `Frontend tests`, while event persistence, schema validation, tenant isolation, or idempotency belongs under `Backend tests`. Do not create mixed AC items that require multiple verification modes to pass.

## Evidence Workflow

Before writing `im-ac.md`:

1. Work from the issue worktree prepared by cap1, normally `.workspace/<project-key>--<ISSUE-ID>`.
2. Ensure cap2 has initialised or refreshed `.t2p/tickets/<ISSUE-ID>/`.
3. Require `.t2p/tickets/<ISSUE-ID>/refs/im-spec.md`. If missing, run cap8 first instead of drafting acceptance criteria directly from pre-grill requirements or raw notes.
4. Read `.t2p/tickets/<ISSUE-ID>/refs/im-spec.md` as the grilled requirement contract and the only requirement source that may override earlier unclear or pre-grill wording.
5. Read `.t2p/tickets/<ISSUE-ID>/refs/im-req-engineered.md` as engineering background when present. Use it for source inputs, engineering context, existing contracts, regression boundaries, and known risks, but do not let it override or expand the grilled spec.
6. Read `.t2p/tickets/<ISSUE-ID>/refs/im-req-summarized.md` only as background when it helps with orientation; do not use it as a replacement for `im-spec.md`.
7. Read raw sources such as `.t2p/tickets/<ISSUE-ID>/req.md` and `.t2p/tickets/<ISSUE-ID>/notion-*.md` only as fallback or clarification, not as replacements for `im-spec.md`.
8. If `.evodocs/index.json` exists at the issue worktree repo root, read it first and use it as the module map. Select only module docs relevant to the requested product area, workflow, surface, backend service, integration, data flow, or risk area.
9. Read selected `.evodocs/mod--*.md` files when they sharpen acceptance boundaries, regression risks, contracts, permissions, data integrity, lifecycle rules, or integration behaviour.
10. Inspect relevant repo-root-relative code paths directly when the repository is available. Search for affected UI text, routes, components, API endpoints, config keys, constants, schema fields, background jobs, permissions, integrations, or existing tests that reveal current behaviour.
11. Identify critical existing contracts and regression boundaries. Prefer criteria that protect actual flows shown by `im-spec.md`, background engineering evidence, evodocs, and code over generic "does not break existing behaviour" wording.
12. Keep the grilled spec central. Evidence should sharpen the criteria, not replace the request with broad module coverage or pre-grill assumptions.

Do not rely on `.evodocs` alone when the repository is available. Evodocs provide orientation; code confirms concrete behaviour and boundaries.

## Output Shape

`im-ac.md` must contain the acceptance criteria section, verification subsections, and AC task-list items only unless the user explicitly asks for review notes.

Use this exact shape:

```markdown
## Acceptance criteria

### Frontend tests

- [ ] **AC-1** {browser-visible requested outcome suitable for frontend automation}
- [ ] **AC-2** {browser-visible regression or edge condition}

### Backend tests

- [ ] **AC-3** {API, service, DB, schema, event-chain, permission, lifecycle, or idempotency condition}

### Test data setup

- [ ] **AC-4** {repeatable fixture, seed, reset, or data-precondition needed for one or more tests}

### Manual tests

- [ ] **AC-5** {manual product, UX, visual, third-party, or judgement-heavy verification condition}

### No separate test required

- [ ] **AC-6** {tracked scope boundary or future-work condition that genuinely does not need its own separate test case}
```

Rules:

- Use a Markdown task list.
- Every criterion starts with stable `**AC-N**` numbering.
- Numbering is globally contiguous from `AC-1` within the file and must not restart in each section.
- Classify each criterion only by placing it under the correct `###` section. Do not add tags such as `[frontend-test]`, prefixes such as `AC-FE-1`, or `(no separate test case required)` inside the AC id.
- Use only the allowed section headings from `Verification Sections`, in the allowed order. Omit sections that have no AC items.
- Do not place AC items directly under `## Acceptance criteria`; every AC item must be inside a `###` verification section.
- Choose the number of criteria from the actual requirement complexity. There is no recommended default count.
- Use at most 20 criteria. Treat 20 as a hard upper bound, not a target.
- Each AC item outside `No separate test required` is expected to map to a separate manual, automated, or data-preparation acceptance/regression task.
- Each AC item must be independently verifiable and specific enough to drive its owning verification workflow without guessing the expected result.
- Use `No separate test required` only when the condition should be tracked but should not generate its own separate test case.
- Do not move a behaviour-critical happy path, regression boundary, negative case, permission case, data integrity case, lifecycle case, integration case, or required test-data precondition into `No separate test required` merely to reduce test count.
- Write criteria at the behaviour or contract level, not the implementation-step level.
- Prefer precise observable behaviour over vague phrasing such as "works correctly".
- Keep `Test data setup` criteria focused on repeatable preconditions. If the product behaviour itself also needs verification, write a separate `Frontend tests`, `Backend tests`, or `Manual tests` AC.

## Required Content Checklist

Developer-ready acceptance criteria must include:

- Stable `AC-N` numbering on every criterion, starting at `AC-1` and remaining unique within the file.
- Valid `###` verification sections, with every AC item placed under exactly one allowed section.
- Globally contiguous numbering across all sections, without section-specific prefixes or numbering restarts.
- No more than 20 criteria, with the final count justified by the actual requirement complexity.
- At least one criterion for the requested happy path.
- Regression-preservation criteria for important existing behaviours or contracts found in evodocs/code.
- Edge, negative, permission, lifecycle, data integrity, loading, empty-state, error, or integration criteria when relevant to the change.
- `Test data setup` criteria when frontend, backend, or manual tests need repeatable fixture state, cross-day state, distinct item counts, seeded events, tenant/user records, or reset requirements.
- Clear observable outcomes, not vague "works correctly" phrasing.
- No implementation plan, solution content, code snippets, test commands, or QA process text.
- Repo-root-relative paths only when paths are necessary.

## Readiness Review

Before finalising `im-ac.md`, run this semantic review internally. Acceptance criteria are ready only if all ten dimensions pass.

1. **Required shape and tracking**: The file has `## Acceptance criteria`; AC task-list items are grouped only under allowed `###` verification sections; every item starts with a stable unique `AC-N` number; numbering is globally contiguous from `AC-1`; there are no more than 20 criteria; each item is an acceptance condition or repeatable test-data precondition, not implementation guidance.
2. **Grounded in evidence**: Uses relevant `.evodocs` context and direct code inspection when the repository is available. Names actual behaviours, contracts, UI states, API effects, config behaviour, data flows, or lifecycle rules where reasonably discoverable.
3. **Requirement alignment**: Covers the requested outcome from `refs/im-spec.md`, uses engineering background only to sharpen boundaries and risks, and does not add unrelated product scope.
4. **Acceptance-test ready**: Each AC item can be routed from its section to the correct frontend, backend, data-preparation, manual, or no-test workflow without guessing the expected result or verification owner.
5. **Regression-aware**: Protects important existing behaviours, contracts, permissions, data integrity, lifecycle behaviour, integrations, or UX that evodocs/code shows could be affected.
6. **Edge-aware**: Includes relevant negative, boundary, permission, loading, empty-state, error, or lifecycle cases when the change plausibly affects them.
7. **Path-safe**: Contains no personal absolute paths, usernames, home directories, skill installation paths, temporary paths, or paths outside the target repo root. Any published paths are repo-root-relative.
8. **Concise enough**: Avoids bulky QA matrices, test commands, repeated requirements, code snippets, and over-detailed process text.
9. **No implementation leakage**: Does not describe how to implement the change, run commands, or execute QA procedure; implementation belongs in the later solution artifact and concrete test execution belongs downstream.
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
- AC items outside the allowed `###` verification sections.
- Adding classification tags to AC ids or text instead of using section placement.
- Restarting numbering within each section.
- Putting backend-only concerns such as DB rows, event tables, schema validation, idempotency, or tenant isolation under `Frontend tests`.
- Putting browser-visible layout, buttons, drawers, or responsive behaviour under `Backend tests`.
- Putting vague data needs such as "prepare required data" under `Test data setup` without naming the repeatable fixture state, cross-day state, item count, seeded event, tenant/user record, or reset requirement.
- Putting behaviour-critical product outcomes, regression boundaries, negative cases, permission cases, data integrity cases, lifecycle cases, or integration cases under `No separate test required`.
- Only restating the requirement as one checkbox.
- Generic criteria such as "existing functionality still works" without naming the preserved behaviour.
- Implementation tasks disguised as acceptance criteria.
- Criteria that require reading the agent's mind rather than observing product or system behaviour.
- Bulky test plans, test commands, QA procedure, or exhaustive matrices.
- Criteria based only on raw user wording or pre-grill `im-req-engineered.md` when `im-spec.md`, `.evodocs`, and relevant code are available.
