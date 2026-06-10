# purpose

The `runtime/cli` module provides IntentMill's local operator command surface. It is used for setup, health inspection, database schema initialization, issue inspection and repair, Linear sync, sync-run inspection, workflow command descriptor output, and preparation of configured target repository base clones under `.workspace/`. It lets a developer or agent operate the same local planning system that the web UI uses without needing to click through the browser.

This module is intentionally thin over the runtime server services. The `intentmill` command imports configuration, database, issue, Linear sync, sync-run, and workflow-command services from `src/server` and delegates actual behavior to those modules. The `init-workspace` command is the exception: it directly reads project repository config and runs Git commands because its job is to create or update local base clones before issue-specific worktrees exist.

For future coding work, the CLI matters because it is both a setup path and a bypass path. The web UI's `Plan` action writes planning fields only after Codex produces refs, the final gate is ready, ticket artifacts are committed and pushed, and the issue row update succeeds. The CLI can directly update issue fields, including generated planning fields, when an operator runs `issues update`. That power is useful for local repair, but it means CLI changes must preserve clear command boundaries and should not accidentally make manual writes look like gated generation.

# structure

The general command entry is `scripts/intentmill.ts`, run by `npm run intentmill`. It contains a small argument parser that separates positional arguments from `--option value` pairs and boolean flags. It uses helper readers for string and number options and prints most command results as pretty JSON. There is no command framework, nested parser library, or shell completion layer; command behavior is explicit TypeScript branching in `main`.

Top-level commands cover local runtime operations. `init-db` initializes the configured PostgreSQL schema and tables. `schema` prints the schema SQL source. `health` prints public configuration status without secrets. `sync` calls Linear sprint sync for `--sprint` or `--cycle`, defaulting to `Cycle-18` after normalization. `sync-runs list` prints recent sync run records with a bounded limit. `commands` prints sprint-level workflow descriptors, and `ai` prints a selected workflow descriptor for summary, release-plan, solution, or criteria style operations.

Issue subcommands are grouped under `issues`. `issues list` filters by sprint, assignee, status, version, and limit, then prints a count plus rows. `issues show` requires an issue id and prints that row or null. `issues update` builds a whitelisted patch from supported options such as title, assignee, status, description, and `im_*` planning fields. It normalizes sprint values before updating, parses `--im-estimation` as JSON, and supports `--clear` by converting comma-separated hyphenated field names to underscored patch keys.

The workspace initializer is `scripts/init-workspace.ts`, run by `npm run init-workspace`. It reads `ssot-config.json`, ensures `.workspace/` is listed in `.gitignore`, creates the workspace directory, and iterates configured projects. For each project, it either clones the configured repo into `.workspace/<project-key>` or syncs an existing git clone. A configured `default_branch` is used when present; otherwise the script uses `main`.

Git behavior in the workspace initializer is conservative and operator-visible. Existing base clones are checked for dirty state with `git status --porcelain`; dirty clones are reported and skipped rather than pulled. Clean clones fetch origin, switch to the configured branch when necessary, and pull with `--ff-only`. Fresh clones use `git clone` and include `--branch` when a branch is configured. Clone, fetch, checkout, and pull inherit stdio so the operator sees Git progress and errors.

# flows

The setup flow normally starts with `npm run intentmill -- health`, then `npm run intentmill -- init-db`, then `npm run init-workspace`. Health checks whether the runtime can resolve database configuration and whether Linear is configured, but it does not open a database connection. Init-db creates the configured schema, trigger function, tables, indexes, and constraints through the shared database client. Init-workspace prepares base project clones so later issue-specific planning workflows can create sibling worktrees from a clean, current branch.

The issue inspection flow uses the same database services as the web UI. An operator can list rows for a sprint, filter by assignee/status/version, inspect one issue, or update selected fields. List and show are read-only. Update is a direct local database write; it does not validate that text fields came from a ready planning artifact. Estimation updates are parsed from JSON passed on the command line and then left to the issue service and database constraint to accept or reject. The command prints the updated row or null, making it suitable for scripts that need structured output.

The Linear sync flow is a command-line version of the UI Pull action. It normalizes the sprint argument, calls the shared sync service, and prints the returned sync result. All GraphQL fetching, child issue expansion, upsert behavior, stale-row detachment, sync-run creation, snapshot creation, and JSON export writing happen in the server sync module. The CLI does not implement a separate Linear client, so changes to sync semantics are centralized.

The workflow descriptor flow is informational. `commands` prints the sprint-level descriptors built by `buildWorkflowCommands`, including command strings, prompt text, reads, writes, and never-writes boundaries. `ai solution` and `ai criteria` require an issue id and print issue-specific descriptors from `buildIssueWorkflowCommands`. These commands do not execute Codex and do not update the database; they expose the descriptor objects that can be copied or inspected.

Every `intentmill` command closes the PostgreSQL pool in a `finally` block. This matters for one-shot CLI use because commands such as list, sync, and update may open a pool through shared services. Errors are converted into a message on stderr and `process.exitCode = 1`, which keeps failure output concise while still making shell callers fail.

# module-relationships

