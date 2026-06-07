import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

import { resolvePublicProject } from '../config'
import { updateIssue } from '../issues/service'
import type { IssueEstimation, IssueUpdate } from '../issues/types'

type GenerateIssuePlanInput = {
  action: 'generate-issue-plan'
  project: string
  issueId: string
}

type RunAction = 'generate-issue-plan'

export type CodexRunStatusValue =
  | 'starting'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'failed-to-start'
  | 'timed-out'

type CodexRunMetadata = {
  runId: string
  action: RunAction
  project: string
  issueId: string
  command: string
  args: string[]
  cwd: string
  pid?: number | null
  status: CodexRunStatusValue
  startedAt: string
  finishedAt?: string
  timeoutAt?: string
  exitCode?: number | null
  signal?: string | null
  lateExitCode?: number | null
  lateSignal?: string | null
  stderrDeleted?: boolean
  stderrDeleteError?: string
  artifactDbWrite?: {
    status: 'written'
    at: string
  }
  error?: string
  paths: {
    runDir: string
    promptPath: string
    stdoutPath: string
    stderrPath: string
    metadataPath: string
    outputLastMessagePath: string
  }
}

export type FinalGateDecision = 'ready' | 'revise' | 'unknown'

export type CodexRunState = {
  runId: string
  project: string
  issueId: string
  status: CodexRunStatusValue
  startedAt: string
  finishedAt?: string
  timeoutAt?: string
  stdoutPath: string
  stderrPath: string
  metadataPath: string
  outputLastMessagePath: string
  finalGateDecision: FinalGateDecision
  pid: number | null
  exitCode: number | null
  signal: string | null
  error?: string
}

export type CodexRunStartResult = CodexRunState & {
  runDir: string
  promptPath: string
}

const ISSUE_ID_PATTERN = /^[A-Z]+-\d+$/
const RUN_ID_PATTERN = /^[a-z0-9._-]+$/
const ACTIVE_STATUSES = new Set<CodexRunStatusValue>(['starting', 'running'])
const TERMINAL_STATUSES = new Set<CodexRunStatusValue>([
  'succeeded',
  'failed',
  'failed-to-start',
  'timed-out',
])
const RUN_TIMEOUT_MS = 20 * 60 * 1000
const LOCK_STALE_MS = 60 * 1000
const KILL_GRACE_MS = 1_500
const LAST_MESSAGE_MAX_BYTES = 64 * 1024

const timeoutTimers = new Map<string, NodeJS.Timeout>()

export async function startGenerateIssuePlanRun(
  input: GenerateIssuePlanInput,
): Promise<CodexRunStartResult> {
  if (input.action !== 'generate-issue-plan') {
    throw new Error(`Unsupported Codex action: ${input.action}`)
  }

  const project = resolvePublicProject(input.project)
  if (!project) {
    throw new Error(`Unknown project: ${input.project}`)
  }

  const issueId = normalizeIssueId(input.issueId)
  return withIssueRunStartLock(project.key, issueId, async () => {
    const activeRuns = await findActiveRuns({
      project: project.key,
      issueIds: [issueId],
    })
    for (const activeRun of activeRuns) {
      if (isTimedOut(activeRun)) {
        await finalizeTimedOutRun(activeRun, 'Run exceeded the 20 minute timeout before a new run was started.')
        continue
      }
      throw new Error(
        `Generate Plan is already running for ${project.key} / ${issueId} (${activeRun.runId}).`,
      )
    }

    return spawnGenerateIssuePlanRun({
      action: input.action,
      project: project.key,
      issueId,
    })
  })
}

export async function getCodexRunStatus({
  runId,
}: {
  runId: string
}): Promise<CodexRunState> {
  assertRunId(runId)
  const metadataPath = resolveRunMetadataPath(runId)
  const metadata = await readMetadata(metadataPath)

  if (isActiveStatus(metadata.status) && isTimedOut(metadata)) {
    const timedOut = await finalizeTimedOutRun(
      metadata,
      'Run exceeded the 20 minute timeout.',
    )
    return toRunState(timedOut)
  }

  if (isActiveStatus(metadata.status) && metadata.pid && !processExists(metadata.pid)) {
    const exited = await finalizeExitedRun(metadata)
    return toRunState(exited)
  }

  return toRunState(metadata)
}

