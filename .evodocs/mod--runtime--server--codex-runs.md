# purpose

The `runtime/server/codex-runs` module manages backend-triggered Codex planning runs. It starts a detached Codex process for one project issue, records run metadata and logs, exposes status for the planning UI, repairs active runs that time out or disappear, and converts a successful ready-gated artifact set into local issue planning fields. It is the runtime bridge between a user's `Plan` action and the repo-local agent workflow that generates `.t2p` refs in a target issue worktree.

The module's most important responsibility is not simply process spawning. It protects IntentMill from treating a Codex exit code as planning success. A run is only truly successful when Codex exits, the final artifact gate is ready, all required planning refs exist and are non-empty, estimation Markdown parses into the expected object, the target worktree contains no changed paths outside the current ticket artifact directory, ticket refs are committed and pushed if needed, and the local issue row is updated.

This module owns many operational details that are invisible to the UI: run id construction, filesystem paths under `tmp/codex-runs`, metadata atomic writes, timeout timers, PID checks, process termination, prompt construction, last-message parsing, Git command execution, and stderr cleanup. UI code should consume the returned run state rather than reimplementing any of this logic.

# structure

The public surface has three run lifecycle operations and two artifact helpers. `startGenerateIssuePlanRun` starts a new `generate-issue-plan` run after validating action, project, and issue id. `getCodexRunStatus` reads and repairs one run's state. `listActiveCodexRuns` restores active runs for visible issue rows. `readIssuePlanningArtifactPatch` maps ready target worktree refs into an issue update patch. `commitAndPushIssuePlanningArtifacts` commits and pushes only current-ticket planning artifacts.

Run metadata is the service's local durable state. Each run has a generated id, action, project, issue id, command, args, cwd, pid, status, timestamps, timeout, terminal code/signal, optional late terminal information, optional artifact write metadata, optional error, and paths for run directory, prompt, stdout, stderr, metadata, and last message. The public run state is a safe projection of that metadata plus an extracted final gate decision.

Start protection uses a filesystem lock directory under `tmp/codex-runs/locks/<project>-<issueId>`. A fresh lock allows start; a lock younger than the stale threshold blocks another start request; an old lock is removed and replaced. Inside the lock, existing active metadata for the same project and issue is inspected. Timed-out active runs are finalized first, while any still-active run blocks the new request.

The spawn path builds a prompt that instructs Codex to run the repo-local `intentmill-ops` cap7 flow for the project and issue. It writes prompt and starting metadata before spawning, redirects stdout and stderr to files, sets `CODEX_PROMPT_PATH`, uses `codex exec` with the IntentMill root as `--cd`, asks Codex to write a last-message file, records running metadata with pid, registers a timeout timer, and unrefs the child. Child error and close events both flow into terminal metadata writes.

Terminal metadata writing is centralized. It prevents terminal states from being overwritten, preserves late exit code/signal if a process closes after a timeout was already recorded, and routes successful runs through artifact persistence before writing final metadata. This is the module's main state-transition guard: status can move from running to succeeded at the process level, but persistence can convert that same terminal attempt into failed.

# flows

The run start flow begins with UI or server-function input. The module rejects unsupported actions, resolves the public project, normalizes the issue id, and enters the issue lock. It scans active metadata for the same project/issue. If an old active run is already timed out, the module terminates and finalizes it; if an active run is still valid, the start fails. Otherwise it creates a run directory, writes the cap7 prompt, writes starting metadata, spawns Codex detached, writes running metadata, and returns immediately so the UI can show an active row.

The status flow is both read and repair. The caller supplies a run id, which must match a conservative lowercase/digit/dot/underscore/hyphen pattern before resolving `run.json` under the runs root. If metadata is active and its timeout has passed, the module terminates the process with SIGTERM, waits briefly, escalates to SIGKILL if needed, writes timed-out metadata, and returns that state. If metadata is active but the pid no longer exists, orphan recovery checks the last-message file: a non-empty last message is treated as process success, while missing or empty output is failure. That inferred terminal result still goes through artifact persistence when it is success.

The active restore flow supports page reloads and project/cycle changes. It reads every metadata directory except locks, filters active runs by canonical project and visible issue ids, finalizes timed-out entries, groups by issue, keeps the newest run by started timestamp and run id, and finalizes older duplicates as failed with a stderr note. The UI then displays only the latest active run for each visible issue.

The successful persistence flow starts inside terminal metadata writing. The module reads the final gate artifact from the target worktree's ticket refs and parses the decision. It prefers content under a `## Decision` section when present and otherwise falls back to a line containing `decision` or the whole normalized file. Only `ready` allows persistence; `revise`, `blocking`, or unknown decisions fail the run. The module then reads summary, solution, criteria, and estimation refs in parallel and maps them into the issue update patch.

Estimation parsing is label-based. The module reads `Development mode`, `Hours`, and `Rationale` lines from Markdown. The mode must be `agent`, `agent-led`, or `human-led`. Hours must parse to a finite non-negative number. Rationale must be non-empty. This parser is stricter than plain text storage and intentionally fails before database writes when cap6 output does not match the expected shape.

