import fs from 'node:fs'
import path from 'node:path'

type RawSsotConfig = {
  postgres?: Partial<PostgresConfig> & {
    admin_user?: string
    admin_password?: string
  }
  linear?: {
    api_key?: string
  }
  cycles?: RawCycleConfig[]
  projects?: Record<string, RawProjectConfig>
}

type RawCycleConfig = {
  name?: unknown
  default?: unknown
}

type RawProjectConfig = {
  aliases?: unknown
  repo?: unknown
  default_branch?: unknown
}

export type PostgresConfig = {
  host: string
  port: number
  database: string
  user: string
  password: string
  sslmode: string
  schema: string
}

export type RuntimeConfig = {
  postgres: PostgresConfig
  linearConfigured: boolean
  source: 'env' | 'ssot-config.json'
}

export type PublicProjectConfig = {
  key: string
  label: string
  aliases: string[]
  repo: string | null
  defaultBranch: string | null
}

export type PublicCycleConfig = {
  name: string
  default: boolean
}

const CONFIG_FILE = path.join(process.cwd(), 'ssot-config.json')

function readSsotConfig(): RawSsotConfig | null {
  if (!fs.existsSync(CONFIG_FILE)) {
    return null
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) as RawSsotConfig
}

function readEnvConfig(): RuntimeConfig | null {
  const databaseUrl = process.env.DATABASE_URL
  if (databaseUrl) {
    const parsed = new URL(databaseUrl)
    return {
      source: 'env',
      postgres: {
        host: parsed.hostname,
        port: Number(parsed.port || 5432),
        database: parsed.pathname.replace(/^\//, ''),
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        sslmode: process.env.POSTGRES_SSLMODE || parsed.searchParams.get('sslmode') || 'require',
        schema: process.env.POSTGRES_SCHEMA || 'public',
      },
      linearConfigured: Boolean(process.env.LINEAR_API_KEY),
    }
  }

  const host = process.env.POSTGRES_HOST
  const database = process.env.POSTGRES_DATABASE
  const user = process.env.POSTGRES_USER
  const password = process.env.POSTGRES_PASSWORD
  if (!host || !database || !user || !password) {
    return null
  }

  return {
    source: 'env',
    postgres: {
      host,
      port: Number(process.env.POSTGRES_PORT || 5432),
      database,
      user,
      password,
      sslmode: process.env.POSTGRES_SSLMODE || 'require',
      schema: process.env.POSTGRES_SCHEMA || 'public',
    },
    linearConfigured: Boolean(process.env.LINEAR_API_KEY),
  }
}

function readFileConfig(): RuntimeConfig | null {
  const raw = readSsotConfig()
  const postgres = raw?.postgres
  if (!postgres) {
    return null
  }

  const user = postgres.user || postgres.admin_user
  const password = postgres.password || postgres.admin_password
  if (!postgres.host || !postgres.database || !user || !password) {
    return null
  }

  return {
    source: 'ssot-config.json',
    postgres: {
      host: postgres.host,
      port: Number(postgres.port || 5432),
      database: postgres.database,
      user,
      password,
      sslmode: postgres.sslmode || 'require',
      schema: postgres.schema || 'public',
    },
    linearConfigured: Boolean(raw.linear?.api_key),
  }
}

export function getRuntimeConfig(): RuntimeConfig {
  const config = readEnvConfig() || readFileConfig()
  if (!config) {
    throw new Error(
      'IntentMill database config not found. Set DATABASE_URL or provide an uncommitted ssot-config.json.',
    )
  }
  return config
}

export function getLinearApiKey() {
  const envKey = process.env.LINEAR_API_KEY
  if (envKey) {
    return envKey
  }

  const raw = readSsotConfig()
  const fileKey = raw?.linear?.api_key
  if (fileKey) {
    return fileKey
  }

  throw new Error('Linear API key not found. Set LINEAR_API_KEY or provide local ssot-config.json.')
}

function normalizeProjectAliases(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((alias): alias is string => typeof alias === 'string' && Boolean(alias.trim()))
}

export function getPublicProjects(): PublicProjectConfig[] {
  const raw = readSsotConfig()
  const projects = raw?.projects ?? {}

  return Object.entries(projects)
    .map(([key, project]) => {
      const aliases = normalizeProjectAliases(project.aliases)
      return {
        key,
        label: aliases[0] || key,
        aliases,
        repo: typeof project.repo === 'string' && project.repo.trim() ? project.repo : null,
        defaultBranch:
          typeof project.default_branch === 'string' && project.default_branch.trim()
            ? project.default_branch
            : null,
      }
    })
    .sort((left, right) => left.label.localeCompare(right.label))
}

function normalizeCycleName(value: string) {
  const raw = value.trim()
  if (/^\d+$/.test(raw)) {
    return `Cycle-${raw}`
  }
  const match = raw.match(/^cycle[-_\s]*(\d+)$/i)
  return match ? `Cycle-${match[1]}` : raw
}

export function getPublicCycles(): PublicCycleConfig[] {
  const raw = readSsotConfig()
  const cycles = Array.isArray(raw?.cycles) ? raw.cycles : []
  const seen = new Set<string>()
  const normalized: PublicCycleConfig[] = []

  for (const cycle of cycles) {
    if (!cycle || typeof cycle.name !== 'string' || !cycle.name.trim()) {
      continue
    }
    const name = normalizeCycleName(cycle.name)
    if (seen.has(name)) {
      continue
    }
    seen.add(name)
    normalized.push({
      name,
      default: cycle.default === true,
    })
  }

  if (!normalized.some((cycle) => cycle.default) && normalized[0]) {
    return normalized.map((cycle, index) => ({
      ...cycle,
      default: index === 0,
    }))
  }

  let defaultSeen = false
  return normalized.map((cycle) => {
    if (!cycle.default) {
      return cycle
    }
    if (defaultSeen) {
      return { ...cycle, default: false }
    }
    defaultSeen = true
    return cycle
  })
}

export function getDefaultPublicCycle() {
  return getPublicCycles().find((cycle) => cycle.default)?.name ?? 'Cycle-18'
}

export function resolvePublicCycle(cycleName: string | undefined | null) {
  const cycles = getPublicCycles()
  const defaultCycle = getDefaultPublicCycle()
  const requested = cycleName?.trim()
  const normalized = requested ? normalizeCycleName(requested) : defaultCycle

  if (!cycles.length) {
    return normalized
  }

  return cycles.some((cycle) => cycle.name === normalized)
    ? normalized
    : defaultCycle
}

export function resolvePublicProject(projectName: string | undefined | null) {
  const projects = getPublicProjects()
  const requested = projectName?.trim()
  if (!requested) {
    return projects[0] ?? null
  }

  return (
    projects.find((project) => {
      return project.key === requested || project.aliases.includes(requested)
    }) ?? null
  )
}

export function getPublicConfigStatus() {
  try {
    const config = getRuntimeConfig()
    return {
      ok: true,
      source: config.source,
      database: config.postgres.database,
      host: config.postgres.host,
      schema: config.postgres.schema,
      sslmode: config.postgres.sslmode,
      linearConfigured: config.linearConfigured,
      error: null,
    }
  } catch (error) {
    return {
      ok: false,
      source: null,
      database: null,
      host: null,
      schema: null,
      sslmode: null,
      linearConfigured: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
