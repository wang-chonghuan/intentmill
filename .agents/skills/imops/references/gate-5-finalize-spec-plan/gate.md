# Gate 5: Finalize Spec And Plan

Use this gate after cap5 produces `ticket-worktree-t2p refs path/im-spec.md` and `ticket-worktree-t2p refs path/im-plan.md`.

This gate protects the first cause of cap5 output: `im-spec.md` and `im-plan.md` must make cap6 converge on the intended delivery without ambiguity, misunderstanding, excess freedom, or implementation drift.

Do not enter detailed semantic checks first. Start by asking why these artifacts exist in this form and whether cap6 could follow them while still missing that purpose.

Apply `references/common/spec-plan-dev-review-common-rules.md` and `references/common/spec-plan-artifact-rules.md` while evaluating final spec, final plan, and spec/plan separation.

## Evaluation Inputs

Read:

- `ticket-worktree-t2p refs path/im-draft.md`
- `ticket-worktree-t2p refs path/im-grill.md`, when present
- `ticket-worktree-t2p refs path/im-spec.md`
- `ticket-worktree-t2p refs path/im-plan.md`
- ticket requirement context under `ticket-worktree-t2p path`
- issue worktree `AGENTS.md`
- issue worktree `.evodocs/constitution.md`
- relevant `.evodocs/mod--*.md` files
- targeted code and existing tests needed to evaluate behavioral contracts
- cap5's gate context package, when prepared
- `references/common/spec-plan-dev-review-common-rules.md`
- `references/common/spec-plan-artifact-rules.md`

Do not rely only on section headings. Compare the artifacts against the requirement, draft, grill decisions, evodocs, targeted code, and existing tests.

## Independent Review

For substantial semantic evaluation, prefer running this gate in a separate subagent when the host supports it. Provide the subagent the cap5 gate context package: purpose, source of truth, generated outputs, relevant evidence, boundaries, known drift risks, and hard checks.

The reviewer must judge whether the artifacts achieve their purpose, not whether they look reasonable or match the producing agent's apparent intent. If no subagent is available, the current agent must adopt that independent review stance explicitly.

## First-Cause Purpose Check

Ask these questions before any detailed semantic or hard check:

- What were `im-spec.md` and `im-plan.md` created to achieve for cap6?
- Does `im-spec.md` give cap6 a non-negotiable delivery contract?
- Does `im-plan.md` give cap6 a constrained implementation and test route for that contract?
- Could cap6 follow these artifacts and still miss the delivery goal because of ambiguity, misunderstanding, too much freedom, or drift?

Fail gate5 immediately if the artifacts are shape-complete but do not achieve this first cause. Do not let later checklist items compensate for a failed purpose check.

## Pass Conditions

All of these must be true:

- `im-spec.md` and `im-plan.md` achieve their first cause for cap6.
- Cap6 cannot follow the artifacts and still miss the delivery goal because of ambiguity, misunderstanding, too much freedom, or drift.
- `im-spec.md` exists.
- `im-plan.md` exists.
- `im-draft.md` has `## Grill Required` set to `completed` or `no`.
- `im-grill.md`, when present, has no empty or `TBD` `final_decision`.
- `im-spec.md` is declarative and describes what must be true after delivery.
- `im-plan.md` is procedural and describes how to implement and test the spec.
- Both artifacts follow `references/common/spec-plan-dev-review-common-rules.md`.
- Both artifacts follow `references/common/spec-plan-artifact-rules.md`.
- `im-spec.md` has no blocking open questions.
- `im-plan.md` does not add requirements absent from `im-spec.md`.
- `final_decision` values from `im-grill.md` are reflected in `im-spec.md`.
- Options rejected by `im-grill.md` final decisions do not appear as planned work.
- The two artifacts do not contradict each other.
- Critical existing contracts relevant to the issue are explicitly represented in `im-spec.md`.
- `im-plan.md` contains enough detail to preserve those contracts during cap6.
- Confirmed requirements are not weakened into optional behavior.
- Shared code changes have regression coverage or an explicit no-other-consumers finding.
- The unit test plan covers high-risk behavior, not only the happy path.
- Evidence references are current and do not point to deleted, stale, local absolute, or machine-specific paths.

