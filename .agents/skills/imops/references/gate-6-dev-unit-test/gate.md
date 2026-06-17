# Gate 6: Dev Unit Test

Use this gate after cap6 implements code and runs ticket-scoped unit tests.

This is a development completion gate, not a document formatting gate.

## Pass Conditions

- The implementation satisfies `im-spec.md`.
- The implementation follows `im-plan.md`, or any deviation is explicitly justified and still satisfies the spec.
- Ticket-scoped test assets exist under `ticket-worktree-t2p tests path`.
- `ticket-worktree-t2p tests path/test-results.md` exists.
- Relevant unit tests were run.
- Unit tests passed, or any failure is explicitly documented as environmental/non-blocking and not evidence of unfinished implementation.
- No new unresolved human decision remains.
- No AutoQA, t2p-review, PR, human review, or RG work was incorrectly pulled into cap6.

## Semantic Checks

Review implementation and tests against `im-spec.md` and `im-plan.md`:

- Does the code deliver the requested behaviour?
- Are non-scope boundaries respected?
- Are compatibility and regression constraints preserved?
- Are confirmed grill decisions obeyed?
- Are rejected options absent?
- Are tests meaningful for the implemented unit-level behaviour?
- Did development uncover a new UI, DB/schema, prompt, state machine, external API, dependency, service, config/secrets/deployment, or scope decision?

## Hard Checks

Fail when any of these are true:

- `im-spec.md` is missing.
- `im-plan.md` is missing.
- `AGENTS.md` was not read or is missing and cap6 continued anyway.
- `ticket-worktree-t2p tests path` is missing.
- `test-results.md` is missing.
- No test command was recorded.
- A failing test indicates unfinished implementation.
- New unresolved decisions are present.
- The implementation changes scope beyond `im-spec.md`.

## Failure Handling

If implementation or tests are incomplete, continue cap6 and fix the implementation or tests.

If a new human decision is required, stop cap6 and return to cap4. Update `im-draft.md` and `im-grill.md` with the new decision branch before finalising spec/plan again.

If `im-spec.md` and `im-plan.md` are inconsistent, stop cap6 and return to cap5. If the inconsistency is caused by unresolved human decisions, return to cap4.

Do not mark cap6 complete until this gate passes.
