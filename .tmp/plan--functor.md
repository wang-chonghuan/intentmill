# Plan: copy `imops` to `n-im` without t2p or Linear dependency

## Purpose

Define the implementation plan for copying `imops` into Narrative Skills as ticket-based `n-im`, removing t2p and Linear dependencies while preserving the existing cap/gate workflow and semantic quality bar.

## Target

Create the new Narrative skill at:

```text
/Users/yong/.skillhost/user_repos/narrative-skills/n-im/
```

Use the current repo-local skill as the structural source:

```text
/Users/yong/work/intentmill/.agents/skills/imops/
```

The new skill must not depend on:

- project lookup from `ssot-config.json`
- IntentMill repo-root `.workspace/` worktrees
- Linear issue IDs or Linear reads/writes
- target repo `.agents/skills/t2p`
- `.t2p/tickets/<ISSUE-ID>` artifact layout
- any fixed ticket store outside the future Codex working directory's `.intentmill/`

It should preserve as much of the rest as possible: capability numbers, cap/gate loop, artifact names, draft/grill/spec/plan/handoff semantics, evidence-first planning, evodocs/code grounding, Context7/find-docs behavior, and cap6 development/test discipline.

## Core Design

Treat `n-im` as a local ticket implementation-planning workflow for whatever directory Codex is running in. `n-im` is not an IntentMill-managed Linear issue workflow.

Hard cwd rule: the future agent must resolve `.intentmill/` from the Codex current working directory for that run. It may inspect the Git root for repository context, instructions, tests, or code ownership, but it must not use the Git root as the `.intentmill` base unless the Codex cwd is already the Git root.

The source-of-truth unit remains a **ticket**, identified by a user-provided `ticket-id`. The `ticket-id` may look like `ENG-557`, but it is just a local ticket identifier and does not imply Linear.

Recommended required inputs:

- `ticket-id`: stable local ticket identifier, for example `auth-timeout-repair`, `ENG-557`, or `checkout-state-machine`.
- `requirement source`: inline user request, repo-relative file path, or `refs/im-predraft.md`.
- `codex cwd`: the current working directory where the future agent runs `n-im`; this is always the base for `.intentmill/`.

Do not require `project`.
Do not require a Linear-bound ticket id or any Linear lookup.

Recommended `ticket-id` rule:

```text
^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$
```

Normalize only by trimming whitespace. Do not uppercase, because the identifier is no longer necessarily a Linear issue key.

## Path Functor

Use this mapping everywhere in the copied skill. This is the main transformation that lets us preserve most of the existing workflow while removing the old dependencies.

| `imops` source role | `n-im` target role |
| --- | --- |
| IntentMill repo root | Codex cwd for the `n-im` run |
| `project` | removed |
| `issue-id` | `ticket-id` |
| `issue worktree` | Codex cwd for artifact paths; repo/worktree only for code inspection and edits |
| `ticket-worktree-t2p path` | `im ticket path` |
| `ticket-worktree-t2p refs path` | `im refs path` |
| `ticket-worktree-t2p tests path` | `im tests path` |
| `.workspace/{project_key}--{issue_id}` | removed |
| `.t2p/tickets/{issue_id}` | `.intentmill/tickets/{ticket_id}` |
| `.t2p/tickets/{issue_id}/refs` | `.intentmill/tickets/{ticket_id}/refs` |
| `.t2p/tickets/{issue_id}/tests` | `.intentmill/tickets/{ticket_id}/tests` |
| `req-only Linear tech issue` | local ticket requirement source |
| project `t2p` skill | cap2 local ticket context capture |

Recommended artifact layout:

```text
.intentmill/tickets/{ticket_id}/
├── req.md
├── refs/
│   ├── im-predraft.md
│   ├── im-draft.md
│   ├── im-grill.md
│   ├── im-spec.md
│   ├── im-plan.md
│   └── im-handoff.md
└── tests/
    └── test-results.md
```

Use the `.intentmill/` directory in the Codex cwd for the run. This is intentional: `n-im` should not depend on the IntentMill repository root, `.workspace`, Git root, or `.t2p`. Any copied rule that says "Do not create or use `.intentmill/`" must be removed or replaced with "write only under the resolved `.intentmill/tickets/{ticket_id}` ticket directory."

## Shared Path Definitions

