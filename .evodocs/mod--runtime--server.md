# purpose

The `runtime/server` module is IntentMill's server-side side-effect boundary. It resolves local configuration, exposes safe public project/cycle/config status to the UI, owns shared dashboard and workflow descriptor utilities, and delegates durable or external work to child services for issue persistence, Linear sync, and Codex planning runs. Browser code and local CLI commands enter the server layer when they need database state, credentials, external API access, filesystem/process access, or artifact persistence.

The parent server responsibility is not one specific table or integration. It is the coordination contract that says which server area owns which side effect, which data can be shown to the client, how project and cycle names are normalized, and how generated planning fields move through the application. The planning UI calls route-local server functions that use these services, while the CLI imports the same services directly.

The module's stable surface is the cross-service boundary map. Issue queries and schema are owned by issue persistence. Linear GraphQL reconciliation is owned by linear sync. Process lifecycle, target worktree refs, final gate parsing, Git sync, and generated field persistence are owned by codex-runs. Configuration, public project/cycle selection, dashboard composition, and workflow command descriptors remain parent-level server concerns.

# structure

Configuration is the parent server's largest direct responsibility. Runtime config can come from environment variables or `ssot-config.json`. Environment variables take precedence: `DATABASE_URL` is parsed first, then separate `POSTGRES_*` values are accepted. File config is used when environment database config is absent, and it accepts either normal user/password fields or admin user/password aliases. Missing database config raises a clear setup error.

Linear credentials are resolved separately from database credentials. `getLinearApiKey` prefers `LINEAR_API_KEY` and falls back to `ssot-config.json`. Public config status only reports whether Linear appears configured; it does not expose the key. Public status also reports database name, host, schema, sslmode, and source when runtime config is valid, or a setup error when it is not.

Public project and cycle helpers turn local file config into UI-safe selection data. Projects are built from configured project keys with aliases, optional repo URLs, and optional default branches. The display label is the first alias when present, otherwise the key. Project resolution accepts either key or alias. Cycles are normalized into `Cycle-N`, deduplicated, and assigned at most one default. If none is explicitly default, the first configured cycle becomes the default; if no cycles are configured, the default resolver falls back to `Cycle-18`.

The dashboard utility is a small aggregator over child services. It checks public config status first and returns a structured empty/error payload if config is missing. When config is present, it loads planning metrics, a bounded issue list, and recent sync runs in parallel. This gives a reusable server-side composition for dashboard-style data even though the current main planning page uses its own route loader.

Workflow command descriptors are another direct parent area. They describe local AI-oriented commands as structured objects with id, title, target, reads, writes, never-writes, command text, and prompt text. Sprint-level descriptors cover sync, summary refresh, and release-plan draft. Issue-level descriptors cover solution and criteria. They are consumed by the CLI and tested for explicit write boundaries. They do not launch Codex themselves.

The child service structure is deliberate. Issue persistence owns PostgreSQL schema, connection pooling, table names, issue types, queries, updates, clears, and metrics. Linear sync owns Linear GraphQL reads, child expansion, upsert and snapshot transactions, stale-row detachment, and JSON exports. Codex runs own detached process execution, active run recovery, timeout handling, target worktree artifact reads, final gate/estimation parsing, Git commit/push, and final issue field updates.

# flows

The configuration flow starts whenever a server function, CLI command, database client, or Linear sync needs runtime settings. Database config is resolved from environment variables before file config. Linear key resolution is on demand. Public UI helpers use only non-secret projections: project/cycle lists and config health. This lets the page render setup guidance and selection controls without sending credentials to the browser.

The project/cycle selection flow is shared by UI and server operations. The UI sends a project key or alias and a cycle string. Server helpers normalize cycles and resolve the project against configured keys and aliases. The selected project key is used for UI selection identity, while the project's label can be used as the issue project filter or Linear project name. This is why project alias semantics are part of the server contract rather than purely UI formatting.

The dashboard flow shows how the server composes child data. After config succeeds, planning metrics come from issue persistence, issue rows come from the issue service, and sync history comes from sync-run reads. Failure in any of those child reads returns a structured error rather than throwing raw database details through to the client. The current route has more specialized loading, but the dashboard utility demonstrates the server pattern: validate config, call child services, return plain serializable data.

The workflow descriptor flow is read-only. CLI commands ask the server module to build descriptors for a sprint or issue. The descriptors state what a workflow should read, write, and never write, and include a prompt string. Tests assert important descriptor boundaries, such as summary writing only `issues.im_summary` and solution never writing Linear or source code. These descriptors are separate from the `Generate Plan` run path, which is implemented by the Codex run child and the repo-local agent workflow.

The full planning side-effect flow spans server children. Linear sync can populate issue rows from Linear. The UI or CLI can inspect those rows. The planning UI can start a Codex run for a row. Codex runs then generate artifacts in a target issue worktree and, after a ready final gate, write generated fields back into the local issue row. The server parent does not collapse these steps into one service because each stage has different data ownership and failure modes.

# module-relationships