## Required Shape Checks

Fail when any of these are true:

- Missing `# IntentMill Spec`.
- Missing any required spec section:
  - `## Intent`
  - `## Scope`
  - `## Non-Scope`
  - `## Requirements`
  - `## Critical Existing Contracts`
  - `## Confirmed Decisions`
  - `## Compatibility And Regression Constraints`
  - `## Open Questions`
- `## Open Questions` is not exactly `None.`.
- Missing `# IntentMill Plan`.
- Missing any required plan section:
  - `## Source Contract`
  - `## Implementation Approach`
  - `## Implementation Drift Controls`
  - `## Phases`
  - `## Unit Test Plan`
  - `## Handoff Expectations`
- `im-plan.md` does not reference `im-spec.md` as the source contract.
- Local absolute paths or machine-specific paths appear.
- AutoQA ac-cases, t2p-review, PR creation, human review, or RG promotion are planned inside imops.

## Completion-State Checks

Fail when any of these are true:

- `im-draft.md` has `## Grill Required` set to `yes`.
- `im-draft.md` has `## Grill Required` set to anything other than `completed`, `no`, or `yes`.
- `im-grill.md` contains an empty or `TBD` `final_decision`.
- Draft, grill, spec, or plan contains a blocking open question.
- A grill final decision is missing from `im-spec.md`.
- A grill final decision is contradicted by `im-spec.md` or `im-plan.md`.

If this reveals a real unresolved user or architecture decision, stop cap5 and return to cap4. Do not allow cap5 to invent the answer.

## Spec Semantic Sufficiency Checks

Review `im-spec.md` against the tech-issue requirement, final `im-draft.md`, `im-grill.md`, evodocs, targeted code, and relevant existing tests.

Fail when the spec:

- loses the original intent
- expands scope beyond confirmed requirement, evidence, or decisions
- omits relevant non-scope or rejected options
- leaves a confirmed requirement as an assumption or open question
- omits relevant UI, DB/schema, prompt, state machine, API, dependency, service, config, deployment, data, permission, lifecycle, privacy, trace, logging, or compatibility requirements
- hides an implementation-relevant existing contract behind vague language
- can be satisfied while bypassing a known required state machine, lifecycle rule, validation gate, retry/repair path, exception mapping, permission check, persistence shape, privacy boundary, or shared-wrapper contract
- describes implementation sequencing, patch steps, or file-edit procedure instead of delivery requirements
- references stale evidence, deleted rule files, local absolute paths, or machine-specific paths

`## Critical Existing Contracts` must not be empty unless targeted evidence shows there are no implementation-relevant existing contracts for this issue. If it is empty, the spec must explicitly say why.

## Plan Semantic Sufficiency Checks

Review `im-plan.md` against `im-spec.md`.

Fail when the plan:

- adds, reinterprets, or expands requirements beyond `im-spec.md`
- omits an implementation path for any spec requirement or compatibility constraint
- uses umbrella wording that allows bypassing critical contracts named in `im-spec.md`
- fails to name the state, ordering, validation, lifecycle, error, data, permission, privacy, trace, logging, prompt, API, config, or shared-wrapper behavior needed to preserve the spec
- reintroduces options rejected by final grill decisions
- touches a shared wrapper/helper/schema/config/API/service without regression checks for existing consumers or an explicit finding that no other consumers exist
- tells cap6 to use a new helper, schema, config path, dependency, service, prompt pattern, or fallback without evidence that the spec requires it
- fails to include a practical implementation sequence
- fails to include verification points for phases
- fails to include handoff expectations for `im-handoff.md`
- tells cap6 to return to cap4 after cap4 completion

