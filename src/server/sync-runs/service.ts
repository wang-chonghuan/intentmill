import { tableName, withClient } from '../db/client'
import type { JsonValue } from '../issues/types'

export type SyncRun = {
  run_id: number
  project: string
  team: string
  sprint: string
  json_path: string
  started_at: string
  finished_at: string | null
  stats: JsonValue
  stats_text: string | null
}

export async function listSyncRuns(limit = 20) {
  return withClient(async (client) => {
    const result = await client.query<SyncRun>(
      `
        SELECT run_id, project, team, sprint, json_path, started_at, finished_at, stats, stats::text AS stats_text
        FROM ${tableName('sync_runs')}
        ORDER BY started_at DESC, run_id DESC
        LIMIT $1
      `,
      [Math.min(Math.max(limit, 1), 100)],
    )
    return result.rows
  })
}
