import type { ComponentDefinition } from "@/types";
import { useEditor } from "@/store/editorStore";
import { tokenStyle } from "@/lib/designSystem";
import { NodeRenderer } from "./NodeRenderer";
import { ComponentDefsProvider } from "./componentDefs";

/**
 * The artboard shown while editing a design-system component. Renders the
 * definition's root through the normal NodeRenderer, so the full Insert /
 * Properties toolchain edits it (mutators route to the def root via the store's
 * `editingComponentId`). Every instance on every screen updates in step.
 */
export function ComponentFrame({
  definition,
}: {
  definition: ComponentDefinition;
}) {
  const tokens = useEditor((s) => s.currentProject()?.designSystem.tokens);
  const components = useEditor(
    (s) => s.currentProject()?.designSystem.components
  );
  const setSelected = useEditor((s) => s.setSelected);

  return (
    <div
      className="rounded-xl bg-white p-10 ring-1 ring-border shadow-soft dark:bg-card"
      onClick={() => setSelected(null)}
    >
      <div style={tokens ? tokenStyle(tokens) : undefined}>
        <ComponentDefsProvider components={components ?? []}>
          <NodeRenderer node={definition.root} isRoot />
        </ComponentDefsProvider>
      </div>
    </div>
  );
}
