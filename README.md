# IntentMill

IntentMill turns raw issue requirements into local, code-grounded planning artifacts: engineered requirements, summaries, acceptance criteria, solutions, and estimates. It is not a Linear clone. Linear remains the source for issue data; IntentMill is the local AI planning and execution control surface.

## What It Does

- Pulls selected Linear cycle issues into a local PostgreSQL `issues` table.
- Shows one focused issue table, filtered by configured project and cycle.
- Runs Codex in YOLO mode for one issue to generate planning artifacts.
- Writes successful generated artifacts back into `issues.im_*` fields.
- Keeps target-repo work under `.workspace/` and out of this repo's Git history.

## Quick Start

Create a local `ssot-config.json` or set env vars. `ssot-config.json` is ignored by Git because it can contain secrets.

```bash
npm install
npm run intentmill -- health
npm run intentmill -- init-db
npm run init-workspace
npm run dev
```

Open `http://localhost:3000/`.

Useful CLI commands:

```bash
npm run intentmill -- issues list --sprint Cycle-19
npm run intentmill -- sync --sprint Cycle-19
npm run intentmill -- issues show ENG-536
```

## Config

`ssot-config.json` is the local source of truth for database access, Linear access, projects, and visible cycles.

Expected project shape:

```json
{
  "cycles": [
    { "name": "Cycle-18" },
    { "name": "Cycle-19", "default": true },
    { "name": "Cycle-20" }
  ],
  "projects": {
    "nsdk": {
      "aliases": ["narrative-sdk"],
      "repo": "https://github.com/finoge-app/nsdk.git",
      "default_branch": "staging"
    }
  }
}
```

Environment fallback:

```bash
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
POSTGRES_SCHEMA=dm-schema
LINEAR_API_KEY=...
```

## UI Flow

1. Select project and cycle.
2. Click `Pull` to sync local issue rows from Linear.
3. Open a row's actions menu.
4. Click `Plan`.
5. Wait for the row timer to finish.
6. Inspect `IM Summary`, `IM Solution`, `IM Criteria`, and `IM Estimation`.

Generation only writes database fields after the full run succeeds, the final gate is `ready`, and the issue worktree's `.t2p/tickets/<ISSUE-ID>/` artifacts have been committed and pushed. Failed runs write nothing to `im_*` fields and keep stderr logs for debugging.

## Architecture

- `src/routes/index.tsx`: single-page TanStack Start UI.
- `src/server/issues/*`: issue table reads/writes.
- `src/server/linear/*`: Linear cycle sync.
- `src/server/codex-runs/*`: Codex exec runner, status polling, timeout handling, artifact persistence.
- `src/server/db/*`: PostgreSQL schema and connection setup.
- `scripts/init-workspace.ts`: clones or updates configured project repos under `.workspace/`.
- `.agents/skills/intentmill-ops`: repo-local agent workflow for issue planning.

The app deliberately keeps the UI thin. Heavy AI work is delegated to Codex. The server owns deterministic boundaries: config resolution, process spawning, status tracking, file reads, and database writes.

## Tech Stack

- React 19
- TanStack Start / Router / Table
- Tailwind CSS
- React Markdown
- PostgreSQL via `pg`
- Codex CLI
- Vitest
- TypeScript

## intentmill-ops Skill

`intentmill-ops` is the repo-local skill used by Codex to produce planning artifacts for configured project repos.

Every capability requires:

- `project`: key or alias from `ssot-config.json`
- `issue-id`: issue id such as `ENG-536`

Main capabilities:

- `cap1`: create or reuse `.workspace/<project>--<issue-id>` worktree.
- `cap2`: initialize or refresh target project `.t2p` issue context.
- `cap3`: generate `im-req-engineered.md` and `im-req-summarized.md`.
- `cap4`: generate `im-ac.md`.
- `cap5`: generate `im-solution.md`.
- `cap6`: generate `im-estimation.md`.
- `cap7`: run cap1 through cap6 with quality gates.
- `cap11`: semantic gate review for generated artifacts.

Typical direct Codex prompt:

```text
Use .agents/skills/intentmill-ops.
Run intentmill-ops cap7 with project nsdk and issue-id ENG-536.
```

The UI's `Plan` action sends that same workflow through `codex exec --dangerously-bypass-approvals-and-sandbox`.

## Verify

```bash
npm test
npm run build
```
