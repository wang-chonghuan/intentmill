# Gate 3P: Create Draft From Predraft

Use this gate after cap3p produces `ticket-worktree-t2p refs path/im-draft.md` from `ticket-worktree-t2p refs path/im-predraft.md`.

Gate3p inherits the common draft quality bar from `references/gate-3-create-draft/gate.md`, but changes the requirement-source expectation: `im-predraft.md` is the primary user intent source, while `req.md` is optional background.

Apply `references/common/spec-plan-dev-review-common-rules.md` and `references/common/spec-plan-artifact-rules.md` while evaluating draft spec, draft plan, and evidence quality.

## Pass Conditions

- `im-predraft.md` exists in `ticket-worktree-t2p refs path`.
- `im-draft.md` exists in `ticket-worktree-t2p refs path`.
- `im-draft.md` has the required top-level sections from cap3p:
  - `# IntentMill Draft`
  - `## Source`
  - `## Draft Spec`
  - `## Draft Plan`
  - `## Code And Evodocs Findings`
  - `## Assumptions`
  - `## Risks`
  - `## Grill Required`
- `im-draft.md` records `im-predraft.md` in `## Source` as the primary user intent source.
- If `req.md` was read, `im-draft.md` records it as background context, not as the primary source.
- The draft is based on the predraft-backed requirement.
- It confirms `AGENTS.md` and `.evodocs/constitution.md` were read and obeyed.
- It uses `.evodocs` evidence.
- It includes targeted code inspection evidence.
- It follows `references/common/spec-plan-dev-review-common-rules.md`.
- It follows `references/common/spec-plan-artifact-rules.md`.
- It uses `.evodocs` to guide code inspection and records any evodocs/code disagreement with code as authoritative.
- It records any predraft conflict with `req.md`, evodocs, code, SSOT schemas, or project rules, or explicitly makes clear that no such conflict was found.
- It records external docs fetched through `find-docs` / Context7 when external library/API/SDK/cloud usage affects the draft, or states why no external docs were needed.
- It records `nf-db` usage when database operations were needed, or states why no database operation was needed.
- For frontend UI work, it records the relevant frontend `DESIGN.md` files read and follows them, or states that no relevant `DESIGN.md` exists.
- It clearly marks draft spec and draft plan as draft material.
- `im-draft.md` has `## Grill Required` set to `yes` or `no`.
- `im-draft.md` does not contain grill questions or decision-point lists.
- It does not present implementation guesses as confirmed requirements.
- It does not create final `im-spec.md` or `im-plan.md`.

## Predraft-Specific Semantic Checks

Review `im-draft.md` against `im-predraft.md`, optional `req.md`, evodocs, and inspected code:

- Does the draft preserve the user's predraft intent?
- Does the draft state that `im-predraft.md` supersedes vague or stale ticket wording for cap3p?
- If the predraft narrows or redirects the original ticket, does the draft make that scope change explicit?
- If the predraft proposes a schema, state-machine, API, UI, or architecture change, does the draft validate that proposal against code and SSOT evidence?
- If the predraft is opinionated but underspecified, does the draft mark the missing parts as assumptions, risks, or grill-required decisions?
- Does the draft avoid treating predraft sketches as final implementation instructions before grill decisions?
- Does the draft keep incompatible or rejected options out of the draft plan unless they are clearly labelled as rejected context?
- Does `## Grill Required` correctly reflect likely open decisions created by predraft/req mismatch, DB/schema changes, API compatibility, state ownership, UI scope, prompt behavior, dependencies, config/secrets/deployment, or rollout?

## General Semantic Checks

Review `im-draft.md` against the predraft-backed requirement, evodocs, and inspected code:

- Does the draft follow `AGENTS.md` and `.evodocs/constitution.md`?
- Is the draft self-contained enough for a later final spec?
- Does it distinguish confirmed facts, assumptions, risks, and decisions?
- Does it use evodocs as a guide to read the right code, while treating code as authoritative when there is conflict?
- Does it prefer existing architecture, existing helpers/libraries/config/schema paths, and the simplest effective implementation?
- Does it avoid unnecessary changes to unrelated code and behavior?
- Does it follow the common evidence and planning principles?
- Does it follow the common spec and plan artifact rules?
- Does the draft plan stay rough, or does it overcommit to exact implementation before grill?
- Are code findings used to sharpen requirement boundaries rather than replace the predraft intent?
- Are evodocs/code conflicts called out when present?

## Hard Checks

Fail when any of these are true:

- Missing `im-predraft.md`.
- Missing `# IntentMill Draft`.
- Missing any required section:
  - `## Source`
  - `## Draft Spec`
  - `## Draft Plan`
  - `## Code And Evodocs Findings`
  - `## Assumptions`
  - `## Risks`
  - `## Grill Required`
- `## Source` does not identify `im-predraft.md` as the primary user intent source.
- `req.md` is presented as the primary source over `im-predraft.md`.
- The draft silently ignores a material conflict between predraft and code, evodocs, SSOT schemas, project rules, or `req.md`.
- Local absolute paths or machine-specific paths appear.
- `im-spec.md` or `im-plan.md` is generated by cap3p.
- `im-grill.md` is generated by cap3p.
- `im-draft.md` contains `## Grill Decision Points`.
- The draft says no evodocs were read.
- The draft says no code was inspected without explaining why no code inspection was needed.
- The draft omits `AGENTS.md` or `.evodocs/constitution.md` from sources.
- External library/API/SDK/cloud usage affects the draft, but no `find-docs` / Context7 evidence or explicit limitation is recorded.
- A database operation, live data inspection, migration execution, DB read, or DB write was performed without using `nf-db`.
- Frontend UI work is proposed without reading/following the relevant frontend `DESIGN.md` when that file exists.
- The draft proposes a new library, helper, config path, schema path, or architecture without explaining why existing project options are insufficient.
- The draft proposes unrelated code or behavior changes not required by the predraft-backed requirement.
- `## Grill Required` is `no` while the draft contains unresolved assumptions about predraft/req mismatch, UI, DB/schema, prompt, state machine, external API, dependency, service, config/secrets/deployment, compatibility, or scope.
- `## Grill Required` is `completed` in cap3p output before cap4 has produced and resolved `im-grill.md`.

## Failure Handling

If the problem is weak evidence, vague wording, missing sections, source-priority ambiguity, or solution leakage that can be fixed without user input, rerun cap3p with the gate findings as constraints.

If the problem is genuinely missing human intent or a product/architecture decision, cap3p may pass control to cap4 only when `## Grill Required` is `yes`.

If cap3p repeatedly produces a plausible but unsupported draft, stop and ask for the smallest missing source or clarification.
