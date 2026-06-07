# Capability 5: Generate Solution

Use this reference when creating or rewriting the local IntentMill solution artifact. The real reader is a future coding agent who should be able to start implementation from the artifact without rediscovering the basic code context.

Cap5 writes exactly:

```text
.t2p/tickets/<ISSUE-ID>/refs/im-solution.md
```

## Objective

Create a solution that bridges `refs/im-req-engineered.md` and `refs/im-ac.md` to the repository implementation path. It should tell the coding agent which existing modules, files, contracts, and patterns to inspect first, what change shape to make, what source of truth to reuse, and what constraints to preserve.

The solution should be detailed enough that a coding agent can implement by combining the solution with targeted code reading and `.evodocs` context. It should not include tests, because test expectations belong in `im-ac.md`. It must not include code snippets.

Good solution artifacts answer:

- Where should the coding agent start reading?
- What existing pattern, source of truth, contract, helper, config, or data flow should be reused?
- What is the likely implementation path?
- What must not be changed, duplicated, or broken?
- What exact development steps should the coding agent follow?
- What open uncertainty, if any, should the coding agent resolve by reading code?

## Evidence Workflow

Before writing `im-solution.md`:

1. Work from the issue worktree prepared by cap1, normally `.workspace/<project-key>--<ISSUE-ID>`.
2. Ensure cap2 has initialised or refreshed `.t2p/tickets/<ISSUE-ID>/`.
3. Require `.t2p/tickets/<ISSUE-ID>/refs/im-req-engineered.md`. If missing, run cap3 first.
4. Require `.t2p/tickets/<ISSUE-ID>/refs/im-ac.md`. If missing, run cap4 first.
5. Read `.t2p/tickets/<ISSUE-ID>/refs/im-req-engineered.md`, `.t2p/tickets/<ISSUE-ID>/refs/im-req-summarized.md` when present, and `.t2p/tickets/<ISSUE-ID>/refs/im-ac.md`.
6. Read raw sources such as `.t2p/tickets/<ISSUE-ID>/req.md` and `.t2p/tickets/<ISSUE-ID>/notion-*.md` only as fallback or clarification, not as replacements for engineered refs.
7. If `.evodocs/index.json` exists at the issue worktree repo root, read it first and use it as the module map. Select only module docs relevant to the requested product area, workflow, surface, backend service, integration, data flow, or risk area.
8. Read selected `.evodocs/mod--*.md` files for module-level design context, ownership boundaries, integration flows, data contracts, lifecycle rules, and preservation constraints.
9. Inspect relevant repo-root-relative code paths directly. Prefer targeted search and small file reads over broad code dumps. Search for user-facing terms, component names, API names, config names, constants, schema fields, labels, jobs, integration names, and existing hardcoded values mentioned by the requirement or AC.
10. Identify the canonical implementation path and any existing configuration, helper, contract, store, service, route, job, schema, or data flow that should be reused.
11. If an existing source of truth is missing or uncertain, state the code-inspection step the coding agent should take rather than inventing a parallel path.
12. Keep `im-req-engineered.md` and `im-ac.md` central. Evodocs and code evidence should ground the solution, not replace the requested scope with a generic architecture summary.

Do not rely on `.evodocs` alone when the repository is available. Evodocs provide orientation; code provides the implementation map.

## Output Shape

`im-solution.md` must contain exactly this section structure:

```markdown
## Solution

### Overview

{1 to 2 concrete sentences}

### Details

{deeper implementation guidance}

### Steps

1. {specific implementation step}
2. {specific implementation step}
3. {specific implementation step}
```

The three sections should increase in detail:

- `### Overview`: 1 to 2 concrete sentences naming the implementation strategy, primary code area, and source-of-truth decision. Do not write empty framing such as "implement this feature" or "use existing patterns".
- `### Details`: developer-ready guidance explaining the likely code entry points, existing patterns to follow, data/config/API contracts to preserve, and important constraints. Use concise paragraphs or bullets.
- `### Steps`: a numbered implementation sequence. Each step should be concrete enough for a coding agent to execute after reading the named files and evodocs. Steps may mention repo-root-relative files, modules, functions, components, contracts, and expected edits, but must not include code snippets.

## Detail Level

The solution should be more detailed than a short Linear ticket solution, but still focused. Prefer actionable code-entry guidance over research narrative.

Requirements:

