import type Database from "better-sqlite3";
import DatabaseCtor from "better-sqlite3";

// ---------------------------------------------------------------------------
// Connection + schema. Local SQLite is the source of truth. A BuildBoard
// `Project` is a deeply nested tree; here it is stored FULLY NORMALIZED —
// projects → screens → (recursive) nodes, design-system tokens/components,
// data-sources, and architecture each get their own tables. Inherently
// schemaless value-bags (props/styles/bindings/action/repeat/overrides,
// request results, constant data) are the one place JSON columns are used —
// that is the correct normalization boundary, not EAV.
// ---------------------------------------------------------------------------

/** The 23 semantic palette tokens; drives the theme_palettes columns + mapping. */
export const PALETTE_KEYS = [
  "background",
  "foreground",
  "card",
  "cardForeground",
  "popover",
  "popoverForeground",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "muted",
  "mutedForeground",
  "accent",
  "accentForeground",
  "destructive",
  "destructiveForeground",
  "success",
  "warning",
  "border",
  "input",
  "ring",
  "brandFrom",
  "brandTo",
] as const;

const SCHEMA_VERSION = 2;

export function openDb(path: string): Database.Database {
  const db = new DatabaseCtor(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  ensureSchema(db);
  return db;
}

export function ensureSchema(db: Database.Database): void {
  const paletteCols = PALETTE_KEYS.map((k) => `"${k}" TEXT`).join(",\n      ");

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      mode TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS screens (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      data_source_id TEXT,
      order_index INTEGER NOT NULL
    );

    -- Recursive DesignNode tree for both screen roots and component definitions.
    -- owner_kind + owner_id say which subtree a node belongs to; parent_id +
    -- order_index rebuild the tree (root node has parent_id NULL).
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      owner_kind TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      parent_id TEXT,
      order_index INTEGER NOT NULL,
      type TEXT NOT NULL,
      name TEXT,
      props TEXT,
      styles TEXT,
      bindings TEXT,
      action TEXT,
      repeat TEXT,
      instance_of TEXT,
      overrides TEXT,
      responsive TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_nodes_owner ON nodes(project_id, owner_kind, owner_id);

    CREATE TABLE IF NOT EXISTS data_sources (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      method TEXT NOT NULL,
      url TEXT,
      auth_type TEXT,
      auth_token TEXT,
      body TEXT,
      data TEXT,
      last_result TEXT,
      last_error TEXT,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS data_source_headers (
      id TEXT PRIMARY KEY,
      data_source_id TEXT NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
      key TEXT,
      value TEXT,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS data_source_schema_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data_source_id TEXT NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
      path TEXT,
      type TEXT,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS design_system (
      project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      radius REAL,
      font TEXT
    );

    CREATE TABLE IF NOT EXISTS theme_palettes (
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      mode TEXT NOT NULL,
      ${paletteCols},
      PRIMARY KEY (project_id, mode)
    );

    CREATE TABLE IF NOT EXISTS component_presets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      props TEXT,
      styles TEXT,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS component_definitions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS arch_services (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS arch_interactions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      from_service TEXT,
      to_service TEXT,
      label TEXT,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sequences (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seq_steps (
      id TEXT PRIMARY KEY,
      sequence_id TEXT NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
      from_participant TEXT,
      to_participant TEXT,
      message TEXT,
      type TEXT,
      order_index INTEGER NOT NULL
    );
  `);

  // Forward-compatible migration gate. Fresh DBs already have every column from
  // the CREATEs above; existing DBs get additive ALTERs here, once.
  const v = (db.pragma("user_version", { simple: true }) as number) || 0;
  if (v < SCHEMA_VERSION) {
    // v2: per-node responsive style overrides.
    const nodeCols = (db.prepare("PRAGMA table_info(nodes)").all() as { name: string }[]).map(
      (c) => c.name
    );
    if (!nodeCols.includes("responsive")) {
      db.exec("ALTER TABLE nodes ADD COLUMN responsive TEXT");
    }
    db.pragma(`user_version = ${SCHEMA_VERSION}`);
  }
}

// ---- settings key/value helpers ----

export function getSetting(db: Database.Database, key: string): string | null {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string | null }
    | undefined;
  return row?.value ?? null;
}

export function setSetting(db: Database.Database, key: string, value: string): void {
  db.prepare(
    "INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, value);
}
