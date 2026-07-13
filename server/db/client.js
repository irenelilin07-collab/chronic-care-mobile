import pg from "pg";

const { Pool } = pg;

/** @type {pg.Pool | null} */
let pool = null;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getPool() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    const error = new Error("DATABASE_NOT_CONFIGURED");
    error.code = "DATABASE_NOT_CONFIGURED";
    throw error;
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }

  return pool;
}

export async function query(text, params = []) {
  const client = getPool();
  return client.query(text, params);
}

export async function pingDatabase() {
  const result = await query("select 1 as ok");
  return result.rows[0]?.ok === 1;
}
