import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { PGlite } from "@electric-sql/pglite";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePgLite } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";

import { dbLogger } from "@kan/logger";

import * as schema from "./schema";

export type dbClient = NodePgDatabase<typeof schema> & {
  $client: Pool;
};

// Singleton pool instance to avoid creating multiple connections
let poolInstance: Pool | null = null;
// Singleton Drizzle client instance for the PostgreSQL pool
let drizzleInstance: dbClient | null = null;

export const createDrizzleClient = (): dbClient => {
  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    dbLogger.info("POSTGRES_URL not set, using PGLite for local development");

    const client = new PGlite({
      dataDir: "./pgdata",
      extensions: { uuid_ossp },
    });
    const db = drizzlePgLite(client, { schema });

    migrate(db, { migrationsFolder: "../../packages/db/migrations" });

    return db as unknown as dbClient;
  }

  // Return cached Drizzle instance if available
  if (drizzleInstance) {
    return drizzleInstance;
  }

  // Use singleton pattern for connection pool
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString,
    });
    dbLogger.debug("Database connection pool created");
  }

  drizzleInstance = drizzlePg(poolInstance, { schema }) as dbClient;
  dbLogger.debug("Drizzle client instance created");

  return drizzleInstance;
};