Every capability must resolve these path roles once after validating `ticket-id`:

```text
codex cwd = the process/current working directory for the n-im run
im root path = <codex cwd>/.intentmill
im tickets path = <codex cwd>/.intentmill/tickets
im ticket path = <codex cwd>/.intentmill/tickets/{ticket_id}
im refs path = <codex cwd>/.intentmill/tickets/{ticket_id}/refs
im tests path = <codex cwd>/.intentmill/tickets/{ticket_id}/tests
```

These roles are the only valid bases for `n-im` artifacts. Do not recompute them from Git root, `ssot-config.json`, `.workspace`, or a target project path.

## Capability Mapping

Preserve capability numbers as the user-facing API.

### Cap1: prepare ticket context

Replace `capability-1-issue-worktree` with `capability-1-ticket-context`.

Purpose:

- Resolve the Codex cwd as the artifact base for this `n-im` run.
- Resolve and validate `ticket-id`.
- Create `im root path`, `im tickets path`, `im ticket path`, `im refs path`, and `im tests path` if missing.
- If the user already created the ticket directory, reuse it and report the resolved paths.
- Inspect repo dirty state when the Codex cwd is inside a Git worktree and report it, but do not create branches or worktrees.
- Read repo-local instructions enough to know whether `AGENTS.md` exists.

Explicitly out of scope:

- no `npm run init-workspace`
- no `ssot-config.json`
- no `.workspace`
- no git branch/worktree creation
- no Linear
- no t2p

If the user needs a separate worktree, they should run `n-git` before `n-im`, then invoke `n-im` from the desired worktree directory. `n-im` should still place artifacts under that invocation cwd's `.intentmill/`.

### Cap2: capture ticket requirement context

Replace `capability-2-t2p-context` with `capability-2-requirement-context`.

Purpose:

- Populate or refresh `im ticket path/req.md` from one of:
  - inline user requirement text
  - a repo-relative requirement file
  - a file already placed by the user inside `.intentmill/tickets/{ticket_id}/`
  - an existing `im ticket path/req.md`
  - an existing `refs/im-predraft.md` when the user is entering through cap3p
- Record provenance inside `req.md`.
- Refuse to invent requirements when no source exists.

No project t2p skill is required or called.
No Linear issue is read.
Cap2 remains important because it turns a user-created local ticket directory into a consistent `n-im` ticket context.

Cap2 source priority:

1. Explicit requirement source supplied in the current user request.
2. Explicit repo-relative or cwd-relative requirement file supplied by the user.
3. Existing `im ticket path/req.md`.
4. Other user-created requirement-like files directly under `im ticket path`, such as `requirement.md`, `requirements.md`, `brief.md`, or `ticket.md`.
5. `im refs path/im-predraft.md`, only when the user invokes cap3p or explicitly says the predraft is the requirement source.

Cap2 requirement path resolution:

- Resolve explicit requirement file paths relative to the Codex cwd first.
- If the file is not found and the Codex cwd is inside a Git worktree whose root differs from the cwd, try the same path relative to the Git root.
- When Git-root fallback is used, record both the user-provided path and the resolved path in provenance.
- Do not search arbitrary parent directories or the user's home directory.

Cap2 conflict rules:

- If multiple explicit sources are supplied and they disagree materially, stop and ask which source is authoritative.
- If an explicit source conflicts with existing `req.md`, preserve the old `req.md` under `im refs path/req-history/{timestamp}.md` or record that the overwrite was user-authorized, then write the new `req.md`.
- If only existing local files are available and more than one plausible requirement file exists, stop and ask the user to choose unless one is already named `req.md`.
- Do not merge conflicting requirements into one synthesized request.

Cap2 idempotency rules:

- If `req.md` already exists and no newer or explicit source is provided, leave it unchanged and report that it was reused.
- If the source content is unchanged, leave `req.md` unchanged except for harmless provenance clarification.
- Never delete user-created files in the ticket directory.

Cap2 `req.md` shape:

```markdown
# Ticket Requirement

## Provenance

- ticket_id:
- source_type:
- source_path_or_inline:
- captured_at: ISO-8601 UTC timestamp, for example `2026-06-20T08:30:00Z`
- captured_by: n-im cap2

## Requirement
```

The `## Requirement` section must contain the user-provided or file-provided requirement text with only minimal cleanup for Markdown readability. Analysis, solution design, assumptions, and implementation planning belong to cap3 or later, not cap2.

