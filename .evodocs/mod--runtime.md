# purpose

The `runtime` module is the IntentMill application runtime: the local web app, server functions, persistence layer, external sync, background Codex execution path, and supporting route/test code that turn selected Linear cycle issues into local planning fields. It gives users a focused issue table where they can pull current Linear issues, inspect generated planning artifacts, and start an automated planning run for a single issue.

The parent module's responsibility is coordination across its children. The planning UI owns the browser workflow and user-visible state. The server owns configuration, database access, Linear import, Codex process lifecycle, artifact persistence, and public data returned to the UI. The CLI owns operational entry points that reuse the same server capabilities outside the browser. The runtime parent is where these areas fit into one product flow: a configured project and cycle become database issue rows, a row action becomes a background Codex run, and a ready final gate becomes `issues.im_*` fields rendered back in the UI.

For future coding agents, this module is the map for changes that cross boundaries. A UI-only table change belongs in the planning UI child, a database/schema change belongs in issue persistence, a Linear import behavior change belongs in linear sync, and any change to the `Plan` lifecycle must account for the UI, server runner, target worktree artifacts, Git sync, and database update contract together.

# structure

The runtime is a TanStack Start and React application. Routing starts with a generated route tree, a small router factory, and a root document route that sets HTML metadata, loads the stylesheet, and renders router scripts. The main route combines server functions and client components. Its server functions read issue rows and public configuration, pull issues from Linear, clear local cycle rows, start Codex planning runs, read individual run status, and restore active runs for visible rows.

The UI side is a single operational surface rather than a marketing site or multipage administration console. It keeps selected project and cycle state, row data, cycle/project options, loading flags, last sync/clear/run notices, active per-row run state, a current time tick for elapsed timers, and a single open actions menu. It uses TanStack Table for multi-column sorting and React Markdown to display generated planning fields in dialogs. It does not own durable state; every durable issue, sync, or planning result comes from the server.

The server side is arranged around a few stable responsibilities. Configuration reads environment variables first and falls back to `ssot-config.json`, while exposing only sanitized public status to the UI. The database client lazily creates the configured schema and applies the schema source for `issues`, `sync_runs`, and `issue_snapshots`. Issue services own listing, clearing, updating, planning metrics, sprint normalization, and the shape of issue update patches.

External and background behavior live in server services. Linear sync owns GraphQL pagination, child issue expansion, local reconciliation, sync run records, issue snapshots, and JSON exports. Codex run coordination owns run directories, metadata, stdout/stderr paths, detached process spawning, per-issue start locks, timeout and orphan recovery, final gate parsing, artifact reading, Git commit/push of ticket refs, and database writeback. Workflow command descriptors provide a smaller command/prompt catalog used by the CLI and earlier AI workflow surfaces.

Tests sit inside the runtime rather than being a declared child module, but they document important invariants. They exercise cycle normalization, command write boundaries, final gate extraction, timed-out run finalization, orphaned process handling, artifact-to-DB mapping, estimation validation, and asynchronous run startup. Treat them as behavior evidence for the parent runtime and the specific child modules they protect.

# flows

The initial page load flow starts in the route loader. The loader calls the server function that resolves configured projects and cycles, computes the selected public project, checks runtime configuration, and lists issues for the selected project label and cycle. If configuration is missing, the page returns an error state with empty rows while preserving the project and cycle options it can safely expose. If database access succeeds, rows are projected to the table shape and rendered with planning artifact fields included.

The Linear pull flow starts when the user clicks `Pull`. The client calls a server function with the current project and cycle. The server resolves the project key to its configured label, calls the Linear sprint sync service, then lists the refreshed local issue rows. Sync fetches active Linear issues by project, team, and cycle, expands children for root issues, converts Linear nodes into local issue rows, upserts observed fields, detaches stale local rows that are no longer in the cycle, records a sync run, writes issue snapshots, and writes a timestamped JSON export. The UI then replaces rows and shows a sync notice with final counts.

The clear flow is local-only. The UI asks for confirmation, then calls a server function that resolves the project and deletes local issue rows for the selected project label and normalized sprint. It returns the deleted issue ids and an empty row set. This does not touch Linear or planning artifacts in target worktrees; it only removes local database rows for that project/cycle view.

The planning run flow crosses the most boundaries. The UI starts a row-level run by sending project and issue id to the server. The server validates the action, resolves the configured project, normalizes the issue id, takes a lock for that project/issue pair, rejects duplicate active runs, creates a run directory under `tmp/codex-runs`, writes a prompt that instructs Codex to run the repo-local full planning workflow, writes metadata, spawns `codex exec` detached, registers a timeout, and returns a running state immediately. The UI records that state, disables duplicate planning for that row, and polls run status every few seconds.

Status polling is both observability and recovery. A status read can return current metadata, finalize a timed-out run, or convert an orphaned active process into a terminal state. When a run completes successfully at the process level, the server still has to persist artifacts. It requires a ready final gate under the target issue worktree, reads summary, solution, acceptance criteria, and estimation refs, parses estimation Markdown into a constrained object, verifies that changed Git paths are limited to `.t2p/tickets/<ISSUE-ID>/`, commits and pushes those ticket artifacts if needed, and updates the local issue row. If any final persistence step fails, the run becomes failed even if Codex exited with code zero.

# module-relationships

The runtime parent is the integration layer for its declared children. `runtime/planning-ui` consumes server functions and presents the issue table, filters, row actions, markdown dialogs, notices, and active-run timers. `runtime/server` provides all data and side effects behind those server functions. `runtime/cli` reuses the same config, database, issue, sync, and workflow-command services for local operator commands. Changes that affect user-visible planning behavior often cross at least two of these children.

