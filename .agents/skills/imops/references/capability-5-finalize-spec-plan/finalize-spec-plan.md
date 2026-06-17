# Capability 5: Finalize Spec And Plan

Use this reference to generate final `ticket-worktree-t2p refs path/im-spec.md` and `ticket-worktree-t2p refs path/im-plan.md`.

## Purpose

Turn the final draft and completed grill decisions into two cleanly separated artifacts:

- `im-spec.md`: the confirmed requirement contract, answering what must be true after delivery.
- `im-plan.md`: the execution plan, answering how to implement and test the spec.

## Required Inputs

- `ticket-worktree-t2p refs path/im-draft.md`
- `ticket-worktree-t2p refs path/im-grill.md`
- ticket requirement context under `ticket-worktree-t2p path`
- `.evodocs/index.json`
- relevant code and evodocs facts from cap3/cap4

If `im-grill.md` is missing, run cap4. If any `im-grill.md` decision item has an empty or `TBD` `final_decision`, stop and return to cap4. If `im-draft.md` is missing, run cap3.

## Output Paths

```text
ticket-worktree-t2p refs path/im-spec.md
ticket-worktree-t2p refs path/im-plan.md
```

Do not create or use `.intentmill/` for cap5. `ticket-worktree-t2p refs path` is the only valid IntentMill artifact directory for final spec and plan.

## im-spec.md Shape

Use this top-level structure:

```markdown
# IntentMill Spec

## Intent

## Scope

## Non-Scope

## Requirements

## Confirmed Decisions

## Compatibility And Regression Constraints

## Open Questions
```

### Intent

State the user/business intent in concise declarative language.

### Scope

List what this issue owns. Scope must be independently deliverable.

### Non-Scope

List adjacent work that is explicitly out of scope.

### Requirements

Declare what must be true after delivery. Include input/output contracts, state/data requirements, UI/API/prompt/config/dependency/service requirements, and lifecycle behaviour only when confirmed by the tech issue, evodocs/code facts, or grill decisions.

Do not write implementation steps.

### Confirmed Decisions

Copy or summarise `final_decision` values from `im-grill.md` that final implementation must obey.

### Compatibility And Regression Constraints

Declare existing behaviours and contracts that must remain compatible.

### Open Questions

This section must be:

```text
None.
```

If a blocking open question remains, do not write a final spec; return to cap4.

## im-plan.md Shape

Use this top-level structure:

```markdown
# IntentMill Plan

## Source Contract

## Implementation Approach

## Phases

## Unit Test Plan

## Stop Conditions
```

### Source Contract

Reference `im-spec.md` as the only requirement contract. Mention `im-draft.md` and `im-grill.md` only as background.

### Implementation Approach

Describe the implementation strategy in terms of modules, contracts, and sequencing. Do not add requirements.

### Phases

Use numbered phases with concrete steps. Each step should name expected changes or inspections and a verification point.

### Unit Test Plan

Describe where ticket-scoped unit tests should live under `ticket-worktree-t2p tests path`, which existing tests are relevant, and which commands should be run when known.

### Stop Conditions

List conditions that require stopping and returning to cap4, including new UI, DB/schema, prompt, state machine, external API, dependency, service, config/secrets/deployment, or scope decisions.

## Rules

- `im-spec.md` owns what to build.
- `im-plan.md` owns how to build and test it.
- `im-plan.md` must not add, reinterpret, or expand requirements beyond `im-spec.md`.
- Options rejected by `final_decision` values in `im-grill.md` must not reappear in `im-plan.md`.
- Do not write any IntentMill artifact outside `ticket-worktree-t2p refs path`.
- Do not generate AutoQA ac-cases.
- Do not run t2p-review.
- Do not generate PRs.

## Gate

After writing both files, run `references/gate-5-finalize-spec-plan/gate.md`.

If gate5 fails and the problem can be repaired without user input, rerun cap5 with gate findings as constraints. If gate5 finds a blocking unresolved decision, stop and return to cap4.
