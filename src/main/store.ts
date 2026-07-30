import type Database from "better-sqlite3";
import type {
  Architecture,
  ComponentDefinition,
  ComponentPreset,
  DataSource,
  DesignNode,
  DesignSystem,
  DesignTokens,
  HeaderPair,
  Project,
  Screen,
  SchemaField,
  SeqStep,
  SequenceDiagram,
  ThemeMode,
  ThemePalette,
} from "@shared/types";
import { PALETTE_KEYS } from "./dbCore";

// Serialize an in-memory Project into the normalized tables, and hydrate it back.
// Save is a full-rewrite-per-project inside one transaction (delete the project row
// — cascades to every child table — then reinsert). Correct and cheap at
// single-user local scale; avoids tree-diffing.

// ---- helpers ----

function j(v: unknown): string | null {
  return v == null ? null : JSON.stringify(v);
}
function pj<T>(s: string | null | undefined): T | undefined {
  if (s == null) return undefined;
  try {
    return JSON.parse(s) as T;
  } catch {
    return undefined;
  }
}

const paletteColsQuoted = PALETTE_KEYS.map((k) => `"${k}"`).join(", ");

// ---- node tree (recursive) ----

function insertNodeTree(
  db: Database.Database,
  projectId: string,
  ownerKind: "screen" | "component",
  ownerId: string,
  node: DesignNode,
  parentId: string | null,
  orderIndex: number,
): void {
  db.prepare(
    `INSERT INTO nodes(id, project_id, owner_kind, owner_id, parent_id, order_index,
       type, name, props, styles, bindings, action, repeat, instance_of, overrides, responsive, variant)
     VALUES(@id,@project_id,@owner_kind,@owner_id,@parent_id,@order_index,
       @type,@name,@props,@styles,@bindings,@action,@repeat,@instance_of,@overrides,@responsive,@variant)`,
  ).run({
    id: node.id,
    project_id: projectId,
    owner_kind: ownerKind,
    owner_id: ownerId,
    parent_id: parentId,
    order_index: orderIndex,
    type: node.type,
    name: node.name ?? null,
    props: j(node.props ?? {}),
    styles: j(node.styles ?? {}),
    bindings: j(node.bindings),
    action: j(node.action),
    repeat: j(node.repeat),
    instance_of: node.instanceOf ?? null,
    overrides: j(node.overrides),
    responsive: j(node.responsive),
    variant: node.variant ?? null,
  });
  const children = node.children ?? [];
  for (let i = 0; i < children.length; i++) {
    insertNodeTree(db, projectId, ownerKind, ownerId, children[i], node.id, i);
  }
}

interface NodeRow {
  id: string;
  parent_id: string | null;
  order_index: number;
  type: string;
  name: string | null;
  props: string | null;
  styles: string | null;
  bindings: string | null;
  action: string | null;
  repeat: string | null;
  instance_of: string | null;
  overrides: string | null;
  responsive: string | null;
  variant: string | null;
}

function loadNodeTree(
  db: Database.Database,
  projectId: string,
  ownerKind: "screen" | "component",
  ownerId: string,
): DesignNode | null {
  const rows = db
    .prepare(
      `SELECT * FROM nodes WHERE project_id = ? AND owner_kind = ? AND owner_id = ?
       ORDER BY order_index ASC`,
    )
    .all(projectId, ownerKind, ownerId) as NodeRow[];
  if (rows.length === 0) return null;

  const byId = new Map<string, DesignNode>();
  for (const r of rows) {
    const node: DesignNode = {
      id: r.id,
      type: r.type as DesignNode["type"],
      props: pj<Record<string, unknown>>(r.props) ?? {},
      styles: pj<DesignNode["styles"]>(r.styles) ?? {},
      children: [],
    };
    if (r.name != null) node.name = r.name;
    const bindings = pj<DesignNode["bindings"]>(r.bindings);
    if (bindings) node.bindings = bindings;
    const action = pj<DesignNode["action"]>(r.action);
    if (action) node.action = action;
    const repeat = pj<DesignNode["repeat"]>(r.repeat);
    if (repeat) node.repeat = repeat;
    if (r.instance_of != null) node.instanceOf = r.instance_of;
    const overrides = pj<DesignNode["overrides"]>(r.overrides);
    if (overrides) node.overrides = overrides;
    const responsive = pj<DesignNode["responsive"]>(r.responsive);
    if (responsive) node.responsive = responsive;
    if (r.variant != null) node.variant = r.variant;
    byId.set(r.id, node);
  }

  let root: DesignNode | null = null;
  for (const r of rows) {
    const node = byId.get(r.id)!;
    if (r.parent_id == null) {
      root = node;
    } else {
      byId.get(r.parent_id)?.children.push(node);
    }
  }
  return root;
}

