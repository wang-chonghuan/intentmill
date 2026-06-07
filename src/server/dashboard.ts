import { getPublicConfigStatus } from './config'
import { getPlanningMetrics, listIssues } from './issues/service'
import { listSyncRuns } from './sync-runs/service'

export async function loadDashboard(sprint = 'Cycle-18') {
  const config = getPublicConfigStatus()
  if (!config.ok) {
    return {
      ok: false as const,
      config,
      sprint,
      metrics: null,
      issues: [],
      syncRuns: [],
      error: config.error || 'Database configuration is missing.',
    }
  }

  try {
    const [metrics, issues, syncRuns] = await Promise.all([
      getPlanningMetrics(sprint),
      listIssues({ sprint, limit: 100 }),
      listSyncRuns(8),
    ])

    return {
      ok: true as const,
      config,
      sprint,
      metrics,
      issues,
      syncRuns,
      error: null,
    }
  } catch (error) {
    return {
      ok: false as const,
      config,
      sprint,
      metrics: null,
      issues: [],
      syncRuns: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
