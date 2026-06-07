import fs from 'node:fs/promises'
import path from 'node:path'

import { getLinearApiKey } from '../config'
import { initDb, tableName, withClient } from '../db/client'
import { normalizeSprint } from '../issues/service'
import type { JsonValue } from '../issues/types'

const GRAPHQL_URL = 'https://api.linear.app/graphql'
const DEFAULT_PROJECT = 'narrative-sdk'
const DEFAULT_TEAM = 'Engineering'

type LinearUser = {
  name?: string | null
}

type LinearIssueNode = {
  id: string
  identifier: string
  title?: string | null
  url?: string | null
  description?: string | null
  assignee?: LinearUser | null
  state?: {
    name?: string | null
  } | null
  parent?: {
    id?: string | null
    identifier?: string | null
  } | null
  children?: {
    nodes?: Array<{
      id?: string | null
      identifier?: string | null
    }>
  } | null
  comments?: {
    nodes?: Array<{
      id: string
      body?: string | null
      createdAt?: string | null
      updatedAt?: string | null
      user?: LinearUser | null
    }>
  } | null
  labels?: {
    nodes?: Array<{
      name?: string | null
    }>
  } | null
}

type SprintSyncOptions = {
  cycle: string
  project?: string
  team?: string
  includeSubIssues?: boolean
}

type LinearIssueRow = {
  issue_id: string
  project: string
  parent_issue_id: string | null
  title: string
  assignee: string | null
  sprint: string
  status: string | null
  version: string | null
  description: string | null
  comments: JsonValue
  extra: JsonValue
}

type LinearIssuesPageResponse = {
  issues: {
    pageInfo: {
      hasNextPage: boolean
      endCursor: string | null
    }
    nodes: LinearIssueNode[]
  }
}

type SyncStats = {
  base_count: number
  root_count: number
  expanded_child_fetch_count: number
  final_count: number
  upserted_count: number
  detached_from_cycle_count: number
  snapshot_count: number
  sync_run_id?: number
}

export type SprintSyncResult = {
  project: string
  team: string
  cycle: string
  cycleNumber: string
  jsonPath: string
  stats: SyncStats
}

const BASE_ISSUES_QUERY = `
query BaseIssues($first: Int!, $after: String, $project: String!, $team: String!, $cycle: Float!) {
  issues(
    first: $first,
    after: $after,
    orderBy: createdAt,
    filter: {
      archivedAt: { null: true }
      project: { name: { eq: $project } }
      team: { name: { eq: $team } }
      cycle: { number: { eq: $cycle } }
    }
  ) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id
      identifier
      title
      url
      description
      assignee { name }
      state { name }
      parent { id identifier }
      children(first: 100) { nodes { id identifier } }
      labels(first: 100) { nodes { name } }
      comments(first: 100) { nodes { id body createdAt updatedAt user { name } } }
    }
  }
}
`

const CHILDREN_QUERY = `
query ChildIssues($parentId: ID!, $first: Int!, $after: String) {
  issues(
    first: $first,
    after: $after,
    orderBy: createdAt,
    filter: {
      archivedAt: { null: true }
      parent: { id: { eq: $parentId } }
    }
  ) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id
      identifier
      title
      url
      description
      assignee { name }
      state { name }
      parent { id identifier }
      children(first: 100) { nodes { id identifier } }
      labels(first: 100) { nodes { name } }
      comments(first: 100) { nodes { id body createdAt updatedAt user { name } } }
    }
  }
}
`

export function normalizeCycleNumber(cycle: string | number) {
  let raw = String(cycle).trim()
  const match = raw.match(/^cycle[-_\s]*(\d+(?:\.0+)?)$/i)
  if (match) {
    raw = match[1]
  }
  if (raw.endsWith('.0')) {
    raw = raw.slice(0, -2)
  }
  if (!/^\d+$/.test(raw)) {
    throw new Error(`Cycle must be a number or Cycle-<number>, got: ${String(cycle)}`)
  }
  return raw
}

function cycleDisplayName(cycle: string | number) {
  return `Cycle-${normalizeCycleNumber(cycle)}`
}

function slugify(value: string) {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug || 'linear-export'
}

function timestampSuffix() {
  const now = new Date()
  const compact = now.toISOString().replace(/[-:.]/g, '').replace('T', 'T').replace('Z', '')
  return `${compact.slice(0, 18)}Z`
}

