# Common Evidence And Planning Principles

Use this reference whenever imops drafts, finalises, implements, or gates issue work.

These are shared principles for spec, plan, and development work. They are not specific to one artifact shape.

## Evidence Requirements

- Read and obey the issue worktree's `AGENTS.md` and `.evodocs/constitution.md`.
- Read the ticket requirement source from `ticket-worktree-t2p path`.
- Read `.evodocs/index.json`, then use the relevant `.evodocs/mod--*.md` files as the map for targeted code reading.
- Inspect targeted code only where needed to understand existing contracts, affected modules, data flow, UI/API boundaries, prompts, state machines, configuration, dependencies, tests, and SSOT files.
- Treat code as authoritative when evodocs and code disagree, and record the disagreement in the relevant artifact or handoff.
- For any external library, SDK, framework, API, CLI tool, or cloud service whose correct usage affects the work, use the repo-required `find-docs` / Context7 workflow before writing guidance or code. If docs cannot be fetched, record the limitation instead of guessing unstable API details.
- For any database operation, live data inspection, schema change, migration, DB read, or DB write beyond static SSOT file inspection, use the repo-local `nf-db` skill. If `nf-db` is unavailable, stop instead of proceeding unsafely.
- For frontend UI work, read and follow the relevant frontend directory's `DESIGN.md`. If no relevant `DESIGN.md` exists, record that fact.
- Use repo-root-relative paths in IntentMill artifacts. Do not publish local absolute paths or machine-specific paths.

## Shared Planning Principles

Spec, plan, and development work must prefer, in order:

- preserving the existing architecture and module boundaries
- using existing project libraries, helpers, configuration paths, schemas, and SSOT files before introducing new ones
- choosing the simplest effective implementation path that satisfies the tech issue
- avoiding changes to code, behavior, schemas, dependencies, config, prompts, jobs, tests, or docs unrelated to the target issue
- surfacing uncertainty instead of inventing fallbacks or hidden compatibility layers

If one of these principles cannot be followed, record why in the relevant artifact, gate finding, handoff, or final response.
