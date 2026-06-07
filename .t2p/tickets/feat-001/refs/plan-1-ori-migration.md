# DevManager to IntentMill Migration Investigation

## Scope

本调查基于 `/Users/yong/work/devmanager` 当前工作树，目标是为后续把 DevManager 完整移植到当前 `intentmill` 项目做准备。目标形态是前后端一体的 TanStack Start/TypeScript 应用，不再使用 Python，同时迁移原有 PostgreSQL 数据库连接配置、Linear 凭据使用方式、数据模型、同步逻辑、planning workflows 和一个能体现项目定位的前端。

本文件不包含任何数据库密码或 Linear token 明文。后续迁移密钥时应只迁移到本地未提交配置或部署环境变量中。

## Source Project Summary

DevManager 是一个面向 Linear sprint planning 的本地 Scrum Master 工作台。它不替代 Linear；Linear 仍是协作、状态、评论、标签、关系和正式交付跟踪的事实来源。DevManager 保存一份本地 planning working copy，用于减少重复 Linear MCP/GraphQL 读取，并承载本地摘要、方案、验收标准和估时。

当前实现是 Python 后端：

- Package: `backend/src/devmanager_core`
- CLI: Typer，入口 `devmanager_core.cli:app`
- HTTP API: FastAPI，入口 `devmanager_core.api:app`
- DB: Azure PostgreSQL，schema 名来自根目录 `ssot-config.json`
- External API: Linear GraphQL API
- Runtime data exports: `data/*.json`
- Agent workflows: `.agents/skills/dm-*`

`devmanager` 当前 Git 工作树本身有未提交改动，调查以工作树内容为准：`.agents/skills/dm-ops/SKILL.md`、`.agents/skills/dm-summary/scripts/dm_summary.py`、`backend/src/devmanager_core/cli.py`。

## Current IntentMill Baseline

当前 `intentmill` 已是 TanStack Start React 项目：

- `package.json` scripts: `dev`, `generate-routes`, `build`, `preview`, `test`
- Framework/runtime: `@tanstack/react-start`, `@tanstack/react-router`, Vite, Nitro, React 19, Tailwind CSS v4
- Main files: `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/router.tsx`, `src/styles.css`
- Existing demo UI is a light-mode IntentMill landing/demo page

This makes IntentMill a reasonable target for a full-stack TypeScript migration. Backend behavior should move into server-only TypeScript modules and TanStack Start route/server handlers rather than into a separate Python service.

## Source Architecture

Key modules:

- `config.py`: reads root `ssot-config.json`; builds PostgreSQL URL; reads Linear API key.
- `models.py`: Pydantic issue DTOs: `IssueBase`, `IssueCreate`, `IssueUpdate`, `Issue`, `IssueList`.
- `db.py`: canonical database access layer. It initializes schema, opens PostgreSQL connections, and implements CRUD, list filters, bulk upsert, and sync-run recording.
- `cli.py`: Typer CLI wrapping DB operations and sprint sync.
- `api.py`: FastAPI CRUD endpoints sharing `db.py`.
- `linear_sprint_sync.py`: Linear GraphQL pagination, child issue expansion, JSON export, current issue upsert, and historical snapshot recording.
- `backend/ssot-db/*.sql`: one canonical SQL file per table.

Important architecture constraints from `evodocs/abstract.md`:

- `issues` is current state only.
- `sync_runs` and `issue_snapshots` are historical sync state.
- `issue_snapshots` stores observed Linear facts, not local planning fields.
- Linear sync must not overwrite local planning fields by default.
- `parent_issue_id` is the only stored parent/child relationship fact. Parent status should be derived by querying children.
- Schema files are the data-model source of truth.
- JSON export and DB writes are both part of one sprint sync; JSON is audit evidence, DB is queryable state.

## Database Model

Current PostgreSQL tables:

### `issues`

Current local planning state, keyed by Linear identifier.

Fields:

- `issue_id`
- `parent_issue_id`
- `title`
- `assignee`
- `sprint`
- `status`
- `version`
- `description`
- `comments` JSONB
- `dm_summary`
- `dm_solution`
- `dm_criteria`
- `dm_estimation`
- `extra` JSONB
- `created_at`
- `updated_at`

Indexes cover issue id, parent id, assignee, sprint, status, version, and sprint+assignee.

### `sync_runs`

One row per Linear sprint sync.

Fields:

- `run_id`
- `project`
- `team`
- `sprint`
- `json_path`
- `started_at`
- `finished_at`
- `stats` JSONB

### `issue_snapshots`

Immutable issue facts observed during one sync run. Primary key is `(run_id, issue_id)`.

Fields:

- `run_id`
- `issue_id`
- `parent_issue_id`
- `title`
- `assignee`
- `sprint`
- `status`
- `version`
- `description`
- `comments` JSONB
- `extra` JSONB
- `created_at`
- `updated_at`

