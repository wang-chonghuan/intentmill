# Capability 6: Estimate Work

Use this reference when estimating total development effort for an IntentMill issue. The estimate should be stable across runs by using a fixed scoring model instead of vague intuition.

Cap6 writes exactly:

```text
.t2p/tickets/<ISSUE-ID>/refs/im-estimation.md
```

## Objective

Estimate one total hour value for the recommended development mode. The estimate includes implementation, code reading, agent-driven acceptance-test execution, likely fix iterations from acceptance failures, and the human involvement implied by the selected mode.

The estimate should be driven primarily by:

- `im-solution.md` `### Steps` count and step complexity.
- `im-ac.md` frontend, backend, and manual AC count, because those ACs are expected to generate separate verification work.
- `im-ac.md` test-data setup AC count, because repeatable fixture or seed work adds setup effort.
- `im-ac.md` `No separate test required` AC count, which contributes only small tracking overhead.
- Cross-module, data, permission, integration, lifecycle, and regression risk visible in `im-spec.md`, `im-ac.md`, `im-solution.md`, evodocs, and code.

Do not output a range, a table, a scoring breakdown, multiple modes, or separate human/agent subtotals.

## Development Mode Enum

Choose exactly one:

- `agent`: Agent directly develops the change. Human only reviews after development and before PR creation. Use for clear, bounded issues with direct steps, clear AC, and low risk.
- `agent-led`: Agent leads development, but a human must inspect one or more checkpoints during the process, such as implementation direction, product boundary, risky intermediate result, or final behaviour before completion. Use for medium complexity or moderate ambiguity/risk.
- `human-led`: Human leads the work and uses the agent for iterative development slices. Use when the solution likely needs multiple plan adjustments, product or architecture judgement, high regression risk, cross-system coordination, or significant ambiguity.

## Evidence Workflow

Before estimating:

1. Work from the issue worktree prepared by cap1, normally `.workspace/<project-key>--<ISSUE-ID>`.
2. Ensure cap2 has initialised or refreshed `.t2p/tickets/<ISSUE-ID>/`.
3. Require and read:
   - `.t2p/tickets/<ISSUE-ID>/refs/im-req-engineered.md`
   - `.t2p/tickets/<ISSUE-ID>/refs/im-spec.md`
   - `.t2p/tickets/<ISSUE-ID>/refs/im-ac.md`
   - `.t2p/tickets/<ISSUE-ID>/refs/im-solution.md`
4. Read `.t2p/tickets/<ISSUE-ID>/refs/im-req-summarized.md` when present only as background; `im-spec.md` is the requirement contract.
5. Use `.evodocs/index.json` and relevant `.evodocs/mod--*.md` files when present to understand module boundaries, dependencies, and regression risk.
6. Inspect targeted code only when the existing artifacts do not provide enough evidence to classify step complexity, AC testability, affected modules, or source-of-truth risk. Prefer small targeted reads over broad dumps.

## Scoring Model

Compute an internal `agent_core_hours` first. This represents agent active development plus agent-driven acceptance-test execution before human-mode adjustment.

### Base

- Start with `0.75h` for issue setup, artifact reading, and local orientation.

### Solution Steps

Count numbered items under `im-solution.md` `### Steps`. Classify every step:

- Simple step: `+0.35h`
  - Localised change in one obvious file/component/helper.
  - Clear source of truth.
  - No schema, permission, integration, lifecycle, or broad regression risk.
- Medium step: `+0.75h`
  - Touches a module boundary, API/service boundary, state flow, non-trivial UI flow, shared helper, or existing contract.
  - Requires careful code reading but has a clear implementation path.
- Complex step: `+1.25h`
  - Cross-system or cross-repo-impacting logic, DB/schema/migration, permissions/security, async jobs, external integrations, lifecycle-sensitive behaviour, unclear source of truth, or high regression surface.

If a step is too vague to classify, count it as complex and mention that vagueness in the rationale.

### Acceptance Criteria and Test-Case Work

Count AC items in `im-ac.md` by verification section:

- AC item under `Frontend tests`, `Backend tests`, or `Manual tests`: `+0.30h`
  - This includes deriving the acceptance test case, running or manually verifying it, and likely minor fix iteration from failures.
- AC item under `Test data setup`: `+0.20h`
  - This includes designing or verifying repeatable fixture, seed, reset, cross-day, tenant/user, or item-state preconditions.
- AC item under `No separate test required`: `+0.05h`
  - This is tracking/review overhead only.

If a frontend, backend, manual, or test-data setup AC is unusually broad and implies multiple independent behaviours, add `+0.25h` for that AC and mention broad AC scope in the rationale.

### Context and Risk Adders

Add these only when supported by artifacts, evodocs, or code:

- Extra affected module beyond the first: `+0.40h` each.
- Frontend and backend both change: `+0.75h`.
- DB/schema/migration/data backfill: `+1.00h`.
- External integration or third-party API contract: `+1.00h`.
- Permissions/security/privacy-sensitive behaviour: `+0.75h`.
- Async job, queue, scheduler, webhook, or lifecycle-sensitive workflow: `+0.75h`.
- Medium regression risk around existing user-visible behaviour, API contract, data integrity, or integration: `+0.50h`.
- High regression risk: `+1.00h`.
- Unclear source of truth or likely duplicate-path cleanup risk: `+0.75h`.
- Open product question that may affect implementation but is not blocking: `+0.50h`.
- Missing or weak existing test coverage for the affected area: `+0.50h`.

Do not double-count the same complexity. For example, a DB migration that is already the reason a step is complex can still receive the DB/schema adder, but do not add both medium and high regression risk for the same risk.

## Mode Selection and Human Adjustment

After computing `agent_core_hours`, choose one mode and adjust to total hours.

### `agent`

Choose when:

- Steps are mostly simple/medium and usually no more than 6.
- Frontend, backend, and manual AC count is usually no more than 8.
- Source of truth is clear.
- No unresolved product judgement is required.
- Regression risk is low or bounded.

Total hours:

- `agent_core_hours + 0.25h` for human pre-PR review.
- If `agent_core_hours` is greater than `5h`, use `+0.50h` for human pre-PR review.

### `agent-led`

Choose when:

- Agent can own implementation, but a human should inspect at least one checkpoint.
- Steps include several medium items, one or two complex items, or moderate cross-module/regression risk.
- Product boundary, source-of-truth choice, or integration behaviour benefits from human inspection.

Total hours:

- `agent_core_hours + 0.75h` for one human checkpoint and final review.
- Use `+1.25h` instead when there are two expected checkpoints, broad AC coverage, or high regression sensitivity.

### `human-led`

Choose when:

- Human must lead because the work needs multiple plan adjustments or iterative decomposition for the agent.
- Requirements remain materially ambiguous after cap3.
- Architecture/product judgement is central.
- There are many complex steps, high regression risk, several cross-system dependencies, or normal test-case AC count is above 15.

Total hours:

- `(agent_core_hours * 1.35) + 1.00h` for human planning, coordination, and iterative agent steering.
- Use `(agent_core_hours * 1.50) + 1.50h` when the solution likely needs several human-driven redesign or product-decision loops.

## Rounding

- Round final `Hours` to the nearest `0.25`.
- Minimum `Hours` is `1.0`.
- Output one numeric value only, such as `3`, `4.25`, or `6.5`.
- Do not output ranges, confidence labels, subtotals, or scoring tables.

## Output Shape

`im-estimation.md` must contain exactly:

```markdown
## Estimation

Development mode: <agent | agent-led | human-led>

Hours: <single numeric hour value>

Rationale: <one concise sentence grounded in the estimate drivers>
```

Output rules:

- Write exactly one `Development mode`.
- Write exactly one `Hours` value.
- Write exactly one `Rationale`.
- Separate the three field lines with blank lines so Markdown renderers display them as separate paragraphs.
- Do not add a table, separate blocks, bullet lists, confidence, assumptions, score breakdown, or alternative modes.
- `Rationale` must briefly mention the key measurable drivers: solution step count/complexity, normal test-case AC count, and the dominant risk or human-involvement reason.
- Keep `Rationale` to one sentence unless the issue is unusually complex; even then, use at most two short sentences.

## Quality Checks

Before finalising:

- `Development mode` is exactly one of `agent`, `agent-led`, or `human-led`.
- `Hours` is a single number, not a range.
- The rationale explicitly reflects `### Steps` and AC count.
- The selected mode matches the mode definitions.
- The estimate includes agent-driven acceptance-test execution time.
- The estimate includes human review/checkpoint/steering time appropriate to the selected mode.
- No scoring table or hidden calculation details leaked into the artifact.
- No local absolute paths, usernames, home directories, skill paths, or temporary paths appear.

After writing `im-estimation.md`, run cap11 targeting `im-estimation.md`. If cap11 returns `revise`, rewrite the estimation from cap6 using the gate findings and run the same targeted cap11 review again before downstream work continues.

## Common Bad Outputs

- Multiple development modes or one block per mode.
- Ranges such as `3-5 hours`.
- A table.
- A rationale that says only "medium complexity" without naming steps, AC count, or risk.
- Choosing `agent` when there are unresolved product decisions or high regression risk.
- Choosing `human-led` for a small, direct change just because humans will review the PR.
- Omitting acceptance-test execution time.
- Including the scoring model in `im-estimation.md`.
