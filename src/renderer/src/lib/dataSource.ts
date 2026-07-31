import type {
  Binding,
  DataSource,
  RequestResult,
  SchemaField,
  SchemaFieldType,
} from "@/types";
import { ITEM_SOURCE, SCREEN_SOURCE } from "@/types";

/**
 * Execute a data source's request directly from the browser.
 * Since there's no backend/proxy, this works for CORS-enabled or public APIs;
 * a CORS/network failure is surfaced as a friendly error rather than throwing.
 */
export async function runRequest(ds: DataSource): Promise<RequestResult> {
  const headers: Record<string, string> = {};
  for (const h of ds.headers) {
    if (h.key.trim()) headers[h.key.trim()] = h.value;
  }
  if (ds.auth.type === "bearer" && ds.auth.token) {
    headers["Authorization"] = `Bearer ${ds.auth.token}`;
  }

  const init: RequestInit = { method: ds.method, headers };
  if (ds.method !== "GET" && ds.body && ds.body.trim()) {
    init.body = ds.body;
    if (!Object.keys(headers).some((k) => k.toLowerCase() === "content-type")) {
      headers["Content-Type"] = "application/json";
    }
  }

  const start = performance.now();
  const res = await fetch(ds.url, init);
  const text = await res.text();
  const timeMs = Math.round(performance.now() - start);

  return {
    status: res.status,
    ok: res.ok,
    timeMs,
    body: prettyIfJson(text),
    at: Date.now(),
  };
}

export function prettyIfJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function typeOf(value: unknown): SchemaFieldType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "number") return "number";
  if (t === "boolean") return "boolean";
  if (t === "object") return "object";
  return "string";
}

/**
 * Flatten parsed JSON into `path: type` fields. Arrays use `items[]` notation
 * and sample their first element. Depth-limited to keep schemas readable.
 */
export function inferSchema(json: unknown): SchemaField[] {
  const fields: SchemaField[] = [];
  const MAX_DEPTH = 4;

  const walk = (value: unknown, path: string, depth: number) => {
    const type = typeOf(value);
    if (path) fields.push({ path, type });
    if (depth >= MAX_DEPTH) return;

    if (type === "object" && value) {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        walk(v, path ? `${path}.${k}` : k, depth + 1);
      }
    } else if (type === "array") {
      const arr = value as unknown[];
      if (arr.length > 0) {
        walk(arr[0], `${path}[]`, depth + 1);
      }
    }
  };

  walk(json, "", 0);
  return fields;
}

/** Parse a response body string and infer its schema, or return null. */
/** A realistic sample value for a field, keyed on its name then its type. */
function mockValue(path: string, type: SchemaFieldType, i: number): unknown {
  const key = path.toLowerCase();
  if (type === "boolean") return i % 2 === 0;
  if (type === "number") {
    if (/price|amount|cost|total/.test(key)) return [19.99, 49, 8.5, 129, 12][i % 5];
    if (/id/.test(key)) return i + 1;
    if (/(rating|score|stars)/.test(key)) return [4.5, 3, 5, 4, 2][i % 5];
    return [12, 340, 7, 88, 1024][i % 5];
  }
  // string-ish defaults by name
  if (/email/.test(key)) return ["ada@example.com", "grace@example.com", "alan@example.com"][i % 3];
  if (/(^|\W)(name|author|user|customer)/.test(key))
    return ["Ada Lovelace", "Grace Hopper", "Alan Turing", "Katherine Johnson"][i % 4];
  if (/title|headline|product/.test(key))
    return ["Wireless Headphones", "Standing Desk", "Mechanical Keyboard", "Ceramic Mug"][i % 4];
  if (/desc|body|summary|content/.test(key))
    return "A short, realistic sample description for previewing your design.";
  if (/url|link|href/.test(key)) return "https://example.com";
  if (/image|img|avatar|photo|src/.test(key))
    return `https://picsum.photos/seed/${i + 1}/400/300`;
  if (/date|time|created|updated/.test(key)) return "2024-03-14";
  if (/status|state/.test(key)) return ["active", "pending", "archived"][i % 3];
  if (/(city|location|place)/.test(key)) return ["Austin", "Berlin", "Tokyo"][i % 3];
  return ["Alpha", "Bravo", "Charlie", "Delta"][i % 4];
}

