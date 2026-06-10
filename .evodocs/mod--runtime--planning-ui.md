# purpose

The `runtime/planning-ui` module is the browser-facing IntentMill control surface. It lets a user select a configured project and cycle, load locally stored issue rows, pull the current cycle from Linear, clear local rows for the selected project/cycle, start a planning run for one issue, monitor that run, and inspect generated planning artifacts. It is intentionally focused on local planning operations rather than general issue management.

This module owns user interaction and presentation state, not durable state. It asks route-local server functions for data and side effects, then renders the returned configuration status, rows, notices, active run states, and generated Markdown content. PostgreSQL writes, Linear GraphQL calls, Codex process handling, artifact parsing, and Git sync are all server-side responsibilities behind those functions.

The module also provides the application shell and global styling support. The root route sets document metadata and loads the stylesheet, the router factory uses the generated route tree, and the stylesheet establishes Tailwind plus global document/body defaults. Those pieces are small, but they define how the single planning page mounts and renders in the browser.

# structure

The main route contains both server-function definitions and React components. Input validators normalize or reject data before server functions run. Page loading uses a GET server function that returns public projects, configured cycles, selected project, selected cycle, public configuration status, issue table rows, and an error when configuration or database access fails. Mutating server functions handle Linear pull, local clear, planning run start, run status read, and active-run restoration.

The top-level page component owns selection and workflow state. It tracks selected project and cycle, available options, rows, loading flags for cycle changes, Pull and Clear actions, last sync and clear results, active row runs, current time for elapsed displays, the latest finished run notice, and the currently open action menu. It mirrors selected project, selected cycle, and row runs into refs so interval callbacks and async polling logic can see current values without depending on stale closures.

The header area combines branding with operational controls. Project options come from public project configuration, but if the selected project is not present the UI adds a fallback option so selection remains stable. Cycle options combine the selected/configured cycles with `Cycle-1` through `Cycle-60`, sorted numerically, which lets a user switch to cycles not listed in local config. Pull and Clear are disabled while loading or when configuration is missing.

The table is the central repeated UI. It uses TanStack Table for row modeling and sorting, enables multi-column sorting for every sort click, displays a current sort summary, and renders a wide scrollable table. Columns include actions, observed issue fields, generated Markdown planning fields, and structured estimation. Sort indicators show direction and precedence, so users can understand compound sorting.

Generated planning content is shown through preview cells and a dialog. Text Markdown fields are summarized for the table by removing common Markdown syntax and truncating long content. Estimation objects are converted back into a small Markdown representation so they can share the same dialog renderer. The dialog uses `react-markdown` with custom components for links, code, lists, headings, blockquotes, paragraphs, and code blocks, and it closes on Escape, backdrop click, or the close button.

# flows

The page load flow starts with the route loader calling the issues page server function using the default project. The server resolves the cycle, project, and config status. If config is missing, the client still receives project/cycle metadata where available, empty rows, and an error notice. If config is valid, the server lists issue rows for the resolved project label and cycle and returns them in the table row shape. The UI initializes its state from that loader result.

Project and cycle selection flows are similar. Changing either value clears the open action menu, active row runs, prior sync/clear/run notices, page errors, and last finished run. The UI then calls the page server function for the new selection, updates resolved project, project options, row data, cycles, and error state, and releases the loading flag. This reset is important because active runs and notices are scoped to the visible project/cycle; carrying them across selections would make status messages appear attached to the wrong rows.

The Pull flow sends the selected project and cycle to the server. The server resolves the project key to the configured project label, runs Linear sprint sync, reloads issue rows for the synchronized project/cycle, and returns sync stats. The UI replaces rows, projects, cycles, and selected cycle from the response and displays a notice containing final issue count, upsert count, stale detach count, and sync run id. Pull does not manually merge rows client-side; the database read after sync is the source of table truth.

The Clear flow is guarded by a browser confirmation prompt naming the selected project label and cycle. If confirmed, it calls the clear server function, which deletes local rows for the resolved project label and sprint. The UI sets rows to the returned empty list and displays how many local rows were deleted. This is intentionally local cleanup; it does not call Linear and does not touch target-project `.t2p` artifacts.

The Generate Plan flow is row-scoped. If the row already has an active run, the handler returns without starting another one. Otherwise it creates an optimistic `starting` run for that issue, closes menus, clears old notices, and calls the planning server function. When the server returns, the optimistic run is replaced with the actual run id, paths, timeout, and status. If the start request fails, the row run is removed and the error is shown.

Active run restoration and polling are separate flows. Whenever visible rows change, the UI asks the server for active runs for those issue ids and merges returned active runs with existing visible active state, discarding invisible or inactive entries. A three-second interval polls statuses for active runs with run ids. Terminal runs are removed from row state, the latest finished run notice is recorded, and successful runs trigger a fresh page data load so newly persisted planning fields appear in the table. Rejected status reads remove the affected row run and show an error.

