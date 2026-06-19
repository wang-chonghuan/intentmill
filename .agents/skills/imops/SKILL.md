---
name: imops
description: Load when the user asks to run the new IntentMill operations flow, initialise an issue worktree, initialise t2p ticket artifacts, create im-draft.md, create im-grill.md, finalise im-spec.md/im-plan.md, develop and unit test from IntentMill artifacts, or invokes imops cap1/cap2/cap3/cap4/cap5/cap6/cap7. Use for IntentMill-managed project repos from ssot-config.json.
---

# imops

Use this skill for the new IntentMill operations flow. The flow starts from a req-only Linear tech issue captured by project `t2p`, creates draft understanding, grills human decisions until complete, finalises spec/plan, then develops and unit-tests. It stops at "code complete + unit tests complete"; AutoQA, t2p-review, PR creation, human review, and RG case promotion are outside this skill.

## Required Inputs

Every capability requires both:

- `project`: a project key or alias from `ssot-config.json`
- `issue-id`: an issue identifier such as `ENG-506`

If either input is missing, stop with an error. Do not guess.

Before any capability:

1. Work from the IntentMill repository root.
2. Read `ssot-config.json`.
3. Resolve `project` against `projects` keys and each project's `aliases`.
4. If no exact match exists, stop with an error and list the available project keys and aliases.
5. Normalize `issue-id` to uppercase and require `^[A-Z]+-\d+$`; if invalid, stop with an error.

## Shared Path Definitions

The concrete path templates are defined in `ssot-config.json` under `imops.paths`. Resolve them from the IntentMill repository root, which is the current working directory for `imops`.

Required `imops.paths` keys:

- `workspace-root`
- `base-worktree`
- `issue-worktree`
- `ticket-worktree-t2p`
- `ticket-worktree-t2p-refs`
- `ticket-worktree-t2p-tests`

Resolve these shared names once for the current issue after project and issue normalization:

- `ticket-worktree-t2p path`: the resolved `imops.paths.ticket-worktree-t2p`.
- `ticket-worktree-t2p refs path`: the resolved `imops.paths.ticket-worktree-t2p-refs`.
- `ticket-worktree-t2p tests path`: the resolved `imops.paths.ticket-worktree-t2p-tests`.

All capabilities and gates must reference these shared path names. Do not redefine the concrete templates outside `ssot-config.json`.

## Reference File Resolution

Any path beginning with `references/` in this skill resolves relative to the imops skill directory, not relative to the issue worktree. Capabilities may still work inside the issue worktree for repository inspection and artifact writes, but common references such as `references/common/spec-plan-dev-review-common-rules.md` must be read from the imops skill directory.

## Artifact Layout

IntentMill artifacts for an issue live under `ticket-worktree-t2p path`:

```text
ticket-worktree-t2p path/
├── refs/
│   ├── im-draft.md
│   ├── im-grill.md
│   ├── im-spec.md
│   ├── im-plan.md
│   └── im-handoff.md
└── tests/
```

Use these exact filenames. `im-grill.md` is the canonical grill artifact; do not use any generic grill artifact as the final IntentMill artifact.

Capabilities 3, 4, and 5 must write only under `ticket-worktree-t2p refs path` for IntentMill draft, grill, spec, and plan artifacts. Do not create or use a worktree-root `.intentmill/` directory in this skill.

## Gates

When a capability has a matching gate, run the capability, run the gate, and rerun the capability with gate findings until the gate passes or a user decision is required.

- cap3 `create-draft` must pass `references/gate-3-create-draft/gate.md` before cap4 starts.
- cap4 `create-grill-document` uses its own completion check instead of a sibling gate.
- cap5 `finalize-spec-plan` must pass `references/gate-5-finalize-spec-plan/gate.md` before cap6 starts.
- cap6 `dev-unit-test` must pass `references/gate-6-dev-unit-test/gate.md` before reporting the issue complete for this skill.

## Capability 1: Initialise Issue Worktree

