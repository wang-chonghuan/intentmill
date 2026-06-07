import { Pool, type PoolClient } from 'pg'

import { getRuntimeConfig } from '../config'
import { schemaSql } from './schema'

let pool: Pool | null = null
let initPromise:
  | Promise<{
      schema: string
      database: string
      host: string
    }>
  | null = null

export function quoteIdent(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

export function tableName(name: string) {
  return `${quoteIdent(getRuntimeConfig().postgres.schema)}.${quoteIdent(name)}`
}

export function getPool() {
  if (pool) {
    return pool
  }

  const { postgres } = getRuntimeConfig()
  pool = new Pool({
    host: postgres.host,
    port: postgres.port,
    database: postgres.database,
    user: postgres.user,
    password: postgres.password,
    ssl: postgres.sslmode === 'require' ? { rejectUnauthorized: false } : undefined,
  })
  return pool
}

export async function withClient<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect()
  try {
    return await callback(client)
  } finally {
    client.release()
  }
}

export async function initDb() {
  if (initPromise) {
    return initPromise
  }

  initPromise = initDbOnce().catch((error) => {
    initPromise = null
    throw error
  })
  return initPromise
}

async function initDbOnce() {
  const schema = getRuntimeConfig().postgres.schema
  const schemaIdent = quoteIdent(schema)
  await withClient(async (client) => {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaIdent}`)
    await client.query(`
      CREATE OR REPLACE FUNCTION ${schemaIdent}.set_updated_at_utc()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
          NEW.updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
          RETURN NEW;
      END;
      $$;
    `)
    await client.query(`SET search_path TO ${schemaIdent}`)
    await client.query(schemaSql)
  })
  return {
    schema,
    database: getRuntimeConfig().postgres.database,
    host: getRuntimeConfig().postgres.host,
  }
}

export async function closePool() {
  initPromise = null
  if (!pool) {
    return
  }
  await pool.end()
  pool = null
}