export async function listActiveCodexRuns({
  project,
  issueIds,
}: {
  project: string
  issueIds: string[]
}): Promise<CodexRunState[]> {
  const resolvedProject = resolvePublicProject(project)
  if (!resolvedProject) {
    throw new Error(`Unknown project: ${project}`)
  }

  const normalizedIssueIds = issueIds.map(normalizeIssueId)
  const issueSet = new Set(normalizedIssueIds)
  if (!issueSet.size) {
    return []
  }

  const activeRuns = await findActiveRuns({
    project: resolvedProject.key,
    issueIds: normalizedIssueIds,
  })
  const byIssue = new Map<string, CodexRunMetadata[]>()

  for (const run of activeRuns) {
    if (!issueSet.has(run.issueId)) {
      continue
    }
    if (isTimedOut(run)) {
      await finalizeTimedOutRun(run, 'Run exceeded the 20 minute timeout during active run restore.')
      continue
    }
    const runs = byIssue.get(run.issueId) ?? []
    runs.push(run)
    byIssue.set(run.issueId, runs)
  }

  const restored: CodexRunState[] = []
  for (const runs of byIssue.values()) {
    runs.sort(
      (left, right) =>
        Date.parse(right.startedAt) - Date.parse(left.startedAt) ||
        right.runId.localeCompare(left.runId),
    )
    const [latest, ...duplicates] = runs
    if (!latest) {
      continue
    }

    for (const duplicate of duplicates) {
      await finalizeDuplicateActiveRun(duplicate, latest.runId)
    }
    restored.push(await toRunState(latest))
  }

  return restored
}

async function spawnGenerateIssuePlanRun({
  action,
  project,
  issueId,
}: {
  action: RunAction
  project: string
  issueId: string
}): Promise<CodexRunStartResult> {
  const intentmillRoot = process.cwd()
  const runId = buildRunId(project, issueId)
  const timeoutAt = new Date(Date.now() + RUN_TIMEOUT_MS).toISOString()
  const runDir = path.join(runsRoot(), runId)
  const promptPath = path.join(runDir, 'prompt.md')
  const stdoutPath = path.join(runDir, 'stdout.log')
  const stderrPath = path.join(runDir, 'stderr.log')
  const metadataPath = path.join(runDir, 'run.json')
  const outputLastMessagePath = path.join(runDir, 'last-message.md')
  const startedAt = new Date().toISOString()
  const prompt = buildGenerateIssuePlanPrompt({ project, issueId })
  const codexArgs = [
    'exec',
    '--dangerously-bypass-approvals-and-sandbox',
    '--cd',
    intentmillRoot,
    '--output-last-message',
    outputLastMessagePath,
    '-',
  ]
  const metadataBase: Omit<CodexRunMetadata, 'status'> = {
    runId,
    action,
    project,
    issueId,
    command: 'codex',
    args: codexArgs,
    cwd: intentmillRoot,
    startedAt,
    timeoutAt,
    paths: {
      runDir,
      promptPath,
      stdoutPath,
      stderrPath,
      metadataPath,
      outputLastMessagePath,
    },
  }

  await fs.mkdir(runDir, { recursive: true })
  await fs.writeFile(promptPath, prompt)
  await writeMetadata(metadataPath, {
    ...metadataBase,
    pid: null,
    status: 'starting',
  })

  let stdoutHandle: fs.FileHandle | null = null
  let stderrHandle: fs.FileHandle | null = null
  try {
    stdoutHandle = await fs.open(stdoutPath, 'a')
    stderrHandle = await fs.open(stderrPath, 'a')
    const child = spawn(
      'sh',
      ['-c', 'exec codex "$@" < "$CODEX_PROMPT_PATH"', 'codex-runner', ...codexArgs],
      {
        cwd: intentmillRoot,
        detached: true,
        env: {
          ...process.env,
          CODEX_PROMPT_PATH: promptPath,
        },
        stdio: ['ignore', stdoutHandle.fd, stderrHandle.fd],
      },
    )
    const pid = child.pid ?? null
    const runningMetadata: CodexRunMetadata = {
      ...metadataBase,
      pid,
      status: 'running',
    }
    await writeMetadata(metadataPath, runningMetadata)

    registerTimeoutTimer(runId, timeoutAt)

    child.on('error', (error) => {
      clearTimeoutTimer(runId)
      void appendStderr(
        stderrPath,
        `\n[runner] ${error instanceof Error ? error.stack || error.message : String(error)}\n`,
      )
      void writeTerminalMetadata(metadataPath, {
        ...runningMetadata,
        status: 'failed-to-start',
        finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      })
    })

    child.on('close', (code, signal) => {
      clearTimeoutTimer(runId)
      void writeTerminalMetadata(metadataPath, {
        ...runningMetadata,
        status: code === 0 ? 'succeeded' : 'failed',
        exitCode: code,
        signal,
        finishedAt: new Date().toISOString(),
      })
    })

    child.unref()
    await stdoutHandle.close()
    await stderrHandle.close()
    stdoutHandle = null
    stderrHandle = null

    return {
      ...(await toRunState(runningMetadata)),
      runDir,
      promptPath,
    }
  } catch (error) {
    await stdoutHandle?.close().catch(() => undefined)
    await stderrHandle?.close().catch(() => undefined)
    const failedMetadata: CodexRunMetadata = {
      ...metadataBase,
      pid: null,
      status: 'failed-to-start',
      finishedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    }
    await writeMetadata(metadataPath, failedMetadata)
    throw error
  }
}

