# Capability 7: Run Full Planning Flow

Use this reference when running the complete IntentMill planning pipeline for one configured project issue. Cap7 is an orchestrator: it does not invent a separate generation method. It runs cap1 through cap6 in order and relies on each capability's own reference and cap11 semantic gate.

## Objective

Produce a complete, semantically reviewed local planning artifact set for one issue:

- `.t2p/tickets/<ISSUE-ID>/refs/im-req-engineered.md`
- `.t2p/tickets/<ISSUE-ID>/refs/im-req-summarized.md`
- `.t2p/tickets/<ISSUE-ID>/refs/im-ac.md`
- `.t2p/tickets/<ISSUE-ID>/refs/im-solution.md`
- `.t2p/tickets/<ISSUE-ID>/refs/im-estimation.md`
- `.t2p/tickets/<ISSUE-ID>/refs/im-gate.md`

The result should be ready for downstream execution planning. Cap7 must not produce shallow artifacts just to finish the sequence.

## Workflow

1. Run the shared input checks from `SKILL.md`.
2. Run cap1 using `references/capability-1-issue-worktree/issue-worktree.md`.
3. Run cap2 using `references/capability-2-t2p-context/t2p-context.md`.
   - Keep file inspection focused on `.t2p/tickets/<ISSUE-ID>/` unless a later capability explicitly needs broader project context.
4. Run cap3 using `references/capability-3-engineer-requirement/requirement-engineering.md`.
5. Run cap11 in targeted mode for `im-req-engineered.md` and `im-req-summarized.md`.
6. If cap11 returns `revise`, rewrite the failed cap3 artifact using the gate findings and repeat the same targeted cap11 review before continuing.
7. Run cap4 using `references/capability-4-acceptance-criteria/acceptance-criteria.md`.
8. Run cap11 in targeted mode for `im-ac.md`.
9. If cap11 returns `revise`, rewrite `im-ac.md` using the gate findings and repeat the same targeted cap11 review before continuing.
10. Run cap5 using `references/capability-5-solution/solution.md`.
11. Run cap11 in targeted mode for `im-solution.md`.
12. If cap11 returns `revise`, rewrite `im-solution.md` using the gate findings and repeat the same targeted cap11 review before continuing.
13. Run cap6 using `references/capability-6-estimation/estimation.md`.
14. Run cap11 in targeted mode for `im-estimation.md`.
15. If cap11 returns `revise`, rewrite `im-estimation.md` using the gate findings and repeat the same targeted cap11 review before continuing.
16. Run cap11 in `all` mode for the final artifact set.
17. Report the issue worktree path, ticket refs directory, final artifact list, and final cap11 decision.

## Regeneration Rules

- Default behaviour is to refresh the full planning artifact set from current source context. Do not skip cap3, cap4, cap5, or cap6 just because an older artifact exists.
- If the user explicitly asks to reuse existing artifacts, still run cap11 on any reused artifact before using it downstream.
- When a targeted gate fails, use the gate findings as the rewrite instruction. Do not patch only headings, fields, or superficial phrasing when the failure is semantic.
- If the same targeted artifact fails for the same material reason twice in a row, stop cap7 and report the blocking issue instead of looping indefinitely.

## Boundaries

- Do not modify Linear directly.
- Do not run Codex exec for implementation.
- Do not create a PR, commit, or push inside cap7. When cap7 is launched through IntentMill's UI runner, the IntentMill server may commit and push the final `.t2p/tickets/<ISSUE-ID>/` artifacts after the final gate is `ready`.
- Do not write code in the target project except through the project's own t2p initialisation/refresh if that skill owns such writes.
- Do not load external Linear-ticket skills for cap7; all required generation and gate rules live in this skill.
- Do not run meaningless, placeholder, or exploratory probe commands. When evidence is needed, read real files or run concrete project commands with a clear purpose.

## Expected Output

When cap7 completes, report:

- canonical project key
- issue id
- issue worktree path
- ticket refs directory
- artifacts generated or refreshed
- final cap11 decision: `ready` or `revise`
- blocking findings if final decision is `revise`

Keep the user-facing report concise. The detailed review belongs in `refs/im-gate.md`.
