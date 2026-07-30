import type { DesignNode, Project } from "@/types";

// Accessibility audit: walk every screen's node tree and flag common a11y
// problems before the project is exported to real code. Pure + read-only.

export interface A11yIssue {
  screenId: string;
  screenName: string;
  nodeId: string;
  severity: "error" | "warning";
  message: string;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function auditScreen(
  root: DesignNode,
  screenId: string,
  screenName: string
): A11yIssue[] {
  const issues: A11yIssue[] = [];
  let lastHeadingLevel = 0;

  const push = (nodeId: string, severity: A11yIssue["severity"], message: string) =>
    issues.push({ screenId, screenName, nodeId, severity, message });

  const walk = (node: DesignNode) => {
    if (node.hidden) return; // hidden nodes aren't exported
    const p = node.props ?? {};
    switch (node.type) {
      case "Image":
        if (!str(p.alt)) push(node.id, "error", "Image is missing alt text");
        break;
      case "Heading": {
        if (!str(p.content)) push(node.id, "error", "Heading is empty");
        const level = Number(p.level) || 1;
        if (lastHeadingLevel && level > lastHeadingLevel + 1) {
          push(
            node.id,
            "warning",
            `Heading jumps from h${lastHeadingLevel} to h${level} (skips a level)`
          );
        }
        lastHeadingLevel = level;
        break;
      }
      case "Text":
        if (!str(p.content)) push(node.id, "warning", "Text element is empty");
        break;
      case "Button":
        if (!str(p.label)) push(node.id, "error", "Button has no label");
        break;
      case "Link":
        if (!str(p.content)) push(node.id, "error", "Link has no visible text");
        if (!str(p.href)) push(node.id, "warning", "Link has no href");
        break;
      case "Input":
      case "Textarea":
        if (!str(p.placeholder))
          push(node.id, "warning", `${node.type} has no placeholder or label`);
        break;
    }
    for (const c of node.children ?? []) walk(c);
  };

  walk(root);
  return issues;
}

/** Audit every screen in a project. Instances render through their definition,
 *  so only page trees are walked (definitions are audited via their instances). */
export function auditProject(project: Project): A11yIssue[] {
  const out: A11yIssue[] = [];
  for (const screen of project.screens) {
    out.push(...auditScreen(screen.root, screen.id, screen.name));
  }
  return out;
}