- Name concrete repo-root-relative files, components, hooks, stores, services, routes, jobs, API wrappers, config files, constants, schemas, or data contracts when evidence supports them.
- Describe the source-of-truth or reuse decision the implementation should follow.
- Describe the intended change sequence at a high level in `Details`, then as numbered concrete steps in `Steps`.
- Include important preservation constraints for existing behaviour, contracts, data flow, performance, permissions, lifecycle rules, integrations, or UX.
- Include limited uncertainty that the coding agent must resolve by reading code.
- If the exact file cannot be identified with reasonable effort, write a bounded code-search instruction such as "start by searching `apps/foo/src` for the existing copy-button timeout and follow that component's nearest shared constants/config pattern". Do not pretend certainty.

## Exclusions

Do not include:

- Code snippets, pseudo-code blocks, diffs, or copied implementation code.
- Test cases, test commands, QA steps, or verification matrices. Expected verification belongs in `im-ac.md`.
- Linear metadata such as assignee, project, priority, labels, cycle, or branch names.
- Personal absolute paths, usernames, home directories, skill installation paths, temporary paths, or paths outside the target repo root.
- Internal research notes, command output, or narration that the skill read evodocs.
- Speculative abstractions, alternate architectures, or "nice to have" improvements not requested.
- A second source of truth or fallback path for a value that should have one canonical owner.
- Step text that only says "update relevant files", "add tests", or "use existing patterns" without naming the concrete area or pattern.

## Readiness Review

Before finalising `im-solution.md`, run this semantic review internally. The solution is ready only if all twelve dimensions pass.

1. **Required shape**: Contains `## Solution`, then exactly `### Overview`, `### Details`, and `### Steps` in that order. `Steps` is a numbered list.
2. **Progressive detail**: Overview is brief, Details is deeper, and Steps is the most concrete; the sections do not merely repeat each other.
3. **Grounded in evidence**: Uses relevant `.evodocs` context and direct code inspection when the repository is available. Names actual modules, repo-root-relative paths, components, helpers, stores, API wrappers, constants, schemas, jobs, or config surfaces where reasonably discoverable.
4. **Actionable entry point**: Tells the coding agent where to start reading and what implementation path to follow.
5. **Source-of-truth discipline**: Reuses existing canonical configs, contracts, helpers, stores, services, schemas, or data flows when they exist. Does not introduce duplicate config, shadow workflows, or fallback paths that hide invalid states.
6. **Requirement and AC alignment**: Solves the behaviour requested in `im-req-engineered.md` and is sufficient to satisfy `im-ac.md` without adding unrelated scope.
7. **Path-safe**: Contains no personal absolute paths, usernames, home directories, skill installation paths, temporary paths, or paths outside the target repo root. All project paths are repo-root-relative.
8. **Preservation constraints**: Calls out important existing UX, performance, data, permission, contract, lifecycle, integration, or compatibility behaviours that must remain unchanged.
9. **No test leakage**: Leaves test cases, verification commands, and QA procedure to acceptance criteria rather than repeating them in Solution.
10. **No code leakage**: Contains no code snippets, pseudo-code blocks, copied implementation code, or diffs.
11. **Implementation usefulness**: A coding agent can start implementation from the artifact and named code areas without first doing broad rediscovery of ownership, source of truth, or change order.
12. **Step quality**: Numbered steps are concrete actions with meaningful sequencing and expected edit areas, not generic commands such as "update backend" or "fix UI".

If one or more dimensions fail, revise the solution before writing `im-solution.md` unless the user explicitly asks for a rough draft. When revising, prefer improving the weakest missing evidence, entry point, or step sequence rather than expanding every section.

After writing `im-solution.md`, run cap11 targeting `im-solution.md`. If cap11 returns `revise`, rewrite the solution from cap5 using the gate findings and run the same targeted cap11 review again before cap6 starts.

## Path Hygiene

Generated solution content must use only target-repo-root-relative paths. Convert any inspected absolute path to its relative form before writing it into `im-solution.md`.

Before finalising, scan for forbidden patterns and remove or convert them:

- `/home/`
- `/Users/`
- `~`
- local usernames
- `.skillhost`
- `.codex`
- skill installation paths
- temporary paths
- paths outside the target repo root

If relevant evidence lives outside the repo root, mention the concept or dependency without the local path.

## Common Bad Outputs

- An Overview that says only "implement this feature" or "make the change".
- A Details section that repeats the Overview instead of adding code-entry and preservation guidance.
- Steps that are too vague, such as "update the frontend", "wire the backend", or "add tests".
- A solution that says "create a config file" without checking for an existing source of truth.
- A solution that includes test steps, test commands, QA procedure, code snippets, or pseudo-code.
- A broad architecture essay that does not tell the coding agent where to start.
- A list of files without explaining the change path and constraints.
- Forbidden local paths instead of repo-root-relative paths.
