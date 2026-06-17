# Capability 2: Initialise T2P Ticket Context

Use this reference when initialising or refreshing the target issue's `.t2p` ticket context in the issue worktree, using the target project's own `t2p` skill.

For Linear-derived content, read or refresh requirements only through the approved project skill path, keep ticket artifacts self-contained, preserve repo-relative path hygiene, and do not invent source content when the issue cannot be read.

## Workflow

1. Run the shared input checks from `SKILL.md`.
2. Ensure cap1 has prepared the issue worktree. If the issue worktree is missing, run cap1 first.
3. Enter the resolved `issue-worktree` path from `ssot-config.json`.
4. Require the target project to provide a local t2p skill at `.agents/skills/t2p/SKILL.md`. If it is missing, stop with an error:
   ```text
   Missing project t2p skill: .agents/skills/t2p/SKILL.md
   ```
5. Check whether `ticket-worktree-t2p path` exists in the issue worktree.
6. If the directory does not exist, call the project t2p initialisation capability:
   ```text
   t2p-new <ISSUE-ID>
   ```
7. If the directory already exists, call the project t2p requirement refresh capability:
   ```text
   t2p-req <ISSUE-ID>
   ```
8. After the t2p action finishes, require `ticket-worktree-t2p path/req.md` to exist and be non-empty. If it is missing or empty, stop and report cap2 failure.
9. Report the ticket directory path, `req.md` path, and which action was used.

## Expected Output

- canonical project key
- issue id
- issue worktree path
- t2p skill path
- t2p action used: `t2p-new` or `t2p-req`
- ticket artifact directory: `ticket-worktree-t2p path`
- requirement file: `ticket-worktree-t2p path/req.md`

## Rules

- Do not run t2p from the IntentMill repository root.
- Do not run t2p from `base-worktree`.
- Do not create `ticket-worktree-t2p path` manually when the t2p skill is available; use `t2p-new`.
- Do not refresh requirements manually when the t2p skill is available; use `t2p-req`.
- Do not modify Linear directly in cap2 unless the project t2p skill explicitly owns that operation and asks for it through its own workflow.
