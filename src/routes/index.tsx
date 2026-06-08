import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Blocks,
  Code2,
  MoreHorizontal,
  Play,
  RefreshCw,
  SearchCheck,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Markdown, { type Components } from 'react-markdown'

import {
  getPublicConfigStatus,
  getPublicCycles,
  getPublicProjects,
  resolvePublicCycle,
  resolvePublicProject,
  type PublicProjectConfig,
} from '../server/config'
import {
  getCodexRunStatus,
  listActiveCodexRuns,
  startGenerateIssuePlanRun,
  type CodexRunState,
  type CodexRunStatusValue,
} from '../server/codex-runs/service'
import {
  clearIssuesByProjectAndSprint,
  listIssues,
} from '../server/issues/service'
import type { Issue } from '../server/issues/types'
import {
  syncLinearSprint,
  type SprintSyncResult,
} from '../server/linear/sprint-sync'

type IssueTableRow = Pick<
  Issue,
  | 'issue_id'
  | 'project'
  | 'parent_issue_id'
  | 'title'
  | 'assignee'
  | 'sprint'
  | 'status'
  | 'version'
  | 'im_summary'
  | 'im_solution'
  | 'im_criteria'
  | 'im_estimation'
>

type IssuesPageRequest = {
  cycle: string
  project: string
}

type ClearIssuesResult = {
  project: string
  sprint: string
  deletedCount: number
  issueIds: string[]
}

type RowRunState = Partial<
  Pick<
    CodexRunState,
    | 'runId'
    | 'timeoutAt'
    | 'stdoutPath'
    | 'stderrPath'
    | 'metadataPath'
    | 'outputLastMessagePath'
    | 'finalGateDecision'
    | 'pid'
    | 'exitCode'
    | 'signal'
    | 'error'
    | 'finishedAt'
  >
> & {
  issueId: string
  project: string
  status: CodexRunStatusValue
  startedAt: string
}

type RowRunsByIssueId = Record<string, RowRunState>

type MarkdownDialogContent = {
  title: string
  content: string
}

const DEFAULT_PROJECT = 'nsdk'

const readPageInput = (data: unknown): IssuesPageRequest => {
  const cycleCandidate =
    data && typeof data === 'object' && 'cycle' in data
      ? (data as { cycle?: unknown }).cycle
      : undefined
  const projectCandidate =
    data && typeof data === 'object' && 'project' in data
      ? (data as { project?: unknown }).project
      : undefined
  const cycle =
    typeof cycleCandidate === 'string' && cycleCandidate.trim()
      ? cycleCandidate
      : undefined
  const project =
    typeof projectCandidate === 'string' && projectCandidate.trim()
      ? projectCandidate
      : DEFAULT_PROJECT
  return { cycle: resolvePublicCycle(cycle), project }
}