### Cap3: create draft

Keep the current cap3 almost intact, with these edits:

- Replace "tech issue" with "ticket requirement".
- Replace all path roles with `im ticket path` and `im refs path`.
- Read `.intentmill/tickets/{ticket_id}/req.md` instead of t2p-derived requirement files.
- Keep the required shape of `im-draft.md`.
- Keep the rule that cap3 does not create `im-grill.md`, `im-spec.md`, or `im-plan.md`.
- Keep evidence requirements: `AGENTS.md`, `.evodocs/constitution.md`, `.evodocs/index.json`, relevant evodocs, targeted code, repo docs, Context7/find-docs, DB/design-system checks when relevant.

Recommended strictness:

- Keep evodocs as required for high-quality cap3 by default.
- If a repo has no `.evodocs/`, stop and tell the user to run `n-evodocs` or explicitly authorize a lower-confidence non-evodocs run. Do not silently downgrade evidence quality.

### Cap3p: create draft from predraft

Keep cap3p because it already moves the workflow away from vague external ticket text.

Edits:

- Primary source becomes `.intentmill/tickets/{ticket_id}/refs/im-predraft.md`.
- `req.md` is optional background only.
- Remove references to stale external ticket requirements.
- Preserve conflict handling: predraft can express intent, but code, project rules, SSOT schemas, and evodocs remain authoritative for feasibility and constraints.

### Cap4: create grill document

Keep almost unchanged.

Edits:

- Replace path roles.
- Replace "issue worktree" with "Codex cwd for artifact paths; Git repo/worktree only for code inspection and edits".
- Keep the rule that cap4 does not directly interview the user.
- Keep `im-grill.md` as the canonical decision artifact.
- Keep `final_decision: TBD` semantics and the idempotent update loop.

### Cap5: finalize spec and plan

Keep almost unchanged.

Edits:

- Replace path roles.
- Replace "ticket requirement context" with "local ticket requirement context".
- Remove t2p/Linear mentions.
- Keep first-cause adversarial review.
- Keep gate5 and the spec/plan separation rules.

### Cap6: develop and unit test

Keep the cap6 development discipline, but make it repo/local-ticket scoped rather than issue/t2p scoped.

Edits:

- Required inputs become:
  - Codex cwd for artifact paths
  - `im refs path`
  - `im tests path`
  - `im refs path/im-spec.md`
  - `im refs path/im-plan.md`
  - repo `AGENTS.md`
- `Goal mode` bootstrap resolves `ticket-id`, not `issue-id` and `project`.
- Ticket-scoped tests remain ticket-scoped tests under `.intentmill/tickets/{ticket_id}/tests`.
- Keep `test-results.md`.
- Keep `im-handoff.md`.
- Keep the constraints:
  - no AutoQA acceptance cases
  - no PR creation
  - no human review workflow
  - no updating `im-draft.md` or `im-grill.md` during cap6

Replace "Do not update Linear" with:

```text
n-im never reads or writes Linear. If the user wants Linear ticket work, pause n-im and use n-linear or n-ticketer explicitly.
```

### Cap7: full flow

Keep full-flow orchestration:

1. cap1 prepare ticket context
2. cap2 capture ticket requirement context
3. cap3 or cap3p create draft
4. gate3 or gate3p
5. cap4 create grill document
6. cap5 finalize spec/plan
7. gate5
8. cap6 dev/unit-test
9. gate6

Cap7 should stop after code complete plus focused unit tests complete.

No AutoQA, PR, Linear, t2p-review, or review promotion.

## Files To Copy

Copy the whole current skill directory as the starting point:

```text
.agents/skills/imops/
```

to:

```text
/Users/yong/.skillhost/user_repos/narrative-skills/n-im/
```

Keep these files initially:

```text
SKILL.md
references/capability-1-issue-worktree/issue-worktree.md
references/capability-2-t2p-context/t2p-context.md
references/capability-3-create-draft/create-draft.md
references/capability-3p-predraft-to-draft/predraft-to-draft.md
references/capability-4-draft-grill-loop/draft-grill-loop.md
references/capability-5-finalize-spec-plan/finalize-spec-plan.md
references/capability-6-dev-unit-test/dev-unit-test.md
references/capability-7-full-flow/full-flow.md
references/common/spec-plan-artifact-rules.md
references/common/spec-plan-dev-review-common-rules.md
references/gate-3-create-draft/gate.md
references/gate-3p-create-draft-from-predraft/gate.md
references/gate-5-finalize-spec-plan/gate.md
references/gate-6-dev-unit-test/gate.md
```