The CLI consumes package scripts as its public entry points. `npm run intentmill` invokes `tsx scripts/intentmill.ts`, and `npm run init-workspace` invokes `tsx scripts/init-workspace.ts`. README setup instructions depend on these scripts, so changing command names or output shape has documentation and developer-onboarding consequences.

The CLI depends on the server module rather than duplicating runtime services. Database initialization comes from `src/server/db/client.ts`; schema text comes from `src/server/db/schema.ts`; issue operations come from `src/server/issues/service.ts`; Linear sync comes from `src/server/linear/sprint-sync.ts`; sync history comes from `src/server/sync-runs/service.ts`; workflow descriptors come from `src/server/workflows/commands.ts`; public health comes from `src/server/config.ts`. This relationship keeps command behavior aligned with browser/server behavior and makes server service changes visible through both surfaces.

The workspace initializer has a direct relationship with `ssot-config.json` and Git. It reads configured projects, repo URLs, aliases indirectly through project keys, and default branches. It produces base clones under `.workspace/<project-key>`. Those base clones are consumed later by the repo-local agent workflow when preparing issue worktrees. The initializer does not create issue worktrees; it only ensures the base clone exists and is current enough for downstream work.

The CLI relates to `runtime/server/issue-persistence` through manual issue writes. Because `issues update` can write `im_summary`, `im_solution`, `im_criteria`, and `im_estimation`, it can modify the same fields that the Codex run service normally writes after a ready gate. That relationship is intentionally local and operator-driven, but it means any schema or field rename must update CLI option mapping as well as server persistence.

The CLI relates to `runtime/server/linear-sync` as an alternate trigger for sync. UI Pull and CLI sync should be equivalent in data effects, even though their user feedback differs. If sync behavior changes, verify both the browser path and `npm run intentmill -- sync` because operators may rely on CLI sync for debugging or batch updates.

# constraints

Keep the CLI thin over shared services. Adding a second SQL path, a second Linear request implementation, or a second estimation parser in `scripts` would create drift from the runtime server. The command layer should parse options, call the shared service, print structured output, and close resources.

Be explicit about write boundaries. `issues update` is a direct local database mutation and should stay visibly separate from gated generation. Do not make it silently run Codex, commit artifacts, or imply that manually supplied `im_*` values passed the planning gate. Conversely, descriptor commands should remain read-only and should not be confused with agent execution.

Workspace setup must not hide dirty state. A dirty base clone is skipped and reported, not force-pulled. A destination that exists but is not a git repository is an error, not a directory to overwrite. `.workspace/` should remain ignored so target clones and issue worktrees stay out of IntentMill's Git history.

Sprint normalization should remain consistent with server issue services. CLI commands accept plain numbers, `cycle 19`, or `Cycle-19` style input because they call the same normalization logic where appropriate. Divergent normalization would cause CLI list/sync/update behavior to disagree with the UI's selected cycle.

The parser is intentionally simple, so command additions must account for its limitations. It supports `--key value` and boolean `--key`; it does not handle quoted values itself beyond what the shell passes, repeated options as arrays, short flags, or nested subcommand schemas. Complex new command shapes may require improving the parser rather than adding ad hoc branches.

# known-limits

The CLI has minimal validation beyond required positional arguments and the server/database constraints it reaches. For example, `issues update --im-estimation` accepts a JSON string and passes the parsed object as a patch; invalid content is caught only by later service or database behavior. Text planning fields can be manually set to arbitrary content.

The workspace initializer prepares base clones only. It does not create issue branches, attach issue worktrees, rebase issue branches, or inspect ticket artifact cleanliness. Those responsibilities belong to the agent workflow's worktree capability and the Codex run persistence path.

There is no rich command help, shell completion, dry-run mode, or machine-readable error envelope. Successful outputs are usually JSON, but errors are concise human messages written to stderr with a nonzero exit code. That is adequate for local use but not a stable public CLI API.

The CLI defaults still contain historical or convenience assumptions, such as `Cycle-18` in several command paths and `main` as the default branch in workspace initialization when project config omits a branch. Configured projects should provide explicit current cycles and default branches when those defaults are not correct.

# notes-for-ai

When changing CLI behavior, first decide whether the logic belongs in a shared server service. If the browser and CLI should have the same side effect, implement it in `src/server` and keep the script as a command wrapper. Only put logic directly in `scripts` when it is genuinely command orchestration, argument handling, output formatting, process cleanup, or workspace Git setup.

Preserve the distinction between base workspace setup and issue-specific planning work. `init-workspace` may clone or update `.workspace/<project-key>`, but issue branches and `.workspace/<project-key>--<ISSUE-ID>` worktrees should remain in the agent workflow. Mixing those responsibilities would make dirty-state rules harder to reason about.

After editing `scripts/intentmill.ts`, run targeted smoke commands for the changed branch, not only TypeScript build. Useful checks include `npm run intentmill -- health`, `npm run intentmill -- schema`, `npm run intentmill -- commands --sprint Cycle-19`, and a read-only issue command when database config is available. For update behavior, prefer a disposable local row or test database because the command writes directly.

After editing `scripts/init-workspace.ts`, verify behavior with both missing and existing workspace directories when possible. Check that `.workspace/` remains in `.gitignore`, dirty clones are skipped without pulling, clean clones use the configured branch, and non-git destination directories still fail loudly rather than being overwritten.
