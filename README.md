# IntentMill

IntentMill is the Codex-operated development workflow for turning a Linear tech issue into code-grounded IntentMill artifacts, implementation, and unit tests.

The primary interaction model is **Codex internal interaction**: a coding agent is invoked from this repository, loads the repo-local `imops` skill, creates or reuses an issue worktree under `.workspace/`, writes IntentMill artifacts into that worktree's `.t2p` ticket directory, then develops and tests in that same issue worktree.

The web UI is a secondary interaction surface. It may exist for visibility or another workflow, but it is not the main control surface described here.

## Most Important Rule

When working from this repository, do not implement target project code in the IntentMill repository root.

Target project code lives in an issue worktree under `.workspace/`.

For a project and issue, the canonical worktree and ticket paths are:

```text
.workspace/{project_key}--{issue_id}/
.workspace/{project_key}--{issue_id}/.t2p/tickets/{issue_id}/
.workspace/{project_key}--{issue_id}/.t2p/tickets/{issue_id}/refs/
.workspace/{project_key}--{issue_id}/.t2p/tickets/{issue_id}/tests/
```

Example for `project=nsdk`, `issue-id=ENG-557`:

```text
.workspace/nsdk--ENG-557/
.workspace/nsdk--ENG-557/.t2p/tickets/ENG-557/
.workspace/nsdk--ENG-557/.t2p/tickets/ENG-557/refs/
.workspace/nsdk--ENG-557/.t2p/tickets/ENG-557/tests/
```

The coding agent should treat `.workspace/nsdk--ENG-557/` as the target repo root for code inspection, edits, tests, and commits. It should treat `.workspace/nsdk--ENG-557/.t2p/tickets/ENG-557/` as the ticket-local IntentMill and test artifact root.

## Current Skill

Use `.agents/skills/imops`.

`imops` is the current IntentMill operations skill. It owns the flow from req-only tech issue to draft, grill, final spec/plan, development, and unit tests. It stops after code and unit tests are complete.

The old `.agents/skills/intentmill-ops` skill is deprecated and should not be used for new work. It is kept only for historical compatibility and will be deleted.

## Required Inputs

Every `imops` capability requires:

- `project`: project key or alias from `ssot-config.json`, for example `nsdk` or `narrative-sdk`
- `issue-id`: Linear issue identifier, for example `ENG-557`

If either value is missing, stop and ask for it. Do not guess the issue id.

## Path Source Of Truth

Concrete path templates live in `ssot-config.json` under `imops.paths`.

Current required path names:

```json
{
  "workspace-root": ".workspace",
  "base-worktree": ".workspace/{project_key}",
  "issue-worktree": ".workspace/{project_key}--{issue_id}",
  "ticket-worktree-t2p": ".workspace/{project_key}--{issue_id}/.t2p/tickets/{issue_id}",
  "ticket-worktree-t2p-refs": ".workspace/{project_key}--{issue_id}/.t2p/tickets/{issue_id}/refs",
  "ticket-worktree-t2p-tests": ".workspace/{project_key}--{issue_id}/.t2p/tickets/{issue_id}/tests"
}
```

Agents must resolve these paths from the IntentMill repository root and must not invent parallel artifact directories such as `.intentmill/`.

## Artifact Layout

IntentMill artifacts for one ticket live under:

```text
ticket-worktree-t2p path/
├── req.md
├── refs/
│   ├── im-draft.md
│   ├── im-grill.md
│   ├── im-spec.md
│   └── im-plan.md
└── tests/
```

Important meanings:

- `req.md`: req-only tech issue input captured by the target repo's `t2p` flow.
- `refs/im-draft.md`: rough code-grounded draft, created before grill.
- `refs/im-grill.md`: human decision loop artifact.
- `refs/im-spec.md`: final declarative spec after grill.
- `refs/im-plan.md`: final executable plan after grill.
- `tests/`: ticket-scoped unit tests required by the development flow.

## imops Flow

