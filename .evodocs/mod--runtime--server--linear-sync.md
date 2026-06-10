# purpose

The `runtime/server/linear-sync` module imports a configured Linear cycle into IntentMill's local database. It reads Linear GraphQL, expands relevant child issues, maps Linear issue nodes into local issue rows, transactionally updates current issue state, records sync runs and snapshots, writes a timestamped JSON export, and lists recent sync runs. It is the local reconciliation boundary between Linear as the source of issue facts and IntentMill as the source of generated planning fields.

The module is intentionally one-way. It reads Linear and writes local PostgreSQL plus local JSON exports. It does not write to Linear, does not generate planning content, and does not update `im_summary`, `im_solution`, `im_criteria`, or `im_estimation`. Those planning fields are produced later by the Codex run path and must survive repeated Linear pulls.

For future changes, the most important concept is reconciliation rather than append-only import. A sync updates current observed issue facts, detaches local rows that no longer belong to the synced cycle, records a sync run with stats, and snapshots the current pulled rows. The UI and CLI can trigger this behavior, but the module owns the external request shape and local transaction semantics.

# structure

The Linear request area defines the GraphQL endpoint, defaults, issue node shape, and two queries. The default project is `narrative-sdk`, the default team is `Engineering`, and child issue expansion is enabled unless explicitly disabled. The base query reads active, non-archived issues filtered by project name, team name, and cycle number. It asks for issue identity, title, URL, description, assignee, state, parent, children identifiers, labels, and comments. The child query reads active children by parent id with the same field set.

Cycle and export helpers normalize inputs and output paths. Cycle normalization accepts numbers, `Cycle-N`, and similar case/spacing variants, strips a `.0` suffix, and rejects non-integer values. Display names use `Cycle-N`. Output filenames slugify project and cycle display name and append a compact UTC timestamp under `data`.

Fetch and merge behavior is separated from database writes. Pagination requests one hundred issues per page and follows `endCursor` until Linear reports no next page. The fetched base issues are merged by identifier. Root base issues are issues without parents; when child inclusion is enabled, each root's children are fetched and merged into the same identifier map. Final issues are sorted by the numeric suffix of the Linear identifier.

Row mapping converts Linear's graph shape into IntentMill's local issue row shape. Parent id becomes the parent identifier when available. Assignee and state become names. Version is extracted from the first label that looks like a version label. Comments become JSON objects with id, body, timestamps, and user. Extra metadata stores the Linear id, URL, full label list, and child identifiers. Missing optional values become null, while missing title becomes an empty string to satisfy the local schema.

The database sync area is transactional. It upserts current issue rows, detaches stale local rows from the synced sprint, inserts a sync run, writes issue snapshots, updates final sync stats, and commits. Any error rolls back. The sync-run listing area is a small read service over `sync_runs`, returning recent rows with JSON stats and stats text.

# flows

The public sync flow starts with `syncLinearSprint`. It fills defaults for project, team, cycle, and child inclusion, normalizes the cycle number, initializes the database, computes the display sprint, fetches issues from Linear, maps them to rows, writes those rows and sync metadata to PostgreSQL, then writes the raw JSON export after the database transaction succeeds. The returned result includes project, team, display cycle, numeric cycle, export path, and final stats.

The Linear fetch flow is fail-fast. Every GraphQL request includes the configured Linear API key and JSON content type. HTTP errors, GraphQL errors, and missing data all throw. Pagination accumulates nodes only while responses are structurally valid. Because database writes happen after fetching, a failed Linear request does not partially update local issue state.

The child expansion flow starts from base cycle issues. Base root issues are those with no parent. For each root, the module fetches all direct children through the child query and merges them by identifier. This allows sub-issues that may not directly match the cycle filter to appear in the local issue set when they belong under a cycle root. The stats distinguish base count, root count, expanded child fetch count, and final deduplicated count.

The database reconciliation flow begins by creating the export directory, then opening a transaction. Each current row is inserted or updated by issue id. The conflict update replaces observed Linear fields such as project, parent id, title, assignee, sprint, status, version, description, comments, and extra. It does not touch IntentMill planning fields. After upserts, local rows for the same project-or-null and sprint that are absent from the current issue id list have `sprint` set to null. If the current issue list is empty, every matching row for the project/sprint is detached.

