import { join } from "node:path";
import { app } from "electron";
import type Database from "better-sqlite3";
import { openDb } from "./dbCore";

// Single main-thread connection. BuildBoard's writes are small (one project at a
// time, on a debounce), so synchronous better-sqlite3 on the main thread is fine —
// no worker_threads needed.

let _db: Database.Database | null = null;

export function dbPath(): string {
  return join(app.getPath("userData"), "buildboard.db");
}

export function initDb(): Database.Database {
  if (_db) return _db;
  _db = openDb(dbPath());
  return _db;
}

export function db(): Database.Database {
  if (!_db) throw new Error("DB not initialized — call initDb() first");
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

export { getSetting, setSetting } from "./dbCore";
