# Capability 3: Create Draft

Use this reference to create `ticket-worktree-t2p refs path/im-draft.md` from a req-only tech issue, evodocs, and targeted code inspection.

## Purpose

Create a rough but evidence-backed draft. The draft is allowed to contain tentative implementation direction, but every tentative point must be labelled as draft, assumption, or risk. Cap3 does not create `im-grill.md`; cap4 owns the grill artifact. The draft is not the final spec and not the final plan.

## Required Inputs

- An issue worktree prepared by cap1.
- A ticket context prepared by cap2.
- `ticket-worktree-t2p path` in the issue worktree.
- A tech-issue requirement from the ticket context.
- `AGENTS.md` in the issue worktree.
- `.t2p/rules.md` in the issue worktree.
- `.evodocs/index.json` in the issue worktree.

If any required input is missing, stop and report the missing prerequisite. Do not invent the requirement or proceed without evodocs.

## Evidence Workflow

1. Run the shared input checks from `SKILL.md`.
2. Ensure cap1 and cap2 have completed for this issue. If not, run them first.
3. Work inside the issue worktree, not the IntentMill repo root.
4. Read `AGENTS.md` and `.t2p/rules.md`; all draft research and recommendations must strictly follow them.
5. Read `ticket-worktree-t2p path` to identify the requirement source. Prefer explicit requirement files from the project `t2p` context. If multiple plausible requirement files exist, read the minimal set needed and state which were used.
6. Read `.evodocs/index.json`.
7. Use `.evodocs` as the map for targeted code reading: read the relevant `.evodocs/mod--*.md` files indicated by the requirement and index first, then inspect the code those docs point to.
8. Inspect targeted code only where needed to understand existing contracts, affected modules, data flow, UI/API boundaries, prompts, state machines, configuration, dependencies, tests, and SSOT files. Do not perform broad codebase wandering.
9. If evodocs and code disagree, treat code as authoritative and record the conflict in draft findings.
10. For any external library, SDK, framework, API, CLI tool, or cloud service whose correct usage affects the draft, use the `find-docs` skill / Context7 workflow to fetch current docs before writing guidance. Follow the repo `AGENTS.md` Context7 instructions: resolve the library first, then fetch docs, avoid sensitive query content, and do not exceed the documented command budget. If Context7 fails or the relevant library cannot be resolved, record that limitation in `## Assumptions` or `## Risks` instead of guessing unstable API details.
11. For any database operation, live data inspection, schema change, migration, or DB write/read beyond static SSOT file inspection, use the repo-local `nf-db` skill. If `nf-db` is unavailable in the issue worktree, stop and report that database work cannot proceed safely.
12. For any frontend UI change, read and strictly follow the relevant frontend directory's `DESIGN.md` before drafting UI direction. If no relevant `DESIGN.md` exists, record that it was not found and continue.

## Drafting Principles

The draft and any draft-plan direction must prefer, in order:

- preserving the existing architecture and module boundaries
- using existing project libraries, helpers, configuration paths, schemas, and SSOT files before introducing new ones
- choosing the simplest effective implementation path that satisfies the tech issue
- avoiding changes to code, behavior, schemas, dependencies, config, prompts, jobs, tests, or docs unrelated to the target issue
- failing fast and surfacing uncertainty instead of inventing fallbacks or hidden compatibility layers

These are planning constraints, not optional style preferences. If one of them cannot be followed, record why in `## Risks` or make `## Grill Required` be `yes`.

## Output Path

Write:

```text
ticket-worktree-t2p refs path/im-draft.md
```

Create the `refs/` directory if it does not exist.

Do not create or use `.intentmill/` for this artifact. `ticket-worktree-t2p refs path` is the only valid IntentMill artifact directory for cap3.

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
- requirement files or source artifacts read
- `AGENTS.md` and `.t2p/rules.md` read
- evodocs files read
- code areas inspected
- external docs fetched with `find-docs` / Context7, or why none were needed
- `nf-db` usage, or why no database operation was needed
- frontend `DESIGN.md` files read for UI work, or why none were needed/found

Use repo-root-relative paths only.

### Draft Spec

Write the current understanding of what must be true after delivery:

- intent
- scope
- non-scope
- compatibility requirements
- input/output contracts
- state, data, permission, UI, prompt, API, config, dependency, or service requirements when relevant

This section may include uncertain requirements only when they are explicitly labelled as assumptions. Do not present unconfirmed decisions as final requirements.

### Draft Plan

Write a rough implementation direction based on code inspection:

- likely modules or code areas to inspect or change
- likely test areas
- likely sequencing constraints
- how the direction preserves existing architecture
- which existing helpers/libraries/config/schema paths should be reused
- why the direction is the simplest effective approach currently known
- what unrelated code or behavior must be left untouched

This is not the final execution plan. Do not write detailed task steps, exact patch instructions, or irreversible implementation choices unless they are already required by the tech issue or existing contracts.

### Code And Evodocs Findings

Summarise facts that affect requirement interpretation, implementation boundaries, or grill decisions. Use repo-root-relative paths when paths clarify the boundary.

Include any evodocs/code disagreement here, explicitly saying that code is treated as authoritative.

### Assumptions

List assumptions that are currently being used to interpret the draft. Each assumption must either be low-risk or clearly justify why grill is required.

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

### Grill Required

Write `yes` or `no`.

Use `yes` if any unresolved human decision remains around UI, DB/schema, prompt, state machine, external API, new dependency, new service, config/secrets/deployment, compatibility, or scope. Do not list the questions in cap3; cap4 creates `im-grill.md`.

## Rules

- Do not create `im-spec.md` or `im-plan.md` in cap3.
- Do not create `im-grill.md` in cap3.
- Do not put grill questions or decision-point lists in `im-draft.md`; cap3 only writes `## Grill Required`.
- Do not write any IntentMill artifact outside `ticket-worktree-t2p refs path`.
- Do not modify product code in cap3.
- Do not run tests in cap3 unless a lightweight read-only command is necessary to discover existing test layout.
- Do not write AutoQA ac-cases.
- Do not run t2p-review.
- Do not generate PRs.
- Do not publish local absolute paths into artifacts.

## Gate

After writing `im-draft.md`, run `references/gate-3-create-draft/gate.md`.

If gate3 fails and the problem can be fixed without user input, rerun cap3 with the gate findings as constraints. If gate3 identifies human decisions are required, set `## Grill Required` to `yes` and proceed to cap4.
