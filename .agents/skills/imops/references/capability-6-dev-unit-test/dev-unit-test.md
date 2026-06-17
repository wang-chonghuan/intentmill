# Capability 6: Dev Unit Test

Use this reference to implement code from `im-spec.md` and `im-plan.md`, then complete ticket-scoped unit tests.

## Purpose

Finish the IntentMill development stage for one issue: code complete and unit tests complete. This capability does not run AutoQA acceptance cases, t2p-review, PR creation, or RG promotion.

## Required Inputs

- issue worktree prepared by cap1
- ticket context prepared by cap2
- `ticket-worktree-t2p refs path/im-spec.md`
- `ticket-worktree-t2p refs path/im-plan.md`
- repository `AGENTS.md`

If `im-spec.md` or `im-plan.md` is missing, run cap5. If `AGENTS.md` is missing, stop and report that development requires repo-local agent instructions.

Read `.autoqa/rules.md` if it exists, but do not create AutoQA ac-cases in this capability.

## Workflow

1. Run the shared input checks from `SKILL.md`.
2. Work inside the issue worktree.
3. Read `AGENTS.md`.
4. Read `.autoqa/rules.md` if present.
5. Read `im-spec.md` as the requirement contract.
6. Read `im-plan.md` as the execution plan.
7. Inspect the code areas named by the plan before editing.
8. Implement the planned changes.
9. Create or update ticket-scoped unit test assets under:
   ```text
   ticket-worktree-t2p tests path/
   ```
10. Run the relevant unit tests identified in `im-plan.md`, plus any directly affected existing tests when practical.
11. Record test commands and results in `ticket-worktree-t2p tests path/test-results.md`.
12. Run `references/gate-6-dev-unit-test/gate.md`.

## Stop And Return To cap4

Stop development and return to cap4 if implementation discovers a new unconfirmed decision about:

- UI behaviour
- DB/schema
- prompts
- state machines
- external APIs
- new dependencies
- new services
- config/secrets/deployment
- scope or non-scope
- compatibility contract changes

Do not invent these decisions during development.

## Stop And Return To cap5

Stop and return to cap5 if:

- `im-spec.md` and `im-plan.md` contradict each other
- the plan cannot satisfy the spec
- the plan adds work that the spec does not require
- the spec is clear, but the plan is missing the execution path

## Test Result Artifact

Write or update:

```text
ticket-worktree-t2p tests path/test-results.md
```

Use this shape:

```markdown
# Unit Test Results

## Commands Run

## Results

## Failures

## Notes
```

If tests fail, record the exact failing command and a concise failure reason. Do not claim cap6 complete when failures represent unfinished implementation.

## Rules

- Do not generate AutoQA ac-cases.
- Do not run t2p-review.
- Do not create a PR.
- Do not change scope.
- Do not update Linear.
- Do not use tests as a substitute for satisfying `im-spec.md`.