Run capabilities through Codex internal interaction:

```text
Use imops cap1 with project nsdk and issue-id ENG-557.
Use imops cap2 with project nsdk and issue-id ENG-557.
Use imops cap3 with project nsdk and issue-id ENG-557.
Use imops cap4 with project nsdk and issue-id ENG-557.
Use imops cap5 with project nsdk and issue-id ENG-557.
Use imops cap6 with project nsdk and issue-id ENG-557.
```

Capability summary:

- `cap1`: create or reuse the issue worktree at `.workspace/{project_key}--{issue_id}`.
- `cap2`: initialise or refresh `.t2p/tickets/{issue_id}` in that issue worktree.
- `cap3`: create `refs/im-draft.md` from `req.md`, `.evodocs`, docs, and code.
- `cap4`: run the draft grill loop and maintain `refs/im-grill.md` plus the updated draft.
- `cap5`: finalise `refs/im-spec.md` and `refs/im-plan.md`.
- `cap6`: implement from the final spec/plan and create/run ticket-scoped unit tests under `tests/`.
- `cap7`: orchestrate cap1 through cap6.

The full flow stops after code complete and unit tests complete. AutoQA, t2p-review, PR creation, human review, and RG case promotion are intentionally outside `imops`.

## How A Coding Agent Should Work Here

1. Start in the IntentMill repository root.
2. Load `imops`.
3. Read `ssot-config.json`.
4. Resolve `project` and `issue-id`.
5. Work in the resolved issue worktree under `.workspace/`.
6. Read target repo instructions from that worktree, especially `AGENTS.md` and `.evodocs/constitution.md`.
7. Read and write IntentMill artifacts only under the resolved `.t2p/tickets/{issue_id}` path.
8. Make code changes only in the issue worktree.
9. Put ticket-scoped unit tests under `.t2p/tickets/{issue_id}/tests`.
10. Commit and push the target repo branch from the issue worktree when explicitly requested.

For example, for `ENG-557`, code work happens in:

```text
.workspace/nsdk--ENG-557/
```

Ticket artifacts happen in:

```text
.workspace/nsdk--ENG-557/.t2p/tickets/ENG-557/
```

## UI

The UI is not the source of truth for the development workflow.

If running the UI is needed:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000/
```

Treat the UI as an alternate interaction layer. The primary workflow remains Codex plus `imops` operating on `.workspace/` worktrees and `.t2p/tickets/<ISSUE-ID>/` artifacts.

## Config

`ssot-config.json` is the local source of truth for project aliases, repositories, cycles, Linear access, database access, and `imops.paths`.

It is ignored by Git because it can contain secrets. Do not paste secrets from it into docs, tickets, commits, or final responses.

Minimal project shape:

```json
{
  "projects": {
    "nsdk": {
      "aliases": ["narrative-sdk"],
      "repo": "https://github.com/finoge-app/nsdk.git",
      "default_branch": "staging"
    }
  },
  "imops": {
    "paths": {
      "workspace-root": ".workspace",
      "base-worktree": ".workspace/{project_key}",
      "issue-worktree": ".workspace/{project_key}--{issue_id}",
      "ticket-worktree-t2p": ".workspace/{project_key}--{issue_id}/.t2p/tickets/{issue_id}",
      "ticket-worktree-t2p-refs": ".workspace/{project_key}--{issue_id}/.t2p/tickets/{issue_id}/refs",
      "ticket-worktree-t2p-tests": ".workspace/{project_key}--{issue_id}/.t2p/tickets/{issue_id}/tests"
    }
  }
}
```

## Deprecated

`intentmill-ops` is deprecated.

Do not start new work with:

```text
.agents/skills/intentmill-ops
```

Use:

```text
.agents/skills/imops
```

The deprecated skill will be removed after old references are cleaned up.

## Verify This Repository

For IntentMill app/tooling changes:

```bash
npm test
npm run build
```

For target project work, run tests from the resolved issue worktree, not from the IntentMill repository root.
