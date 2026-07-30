import type {
  Binding,
  ComponentDefinition,
  DataSource,
  DesignNode,
  Project,
  Screen,
} from "@/types";
import { ITEM_SOURCE, SCREEN_SOURCE } from "@/types";
import { responsiveClasses } from "@/lib/styles";
import { resolveInstanceTree } from "@/lib/instance";
import { defFor, type ImportSpec } from "@/lib/nodeDefs";

const INDENT = "  ";

/** Which prop supplies a node's inner text (for binding as `{expr}`). */
const TEXT_PROP: Partial<Record<string, string>> = {
  Heading: "content",
  Text: "content",
  Link: "content",
  Button: "label",
  Badge: "label",
};

function pascalCase(input: string): string {
  const cleaned = input.replace(/[^a-zA-Z0-9]+/g, " ").trim();
  const pascal = cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  return /^[A-Za-z]/.test(pascal) ? pascal : `Screen${pascal}`;
}

function sanitizeVar(input: string): string {
  const s = input
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return s || "src";
}

function jsxText(text: string): string {
  if (/[{}<>]/.test(text)) return `{${JSON.stringify(text)}}`;
  return text;
}

/** `items[].name` -> `data_x?.items?.[0]?.name` */
function pathToExpr(varName: string, path: string): string {
  if (!path) return varName;
  let expr = varName;
  for (const seg of path.split(".")) {
    const key = seg.replace(/\[\]$/, "");
    if (key) expr += `?.${key}`;
    if (seg.endsWith("[]")) expr += `?.[0]`;
  }
  return expr;
}

function mergeImports(specs: ImportSpec[]): string[] {
  const byModule = new Map<string, Set<string>>();
  for (const spec of specs) {
    if (!byModule.has(spec.from)) byModule.set(spec.from, new Set());
    spec.names.forEach((n) => byModule.get(spec.from)!.add(n));
  }
  const lines: string[] = [];
  for (const mod of [...byModule.keys()].sort()) {
    const names = [...byModule.get(mod)!].sort().join(", ");
    lines.push(`import { ${names} } from "${mod}";`);
  }
  return lines;
}

interface Ctx {
  project?: Project;
  screens: Screen[];
  screenSourceId?: string;
  /** sourceId -> { varName, ds } for sources referenced on this page. */
  varMap: Map<string, { varName: string; ds: DataSource }>;
  /** Design-system component definitions, for resolving instances. */
  components: ComponentDefinition[];
  /** defId -> { name, def } for definitions used (emitted as local components). */
  usedDefs: Map<string, { name: string; def: ComponentDefinition }>;
  /** Reserved component/function names (avoids collisions). */
  defNames: Set<string>;
  /** Component-file export only: `${nodeId}@${prop}` -> React prop name. */
  slotProps?: Map<string, string>;
  /** Filled during walk: prop name -> default literal, for the typed signature. */
  usedSlotProps?: Map<string, string>;
}

/** Effective real source id for a binding (resolving $screen; $item → null). */
function effectiveSourceId(b: Binding, ctx: Ctx): string | null {
  if (b.sourceId === ITEM_SOURCE) return null;
  if (b.sourceId === SCREEN_SOURCE) return ctx.screenSourceId ?? null;
  return b.sourceId;
}

function buildVarMap(node: DesignNode, ctx: Ctx) {
  const used = new Set<string>();
  const collect = (n: DesignNode) => {
    if (n.bindings)
      for (const b of Object.values(n.bindings)) {
        const id = effectiveSourceId(b, ctx);
        if (id) used.add(id);
      }
    if (n.repeat) {
      const id = effectiveSourceId(n.repeat, ctx);
      if (id) used.add(id);
    }
    if (n.action?.dataSourceId) used.add(n.action.dataSourceId);
    n.children.forEach(collect);
  };
  collect(node);
  const seen = new Set<string>();
  for (const id of used) {
    const ds = ctx.project?.dataSources?.find((d) => d.id === id);
    if (!ds) continue;
    let base = "data_" + sanitizeVar(ds.name);
    let name = base;
    let i = 2;
    while (seen.has(name)) name = `${base}${i++}`;
    seen.add(name);
    ctx.varMap.set(id, { varName: name, ds });
  }
}

