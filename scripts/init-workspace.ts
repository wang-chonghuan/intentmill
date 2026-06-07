import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

type ProjectConfig = {
  aliases?: string[]
  repo?: string
  default_branch?: string
}

type SsotConfig = {
  projects?: Record<string, ProjectConfig>
}

const repoRoot = process.cwd()
const configPath = path.join(repoRoot, 'ssot-config.json')
const workspacePath = path.join(repoRoot, '.workspace')
const gitignorePath = path.join(repoRoot, '.gitignore')

async function main() {
  const config = JSON.parse(await fs.readFile(configPath, 'utf8')) as SsotConfig
  const projects = config.projects || {}

  await ensureWorkspaceIgnored()
  await fs.mkdir(workspacePath, { recursive: true })

  const entries = Object.entries(projects)
  if (!entries.length) {
    console.log('No projects configured in ssot-config.json.')
    return
  }

  for (const [name, project] of entries) {
    await initProject(name, project)
  }
}

async function ensureWorkspaceIgnored() {
  let content = ''
  try {
    content = await fs.readFile(gitignorePath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }

  const lines = content.split(/\r?\n/)
  if (lines.includes('.workspace/')) {
    return
  }

  const next = content.trimEnd() ? `${content.trimEnd()}\n.workspace/\n` : '.workspace/\n'
  await fs.writeFile(gitignorePath, next)
}

async function initProject(name: string, project: ProjectConfig) {
  if (!project.repo) {
    throw new Error(`Project ${name} is missing repo.`)
  }
  const branch = project.default_branch || 'main'

  const destination = path.join(workspacePath, name)
  if (await exists(path.join(destination, '.git'))) {
    await syncProject(name, destination, branch)
    return
  }

  if (await exists(destination)) {
    throw new Error(`${destination} exists but is not a git repository.`)
  }

  const args = ['clone']
  if (branch) {
    args.push('--branch', branch)
  }
  args.push(project.repo, destination)

  console.log(`${name}: cloning ${project.repo} into ${path.relative(repoRoot, destination)}`)
  await run('git', args)
}

async function syncProject(name: string, destination: string, branch: string) {
  const relative = path.relative(repoRoot, destination)
  const dirty = gitOutput(['status', '--porcelain'], destination)
  if (dirty) {
    console.log(`${name}: dirty workspace at ${relative}; skipping pull.`)
    console.log(dirty)
    return
  }

  console.log(`${name}: syncing ${relative} to ${branch}`)
  await run('git', ['fetch', 'origin'], destination)

  const currentBranch = gitOutput(['branch', '--show-current'], destination)
  if (currentBranch !== branch) {
    await run('git', ['checkout', branch], destination)
  }

  await run('git', ['pull', '--ff-only', 'origin', branch], destination)
}

async function exists(target: string) {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

function gitOutput(args: string[], cwd: string) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${(result.stderr || result.stdout).trim()}`)
  }
  return result.stdout.trim()
}

function run(command: string, args: string[], cwd = repoRoot) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
    })
  })
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
