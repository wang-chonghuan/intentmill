export type WorkflowCommand = {
  id: string
  title: string
  target: string
  reads: string[]
  writes: string[]
  neverWrites: string[]
  command: string
  codexPrompt: string
}

export function buildWorkflowCommands(sprint = 'Cycle-18'): WorkflowCommand[] {
  return [
    {
      id: 'sync',
      title: 'Sync Linear sprint',
      target: sprint,
      reads: ['Linear GraphQL sprint issues', 'local ssot-config.json or env credentials'],
      writes: ['issues observed Linear fields', 'sync_runs', 'issue_snapshots', 'data/*.json export'],
      neverWrites: ['Linear', 'local planning fields unless creating a new row'],
      command: `npm run intentmill -- sync --sprint ${sprint}`,
      codexPrompt: [
        'Run the IntentMill Linear sync workflow.',
        `Sprint: ${sprint}`,
        'Read Linear via configured credentials.',
        'Write current issue facts, sync_runs, issue_snapshots, and a timestamped JSON export.',
        'Preserve im_summary, im_solution, im_criteria, im_estimation, version, and extra.',
        'Do not write to Linear.',
      ].join('\n'),
    },
    {
      id: 'summary',
      title: 'Refresh summaries',
      target: sprint,
      reads: ['latest two sync runs', 'current sprint issues', 'descriptions', 'comments'],
      writes: ['issues.im_summary only'],
      neverWrites: ['Linear', 'im_solution', 'im_criteria', 'im_estimation'],
      command: `npm run intentmill -- ai summary --sprint ${sprint}`,
      codexPrompt: [
        'Run the IntentMill summary workflow.',
        `Sprint: ${sprint}`,
        'Collect changed tickets and tickets missing im_summary.',
        'Generate concise Chinese summaries from description and comments.',
        'Write only issues.im_summary.',
        'Do not write to Linear.',
        'Run verification and report updated issue ids.',
      ].join('\n'),
    },
    {
      id: 'release-plan',
      title: 'Draft release plan',
      target: sprint,
      reads: ['current sprint issues', 'summaries', 'estimates', 'solutions', 'criteria', 'parent-child links'],
      writes: ['review artifact only'],
      neverWrites: ['Linear', 'issues table'],
      command: `npm run intentmill -- ai release-plan --sprint ${sprint}`,
      codexPrompt: [
        'Draft an IntentMill release planning artifact.',
        `Sprint: ${sprint}`,
        'Use current issue context, estimates, summaries, parent-child links, and planning gaps.',
        'Propose first-week and second-week release candidates with reasons.',
        'Write an artifact for review only; do not update DB fields unless explicitly asked later.',
        'Do not write to Linear.',
      ].join('\n'),
    },
  ]
}

export function buildIssueWorkflowCommands(issueId: string): WorkflowCommand[] {
  return [
    {
      id: 'solution',
      title: 'Draft solution',
      target: issueId,
      reads: ['issue context', 'selected code repository', 'selected docs'],
      writes: ['issues.im_solution only'],
      neverWrites: ['Linear', 'source code', 'im_summary', 'im_criteria', 'im_estimation'],
      command: `npm run intentmill -- ai solution --issue ${issueId} --code <path> --docs <path>`,
      codexPrompt: [
        'Run the IntentMill solution workflow.',
        `Issue: ${issueId}`,
        'Collect issue context, then inspect the provided code path and docs path.',
        'Draft a practical implementation solution.',
        'Write only issues.im_solution.',
        'Do not modify source code and do not write to Linear.',
      ].join('\n'),
    },
    {
      id: 'criteria',
      title: 'Draft criteria',
      target: issueId,
      reads: ['issue context', 'im_summary', 'im_solution'],
      writes: ['issues.im_criteria only'],
      neverWrites: ['Linear', 'source code', 'im_summary', 'im_solution', 'im_estimation'],
      command: `npm run intentmill -- ai criteria --issue ${issueId}`,
      codexPrompt: [
        'Run the IntentMill criteria workflow.',
        `Issue: ${issueId}`,
        'Use issue context, im_summary, and im_solution.',
        'Draft acceptance and verification criteria.',
        'Write only issues.im_criteria.',
        'Do not write to Linear.',
      ].join('\n'),
    },
  ]
}
