import type {
  ArchInteraction,
  ArchService,
  DesignNode,
  Project,
  Screen,
  SequenceDiagram,
} from "@/types";
import { uid } from "@/lib/utils";

const esc = (s: string) => s.replace(/"/g, "'");

/** mermaid node text by service kind (shape encodes the kind). */
function serviceNode(s: ArchService): string {
  const t = `"${esc(s.name)}"`;
  switch (s.kind) {
    case "frontend":
      return `${s.id}([${t}])`;
    case "database":
      return `${s.id}[(${t})]`;
    case "external":
      return `${s.id}{{${t}}}`;
    case "queue":
      return `${s.id}[/${t}/]`;
    default:
      return `${s.id}[${t}]`;
  }
}

export function serviceMapMermaid(
  services: ArchService[],
  interactions: ArchInteraction[]
): string {
  if (services.length === 0) return "flowchart LR\n  empty[No services yet]";
  const lines = ["flowchart LR"];
  for (const s of services) lines.push(`  ${serviceNode(s)}`);
  for (const it of interactions) {
    if (!services.some((s) => s.id === it.from)) continue;
    if (!services.some((s) => s.id === it.to)) continue;
    lines.push(
      it.label
        ? `  ${it.from} -->|"${esc(it.label)}"| ${it.to}`
        : `  ${it.from} --> ${it.to}`
    );
  }
  return lines.join("\n");
}

/** Stable, mermaid-safe alias for a participant name. */
function aliasOf(name: string, map: Map<string, string>): string {
  if (map.has(name)) return map.get(name)!;
  const base = "p" + (map.size + 1);
  map.set(name, base);
  return base;
}

export function sequenceMermaid(seq: SequenceDiagram): string {
  const lines = ["sequenceDiagram", "  autonumber"];
  const alias = new Map<string, string>();
  const order: string[] = [];
  for (const st of seq.steps) {
    for (const n of [st.from, st.to])
      if (n && !order.includes(n)) order.push(n);
  }
  if (order.length === 0) return "sequenceDiagram\n  participant A as (empty)";
  for (const name of order) lines.push(`  participant ${aliasOf(name, alias)} as ${esc(name)}`);
  for (const st of seq.steps) {
    if (!st.from || !st.to) continue;
    const a = aliasOf(st.from, alias);
    const b = aliasOf(st.to, alias);
    const arrow = st.type === "response" ? "-->>" : st.type === "async" ? "-)" : "->>";
    lines.push(`  ${a}${arrow}${b}: ${esc(st.message || "")}`);
  }
  return lines.join("\n");
}

/** External services derived from API data sources (deduped by name). */
export function deriveServices(project: Project): ArchService[] {
  const out: ArchService[] = [];
  const existing = new Set(
    project.architecture.services.map((s) => s.name.toLowerCase())
  );
  for (const ds of project.dataSources ?? []) {
    if (ds.kind !== "api") continue;
    if (existing.has(ds.name.toLowerCase())) continue;
    existing.add(ds.name.toLowerCase());
    out.push({ id: uid("svc"), name: ds.name, kind: "external" });
  }
  return out;
}

function collectButtons(node: DesignNode, acc: DesignNode[]) {
  if (node.type === "Button" && node.action && node.action.type !== "none")
    acc.push(node);
  node.children.forEach((c) => collectButtons(c, acc));
}

/** A sequence generated from a screen's CTA→navigate/request actions. */
export function deriveSequence(
  screen: Screen,
  project: Project
): SequenceDiagram {
  const steps: SequenceDiagram["steps"] = [];
  const push = (
    from: string,
    to: string,
    message: string,
    type: "sync" | "async" | "response" = "sync"
  ) => steps.push({ id: uid("step"), from, to, message, type });

  const buttons: DesignNode[] = [];
  collectButtons(screen.root, buttons);

  if (buttons.length === 0) {
    push("User", "Web App", `Open ${screen.name}`);
  } else {
    for (const b of buttons) {
      const label = b.props.label || "button";
      push("User", "Web App", `Tap “${label}”`);
      const a = b.action!;
      if (a.type === "navigate") {
        const target = project.screens.find((s) => s.id === a.targetScreenId);
        push("Web App", "Web App", `Navigate to ${target?.name ?? "screen"}`);
      } else if (a.type === "request") {
        const ds = (project.dataSources ?? []).find(
          (d) => d.id === a.dataSourceId
        );
        const svc = ds?.name ?? "API";
        push("Web App", svc, `${ds?.method ?? "GET"} request`);
        push(svc, "Web App", "200 OK", "response");
      }
    }
  }

  return { id: uid("seq"), name: `${screen.name} flow`, steps };
}

/** Markdown doc bundling the service map + all sequences as mermaid blocks. */
export function architectureMarkdown(project: Project): string {
  const a = project.architecture;
  const parts = [`# ${project.name} — Architecture\n`];
  parts.push("## Service map\n");
  parts.push(
    "```mermaid\n" + serviceMapMermaid(a.services, a.interactions) + "\n```\n"
  );
  if (a.sequences.length) {
    parts.push("## Sequence diagrams\n");
    for (const seq of a.sequences) {
      parts.push(`### ${seq.name}\n`);
      parts.push("```mermaid\n" + sequenceMermaid(seq) + "\n```\n");
    }
  }
  return parts.join("\n");
}