Then rename only the two references whose names encode removed dependencies:

```text
references/capability-1-issue-worktree/
  -> references/capability-1-ticket-context/

references/capability-2-t2p-context/
  -> references/capability-2-requirement-context/
```

The other filenames can stay the same.

## `SKILL.md` Rewrite Checklist

Frontmatter:

- `name: n-im`
- Description should trigger on:
  - `n-im`
  - local IntentMill-style planning
  - create `im-draft.md`
  - create `im-grill.md`
  - finalize `im-spec.md` and `im-plan.md`
  - implement from `im-plan.md`
  - cap1/cap2/cap3/cap3p/cap4/cap5/cap6/cap7
- Description should explicitly say:
  - does not require Linear
  - does not require t2p
  - operates from the Codex cwd's `.intentmill/` directory
  - does not use Git root as the `.intentmill/` base unless Codex cwd is the Git root

Body:

- Replace "new IntentMill operations flow" with "local n-im workflow".
- Replace required inputs with `ticket-id` and requirement source rules.
- Replace shared path definitions with `.intentmill/tickets/{ticket_id}` rooted at the Codex cwd.
- Add the hard cwd rule and the shared path definitions from this plan.
- Remove `ssot-config.json` lookup.
- Remove project alias resolution.
- Remove Linear issue key normalization.
- Keep reference file resolution relative to the n-im skill directory.
- Keep artifact filenames.
- Keep cap/gate loop.
- Update cap1 and cap2 names and reference paths.
- Keep cap3p.
- Keep cap6 Goal mode note, but update its bootstrap rules.

## Reference Rewrite Checklist

Apply these substitutions manually and review every hit:

| Old phrase | New phrase |
| --- | --- |
| `imops` | `n-im` when referring to the skill |
| `issue-id` / `issue id` | `ticket-id` / `ticket id` |
| `issue worktree` | `Codex cwd for artifacts; Git repo/worktree for code only` |
| `ticket-worktree-t2p path` | `im ticket path` |
| `ticket-worktree-t2p refs path` | `im refs path` |
| `ticket-worktree-t2p tests path` | `im tests path` |
| `ticket context` | `local ticket context` |
| `tech issue requirement` | `ticket requirement` |
| `.t2p/tickets/{issue_id}` | `.intentmill/tickets/{ticket_id}` |
| `req-only Linear tech issue` | `local ticket requirement` |

Remove or rewrite these concepts:

- `ssot-config.json`
- `project`
- project aliases
- `base-worktree`
- `.workspace`
- Git root as artifact base
- `npm run init-workspace`
- project t2p skill
- `t2p-new`
- `t2p-req`
- `t2p-review`
- Linear reads/writes as part of this skill

Allowed residual mentions:

- A boundary sentence saying `n-im` does not read/write Linear and users should use `n-linear` or `n-ticketer` for ticket operations.
- A boundary sentence saying `n-im` does not run t2p or t2p-review.
- References to `n-git` only as an optional pre-step when the user wants a separate branch/worktree before starting `n-im`.

## Gate Updates

Keep gates 3, 3p, 5, and 6.

Gate edits:

- Replace path roles.
- Replace requirement source language.
- Remove t2p and Linear dependencies.
- Confirm gate checks use `im ticket path`, `im refs path`, and `im tests path` from shared path definitions.
- Preserve first-cause checks.
- Preserve the rule that a gate must fail if downstream cap6 could follow the artifact and still drift from the intended outcome.

Cap1 and cap2 probably do not need gates:

- cap1 only creates local directories and resolves context.
- cap2 writes `req.md`, but its validation can be direct: source exists, provenance is recorded, and no invented requirement was added.

If cap2 later grows transformations beyond simple capture, add `gate-2-requirement-context`.

## Recommended Implementation Sequence