// ---- write ----

const saveTx = (db: Database.Database, p: Project) => {
  db.prepare("DELETE FROM projects WHERE id = ?").run(p.id); // cascades to all children

  db.prepare(
    `INSERT INTO projects(id, name, description, mode, created_at, updated_at)
     VALUES(?,?,?,?,?,?)`,
  ).run(p.id, p.name, p.description ?? null, p.mode, p.createdAt, p.updatedAt);

  // screens + their node trees
  p.screens.forEach((s, i) => {
    db.prepare(
      `INSERT INTO screens(id, project_id, name, title, description, path, width, height, x, y, data_source_id, order_index)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      s.id, p.id, s.name, s.title ?? null, s.description ?? null, s.path ?? null,
      s.width, s.height, s.x, s.y, s.dataSourceId ?? null, i,
    );
    if (s.root) insertNodeTree(db, p.id, "screen", s.id, s.root, null, 0);
  });

  // data sources + headers + schema fields
  p.dataSources.forEach((d, i) => {
    db.prepare(
      `INSERT INTO data_sources(id, project_id, name, kind, method, url, auth_type, auth_token,
         body, data, last_result, last_error, order_index)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      d.id, p.id, d.name, d.kind, d.method, d.url ?? null,
      d.auth?.type ?? "none", d.auth?.token ?? null,
      d.body ?? null, d.data ?? null, j(d.lastResult), d.lastError ?? null, i,
    );
    (d.headers ?? []).forEach((h, hi) => {
      db.prepare(
        `INSERT INTO data_source_headers(id, data_source_id, key, value, order_index)
         VALUES(?,?,?,?,?)`,
      ).run(`${d.id}:h${hi}`, d.id, h.key, h.value, hi);
    });
    (d.schema ?? []).forEach((f, fi) => {
      db.prepare(
        `INSERT INTO data_source_schema_fields(data_source_id, path, type, order_index)
         VALUES(?,?,?,?)`,
      ).run(d.id, f.path, f.type, fi);
    });
  });

  // design system: tokens (design_system row + two palette rows), presets, components
  const ds = p.designSystem;
  db.prepare(`INSERT INTO design_system(project_id, radius, font) VALUES(?,?,?)`).run(
    p.id, ds.tokens.radius, ds.tokens.font,
  );
  (["light", "dark"] as ThemeMode[]).forEach((mode) => {
    const pal = ds.tokens[mode];
    const placeholders = PALETTE_KEYS.map(() => "?").join(", ");
    db.prepare(
      `INSERT INTO theme_palettes(project_id, mode, ${paletteColsQuoted})
       VALUES(?, ?, ${placeholders})`,
    ).run(p.id, mode, ...PALETTE_KEYS.map((k) => pal[k] ?? null));
  });
  ds.presets.forEach((c, i) => {
    db.prepare(
      `INSERT INTO component_presets(id, project_id, name, type, props, styles, order_index)
       VALUES(?,?,?,?,?,?,?)`,
    ).run(c.id, p.id, c.name, c.type, j(c.props ?? {}), j(c.styles ?? {}), i);
  });
  ds.components.forEach((c, i) => {
    db.prepare(
      `INSERT INTO component_definitions(id, project_id, name, variants, order_index)
       VALUES(?,?,?,?,?)`,
    ).run(c.id, p.id, c.name, j(c.variants), i);
    if (c.root) insertNodeTree(db, p.id, "component", c.id, c.root, null, 0);
  });

  // architecture
  const a = p.architecture;
  a.services.forEach((s, i) => {
    db.prepare(
      `INSERT INTO arch_services(id, project_id, name, kind, description, order_index)
       VALUES(?,?,?,?,?,?)`,
    ).run(s.id, p.id, s.name, s.kind, s.description ?? null, i);
  });
  a.interactions.forEach((it, i) => {
    db.prepare(
      `INSERT INTO arch_interactions(id, project_id, from_service, to_service, label, order_index)
       VALUES(?,?,?,?,?,?)`,
    ).run(it.id, p.id, it.from, it.to, it.label ?? null, i);
  });
  a.sequences.forEach((seq, i) => {
    db.prepare(`INSERT INTO sequences(id, project_id, name, order_index) VALUES(?,?,?,?)`).run(
      seq.id, p.id, seq.name, i,
    );
    seq.steps.forEach((st, si) => {
      db.prepare(
        `INSERT INTO seq_steps(id, sequence_id, from_participant, to_participant, message, type, order_index)
         VALUES(?,?,?,?,?,?,?)`,
      ).run(st.id, seq.id, st.from, st.to, st.message, st.type, si);
    });
  });
};

