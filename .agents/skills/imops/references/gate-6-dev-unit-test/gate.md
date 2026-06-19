# Gate 6: Dev Unit Test

Use this gate after cap6 implements code and runs ticket-scoped unit tests.

This is a development completion gate, not a document formatting gate.

## First-Cause Completion Check

Start by asking why cap6 exists:

- Did the implementation actually make the codebase satisfy `im-spec.md` through the route constrained by `im-plan.md`?
- Could the implementation look complete while still missing the issue's purpose because of ambiguity, misunderstanding, too much freedom, weak tests, or drift from critical existing contracts?
- Did tests act as development guardrails for key backend, frontend, config, schema, prompt, state-machine, API, or component behavior where relevant, instead of appearing only as a final paperwork step?
- Does `im-handoff.md` honestly state actual changes, deviations, non-blocking missed user-review points, and residual issues?
- If cap6 ran in Codex Goal mode, did Goal mode preserve cap6 instead of replacing or weakening it?

Fail gate6 immediately if cap6 is shape-complete but does not achieve this first cause. Do not let the existence of `test-results.md` or `im-handoff.md` compensate for an implementation that has not proven the spec.

## Pass Conditions

- The implementation satisfies `im-spec.md`.
- The implementation follows `im-plan.md`, or any deviation is explicitly justified and still satisfies the spec.
- The implementation follows `references/common/spec-plan-dev-review-common-rules.md`.
- Ticket-scoped test assets exist under `ticket-worktree-t2p tests path`.
- `ticket-worktree-t2p tests path/test-results.md` exists.
- `ticket-worktree-t2p refs path/im-handoff.md` exists.
- Relevant focused tests were run for the implemented slices.
- `test-results.md` maps `im-plan.md ## Unit Test Plan` items to ticket-scoped tests, affected existing tests, lower-level static/contract checks, or documented not-run reasons.
- `test-results.md` records a development test log showing focused tests/checks run as implementation slices were completed.
- Unit tests passed, or any failure is explicitly documented as environmental/non-blocking and not evidence of unfinished implementation.
- No AutoQA, t2p-review, PR, human review, or RG work was incorrectly pulled into cap6.
- If cap6 ran in Codex Goal mode, the run satisfied the cap6 goal contract: final state, verification evidence, constraints, scope, iteration strategy, and blocker stop condition.

## Semantic Checks

Review implementation and tests against `im-spec.md` and `im-plan.md`:

- Does the code deliver the requested behaviour?
- Are non-scope boundaries respected?
- Are compatibility and regression constraints preserved?
- Are confirmed grill decisions obeyed?
- Are rejected options absent?
- Did implementation follow the common evidence requirements and shared planning principles?
- Are tests meaningful for the implemented unit-level, contract-level, or component-level behaviour?
- Do tests cover backend behavior when backend code/config/schema/API/prompt/state is touched?
- Do tests cover frontend behavior when frontend code, rendering, interaction, state, or UI contracts are touched?
- If both frontend and backend are touched, are both sides covered while keeping test assets under `ticket-worktree-t2p tests path`?
- Did tests run early enough to catch risky implementation-slice drift instead of only verifying everything at the end, as shown by `test-results.md ## Development Test Log`?
- Does `test-results.md ## Coverage Map` account for each planned test obligation?
- Does `im-handoff.md` accurately describe actual changes at feature/module/file granularity?
- Does `im-handoff.md` state whether implementation differs from `im-spec.md` or `im-plan.md`, and explain why when it differs?
- Does `im-handoff.md ## Spec And Plan Alignment` summarize coverage of the internal implementation contract: spec obligations, plan obligations, critical existing contracts, non-scope/rejected options, and test obligations?
- Does `im-handoff.md` list missed user-review points that should have been grilled earlier, or explicitly say `None.`?
- Are missed user-review points non-blocking? If any missed point affects requirements, acceptance, architecture boundaries, data/privacy behavior, security behavior, or spec satisfaction, cap6 must return to cap5 instead of completing.
- Does `im-handoff.md` record residual issues and future improvements?
- If the user invoked cap6 with a short Goal such as `/goal 请执行cap6`, was it bootstrapped with a resolved issue id, an explicit or safely inferred project, shared paths, required artifacts, common rules, and the full cap6 goal contract before implementation?
- Did Goal-mode execution keep product code work in `issue-worktree` while reading/writing IntentMill artifacts and tests under `ticket-worktree-t2p path`, especially `ticket-worktree-t2p refs path` and `ticket-worktree-t2p tests path`?
- If cap6 ran in Goal mode, did the run still produce `test-results.md`, `im-handoff.md`, and a gate6 pass instead of treating Goal completion as sufficient?

## Hard Checks

Fail when any of these are true:

- `im-spec.md` is missing.
- `im-plan.md` is missing.
- `AGENTS.md` was not read or is missing and cap6 continued anyway.
- `references/common/spec-plan-dev-review-common-rules.md` was not read.
- `ticket-worktree-t2p tests path` is missing.
- `test-results.md` is missing.
- `test-results.md` has no `## Development Test Log`.
- `test-results.md` has no `## Coverage Map`.
- `im-handoff.md` is missing.
- `im-handoff.md ## Spec And Plan Alignment` does not account for the internal implementation contract.
- No test command was recorded.
- Frontend or backend behavior touched by the implementation has no corresponding focused test/check and no documented non-applicability reason.
- A planned unit-test item has no test, static/contract check, existing-test coverage, or documented not-run reason.
- A failing test indicates unfinished implementation.
- The implementation changes scope beyond `im-spec.md`.
- A missed user-review point recorded in handoff is actually blocking for spec satisfaction, acceptance, architecture, data/privacy, or security.
- Goal mode omitted or weakened any cap6 required output, required evidence, constraint, scope boundary, iteration rule, blocker stop condition, or gate6 completion requirement.
- A short Goal invocation such as `/goal 请执行cap6` was executed without resolving `issue-id`, explicitly resolving or safely inferring `project`, resolving shared paths, and reading `im-spec.md`, `im-plan.md`, `AGENTS.md`, and required common rules.
- Goal-mode execution wrote IntentMill artifacts or ticket tests outside `ticket-worktree-t2p path`, `ticket-worktree-t2p refs path`, or `ticket-worktree-t2p tests path`.

## Failure Handling

If implementation or tests are incomplete, continue cap6 and fix the implementation or tests.

If development deviates from `im-plan.md` but still satisfies `im-spec.md`, record the deviation and rationale in `im-handoff.md`.

If development exposes a non-blocking missed user-review point that should have been grilled earlier, record it in `im-handoff.md` instead of reopening cap4.

If development exposes a missed user-review point that affects requirements, acceptance, architecture boundaries, data/privacy behavior, security behavior, or whether `im-spec.md` can be satisfied, stop cap6 and return to cap5.

If `im-spec.md` and `im-plan.md` are inconsistent, stop cap6 and return to cap5.

If cap6 was invoked through Goal mode and the Goal contract lacks required context or evidence, expand or repair the Goal-mode context before continuing. If the missing context cannot be resolved safely, stop and ask for the missing project, issue id, artifact, or environment change.

Do not mark cap6 complete until this gate passes.