The table has a foreign key to `sync_runs(run_id)` with cascade delete.

## Configuration and Secrets

Root `ssot-config.json` is the runtime configuration source in DevManager and is ignored by Git. It contains:

- Azure metadata: subscription id, resource group, location.
- PostgreSQL metadata: server name, host, port, database, admin user, admin password, sslmode, schema, SKU/tier/version/storage/backup/public access settings.
- Linear metadata: `api_key`.

Observed non-secret operational values:

- Azure resource group: `aiteam`
- Azure location: `swedencentral`
- PostgreSQL server: `dm-db`
- PostgreSQL host: `dm-db.postgres.database.azure.com`
- PostgreSQL database: `dm-db`
- PostgreSQL admin user: `pgadmin`
- PostgreSQL SSL mode: `require`
- PostgreSQL schema: `dm-schema`
- PostgreSQL version: `16`

Do not commit `ssot-config.json` or generated `.env` files. Before migrating credentials into IntentMill, add equivalent ignores if missing, for example `ssot-config.json`, `.env`, `.env.*`, and local export/tmp paths. Prefer `process.env` for deployment and allow a local `ssot-config.json` compatibility loader only if explicitly needed for a smooth transition.

## Linear Sync Behavior

Default sync scope:

- project: `narrative-sdk`
- team: `Engineering`
- cycle: `18`
- display sprint: `Cycle-18`
- include sub-issues: `true`

Linear sync uses GraphQL endpoint `https://api.linear.app/graphql`.

Base query filters:

- project name equals configured project
- team name equals configured team
- cycle number equals normalized cycle number
- archivedAt is null

Child expansion:

- Fetches children of root issues by parent id when `include_sub_issues` is true.
- Final issue set is `base_project_cycle_ids ∪ children_of_base_root_issues`.

Output JSON:

- Written under `data/<slug(project)>-cycle-<cycle-number>-YYYYMMDDTHHMMSSmmmZ.json`
- Timestamp is UTC, millisecond precision.
- Contains `generated_at_utc`, project/team/cycle metadata, stats, and full Linear issue objects.

Database sync policy:

- New issues are inserted into `issues`.
- Existing issues are patched with observed Linear fields only.
- Local planning fields are preserved: `dm_summary`, `dm_solution`, `dm_criteria`, `dm_estimation`, local `version`, and `extra`.
- Each sync writes a `sync_runs` row and one `issue_snapshots` row per observed issue.

Observed data snapshots:

- `20260521T184802803Z`: 69 final issues, no sync run id in stats.
- `20260522T131514974Z`: 71 final issues, `sync_run_id=1`.
- `20260522T134719202Z`: 72 final issues, `sync_run_id=2`.
- `20260523T165443442Z`: 72 final issues, `sync_run_id=3`.

## Existing CLI and API Surface

CLI commands:

- `init-db`: create schema and tables from SQL files.
- `schema`: print canonical schema SQL.
- `db-url`: print redacted-ish DB target label.
- `create`: create one issue planning record.
- `list`: list issues with filters for assignee, sprint, status, version.
- `show`: show one issue as JSON.
- `update`: patch fields; current working tree adds `--clear` for nullable fields.
- `delete`: delete one issue.
- `sprint-sync`: fetch Linear sprint data, write JSON, update DB.
- `api`: run FastAPI server.

FastAPI endpoints:

- `GET /health`
- `POST /issues`
- `GET /issues`
- `GET /issues/{issue_id}`
- `PATCH /issues/{issue_id}`
- `DELETE /issues/{issue_id}`

In IntentMill, these should map to TypeScript service functions first, then be exposed through TanStack Start server functions or API routes. Avoid creating separate implementations for UI and API.

## Agent Skills and Planning Workflows

Existing local skills:

- `dm-list`: read-only sprint ticket listing grouped by assignee.
- `dm-summary`: compares latest two sync runs plus empty summaries, then asks the host LLM to write `dm_summary`.
- `dm-solution`: collects one issue plus project code/docs addresses, asks the host LLM to produce `dm_solution`, then writes it locally.
- `dm-ops`: DevManager operations and schema/backend guidance.

Migration note: several skill descriptions still say SQLite even though the current backend uses PostgreSQL. `dm-ops` has already been partially updated to PostgreSQL in the working tree. The migrated IntentMill project should update or replace these skills so they reference the new TypeScript implementation and PostgreSQL consistently.

## TypeScript Migration Shape

Recommended module mapping:

