import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function getConnectionString(): string {
  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT, DATABASE_URL } = process.env;

  if (PGHOST && PGHOST !== "helium" && PGUSER && PGPASSWORD && PGDATABASE) {
    const port = PGPORT || "5432";
    return `postgresql://${PGUSER}:${encodeURIComponent(PGPASSWORD)}@${PGHOST}:${port}/${PGDATABASE}`;
  }

  if (!DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  return DATABASE_URL;
}

export const pool = new Pool({ connectionString: getConnectionString() });
export const db = drizzle(pool, { schema });

export * from "./schema";