The runtime consumes configuration from environment variables or `ssot-config.json`. Secrets such as PostgreSQL credentials and Linear API keys remain on the server. Public config status reports only non-secret operational facts to the UI. Project aliases and cycle defaults are central contracts because UI filters, CLI commands, Linear sync, and Codex run startup all rely on the same normalized project/cycle meaning.

PostgreSQL is the runtime's durable local state. Linear observed fields, comments, extra metadata, and IntentMill planning fields share the `issues` table, while sync history and snapshots provide auditability for imports. The schema constraint on estimation JSON ties final artifact parsing to database integrity. Linear sync must not overwrite `im_summary`, `im_solution`, `im_criteria`, or `im_estimation`, because those fields are generated and persisted by the Codex run path.

Linear is an external producer, not a sink. Runtime sync reads Linear GraphQL and stores local copies and snapshots. IntentMill does not write back to Linear in this runtime path. Git and Codex are external execution systems for planning runs: Codex generates artifacts in an issue worktree, and Git is used after success to commit and push only the ticket artifact directory. The repo-local `agent-workflow` module defines what Codex should do inside that target worktree, while runtime/server/codex-runs defines how the process is launched and how artifacts are trusted after it exits.

The runtime's tests are a relationship contract with future changes. They do not cover every UI state or every SQL branch, but they specifically protect cross-boundary behavior that would be easy to break: gate wording, estimation parsing, timeout finalization, artifact persistence failure handling, and write-boundary descriptors. When modifying runtime flows, use those tests to understand which behaviors the code already treats as stable.

# constraints

Configuration must keep secret and public concerns separated. The UI can learn whether configuration is present and which database/schema it is using, but it must not receive credentials or API keys. Project and cycle resolution should remain consistent across server functions, CLI, sync, and run startup; otherwise the UI can show one project/cycle while a backend operation acts on another.

Linear sync and planning persistence have different ownership over the same issue row. Sync owns observed Linear facts and snapshots. Codex run persistence owns generated planning fields. A sync should preserve existing `im_*` values, and a planning run should update only the selected issue after the final gate and artifact parsing succeed. Clearing rows is intentionally scoped by project and sprint and should not be confused with deleting target-project artifacts.

Process status is not equivalent to planning success. A Codex process can exit successfully but still fail persistence because the final gate is not ready, an artifact is missing, estimation Markdown is invalid, the issue worktree is missing, the Git status includes disallowed paths, push fails, or the issue row cannot be updated. The runtime models those cases as failed runs, and the UI should report them as such.

Filesystem paths and run ids are security-sensitive. Run id input is constrained before resolving metadata paths. Last-message reads are bounded by size before gate extraction. Git commits are restricted to the current ticket artifact directory. These checks prevent path traversal, oversized status reads, and accidental publication of unrelated target-project changes.

Generated route files and static assets are support material. Do not treat `routeTree.gen.ts`, CSS, favicon/manifest assets, JSON exports, or `tmp/codex-runs` logs as independent runtime modules. They matter because runtime behavior uses or produces them, but stable responsibility lives in the route, server services, CLI scripts, and workflow contracts.

# known-limits

The runtime uses local filesystem metadata as its background run store. There is no durable job queue, distributed worker coordination, or multi-host run ownership. Timeout recovery and orphan detection rely on metadata files, PID checks, and bounded last-message content. That is appropriate for a local planning workspace, but it is not a general multi-user job system.

The main UI concentrates a large amount of behavior in one route file: server functions, state restoration, polling, table construction, dialogs, notices, and row actions. That makes the current single-page workflow straightforward to trace, but it increases the risk that unrelated UI changes collide in the same file and makes smaller component-level testing harder.

Sync exports and run logs are local operational artifacts. JSON snapshots under `data` and run directories under `tmp/codex-runs` are useful for debugging and audit, but they are not the canonical state used by the UI. PostgreSQL rows are canonical for the app view, and target worktree refs are the canonical source for generated artifacts before server persistence.

The runtime has focused tests for boundary behavior, not comprehensive integration coverage across a real database, real Linear API, real Codex process, and real Git remote. Changes to SQL, GraphQL payload assumptions, UI rendering, or external process behavior may need additional manual or integration verification beyond the existing unit-style tests.

# notes-for-ai

When changing runtime behavior, first classify the affected path. UI display, sorting, dialogs, and polling state belong in `runtime/planning-ui`; database schema or issue query changes belong in `runtime/server/issue-persistence`; Linear import behavior belongs in `runtime/server/linear-sync`; background planning lifecycle belongs in `runtime/server/codex-runs`; local operator commands belong in `runtime/cli`. Cross-cutting changes should be planned from this parent flow before editing a child.

Preserve the ownership split around `issues` rows. Do not let Linear sync overwrite generated planning fields. Do not let a planning run update issue fields before the final gate is ready and all required refs parse correctly. If estimation format changes, update both the workflow rules and the runtime parser/schema constraint together.

Be careful with path and Git boundaries. Any change that touches target worktree paths, run ids, log paths, last-message paths, or commit behavior should preserve path normalization and the restriction that only `.t2p/tickets/<ISSUE-ID>/` changes may be committed after a successful run. Treat source changes in target worktrees as a blocker, not as something the planning runtime should silently include.

After runtime changes, run the existing tests and choose additional checks based on the touched flow. UI changes should be tried in the browser with missing config, empty rows, active runs, failed runs, and markdown dialogs. Sync changes should be checked against preserved `im_*` fields and stale-row detachment. Codex run changes should be checked against timeout, orphan, ready-gate, invalid-estimation, and disallowed-Git-path cases.