/**
 * Generate a sample array of `count` objects from a schema's top-level scalar
 * fields, so designers can preview repeaters/bindings without a live API.
 */
export function generateMockData(
  schema: SchemaField[] | undefined,
  count = 4
): unknown {
  // Use top-level scalar fields; ignore nested (a.b) and array (a[].b) paths.
  const fields = (schema ?? []).filter(
    (f) => !f.path.includes(".") && !f.path.includes("[") && f.type !== "object" && f.type !== "array"
  );
  const cols =
    fields.length > 0
      ? fields
      : ([
          { path: "id", type: "number" },
          { path: "title", type: "string" },
          { path: "description", type: "string" },
        ] as SchemaField[]);
  return Array.from({ length: count }, (_, i) => {
    const row: Record<string, unknown> = {};
    for (const f of cols) row[f.path] = mockValue(f.path, f.type, i);
    return row;
  });
}

export function schemaFromBody(body: string): SchemaField[] | null {
  try {
    return inferSchema(JSON.parse(body));
  } catch {
    return null;
  }
}

/** The best-available parsed data for a source (constant data, or last API result). */
export function sourceData(ds: DataSource): unknown {
  const raw = ds.kind === "constant" ? ds.data : ds.lastResult?.body;
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** Read a value at a dotted path; `[]` selects the first array element. */
export function readPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  let cur: any = obj;
  for (const rawKey of path.split(".")) {
    if (cur == null) return undefined;
    const key = rawKey.replace(/\[\]$/, "");
    if (key) cur = cur[key];
    if (rawKey.endsWith("[]")) {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[0];
    }
  }
  return cur;
}

/** Resolve a binding to a display string for the canvas preview. */
export function resolveBinding(
  ds: DataSource | undefined,
  path: string
): string | undefined {
  if (!ds) return undefined;
  const value = readPath(sourceData(ds), path);
  if (value == null) return undefined;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Context for resolving bindings that may reference $item / $screen. */
export interface BindingContext {
  sources: DataSource[];
  screenSourceId?: string;
  item?: unknown;
}

/** The DataSource a binding points at (following $screen), if any. */
export function bindingSource(
  binding: Binding,
  ctx: BindingContext
): DataSource | undefined {
  const id =
    binding.sourceId === SCREEN_SOURCE ? ctx.screenSourceId : binding.sourceId;
  if (!id) return undefined;
  return ctx.sources.find((d) => d.id === id);
}

/** Raw value for a binding within a resolution context. */
export function resolveBindingValue(
  binding: Binding,
  ctx: BindingContext
): unknown {
  if (binding.sourceId === ITEM_SOURCE) return readPath(ctx.item, binding.path);
  const ds = bindingSource(binding, ctx);
  if (!ds) return undefined;
  return readPath(sourceData(ds), binding.path);
}

/** Display string for a binding within a context (for the canvas preview). */
export function resolveBindingDisplay(
  binding: Binding,
  ctx: BindingContext
): string | undefined {
  const v = resolveBindingValue(binding, ctx);
  if (v == null) return undefined;
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}

/** Resolve a repeater binding to an array (empty if not an array). */
export function resolveArray(binding: Binding, ctx: BindingContext): unknown[] {
  const v = resolveBindingValue(binding, ctx);
  return Array.isArray(v) ? v : [];
}

/** Schema fields under an array path's item shape (for $item field pickers). */
export function itemFields(
  ds: DataSource | undefined,
  arrayPath: string
): SchemaField[] {
  if (!ds?.schema) return [];
  const prefix = arrayPath.endsWith("[]") ? arrayPath : `${arrayPath}[]`;
  return ds.schema
    .filter((f) => f.path.startsWith(prefix + "."))
    .map((f) => ({ path: f.path.slice(prefix.length + 1), type: f.type }));
}