async function withIssueRunStartLock<T>(
  project: string,
  issueId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const lockDir = path.join(runsRoot(), 'locks', `${project}-${issueId}`)
  await fs.mkdir(path.dirname(lockDir), { recursive: true })
  await acquireLock(lockDir)
  try {
    return await fn()
  } finally {
    await fs.rm(lockDir, { force: true, recursive: true }).catch(() => undefined)
  }
}

async function acquireLock(lockDir: string) {
  try {
    await fs.mkdir(lockDir)
    return
  } catch (error) {
    if (!isNodeError(error) || error.code !== 'EEXIST') {
      throw error
    }
  }

  const stat = await fs.stat(lockDir).catch(() => null)
  if (stat && Date.now() - stat.mtimeMs <= LOCK_STALE_MS) {
    throw new Error('Another Generate Plan start request is already in progress for this issue.')
  }

  await fs.rm(lockDir, { force: true, recursive: true })
  await fs.mkdir(lockDir)
}

async function findActiveRuns({
  project,
  issueIds,
}: {
  project: string
  issueIds: string[]
}) {
  const issueSet = new Set(issueIds)
  const allRuns = await readAllMetadata()
  return allRuns.filter(
    (run) =>
      run.project === project &&
      issueSet.has(run.issueId) &&
      isActiveStatus(run.status),
  )
}

async function readAllMetadata() {
  const root = runsRoot()
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => [])
  const runs: CodexRunMetadata[] = []

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'locks') {
      continue
    }
    const metadataPath = path.join(root, entry.name, 'run.json')
    const metadata = await readMetadata(metadataPath).catch(() => null)
    if (metadata) {
      runs.push(metadata)
    }
  }

  return runs
}

async function finalizeTimedOutRun(metadata: CodexRunMetadata, error: string) {
  await terminateProcess(metadata.pid ?? null)
  const latest = await readMetadata(metadata.paths.metadataPath).catch(
    () => metadata,
  )
  if (!isActiveStatus(latest.status)) {
    return latest
  }

  const timedOut: CodexRunMetadata = {
    ...latest,
    status: 'timed-out',
    finishedAt: new Date().toISOString(),
    error,
  }
  clearTimeoutTimer(timedOut.runId)
  await writeTerminalMetadata(timedOut.paths.metadataPath, timedOut)
  return timedOut
}

async function finalizeDuplicateActiveRun(
  metadata: CodexRunMetadata,
  latestRunId: string,
) {
  await terminateProcess(metadata.pid ?? null)
  await appendStderr(
    metadata.paths.stderrPath,
    `\n[runner] duplicate active run superseded by ${latestRunId}\n`,
  ).catch(() => undefined)
  await writeTerminalMetadata(metadata.paths.metadataPath, {
    ...metadata,
    status: 'failed',
    finishedAt: new Date().toISOString(),
    error: `duplicate active run superseded by ${latestRunId}`,
  })
}

