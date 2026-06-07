# Capability 1: Initialise Issue Worktree

Use this reference when creating or reusing the per-issue worktree where later IntentMill operations and Codex exec runs should operate.

## Workflow

1. Run the shared input checks from `SKILL.md`.
2. Resolve the project config from `ssot-config.json`.
3. Ensure `.workspace/` and `.workspace/<project-key>` exist. If the base clone is missing, run:
   ```bash
   npm run init-workspace
   ```
4. If `npm run init-workspace` reports that the project workspace is dirty, stop and report the dirty status. Do not create or update a worktree from a dirty base clone.
5. Enter `.workspace/<project-key>`.
6. Use the project's configured `default_branch` as the base branch. If it is missing, use `staging` only for NSDK; otherwise stop and ask for an explicit default branch.
7. Update the base clone before preparing the issue worktree:
   ```bash
   git fetch origin
   git switch <default_branch>
   git pull --ff-only origin <default_branch>
   ```
   If the base clone is dirty, stop before these commands and report the dirty status.
8. Load and follow `n-git`, specifically its worktree workflow.
9. Use the normalized `issue-id` as the branch name.
10. If the local branch already exists, do not create a new branch. Fetch and pull the branch if it has a remote tracking branch, then attach or reuse the existing worktree.
11. The issue worktree directory must be the sibling path `.workspace/<project-key>--<ISSUE-ID>` from the IntentMill repository root, for example `.workspace/nsdk--ENG-527`.
12. If the branch does not exist, create that sibling worktree from `origin/<default_branch>` through the `n-git` worktree workflow.
13. Enter the issue worktree and inspect dirty state before continuing:
   - If dirty changes are limited to `.t2p/tickets/<ISSUE-ID>/` planning artifacts, cap7 may refresh and overwrite those artifacts.
   - If there are source changes, another ticket's files, or untracked files outside the current issue ticket directory, stop and report the dirty status.
14. In the issue worktree, rebase onto the latest remote default branch:
   ```bash
   git fetch origin
   git rebase origin/<default_branch>
   ```
   If rebase conflicts, stop and report them. Do not auto-resolve.
15. All later issue-specific operations, including Codex exec generation, must run with `--cd` set to this issue worktree directory, not the IntentMill repo and not the base `.workspace/<project-key>` clone.

## Expected Output

- canonical project key
- matched project alias if one was used
- repo URL
- default branch
- issue branch
- issue worktree path
- whether the worktree was created, reused, or blocked by a dirty workspace

## Rules

- Do not publish personal absolute paths in generated ticket content.
- Local operation reports may include the local worktree path for the user's machine.
- Do not commit or push unless the user explicitly asks.
- Do not modify source code during cap1; cap1 only prepares the worktree.
- Do not run Codex exec during cap1.
