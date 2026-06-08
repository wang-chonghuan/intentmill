import fs from 'node:fs/promises'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  getCodexRunStatus,
  parseIssueEstimationMarkdown,
  readIssuePlanningArtifactPatch,
  startGenerateIssuePlanRun,
} from './server/codex-runs/service'
import { resolvePublicProject } from './server/config'
import { normalizeSprint } from './server/issues/service'
import { buildIssueWorkflowCommands, buildWorkflowCommands } from './server/workflows/commands'

const testRunIds: string[] = []
const testWorkspaceDirs: string[] = []

afterEach(async () => {
  await Promise.all(
    testRunIds.splice(0).map((runId) =>
      fs.rm(path.join(process.cwd(), 'tmp', 'codex-runs', runId), {
        force: true,
        recursive: true,
      }),
    ),
  )
  await Promise.all(
    testWorkspaceDirs.splice(0).map((dir) =>
      fs.rm(dir, {
        force: true,
        recursive: true,
      }),
    ),
  )
})

describe('IntentMill workflow boundaries', () => {
  it('normalizes cycle inputs to the display sprint name', () => {
    expect(normalizeSprint('18')).toBe('Cycle-18')
    expect(normalizeSprint('cycle 18')).toBe('Cycle-18')
    expect(normalizeSprint('Cycle-18')).toBe('Cycle-18')
  })

  it('generates Codex commands with explicit write boundaries', () => {
    const summary = buildWorkflowCommands('Cycle-18').find((command) => command.id === 'summary')
    const solution = buildIssueWorkflowCommands('ENG-506').find((command) => command.id === 'solution')

    expect(summary?.command).toBe('npm run intentmill -- ai summary --sprint Cycle-18')
    expect(summary?.writes).toEqual(['issues.im_summary only'])
    expect(summary?.neverWrites).toContain('Linear')
    expect(solution?.command).toContain('npm run intentmill -- ai solution --issue ENG-506')
    expect(solution?.neverWrites).toContain('source code')
  })

  it('reads final gate decisions from bounded Codex last-message files', async () => {
    const runId = 'test-final-gate-ready'
    testRunIds.push(runId)
    const runDir = path.join(process.cwd(), 'tmp', 'codex-runs', runId)
    const metadataPath = path.join(runDir, 'run.json')
    const lastMessagePath = path.join(runDir, 'last-message.md')
    const stderrPath = path.join(runDir, 'stderr.log')
    await fs.mkdir(runDir, { recursive: true })
    await fs.writeFile(lastMessagePath, 'Final im-gate.md decision: all / ready\n')
    await fs.writeFile(stderrPath, 'debug transcript\n')
    await fs.writeFile(
      metadataPath,
      `${JSON.stringify(
        {
          runId,
          action: 'generate-issue-plan',
          project: 'nsdk',
          issueId: 'ENG-536',
          command: 'codex',
          args: [],
          cwd: process.cwd(),
          pid: null,
          status: 'succeeded',
          startedAt: '2026-06-07T19:20:53.090Z',
          finishedAt: '2026-06-07T19:28:44.360Z',
          paths: {
            runDir,
            promptPath: path.join(runDir, 'prompt.md'),
            stdoutPath: path.join(runDir, 'stdout.log'),
            stderrPath,
            metadataPath,
            outputLastMessagePath: lastMessagePath,
          },
        },
        null,
        2,
      )}\n`,
    )

    const status = await getCodexRunStatus({ runId })

    expect(status.finalGateDecision).toBe('ready')
    expect(status.status).toBe('succeeded')
    expect(status.pid).toBeNull()
  })

  it('finalizes stale active Codex runs as timed out', async () => {
    const runId = 'test-stale-active-run'
    testRunIds.push(runId)
    const runDir = path.join(process.cwd(), 'tmp', 'codex-runs', runId)
    const metadataPath = path.join(runDir, 'run.json')
    const startedAt = new Date(Date.now() - 25 * 60 * 1000).toISOString()
    await fs.mkdir(runDir, { recursive: true })
    await fs.writeFile(
      metadataPath,
      `${JSON.stringify(
        {
          runId,
          action: 'generate-issue-plan',
          project: 'nsdk',
          issueId: 'ENG-537',
          command: 'codex',
          args: [],
          cwd: process.cwd(),
          pid: null,
          status: 'running',
          startedAt,
          timeoutAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          paths: {
            runDir,
            promptPath: path.join(runDir, 'prompt.md'),
            stdoutPath: path.join(runDir, 'stdout.log'),
            stderrPath: path.join(runDir, 'stderr.log'),
            metadataPath,
            outputLastMessagePath: path.join(runDir, 'last-message.md'),
          },
        },
        null,
        2,
      )}\n`,
    )

    const status = await getCodexRunStatus({ runId })
    const persisted = JSON.parse(await fs.readFile(metadataPath, 'utf8')) as {
      status: string
      error?: string
    }

    expect(status.status).toBe('timed-out')
    expect(persisted.status).toBe('timed-out')
    expect(persisted.error).toContain('20 minute timeout')
  })

  it('fails orphaned active Codex runs when ready artifacts cannot be persisted', async () => {
    const runId = 'test-orphaned-active-run'
    testRunIds.push(runId)
    const runDir = path.join(process.cwd(), 'tmp', 'codex-runs', runId)
    const metadataPath = path.join(runDir, 'run.json')
    const lastMessagePath = path.join(runDir, 'last-message.md')
    const stderrPath = path.join(runDir, 'stderr.log')
    await fs.mkdir(runDir, { recursive: true })
    await fs.writeFile(lastMessagePath, 'Final im-gate.md decision: all / ready\n')
    await fs.writeFile(stderrPath, 'debug transcript\n')
    await fs.writeFile(
      metadataPath,
      `${JSON.stringify(
        {
          runId,
          action: 'generate-issue-plan',
          project: 'nsdk',
          issueId: 'ENG-538',
          command: 'codex',
          args: [],
          cwd: process.cwd(),
          pid: 99999999,
          status: 'running',
          startedAt: new Date(Date.now() - 60_000).toISOString(),
          timeoutAt: new Date(Date.now() + 60_000).toISOString(),
          paths: {
            runDir,
            promptPath: path.join(runDir, 'prompt.md'),
            stdoutPath: path.join(runDir, 'stdout.log'),
            stderrPath,
            metadataPath,
            outputLastMessagePath: lastMessagePath,
          },
        },
        null,
        2,
      )}\n`,
    )

    const status = await getCodexRunStatus({ runId })
    const persisted = JSON.parse(await fs.readFile(metadataPath, 'utf8')) as {
      status: string
      exitCode?: number | null
      stderrDeleted?: boolean
    }

    expect(status.status).toBe('failed')
    expect(status.finalGateDecision).toBe('ready')
    expect(persisted.status).toBe('failed')
    expect(persisted.exitCode).toBe(0)
    expect(persisted.stderrDeleted).toBeUndefined()
    await expect(fs.readFile(stderrPath, 'utf8')).resolves.toContain(
      'failed to persist successful planning artifacts',
    )
  })

  it('maps ready planning artifacts to issue im fields', async () => {
    const issueId = 'ENG-999998'
    const worktree = path.join(process.cwd(), '.workspace', `nsdk--${issueId}`)
    testWorkspaceDirs.push(worktree)
    const refsDir = path.join(worktree, '.t2p', 'tickets', issueId, 'refs')
    await fs.mkdir(refsDir, { recursive: true })
    await fs.writeFile(
      path.join(refsDir, 'im-gate.md'),
      '# IntentMill Gate Review\n\n## Decision\n\nready\n',
    )
    await fs.writeFile(path.join(refsDir, 'im-req-summarized.md'), 'summary md\n')
    await fs.writeFile(path.join(refsDir, 'im-solution.md'), 'solution md\n')
    await fs.writeFile(path.join(refsDir, 'im-ac.md'), 'criteria md\n')
    await fs.writeFile(
      path.join(refsDir, 'im-estimation.md'),
      [
        '## Estimation',
        '',
        'Development mode: agent-led',
        'Hours: 12.5',
        'Rationale: Cross-surface work with focused agent implementation.',
        '',
      ].join('\n'),
    )

    const patch = await readIssuePlanningArtifactPatch({
      project: 'nsdk',
      issueId,
    })

    expect(patch).toEqual({
      im_summary: 'summary md\n',
      im_solution: 'solution md\n',
      im_criteria: 'criteria md\n',
      im_estimation: {
        development_mode: 'agent-led',
        hours: 12.5,
        rationale: 'Cross-surface work with focused agent implementation.',
      },
    })
  })

  it('rejects invalid estimation markdown before database writes', () => {
    expect(() =>
      parseIssueEstimationMarkdown([
        'Development mode: robot',
        'Hours: many',
        'Rationale: ',
      ].join('\n')),
    ).toThrow(/Invalid estimation development mode/)
  })

  it.runIf(resolvePublicProject('nsdk'))(
    'starts Codex runs quickly and records failed artifact persistence asynchronously',
    async () => {
      const binDir = path.join(process.cwd(), 'tmp', 'test-bin')
      const fakeCodexPath = path.join(binDir, 'codex')
      await fs.mkdir(binDir, { recursive: true })
      await fs.writeFile(
        fakeCodexPath,
        [
          '#!/bin/sh',
          'last=""',
          'while [ "$#" -gt 0 ]; do',
          '  if [ "$1" = "--output-last-message" ]; then',
          '    shift',
          '    last="$1"',
          '  fi',
          '  shift',
          'done',
          'cat >/dev/null',
          'echo fake stdout',
          'echo fake stderr >&2',
          'if [ -n "$last" ]; then',
          '  echo "Final im-gate.md decision: all / ready" > "$last"',
          'fi',
          'exit 0',
          '',
        ].join('\n'),
      )
      await fs.chmod(fakeCodexPath, 0o755)

      const previousPath = process.env.PATH
      process.env.PATH = `${binDir}:${previousPath || ''}`
      try {
        const startedAt = Date.now()
        const run = await startGenerateIssuePlanRun({
          action: 'generate-issue-plan',
          project: 'nsdk',
          issueId: 'ENG-999999',
        })
        testRunIds.push(run.runId)

        expect(Date.now() - startedAt).toBeLessThan(1000)
        expect(run.status).toBe('running')
        expect(run.pid).toEqual(expect.any(Number))

        const finished = await waitForRunStatus(run.runId, 'failed')

        expect(finished.finalGateDecision).toBe('ready')
        expect(finished.error).toContain('Failed to persist successful planning artifacts')
        expect(await fs.readFile(finished.stdoutPath, 'utf8')).toContain(
          'fake stdout',
        )
        const persisted = JSON.parse(
          await fs.readFile(finished.metadataPath, 'utf8'),
        ) as { stderrDeleted?: boolean; status?: string }
        expect(persisted.status).toBe('failed')
        expect(persisted.stderrDeleted).toBeUndefined()
        expect(await fs.readFile(finished.stderrPath, 'utf8')).toContain(
          'failed to persist successful planning artifacts',
        )
      } finally {
        process.env.PATH = previousPath
        await fs.rm(binDir, { force: true, recursive: true })
      }
    },
  )
})

async function waitForRunStatus(runId: string, expectedStatus: string) {
  const deadline = Date.now() + 5000
  let latest = await getCodexRunStatus({ runId })
  while (Date.now() < deadline) {
    latest = await getCodexRunStatus({ runId })
    if (latest.status === expectedStatus) {
      return latest
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`Timed out waiting for ${runId} to become ${expectedStatus}. Last status: ${latest.status}`)
}
