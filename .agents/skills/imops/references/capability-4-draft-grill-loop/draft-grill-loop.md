# Capability 4: Draft Grill Loop

Use this reference to run the human decision loop from `ticket-worktree-t2p refs path/im-grill.md`, with `im-draft.md` as supporting draft context.

## Purpose

Resolve blocking product and architecture decisions before final spec and plan generation. Cap4 is a loop, not a one-shot Q&A step. It updates `im-grill.md` and `im-draft.md` after each round until no blocking unresolved decisions remain.

## Required Inputs

- An issue worktree prepared by cap1.
- Ticket context prepared by cap2.
- `ticket-worktree-t2p refs path/im-draft.md` produced by cap3 and passed or handed off by gate3.

If `im-draft.md` is missing, run cap3 first. If the environment cannot interact with the user, stop and report that cap4 requires human answers.

## Output Paths

Canonical artifacts:

```text
ticket-worktree-t2p refs path/im-grill.md
ticket-worktree-t2p refs path/im-draft.md
```

`im-grill.md` is the canonical grill artifact. If a host-level `n-grill` run creates a noncanonical grill artifact, treat it as scratch/source material and fold its content into `im-grill.md`; do not leave any generic grill artifact as the downstream artifact.

Do not create or use `.intentmill/` for cap4. `ticket-worktree-t2p refs path` is the only valid IntentMill artifact directory for `im-grill.md` and updated `im-draft.md`.

## Workflow

1. Run the shared input checks from `SKILL.md`.
2. Load and follow the `n-grill` skill. Cap4 must use `n-grill` as its interrogation workflow, including one-question-at-a-time questioning, code inspection before asking discoverable facts, and continuing until material decisions are resolved.
3. Work inside the issue worktree.
4. Read `im-draft.md`.
5. If `im-draft.md` has `## Grill Required` set to `no`, create `im-grill.md` with `## Decisions` set to `None.` and complete cap4.
6. If `im-grill.md` is missing and `## Grill Required` is `yes`, create `im-grill.md` from the draft's assumptions, risks, and code findings.
7. Read `im-grill.md`.
8. Identify the highest-leverage unresolved decision from `im-grill.md`.
9. If the decision can be answered by reading evodocs or code, inspect the repo instead of asking the user.
10. Ask one concise question at a time. Include:
   - recommended answer
   - why it is recommended
   - consequence if accepted
   - consequence if rejected or changed
11. After the user answers, update `im-grill.md`.
12. Update `im-draft.md` to reflect the confirmed decision, rejected option, new risk, or new dependency.
13. Check whether the answer creates new decisions around UI, DB/schema, prompt, state machine, external API, new dependency, new service, config/secrets/deployment, or scope.
14. Continue until no blocking unresolved decisions remain.

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

During cap4, ask about items whose `final_decision` is empty or `TBD`. After each answer, fill or update only that item's `final_decision`. If an answer creates a new decision, append a new item with the next stable id.

Cap4 is complete only when every decision item has a non-empty `final_decision`, or `## Decisions` is exactly `None.`.

## im-draft.md Updates

After each round, update `im-draft.md`:

- preserve the cap3 evidence rules: obey `AGENTS.md` and `.t2p/rules.md`, use evodocs to guide targeted code reading, treat code as authoritative over evodocs when they conflict, use `find-docs` / Context7 for external library/API correctness when relevant, use `nf-db` for any database operation, and read/follow frontend `DESIGN.md` for UI changes when present
- merge confirmed decisions into the relevant draft sections
- mark old assumptions as confirmed or rejected
- add new risks or dependencies discovered by the answer
- add new unresolved decisions to `im-grill.md` when the answer opens a new branch

Do not create `im-spec.md` or `im-plan.md` in cap4.
Do not write any IntentMill artifact outside `ticket-worktree-t2p refs path`.

## Completion Check

Cap4 is complete only when:

- every `im-grill.md` decision item has a non-empty `final_decision`, or `## Decisions` is exactly `None.`
- `im-draft.md` reflects the confirmed decisions

If any blocking decision has an empty or `TBD` final decision, cap4 is not complete.

## Relationship To n-grill

Cap4 must call and follow `n-grill` as the interrogation mode: ask one question at a time, use code inspection before asking facts discoverable from the repository, and keep drilling until decisions are complete.

The final IntentMill artifact remains `im-grill.md`, not a generic grill artifact.