The sync history flow is created inside the same transaction. A `sync_runs` row is inserted before snapshots so its generated id can be used. Every current row is copied into `issue_snapshots` with observed fields, comments, and extra metadata. Final stats add upserted count, detached count, snapshot count, and sync run id. The sync run is then updated with finished timestamp and stats JSON before commit.

The JSON export flow happens after the transaction. It writes a file containing the generated timestamp, project, team, cycle, cycle number, include-sub-issues flag, stats, and raw Linear issues. This export is useful for debugging and audit, but PostgreSQL remains the state the UI reads.

# module-relationships

The module consumes server configuration for the Linear API key. It does not expose that key to the UI or CLI. If credentials are missing or invalid, GraphQL requests fail before local writes proceed.

Issue persistence is the downstream state layer. This module uses `initDb`, `withClient`, and schema-qualified table names to write `issues`, `sync_runs`, and `issue_snapshots`. It relies on the issue schema to store comments and extra as JSONB and to preserve planning fields by simply not including them in the sync upsert.

The planning UI's Pull button and the CLI `sync` command are upstream triggers. Both receive the same sync result shape and use stats to report what happened. The dashboard and CLI sync history commands consume `listSyncRuns`, which reads the `sync_runs` table ordered by newest first.

The Codex run module is a downstream consumer of synced issue rows, but it is not part of the sync. After Linear sync populates or updates issue facts, Codex runs can generate planning artifacts for those rows and write `im_*` fields. Re-running Linear sync should preserve those generated values while updating observed issue facts.

The `data` directory is an operational export sink. Export files contain raw Linear payloads and sync stats for inspection. They are not imported by the planning UI and are not the canonical current issue state. Changing export shape should be treated as a debugging/audit change, not a primary product data model change.

# constraints

Do not write to Linear. This module's external integration is read-only by design. Product or planning field changes should be represented locally, not pushed back through this sync path.

Preserve planning fields during upsert. The conflict update intentionally omits `im_summary`, `im_solution`, `im_criteria`, and `im_estimation`. Adding those fields to the sync update would overwrite generated IntentMill work whenever a user pulls Linear.

Keep transaction boundaries intact. Current rows, stale detach, sync run, snapshots, and final stats should commit together or roll back together. The JSON export is written after commit, so a failed export can leave database sync complete while the file is missing; a failed database sync should not write a new export as if it succeeded.

Be deliberate with stale detach semantics. Rows are detached from a sprint when they match the synced project or have null project and are absent from the current issue set. This preserves the row while removing it from the cycle view. If the current issue list is empty, every matching row for that project/sprint is detached.

GraphQL field limits shape local completeness. The queries request up to one hundred comments, labels, and child identifiers per issue. If Linear issues exceed those nested limits, the local row may not contain every nested item even though top-level issue pagination is complete.

# known-limits

The default project and team are hardcoded for the current expected workspace. Callers can pass different values, but absent options fall back to `narrative-sdk` and `Engineering`. A multi-project deployment should prefer explicit configured values from the caller.

Child issue expansion is sequential per root issue. Large cycles with many root issues can make sync slower than a batched or concurrent approach. There is no throttling, retry, or backoff logic around Linear API calls.

Nested GraphQL selections are capped at one hundred children, labels, and comments per issue. The code does not paginate those nested collections. Very large discussions or label sets may be truncated in local comments or extra metadata.

Version extraction is label-pattern based. It picks the first label matching a version-like pattern and does not understand Linear releases, milestones, or multiple competing version labels.

Sync-run listing does not call database initialization directly. In normal runtime use, callers have already initialized the database through surrounding flows, but direct use in a cold process should ensure initialization first.

# notes-for-ai

When changing Linear fields, update the GraphQL queries, `LinearIssueNode`, row mapping, schema if needed, snapshots, JSON export expectations, and any UI/CLI consumers. Keep observed Linear fields separate from IntentMill-generated planning fields.

When changing reconciliation behavior, test both non-empty and empty cycle results. Empty result handling detaches every matching row for the project/sprint, which is a meaningful destructive local update even though it preserves rows.

When changing child issue behavior, verify parent/child identifiers, duplicate issue merging, stats, and issue ordering. Be careful not to double-count child issues already returned by the base cycle query.

When changing exports or sync stats, check UI Pull notices, CLI output, sync-run history reads, and any debugging workflows that inspect `data/*.json`. The database transaction should remain the source of truth for successful sync state, with the export as a secondary artifact.
