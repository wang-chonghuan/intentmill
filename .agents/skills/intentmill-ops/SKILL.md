---
name: intentmill-ops
description: Load when the user asks to run IntentMill project operations, initialise an issue worktree, initialise t2p ticket artifacts, engineer local issue requirements, generate local IntentMill acceptance criteria or solution artifacts, estimate IntentMill issue work, run the full IntentMill planning flow, review IntentMill issue artifacts, or invokes intentmill-ops cap1/cap2/cap3/cap4/cap5/cap6/cap7/cap11. Use for IntentMill-managed project repos from ssot-config.json. Do not load for generic Git work, generic estimation, or generic solution writing outside IntentMill.
---

# intentmill-ops

Use this skill for IntentMill operations that connect a Linear-style issue id to a configured project repo under `.workspace/`.

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

## Capability 1: Initialise Issue Worktree

Trigger phrases include:

- `intentmill-ops cap1`
- `初始化 worktree`
- `init issue worktree`
- `prepare issue workspace`

Purpose: create or reuse the per-issue worktree where later Codex exec runs should operate.

Read `references/capability-1-issue-worktree/issue-worktree.md` and follow it exactly.

## Capability 2: Initialise T2P Ticket Context

Trigger phrases include:

- `intentmill-ops cap2`
- `初始化 t2p`
- `init t2p`
- `refresh t2p requirement`

Purpose: initialise or refresh the target issue's `.t2p` ticket context in the issue worktree, using the target project's own `t2p` skill.

Read `references/capability-2-t2p-context/t2p-context.md` and follow it exactly.

## Capability 3: Engineer IntentMill Requirement

Trigger phrases include:

- `intentmill-ops cap3`
- `工程化需求`
- `generate im engineered req`
- `生成 im-req-engineered`

Purpose: turn raw ticket context into local, code-grounded requirement artifacts before creating acceptance criteria or a solution.

Read `references/capability-3-engineer-requirement/requirement-engineering.md` and follow it exactly. This capability writes:

- `.t2p/tickets/<ISSUE-ID>/refs/im-req-engineered.md`
- `.t2p/tickets/<ISSUE-ID>/refs/im-req-summarized.md`

Rules:

- Run the shared input checks at the top of this skill.
- Ensure cap1 and cap2 have already prepared the issue worktree and ticket context; run them first if needed.
- Do not write acceptance criteria or solution content in cap3.
- After writing the cap3 artifacts, run cap11 targeting `im-req-engineered.md` and `im-req-summarized.md`. If cap11 returns `revise`, regenerate the failed artifact from cap3 and run cap11 again before downstream caps continue.
- Do not modify Linear directly.
- Do not load external Linear-ticket skills for this capability; the referenced workflow is self-contained.

## Capability 4: Generate Acceptance Criteria

Trigger phrases include:

- `intentmill-ops cap4`
- `生成 AC`
- `generate acceptance criteria`
- `生成 im-ac`

Purpose: generate developer-ready, test-agent-ready acceptance criteria from the engineered requirement.

Read `references/capability-4-acceptance-criteria/acceptance-criteria.md` and follow it exactly. This capability writes:

- `.t2p/tickets/<ISSUE-ID>/refs/im-ac.md`

Rules:

- Run the shared input checks at the top of this skill.
- Ensure cap1 and cap2 have already prepared the issue worktree and ticket context; run them first if needed.
- Require `refs/im-req-engineered.md`; if it is missing, run cap3 first.
- Do not write solution content in cap4.
- After writing `im-ac.md`, run cap11 targeting `im-ac.md`. If cap11 returns `revise`, regenerate AC from cap4 and run cap11 again before downstream caps continue.
- Do not modify Linear directly.
- Do not load external Linear-ticket skills for this capability; the referenced workflow is self-contained.

## Capability 5: Generate Solution

Trigger phrases include:

- `intentmill-ops cap5`
- `生成 solution`
- `generate solution`
- `生成 im-solution`

Purpose: generate a developer-ready implementation solution from the engineered requirement and acceptance criteria.

Read `references/capability-5-solution/solution.md` and follow it exactly. This capability writes:

- `.t2p/tickets/<ISSUE-ID>/refs/im-solution.md`

Rules:

- Run the shared input checks at the top of this skill.
- Ensure cap1 and cap2 have already prepared the issue worktree and ticket context; run them first if needed.
- Require `refs/im-req-engineered.md`; if it is missing, run cap3 first.
- Require `refs/im-ac.md`; if it is missing, run cap4 first.
- Do not write or rewrite acceptance criteria in cap5.
- After writing `im-solution.md`, run cap11 targeting `im-solution.md`. If cap11 returns `revise`, regenerate the solution from cap5 and run cap11 again before downstream caps continue.
- Do not modify Linear directly.
- Do not load external Linear-ticket skills for this capability; the referenced workflow is self-contained.

