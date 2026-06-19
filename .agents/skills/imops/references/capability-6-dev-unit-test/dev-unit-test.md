# Capability 6: Dev Unit Test

Use this reference to implement code from `im-spec.md` and `im-plan.md`, while creating and running ticket-scoped key tests during development.

## Purpose

Finish the IntentMill development stage for one issue: code complete and unit tests complete.

The first cause of cap6 is to make the codebase actually satisfy `im-spec.md` through the route constrained by `im-plan.md`, with enough focused tests to catch implementation drift before the work is reported complete.

Cap6 tests are development guardrails, not a final paperwork step. Add or update focused tests as risky implementation slices are completed, then run those tests before moving on. Do not implement the whole ticket first and only then discover that many key paths are broken.

Cap6 supports direct execution and Codex Goal mode. Goal mode is only an execution wrapper; it must not weaken this workflow, required outputs, or gate6.

This capability does not run AutoQA acceptance cases, t2p-review, PR creation, or RG promotion.

## Required Inputs

- issue worktree prepared by cap1
- ticket context prepared by cap2
- `ticket-worktree-t2p refs path`
- `ticket-worktree-t2p tests path`
- `ticket-worktree-t2p refs path/im-spec.md`
- `ticket-worktree-t2p refs path/im-plan.md`
- repository `AGENTS.md`

If `im-spec.md` or `im-plan.md` is missing, stop and run cap5, then resume cap6 only after gate5 passes. If `AGENTS.md` is missing, stop and report that development requires repo-local agent instructions.

Read `.evodocs/constitution.md` if it exists, but do not create AutoQA ac-cases in this capability.

## Execution Modes

Cap6 supports two execution modes.

### Direct Execution Mode

Use this mode when the user asks to run `imops cap6`, `dev-unit-test`, `develop from im plan`, or `开发并跑单测` directly.

Follow the workflow in this document inside the current thread: resolve shared inputs, read required context, build the internal implementation contract, implement, create ticket-scoped tests, run focused tests as implementation slices complete, write `test-results.md`, write `im-handoff.md`, and run gate6.

### Codex Goal Mode

Use this mode when the user starts or asks for Codex Goal mode, including short goals such as:

```text
/goal 请执行cap6
```

Codex Goal mode gives the work a persistent objective, but it does not replace cap6. Treat the user's short goal as a request to run cap6, then expand it internally into the cap6 goal contract below before development starts.

Goal mode must preserve the same required outputs and pass the same gate6 as direct execution mode.

## Codex Goal Mode Bootstrap

When cap6 is invoked through Goal mode, bootstrap enough context before editing code:

1. Resolve `issue-id` first. Accept an explicit issue id in the goal text, the current conversation, the current issue worktree name, or the current `.t2p/tickets/{issue_id}` path.
2. Resolve `project` after `issue-id`. Accept an explicit project key/alias, infer it from a current issue worktree shaped like `{project_key}--{issue_id}`, infer it from a resolved `ticket-worktree-t2p path`, infer it from prior conversation context, or infer it from `ssot-config.json` when exactly one project exists.
3. If `issue-id` cannot be resolved safely, stop and ask for it. If multiple project candidates remain after the safe inference sources above, stop and ask for the project. Do not guess.
4. Run the shared input checks from `SKILL.md`: work from the IntentMill repository root, read `ssot-config.json`, resolve the project, normalize the issue id, and resolve `issue-worktree`, `ticket-worktree-t2p path`, `ticket-worktree-t2p refs path`, and `ticket-worktree-t2p tests path`.
5. Use the resolved path roles consistently:
   - product code inspection and editing happens in `issue-worktree`
   - IntentMill ticket artifacts live under `ticket-worktree-t2p path`
   - `im-spec.md`, `im-plan.md`, and `im-handoff.md` live under `ticket-worktree-t2p refs path`
   - ticket-scoped tests and `test-results.md` live under `ticket-worktree-t2p tests path`
6. Confirm cap1 and cap2 context exists for the issue worktree and ticket context.
7. Confirm `im-spec.md` and `im-plan.md` exist under `ticket-worktree-t2p refs path`.
8. Confirm cap5/gate5 completion is represented by usable final `im-spec.md` and `im-plan.md` with no blocking open questions. If missing or inconsistent, stop and run cap5, then resume cap6 only after gate5 passes.
9. Read `AGENTS.md`, `references/common/spec-plan-dev-review-common-rules.md`, `.evodocs/constitution.md` when present, `im-spec.md`, and `im-plan.md`.
10. Expand the short Goal into the internal cap6 goal contract below. This can remain internal, but the final `im-handoff.md` and `test-results.md` must prove the contract was satisfied.