Trigger phrases include:

- `imops cap1`
- `初始化 worktree`
- `init issue worktree`
- `prepare issue workspace`

Purpose: create or reuse the per-issue worktree where later Codex exec runs should operate.

Read `references/capability-1-issue-worktree/issue-worktree.md` and follow it exactly.

## Capability 2: Initialise T2P Ticket Context

Trigger phrases include:

- `imops cap2`
- `初始化 t2p`
- `init t2p`
- `refresh t2p requirement`

Purpose: initialise or refresh the target issue's `.t2p` ticket context in the issue worktree, using the target project's own `t2p` skill.

Read `references/capability-2-t2p-context/t2p-context.md` and follow it exactly.

## Capability 3: Create Draft

Trigger phrases include:

- `imops cap3`
- `create im draft`
- `create-draft`
- `生成 im-draft`

Purpose: read the tech issue requirement, `.evodocs`, and relevant code to create `ticket-worktree-t2p refs path/im-draft.md`. The draft contains rough spec/plan findings, assumptions, risks, and a `Grill required` marker. It does not create `im-grill.md`.

Read `references/capability-3-create-draft/create-draft.md`, `references/common/spec-plan-dev-review-common-rules.md`, and `references/common/spec-plan-artifact-rules.md`, produce `im-draft.md`, then run `references/gate-3-create-draft/gate.md`. Cap4 owns creation and maintenance of `im-grill.md`.

## Capability 4: Create Grill Document

Trigger phrases include:

- `imops cap4`
- `draft-grill-loop`
- `grill draft`
- `运行 draft grill`

Purpose: use `im-draft.md` to create or refresh `ticket-worktree-t2p refs path/im-grill.md` as the document of blocking product/architecture decisions. Cap4 does not directly ask the user questions and does not resolve the decisions by itself.

Read `references/capability-4-draft-grill-loop/draft-grill-loop.md` and follow it exactly. Do not generate `im-spec.md` or `im-plan.md` in cap4.

## Capability 5: Finalize Spec And Plan

Trigger phrases include:

- `imops cap5`
- `finalize spec plan`
- `生成 im-spec im-plan`
- `finalize-spec-plan`

Purpose: convert the final draft and completed grill decisions into `ticket-worktree-t2p refs path/im-spec.md` and `ticket-worktree-t2p refs path/im-plan.md`.

Read `references/capability-5-finalize-spec-plan/finalize-spec-plan.md`, `references/common/spec-plan-dev-review-common-rules.md`, and `references/common/spec-plan-artifact-rules.md`, produce both artifacts, then run `references/gate-5-finalize-spec-plan/gate.md`. Cap6 may start only after gate5 passes.

## Capability 6: Dev Unit Test

Trigger phrases include:

- `imops cap6`
- `dev-unit-test`
- `develop from im plan`
- `开发并跑单测`
- `/goal 请执行cap6`

Purpose: implement from `im-spec.md` and `im-plan.md`, develop with ticket-scoped key unit/contract/component tests under `ticket-worktree-t2p tests path`, run the relevant tests as implementation slices are completed, and write `ticket-worktree-t2p refs path/im-handoff.md` summarizing actual changes, spec/plan alignment, missed user-review points, and residual issues or future improvements. Cap6 supports direct execution and Codex Goal mode; Goal mode is an execution wrapper and must still pass gate6.

Read `references/capability-6-dev-unit-test/dev-unit-test.md` and `references/common/spec-plan-dev-review-common-rules.md`, perform development and tests, then run `references/gate-6-dev-unit-test/gate.md`.

## Capability 7: Full Flow

Trigger phrases include:

- `imops cap7`
- `imops full flow`
- `run full imops`
- `完整 imops 流程`

Purpose: orchestrate cap1, cap2, cap3, cap4, cap5, and cap6 in order for one issue. It stops after code and unit tests are complete.

Read `references/capability-7-full-flow/full-flow.md` and follow it exactly.
