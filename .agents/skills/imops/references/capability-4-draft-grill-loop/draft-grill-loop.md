# Capability 4: Create Grill Document

Use this reference to create or refresh `ticket-worktree-t2p refs path/im-grill.md` from `im-draft.md`.

## Purpose

Create and maintain the canonical grill document that records blocking product and architecture decisions needed before final spec and plan generation. Cap4 is idempotent and may be run many times. Each run audits the full draft and current grill, incorporates any declarative answers into the draft, adds only missing blocking decisions, and stops when the grill and draft are aligned. It does not directly ask the user questions.

## Required Inputs

- An issue worktree prepared by cap1.
- Ticket context prepared by cap2.
- `ticket-worktree-t2p refs path/im-draft.md` produced by cap3 and passed or handed off by gate3.

If `im-draft.md` is missing, run cap3 first.

## Output Paths

Canonical artifacts:

```text
ticket-worktree-t2p refs path/im-grill.md
ticket-worktree-t2p refs path/im-draft.md
```

`im-grill.md` is the canonical grill artifact. Do not create or leave any generic grill artifact as the downstream artifact.

Do not create or use `.intentmill/` for cap4. `ticket-worktree-t2p refs path` is the only valid IntentMill artifact directory for `im-grill.md` and updated `im-draft.md`.

## Workflow

1. Run the shared input checks from `SKILL.md`.
2. Read `references/common/spec-plan-dev-review-common-rules.md` from the imops skill directory.
3. Use the local decision-tree rules in this reference. Do not load `n-grill`, do not start an interactive interview, and do not ask the user questions from cap4.
4. Work inside the issue worktree.
5. Read the full `im-draft.md` and the existing `im-grill.md` if present.
6. If `im-draft.md` has `## Grill Required` set to `no`, create `im-grill.md` with `## Decisions` set to `None.` and complete cap4. `no` means the draft never needed grill decisions.
7. If `im-draft.md` has `## Grill Required` set to `completed`, audit that `im-grill.md` has no `TBD` decisions and that all final decisions are reflected in the draft. If aligned, make no changes and complete cap4.
8. If `im-draft.md` has `## Grill Required` set to `yes`, audit the entire draft, not only assumptions/risks/findings. Review all draft sections for unresolved decisions that would block final spec/plan quality.
9. Preserve existing grill decision ids and user-supplied declarative `final_decision` values. Do not rewrite answered decisions unless needed to fix formatting while preserving meaning.
10. Merge every declarative `final_decision` from `im-grill.md` into the relevant `im-draft.md` sections so draft and grill are aligned.
11. If a user-supplied `final_decision` is phrased as a question or leaves an open-ended choice, do not treat it as final. Reset that item to `final_decision: TBD`, inspect code/evodocs/allowed external docs for discoverable facts, then append a new numbered decision item with a recommendation and `final_decision: TBD`.
12. Before adding a decision, inspect evodocs or code when the answer is discoverable from the repository. Do not ask the user to answer facts that are discoverable from code.
13. Build a decision tree covering only material branches that block final spec/plan quality: scope, goals, non-goals, data model, external APIs/SDKs, state machines, prompts, migrations, rollout/config/secrets/deployment, observability, tests, risks, dependencies, and compatibility.
14. Add a new numbered decision item only when the full-draft audit finds a blocking human decision that is not already represented by an existing grill item and cannot be resolved from code/docs. Give it a concise question, a recommended answer, and `final_decision: TBD`.
15. If all decisions have declarative `final_decision` values and the draft reflects all of them, do not add new questions. Update `## Grill Required` in `im-draft.md` to `completed` to show grill was required and has been completed.
16. Do not add `notes`, transcript, chat history, or extra fields to `im-grill.md`. Keep the artifact as a concise decision table using only `id`, `question`, `recommendation`, and `final_decision`.

## im-grill.md Shape

Use this exact top-level structure:

```markdown
# IntentMill Grill

## Decisions
```

`## Decisions` is a flat numbered list. Each item must contain only:

- `id`
- `question`
- `recommendation`
- `final_decision`

During cap4, unresolved human decisions should keep `final_decision: TBD`. Only declarative user answers belong in `final_decision`; questions or open-ended instructions must be converted into new decision items rather than stored as final decisions.

## im-draft.md Updates

When cap4 discovers new evidence while building the grill document, update `im-draft.md`:

- preserve the evidence requirements and shared planning principles from `references/common/spec-plan-dev-review-common-rules.md`
- merge confirmed user decisions into the relevant draft sections
- keep rejected options out of draft-plan direction unless mentioned as rejected context
- add or sharpen risks, assumptions, or dependencies discovered by code inspection
- do not mark assumptions as confirmed or rejected unless the repository evidence proves the point
- when every grill decision has a declarative `final_decision` and the draft reflects them all, set `## Grill Required` to `completed`

Do not create `im-spec.md` or `im-plan.md` in cap4.
Do not write any IntentMill artifact outside `ticket-worktree-t2p refs path`.

## Completion Check

Cap4's artifact update for the current run is complete when:

- `im-grill.md` exists in `ticket-worktree-t2p refs path`
- `im-grill.md` uses the required shape
- `## Decisions` is exactly `None.` when no grill is required, or every blocking human decision has a numbered item with `id`, `question`, `recommendation`, and `final_decision`
- unresolved decisions use `final_decision: TBD`
- no direct user question is asked as part of cap4
- if there are no `TBD` decisions, all grill decisions are reflected in `im-draft.md` and `## Grill Required` is `completed`

If `im-grill.md` still contains `TBD` decisions, cap4 has produced a valid current grill artifact but the flow is blocked before cap5 until the user provides declarative answers and a later cap4 run reflects them into `im-draft.md`.

If `im-grill.md` omits a blocking decision found anywhere in `im-draft.md`, cap4 is not complete. If there are no omitted decisions, no invalid/nondeclarative answers, no `TBD` decisions, and draft/grill are aligned, cap4 must be stable on repeated calls and must not generate new questions.

The final IntentMill artifact remains `im-grill.md`, not a generic grill artifact.