interface WalkResult {
  lines: string[];
  imports: ImportSpec[];
}

function bindingExpr(b: Binding, ctx: Ctx): string | null {
  if (b.sourceId === ITEM_SOURCE) return pathToExpr("item", b.path);
  const id = effectiveSourceId(b, ctx);
  if (!id) return null;
  const entry = ctx.varMap.get(id);
  if (!entry) return null;
  return pathToExpr(entry.varName, b.path);
}

/** Register a component definition for emission and return its function name. */
function registerDef(def: ComponentDefinition, ctx: Ctx): string {
  const existing = ctx.usedDefs.get(def.id);
  if (existing) return existing.name;
  let base = pascalCase(def.name);
  if (!/^[A-Z]/.test(base)) base = "Comp" + base;
  let name = base;
  let i = 2;
  while (ctx.defNames.has(name)) name = `${base}${i++}`;
  ctx.defNames.add(name);
  ctx.usedDefs.set(def.id, { name, def });
  return name;
}

function walk(node: DesignNode, depth: number, ctx: Ctx): WalkResult {
  // Instances render as a reference to a locally-emitted component. A customized
  // instance (variant and/or prop overrides) inlines its resolved subtree so the
  // export matches what's on the canvas.
  if (node.instanceOf) {
    const pad = INDENT.repeat(depth);
    const def = ctx.components.find((c) => c.id === node.instanceOf);
    if (!def) return { lines: [`${pad}{/* missing component */}`], imports: [] };
    const variant = node.variant
      ? def.variants?.find((v) => v.id === node.variant)
      : undefined;
    const hasOverrides = !!node.overrides && Object.keys(node.overrides).length > 0;
    if (variant || hasOverrides) {
      const resolved = resolveInstanceTree(def, node);
      return walk(resolved, depth, ctx);
    }
    const name = registerDef(def, ctx);
    return { lines: [`${pad}<${name} />`], imports: [] };
  }

  const def = defFor(node.type);
  const spec = def.codegen(node);
  const imports: ImportSpec[] = [...spec.imports];

  const styleClasses = responsiveClasses(node.styles, node.responsive);
  const className = [styleClasses, spec.extraClass].filter(Boolean).join(" ");

  const attrs = [...spec.attrs];
  const bindings = node.bindings ?? {};
  const textProp = TEXT_PROP[node.type];
  const repeated = !!node.repeat;

  // Text binding -> replace literal with a data expression.
  let textExpr: string | null = null;
  if (textProp && bindings[textProp]) {
    textExpr = bindingExpr(bindings[textProp], ctx);
  }

  // Attribute bindings (e.g. Image src) -> `prop={expr}`.
  for (const [prop, b] of Object.entries(bindings)) {
    if (prop === textProp) continue;
    const expr = bindingExpr(b, ctx);
    if (!expr) continue;
    const idx = attrs.findIndex((a) => a.startsWith(`${prop}=`));
    if (idx >= 0) attrs.splice(idx, 1);
    attrs.push(`${prop}={${expr}}`);
  }

  // Action -> onClick handler.
  if (node.action && node.action.type !== "none") {
    if (node.action.type === "navigate" && node.action.targetScreenId) {
      const target = ctx.screens.find(
        (s) => s.id === node.action!.targetScreenId
      );
      attrs.push(`onClick={() => goTo("${target ? target.name : "Screen"}")}`);
    } else if (node.action.type === "request" && node.action.dataSourceId) {
      const entry = ctx.varMap.get(node.action.dataSourceId);
      if (entry) attrs.push(`onClick={() => call_${entry.varName.slice(5)}()}`);
    }
  }

  // Accessibility authoring: generic aria-label / role on any node.
  const ariaLabel =
    typeof node.props.ariaLabel === "string" ? node.props.ariaLabel.trim() : "";
  if (ariaLabel) attrs.push(`aria-label="${ariaLabel.replace(/"/g, "&quot;")}"`);
  const role = typeof node.props.role === "string" ? node.props.role.trim() : "";
  if (role) attrs.push(`role="${role.replace(/"/g, "&quot;")}"`);

  if (repeated) attrs.push(`key={i}`);
  if (className) attrs.push(`className="${className}"`);
  const attrStr = attrs.length ? " " + attrs.join(" ") : "";

  // Repeater shifts the element one level deeper (inside the .map arrow).
  const elDepth = repeated ? depth + 1 : depth;
  const pad = INDENT.repeat(elDepth);
  const el: string[] = [];

  if (spec.selfClosing) {
    el.push(`${pad}<${spec.tag}${attrStr} />`);
  } else if (spec.innerJSX) {
    el.push(`${pad}<${spec.tag}${attrStr}>`);
    for (const inner of spec.innerJSX.split("\n"))
      el.push(`${pad}${INDENT}${inner}`);
    el.push(`${pad}</${spec.tag}>`);
  } else if ((textExpr != null || spec.text != null) && node.children.length === 0) {
    // Component-file export: swap the literal text for a typed prop reference.
    const slotName =
      textExpr == null && textProp
        ? ctx.slotProps?.get(`${node.id}@${textProp}`)
        : undefined;
    let inner: string;
    if (slotName) {
      ctx.usedSlotProps?.set(slotName, spec.text ?? "");
      inner = `{${slotName}}`;
    } else {
      inner = textExpr != null ? `{${textExpr}}` : jsxText(spec.text!);
    }
    el.push(`${pad}<${spec.tag}${attrStr}>${inner}</${spec.tag}>`);
  } else if (node.children.length === 0) {
    el.push(`${pad}<${spec.tag}${attrStr} />`);
  } else {
    el.push(`${pad}<${spec.tag}${attrStr}>`);
    for (const child of node.children) {
      if (child.hidden) continue; // hidden nodes are omitted from export
      const res = walk(child, elDepth + 1, ctx);
      el.push(...res.lines);
      imports.push(...res.imports);
    }
    el.push(`${pad}</${spec.tag}>`);
  }

  if (!repeated) return { lines: el, imports };

  // Wrap in `{(arr ?? []).map((item, i) => ( … ))}`.
  const outer = INDENT.repeat(depth);
  const arrExpr = bindingExpr(node.repeat!, ctx) ?? "[]";
  const lines = [
    `${outer}{(${arrExpr} ?? []).map((item, i) => (`,
    ...el,
    `${outer}))}`,
  ];
  return { lines, imports };
}