| DevManager Python | IntentMill TypeScript target |
| --- | --- |
| `config.py` | `src/server/config.ts` |
| `models.py` | `src/server/issues/types.ts` or Zod schemas |
| `db.py` | `src/server/db/index.ts` plus query modules |
| `linear_sprint_sync.py` | `src/server/linear/sprintSync.ts` |
| `cli.py` | optional `scripts/intentmill.ts` or npm scripts |
| `api.py` | TanStack Start server functions/API routes |
| `backend/ssot-db/*.sql` | `src/server/db/schema/*.sql` or root `db/schema/*.sql` |
| `.agents/skills/dm-*` | updated project skills for IntentMill |
| `data/*.json` | `data/` or `storage/linear-sync/` depending on deployment needs |

Use one canonical service layer:

- DB connection and query helpers should be server-only.
- UI loaders/actions/API routes should call the same service functions.
- Schema SQL should remain the source of truth unless the project deliberately adopts a migration tool later.
- Avoid duplicating query logic across React components, route handlers, and scripts.

Potential Node libraries to evaluate during implementation:

- PostgreSQL driver: `pg` or `postgres`.
- Runtime validation: `zod`.
- CLI support if needed: `tsx` plus a small command parser, or keep core operations UI/API-only if the user agrees.

Use current docs before implementation because this project already requires current documentation lookup for libraries and framework APIs.

## Frontend Product Direction

The new UI should communicate that IntentMill is a planning workspace for turning Linear sprint intent into a local, reviewable execution plan.

Suggested first frontend areas:

- Dashboard: sprint selector, sync status, latest run stats, issue count, changed issue count, missing summary count.
- Sprint board/list: grouped by assignee; columns for issue id, status, estimate, title, summary, parent/child signal.
- Issue detail: Linear description, comments snapshot, local `dm_summary`, `dm_solution`, `dm_criteria`, `dm_estimation`.
- Sync runs: history of JSON exports and per-run stats.
- Planning readiness: missing summary, missing estimate, missing solution, missing criteria.
- Safe actions: sync from Linear, refresh summaries, update local planning fields. Do not write back to Linear without a separate explicit workflow.

Keep the product wording clear: "local planning cache", "Linear remains source of truth", "review before write-back".

## Migration Risks and Open Questions

Risks:

- Secret migration: `ssot-config.json` has real credentials; never commit it.
- Current DevManager worktree has uncommitted changes that should be resolved or consciously included before treating it as the final source.
- Skills and docs are slightly inconsistent about SQLite vs PostgreSQL.
- `dm-ops` says token can come from `LINEAR_API_KEY` or Codex config, but current `config.py` reads only `ssot-config.json`.
- API and CLI currently share `db.py`; migration must preserve one canonical service layer.
- JSON exports are local files; deployment needs a storage decision if IntentMill is hosted remotely.
- `issue_snapshots` are immutable by convention, but the schema still has an update trigger. That is acceptable but worth revisiting if strict immutability matters.
- The first historical JSON snapshot has no `sync_run_id`; migration should tolerate old export files.

Open questions:

- Should IntentMill keep CLI parity, or is the web UI plus server actions enough?
- Should local JSON exports stay on disk, move to object/blob storage, or be represented fully in PostgreSQL?
- Should `ssot-config.json` remain as local compatibility config, or should everything move to environment variables?
- Should schema SQL remain hand-written, or should a TypeScript migration tool be introduced?
- Should existing `.agents/skills/dm-*` be ported as project skills under IntentMill or replaced by in-app actions?

## Suggested Migration Phases

1. Prepare IntentMill config and safety rails.
   Add ignores for local secrets and exports, define server-only config loading, and decide whether `ssot-config.json` compatibility remains.

2. Port database schema and DB service.
   Move SQL schema into IntentMill, add PostgreSQL driver, implement init/schema helpers and issue CRUD queries in TypeScript.

3. Port Linear sprint sync.
   Reimplement cycle normalization, GraphQL pagination, child expansion, timestamped JSON naming, current issue upsert, and sync-run/snapshot recording.

4. Expose server API.
   Add TanStack Start server functions or API routes for health, issue CRUD/list filters, sync runs, and sprint sync trigger.

5. Build the frontend planning workspace.
   Replace the current demo with a real dashboard, sprint issue list, issue detail, and sync-run views.

6. Port planning workflows.
   Recreate `dm-list`, `dm-summary`, and `dm-solution` as either project skills using TypeScript helpers or in-app operations that write only local planning fields.

7. Validate with existing data.
   Use the existing Cycle-18 JSON exports and PostgreSQL schema expectations to verify counts, fields, parent/child relations, local planning preservation, and summary/solution update boundaries.

## Minimal Acceptance Criteria for First Migration Slice

- IntentMill can connect to the existing PostgreSQL database without committing secrets.
- IntentMill can initialize or verify the `dm-schema` tables.
- IntentMill can list issues with filters equivalent to DevManager.
- IntentMill can show one issue and update local planning fields.
- IntentMill can display a sprint dashboard with issue counts and missing planning fields.
- Existing local planning fields are not overwritten by Linear sync.
- `npm run build` and the relevant tests pass.