## Capability 6: Estimate Work

Trigger phrases include:

- `intentmill-ops cap6`
- `估计工时`
- `generate estimation`
- `生成 im-estimation`

Purpose: estimate the total development hours and recommended execution mode from the engineered requirement, acceptance criteria, and solution.

Read `references/capability-6-estimation/estimation.md` and follow it exactly. This capability writes:

- `.t2p/tickets/<ISSUE-ID>/refs/im-estimation.md`

Rules:

- Run the shared input checks at the top of this skill.
- Ensure cap1 and cap2 have already prepared the issue worktree and ticket context; run them first if needed.
- Require `refs/im-req-engineered.md`; if it is missing, run cap3 first.
- Require `refs/im-ac.md`; if it is missing, run cap4 first.
- Require `refs/im-solution.md`; if it is missing, run cap5 first.
- Output exactly one recommended development mode, one precise total hour value, and one short rationale.
- After writing `im-estimation.md`, run cap11 targeting `im-estimation.md`. If cap11 returns `revise`, regenerate the estimation from cap6 and run cap11 again before downstream caps continue.
- Do not modify Linear directly.
- Do not load external Linear-ticket skills for this capability; the referenced workflow is self-contained.

## Capability 7: Run Full Planning Flow

Trigger phrases include:

- `intentmill-ops cap7`
- `跑完整流程`
- `run full planning flow`
- `cap1-cap6 全部走一遍`

Purpose: run cap1 through cap6 in order for one issue, with cap11 semantic gates after each generated artifact stage.

Read `references/capability-7-full-planning/full-planning.md` and follow it exactly. This capability creates or refreshes the full planning artifact set:

- `.t2p/tickets/<ISSUE-ID>/refs/im-req-engineered.md`
- `.t2p/tickets/<ISSUE-ID>/refs/im-req-summarized.md`
- `.t2p/tickets/<ISSUE-ID>/refs/im-ac.md`
- `.t2p/tickets/<ISSUE-ID>/refs/im-solution.md`
- `.t2p/tickets/<ISSUE-ID>/refs/im-estimation.md`
- `.t2p/tickets/<ISSUE-ID>/refs/im-gate.md`

Rules:

- Run the shared input checks at the top of this skill.
- Execute capabilities in strict order: cap1, cap2, cap3, cap4, cap5, cap6.
- Do not skip a stage because an old artifact exists unless the user explicitly asks to reuse existing artifacts.
- Respect each cap's targeted cap11 review loop before moving to the next cap.
- After cap6 passes targeted cap11, run cap11 in `all` mode for the final artifact set.
- Do not modify Linear directly.
- Do not load external Linear-ticket skills for this capability; the referenced workflow is self-contained.

## Capability 11: Review IntentMill Issue Artifacts

Trigger phrases include:

- `intentmill-ops cap11`
- `把关`
- `质量评估`
- `review intentmill artifacts`

Purpose: review local IntentMill refs before using them to drive agent execution or publishing work back to a planning system.

Read `references/capability-11-quality-gate/quality-gate.md` and follow it exactly. By default this capability reviews the available local artifacts under `.t2p/tickets/<ISSUE-ID>/refs/`. It can also target one or more specific artifacts immediately after cap3, cap4, cap5, or cap6 generation. It writes:

- `.t2p/tickets/<ISSUE-ID>/refs/im-gate.md`

Rules:

- Run the shared input checks at the top of this skill.
- Ensure cap1 and cap2 have already prepared the issue worktree and ticket context; run them first if needed.
- Treat missing expected artifacts as review findings, not as permission to invent content.
- Use the host LLM for semantic judgement. Mechanical shape checks are necessary but never sufficient.
- Return `revise` when an artifact is formatted correctly but not useful, grounded, actionable, testable, or meaningful for its downstream workflow.
- Do not modify Linear directly.
- Do not load external Linear-ticket skills for this capability; the review rubric is self-contained.

## Current Project Config Assumption

The first configured project is expected to look like:

```json
{
  "projects": {
    "nsdk": {
      "aliases": ["narrative-sdk"],
      "repo": "https://github.com/finoge-app/nsdk.git",
      "default_branch": "staging"
    }
  }
}
```

Treat this as an example only; always read the live `ssot-config.json`.