1. Copy `imops` to `n-im` in the Narrative skills repo.
2. Rename cap1/cap2 reference directories.
3. Rewrite `SKILL.md` first, because it defines the new routing and shared vocabulary.
4. Rewrite cap1 as a local ticket context initializer rooted at the Codex cwd's `.intentmill/`.
5. Rewrite cap2 as a local ticket requirement capture workflow that can reuse a user-created ticket directory.
6. Apply vocabulary/path substitutions to cap3, cap3p, cap4, cap5, cap6, cap7, and gates.
7. Manually inspect every remaining dependency and terminology hit with:

   ```bash
   rg -n "t2p|Linear|linear|ssot-config|workspace|worktree|issue-id|issue id|work-id|work id|work item|project|ticket-worktree-t2p|issue-worktree|\\.im/tasks|git root.*\\.intentmill|repo root.*\\.intentmill" /Users/yong/.skillhost/user_repos/narrative-skills/n-im
   ```

8. Add `agents/openai.yaml` if this repo expects chip/list metadata for new n-skills. Use existing n-skill examples as the pattern. Do not add README/changelog/install docs.
9. Run a routing/quality review using `n-toaskill` checklist.
10. Dry-run with no product edits:
    - cap1 against a disposable repo or current target repo
    - cap2 from inline requirement
    - cap2 from a user-created `.intentmill/tickets/{ticket_id}/requirement.md`
    - cap2 with conflicting `req.md` and explicit inline requirement, expecting a stop or explicit overwrite rule
    - cap3p from `refs/im-predraft.md`
    - negative routing prompt: "create a Linear ticket" should not trigger `n-im`
    - negative dependency prompt: "run t2p for ENG-557" should not trigger `n-im`
    - negative terminology check: generated skill should not use `work-id` or `.im/tasks`

## Validation Criteria

The migration is acceptable when:

- `n-im/SKILL.md` loads independently from IntentMill root assumptions.
- No capability requires `ssot-config.json`.
- No capability requires a Linear issue ID. A `ticket-id` may look like a Linear key, but it is treated as a local identifier.
- No capability invokes t2p.
- No capability assumes `.workspace`.
- No capability uses Git root or repo root as the artifact base unless it is also the Codex cwd.
- Artifact writes are confined to `.intentmill/tickets/{ticket_id}/` under the Codex cwd for the run.
- Cap2 has deterministic source priority, conflict handling, idempotency rules, and `req.md` provenance shape.
- Cap3/cap3p/cap4/cap5/cap6/gates still preserve their original semantic quality bar.
- Cap6 can run from final `im-spec.md` and `im-plan.md` and produce:
  - code changes in the target repo
  - focused tests/checks
  - `.intentmill/tickets/{ticket_id}/tests/test-results.md`
  - `.intentmill/tickets/{ticket_id}/refs/im-handoff.md`
  - a passing gate6 result

## Risks And Decisions

Recommended decisions:

- Use `n-im` as the skill name.
- Use `.intentmill/tickets/{ticket_id}` under the Codex cwd as the artifact root.
- Keep `ticket` language throughout the skill. Do not switch to `work-id`.
- Keep the hard cwd rule throughout the skill. Do not weaken it to "repo root" or "Git root" artifact storage.
- Keep capability numbers stable.
- Keep evodocs as a default hard evidence requirement for cap3/cap5. If this proves too strict for generic repos, loosen later with an explicit "low-confidence no-evodocs mode" rather than silently weakening the workflow now.
- Keep git branch/worktree management outside the skill. Use `n-git` first when needed.

Main risks:

- A mechanical search/replace could weaken cap5/cap6 semantics. Mitigation: rewrite cap1/cap2 manually, then review every substituted reference.
- Removing Linear/t2p may leave cap2 underspecified. Mitigation: make cap2's job ticket directory normalization, requirement capture, and provenance, not analysis.
- Generalizing beyond NSDK may expose repos without `.evodocs`. Mitigation: fail clearly and point to `n-evodocs`, or add an explicit user-approved fallback mode later.
- Existing `imops` has uncommitted cap3p changes. Mitigation: copy from the working tree only if those changes are intentionally part of `n-im`; otherwise copy from committed `HEAD`.

## Non-Goals

- Do not modify the original `.agents/skills/imops` as part of the copy unless separately requested.
- Do not create Linear tickets.
- Do not migrate existing `.t2p` artifacts automatically.
- Do not introduce scripts unless a deterministic helper is actually needed.
- Do not add README, changelog, installation guide, or placeholder references.