function defaultOutputPath(project: string, cycle: string) {
  const fileName = `${slugify(project)}-${slugify(cycleDisplayName(cycle))}-${timestampSuffix()}.json`
  return path.join(process.cwd(), 'data', fileName)
}

async function linearGraphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: getLinearApiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`Linear GraphQL request failed with HTTP ${response.status}.`)
  }

  const payload = (await response.json()) as {
    data?: T
    errors?: Array<{ message?: string }>
  }
  if (payload.errors?.length) {
    const message = payload.errors.map((error) => error.message).filter(Boolean).join('; ')
    throw new Error(`Linear GraphQL errors: ${message || 'unknown error'}`)
  }
  if (!payload.data) {
    throw new Error('Linear GraphQL response did not include data.')
  }
  return payload.data
}

async function paginateIssues(
  query: string,
  variables: Record<string, unknown>,
): Promise<LinearIssueNode[]> {
  const items: LinearIssueNode[] = []
  let after: string | null = null

  while (true) {
    const response: LinearIssuesPageResponse = await linearGraphql<LinearIssuesPageResponse>(query, {
      ...variables,
      first: 100,
      after,
    })
    const page: LinearIssuesPageResponse['issues'] = response.issues
    items.push(...page.nodes)
    if (!page.pageInfo.hasNextPage) {
      break
    }
    after = page.pageInfo.endCursor
  }

  return items
}

async function fetchSprintIssues(options: Required<SprintSyncOptions>) {
  const cycleNumber = normalizeCycleNumber(options.cycle)
  const base = await paginateIssues(
    BASE_ISSUES_QUERY,
    {
      project: options.project,
      team: options.team,
      cycle: Number(cycleNumber),
    },
  )

  const merged = new Map<string, LinearIssueNode>()
  for (const issue of base) {
    merged.set(issue.identifier, issue)
  }

  const baseRootIssues = base.filter((issue) => !issue.parent)
  let fetchedChildren = 0
  if (options.includeSubIssues) {
    for (const root of baseRootIssues) {
      const children = await paginateIssues(CHILDREN_QUERY, { parentId: root.id })
      fetchedChildren += children.length
      for (const child of children) {
        merged.set(child.identifier, child)
      }
    }
  }

  const issues = [...merged.values()].sort((left, right) => {
    return issueNumber(left.identifier) - issueNumber(right.identifier)
  })

  return {
    issues,
    stats: {
      base_count: base.length,
      root_count: baseRootIssues.length,
      expanded_child_fetch_count: fetchedChildren,
      final_count: issues.length,
    },
  }
}

function issueNumber(identifier: string) {
  const match = identifier.match(/-(\d+)$/)
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER
}

function parentIssueId(issue: LinearIssueNode) {
  return issue.parent?.identifier ?? null
}

function labelNames(issue: LinearIssueNode) {
  return (issue.labels?.nodes ?? []).map((label) => label.name).filter((name): name is string => Boolean(name))
}

function extractVersion(issue: LinearIssueNode) {
  const labels = labelNames(issue)
  const version = labels.find((label) => /^v(?:ersion)?[-_\s:]?\d/i.test(label))
  return version ?? null
}

function issueToRow(issue: LinearIssueNode, sprint: string, project: string): LinearIssueRow {
  return {
    issue_id: issue.identifier,
    project,
    parent_issue_id: parentIssueId(issue),
    title: issue.title || '',
    assignee: issue.assignee?.name ?? null,
    sprint,
    status: issue.state?.name ?? null,
    version: extractVersion(issue),
    description: issue.description ?? null,
    comments: (issue.comments?.nodes ?? []).map((comment) => ({
      id: comment.id,
      body: comment.body ?? null,
      created_at: comment.createdAt ?? null,
      updated_at: comment.updatedAt ?? null,
      user: comment.user?.name ?? null,
    })),
    extra: {
      linear_id: issue.id,
      url: issue.url ?? null,
      labels: labelNames(issue),
      child_identifiers: (issue.children?.nodes ?? [])
        .map((child) => child.identifier)
        .filter((identifier): identifier is string => Boolean(identifier)),
    },
  }
}

