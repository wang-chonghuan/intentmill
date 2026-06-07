export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue }

export type IssueEstimation = {
  development_mode: 'agent' | 'agent-led' | 'human-led'
  hours: number
  rationale: string
}

export type Issue = {
  issue_id: string
  project: string | null
  parent_issue_id: string | null
  title: string
  assignee: string | null
  sprint: string | null
  status: string | null
  version: string | null
  description: string | null
  comments: JsonValue
  im_summary: string | null
  im_solution: string | null
  im_criteria: string | null
  im_estimation: IssueEstimation | null
  extra: JsonValue
  created_at: string
  updated_at: string
}

export type IssueUpdate = Partial<
  Pick<
    Issue,
    | 'project'
    | 'parent_issue_id'
    | 'title'
    | 'assignee'
    | 'sprint'
    | 'status'
    | 'version'
    | 'description'
    | 'comments'
    | 'im_summary'
    | 'im_solution'
    | 'im_criteria'
    | 'im_estimation'
    | 'extra'
  >
>

export type IssueFilters = {
  project?: string
  assignee?: string
  sprint?: string
  status?: string
  version?: string
  limit?: number
  offset?: number
}

export type IssuePlanningMetrics = {
  total: number
  missingSummary: number
  missingSolution: number
  missingCriteria: number
  missingEstimate: number
}