## Cap6 Goal Contract

A Goal-mode cap6 run must preserve these fields, even when the user supplied only `/goal 请执行cap6`.

Final state:

- Product code satisfies `im-spec.md`.
- Implementation follows `im-plan.md`, or deviations are justified and still satisfy `im-spec.md`.
- Ticket-scoped key tests/checks are written under `ticket-worktree-t2p tests path`.
- Relevant focused tests/checks are run as implementation slices complete.
- `ticket-worktree-t2p tests path/test-results.md` is complete.
- `ticket-worktree-t2p refs path/im-handoff.md` is complete.
- gate6 passes.

Verification evidence:

- Commands and results in `test-results.md`.
- `Development Test Log` showing focused tests/checks run during implementation slices.
- `Coverage Map` mapping every `im-plan.md ## Unit Test Plan` item.
- `im-handoff.md ## Spec And Plan Alignment` showing implementation contract coverage.
- gate6 pass result.

Constraints:

- Preserve `im-spec.md` requirements, `im-plan.md` implementation route, critical existing contracts, non-scope, and rejected options.
- Do not generate AutoQA ac-cases.
- Do not run t2p-review.
- Do not create a PR.
- Do not update Linear.
- Do not update `im-draft.md` or `im-grill.md`.
- Do not treat Goal completion as a substitute for gate6 completion.

Scope:

- Use `issue-worktree` for product code inspection and editing. Use `ticket-worktree-t2p path` for IntentMill ticket context. Use `ticket-worktree-t2p refs path` for `im-spec.md`, `im-plan.md`, and `im-handoff.md`. Use `ticket-worktree-t2p tests path` for ticket-scoped tests and `test-results.md`. Use `AGENTS.md`, `.evodocs/constitution.md` when present, `references/common/spec-plan-dev-review-common-rules.md`, relevant evodocs, targeted product code, and relevant tests.

Iteration strategy:

- Complete one risky implementation slice at a time.
- Add or update the focused ticket-scoped test/check for that slice.
- Run the focused test/check and any directly affected existing test when practical.
- Update the `Development Test Log` and `Coverage Map`.
- Choose the next highest-risk unmet spec/plan obligation.

Blocker stop condition:

- Stop if `issue-id` cannot be resolved.
- Stop if `project` cannot be provided or safely inferred from path/context/unique project configuration.
- Stop if `im-spec.md` and `im-plan.md` are missing, inconsistent, or not implementation-ready.
- Stop if development exposes a missed user-review point that affects requirements, acceptance, architecture boundaries, data/privacy behavior, security behavior, or whether the spec can be satisfied.
- Stop if required evidence cannot be produced, tests show unfinished implementation, or no viable path remains.
- Report the evidence collected, the blocker, and the cap5/user input/environment change needed to continue.

## Workflow

1. Run the shared input checks from `SKILL.md`.
2. Work inside the issue worktree.
3. Read `AGENTS.md`.
4. Read `references/common/spec-plan-dev-review-common-rules.md` from the imops skill directory.
5. Read `.evodocs/constitution.md` if present.
6. Read `im-spec.md` as the requirement contract.
7. Read `im-plan.md` as the execution plan.
8. Build an internal implementation contract before editing. Do not write a separate artifact unless the user asks. The contract must identify:
   - spec obligations: what `im-spec.md` says must be true after delivery
   - plan obligations: implementation and verification steps required by `im-plan.md`
   - critical existing contracts that must be preserved
   - non-scope and rejected options that must remain absent
   - test obligations from `im-plan.md ## Unit Test Plan`
   - stop-and-return-to-cap5 triggers
9. Inspect the code areas named by the plan before editing.
10. Implement the planned changes using the common evidence requirements, shared planning principles, and the internal implementation contract.
11. Create or update ticket-scoped key tests under:
   ```text
   ticket-worktree-t2p tests path/
   ```
12. Run focused tests as each risky implementation slice is completed, plus any directly affected existing tests when practical. Do not defer all verification to the end.
13. Record test commands, results, the development test log, and coverage mapping in `ticket-worktree-t2p tests path/test-results.md`.
14. Record the IntentMill development handoff in `ticket-worktree-t2p refs path/im-handoff.md`.
15. Run `references/gate-6-dev-unit-test/gate.md`.

