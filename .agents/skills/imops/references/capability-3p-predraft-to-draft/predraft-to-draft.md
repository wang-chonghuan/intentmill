# Capability 3P: Create Draft From Predraft

Use this reference to create `ticket-worktree-t2p refs path/im-draft.md` from a user-authored predraft, evodocs, and targeted code inspection.

## Purpose

Create a rough but evidence-backed IntentMill draft when the user's real intent is captured in `im-predraft.md` rather than in the ticket's `req.md`.

Cap3p is an alternate entrypoint to cap3. It produces the same downstream artifact, `im-draft.md`, and must satisfy the same draft shape and gate. Cap4 can run after cap3p exactly as it can after cap3.

Cap3p does not create `im-grill.md`, `im-spec.md`, or `im-plan.md`.

## Required Inputs

- An issue worktree prepared by cap1.
- A ticket context prepared by cap2.
- `ticket-worktree-t2p path` in the issue worktree.
- `ticket-worktree-t2p refs path/im-predraft.md`.
- `AGENTS.md` in the issue worktree.
- `.evodocs/constitution.md` in the issue worktree.
- `.evodocs/index.json` in the issue worktree.

If `im-predraft.md` is missing, stop and ask the user to provide or choose the predraft source. Do not silently fall back to `req.md`.

## Intent Source Priority

Use this source priority:

1. `ticket-worktree-t2p refs path/im-predraft.md` is the primary user intent source.
2. `ticket-worktree-t2p path/req.md` is optional background only.
3. `.evodocs` and code are authoritative for repository facts and implementation feasibility.
4. Code is authoritative when evodocs and code disagree.

Do not let a vague or stale `req.md` override a concrete user-authored predraft. If the predraft conflicts with a hard project rule, SSOT schema, code fact, or evodocs fact, record the conflict in `## Code And Evodocs Findings`, `## Assumptions`, or `## Risks`, and set `## Grill Required` to `yes`.

## Evidence Workflow

1. Run the shared input checks from `SKILL.md`.
2. Ensure cap1 and cap2 have completed for this issue. If not, run them first.
3. Work inside the issue worktree, not the IntentMill repo root.
4. Read `references/common/spec-plan-dev-review-common-rules.md` from the imops skill directory.
5. Read `references/common/spec-plan-artifact-rules.md` from the imops skill directory.
6. Read the full `im-predraft.md`.
7. Read `req.md` only as background context if it exists.
8. Read `AGENTS.md`, `.evodocs/constitution.md`, and `.evodocs/index.json`.
9. Use evodocs as the map for targeted code reading.
10. Follow the common evidence requirements for Context7/find-docs, `nf-db`, and frontend `DESIGN.md`.

## Drafting Principles

Follow `references/common/spec-plan-dev-review-common-rules.md` for evidence requirements and shared planning principles. Follow `references/common/spec-plan-artifact-rules.md` for spec artifact requirements, plan artifact requirements, and spec/plan separation.

The predraft may contain design opinion, product intent, rejected options, or architecture sketches. Convert that material into draft spec/plan content only when it is compatible with project facts. Keep speculative points labelled as assumptions, risks, or grill-required decisions.

Do not treat the predraft as implementation permission to skip SSOT schemas, route contracts, tests, or compatibility constraints.

## Output Path

Write:

```text
ticket-worktree-t2p refs path/im-draft.md
```

Create the `refs/` directory if it does not exist.

Do not create or use `.intentmill/` for this artifact. `ticket-worktree-t2p refs path` is the only valid IntentMill artifact directory for cap3p.

## Required Shape

`im-draft.md` must use exactly these top-level sections:

```markdown
# IntentMill Draft

## Source

## Draft Spec

## Draft Plan

## Code And Evodocs Findings

## Assumptions

## Risks

## Grill Required

```

### Source

Record:

- issue id
- predraft file read as the primary source
- requirement files read as background, or that none were used
- `AGENTS.md` and `.evodocs/constitution.md` read
- evodocs files read
- code areas inspected
- external docs fetched with `find-docs` / Context7, or why none were needed
- `nf-db` usage, or why no database operation was needed
- frontend `DESIGN.md` files read for UI work, or why none were needed/found

Use repo-root-relative paths only.

### Draft Spec

Write the current understanding of what must be true after delivery, based primarily on `im-predraft.md` and corrected by repository evidence.

Use the common spec requirements from `references/common/spec-plan-artifact-rules.md`.

This section may include uncertain requirements only when they are explicitly labelled as assumptions. Do not present unconfirmed architecture choices as final requirements.

### Draft Plan

Write a rough implementation direction based on the predraft and code inspection.

Use the common plan requirements from `references/common/spec-plan-artifact-rules.md`.

This is not the final execution plan. Do not write detailed task steps, exact patch instructions, or irreversible implementation choices unless they are already required by the predraft and are compatible with code/SSOT evidence.

### Code And Evodocs Findings

Summarise facts that affect requirement interpretation, implementation boundaries, or grill decisions. Use repo-root-relative paths when paths clarify the boundary.

Include any evodocs/code disagreement here, explicitly saying that code is treated as authoritative.

Include a predraft conflict audit. State either:

- what conflicts exist between `im-predraft.md` and `req.md`, evodocs, inspected code, SSOT schemas, or project rules; or
- that no material conflict was found in the inspected evidence.

### Assumptions

List assumptions currently being used to interpret the predraft. Each assumption must either be low-risk or clearly justify why grill is required.

### Risks

List meaningful risks, especially around:

- UI
- DB/schema
- prompts
- state machines
- external APIs
- new dependencies
- new services
- config/secrets/deployment
- compatibility contracts
- acceptance-impacting ambiguity
- predraft/req mismatch

### Grill Required

Write `yes` or `no`.

Use `yes` if any unresolved human decision remains around UI, DB/schema, prompt, state machine, external API, new dependency, new service, config/secrets/deployment, compatibility, scope, or predraft/req mismatch. Do not list the questions in cap3p; cap4 creates `im-grill.md`.

Use `no` only when the draft never needed grill decisions. Cap3p must not write `completed`; that state is reserved for cap4 after required grill decisions have all been answered and reflected in the draft.

## Rules

- Do not create `im-spec.md` or `im-plan.md` in cap3p.
- Do not create `im-grill.md` in cap3p.
- Do not put grill questions or decision-point lists in `im-draft.md`; cap4 owns them.
- Do not write any IntentMill artifact outside `ticket-worktree-t2p refs path`.
- Do not modify product code in cap3p.
- Do not run tests in cap3p unless a lightweight read-only command is necessary to discover existing test layout.
- Do not write AutoQA ac-cases.
- Do not run t2p-review.
- Do not generate PRs.
- Do not publish local absolute paths into artifacts.

## Gate

After writing `im-draft.md`, run `references/gate-3p-create-draft-from-predraft/gate.md`.

Gate3p incorporates gate3's common draft checks and adds predraft-specific source-priority checks. If gate3p fails because `im-draft.md` does not explain the source substitution, rerun cap3p and make the predraft/source priority explicit in `## Source`, `## Draft Spec`, and the predraft conflict audit.

If gate3p identifies human decisions are required, set `## Grill Required` to `yes` and proceed to cap4.
