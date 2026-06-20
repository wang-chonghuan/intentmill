# Execute n-im Plan

## Goal
/goal Implement `.tmp/plan--functor.md` by creating the new Narrative skill `n-im` at `/Users/yong/.skillhost/user_repos/narrative-skills/n-im/` from the current working-tree version of `/Users/yong/work/intentmill/.agents/skills/imops/`,
verified by the created `n-im` skill tree, updated `SKILL.md` and references, successful dependency/terminology scans showing no unintended `t2p`, Linear, `ssot-config.json`, `.workspace`, `work-id`, `.im/tasks`, or Git-root-as-artifact-base leakage, and a final n-telos-style review result of Pass, while preserving capability numbers, cap/gate semantics, artifact names, evidence-first planning behavior, cap6 development/test discipline, and the hard rule that `n-im` artifacts live under the future Codex cwd's `.intentmill/tickets/{ticket_id}/`.
Before executing, read the applicable AGENTS.md file(s) and follow their instructions.
Use `.tmp/plan--functor.md` as the implementation source of truth, the current `imops` skill directory as the source material, the target Narrative Skills directory, existing n-skill conventions, and `.evodocs` when present for baseline understanding while treating current source files as authoritative.
Between iterations, complete the next highest-risk plan section first, report the files changed and the exact scan/review evidence collected, then continue with the next unresolved dependency, path, capability, or gate issue.
If blocked or no viable path remains, stop with the completed files, scans already run, unresolved blocker, and the specific user decision or filesystem/source change needed to continue.

## Final State
`/Users/yong/.skillhost/user_repos/narrative-skills/n-im/` exists as a production-ready copied/refactored skill based on `imops`, with `SKILL.md`, capability references, gates, and shared references updated to match `.tmp/plan--functor.md`.

The new skill is ticket-based, does not depend on Linear or t2p, does not use `ssot-config.json` or `.workspace`, and resolves all `n-im` artifacts from the future Codex cwd under `.intentmill/tickets/{ticket_id}/`.

## Verification Evidence
- File tree for `/Users/yong/.skillhost/user_repos/narrative-skills/n-im/`.
- Targeted scans for forbidden old dependencies and terminology, including `t2p`, `Linear`, `linear`, `ssot-config`, `.workspace`, `issue-id`, `work-id`, `work item`, `.im/tasks`, `ticket-worktree-t2p`, `issue-worktree`, and Git-root-as-`.intentmill` wording.
- Confirmation that cap1/cap2 were renamed and rewritten around local ticket context and requirement capture.
- Confirmation that cap3/cap3p/cap4/cap5/cap6/cap7 and gates preserve the original semantic quality bar while using the new shared path roles.
- Final n-telos-style review result of Pass for the generated `n-im` skill.

## Constraints
- Do not modify the original `/Users/yong/work/intentmill/.agents/skills/imops/` except to read it as source material.
- Do not introduce README, changelog, installation guide, placeholder docs, or speculative scripts.
- Do not bind `ticket-id` to Linear; it is only a local ticket identifier.
- Do not invoke or depend on project t2p.
- Preserve capability numbers as the user-facing API.
- Preserve the hard cwd rule: `.intentmill/` is relative to the future Codex cwd, not Git root unless they are the same directory.

## Scope
Allowed inputs and locations:

- `/Users/yong/work/intentmill/.tmp/plan--functor.md`
- `/Users/yong/work/intentmill/.agents/skills/imops/`
- `/Users/yong/.skillhost/user_repos/narrative-skills/n-im/`
- Existing adjacent Narrative skills for convention checks, especially `n-toaskill`-style structure and existing `agents/openai.yaml` patterns when needed.

Do not create tickets in Linear, run t2p, create PRs, or alter unrelated Narrative skills.

## Iteration Strategy
Start by copying the source skill into the target path, then rewrite `SKILL.md`, cap1, and cap2 before applying path/terminology changes to cap3-cap7 and gates. After each stage, run focused scans for old dependencies and fix the highest-risk remaining hit before moving on.

Finish by running the full dependency/terminology scan and a final n-telos-style review against the generated `n-im` skill.

## Blocker Stop Condition
Stop if the source `imops` skill is missing, the target Narrative Skills directory is not writable, the plan conflicts with an existing `n-im` skill that cannot be safely overwritten, or the generated skill cannot satisfy the cwd-based `.intentmill/tickets/{ticket_id}` contract without weakening cap/gate quality. Report the completed files, evidence collected, blocker, and the exact user decision or filesystem/source change needed to continue.