/** Emit the data hooks / constants / request handlers used on the page. */
function buildDataBlock(ctx: Ctx): { lines: string[]; usesReactHooks: boolean } {
  const lines: string[] = [];
  let usesReactHooks = false;

  for (const { varName, ds } of ctx.varMap.values()) {
    if (ds.kind === "constant") {
      let obj = "{}";
      try {
        obj = JSON.stringify(JSON.parse(ds.data || "{}"), null, 2)
          .split("\n")
          .map((l, i) => (i === 0 ? l : INDENT + l))
          .join("\n");
      } catch {
        /* keep {} */
      }
      lines.push(`${INDENT}const ${varName} = ${obj};`);
    } else {
      usesReactHooks = true;
      const setter = "set" + varName.charAt(0).toUpperCase() + varName.slice(1);
      lines.push(`${INDENT}const [${varName}, ${setter}] = useState<any>(null);`);
      lines.push(`${INDENT}useEffect(() => {`);
      lines.push(
        `${INDENT}${INDENT}fetch(${JSON.stringify(ds.url)})`
      );
      lines.push(`${INDENT}${INDENT}${INDENT}.then((r) => r.json())`);
      lines.push(`${INDENT}${INDENT}${INDENT}.then(${setter});`);
      lines.push(`${INDENT}}, []);`);
    }
  }

  return { lines, usesReactHooks };
}