async function finalizeExitedRun(metadata: CodexRunMetadata) {
  const latest = await readMetadata(metadata.paths.metadataPath).catch(
    () => metadata,
  )
  if (!isActiveStatus(latest.status)) {
    return latest
  }

  const lastMessage = await fs.stat(latest.paths.outputLastMessagePath).catch(() => null)
  const succeeded = Boolean(lastMessage && lastMessage.size > 0)
  const finalized: CodexRunMetadata = {
    ...latest,
    status: succeeded ? 'succeeded' : 'failed',
    exitCode: succeeded ? 0 : null,
    signal: null,
    finishedAt: (lastMessage?.mtime ?? new Date()).toISOString(),
    error: succeeded
      ? undefined
      : 'Codex process exited before the runner wrote terminal metadata.',
  }
  clearTimeoutTimer(finalized.runId)
  await writeTerminalMetadata(finalized.paths.metadataPath, finalized)
  return readMetadata(finalized.paths.metadataPath).catch(() => finalized)
}

async function terminateProcess(pid: number | null) {
  if (!pid || !processExists(pid)) {
    return
  }

  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    return
  }

  await delay(KILL_GRACE_MS)
  if (processExists(pid)) {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      // Process may have exited between the existence check and SIGKILL.
    }
  }
}

function processExists(pid: number) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function registerTimeoutTimer(runId: string, timeoutAt: string) {
  clearTimeoutTimer(runId)
  const delayMs = Math.max(0, Date.parse(timeoutAt) - Date.now())
  const timer = setTimeout(() => {
    void getCodexRunStatus({ runId }).catch(() => undefined)
  }, delayMs)
  timer.unref()
  timeoutTimers.set(runId, timer)
}

function clearTimeoutTimer(runId: string) {
  const timer = timeoutTimers.get(runId)
  if (timer) {
    clearTimeout(timer)
    timeoutTimers.delete(runId)
  }
}

function buildRunId(project: string, issueId: string) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:.]/g, '')
    .replace('T', 't')
    .replace('Z', 'z')
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${timestamp}-${project}-${issueId}-${suffix}`.toLowerCase()
}

function buildGenerateIssuePlanPrompt({
  project,
  issueId,
}: {
  project: string
  issueId: string
}) {
  return `
You are running an IntentMill backend-triggered action.

Action: generate-issue-plan
Project: ${project}
Issue ID: ${issueId}

Work from the IntentMill repository root. Load and use the repo-local skill at .agents/skills/intentmill-ops.

Execute intentmill-ops cap7 with:
- project: ${project}
- issue-id: ${issueId}

Required flow:
- cap7 must run cap1, cap2, cap3, cap4, cap5, and cap6 in order.
- Each generated artifact stage must pass the targeted cap11 semantic gate before downstream work continues.
- After cap6 passes targeted cap11, run cap11 in all mode for the full artifact set.
- Focus t2p inspection on .t2p/tickets/${issueId}/ unless a capability explicitly requires broader context.

Boundaries:
- Do not implement target-project source code.
- Do not create a PR.
- Do not commit or push.
- Do not modify Linear.
- Do not write IntentMill database fields.
- Only generate or refresh local planning artifacts in the target issue worktree.
- Do not run meaningless, placeholder, or exploratory probe commands. When you need evidence, read real files or run concrete project commands with a clear purpose.

