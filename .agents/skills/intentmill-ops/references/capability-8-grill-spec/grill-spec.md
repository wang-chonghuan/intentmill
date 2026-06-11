# Capability 8: Grill Requirement Into IntentMill Spec

Use this reference after cap3 and before acceptance criteria or solution generation. Cap8 is an interactive human-decision gate. Its job is to use `n-grill` to resolve product and architecture decisions that an implementation agent must not invent, then write the post-grill execution spec.

Cap8 writes exactly:

```text
.t2p/tickets/<ISSUE-ID>/refs/im-spec.md
```

## Objective

Create `im-spec.md`, the grilled requirement contract for downstream artifacts. It should contain only:

- the grill questions and human answers that materially define the requirement;
- a thoroughly improved engineered requirement that incorporates those answers and the relevant code context.

`im-req-engineered.md` remains the pre-grill engineering analysis. `im-spec.md` is the post-grill contract. Cap4 and cap5 must use `im-spec.md` rather than asking the coding agent to infer decisions from raw notes or pre-grill requirements.

## Required Skill Dependency

Cap8 must use `n-grill`.

If `n-grill` is not available in the agent host, stop and report that cap8 cannot continue. Do not emulate the grill as a normal planning pass, and do not generate `im-spec.md` without the human question loop.

Cap8 is the IntentMill wrapper around `n-grill`: use `n-grill` for the interrogation mode and human-decision loop, but the final IntentMill output is `refs/im-spec.md` with the shape below. If the host's `n-grill` implementation also creates a generic `grill.md`, treat it as scratch/source material for `im-spec.md`, not as the downstream planning artifact.

Use `n-grill`'s operating mode:

```text
Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time.

If a question can be answered by exploring the codebase, explore the codebase instead.
```

## Evidence Workflow

Before asking the first grill question:

1. Work from the issue worktree prepared by cap1, normally `.workspace/<project-key>--<ISSUE-ID>`.
2. Ensure cap2 has initialised or refreshed `.t2p/tickets/<ISSUE-ID>/`.
3. Require `.t2p/tickets/<ISSUE-ID>/refs/im-req-engineered.md`. If missing, run cap3 first.
4. Read `.t2p/tickets/<ISSUE-ID>/refs/im-req-engineered.md`.
5. Read `.t2p/tickets/<ISSUE-ID>/refs/im-req-summarized.md` when present.
6. Read raw sources such as `.t2p/tickets/<ISSUE-ID>/req.md` and `.t2p/tickets/<ISSUE-ID>/notion-*.md` when they exist.
7. If `.evodocs/index.json` exists at the issue worktree repo root, read it first and use it as the module map. Select only module docs relevant to the requested product area, workflow, surface, backend service, integration, data flow, or risk area.
8. Read selected `.evodocs/mod--*.md` files when they help identify ownership, regression boundaries, data contracts, state machines, external integrations, or prompts.
9. Inspect targeted repo-root-relative code paths when a question can be answered or sharpened by code inspection. Do not ask the user for facts that are discoverable from the repository.

## Grill Scope

Ask one question at a time. Each question must include:

- the decision question;
- the recommended answer;
- why that answer is recommended.

Prioritize only material decisions that can affect AC, solution, implementation, tests, migration, or rollout. Cover these areas when relevant:

- product scope and non-goals;
- user-visible behaviour and UX states;
- data model, database, migrations, and canonical state;
- external APIs, integrations, webhooks, jobs, queues, or schedulers;
- state machines, lifecycle transitions, retries, idempotency, and error behaviour;
- permissions, privacy, security, tenancy, and auditability;
- agent prompts, generated artifacts, or automation behaviour;
- rollout, compatibility, observability, and regression boundaries.

Do not ask decorative questions. If an answer would not change the spec, AC, solution, or implementation boundary, skip it.

## Stop Conditions

Continue until there are no material unresolved product, architecture, implementation-boundary, or acceptance questions left.

If the user explicitly stops before material questions are resolved, do not mark cap8 complete. Report the blocking unanswered questions and do not write `im-spec.md` as a ready downstream contract.

## Output Shape

Write `im-spec.md` with exactly this top-level structure:

```markdown
# IntentMill Spec: <ISSUE-ID>

## Grilled Decisions

### Q1. <question>

<human answer>

### Q2. <question>

<human answer>

## Engineered Requirement

<the fully revised engineered requirement after incorporating grilled decisions and code context>
```

The `Grilled Decisions` section should preserve the question and the human answer. Do not include the recommended answer unless the human explicitly adopted it as the answer.

The `Engineered Requirement` section should keep the useful shape of cap3's engineered requirement, but rewrite it after the grill. It should be clear enough for cap4 to generate acceptance criteria and for cap5 to generate a solution without inventing missing human decisions.

## Engineered Requirement Content

The revised engineered requirement should include the same practical content expected from cap3:

- source inputs;
- product requirement;
- engineering context;
- in-scope and out-of-scope boundaries;
- behavioural requirements;
- existing contracts and regression boundaries;
- open questions and risks.

This content may use headings from cap3's `im-req-engineered.md`, but the only required top-level headings in `im-spec.md` are `Grilled Decisions` and `Engineered Requirement`.

If any open question remains that can affect implementation, call it out clearly in `Engineered Requirement`. Blocking open questions should prevent cap4 and cap5 from continuing.

## Prohibitions

Do not write:

- `im-ac.md`;
- `im-solution.md`;
- `im-estimation.md`;
- implementation plans;
- code snippets, pseudo-code, diffs, or copied implementation code;
- test commands or QA procedure;
- Linear updates or ticket comments.

Do not invent UI, database, external API, state-machine, prompt, migration, rollout, or permission decisions. Send missing material decisions back through the grill loop.

## Path Hygiene

Generated spec content must not expose local machine details. Before finalising, scan for forbidden patterns and remove or convert them:

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

## Readiness Review

Before finalising `im-spec.md`, run this semantic review internally. The spec is ready only if all dimensions pass.

1. **Grill happened**: The file contains real question-and-answer decisions, not a synthetic summary.
2. **Human decisions are incorporated**: The revised engineered requirement reflects the answers instead of merely appending them.
3. **No unresolved blocking decisions**: UI, DB, external API, state-machine, prompt, migration, rollout, permission, and acceptance-impacting decisions are either answered, explicitly out of scope, or marked blocking.
4. **Code-grounded**: Relevant evodocs and targeted code inspection were used when available.
5. **Requirement contract quality**: Cap4 can generate meaningful AC from the spec without rereading broad source material, and cap5 can generate a solution without inventing decisions.
6. **Artifact separation**: The spec does not include AC numbering, solution steps, estimates, test commands, or implementation code.
7. **Path-safe**: The spec contains no forbidden local paths.

After writing `im-spec.md`, run cap11 targeting `im-spec.md`. If cap11 returns `revise`, repair cap8 using the gate findings before cap4 starts.
