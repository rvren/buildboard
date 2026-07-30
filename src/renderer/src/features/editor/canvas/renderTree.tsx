import * as React from "react";
import type { DesignNode } from "@/types";
import { defFor } from "@/lib/nodeDefs";
import {
  stylesToTailwind,
  sizeStyle,
  effectiveTokens,
  type ActiveBreakpoint,
} from "@/lib/styles";
import { cn } from "@/lib/utils";
import { useComponentDefs, resolveInstance } from "./componentDefs";

/**
 * Pure, non-interactive render of a node subtree (thumbnails, static HTML export,
 * responsive preview). `bp` applies the responsive cascade for that breakpoint —
 * default "base" (the design styles).
 */
export function StaticNode({
  node,
  bp = "base",
}: {
  node: DesignNode;
  bp?: ActiveBreakpoint;
}) {
  const defs = useComponentDefs();

  // Instances render through their design-system definition.
  if (node.instanceOf) {
    const resolved = resolveInstance(node, defs);
    if (!resolved)
      return (
        <span className="text-xs text-muted-foreground/60">
          missing component
        </span>
      );
    return <StaticNode node={resolved} bp={bp} />;
  }

  const def = defFor(node.type);
  const eff = effectiveTokens(node, bp);
  const className = cn(stylesToTailwind(eff));
  const children = node.children
    .filter((c) => !c.hidden)
    .map((c) => <StaticNode key={c.id} node={c} bp={bp} />);
  return (
    <>
      {def.render({
        node,
        className,
        children,
        rootProps: { style: sizeStyle(eff) },
      })}
    </>
  );
}