/** True if any node in the tree has a request action targeting `id`. */
function actionRequestSources(node: DesignNode, ctx: Ctx): Set<string> {
  const ids = new Set<string>();
  const walkA = (n: DesignNode) => {
    if (n.action?.type === "request" && n.action.dataSourceId)
      ids.add(n.action.dataSourceId);
    if (n.action?.type === "navigate") ids.add("__navigate__");
    n.children.forEach(walkA);
  };
  walkA(node);
  return ids;
}

function buildHandlers(node: DesignNode, ctx: Ctx): string[] {
  const ids = actionRequestSources(node, ctx);
  const lines: string[] = [];
  if (ids.has("__navigate__")) {
    lines.push(
      `${INDENT}function goTo(screen: string) {`,
      `${INDENT}${INDENT}// wire this to your router`,
      `${INDENT}${INDENT}console.log("navigate to", screen);`,
      `${INDENT}}`
    );
  }
  for (const id of ids) {
    if (id === "__navigate__") continue;
    const entry = ctx.varMap.get(id);
    if (!entry) continue;
    const fn = "call_" + entry.varName.slice(5);
    const ds = entry.ds;
    const opts =
      ds.method === "GET"
        ? JSON.stringify(ds.url)
        : `${JSON.stringify(ds.url)}, { method: ${JSON.stringify(
            ds.method
          )}, headers: { "Content-Type": "application/json" }${
            ds.body ? `, body: ${JSON.stringify(ds.body)}` : ""
          } }`;
    lines.push(
      `${INDENT}async function ${fn}() {`,
      `${INDENT}${INDENT}const res = await fetch(${opts});`,
      `${INDENT}${INDENT}return res.json();`,
      `${INDENT}}`
    );
  }
  return lines;
}

/**
 * Emit a local React component for each design-system definition used on the
 * page (including nested ones discovered while emitting). Instances reference
 * these, so the exported code mirrors the component architecture.
 */
function buildComponentDefs(ctx: Ctx): { fns: string[]; imports: ImportSpec[] } {
  const fns: string[] = [];
  const imports: ImportSpec[] = [];
  const processed = new Set<string>();
  // usedDefs can grow while walking a definition's root (nested instances).
  let pending = [...ctx.usedDefs.values()];
  while (pending.length) {
    const entry = pending.shift()!;
    if (processed.has(entry.def.id)) continue;
    processed.add(entry.def.id);
    const res = walk(entry.def.root, 2, ctx);
    imports.push(...res.imports);
    fns.push(
      `function ${entry.name}() {\n` +
        `${INDENT}return (\n` +
        res.lines.join("\n") +
        `\n${INDENT});\n}\n`
    );
    pending = [...ctx.usedDefs.values()].filter((v) => !processed.has(v.def.id));
  }
  return { fns, imports };
}

