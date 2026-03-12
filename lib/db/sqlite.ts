/**
 * SQLite client for local data storage.
 * Schema mirrors Supabase PostgreSQL (see docs/SCHEMA.md).
 */

import Database from "better-sqlite3";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const DB_PATH = process.env.SQLITE_DB_PATH ?? join(process.cwd(), ".data", "bidblender.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    const dir = join(process.cwd(), ".data");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    runMigrations(_db);
  }
  return _db;
}

function runMigrations(db: Database.Database) {
  const migrationsDir = join(process.cwd(), "lib", "db", "migrations");
  const migration = readFileSync(
    join(migrationsDir, "001_initial_schema.sql"),
    "utf-8"
  );
  db.exec(migration);
  // Add individual_qualifications if missing (idempotent)
  try {
    db.exec("ALTER TABLE organisations ADD COLUMN individual_qualifications TEXT DEFAULT '[]'");
  } catch {
    /* column already exists */
  }
}

export function getSqliteDb(): Database.Database {
  return getDb();
}

/** Generate a simple UUID-like id for SQLite (no uuid extension) */
export function generateId(): string {
  return crypto.randomUUID();
}
