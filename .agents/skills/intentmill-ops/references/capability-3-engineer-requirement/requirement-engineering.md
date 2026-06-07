# Capability 3: Engineer IntentMill Requirement

Use this reference when turning raw ticket context into the local artifacts that later acceptance-criteria and solution generation will consume. The real reader is a future coding agent and review agent working inside the issue worktree.

## Objective

Create a code-grounded requirement interpretation before drafting acceptance criteria or a solution. This artifact should translate raw planning inputs into product behaviour, engineering boundaries, existing contracts, and open risks without choosing an implementation.

Cap3 writes exactly these files under `.t2p/tickets/<ISSUE-ID>/refs/`:

- `im-req-engineered.md`
- `im-req-summarized.md`

Do not write `im-ac.md`, `im-solution.md`, `im-estimation.md`, implementation plans, test commands, or ticket updates in this capability.

## Evidence Workflow

Before writing the artifacts:

1. Work from the issue worktree prepared by cap1, normally `.workspace/<project-key>--<ISSUE-ID>`.
2. Ensure cap2 has initialised or refreshed `.t2p/tickets/<ISSUE-ID>/`.
3. Read `.t2p/tickets/<ISSUE-ID>/req.md` when present.
4. Read all `.t2p/tickets/<ISSUE-ID>/notion-*.md` files when present.
5. Read other obvious local requirement sources in the ticket directory only when their names indicate source requirements, product notes, Linear snapshots, comments, or attachments. Do not treat generated refs as source input unless the user explicitly asks for a rewrite from previous generated artifacts.
6. If `.evodocs/index.json` exists at the issue worktree repo root, read it first and use it as the module map. Select only the module docs relevant to the requested product area, workflow, surface, backend service, integration, data flow, or risk area.
7. Read the selected `.evodocs/mod--*.md` files. Include parent or child module docs only when they explain important cross-module flows, shared constraints, or ownership boundaries.
8. Inspect relevant code paths directly when the repository is available. Prefer targeted searches and small file reads over broad dumps. Search for affected UI text, routes, components, API endpoints, config keys, constants, schema fields, background jobs, permissions, existing tests, or integration names mentioned by the raw requirement.
9. Identify existing behaviours, contracts, data flows, permission rules, lifecycle rules, and integration boundaries that may constrain the change.
10. Keep the user's requested outcome central. Evodocs and code evidence sharpen the requirement; they do not replace it with a generic architecture summary.

If `.evodocs` is missing or code evidence cannot be found with reasonable effort, continue from available sources and record the limitation in `Open Questions and Risks`.

## `im-req-engineered.md` Shape

Use this structure:

```markdown
# IntentMill Requirement: <ISSUE-ID>

## Source Inputs

- <repo-relative source path or evidence summary>

## Product Requirement

<Product-facing requirement in user/workflow language. Explain the desired outcome, affected user or system workflow, and why the change matters.>

## Engineering Context

<Grounding from evodocs and code inspection: affected modules, existing flows, canonical sources of truth, data boundaries, integrations, lifecycle constraints, and relevant repo-root-relative paths when they help.>

## Scope

### In Scope

- <required behaviour or boundary>

### Out of Scope

- <explicit non-goal or adjacent work to avoid>

## Behavioural Requirements

- <observable behaviour the product or system must provide>

## Existing Contracts and Regression Boundaries

- <specific existing behaviour, API contract, data integrity rule, permission rule, lifecycle behaviour, or integration that must remain unchanged>

## Open Questions and Risks

- <question, uncertainty, missing evidence, or risk; use "None identified" only when accurate>
```

Requirements:

- Write at the requirement level, not the implementation-step level.
- Name actual product surfaces, modules, contracts, and source-of-truth files when evidence supports them.
- Use repo-root-relative paths only when paths are useful.
- Preserve uncertainty instead of inventing missing product decisions.
- Do not include acceptance criteria numbering, test matrices, test commands, code snippets, or a solution sequence.

## `im-req-summarized.md` Shape

Use this structure:

```markdown
# IntentMill Summary: <ISSUE-ID>

## Summary

<Two to four sentences capturing the requested outcome, affected workflow, and primary engineering boundary.>

## Key Context

- <most important product or code fact>
- <most important source-of-truth or regression boundary>
- <most important open risk, or "No major open risk identified">

## Next Artifacts

- Acceptance criteria should be generated from `refs/im-req-engineered.md`.
- Solution should be generated only after acceptance criteria are ready.
- Estimation should be generated only after solution is ready.
- Each generated artifact should pass targeted cap11 review before the next artifact is generated.
```

Requirements:

- Keep the summary short enough for a later agent to read first.
- Do not introduce requirements that are absent from `im-req-engineered.md`.
- Do not include implementation instructions except the artifact sequencing note above.

## Path Hygiene

Generated artifacts must not expose local machine details. Before finalising, scan for forbidden patterns and remove or convert them:

- `/home/`
- `/Users/`
- `~`
- local usernames
- `.skillhost`
- `.codex`
- skill installation paths
- temporary paths
- paths outside the target repo root

Published project paths must be relative to the issue worktree repo root.

## Quality Bar

The artifacts are ready only when:

- Raw requirement sources were read or their absence was recorded.
- Relevant evodocs were used when available.
- Targeted code inspection was performed when the repository is available.
- The product requirement is clear without becoming a code walkthrough.
- Engineering context names concrete modules, flows, contracts, or paths when evidence supports them.
- Scope and non-goals prevent obvious overreach.
- Regression boundaries name specific behaviours or contracts instead of generic "do not break existing behaviour" wording.
- Open risks preserve uncertainty instead of pretending certainty.
- The summary is consistent with the detailed requirement.

After writing both artifacts, run cap11 targeting `im-req-engineered.md` and `im-req-summarized.md`. If cap11 returns `revise`, rewrite the failed artifact from cap3 using the gate findings and run the same targeted cap11 review again before cap4 starts.
