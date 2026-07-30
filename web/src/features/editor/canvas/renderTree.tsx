import * as React from "react";
import type { DesignNode } from "@/types";
import { defFor } from "@/lib/nodeDefs";
import { stylesToTailwind, sizeStyle } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { useComponentDefs, resolveInstance } from "./componentDefs";

/** Pure, non-interactive render of a node subtree (used by thumbnails). */
export function StaticNode({ node }: { node: DesignNode }) {
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
    return <StaticNode node={resolved} />;
  }

  const def = defFor(node.type);
  const className = cn(stylesToTailwind(node.styles));
  const children = node.children.map((c) => (
    <StaticNode key={c.id} node={c} />
  ));
  return (
    <>
      {def.render({
        node,
        className,
        children,
        rootProps: { style: sizeStyle(node.styles) },
      })}
    </>
  );
}
