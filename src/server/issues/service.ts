import { initDb, tableName, withClient } from '../db/client'
import type { Issue, IssueFilters, IssuePlanningMetrics, IssueUpdate } from './types'

const ISSUE_COLUMNS = [
  'issue_id',
  'project',
  'parent_issue_id',
  'title',
  'assignee',
  'sprint',
  'status',
  'version',
  'description',
  'comments',
  'im_summary',
  'im_solution',
  'im_criteria',
  'im_estimation',
  'extra',
  'created_at',
  'updated_at',
] as const

const UPDATEABLE_FIELDS = [
  'project',
  'parent_issue_id',
  'title',
  'assignee',
  'sprint',
  'status',
  'version',
  'description',
  'comments',
  'im_summary',
  'im_solution',
  'im_criteria',
  'im_estimation',
  'extra',
] as const

export type UpdateableIssueField = (typeof UPDATEABLE_FIELDS)[number]

export function normalizeSprint(value: string) {
  const raw = value.trim()
  if (/^\d+$/.test(raw)) {
    return `Cycle-${raw}`
  }
  const match = raw.match(/^cycle[-_\s]*(\d+)$/i)
  return match ? `Cycle-${match[1]}` : raw
}

export async function listIssues(filters: IssueFilters = {}) {
  await initDb()

  const where: string[] = []
  const values: unknown[] = []

  if (filters.project) {
    values.push(filters.project)
    where.push(`(project = $${values.length} OR project IS NULL)`)
  }

  for (const key of ['assignee', 'sprint', 'status', 'version'] as const) {
    const value = filters[key]
    if (!value) {
      continue
    }
    values.push(key === 'sprint' ? normalizeSprint(value) : value)
    where.push(`${key} = $${values.length}`)
  }

  const limit = Math.min(Math.max(filters.limit ?? 200, 1), 1000)
  const offset = Math.max(filters.offset ?? 0, 0)
  values.push(limit, offset)

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const sql = `
    SELECT ${ISSUE_COLUMNS.join(', ')}
    FROM ${tableName('issues')}
    ${whereSql}
    ORDER BY sprint, status, assignee, issue_id
    LIMIT $${values.length - 1} OFFSET $${values.length}
  `

  return withClient(async (client) => {
    const result = await client.query<Issue>(sql, values)
    return result.rows
  })
}

export async function listIssueSprints(project?: string) {
  await initDb()

  return withClient(async (client) => {
    const values: unknown[] = []
    const projectSql = project ? 'AND (project = $1 OR project IS NULL)' : ''
    if (project) {
      values.push(project)
    }

    const result = await client.query<{ sprint: string }>(
      `
      SELECT DISTINCT sprint
      FROM ${tableName('issues')}
      WHERE sprint IS NOT NULL AND BTRIM(sprint) <> ''
      ${projectSql}
      ORDER BY sprint
    `,
      values,
    )
    return result.rows.map((row) => row.sprint)
  })
}

export async function clearIssuesByProjectAndSprint(project: string, sprint: string) {
  const normalizedProject = project.trim()
  if (!normalizedProject) {
    throw new Error('Project is required to clear issues.')
  }

  const normalizedSprint = normalizeSprint(sprint)
  await initDb()

  return withClient(async (client) => {
    const result = await client.query<{ issue_id: string }>(
      `
        DELETE FROM ${tableName('issues')}
        WHERE (project = $1 OR project IS NULL) AND sprint = $2
        RETURNING issue_id
      `,
      [normalizedProject, normalizedSprint],
    )
    return {
      project: normalizedProject,
      sprint: normalizedSprint,
      deletedCount: Number(result.rowCount ?? 0),
      issueIds: result.rows.map((row) => row.issue_id),
    }
  })
}

export async function getIssue(issueId: string) {
  await initDb()

  return withClient(async (client) => {
    const result = await client.query<Issue>(
      `SELECT ${ISSUE_COLUMNS.join(', ')} FROM ${tableName('issues')} WHERE issue_id = $1`,
      [issueId],
    )
    return result.rows[0] ?? null
  })
}

export async function updateIssue(issueId: string, patch: IssueUpdate) {
  await initDb()

  const entries = Object.entries(patch).filter(([key, value]) => {
    return UPDATEABLE_FIELDS.includes(key as UpdateableIssueField) && value !== undefined
  })
  if (!entries.length) {
    return getIssue(issueId)
  }

  const setSql = entries.map(([key], index) => `${key} = $${index + 1}`).join(', ')
  const values = entries.map(([, value]) => value)
  values.push(issueId)

  return withClient(async (client) => {
    const result = await client.query<Issue>(
      `
        UPDATE ${tableName('issues')}
        SET ${setSql}
        WHERE issue_id = $${values.length}
        RETURNING ${ISSUE_COLUMNS.join(', ')}
      `,
      values,
    )
    return result.rows[0] ?? null
  })
}

export async function getPlanningMetrics(sprint?: string): Promise<IssuePlanningMetrics> {
  await initDb()

  const values: unknown[] = []
  const whereSql = sprint ? 'WHERE sprint = $1' : ''
  if (sprint) {
    values.push(normalizeSprint(sprint))
  }

  return withClient(async (client) => {
    const result = await client.query<{
      total: string
      missing_summary: string
      missing_solution: string
      missing_criteria: string
      missing_estimate: string
    }>(
      `
        SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE NULLIF(BTRIM(COALESCE(im_summary, '')), '') IS NULL)::text AS missing_summary,
          COUNT(*) FILTER (WHERE NULLIF(BTRIM(COALESCE(im_solution, '')), '') IS NULL)::text AS missing_solution,
          COUNT(*) FILTER (WHERE NULLIF(BTRIM(COALESCE(im_criteria, '')), '') IS NULL)::text AS missing_criteria,
          COUNT(*) FILTER (WHERE im_estimation IS NULL)::text AS missing_estimate
        FROM ${tableName('issues')}
        ${whereSql}
      `,
      values,
    )
    const row = result.rows[0]
    return {
      total: Number(row?.total ?? 0),
      missingSummary: Number(row?.missing_summary ?? 0),
      missingSolution: Number(row?.missing_solution ?? 0),
      missingCriteria: Number(row?.missing_criteria ?? 0),
      missingEstimate: Number(row?.missing_estimate ?? 0),
    }
  })
}