## First-Cause Drift Review

Run this adversarial review before passing gate5.

Ask: if a capable implementer wanted to take the simplest possible shortcut, could they follow `im-spec.md` and `im-plan.md` and still miss the artifacts' first cause?

Fail if the answer is yes.

Check these drift patterns:

- The artifacts do not clearly justify why their sections or constraints exist for cap6.
- A section looks complete but does not reduce ambiguity, misunderstanding, freedom, or drift.
- A new integration could bypass an existing local validation gate, state machine, tool/callback order, lifecycle transition, retry/repair loop, or exception mapping.
- A structured output, generated response, UI shortcut, helper abstraction, schema change, config change, prompt change, or service wrapper could satisfy the headline requirement while skipping required checks.
- A confirmed parameter, model, config, permission, API behavior, prompt behavior, or dependency behavior is described as optional or best-effort.
- Implementation uncertainty is handled through silent fallback, downgrade, no-op, or omission instead of fail-fast, explicit verification, handoff, or a cap4 decision.
- Shared code can change without proving existing consumers remain compatible.
- The plan does not tell cap6 how to detect a violation before shipping.

## Weakening-Language Checks

Search both artifacts for requirement-weakening language, including:

- `where supported`
- `if supported`
- `if possible`
- `may`
- `might`
- `could`
- `consider`
- `optional`
- `best effort`
- `as needed`
- `where appropriate`
- `likely`
- `probably`
- `should try`

These terms are not automatically forbidden in every sentence, but they are forbidden when they weaken a confirmed requirement, compatibility constraint, regression check, test expectation, or drift control.

Fail when weakening language appears in a way that allows cap6 to omit, downgrade, or silently fallback from confirmed behavior. Rewrite the artifact so the requirement is mandatory, the uncertainty is verified, or the issue returns to cap4.

## High-Risk Test Plan Checks

Review `## Unit Test Plan` against the spec, targeted code, and shared components touched by the plan.

Fail when the test plan covers only happy-path behavior or misses high-risk assertions relevant to the issue.

Require tests or explicit cap6 verification steps for relevant categories:

- confirmed config/model/prompt/API parameters reaching the integration boundary
- state-machine ordering and required gates
- validation, repair, retry, timeout, and error behavior
- exception mapping and partial-success behavior
- permission, privacy, trace, logging, and data-leakage boundaries
- persistence/data-shape compatibility
- shared wrapper/helper/schema/config/API/service consumers that could regress
- rejected options remaining absent
- no unrelated behavior changes

If a high-risk behavior cannot be unit-tested inside `ticket-worktree-t2p tests path`, the plan must explain why and name the closest lower-level static, contract, integration, or existing-test check cap6 should use.

## Evidence Freshness Checks

Fail when:

- artifacts reference deleted or obsolete rule files when the current repository rule file is known
- artifacts cite evidence that was not read or cannot be found
- artifacts omit required evidence from `AGENTS.md`, `.evodocs/constitution.md`, ticket requirement context, relevant evodocs, or targeted code
- artifacts use local absolute paths or machine-specific paths instead of repo-root-relative paths
- external SDK/API/cloud behavior is guessed instead of verified through the repo-required docs workflow when it affects the plan

## Failure Handling

If the failure is first-cause purpose failure, section shape, spec/plan boundary pollution, missing confirmed decisions, contradiction, missing critical contracts, weak optional wording, stale evidence, insufficient drift controls, or weak test planning, rerun cap5 with the gate findings as constraints.

If the failure is a blocking unresolved decision, stop cap5 and return to cap4.

If the failure reveals that cap3's draft evidence is insufficient, return to cap3 before rerunning cap5.

If the failure depends on external SDK/API/cloud behavior and docs were not fetched, run the repo-required docs workflow before rerunning cap5. If docs cannot be fetched, record the limitation and fail fast rather than guessing.
