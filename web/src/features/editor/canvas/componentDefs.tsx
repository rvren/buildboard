import * as React from "react";
import type { ComponentDefinition, DesignNode } from "@/types";

/**
 * Design-system component definitions in scope for the tree currently being
 * rendered. Providers: ScreenFrame (canvas), MiniPreview (thumbnails), and the
 * Design System gallery. Instances (`node.instanceOf`) resolve through this.
 */
export const ComponentDefsContext = React.createContext<ComponentDefinition[]>(
  []
);

export function useComponentDefs(): ComponentDefinition[] {
  return React.useContext(ComponentDefsContext);
}

export function ComponentDefsProvider({
  components,
  children,
}: {
  components: ComponentDefinition[];
  children: React.ReactNode;
}) {
  return (
    <ComponentDefsContext.Provider value={components}>
      {children}
    </ComponentDefsContext.Provider>
  );
}

/**
 * Resolve an instance node to the definition's root with its overrides applied.
 * Returns null when the definition is missing (deleted/dangling).
 */
export function resolveInstance(
  node: DesignNode,
  defs: ComponentDefinition[]
): DesignNode | null {
  if (!node.instanceOf) return null;
  const def = defs.find((c) => c.id === node.instanceOf);
  if (!def) return null;
  return {
    ...def.root,
    props: { ...def.root.props, ...(node.overrides ?? {}) },
  };
}