export function saveProject(db: Database.Database, project: Project): void {
  db.transaction(() => saveTx(db, project))();
}

export function deleteProject(db: Database.Database, id: string): void {
  db.prepare("DELETE FROM projects WHERE id = ?").run(id);
}

// ---- read ----

export function listProjects(db: Database.Database): Project[] {
  const ids = (
    db.prepare("SELECT id FROM projects ORDER BY updated_at DESC").all() as { id: string }[]
  ).map((r) => r.id);
  return ids.map((id) => getProject(db, id)).filter((p): p is Project => p != null);
}

export function getProject(db: Database.Database, id: string): Project | null {
  const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as
    | {
        id: string;
        name: string;
        description: string | null;
        mode: string;
        created_at: number;
        updated_at: number;
      }
    | undefined;
  if (!row) return null;

  const screens: Screen[] = (
    db
      .prepare("SELECT * FROM screens WHERE project_id = ? ORDER BY order_index ASC")
      .all(id) as any[]
  ).map((s) => {
    const screen: Screen = {
      id: s.id,
      name: s.name,
      width: s.width,
      height: s.height,
      x: s.x,
      y: s.y,
      root: loadNodeTree(db, id, "screen", s.id) as DesignNode,
    };
    if (s.title != null) screen.title = s.title;
    if (s.description != null) screen.description = s.description;
    if (s.path != null) screen.path = s.path;
    if (s.data_source_id != null) screen.dataSourceId = s.data_source_id;
    return screen;
  });

  const dataSources: DataSource[] = (
    db
      .prepare("SELECT * FROM data_sources WHERE project_id = ? ORDER BY order_index ASC")
      .all(id) as any[]
  ).map((d) => {
    const headers: HeaderPair[] = (
      db
        .prepare(
          "SELECT key, value FROM data_source_headers WHERE data_source_id = ? ORDER BY order_index ASC",
        )
        .all(d.id) as any[]
    ).map((h) => ({ key: h.key ?? "", value: h.value ?? "" }));
    const schema: SchemaField[] = (
      db
        .prepare(
          "SELECT path, type FROM data_source_schema_fields WHERE data_source_id = ? ORDER BY order_index ASC",
        )
        .all(d.id) as any[]
    ).map((f) => ({ path: f.path, type: f.type }));
    const ds: DataSource = {
      id: d.id,
      name: d.name,
      kind: d.kind,
      method: d.method,
      url: d.url ?? "",
      headers,
      auth: { type: (d.auth_type as "none" | "bearer") ?? "none", token: d.auth_token ?? undefined },
    };
    if (d.body != null) ds.body = d.body;
    if (d.data != null) ds.data = d.data;
    if (d.last_error != null) ds.lastError = d.last_error;
    const lastResult = pj<DataSource["lastResult"]>(d.last_result);
    if (lastResult) ds.lastResult = lastResult;
    if (schema.length) ds.schema = schema;
    return ds;
  });

  const designSystem = loadDesignSystem(db, id);
  const architecture = loadArchitecture(db, id);

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    mode: row.mode as Project["mode"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    screens,
    dataSources,
    designSystem,
    architecture,
  };
}