# module-relationships

The planning UI is downstream of public configuration and issue persistence. It receives project/cycle lists, config status, and issue rows from server functions. It uses project keys for selection but asks the server to resolve labels before issue queries and sync calls. It displays the planning fields stored in the issue table, but it does not decide when those fields are valid; server-side planning persistence and the final gate own that.

It is upstream of Linear sync, local clear, and Codex planning runs only as a user-command producer. Pull delegates to the Linear sync service. Clear delegates to issue persistence. Plan delegates to the Codex run service. The UI should not reimplement any of those effects because each has server-side contracts around credentials, database writes, process state, Git safety, and artifact parsing.

The UI consumes Codex run state through DTOs. It displays active status, elapsed time, final notices, stderr paths for failures, and final gate summaries for completed runs. It does not read `tmp/codex-runs` files directly and does not parse `im-gate.md` or `.t2p` artifacts. That relationship keeps filesystem and target worktree access server-side.

The module has a support relationship with generated routing and global CSS. The generated route tree is an input to the router factory; it should be regenerated through the router tooling rather than hand-edited. The stylesheet provides global base styles only. Most product UI styling lives inline in component class names in the main route file.

The action menu hints at future workflow siblings. `Plan` is enabled and wired to Codex generation, while `Develop` and `Review` are visible but disabled. Future agents enabling those actions must add server capabilities and row state handling rather than only turning on the buttons, because the current UI has no runtime contract for those actions.

# constraints

Durable state must continue to flow through server functions. Client state is for selection, loading, notices, active row presentation, sorting, and modal state. Rows should be refreshed from the server after operations that can change persisted data, especially successful planning runs and Pull. Avoid client-side assumptions that manually patch `im_*` fields after a run; the server's artifact persistence path determines what was actually written.

Run state is scoped by project, cycle, and visible issue ids. Project or cycle changes must clear active run presentation and notices. Active run restoration must filter to visible rows and resolved project. Starting a plan must prevent duplicate active row runs while allowing other rows to run independently if the server permits them.

Polling should preserve failure visibility without leaving stale active UI. If a status read fails, the row is reset and an error is shown. If a terminal run succeeds, rows are refreshed. If a terminal run fails or times out, the latest finished notice should preserve the failure information and include stderr path when available. These details are the user's primary feedback for background work that happens outside the browser.

Markdown rendering is display-only. Table summaries intentionally strip Markdown syntax and truncate text, while dialogs render Markdown through component mappings. Do not treat summarized text as source content. Estimation display is reconstructed from the structured object and may show `-` for missing fields; the canonical estimation value is still the server/database object.

The table currently assumes a wide desktop-oriented data surface with horizontal scrolling and a large minimum width. Changes that add columns, long labels, or new action controls should preserve scanability and avoid layout shifts in the sticky header, sort indicators, action buttons, and modal content.

# known-limits

The main planning page is a large single component file that mixes route-local server functions, validators, state orchestration, table construction, rendering helpers, and modal components. This makes the page easy to follow in one place but increases edit collision risk and makes isolated component testing less natural.

The table does not implement server-side pagination, virtualization, or filtering beyond project/cycle selection and TanStack sorting. It loads up to the server-provided row limit and renders a very wide table. Large cycles may need performance and usability work before the UI feels dense but fast.

Only the Plan action is implemented. Develop and Review are present as disabled menu items, so the visible workflow advertises future actions that do not yet have client/server behavior. Enabling them requires new backend contracts, not just UI state.

Markdown summarization is regex-based and intentionally lossy. It is suitable for a short table preview but not a semantic Markdown parser. Complex Markdown, tables, or unusual syntax may summarize imperfectly even though the dialog still renders the stored content.

# notes-for-ai

When changing this module, start from the user flow rather than the visual component. For Pull, Clear, and Plan, identify the route-local server function, the client handler, the state reset behavior, the notice behavior, and whether rows must be reloaded. Missing one of those pieces often causes stale rows or misleading status messages.

Keep server-side concerns server-side. Do not move config secrets, Linear calls, run metadata reads, artifact parsing, or Git checks into client code. If the UI needs more information, add a server DTO that exposes only the safe fields needed for display.

Be careful with interval and async state. The current implementation uses refs to keep selected project, selected cycle, and row runs current for polling callbacks. If ref synchronization is refactored, verify active run restoration, polling, project/cycle switches, and successful run row refreshes together.

For UI changes, manually exercise missing config, empty rows, Pull success, Clear confirmation/cancel, Plan start failure, active run restoration after refresh, successful run refresh, failed run notice, markdown dialog open/close, and estimation display. The most important regressions are stale row data, duplicate run starts, hidden failures, and generated content rendered against the wrong issue.