The Git sync flow protects target repositories from accidental source commits. The module verifies the target issue worktree exists and is inside Git, requires a current branch, reads porcelain status, and rejects any changed path that does not start with `.t2p/tickets/<ISSUE-ID>/`. If there are no changed paths, it reports clean. If there are ticket changes, it stages only the ticket directory, verifies something was staged, commits with a standard message, obtains the short commit, and pushes the branch with upstream tracking. Only after Git sync succeeds does the module call `updateIssue`.

# module-relationships

The planning UI is the main upstream consumer. It starts runs, restores active runs for visible issue rows, polls status, displays elapsed time, and reports failure paths. The UI receives status DTOs and filesystem path strings, but it does not inspect run files. This module owns the truth of whether a run is active, terminal, succeeded, failed, failed to start, or timed out.

Server configuration is used for project resolution. The service accepts project input from the UI, resolves it through public project config, and then operates with the canonical project key. That key is embedded in run metadata and target worktree paths. If project alias behavior changes, this module's active run matching and worktree path expectations are affected.

The module consumes `agent-workflow` through a generated prompt and consumes its outputs through the target worktree refs. The service instructs Codex to run cap7 but does not participate in cap3 through cap11 generation. After Codex exits, the service expects the workflow to have produced a final gate plus summary, solution, acceptance criteria, and estimation refs in `.t2p/tickets/<ISSUE-ID>/refs/`.

Issue persistence is the downstream storage relationship. Successful artifacts become `im_summary`, `im_solution`, `im_criteria`, and `im_estimation` through `updateIssue`. The estimation object must also satisfy database constraints. If the issue row is missing, the run is failed rather than silently writing nowhere.

Git and the target repository remote are external side effects. The module stages, commits, and pushes ticket refs from the issue worktree after validating changed paths. It intentionally does not commit source changes. The local filesystem is another external contract: run metadata under `tmp/codex-runs` is the status store, and target worktrees under `.workspace` are the artifact source.

# constraints

Do not trust process exit alone. A zero exit code can still produce a failed run if artifacts are missing, the final gate is not ready, estimation cannot be parsed, Git status includes disallowed paths, push fails, or the issue update fails. Any change to status transitions must preserve this distinction.

Path validation and bounded reads are safety requirements. Run ids are validated before metadata path resolution, metadata paths are constrained under the runs root, and last-message files larger than the configured bound are treated as unknown gate state. Target worktree paths are derived from normalized project and issue inputs, not accepted directly from clients.

Duplicate run prevention is per project and issue. The start lock prevents concurrent start requests from racing, while active metadata inspection prevents two long-running processes for the same row. Active restoration also collapses duplicate active metadata to the newest run and fails older duplicates.

Terminal metadata writes must remain idempotent. A timeout should not be overwritten by a late child close, and an already terminal run should not be rewritten by a later status read or event handler. This matters because process events, timer callbacks, UI polling, and orphan recovery can all try to finalize the same run.

Git commit scope is intentionally narrow. Changed paths outside `.t2p/tickets/<ISSUE-ID>/` must fail persistence. Staging is also restricted to that ticket path. This protects target project source code from being committed by an automated planning run and keeps generated planning artifacts separate from implementation changes.

# known-limits

Run state is stored in local filesystem metadata, not a durable queue or database table. In-memory timeout timers are registered only in the current Node process; after a restart, timeout repair depends on a later status read or active restoration. This is acceptable for a local workspace but is not a distributed worker model.

Process liveness uses PID checks. PID reuse is theoretically possible, and detached child management depends on local operating-system behavior. The module mitigates some orphan cases with last-message inspection but does not have a robust process supervisor.

The timeout is fixed at twenty minutes. Long planning runs are terminated rather than extended dynamically. The prompt tells Codex to run the full cap7 workflow, so unusually large target issues may time out even when they are making progress.

Gate extraction for UI display is substring-based and separate from final artifact gate parsing. The UI-facing last-message decision is useful for notices, but final persistence still reads `im-gate.md` from the target worktree. The two can disagree if Codex's last response and artifact content diverge.

The module assumes the target worktree layout produced by the agent workflow: `.workspace/<project>--<ISSUE-ID>/.t2p/tickets/<ISSUE-ID>/refs/`. Projects that do not follow that layout cannot be persisted by this service without code changes.

# notes-for-ai

When changing start behavior, test duplicate starts, stale locks, already-active runs, and timed-out previous runs. The UI depends on immediate return with a running state, while the server depends on not spawning multiple processes for the same project/issue.

When changing status behavior, test active polling, timeout finalization, orphaned pid handling, late child close after timeout, last-message size limits, and final gate display. Several code paths can finalize a run, so idempotency is more important than making one happy path work.

When changing artifact persistence, preserve the order of safeguards: ready gate first, required artifacts next, estimation parse before database write, Git changed-path restriction before commit, Git sync before `updateIssue`, and failure conversion with stderr append when any step fails. This order prevents low-quality or unsafe artifacts from becoming issue fields.

When changing Git behavior, use temporary worktrees with both allowed ticket changes and disallowed source changes. The disallowed path case is a core safety property. Do not broaden the commit path just because a target issue worktree contains useful source edits; implementation changes belong in a separate development workflow, not the planning run persistence path.
