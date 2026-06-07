# IntentMill

IntentMill is an AI-native sprint planning workspace. The current UI is intentionally minimal: one page that shows the local `issues` table from PostgreSQL. Codex remains the executor for LLM-heavy workflows; TypeScript server code owns deterministic database boundaries.

## Local config

For local development, copy the existing DevManager `ssot-config.json` into this repository root or set environment variables.

Supported environment variables:

```bash
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
POSTGRES_SCHEMA=dm-schema
LINEAR_API_KEY=...
```

`ssot-config.json`, `.env*`, `data/`, and `tmp/` are ignored by Git.

## Commands

```bash
npm install
npm run intentmill -- health
npm run intentmill -- init-db
npm run intentmill -- issues list --sprint Cycle-19
npm run intentmill -- sync --sprint Cycle-19
npm run dev
```

The dev server runs at `http://localhost:3000/`.

## Verify

```bash
npx tsc --noEmit
npm run test
npm run build
```

## Current UI scope

Implemented:

- PostgreSQL config via env or local `ssot-config.json`
- schema init/verify command
- issue list/read/update service and CLI
- one-page `issues` table UI powered by TanStack Table
- cycle selector and Pull action for syncing the selected Linear cycle
- fixed table header with client-side multi-column sorting
- table columns shown: `issue_id`, `parent_issue_id`, `title`, `assignee`, `sprint`, `status`, `version`, `im_summary`, `im_solution`, `im_criteria`, `im_estimation`
- table columns hidden: `description`, `comments`, `extra`, `created_at`, `updated_at`

Not yet implemented:

- AI `collect -> generate -> apply -> verify` workflow bodies
- UI-runner or Codex exec bridge
- Linear write-back
