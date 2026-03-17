import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function getPoolConfig(): pg.PoolConfig {
  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT, DATABASE_URL } = process.env;

  const isProduction = PGHOST && PGHOST !== "helium";

  if (isProduction && PGUSER && PGPASSWORD && PGDATABASE) {
    return {
      host: PGHOST,
      port: Number(PGPORT) || 5432,
      user: PGUSER,
      password: PGPASSWORD,
      database: PGDATABASE,
      ssl: { rejectUnauthorized: false },
    };
  }

  if (!DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  return { connectionString: DATABASE_URL };
}

export const pool = new Pool(getPoolConfig());
export const db = drizzle(pool, { schema });

export * from "./schema";
