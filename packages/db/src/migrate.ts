/**
 * Database Migration Script (Standalone-Compatible)
 *
 * This script runs database migrations at container startup.
 * It uses raw SQL execution to avoid dependency on drizzle-orm migrator
 * which may not be available in the standalone output.
 *
 * Usage: node --experimental-strip-types migrate.ts
 *
 * Exit Codes:
 * - 0: Success (migrations ran or schema already up to date)
 * - 1: Failure (connection or migration error)
 */

import { Pool } from "pg";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

async function checkSchemaExists(pool: Pool): Promise<boolean> {
  try {
    // Check if the 'session' table exists as a proxy for schema being set up
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'session'
      );
    `);
    return result.rows[0]?.exists === true;
  } catch (error) {
    console.error("Error checking schema:", error);
    return false;
  }
}

async function getMigrationsRun(pool: Pool): Promise<Set<string>> {
  try {
    // Check if drizzle migrations table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'drizzle' 
        AND table_name = '__drizzle_migrations'
      );
    `);
    
    if (!tableExists.rows[0]?.exists) {
      return new Set();
    }
    
    const result = await pool.query(`
      SELECT hash FROM drizzle.__drizzle_migrations;
    `);
    return new Set(result.rows.map((r: { hash: string }) => r.hash));
  } catch {
    return new Set();
  }
}

async function runMigrations(): Promise<void> {
  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    console.log("POSTGRES_URL not set, skipping migrations");
    process.exit(0);
  }

  console.log("Connecting to database...");

  const pool = new Pool({
    connectionString,
  });

  try {
    // Test connection
    await pool.query("SELECT 1");
    console.log("Database connection successful");

    // Check if schema exists
    const schemaExists = await checkSchemaExists(pool);

    if (schemaExists) {
      console.log("Database schema already exists, skipping migrations");
      await pool.end();
      process.exit(0);
    }

    console.log("Database schema not found, running migrations...");

    // Get the migrations folder
    const migrationsFolder = process.env.MIGRATIONS_PATH || "./migrations";
    
    if (!existsSync(migrationsFolder)) {
      console.error(`Migrations folder not found: ${migrationsFolder}`);
      await pool.end();
      process.exit(1);
    }

    // Get all SQL migration files
    const migrationFiles = readdirSync(migrationsFolder)
      .filter((f: string) => f.endsWith(".sql"))
      .sort();

    if (migrationFiles.length === 0) {
      console.log("No migration files found");
      await pool.end();
      process.exit(0);
    }

    console.log(`Found ${migrationFiles.length} migration files`);

    // Get already run migrations
    const migrationsRun = await getMigrationsRun(pool);

    // Create drizzle schema and migrations table if needed
    await pool.query(`CREATE SCHEMA IF NOT EXISTS drizzle;`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
      );
    `);

    // Run each migration
    for (const file of migrationFiles) {
      const hash = file;
      
      if (migrationsRun.has(hash)) {
        console.log(`  Skipping already run: ${file}`);
        continue;
      }

      console.log(`  Running: ${file}`);
      const sql = readFileSync(join(migrationsFolder, file), "utf8");
      
      try {
        // Split by statement breakpoints if present, otherwise run as single statement
        const statements = sql.split("--\u003e statement-breakpoint")
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);
        
        for (const statement of statements) {
          await pool.query(statement);
        }
        
        // Record this migration as run
        await pool.query(
          `INSERT INTO drizzle.__drizzle_migrations (hash) VALUES ($1)`,
          [hash]
        );
      } catch (error: unknown) {
        console.error(`  Error running migration ${file}:`, error);
        await pool.end();
        process.exit(1);
      }
    }

    console.log("Migrations completed successfully");
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    await pool.end();
    process.exit(1);
  }
}

runMigrations();