function loadPalette(db: Database.Database, projectId: string, mode: ThemeMode): ThemePalette {
  const row = db
    .prepare(`SELECT ${paletteColsQuoted} FROM theme_palettes WHERE project_id = ? AND mode = ?`)
    .get(projectId, mode) as Record<string, string> | undefined;
  const pal = {} as ThemePalette;
  for (const k of PALETTE_KEYS) (pal as any)[k] = row?.[k] ?? "";
  return pal;
}

function loadDesignSystem(db: Database.Database, projectId: string): DesignSystem {
  const dsRow = db
    .prepare("SELECT radius, font FROM design_system WHERE project_id = ?")
    .get(projectId) as { radius: number; font: string } | undefined;

  const tokens: DesignTokens = {
    light: loadPalette(db, projectId, "light"),
    dark: loadPalette(db, projectId, "dark"),
    radius: dsRow?.radius ?? 8,
    font: dsRow?.font ?? "Inter",
  };

  const presets: ComponentPreset[] = (
    db
      .prepare("SELECT * FROM component_presets WHERE project_id = ? ORDER BY order_index ASC")
      .all(projectId) as any[]
  ).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    props: pj<Record<string, unknown>>(c.props) ?? {},
    styles: pj<ComponentPreset["styles"]>(c.styles) ?? {},
  }));

  const components: ComponentDefinition[] = (
    db
      .prepare(
        "SELECT id, name, variants FROM component_definitions WHERE project_id = ? ORDER BY order_index ASC"
      )
      .all(projectId) as any[]
  ).map((c) => {
    const def: ComponentDefinition = {
      id: c.id,
      name: c.name,
      root: loadNodeTree(db, projectId, "component", c.id) as DesignNode,
    };
    const variants = pj<ComponentDefinition["variants"]>(c.variants);
    if (variants) def.variants = variants;
    return def;
  });

  return { tokens, presets, components };
}

function loadArchitecture(db: Database.Database, projectId: string): Architecture {
  const services = (
    db
      .prepare("SELECT * FROM arch_services WHERE project_id = ? ORDER BY order_index ASC")
      .all(projectId) as any[]
  ).map((s) => ({
    id: s.id,
    name: s.name,
    kind: s.kind,
    description: s.description ?? undefined,
  }));

  const interactions = (
    db
      .prepare("SELECT * FROM arch_interactions WHERE project_id = ? ORDER BY order_index ASC")
      .all(projectId) as any[]
  ).map((it) => ({
    id: it.id,
    from: it.from_service,
    to: it.to_service,
    label: it.label ?? undefined,
  }));

  const sequences: SequenceDiagram[] = (
    db
      .prepare("SELECT id, name FROM sequences WHERE project_id = ? ORDER BY order_index ASC")
      .all(projectId) as any[]
  ).map((seq) => {
    const steps: SeqStep[] = (
      db
        .prepare("SELECT * FROM seq_steps WHERE sequence_id = ? ORDER BY order_index ASC")
        .all(seq.id) as any[]
    ).map((st) => ({
      id: st.id,
      from: st.from_participant,
      to: st.to_participant,
      message: st.message,
      type: st.type,
    }));
    return { id: seq.id, name: seq.name, steps };
  });

  return { services, interactions, sequences };
}
