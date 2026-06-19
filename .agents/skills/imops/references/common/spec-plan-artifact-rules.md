# Common Spec And Plan Artifact Rules

Use this reference whenever an imops capability drafts, finalises, or gates requirement/spec/plan artifacts.

These rules are shared by cap3 and cap5. They describe artifact quality and spec/plan separation. They are not development instructions. Capability-specific documents may add stricter artifact rules, but they must not weaken this common contract.

Apply `references/common/spec-plan-dev-review-common-rules.md` together with this file. Evidence requirements and shared planning principles live there so cap3, cap5, and cap6 can use the same baseline.

## Spec Artifact Requirements

Spec material answers what must be true after delivery.

Spec material should cover, when relevant:

- intent
- scope
- non-scope
- compatibility requirements
- input/output contracts
- state and data requirements
- permission requirements
- UI requirements
- prompt requirements
- API requirements
- config, secret, and deployment requirements
- dependency requirements
- service requirements
- lifecycle behavior

Spec material must preserve the original user intent, include only confirmed scope, and clearly separate scope from non-scope.

Draft spec material may include uncertain requirements only when explicitly labelled as assumptions, risks, or draft material. Final `im-spec.md` may include only requirements confirmed by the tech issue, evodocs/code facts, or final grill decisions.

Spec material must not include implementation sequencing, detailed task steps, exact patch instructions, or file-edit procedure.

## Plan Artifact Requirements

Plan material answers how to implement and test the spec.

Plan material should cover, when relevant:

- likely modules or code areas to inspect or change
- likely test areas
- sequencing constraints
- how the direction preserves existing architecture
- which existing helpers, libraries, config paths, schema paths, and SSOT files should be reused
- why the direction is the simplest effective approach currently known
- what unrelated code or behavior must be left untouched

Cap3 draft-plan material must stay rough. It must not overcommit to exact implementation, detailed patch steps, or irreversible choices unless those choices are already required by the tech issue or existing contracts.

Cap5 final-plan material must use `im-spec.md` as the source contract. Every planned step must be traceable to a spec requirement, confirmed decision, or compatibility constraint.

`im-plan.md` must not add, reinterpret, or expand requirements beyond `im-spec.md`. Options rejected by final grill decisions must not reappear as planned work.

The final plan may include implementation-time checks and handoff expectations for cap6. It must not reopen cap4 for new decisions after cap4 has completed. Plan deviations, missed user-review points, residual issues, and future improvements discovered during cap6 are recorded in `im-handoff.md`.

## Spec And Plan Separation

- `im-spec.md` owns what to build.
- `im-plan.md` owns how to build and test it.
- The two artifacts must not contradict each other.
- `im-spec.md` must have no blocking open questions.
- `im-plan.md` must reference `im-spec.md` as the source contract.
- `im-draft.md` and `im-grill.md` may be mentioned by cap5 only as background sources.