Final response must report:
- issue worktree path
- refs directory
- generated artifacts
- final im-gate.md decision
- blocking findings, if any
`.trim()
}

async function toRunState(metadata: CodexRunMetadata): Promise<CodexRunState> {
  return {
    runId: metadata.runId,
    project: metadata.project,
    issueId: metadata.issueId,
    status: metadata.status,
    startedAt: metadata.startedAt,
    finishedAt: metadata.finishedAt,
    timeoutAt: metadata.timeoutAt,
    stdoutPath: metadata.paths.stdoutPath,
    stderrPath: metadata.paths.stderrPath,
    metadataPath: metadata.paths.metadataPath,
    outputLastMessagePath: metadata.paths.outputLastMessagePath,
    finalGateDecision: await extractFinalGateDecision(
      metadata.paths.outputLastMessagePath,
    ),
    pid: metadata.pid ?? null,
    exitCode: metadata.exitCode ?? null,
    signal: metadata.signal ?? null,
    error: metadata.error,
  }
}

async function extractFinalGateDecision(
  outputLastMessagePath: string,
): Promise<FinalGateDecision> {
  const stat = await fs.stat(outputLastMessagePath).catch(() => null)
  if (!stat || stat.size > LAST_MESSAGE_MAX_BYTES) {
    return 'unknown'
  }

  const content = await fs
    .readFile(outputLastMessagePath, 'utf8')
    .catch(() => '')
  const normalized = content.toLowerCase()
  const finalGateLine =
    normalized
      .split(/\r?\n/)
      .find((line) => line.includes('final') && line.includes('im-gate')) ??
    normalized

  if (finalGateLine.includes('ready')) {
    return 'ready'
  }
  if (finalGateLine.includes('revise') || finalGateLine.includes('blocking')) {
    return 'revise'
  }
  return 'unknown'
}

async function readMetadata(metadataPath: string): Promise<CodexRunMetadata> {
  const metadata = JSON.parse(
    await fs.readFile(metadataPath, 'utf8'),
  ) as CodexRunMetadata
  if (!metadata.paths.metadataPath) {
    metadata.paths.metadataPath = metadataPath
  }
  return metadata
}

async function writeMetadata(
  metadataPath: string,
  value: CodexRunMetadata,
) {
  await fs.mkdir(path.dirname(metadataPath), { recursive: true })
  const tmpPath = `${metadataPath}.tmp-${process.pid}-${Date.now()}`
  await fs.writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`)
  await fs.rename(tmpPath, metadataPath)
}

async function writeTerminalMetadata(
  metadataPath: string,
  next: CodexRunMetadata,
) {
  const current = await readMetadata(metadataPath).catch(() => null)
  if (current?.status === 'timed-out' && next.status !== 'timed-out') {
    await writeMetadata(metadataPath, {
      ...current,
      lateExitCode: next.exitCode,
      lateSignal: next.signal,
    })
    return
  }
  if (current && TERMINAL_STATUSES.has(current.status)) {
    return
  }
  const metadata = await prepareSuccessfulRunForTerminalWrite(next)
  await writeMetadata(metadataPath, metadata)
}