function assemble(
  fnKeyword: string,
  fnName: string,
  node: DesignNode,
  ctx: Ctx,
  metaBlock = ""
): string {
  ctx.defNames.add(fnName);
  const { lines, imports } = walk(node, 3, ctx);
  // Component definitions used by any instances (emitted before the page fn).
  const comps = buildComponentDefs(ctx);
  const data = buildDataBlock(ctx);
  const handlers = buildHandlers(node, ctx);
  const importBlock = mergeImports([...imports, ...comps.imports]);

  const reactImport = data.usesReactHooks
    ? `import { useEffect, useState } from "react";\n`
    : "";
  const header =
    reactImport +
    (importBlock.length ? importBlock.join("\n") + "\n" : "") +
    (reactImport || importBlock.length ? "\n" : "");

  const body: string[] = [];
  if (data.lines.length) body.push(...data.lines, "");
  if (handlers.length) body.push(...handlers, "");
  body.push(`${INDENT}return (`);
  body.push(...lines);
  body.push(`${INDENT});`);

  const compBlock = comps.fns.length ? comps.fns.join("\n") + "\n" : "";

  // Typed props signature for parameterized component files (B4-3).
  let params = "";
  if (ctx.usedSlotProps && ctx.usedSlotProps.size) {
    const names = [...ctx.usedSlotProps.entries()];
    const destructure = names
      .map(([name, def]) => `${name} = ${JSON.stringify(def)}`)
      .join(", ");
    const types = names.map(([name]) => `${name}?: string`).join("; ");
    params = `{ ${destructure} }: { ${types} }`;
  }

  return (
    `${header}${compBlock}${metaBlock}export ${fnKeyword} ${fnName}(${params}) {\n` +
    body.join("\n") +
    `\n}\n`
  );
}

/** `export const metadata = { … }` for a page (Next.js-style; harmless elsewhere). */
function pageMetaBlock(screen: Screen): string {
  const entries = [`title: ${JSON.stringify(screen.title || screen.name)}`];
  if (screen.description) entries.push(`description: ${JSON.stringify(screen.description)}`);
  if (screen.path) entries.push(`path: ${JSON.stringify(screen.path)}`);
  return `export const metadata = {\n${INDENT}${entries.join(`,\n${INDENT}`)},\n};\n\n`;
}

function makeCtx(
  screens: Screen[],
  project: Project | undefined,
  node: DesignNode,
  screenSourceId?: string
): Ctx {
  const ctx: Ctx = {
    project,
    screens,
    screenSourceId,
    varMap: new Map(),
    components: project?.designSystem?.components ?? [],
    usedDefs: new Map(),
    defNames: new Set(),
  };
  buildVarMap(node, ctx);
  return ctx;
}

/** Full page component for a screen. */
export function generatePageCode(screen: Screen, project?: Project): string {
  const fnName = pascalCase(screen.name) + "Page";
  const ctx = makeCtx(
    project?.screens ?? [screen],
    project,
    screen.root,
    screen.dataSourceId
  );
  return assemble("default function", fnName, screen.root, ctx, pageMetaBlock(screen));
}

/** Self-contained snippet for a single selected node/subtree. */
export function generateComponentCode(
  node: DesignNode,
  project?: Project,
  screenSourceId?: string
): string {
  const compName = pascalCase(node.name || node.type);
  const ctx = makeCtx(project?.screens ?? [], project, node, screenSourceId);
  // Expose each text-bearing node as a typed React prop (default = its text).
  ctx.slotProps = new Map();
  ctx.usedSlotProps = new Map();
  assignSlotProps(node, ctx.slotProps);
  return assemble("function", compName, node, ctx);
}

/** Assign a unique React prop name to every text-bearing node in a subtree. */
function assignSlotProps(node: DesignNode, out: Map<string, string>): void {
  const used = new Set<string>();
  const camel = (s: string) =>
    s
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .map((w, i) =>
        i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      )
      .join("") || "text";
  const walkAssign = (n: DesignNode) => {
    const prop = TEXT_PROP[n.type];
    if (prop && typeof n.props?.[prop] === "string" && n.props[prop]) {
      let base = camel(n.name || `${n.type} ${prop}`);
      if (!/^[a-z]/i.test(base)) base = "text" + base;
      let name = base;
      let i = 2;
      while (used.has(name)) name = `${base}${i++}`;
      used.add(name);
      out.set(`${n.id}@${prop}`, name);
    }
    for (const c of n.children ?? []) walkAssign(c);
  };
  walkAssign(node);
}