const getIssuesPage = createServerFn({ method: 'GET' })
  .validator(readPageInput)
  .handler(async ({ data }) => {
    const projects = getPublicProjects()
    const cycles = getPublicCycles().map((cycle) => cycle.name)
    const selectedProject =
      resolvePublicProject(data.project) ?? projects[0] ?? null
    const config = getPublicConfigStatus()
    if (!config.ok) {
      return {
        ok: false as const,
        config,
        project: selectedProject?.key ?? data.project,
        projects,
        cycle: data.cycle,
        cycles,
        rows: [] as IssueTableRow[],
        error: config.error || 'Database configuration is missing.',
      }
    }

    try {
      const issueProject = selectedProject?.label ?? data.project
      const issues = await listIssues({
        project: issueProject,
        sprint: data.cycle,
        limit: 1000,
      })
      return {
        ok: true as const,
        config,
        project: selectedProject?.key ?? data.project,
        projects,
        cycle: data.cycle,
        cycles,
        rows: issues.map(toTableRow),
        error: null,
      }
    } catch (error) {
      return {
        ok: false as const,
        config,
        project: selectedProject?.key ?? data.project,
        projects,
        cycle: data.cycle,
        cycles,
        rows: [] as IssueTableRow[],
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

const pullIssuesForCycle = createServerFn({ method: 'POST' })
  .validator(readPageInput)
  .handler(async ({ data }) => {
    const selectedProject = resolvePublicProject(data.project)
    if (!selectedProject) {
      throw new Error(`Unknown project: ${data.project}`)
    }

    const sync = await syncLinearSprint({
      cycle: data.cycle,
      project: selectedProject.label,
    })
    const issues = await listIssues({
      project: sync.project,
      sprint: sync.cycle,
      limit: 1000,
    })
    return {
      project: selectedProject.key,
      projects: getPublicProjects(),
      cycle: sync.cycle,
      cycles: getPublicCycles().map((cycle) => cycle.name),
      rows: issues.map(toTableRow),
      sync,
    }
  })

const clearIssuesForCycle = createServerFn({ method: 'POST' })
  .validator(readPageInput)
  .handler(async ({ data }) => {
    const selectedProject = resolvePublicProject(data.project)
    if (!selectedProject) {
      throw new Error(`Unknown project: ${data.project}`)
    }

    const cleared = await clearIssuesByProjectAndSprint(
      selectedProject.label,
      data.cycle,
    )
    return {
      project: selectedProject.key,
      projects: getPublicProjects(),
      cycle: cleared.sprint,
      cycles: getPublicCycles().map((cycle) => cycle.name),
      rows: [] as IssueTableRow[],
      cleared,
    }
  })

type GenerateIssuePlanRequest = {
  action: 'generate-issue-plan'
  project: string
  issueId: string
}

const readGenerateIssuePlanInput = (
  data: unknown,
): GenerateIssuePlanRequest => {
  if (!data || typeof data !== 'object') {
    throw new Error('Generate Plan input is required.')
  }

  const input = data as {
    action?: unknown
    project?: unknown
    issueId?: unknown
  }
  if (input.action !== 'generate-issue-plan') {
    throw new Error('Unsupported action.')
  }
  if (typeof input.project !== 'string' || !input.project.trim()) {
    throw new Error('Project is required.')
  }
  if (typeof input.issueId !== 'string' || !input.issueId.trim()) {
    throw new Error('Issue id is required.')
  }

  return {
    action: 'generate-issue-plan',
    project: input.project,
    issueId: input.issueId.trim().toUpperCase(),
  }
}

const generateIssuePlanForIssue = createServerFn({ method: 'POST' })
  .validator(readGenerateIssuePlanInput)
  .handler(async ({ data }) => startGenerateIssuePlanRun(data))

const readRunStatusInput = (data: unknown): { runId: string } => {
  if (!data || typeof data !== 'object') {
    throw new Error('Run id is required.')
  }
  const runId = (data as { runId?: unknown }).runId
  if (typeof runId !== 'string' || !runId.trim()) {
    throw new Error('Run id is required.')
  }
  return { runId: runId.trim() }
}

const getCodexRunStatusForRun = createServerFn({ method: 'GET' })
  .validator(readRunStatusInput)
  .handler(async ({ data }) => getCodexRunStatus(data))

const readActiveRunsInput = (
  data: unknown,
): { project: string; issueIds: string[] } => {
  if (!data || typeof data !== 'object') {
    throw new Error('Active run input is required.')
  }
  const input = data as { project?: unknown; issueIds?: unknown }
  if (typeof input.project !== 'string' || !input.project.trim()) {
    throw new Error('Project is required.')
  }
  if (!Array.isArray(input.issueIds)) {
    throw new Error('Issue ids are required.')
  }
  return {
    project: input.project,
    issueIds: input.issueIds.filter(
      (issueId): issueId is string => typeof issueId === 'string',
    ),
  }
}

const listActiveCodexRunsForRows = createServerFn({ method: 'GET' })
  .validator(readActiveRunsInput)
  .handler(async ({ data }) => listActiveCodexRuns(data))

export const Route = createFileRoute('/')({
  loader: () =>
    getIssuesPage({ data: { project: DEFAULT_PROJECT } }),
  component: IssuesPage,
})

function IssuesPage() {
  const data = Route.useLoaderData()
  const [selectedProject, setSelectedProject] = useState(data.project)
  const selectedProjectRef = useRef(selectedProject)
  const [projects, setProjects] = useState(data.projects)
  const [selectedCycle, setSelectedCycle] = useState(data.cycle)
  const selectedCycleRef = useRef(selectedCycle)
  const [rows, setRows] = useState(data.rows)
  const [cycles, setCycles] = useState(data.cycles)
  const [isLoadingCycle, setIsLoadingCycle] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [pageError, setPageError] = useState<string | null>(
    data.ok ? null : data.error,
  )
  const [lastSync, setLastSync] = useState<SprintSyncResult | null>(null)
  const [lastClear, setLastClear] = useState<ClearIssuesResult | null>(null)
  const [rowRuns, setRowRuns] = useState<RowRunsByIssueId>({})
  const rowRunsRef = useRef(rowRuns)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [lastFinishedRun, setLastFinishedRun] =
    useState<RowRunState | null>(null)
  const [openActionIssueId, setOpenActionIssueId] = useState<string | null>(
    null,
  )
  const projectOptions = useMemo(
    () => buildProjectOptions(projects, selectedProject),
    [projects, selectedProject],
  )
  const cycleOptions = useMemo(
    () => buildCycleOptions(cycles, selectedCycle),
    [cycles, selectedCycle],
  )
  const selectedProjectLabel =
    projectOptions.find((project) => project.key === selectedProject)?.label ??
    selectedProject
  const rowIssueIdsKey = useMemo(
    () => rows.map((row) => row.issue_id).join('|'),
    [rows],
  )

  useEffect(() => {
    rowRunsRef.current = rowRuns
  }, [rowRuns])

  useEffect(() => {
    selectedProjectRef.current = selectedProject
  }, [selectedProject])

  useEffect(() => {
    selectedCycleRef.current = selectedCycle
  }, [selectedCycle])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now())
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false
    const issueIds = rows.map((row) => row.issue_id)

    if (!issueIds.length) {
      rowRunsRef.current = {}
      setRowRuns({})
      return () => {
        cancelled = true
      }
    }

    async function restoreActiveRuns() {
      try {
        const activeRuns = await listActiveCodexRunsForRows({
          data: { project: selectedProject, issueIds },
        })
        if (cancelled) {
          return
        }
        const visibleIssues = new Set(issueIds)
        setRowRuns((current) => {
          const next: RowRunsByIssueId = {}
          for (const run of Object.values(current)) {
            if (
              visibleIssues.has(run.issueId) &&
              run.project === selectedProject &&
              isActiveRun(run.status)
            ) {
              next[run.issueId] = run
            }
          }
          for (const run of activeRuns) {
            next[run.issueId] = toRowRunState(run)
          }
          return next
        })
      } catch (error) {
        if (!cancelled) {
          setPageError(error instanceof Error ? error.message : String(error))
        }
      }
    }

    void restoreActiveRuns()
    return () => {
      cancelled = true
    }
  }, [rowIssueIdsKey, rows, selectedProject, selectedCycle])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const activeRuns = Object.values(rowRunsRef.current).filter(
        (run) => isActiveRun(run.status) && Boolean(run.runId),
      )
      if (!activeRuns.length) {
        return
      }

      void pollRunStatuses(activeRuns)
    }, 3000)

    return () => window.clearInterval(timer)
  }, [])

  async function pollRunStatuses(activeRuns: RowRunState[]) {
    const results = await Promise.allSettled(
      activeRuns.map((run) =>
        getCodexRunStatusForRun({ data: { runId: run.runId || '' } }),
      ),
    )
    let latestFinished: RowRunState | null = null
    let shouldRefreshRows = false
    const failedReads: string[] = []

    setRowRuns((current) => {
      const next = { ...current }
      results.forEach((result, index) => {
        const previous = activeRuns[index]
        if (!previous) {
          return
        }
        if (result.status === 'rejected') {
          failedReads.push(previous.issueId)
          delete next[previous.issueId]
          return
        }

        const run = toRowRunState(result.value)
        if (isActiveRun(run.status)) {
          next[run.issueId] = run
          return
        }

        delete next[run.issueId]
        latestFinished = run
        if (run.status === 'succeeded') {
          shouldRefreshRows = true
        }
      })
      return next
    })

    if (latestFinished) {
      setLastFinishedRun(latestFinished)
    }
    if (shouldRefreshRows) {
      try {
        const nextData = await getIssuesPage({
          data: {
            cycle: selectedCycleRef.current,
            project: selectedProjectRef.current,
          },
        })
        setRows(nextData.rows)
        setCycles(nextData.cycles)
        setProjects(nextData.projects)
        setPageError(nextData.ok ? null : nextData.error)
      } catch (error) {
        setPageError(error instanceof Error ? error.message : String(error))
      }
    }
    if (failedReads.length) {
      setPageError(
        `Could not read Codex run status for ${failedReads.join(', ')}. The row was reset.`,
      )
    }
  }

  async function handleProjectChange(nextProject: string) {
    setSelectedProject(nextProject)
    setOpenActionIssueId(null)
    rowRunsRef.current = {}
    setRowRuns({})
    setIsLoadingCycle(true)
    setPageError(null)
    setLastSync(null)
    setLastClear(null)
    setLastFinishedRun(null)
    try {
      const nextData = await getIssuesPage({
        data: { cycle: selectedCycle, project: nextProject },
      })
      setSelectedProject(nextData.project)
      setProjects(nextData.projects)
      setRows(nextData.rows)
      setCycles(nextData.cycles)
      setPageError(nextData.ok ? null : nextData.error)
    } catch (error) {
      setRows([])
      setPageError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoadingCycle(false)
    }
  }

  async function handleCycleChange(nextCycle: string) {
    setSelectedCycle(nextCycle)
    setOpenActionIssueId(null)
    rowRunsRef.current = {}
    setRowRuns({})
    setIsLoadingCycle(true)
    setPageError(null)
    setLastSync(null)
    setLastClear(null)
    setLastFinishedRun(null)
    try {
      const nextData = await getIssuesPage({
        data: { cycle: nextCycle, project: selectedProject },
      })
      setSelectedProject(nextData.project)
      setProjects(nextData.projects)
      setRows(nextData.rows)
      setCycles(nextData.cycles)
      setPageError(nextData.ok ? null : nextData.error)
    } catch (error) {
      setRows([])
      setPageError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoadingCycle(false)
    }
  }

  async function handlePull() {
    setIsPulling(true)
    setOpenActionIssueId(null)
    setPageError(null)
    setLastSync(null)
    setLastClear(null)
    setLastFinishedRun(null)
    try {
      const nextData = await pullIssuesForCycle({
        data: { cycle: selectedCycle, project: selectedProject },
      })
      setSelectedProject(nextData.project)
      setProjects(nextData.projects)
      setSelectedCycle(nextData.cycle)
      setRows(nextData.rows)
      setCycles(nextData.cycles)
      setLastSync(nextData.sync)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsPulling(false)
    }
  }

  async function handleClear() {
    const confirmed = window.confirm(
      `Clear local issues for ${selectedProjectLabel} / ${selectedCycle}?`,
    )
    if (!confirmed) {
      return
    }

    setIsClearing(true)
    setOpenActionIssueId(null)
    setPageError(null)
    setLastSync(null)
    setLastClear(null)
    setLastFinishedRun(null)
    try {
      const nextData = await clearIssuesForCycle({
        data: { cycle: selectedCycle, project: selectedProject },
      })
      setSelectedProject(nextData.project)
      setProjects(nextData.projects)
      setSelectedCycle(nextData.cycle)
      setRows(nextData.rows)
      setCycles(nextData.cycles)
      setLastClear(nextData.cleared)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsClearing(false)
    }
  }

  async function handleGeneratePlan(issueId: string) {
    if (isActiveRun(rowRunsRef.current[issueId]?.status)) {
      return
    }

    setOpenActionIssueId(null)
    const startingRun: RowRunState = {
      issueId,
      project: selectedProject,
      status: 'starting',
      startedAt: new Date().toISOString(),
    }
    rowRunsRef.current = {
      ...rowRunsRef.current,
      [issueId]: startingRun,
    }
    setRowRuns(rowRunsRef.current)
    setPageError(null)
    setLastSync(null)
    setLastClear(null)
    setLastFinishedRun(null)
    try {
      const run = await generateIssuePlanForIssue({
        data: {
          action: 'generate-issue-plan',
          project: selectedProject,
          issueId,
        },
      })
      const runningRun = toRowRunState(run)
      rowRunsRef.current = {
        ...rowRunsRef.current,
        [run.issueId]: runningRun,
      }
      setRowRuns(rowRunsRef.current)
    } catch (error) {
      const next = { ...rowRunsRef.current }
      delete next[issueId]
      rowRunsRef.current = next
      setRowRuns(next)
      setPageError(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-950">
      <section className="mx-auto max-w-[1800px]">
        <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
                <Blocks className="size-6" aria-hidden="true" />
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-slate-950 via-sky-800 to-emerald-700 bg-clip-text text-3xl font-black text-transparent">
                  IntentMill
                </h1>
              </div>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Turn requirements into solutions, acceptance criteria, and
              automated development.
            </p>
          </div>
          <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700 md:flex-row md:items-start">
            <label className="flex items-center gap-2">
              <span className="font-medium text-slate-800">Project</span>
              <select
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                disabled={
                  isLoadingCycle ||
                  isPulling ||
                  isClearing ||
                  projectOptions.length <= 1
                }
                onChange={(event) =>
                  void handleProjectChange(event.target.value)
                }
                value={selectedProject}
              >
                {projectOptions.map((project) => (
                  <option key={project.key} value={project.key}>
                    {project.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="font-medium text-slate-800">Cycle</span>
              <select
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                disabled={isLoadingCycle || isPulling || isClearing}
                onChange={(event) => void handleCycleChange(event.target.value)}
                value={selectedCycle}
              >
                {cycleOptions.map((cycle) => (
                  <option key={cycle} value={cycle}>
                    {cycle}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex w-full flex-col gap-2 md:w-64">
              <div className="flex gap-2">
                <button
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-sky-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={
                    !data.config.ok || isLoadingCycle || isPulling || isClearing
                  }
                  onClick={() => void handlePull()}
                  type="button"
                >
                  <RefreshCw
                    className={isPulling ? 'size-4 animate-spin' : 'size-4'}
                    aria-hidden="true"
                  />
                  {isPulling ? 'Pulling' : 'Pull'}
                </button>
                <button
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-red-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={
                    !data.config.ok || isLoadingCycle || isPulling || isClearing
                  }
                  onClick={() => void handleClear()}
                  type="button"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  {isClearing ? 'Clearing' : 'Clear'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {pageError ? <InlineNotice tone="error" message={pageError} /> : null}
        {lastSync ? <SyncNotice sync={lastSync} /> : null}
        {lastClear ? <ClearNotice clear={lastClear} /> : null}
        {lastFinishedRun ? (
          <CodexRunNotice now={nowTick} run={lastFinishedRun} />
        ) : null}
        {data.config.ok && (rows.length > 0 || !pageError) ? (
          <IssuesTable
            onGeneratePlan={(issueId) => void handleGeneratePlan(issueId)}
            now={nowTick}
            onOpenActionIssueIdChange={setOpenActionIssueId}
            openActionIssueId={openActionIssueId}
            rows={rows}
            rowRuns={rowRuns}
          />
        ) : (
          <EmptyState error={pageError || data.error} />
        )}
      </section>
    </main>
  )
}

function IssuesTable({
  now,
  onGeneratePlan,
  onOpenActionIssueIdChange,
  openActionIssueId,
  rows,
  rowRuns,
}: {
  now: number
  onGeneratePlan: (issueId: string) => void
  onOpenActionIssueIdChange: (issueId: string | null) => void
  openActionIssueId: string | null
  rows: IssueTableRow[]
  rowRuns: RowRunsByIssueId
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'issue_id', desc: false },
  ])
  const [markdownDialog, setMarkdownDialog] =
    useState<MarkdownDialogContent | null>(null)
  const columns = useMemo<ColumnDef<IssueTableRow>[]>(
    () =>
      buildIssueColumns({
        now,
        onOpenMarkdown: setMarkdownDialog,
        onGeneratePlan,
        onOpenActionIssueIdChange,
        openActionIssueId,
        rowRuns,
      }),
    [
      now,
      setMarkdownDialog,
      onGeneratePlan,
      onOpenActionIssueIdChange,
      openActionIssueId,
      rowRuns,
    ],
  )
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableMultiSort: true,
    enableSortingRemoval: true,
    isMultiSortEvent: () => true,
    maxMultiSortColCount: Number.MAX_SAFE_INTEGER,
  })
  const sortingSummary = sorting.length
    ? sorting
        .map((sort, index) => {
          const label = issueColumnLabels[sort.id] ?? sort.id
          return `${index + 1}. ${label} ${sort.desc ? 'desc' : 'asc'}`
        })
        .join('  ')
    : 'None'

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
        <span className="font-medium text-slate-700">Multi-column sorting</span>
        <span className="truncate">Current: {sortingSummary}</span>
      </div>
      <div className="max-h-[calc(100vh-230px)] overflow-auto">
        <table className="w-full min-w-[1980px] border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-slate-100 text-left text-xs uppercase text-slate-600 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sortDirection = header.column.getIsSorted()
                  const sortOrder = sorting.findIndex(
                    (sort) => sort.id === header.column.id,
                  )
                  const ariaSort =
                    sortDirection === 'asc'
                      ? 'ascending'
                      : sortDirection === 'desc'
                        ? 'descending'
                        : 'none'
                  const canSort = header.column.getCanSort()

                  return (
                    <th
                      aria-sort={ariaSort}
                      className="border-b border-slate-200 bg-slate-100 px-4 py-3 font-semibold"
                      key={header.id}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          className="inline-flex w-full items-center justify-between gap-3 text-left select-none"
                          onClick={header.column.getToggleSortingHandler()}
                          title={getSortTitle(
                            header.column.getNextSortingOrder(),
                          )}
                          type="button"
                        >
                          <span>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </span>
                          {header.column.getCanSort() ? (
                            <SortIndicator
                              direction={sortDirection}
                              sortOrder={sortOrder}
                            />
                          ) : null}
                        </button>
                      ) : (
                        <span>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </span>
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                className="border-b border-slate-100 hover:bg-slate-50"
                key={row.id}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    className="max-w-[360px] align-top px-4 py-3 text-slate-700"
                    key={cell.id}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MarkdownDialog
        content={markdownDialog}
        onClose={() => setMarkdownDialog(null)}
      />
    </div>
  )
}

function SortIndicator({
  direction,
  sortOrder,
}: {
  direction: false | 'asc' | 'desc'
  sortOrder: number
}) {
  if (direction === 'asc') {
    return (
      <span className="inline-flex h-6 min-w-16 items-center justify-center gap-1 rounded border border-sky-200 bg-sky-50 px-2 text-[11px] font-semibold text-sky-800">
        <ArrowUp className="size-3" aria-hidden="true" />
        Asc {sortOrder + 1}
      </span>
    )
  }

  if (direction === 'desc') {
    return (
      <span className="inline-flex h-6 min-w-16 items-center justify-center gap-1 rounded border border-sky-200 bg-sky-50 px-2 text-[11px] font-semibold text-sky-800">
        <ArrowDown className="size-3" aria-hidden="true" />
        Desc {sortOrder + 1}
      </span>
    )
  }

  return (
    <span className="inline-flex h-6 min-w-14 items-center justify-center gap-1 rounded border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-500">
      <ArrowDownUp className="size-3" aria-hidden="true" />
      None
    </span>
  )
}

function getSortTitle(nextOrder: false | 'asc' | 'desc') {
  if (nextOrder === 'asc') {
    return 'Sort ascending'
  }
  if (nextOrder === 'desc') {
    return 'Sort descending'
  }
  return 'Clear sorting'
}

function InlineNotice({
  message,
  tone,
}: {
  message: string
  tone: 'error' | 'info'
}) {
  const classes =
    tone === 'error'
      ? 'mb-4 border-amber-200 bg-amber-50 text-amber-900'
      : 'mb-4 border-sky-200 bg-sky-50 text-sky-900'
  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${classes}`}>
      {message}
    </div>
  )
}

function SyncNotice({ sync }: { sync: SprintSyncResult }) {
  return (
    <InlineNotice
      tone="info"
      message={`Pulled ${sync.stats.final_count} Linear issues for ${sync.cycle}. Updated ${sync.stats.upserted_count} records, detached ${sync.stats.detached_from_cycle_count} stale records, sync run ${sync.stats.sync_run_id}.`}
    />
  )
}

function ClearNotice({ clear }: { clear: ClearIssuesResult }) {
  return (
    <InlineNotice
      tone="info"
      message={`Cleared ${clear.deletedCount} local issues for ${clear.project} / ${clear.sprint}.`}
    />
  )
}

function CodexRunNotice({
  now,
  run,
}: {
  now: number
  run: RowRunState
}) {
  const elapsed = formatRunDuration(run, now)
  if (run.status === 'succeeded') {
    const result =
      run.finalGateDecision === 'ready'
        ? 'ready'
        : run.finalGateDecision === 'revise'
          ? 'finished with revise'
          : 'finished'
    return (
      <InlineNotice
        tone="info"
        message={`Generate Plan ${result} for ${run.project} / ${run.issueId} in ${elapsed}.`}
      />
    )
  }

  const logs = run.stderrPath ? ` Logs: ${run.stderrPath}.` : ''
  const status =
    run.status === 'timed-out'
      ? 'timed out'
      : run.status === 'failed-to-start'
        ? 'failed to start'
        : 'failed'
  return (
    <InlineNotice
      tone="error"
      message={`Generate Plan ${status} for ${run.project} / ${run.issueId} after ${elapsed}.${logs}`}
    />
  )
}

function buildCycleOptions(localCycles: string[], selectedCycle: string) {
  const cycles = new Set<string>([selectedCycle, ...localCycles])
  for (let cycle = 1; cycle <= 60; cycle += 1) {
    cycles.add(`Cycle-${cycle}`)
  }
  return [...cycles].sort((left, right) => {
    const leftNumber = Number(left.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER)
    const rightNumber = Number(
      right.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER,
    )
    return leftNumber - rightNumber || left.localeCompare(right)
  })
}

function buildProjectOptions(
  projects: PublicProjectConfig[],
  selectedProject: string,
) {
  if (!projects.length) {
    return [
      {
        key: selectedProject,
        label: selectedProject,
        aliases: [],
        repo: null,
        defaultBranch: null,
      },
    ]
  }

  if (projects.some((project) => project.key === selectedProject)) {
    return projects
  }

  return [
    ...projects,
    {
      key: selectedProject,
      label: selectedProject,
      aliases: [],
      repo: null,
      defaultBranch: null,
    },
  ]
}

function toRowRunState(run: CodexRunState): RowRunState {
  return {
    runId: run.runId,
    project: run.project,
    issueId: run.issueId,
    status: run.status,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    timeoutAt: run.timeoutAt,
    stdoutPath: run.stdoutPath,
    stderrPath: run.stderrPath,
    metadataPath: run.metadataPath,
    outputLastMessagePath: run.outputLastMessagePath,
    finalGateDecision: run.finalGateDecision,
    pid: run.pid,
    exitCode: run.exitCode,
    signal: run.signal,
    error: run.error,
  }
}

function isActiveRun(status: CodexRunStatusValue | undefined) {
  return status === 'running' || status === 'starting'
}

function formatRunDuration(run: RowRunState, now: number) {
  const end = run.finishedAt ? Date.parse(run.finishedAt) : now
  return formatDuration(Math.max(0, end - Date.parse(run.startedAt)))
}

function formatElapsed(startedAt: string, now: number) {
  return formatDuration(Math.max(0, now - Date.parse(startedAt)))
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.floor(durationMs / 1000)
  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  const minutes = totalMinutes % 60
  const hours = Math.floor(totalMinutes / 60)
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const issueColumnLabels: Record<string, string> = {
  action: 'Actions',
  issue_id: 'Issue ID',
  project: 'Project',
  parent_issue_id: 'Parent Issue ID',
  title: 'Title',
  assignee: 'Assignee',
  sprint: 'Sprint',
  status: 'Status',
  version: 'Version',
  im_summary: 'IM Summary',
  im_solution: 'IM Solution',
  im_criteria: 'IM Criteria',
  im_estimation: 'IM Estimation',
}

function buildIssueColumns({
  now,
  onGeneratePlan,
  onOpenMarkdown,
  onOpenActionIssueIdChange,
  openActionIssueId,
  rowRuns,
}: {
  now: number
  onGeneratePlan: (issueId: string) => void
  onOpenMarkdown: (content: MarkdownDialogContent) => void
  onOpenActionIssueIdChange: (issueId: string | null) => void
  openActionIssueId: string | null
  rowRuns: RowRunsByIssueId
}): ColumnDef<IssueTableRow>[] {
  return [
    {
      id: 'action',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <ActionMenu
          issueId={row.original.issue_id}
          isOpen={openActionIssueId === row.original.issue_id}
          now={now}
          onGeneratePlan={onGeneratePlan}
          onOpenChange={(isOpen) =>
            onOpenActionIssueIdChange(
              isOpen ? row.original.issue_id : null,
            )
          }
          run={rowRuns[row.original.issue_id]}
        />
      ),
    },
    {
      accessorKey: 'issue_id',
      header: 'Issue ID',
      cell: ({ getValue }) => (
        <span className="font-semibold text-sky-700">
          {stringValue(getValue())}
        </span>
      ),
    },
    {
      accessorKey: 'project',
      header: 'Project',
      cell: ({ getValue }) => <NullableCell value={getValue()} />,
    },
    {
      accessorKey: 'parent_issue_id',
      header: 'Parent Issue ID',
      cell: ({ getValue }) => <NullableCell value={getValue()} />,
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ getValue }) => (
        <span className="font-medium text-slate-900">
          {stringValue(getValue())}
        </span>
      ),
    },
    {
      accessorKey: 'assignee',
      header: 'Assignee',
      cell: ({ getValue }) => <NullableCell value={getValue()} />,
    },
    {
      accessorKey: 'sprint',
      header: 'Sprint',
      cell: ({ getValue }) => <NullableCell value={getValue()} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <NullableCell value={getValue()} />,
    },
    {
      accessorKey: 'version',
      header: 'Version',
      cell: ({ getValue }) => <NullableCell value={getValue()} />,
    },
    {
      accessorKey: 'im_summary',
      header: 'IM Summary',
      cell: ({ getValue, row }) => (
        <MarkdownPreviewCell
          title={`${row.original.issue_id} / IM Summary`}
          value={getValue()}
          onOpen={onOpenMarkdown}
        />
      ),
    },
    {
      accessorKey: 'im_solution',
      header: 'IM Solution',
      cell: ({ getValue, row }) => (
        <MarkdownPreviewCell
          title={`${row.original.issue_id} / IM Solution`}
          value={getValue()}
          onOpen={onOpenMarkdown}
        />
      ),
    },
    {
      accessorKey: 'im_criteria',
      header: 'IM Criteria',
      cell: ({ getValue, row }) => (
        <MarkdownPreviewCell
          title={`${row.original.issue_id} / IM Criteria`}
          value={getValue()}
          onOpen={onOpenMarkdown}
        />
      ),
    },
    {
      accessorKey: 'im_estimation',
      header: 'IM Estimation',
      cell: ({ getValue, row }) => (
        <EstimationCell
          title={`${row.original.issue_id} / IM Estimation`}
          value={getValue()}
          onOpen={onOpenMarkdown}
        />
      ),
    },
  ]
}

function ActionMenu({
  issueId,
  isOpen,
  now,
  onGeneratePlan,
  onOpenChange,
  run,
}: {
  issueId: string
  isOpen: boolean
  now: number
  onGeneratePlan: (issueId: string) => void
  onOpenChange: (isOpen: boolean) => void
  run?: RowRunState
}) {
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        onOpenChange(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onOpenChange])

  if (run && isActiveRun(run.status)) {
    const label = run.runId ? `Generating ${formatElapsed(run.startedAt, now)}` : 'Starting...'
    return (
      <button
        className="inline-flex h-9 w-36 cursor-not-allowed items-center justify-center rounded-md border border-slate-300 bg-slate-100 px-3 text-xs font-semibold text-slate-500"
        disabled
        type="button"
      >
        {label}
      </button>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-label={`Actions for ${issueId}`}
        className="inline-flex size-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
        onClick={() => onOpenChange(!isOpen)}
        type="button"
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </button>
      {isOpen ? (
        <div className="absolute left-0 z-30 mt-2 w-44 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
          <button
            className="flex h-9 w-full items-center gap-2 rounded px-2 text-left text-xs font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
            onClick={() => {
              onOpenChange(false)
              onGeneratePlan(issueId)
            }}
            type="button"
          >
            <Play className="size-3.5" aria-hidden="true" />
            Plan
          </button>
          <button
            className="flex h-9 w-full items-center gap-2 rounded px-2 text-left text-xs font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
            disabled
            type="button"
          >
            <Code2 className="size-3.5" aria-hidden="true" />
            Develop
          </button>
          <button
            className="flex h-9 w-full items-center gap-2 rounded px-2 text-left text-xs font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
            disabled
            type="button"
          >
            <SearchCheck className="size-3.5" aria-hidden="true" />
            Review
          </button>
        </div>
      ) : null}
    </div>
  )
}

function toTableRow(issue: Issue): IssueTableRow {
  return {
    issue_id: issue.issue_id,
    project: issue.project,
    parent_issue_id: issue.parent_issue_id,
    title: issue.title,
    assignee: issue.assignee,
    sprint: issue.sprint,
    status: issue.status,
    version: issue.version,
    im_summary: issue.im_summary,
    im_solution: issue.im_solution,
    im_criteria: issue.im_criteria,
    im_estimation: issue.im_estimation,
  }
}

function NullableCell({ value }: { value: unknown }) {
  const text = stringValue(value)
  return text ? <span>{text}</span> : <span className="text-slate-400">-</span>
}

function MarkdownPreviewCell({
  onOpen,
  title,
  value,
}: {
  onOpen: (content: MarkdownDialogContent) => void
  title: string
  value: unknown
}) {
  const text = stringValue(value)
  return text ? (
    <button
      className="block w-full max-w-[340px] rounded-md border border-transparent px-0 py-1 text-left leading-6 text-slate-700 hover:border-sky-200 hover:bg-sky-50 hover:px-2 hover:text-sky-800 focus:border-sky-400 focus:bg-sky-50 focus:px-2 focus:outline-none focus:ring-2 focus:ring-sky-100"
      onClick={() => onOpen({ title, content: text })}
      title="Open markdown"
      type="button"
    >
      <span className="line-clamp-3 whitespace-normal">
        {summarizeMarkdown(text)}
      </span>
    </button>
  ) : (
    <span className="text-slate-400">-</span>
  )
}

function EstimationCell({
  onOpen,
  title,
  value,
}: {
  onOpen: (content: MarkdownDialogContent) => void
  title: string
  value: unknown
}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return <span className="text-slate-400">-</span>
  }

  const estimation = value as {
    development_mode?: unknown
    hours?: unknown
    rationale?: unknown
  }
  const mode = stringValue(estimation.development_mode)
  const hours = stringValue(estimation.hours)
  const rationale = stringValue(estimation.rationale)
  const summary = [mode, hours ? `${hours}h` : ''].filter(Boolean).join(' / ')
  const markdown = buildEstimationMarkdown({ mode, hours, rationale })

  return (
    <button
      className="block w-full max-w-[340px] rounded-md border border-transparent px-0 py-1 text-left leading-6 text-slate-700 hover:border-sky-200 hover:bg-sky-50 hover:px-2 hover:text-sky-800 focus:border-sky-400 focus:bg-sky-50 focus:px-2 focus:outline-none focus:ring-2 focus:ring-sky-100"
      onClick={() => onOpen({ title, content: markdown })}
      title="Open markdown"
      type="button"
    >
      {summary ? (
        <div className="font-medium text-slate-900">{summary}</div>
      ) : null}
      {rationale ? (
        <div className="mt-1 line-clamp-2 text-slate-600">{rationale}</div>
      ) : null}
      {!summary && !rationale ? (
        <span className="text-slate-400">-</span>
      ) : null}
    </button>
  )
}

function buildEstimationMarkdown({
  hours,
  mode,
  rationale,
}: {
  hours: string
  mode: string
  rationale: string
}) {
  return [
    '## Estimation',
    '',
    `Development mode: ${mode || '-'}`,
    '',
    `Hours: ${hours || '-'}`,
    '',
    `Rationale: ${rationale || '-'}`,
    '',
  ].join('\n')
}

function summarizeMarkdown(value: string) {
  const normalized = value
    .replace(/```[\s\S]*?```/g, ' code block ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/[*_>#|~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized.length > 180 ? `${normalized.slice(0, 180).trim()}...` : normalized
}

const markdownComponents: Components = {
  a({ node: _node, ...props }) {
    return (
      <a
        {...props}
        className="font-medium text-sky-700 underline underline-offset-2 hover:text-sky-900"
        rel="noreferrer"
        target="_blank"
      />
    )
  },
  blockquote({ node: _node, ...props }) {
    return (
      <blockquote
        {...props}
        className="border-l-4 border-slate-300 pl-4 text-slate-700"
      />
    )
  },
  code({ node: _node, className, ...props }) {
    return (
      <code
        {...props}
        className={`rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] text-slate-900 ${className ?? ''}`}
      />
    )
  },
  h1({ node: _node, ...props }) {
    return <h1 {...props} className="text-2xl font-bold text-slate-950" />
  },
  h2({ node: _node, ...props }) {
    return <h2 {...props} className="text-xl font-bold text-slate-950" />
  },
  h3({ node: _node, ...props }) {
    return <h3 {...props} className="text-lg font-semibold text-slate-950" />
  },
  li({ node: _node, ...props }) {
    return <li {...props} className="pl-1" />
  },
  ol({ node: _node, ...props }) {
    return <ol {...props} className="list-decimal space-y-2 pl-6" />
  },
  p({ node: _node, ...props }) {
    return <p {...props} className="leading-7 text-slate-700" />
  },
  pre({ node: _node, ...props }) {
    return (
      <pre
        {...props}
        className="overflow-auto rounded-md bg-slate-950 p-4 text-sm text-slate-100"
      />
    )
  },
  ul({ node: _node, ...props }) {
    return <ul {...props} className="list-disc space-y-2 pl-6" />
  },
}

function MarkdownDialog({
  content,
  onClose,
}: {
  content: MarkdownDialogContent | null
  onClose: () => void
}) {
  const titleId = useId()

  useEffect(() => {
    if (!content) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [content, onClose])

  if (!content) {
    return null
  }

  return (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
      role="dialog"
    >
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950" id={titleId}>
            {content.title}
          </h2>
          <button
            className="inline-flex size-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            onClick={onClose}
            type="button"
          >
            <span className="sr-only">Close</span>
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-auto px-6 py-5">
          <div className="space-y-4">
            <Markdown components={markdownComponents}>{content.content}</Markdown>
          </div>
        </div>
      </div>
    </div>
  )
}

function stringValue(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

function EmptyState({ error }: { error: string | null }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      {error || 'No issue rows are available.'}
    </div>
  )
}