async function syncRowsToDb(rows: LinearIssueRow[], options: Required<SprintSyncOptions>, stats: Omit<SyncStats, 'upserted_count' | 'detached_from_cycle_count' | 'snapshot_count'>) {
  const issueIds = rows.map((row) => row.issue_id)
  const outputPath = defaultOutputPath(options.project, options.cycle)
  await fs.mkdir(path.dirname(outputPath), { recursive: true })

  return withClient(async (client) => {
    await client.query('BEGIN')
    try {
      let upserted = 0
      for (const row of rows) {
        await client.query(
          `
            INSERT INTO ${tableName('issues')} (
              issue_id, project, parent_issue_id, title, assignee, sprint, status, version,
              description, comments, extra
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)
            ON CONFLICT (issue_id) DO UPDATE SET
              project = EXCLUDED.project,
              parent_issue_id = EXCLUDED.parent_issue_id,
              title = EXCLUDED.title,
              assignee = EXCLUDED.assignee,
              sprint = EXCLUDED.sprint,
              status = EXCLUDED.status,
              version = EXCLUDED.version,
              description = EXCLUDED.description,
              comments = EXCLUDED.comments,
              extra = EXCLUDED.extra
          `,
          [
            row.issue_id,
            row.project,
            row.parent_issue_id,
            row.title,
            row.assignee,
            row.sprint,
            row.status,
            row.version,
            row.description,
            JSON.stringify(row.comments),
            JSON.stringify(row.extra),
          ],
        )
        upserted += 1
      }

      const detachResult = issueIds.length
        ? await client.query(
            `
              UPDATE ${tableName('issues')}
              SET sprint = NULL
              WHERE (project = $1 OR project IS NULL) AND sprint = $2 AND NOT (issue_id = ANY($3::text[]))
            `,
            [options.project, cycleDisplayName(options.cycle), issueIds],
          )
        : await client.query(
            `
              UPDATE ${tableName('issues')}
              SET sprint = NULL
              WHERE (project = $1 OR project IS NULL) AND sprint = $2
            `,
            [options.project, cycleDisplayName(options.cycle)],
          )

      const runResult = await client.query<{ run_id: number }>(
        `
          INSERT INTO ${tableName('sync_runs')} (project, team, sprint, json_path)
          VALUES ($1, $2, $3, $4)
          RETURNING run_id
        `,
        [options.project, options.team, cycleDisplayName(options.cycle), outputPath],
      )
      const runId = Number(runResult.rows[0]?.run_id)

      for (const row of rows) {
        await client.query(
          `
            INSERT INTO ${tableName('issue_snapshots')} (
              run_id, issue_id, project, parent_issue_id, title, assignee, sprint, status,
              version, description, comments, extra
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb)
          `,
          [
            runId,
            row.issue_id,
            row.project,
            row.parent_issue_id,
            row.title,
            row.assignee,
            row.sprint,
            row.status,
            row.version,
            row.description,
            JSON.stringify(row.comments),
            JSON.stringify(row.extra),
          ],
        )
      }

      const finalStats: SyncStats = {
        ...stats,
        upserted_count: upserted,
        detached_from_cycle_count: Number(detachResult.rowCount ?? 0),
        snapshot_count: rows.length,
        sync_run_id: runId,
      }
      await client.query(
        `
          UPDATE ${tableName('sync_runs')}
          SET finished_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
              stats = $1::jsonb
          WHERE run_id = $2
        `,
        [JSON.stringify(finalStats), runId],
      )
      await client.query('COMMIT')
      return { outputPath, stats: finalStats }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  })
}

export async function syncLinearSprint(options: SprintSyncOptions): Promise<SprintSyncResult> {
  const normalizedOptions: Required<SprintSyncOptions> = {
    project: options.project || DEFAULT_PROJECT,
    team: options.team || DEFAULT_TEAM,
    cycle: normalizeCycleNumber(options.cycle),
    includeSubIssues: options.includeSubIssues ?? true,
  }
  await initDb()

  const sprint = cycleDisplayName(normalizedOptions.cycle)
  const { issues, stats } = await fetchSprintIssues(normalizedOptions)
  const rows = issues.map((issue) => issueToRow(issue, sprint, normalizedOptions.project))
  const { outputPath, stats: finalStats } = await syncRowsToDb(rows, normalizedOptions, stats)

  const payload = {
    generated_at_utc: new Date().toISOString(),
    project: normalizedOptions.project,
    team: normalizedOptions.team,
    cycle: sprint,
    cycle_number: normalizedOptions.cycle,
    include_sub_issues: normalizedOptions.includeSubIssues,
    stats: finalStats,
    issues,
  }
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)

  return {
    project: normalizedOptions.project,
    team: normalizedOptions.team,
    cycle: normalizeSprint(sprint),
    cycleNumber: normalizedOptions.cycle,
    jsonPath: outputPath,
    stats: finalStats,
  }
}