async function prepareSuccessfulRunForTerminalWrite(
  metadata: CodexRunMetadata,
) {
  if (metadata.status !== 'succeeded') {
    return metadata
  }

  try {
    const patch = await readIssuePlanningArtifactPatch({
      project: metadata.project,
      issueId: metadata.issueId,
    })
    const updated = await updateIssue(metadata.issueId, patch)
    if (!updated) {
      throw new Error(`Issue ${metadata.issueId} was not found in the local database.`)
    }
    return cleanupSuccessfulStderr({
      ...metadata,
      artifactDbWrite: {
        status: 'written',
        at: new Date().toISOString(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await appendStderr(
      metadata.paths.stderrPath,
      `\n[runner] failed to write planning artifacts to database: ${message}\n`,
    ).catch(() => undefined)
    return {
      ...metadata,
      status: 'failed' as const,
      error: `Failed to write planning artifacts to database: ${message}`,
    }
  }
}

export async function readIssuePlanningArtifactPatch({
  project,
  issueId,
}: {
  project: string
  issueId: string
}): Promise<Pick<IssueUpdate, 'im_summary' | 'im_solution' | 'im_criteria' | 'im_estimation'>> {
  const refsDir = path.join(
    process.cwd(),
    '.workspace',
    `${project}--${issueId}`,
    '.t2p',
    'tickets',
    issueId,
    'refs',
  )
  const gateDecision = parseGateDecision(
    await readRequiredArtifact(path.join(refsDir, 'im-gate.md')),
  )
  if (gateDecision !== 'ready') {
    throw new Error(`Final artifact gate is ${gateDecision}; refusing to write planning fields.`)
  }

  const [summary, solution, criteria, estimationMarkdown] = await Promise.all([
    readRequiredArtifact(path.join(refsDir, 'im-req-summarized.md')),
    readRequiredArtifact(path.join(refsDir, 'im-solution.md')),
    readRequiredArtifact(path.join(refsDir, 'im-ac.md')),
    readRequiredArtifact(path.join(refsDir, 'im-estimation.md')),
  ])

  return {
    im_summary: summary,
    im_solution: solution,
    im_criteria: criteria,
    im_estimation: parseIssueEstimationMarkdown(estimationMarkdown),
  }
}

async function readRequiredArtifact(filePath: string) {
  const content = await fs.readFile(filePath, 'utf8').catch((error) => {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`Unable to read ${filePath}: ${reason}`)
  })
  if (!content.trim()) {
    throw new Error(`Artifact is empty: ${filePath}`)
  }
  return content
}

function parseGateDecision(content: string): FinalGateDecision {
  const normalized = content.toLowerCase()
  const lines = normalized.split(/\r?\n/)
  const decisionHeaderIndex = lines.findIndex((line) => line.includes('## decision'))
  const decisionLine =
    decisionHeaderIndex >= 0
      ? (lines
          .slice(decisionHeaderIndex + 1)
          .find((line) => {
            const trimmed = line.trim()
            return trimmed && !trimmed.startsWith('#')
          }) ?? '')
      : (lines.find((line) => line.includes('decision')) ?? normalized)
  if (decisionLine.includes('ready')) {
    return 'ready'
  }
  if (decisionLine.includes('revise') || decisionLine.includes('blocking')) {
    return 'revise'
  }
  return 'unknown'
}

export function parseIssueEstimationMarkdown(content: string): IssueEstimation {
  const developmentMode = readEstimationField(content, 'Development mode')
  if (!['agent', 'agent-led', 'human-led'].includes(developmentMode)) {
    throw new Error(`Invalid estimation development mode: ${developmentMode || '(missing)'}`)
  }

  const rawHours = readEstimationField(content, 'Hours')
  const hours = Number(rawHours)
  if (!Number.isFinite(hours) || hours < 0) {
    throw new Error(`Invalid estimation hours: ${rawHours || '(missing)'}`)
  }

  const rationale = readEstimationField(content, 'Rationale')
  if (!rationale) {
    throw new Error('Invalid estimation rationale: missing')
  }

  return {
    development_mode: developmentMode as IssueEstimation['development_mode'],
    hours,
    rationale,
  }
}

function readEstimationField(content: string, label: string) {
  const pattern = new RegExp(`^${escapeRegExp(label)}\\s*:\\s*(.+?)\\s*$`, 'im')
  return content.match(pattern)?.[1]?.trim() ?? ''
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function appendStderr(pathname: string, value: string) {
  await fs.appendFile(pathname, value)
}

async function cleanupSuccessfulStderr(metadata: CodexRunMetadata) {
  if (metadata.status !== 'succeeded') {
    return metadata
  }

  try {
    await fs.rm(metadata.paths.stderrPath, { force: true })
    return {
      ...metadata,
      stderrDeleted: true,
      stderrDeleteError: undefined,
    }
  } catch (error) {
    return {
      ...metadata,
      stderrDeleted: false,
      stderrDeleteError: error instanceof Error ? error.message : String(error),
    }
  }
}

function normalizeIssueId(issueId: string) {
  const normalized = issueId.trim().toUpperCase()
  if (!ISSUE_ID_PATTERN.test(normalized)) {
    throw new Error(`Invalid issue id: ${issueId}`)
  }
  return normalized
}

function assertRunId(runId: string) {
  if (!RUN_ID_PATTERN.test(runId)) {
    throw new Error(`Invalid run id: ${runId}`)
  }
}

function resolveRunMetadataPath(runId: string) {
  const metadataPath = path.resolve(runsRoot(), runId, 'run.json')
  const root = path.resolve(runsRoot())
  if (!metadataPath.startsWith(`${root}${path.sep}`)) {
    throw new Error('Invalid run metadata path.')
  }
  return metadataPath
}

function runsRoot() {
  return path.join(process.cwd(), 'tmp', 'codex-runs')
}

function isTimedOut(metadata: CodexRunMetadata) {
  const timeoutAt =
    metadata.timeoutAt ??
    new Date(Date.parse(metadata.startedAt) + RUN_TIMEOUT_MS).toISOString()
  return Date.now() >= Date.parse(timeoutAt)
}

function isActiveStatus(status: CodexRunStatusValue) {
  return ACTIVE_STATUSES.has(status)
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return Boolean(error && typeof error === 'object' && 'code' in error)
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
