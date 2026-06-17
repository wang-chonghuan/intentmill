# Gate 5: Finalize Spec And Plan

Use this gate after cap5 produces `ticket-worktree-t2p refs path/im-spec.md` and `ticket-worktree-t2p refs path/im-plan.md`.

This gate protects the boundary between final requirement contract and execution plan.

## Pass Conditions

- `im-spec.md` exists.
- `im-plan.md` exists.
- `im-spec.md` is declarative and describes what must be true after delivery.
- `im-plan.md` is procedural and describes how to implement and test the spec.
- `im-spec.md` has no blocking open questions.
- `im-plan.md` does not add requirements absent from `im-spec.md`.
- `final_decision` values from `im-grill.md` are reflected in `im-spec.md`.
- Options rejected by `im-grill.md` final decisions do not appear as planned work.
- The two artifacts do not contradict each other.

## Semantic Checks

Review `im-spec.md` against the tech-issue requirement, final `im-draft.md`, and `im-grill.md`:

- Does the spec preserve the original intent?
- Does the spec include only confirmed scope?
- Does the spec clearly separate scope and non-scope?
- Does the spec include confirmed UI, DB/schema, prompt, state machine, API, dependency, service, config, deployment, data, permission, and compatibility decisions when relevant?
- Does the spec avoid implementation sequencing and file-edit instructions?

Review `im-plan.md` against `im-spec.md`:

- Is every planned step traceable to a spec requirement or compatibility constraint?
- Does the plan include a practical implementation sequence?
- Does the plan include unit test work under `ticket-worktree-t2p tests path`?
- Does the plan include stop conditions that return to cap4 for new decisions?
- Does the plan avoid reviving rejected options?

## Hard Checks

Fail when any of these are true:

- Missing `# IntentMill Spec`.
- Missing any required spec section:
  - `## Intent`
  - `## Scope`
  - `## Non-Scope`
  - `## Requirements`
  - `## Confirmed Decisions`
  - `## Compatibility And Regression Constraints`
  - `## Open Questions`
- `## Open Questions` is not `None.`.
- Missing `# IntentMill Plan`.
- Missing any required plan section:
  - `## Source Contract`
  - `## Implementation Approach`
  - `## Phases`
  - `## Unit Test Plan`
  - `## Stop Conditions`
- `im-plan.md` does not reference `im-spec.md` as the source contract.
- Local absolute paths or machine-specific paths appear.
- AutoQA ac-cases, t2p-review, PR creation, human review, or RG promotion are planned inside imops.

## Failure Handling

If the failure is section shape, spec/plan boundary pollution, missing confirmed decisions, contradiction, or plan overreach, rerun cap5 with the gate findings as constraints.

If the failure is a blocking unresolved decision, stop cap5 and return to cap4.

If the failure reveals that cap3's draft evidence is insufficient, return to cap3 before rerunning cap5.
