import { getPublicConfigStatus } from '../src/server/config'
import { closePool, initDb } from '../src/server/db/client'
import { schemaSql } from '../src/server/db/schema'
import { getIssue, listIssues, normalizeSprint, updateIssue } from '../src/server/issues/service'
import type { IssueUpdate } from '../src/server/issues/types'
import { syncLinearSprint } from '../src/server/linear/sprint-sync'
import { listSyncRuns } from '../src/server/sync-runs/service'
import { buildIssueWorkflowCommands, buildWorkflowCommands } from '../src/server/workflows/commands'

type ParsedArgs = {
  positional: string[]
  options: Record<string, string | boolean>
}

function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = []
  const options: Record<string, string | boolean> = {}
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) {
      positional.push(token)
      continue
    }
    const key = token.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) {
      options[key] = true
      continue
    }
    options[key] = next
    index += 1
  }
  return { positional, options }
}

function stringOption(args: ParsedArgs, key: string) {
  const value = args.options[key]
  return typeof value === 'string' ? value : undefined
}

function numberOption(args: ParsedArgs, key: string) {
  const value = stringOption(args, key)
  return value === undefined ? undefined : Number(value)
}

function printJson(value: unknown) {
  console.log(JSON.stringify(value, null, 2))
}

function printHelp() {
  console.log(`
IntentMill command entry

Usage:
  npm run intentmill -- init-db
  npm run intentmill -- schema
  npm run intentmill -- health
  npm run intentmill -- issues list --sprint Cycle-18
  npm run intentmill -- issues show ENG-506
  npm run intentmill -- issues update ENG-506 --im-summary "..." --im-estimation '{"development_mode":"agent","hours":2,"rationale":"Small local change with direct AC coverage."}'
  npm run intentmill -- sync --sprint Cycle-18
  npm run intentmill -- sync-runs list
  npm run intentmill -- commands --sprint Cycle-18
  npm run intentmill -- ai summary --sprint Cycle-18
  npm run intentmill -- ai solution --issue ENG-506 --code <path> --docs <path>
`.trim())
}

async function runIssuesCommand(args: ParsedArgs) {
  const subcommand = args.positional[1]
  if (subcommand === 'list') {
    const items = await listIssues({
      sprint: stringOption(args, 'sprint'),
      assignee: stringOption(args, 'assignee'),
      status: stringOption(args, 'status'),
      version: stringOption(args, 'version'),
      limit: numberOption(args, 'limit') ?? 200,
    })
    printJson({ count: items.length, items })
    return
  }

  if (subcommand === 'show') {
    const issueId = args.positional[2]
    if (!issueId) {
      throw new Error('Missing issue id.')
    }
    printJson(await getIssue(issueId))
    return
  }

  if (subcommand === 'update') {
    const issueId = args.positional[2]
    if (!issueId) {
      throw new Error('Missing issue id.')
    }
    const patch: IssueUpdate = {}
    const stringFields: Array<[string, keyof IssueUpdate]> = [
      ['parent-issue-id', 'parent_issue_id'],
      ['title', 'title'],
      ['assignee', 'assignee'],
      ['sprint', 'sprint'],
      ['status', 'status'],
      ['version', 'version'],
      ['description', 'description'],
      ['im-summary', 'im_summary'],
      ['im-solution', 'im_solution'],
      ['im-criteria', 'im_criteria'],
    ]
    for (const [option, field] of stringFields) {
      const value = stringOption(args, option)
      if (value !== undefined) {
        Object.assign(patch, { [field]: option === 'sprint' ? normalizeSprint(value) : value })
      }
    }
    const estimate = stringOption(args, 'im-estimation')
    if (estimate !== undefined) {
      patch.im_estimation = JSON.parse(estimate)
    }
    const clearValue = stringOption(args, 'clear')
    if (clearValue) {
      for (const field of clearValue.split(',').map((value) => value.trim()).filter(Boolean)) {
        const key = field.replaceAll('-', '_') as keyof IssueUpdate
        Object.assign(patch, { [key]: null })
      }
    }
    printJson(await updateIssue(issueId, patch))
    return
  }

  throw new Error(`Unknown issues subcommand: ${subcommand || '(missing)'}`)
}

async function runSyncRunsCommand(args: ParsedArgs) {
  if (args.positional[1] !== 'list') {
    throw new Error('Expected sync-runs list.')
  }
  const items = await listSyncRuns(numberOption(args, 'limit') ?? 20)
  printJson({ count: items.length, items })
}

function printWorkflowCommand(commandId: string, sprint: string, issueId?: string) {
  const commands = issueId ? buildIssueWorkflowCommands(issueId) : buildWorkflowCommands(sprint)
  const found = commands.find((command) => command.id === commandId)
  if (!found) {
    throw new Error(`Unknown workflow command: ${commandId}`)
  }
  printJson(found)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const command = args.positional[0]

  if (!command || command === 'help' || command === '--help') {
    printHelp()
    return
  }

  if (command === 'init-db') {
    printJson(await initDb())
    return
  }

  if (command === 'schema') {
    console.log(schemaSql)
    return
  }

  if (command === 'health') {
    printJson(getPublicConfigStatus())
    return
  }

  if (command === 'issues') {
    await runIssuesCommand(args)
    return
  }

  if (command === 'sync-runs') {
    await runSyncRunsCommand(args)
    return
  }

  if (command === 'commands') {
    const sprint = normalizeSprint(stringOption(args, 'sprint') || 'Cycle-18')
    printJson(buildWorkflowCommands(sprint))
    return
  }

  if (command === 'sync') {
    const sprint = normalizeSprint(stringOption(args, 'sprint') || stringOption(args, 'cycle') || 'Cycle-18')
    printJson(await syncLinearSprint({ cycle: sprint }))
    return
  }

  if (command === 'ai') {
    const workflow = args.positional[1]
    const sprint = normalizeSprint(stringOption(args, 'sprint') || 'Cycle-18')
    const issueId = stringOption(args, 'issue')
    if (workflow === 'solution' || workflow === 'criteria') {
      if (!issueId) {
        throw new Error(`Missing --issue for ai ${workflow}.`)
      }
      printWorkflowCommand(workflow, sprint, issueId)
      return
    }
    printWorkflowCommand(workflow || '', sprint)
    return
  }

  throw new Error(`Unknown command: ${command}`)
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
