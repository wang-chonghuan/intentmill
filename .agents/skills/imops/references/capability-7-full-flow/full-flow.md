# Capability 7: Full Flow

Use this reference to orchestrate the complete imops development flow for one issue.

## Purpose

Run cap1 through cap6 in order and stop at code complete plus unit tests complete.

## Order

1. cap1 `init-worktree`
2. cap2 `init-ticket-context`
3. cap3 `create-draft`
4. gate3 `create-draft`
5. cap4 `draft-grill-loop`
6. cap5 `finalize-spec-plan`
7. gate5 `finalize-spec-plan`
8. cap6 `dev-unit-test`
9. gate6 `dev-unit-test`

## Workflow

1. Run the shared input checks from `SKILL.md`.
2. Execute cap1 using `references/capability-1-issue-worktree/issue-worktree.md`.
3. Execute cap2 using `references/capability-2-t2p-context/t2p-context.md`.
4. Execute cap3 using `references/capability-3-create-draft/create-draft.md`.
5. Run gate3. If gate3 requires user decisions, move those into cap4 rather than pretending cap3 is final.
6. Execute cap4 using `references/capability-4-draft-grill-loop/draft-grill-loop.md`. If human interaction is unavailable or blocking decisions remain, stop and report that cap4 is not complete.
7. Execute cap5 using `references/capability-5-finalize-spec-plan/finalize-spec-plan.md`.
8. Run gate5. If gate5 finds unresolved decisions, return to cap4. If it finds spec/plan quality issues, rerun cap5 with gate findings.
9. Execute cap6 using `references/capability-6-dev-unit-test/dev-unit-test.md`.
10. Run gate6. If gate6 finds implementation/test gaps, continue cap6. If it finds new decisions, return to cap4. If it finds spec/plan inconsistency, return to cap5 or cap4 as directed.

## Boundaries

Do not do the following in cap7:

- generate AutoQA ac-cases
- execute AutoQA
- run t2p-review
- generate a PR
- perform human review
- add RG cases
- update Linear unless a lower capability explicitly owns that action

## Completion Report

When cap7 completes, report:

- issue id
- issue worktree path
- ticket context path: `ticket-worktree-t2p path`
- `im-draft.md` path under `ticket-worktree-t2p refs path`
- `im-grill.md` path under `ticket-worktree-t2p refs path`
- `im-spec.md` path under `ticket-worktree-t2p refs path`
- `im-plan.md` path under `ticket-worktree-t2p refs path`
- ticket-scoped tests path: `ticket-worktree-t2p tests path`
- unit test commands run
- gate3/gate5/gate6 statuses
- any residual risk

Do not report cap7 complete unless gate6 passes.