The server sits between the client/CLI and external systems. The planning UI is a safe consumer of server functions; it should receive rows, status, options, and notices, not secrets or direct filesystem access. The CLI is a local operator surface that imports server functions directly and may perform more powerful operations such as manual issue updates. Both surfaces rely on the server's project/cycle/config behavior being stable.

The issue-persistence child is the shared state substrate. Linear sync, dashboard aggregation, UI loading, CLI issue commands, and Codex run artifact persistence all read or write the `issues` table through that child. The parent-level rule is ownership split: Linear sync writes observed Linear fields and snapshots; Codex run persistence writes generated planning fields after the gate; CLI updates are manual local operations; the UI should not write directly.

The linear-sync child connects the server to Linear as a read source. It consumes `getLinearApiKey`, cycle/project values, and database transaction helpers. Its outputs are issue rows, sync run stats, snapshots, and local JSON exports. It should not mutate Linear and should preserve existing IntentMill-generated planning fields.

The codex-runs child connects the server to local processes, target worktrees, Git, and the repo-local agent workflow. It consumes public project resolution, issue update services, and target worktree paths. It produces run metadata for the UI, stderr/stdout paths for debugging, Git commits/pushes for ticket refs, and issue planning field updates. Parent-level config and project resolution must stay compatible with this child because run startup depends on project keys and aliases.

The workflow command descriptors relate to CLI and tests rather than the main UI run path. They are still part of server behavior because they encode write-boundary promises that agents and scripts may consume. If descriptors are updated, tests and README/operator expectations may need to change.

# constraints

Do not leak secrets through public config helpers. Public status may expose operational facts such as source, host, database, schema, sslmode, and whether Linear is configured, but database passwords and Linear API keys must remain server-only. Any new public config field should be reviewed for whether it reveals credentials or local-sensitive data.

Keep project and cycle normalization consistent. Server helpers normalize cycle names, choose defaults, deduplicate cycles, and resolve projects by key or alias. UI, CLI, Linear sync, and Codex run startup all depend on this consistency. Duplicating normalization in another module invites mismatched filters or operations against the wrong project.

Maintain side-effect ownership. The parent server can orchestrate, but child modules own their concrete effects. Linear sync should not update generated planning fields. Issue persistence should not call Linear or spawn Codex. Codex runs should not fetch Linear issue lists. Workflow descriptors should not silently execute their prompts. Clear ownership makes failure handling and verification tractable.

Planning field contracts cross multiple representations. `im_estimation` appears in the database schema check, a JSON schema file, TypeScript types, Markdown artifact parsing, and UI display. These definitions currently need deliberate alignment. Do not change one representation without checking the others and the tests that parse estimation Markdown.

Errors returned to UI-facing callers should be structured and actionable. Config absence is expected during setup and should produce empty rows plus a clear message, not crash the page. Lower-level service errors can still be surfaced as messages, but server functions should avoid exposing secrets or raw implementation details unnecessarily.

# known-limits

The estimation contract is defined in more than one place. The JSON schema requires `hours` to be at least one, the database check requires a numeric hours value, and the Markdown parser currently accepts finite hours greater than or equal to zero. This is a real drift risk if estimation semantics change.

The dashboard utility is not the main planning page loader. It aggregates metrics, issues, and sync runs for a sprint, but the current UI route has its own more detailed server functions for projects, cycles, rows, Pull, Clear, and Plan. Future dashboard work should decide whether to revive, replace, or remove this helper rather than assuming it is the primary data path.

Workflow command descriptors coexist with the newer backend-triggered cap7 planning path. Some descriptors describe summary, solution, and criteria workflows that are not currently the UI's `Plan` action. Treat them as local command/prompt metadata, not as proof that those workflows are actively wired into the browser.

The server has no centralized authorization layer because IntentMill is a local planning workspace. Operations assume local trusted use with configured credentials. If the app becomes multi-user or remotely hosted, this module's public config, issue update, sync, and Codex run start boundaries would need a security review.

# notes-for-ai

When editing server code, first identify whether the change belongs to parent config/orchestration or a child service. Config source rules, project/cycle helpers, public status, dashboard aggregation, and workflow descriptors belong here. SQL and issue field behavior belong in issue persistence. Linear GraphQL import belongs in linear sync. Process, artifact, Git, and final run persistence belong in codex-runs.

Preserve secret handling. New UI needs should be satisfied by safe projections, not by returning raw config. If a server function needs a secret, resolve it server-side and return only derived status or results.

Check cross-representation contracts when changing planning fields. `im_estimation` is the highest-risk example because schema JSON, SQL constraints, TypeScript types, parser behavior, tests, and UI display all depend on the same shape. Similar care applies if new generated fields are added to issue rows.

Use tests and smoke checks that match the touched relationship. Config changes should be checked with env-only, file-only, and missing-config scenarios. Workflow descriptor changes should update boundary tests. Dashboard changes should cover missing config and child service failure. Cross-child planning changes should also run the Codex run tests because final persistence is where many server contracts meet.