## Test Design

Cap6 tests must be narrow enough to help development and strong enough to catch drift from `im-spec.md` and `im-plan.md`.

Test assets must live under:

```text
ticket-worktree-t2p tests path/
```

This path restriction controls where test assets are written. It does not limit what they can test. Ticket-scoped tests may exercise backend modules, frontend components, configuration, schemas, prompts, state machines, API boundaries, helper functions, or other product code touched by the issue.

If the ticket touches backend behavior, include backend-focused tests or checks. If it touches frontend behavior, include frontend component, rendering, interaction, state, or contract tests/checks. If it touches both frontend and backend, cover both sides. If one side is not relevant, record that in `test-results.md`.

Prefer focused unit, contract, or component tests for the current implementation slice:

- key function inputs and outputs
- state-machine or lifecycle ordering
- schema and data-shape compatibility
- config, model, prompt, API, or dependency parameters reaching the intended boundary
- frontend rendering, component state, or user interaction behavior relevant to the spec
- error, retry, repair, timeout, cancellation, partial-success, or exception behavior
- privacy, permission, trace, logging, or no-data-leak boundaries
- non-scope behavior and rejected options remaining absent

Do not use broad end-to-end tests or late manual checks as the only evidence when a small contract or component test can protect the risky behavior earlier.

For each item in `im-plan.md ## Unit Test Plan`, record one of these in `test-results.md`:

- covered by a ticket-scoped test command
- covered by an existing affected test command
- covered by a lower-level static/contract check
- not run, with a reason that does not hide unfinished implementation

## IntentMill Handoff

Write or update:

```text
ticket-worktree-t2p refs path/im-handoff.md
```

Use this shape:

```markdown
# IntentMill Handoff

## Actual Changes

## Spec And Plan Alignment

## User Review Points

## Residual Issues And Future Improvements
```

Record what was actually changed, but keep it at feature/module/file granularity. Do not write a function-by-function changelog unless a file name alone is ambiguous.

In `## Spec And Plan Alignment`, state whether the implementation differs from `im-spec.md` or `im-plan.md`; if it differs, explain why and whether the delivered behavior still satisfies `im-spec.md`. Also summarize whether the internal implementation contract was covered: spec obligations, plan obligations, critical existing contracts, non-scope/rejected options, and test obligations.

In `## User Review Points`, list anything that should have been grilled earlier but was missed, or write `None.`.

Only non-blocking missed user-review points may be recorded here while still completing cap6. If a missed point changes or may change requirements, acceptance, architecture boundaries, data/privacy behavior, security behavior, or whether `im-spec.md` can be satisfied, stop cap6 and return to cap5 instead of treating the handoff as an escape hatch.

In `## Residual Issues And Future Improvements`, record known limitations, follow-up work, and future improvements that are not required for the current spec.

Do not reopen cap4 or mutate `im-draft.md` / `im-grill.md` during cap6.

## Stop And Return To cap5

Stop and return to cap5 if:

- `im-spec.md` and `im-plan.md` contradict each other
- the plan cannot satisfy the spec
- the plan adds work that the spec does not require
- the spec is clear, but the plan is missing the execution path
- development exposes a missed user-review point that affects requirements, acceptance, architecture boundaries, data/privacy behavior, security behavior, or whether the spec can be satisfied

Do not return to cap4 from cap6. Cap4 is expected to be complete before cap5 and cap6. If development exposes a non-blocking missed user-review point that would normally have belonged in grill, record it in `im-handoff.md` and the final response instead of reopening grill.

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

## Development Test Log

## Coverage Map

## Failures

## Notes
```

In `## Development Test Log`, record the implementation slices and focused tests/checks run as those slices were completed. This log is evidence that tests were used during development rather than only at the end.

In `## Coverage Map`, map every `im-plan.md ## Unit Test Plan` item to a ticket-scoped test, existing affected test, lower-level static/contract check, or a documented not-run reason.

If tests fail, record the exact failing command and a concise failure reason. Do not claim cap6 complete when failures represent unfinished implementation.

## Rules

- Do not generate AutoQA ac-cases.
- Do not run t2p-review.
- Do not create a PR.
- Do not change scope.
- Do not update Linear.
- Do not use tests as a substitute for satisfying `im-spec.md`.
- Do not update `im-draft.md` or `im-grill.md` during cap6.
