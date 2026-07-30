import { useState } from "react";
import {
  MousePointer2,
  Copy,
  Trash2,
  Link2,
  Link2Off,
  Zap,
  Repeat,
  List,
  Database,
  Bookmark,
  FileText,
  ChevronRight,
  Component as ComponentIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { DesignNode, NodeAction, SchemaField, Screen } from "@/types";
import { ITEM_SOURCE, SCREEN_SOURCE } from "@/types";
import { defFor } from "@/lib/nodeDefs";
import { effectiveTokens } from "@/lib/styles";
import { findNode, findParent, findPath, findRepeatAncestor } from "@/lib/tree";
import { itemFields } from "@/lib/dataSource";
import { useEditor } from "@/store/editorStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Section,
  Row,
  Segmented,
  Stepper,
  Dropdown,
  TextControl,
  ColorControl,
} from "./controls";

export function PropertiesPanel() {
  const root = useEditor((s) => s.currentRoot());
  const selectedId = useEditor((s) => s.selectedNodeId);
  const editingComponentId = useEditor((s) => s.editingComponentId);
  const currentScreen = useEditor((s) => s.currentScreen());
  const node = root && selectedId ? findNode(root, selectedId) : null;

  if (node?.type === "Instance") return <InstanceProps node={node} />;

  // Nothing selected: show page settings for the current screen (or, when
  // editing a component, its variants); otherwise the empty state.
  if (!node && !editingComponentId) {
    return currentScreen ? <PageSettings screen={currentScreen} /> : <EmptyProps />;
  }

  return (
    <div className="flex h-full flex-col">
      {node ? (
        <NodeHeader node={node} />
      ) : (
        <div className="flex items-center gap-2 border-b px-3.5 py-2.5 text-sm font-medium">
          <ComponentIcon className="h-3.5 w-3.5 text-primary" />
          Component
        </div>
      )}
      {node && <SelectionBreadcrumb node={node} />}
      <ScrollArea className="flex-1">
        {editingComponentId && <VariantsManager defId={editingComponentId} />}
        {node && (
          <>
            <ScreenDataSection node={node} />
            <ContentSection node={node} />
            <RepeatSection node={node} />
            <LayoutSection node={node} />
            <SizeSection node={node} />
            <SpacingSection node={node} />
            <TypographySection node={node} />
            <AppearanceSection node={node} />
          </>
        )}
      </ScrollArea>
    </div>
  );
}

/** Author named variants on a component definition (captures the root's styles). */
function VariantsManager({ defId }: { defId: string }) {
  const project = useEditor((s) => s.currentProject());
  const rootNode = useEditor((s) => s.currentRoot());
  const addVariant = useEditor((s) => s.addComponentVariant);
  const deleteVariant = useEditor((s) => s.deleteComponentVariant);
  const [name, setName] = useState("");
  const def = project?.designSystem.components.find((c) => c.id === defId);
  if (!def) return null;
  const variants = def.variants ?? [];
  const save = () => {
    const n = name.trim();
    if (!n || !rootNode) return;
    addVariant(defId, n, rootNode.styles);
    setName("");
  };
  return (
    <Section title="Variants">
      <p className="px-0.5 pb-2 text-[11px] text-muted-foreground">
        Save the root's current styles as a named variant. Instances can then pick
        one (exported as its own Tailwind).
      </p>
      {variants.length > 0 && (
        <div className="mb-2 flex flex-col gap-1">
          {variants.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
            >
              <span className="min-w-0 flex-1 truncate">{v.name}</span>
              <button
                type="button"
                onClick={() => deleteVariant(defId, v.id)}
                className="text-muted-foreground transition-colors hover:text-destructive"
                title="Delete variant"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Variant name"
          className="h-7 min-w-0 flex-1 rounded-md border bg-transparent px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={save}
          disabled={!name.trim()}
        >
          Save styles
        </Button>
      </div>
    </Section>
  );
}

/** Properties for a design-system component instance: link to definition + root overrides. */
function InstanceProps({ node }: { node: DesignNode }) {
  const project = useEditor((s) => s.currentProject());
  const editComponent = useEditor((s) => s.editComponent);
  const setEditorView = useEditor((s) => s.setEditorView);
  const deleteNode = useEditor((s) => s.deleteNode);
  const setInstanceOverride = useEditor((s) => s.setInstanceOverride);
  const setInstanceVariant = useEditor((s) => s.setInstanceVariant);
  const def = project?.designSystem.components.find(
    (c) => c.id === node.instanceOf
  );
  const variants = def?.variants ?? [];
  const rootProps = def?.root.props ?? {};
  const OVERRIDABLE = ["content", "label", "placeholder", "alt", "fallback"];
  const keys = OVERRIDABLE.filter((k) => k in rootProps);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-3.5 py-2.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <ComponentIcon className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {def?.name ?? "Component"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          title="Remove instance"
          onClick={() => deleteNode(node.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <Section title="Component">
          <p className="px-0.5 pb-2 text-[11px] text-muted-foreground">
            This is an instance. Editing the component updates it and every other
            place it's used.
          </p>
          {def && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-full"
              onClick={() => {
                editComponent(def.id);
                setEditorView("design");
              }}
            >
              <ComponentIcon className="h-3.5 w-3.5" />
              Edit “{def.name}”
            </Button>
          )}
        </Section>
        {variants.length > 0 && (
          <Section title="Variant">
            <div className="flex flex-wrap gap-1">
              {[{ id: null as string | null, name: "Default" }, ...variants].map(
                (v) => {
                  const active = (node.variant ?? null) === v.id;
                  return (
                    <button
                      key={v.id ?? "__default"}
                      type="button"
                      onClick={() => setInstanceVariant(node.id, v.id)}
                      className={
                        "rounded-md border px-2 py-1 text-xs transition-colors " +
                        (active
                          ? "border-primary bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground")
                      }
                    >
                      {v.name}
                    </button>
                  );
                }
              )}
            </div>
          </Section>
        )}
        {keys.length > 0 ? (
          <Section title="Overrides">
            {keys.map((k) => (
              <Row key={k} label={k}>
                <TextControl
                  value={node.overrides?.[k] ?? rootProps[k] ?? ""}
                  onChange={(v) => setInstanceOverride(node.id, { [k]: v })}
                />
              </Row>
            ))}
          </Section>
        ) : (
          <Section title="Overrides">
            <p className="px-0.5 text-[11px] text-muted-foreground">
              This component has no overridable text on its root. Edit the
              component to change its contents.
            </p>
          </Section>
        )}
      </ScrollArea>
    </div>
  );
}

/** Clickable ancestor path (Root › Container › Button) for navigating nesting. */
function SelectionBreadcrumb({ node }: { node: DesignNode }) {
  const root = useEditor((s) => s.currentRoot());
  const setSelected = useEditor((s) => s.setSelected);
  const path = root ? findPath(root, node.id) : null;
  if (!path || path.length < 2) return null;
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b px-2.5 py-1.5 text-[11px] text-muted-foreground">
      {path.map((n, i) => {
        const last = i === path.length - 1;
        return (
          <span key={n.id} className="flex items-center gap-0.5">
            <button
              onClick={() => setSelected(n.id)}
              className={
                "max-w-[92px] truncate rounded px-1 py-0.5 hover:bg-muted hover:text-foreground " +
                (last ? "font-medium text-foreground" : "")
              }
            >
              {n.name || defFor(n.type).label}
            </button>
            {!last && <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />}
          </span>
        );
      })}
    </div>
  );
}

/** Per-page metadata (title / path / description) — exported as `metadata`. */
function PageSettings({ screen }: { screen: Screen }) {
  const updateScreenMeta = useEditor((s) => s.updateScreenMeta);
  const field =
    "h-7 w-full rounded-md border bg-transparent px-2 text-xs outline-none focus:ring-2 focus:ring-ring";
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-3.5 py-2.5 text-sm font-medium">
        <FileText className="h-3.5 w-3.5 text-primary" />
        Page settings
      </div>
      <ScrollArea className="flex-1">
        <Section title="Metadata">
          <p className="px-0.5 pb-2 text-[11px] leading-relaxed text-muted-foreground">
            Exported as{" "}
            <code className="rounded bg-muted px-1">export const metadata</code>{" "}
            for this page.
          </p>
          <div className="space-y-2.5">
            <div className="grid grid-cols-[64px_1fr] items-center gap-2">
              <label className="text-[12px] text-muted-foreground">Title</label>
              <input
                className={field}
                value={screen.title ?? ""}
                placeholder={screen.name}
                onChange={(e) => updateScreenMeta(screen.id, { title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-[64px_1fr] items-center gap-2">
              <label className="text-[12px] text-muted-foreground">Path</label>
              <input
                className={field}
                value={screen.path ?? ""}
                placeholder="/"
                onChange={(e) => updateScreenMeta(screen.id, { path: e.target.value })}
              />
            </div>
            <div>
              <label className="px-0.5 text-[11px] text-muted-foreground">
                Description
              </label>
              <Textarea
                className="mt-1 h-16 text-xs"
                value={screen.description ?? ""}
                placeholder="Short description for SEO / social cards…"
                onChange={(e) =>
                  updateScreenMeta(screen.id, { description: e.target.value })
                }
              />
            </div>
          </div>
        </Section>
      </ScrollArea>
    </div>
  );
}

function EmptyProps() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-muted text-muted-foreground">
        <MousePointer2 className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-medium">Nothing selected</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Select an element on the canvas to edit its properties.
        </p>
      </div>
    </div>
  );
}

function NodeHeader({ node }: { node: DesignNode }) {
  const def = defFor(node.type);
  const Icon = def.icon;
  const isRoot = node.name === "Root";
  const renameNode = useEditor((s) => s.renameNode);
  const duplicateNode = useEditor((s) => s.duplicateNode);
  const deleteNode = useEditor((s) => s.deleteNode);
  const addPreset = useEditor((s) => s.addPreset);
  const createComponentFromNode = useEditor((s) => s.createComponentFromNode);

  return (
    <div className="flex items-center gap-2 border-b px-3.5 py-2.5">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <input
        value={node.name ?? def.label}
        onChange={(e) => renameNode(node.id, e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
      />
      {!isRoot && (
        <div className="flex">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-primary"
            title="Save as component"
            onClick={() => {
              const name = node.name || def.label;
              createComponentFromNode(node.id, name);
              toast.success(
                `Saved component “${name}” — reuse it from Insert ▸ Components`
              );
            }}
          >
            <ComponentIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-primary"
            title="Save as preset"
            onClick={() => {
              addPreset(node.id, node.name || def.label);
              toast.success(`Saved preset “${node.name || def.label}”`);
            }}
          >
            <Bookmark className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            title="Duplicate"
            onClick={() => duplicateNode(node.id)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            title="Delete"
            onClick={() => deleteNode(node.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Content */
function ContentSection({ node }: { node: DesignNode }) {
  const setProps = useEditor((s) => s.updateNodeProps);
  const p = node.props;
  const set = (patch: Record<string, any>) => setProps(node.id, patch);

  switch (node.type) {
    case "Heading":
      return (
        <Section title="Content">
          <Row label="Text">
            <BindableField node={node} prop="content">
              <TextControl
                value={p.content}
                onChange={(v) => set({ content: v })}
              />
            </BindableField>
          </Row>
          <Row label="Level">
            <Segmented
              value={p.level}
              onChange={(v) => set({ level: v })}
              options={[1, 2, 3, 4].map((n) => ({ value: n, label: `H${n}` }))}
            />
          </Row>
        </Section>
      );
    case "Text":
      return (
        <Section title="Content">
          <BindableField node={node} prop="content">
            <Textarea
              value={p.content ?? ""}
              onChange={(e) => set({ content: e.target.value })}
              className="text-xs"
            />
          </BindableField>
        </Section>
      );
    case "Button":
      return (
        <>
          <Section title="Content">
            <Row label="Label">
              <BindableField node={node} prop="label">
                <TextControl value={p.label} onChange={(v) => set({ label: v })} />
              </BindableField>
            </Row>
            <Row label="Variant">
              <Dropdown
                value={p.variant}
                onChange={(v) => set({ variant: v })}
                options={[
                  "default",
                  "secondary",
                  "outline",
                  "ghost",
                  "destructive",
                  "link",
                ].map((v) => ({ value: v, label: v }))}
              />
            </Row>
            <Row label="Size">
              <Segmented
                value={p.size}
                onChange={(v) => set({ size: v })}
                options={[
                  { value: "sm", label: "S" },
                  { value: "default", label: "M" },
                  { value: "lg", label: "L" },
                ]}
              />
            </Row>
          </Section>
          <ActionEditor node={node} />
        </>
      );
    case "Badge":
      return (
        <Section title="Content">
          <Row label="Label">
            <TextControl value={p.label} onChange={(v) => set({ label: v })} />
          </Row>
          <Row label="Variant">
            <Dropdown
              value={p.variant}
              onChange={(v) => set({ variant: v })}
              options={["default", "secondary", "outline", "destructive"].map(
                (v) => ({ value: v, label: v })
              )}
            />
          </Row>
        </Section>
      );
    case "Input":
      return (
        <Section title="Content">
          <Row label="Placeholder">
            <TextControl
              value={p.placeholder}
              onChange={(v) => set({ placeholder: v })}
            />
          </Row>
          <Row label="Type">
            <Dropdown
              value={p.type}
              onChange={(v) => set({ type: v })}
              options={["text", "email", "password", "number", "search"].map(
                (v) => ({ value: v, label: v })
              )}
            />
          </Row>
        </Section>
      );
    case "Textarea":
      return (
        <Section title="Content">
          <Row label="Placeholder">
            <TextControl
              value={p.placeholder}
              onChange={(v) => set({ placeholder: v })}
            />
          </Row>
        </Section>
      );
    case "Image":
      return (
        <Section title="Content">
          <Row label="Source">
            <BindableField node={node} prop="src">
              <TextControl value={p.src} onChange={(v) => set({ src: v })} />
            </BindableField>
          </Row>
          <Row label="Alt">
            <TextControl value={p.alt} onChange={(v) => set({ alt: v })} />
          </Row>
        </Section>
      );
    case "Avatar":
      return (
        <Section title="Content">
          <Row label="Image">
            <TextControl value={p.src} onChange={(v) => set({ src: v })} />
          </Row>
          <Row label="Fallback">
            <TextControl
              value={p.fallback}
              onChange={(v) => set({ fallback: v })}
            />
          </Row>
        </Section>
      );
    case "Switch":
    case "Checkbox":
      return (
        <Section title="Content">
          <Row label="Checked">
            <Switch
              checked={!!p.checked}
              onCheckedChange={(c) => set({ checked: c })}
            />
          </Row>
        </Section>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------- Layout */
function LayoutSection({ node }: { node: DesignNode }) {
  const def = defFor(node.type);
  if (!def.canHaveChildren) return null;
  const setStyles = useEditor((s) => s.updateNodeStyles);
  const activeBreakpoint = useEditor((s) => s.activeBreakpoint);
  const s = effectiveTokens(node, activeBreakpoint);
  const set = (patch: Partial<typeof s>) => setStyles(node.id, patch);

  return (
    <Section title="Layout">
      <Row label="Display">
        <Segmented
          value={s.display}
          onChange={(v) => set({ display: v })}
          options={[
            { value: "flex", label: "Flex" },
            { value: "grid", label: "Grid" },
            { value: "block", label: "Block" },
          ]}
        />
      </Row>
      {s.display === "flex" && (
        <>
          <Row label="Direction">
            <Segmented
              value={s.direction}
              onChange={(v) => set({ direction: v })}
              options={[
                { value: "row", label: "Row" },
                { value: "col", label: "Column" },
              ]}
            />
          </Row>
          <Row label="Align">
            <Dropdown
              value={s.align}
              onChange={(v) => set({ align: v as typeof s.align })}
              options={["start", "center", "end", "stretch"].map((v) => ({
                value: v,
                label: v,
              }))}
            />
          </Row>
          <Row label="Justify">
            <Dropdown
              value={s.justify}
              onChange={(v) => set({ justify: v as typeof s.justify })}
              options={["start", "center", "end", "between", "around"].map(
                (v) => ({ value: v, label: v })
              )}
            />
          </Row>
        </>
      )}
      {s.display === "grid" && (
        <Row label="Columns">
          <Stepper
            value={s.gridCols}
            min={1}
            max={6}
            onChange={(v) => set({ gridCols: v })}
          />
        </Row>
      )}
      {(s.display === "flex" || s.display === "grid") && (
        <Row label="Gap">
          <Stepper value={s.gap} onChange={(v) => set({ gap: v })} />
        </Row>
      )}
    </Section>
  );
}

/* --------------------------------------------------------------------- Size */
function SizeSection({ node }: { node: DesignNode }) {
  const setStyles = useEditor((s) => s.updateNodeStyles);
  const activeBreakpoint = useEditor((s) => s.activeBreakpoint);
  const s = effectiveTokens(node, activeBreakpoint);
  const set = (patch: Partial<typeof s>) => setStyles(node.id, patch);
  return (
    <Section title="Size">
      <Row label="Width">
        <TextControl
          value={s.width}
          placeholder="full, auto, 320"
          onChange={(v) => set({ width: v })}
        />
      </Row>
      <Row label="Height">
        <TextControl
          value={s.height}
          placeholder="auto, full, 240"
          onChange={(v) => set({ height: v })}
        />
      </Row>
    </Section>
  );
}

/* ------------------------------------------------------------------ Spacing */
function SpacingSection({ node }: { node: DesignNode }) {
  const setStyles = useEditor((s) => s.updateNodeStyles);
  const activeBreakpoint = useEditor((s) => s.activeBreakpoint);
  const s = effectiveTokens(node, activeBreakpoint);
  const set = (patch: Partial<typeof s>) => setStyles(node.id, patch);
  return (
    <Section title="Spacing">
      <Row label="Padding">
        <Stepper value={s.padding} onChange={(v) => set({ padding: v })} />
      </Row>
      <Row label="Margin">
        <Stepper value={s.margin} onChange={(v) => set({ margin: v })} />
      </Row>
    </Section>
  );
}

/* --------------------------------------------------------------- Typography */
function TypographySection({ node }: { node: DesignNode }) {
  const setStyles = useEditor((s) => s.updateNodeStyles);
  const activeBreakpoint = useEditor((s) => s.activeBreakpoint);
  const s = effectiveTokens(node, activeBreakpoint);
  const set = (patch: Partial<typeof s>) => setStyles(node.id, patch);
  return (
    <Section title="Typography">
      <Row label="Size">
        <Dropdown
          value={s.fontSize}
          onChange={(v) => set({ fontSize: v as typeof s.fontSize })}
          options={["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"].map(
            (v) => ({ value: v, label: v })
          )}
        />
      </Row>
      <Row label="Weight">
        <Dropdown
          value={s.fontWeight}
          onChange={(v) => set({ fontWeight: v as typeof s.fontWeight })}
          options={["normal", "medium", "semibold", "bold"].map((v) => ({
            value: v,
            label: v,
          }))}
        />
      </Row>
      <Row label="Align">
        <Segmented
          value={s.textAlign}
          onChange={(v) => set({ textAlign: v })}
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ]}
        />
      </Row>
      <Row label="Color">
        <ColorControl
          kind="text"
          value={s.textColor}
          onChange={(v) => set({ textColor: v })}
        />
      </Row>
    </Section>
  );
}

/* ------------------------------------------------------------------ Appearance */
function AppearanceSection({ node }: { node: DesignNode }) {
  const setStyles = useEditor((s) => s.updateNodeStyles);
  const activeBreakpoint = useEditor((s) => s.activeBreakpoint);
  const s = effectiveTokens(node, activeBreakpoint);
  const set = (patch: Partial<typeof s>) => setStyles(node.id, patch);
  return (
    <Section title="Appearance">
      <Row label="Fill">
        <ColorControl kind="bg" value={s.bg} onChange={(v) => set({ bg: v })} />
      </Row>
      <Row label="Radius">
        <Dropdown
          value={s.radius}
          onChange={(v) => set({ radius: v as typeof s.radius })}
          options={["none", "sm", "md", "lg", "xl", "2xl", "full"].map((v) => ({
            value: v,
            label: v,
          }))}
        />
      </Row>
      <Row label="Shadow">
        <Dropdown
          value={s.shadow}
          onChange={(v) => set({ shadow: v as typeof s.shadow })}
          options={["none", "sm", "md", "lg", "xl"].map((v) => ({
            value: v,
            label: v,
          }))}
        />
      </Row>
      <Row label="Border">
        <Switch
          checked={!!s.border}
          onCheckedChange={(c) => set({ border: c })}
        />
      </Row>
    </Section>
  );
}

/* -------------------------------------------------------------- Data binding */

interface BindSource {
  id: string;
  name: string;
  fields: SchemaField[];
}

/** Build the list of bindable sources for a node: $item (if in a repeater),
 *  $screen (if the screen has data), then project sources (mode-filtered). */
function useBindSources(node: DesignNode): BindSource[] {
  const project = useEditor((s) => s.currentProject());
  const screen = useEditor((s) => s.currentScreen());
  const list: BindSource[] = [];

  if (screen) {
    const repAncestor = findRepeatAncestor(screen.root, node.id);
    if (repAncestor?.repeat) {
      const src = project?.dataSources?.find(
        (d) =>
          d.id ===
          (repAncestor.repeat!.sourceId === SCREEN_SOURCE
            ? screen.dataSourceId
            : repAncestor.repeat!.sourceId)
      );
      list.push({
        id: ITEM_SOURCE,
        name: "Current item",
        fields: itemFields(src, repAncestor.repeat!.path),
      });
    }
    if (screen.dataSourceId) {
      const ds = project?.dataSources?.find((d) => d.id === screen.dataSourceId);
      if (ds)
        list.push({ id: SCREEN_SOURCE, name: `Screen · ${ds.name}`, fields: ds.schema ?? [] });
    }
  }

  const sources = (project?.dataSources ?? []).filter((d) =>
    project?.mode === "dynamic" ? true : d.kind === "constant"
  );
  for (const d of sources)
    list.push({ id: d.id, name: d.name, fields: d.schema ?? [] });
  return list;
}

function BindableField({
  node,
  prop,
  children,
}: {
  node: DesignNode;
  prop: string;
  children: React.ReactNode;
}) {
  const setBinding = useEditor((s) => s.setNodeBinding);
  const binding = node.bindings?.[prop];
  const sources = useBindSources(node);

  const startBind = () => {
    const first = sources[0];
    if (!first) return;
    setBinding(node.id, prop, {
      sourceId: first.id,
      path: first.fields[0]?.path ?? "",
    });
  };

  if (!binding) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1">{children}</div>
        <button
          onClick={startBind}
          disabled={sources.length === 0}
          title={sources.length === 0 ? "Add a data source to bind" : "Bind to data"}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
        >
          <Link2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const source = sources.find((s) => s.id === binding.sourceId);
  const paths = source?.fields.map((f) => f.path) ?? [];

  return (
    <div className="space-y-1.5 rounded-lg border border-primary/30 bg-primary/5 p-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
          <Link2 className="h-3 w-3" />
          Bound to data
        </span>
        <button
          onClick={() => setBinding(node.id, prop, null)}
          title="Unbind"
          className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:text-destructive"
        >
          <Link2Off className="h-3 w-3" />
        </button>
      </div>
      <Dropdown
        value={binding.sourceId}
        onChange={(v) =>
          setBinding(node.id, prop, { sourceId: v, path: binding.path })
        }
        options={sources.map((s) => ({ value: s.id, label: s.name }))}
      />
      {paths.length > 0 ? (
        <Dropdown
          value={binding.path}
          onChange={(v) =>
            setBinding(node.id, prop, { sourceId: binding.sourceId, path: v })
          }
          options={paths.map((p) => ({ value: p, label: p || "(root)" }))}
        />
      ) : (
        <TextControl
          value={binding.path}
          placeholder="field path e.g. title"
          onChange={(v) =>
            setBinding(node.id, prop, { sourceId: binding.sourceId, path: v })
          }
        />
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Repeat */
function RepeatSection({ node }: { node: DesignNode }) {
  const def = defFor(node.type);
  const project = useEditor((s) => s.currentProject());
  const screen = useEditor((s) => s.currentScreen());
  const setRepeat = useEditor((s) => s.setNodeRepeat);
  if (!def.canHaveChildren) return null;

  // Array fields available: from each source + $screen.
  const arrayOptions: { sourceId: string; sourceName: string; path: string }[] =
    [];
  const sources = (project?.dataSources ?? []).filter((d) =>
    project?.mode === "dynamic" ? true : d.kind === "constant"
  );
  for (const d of sources)
    (d.schema ?? [])
      .filter((f) => f.type === "array")
      .forEach((f) =>
        arrayOptions.push({ sourceId: d.id, sourceName: d.name, path: f.path })
      );
  if (screen?.dataSourceId) {
    const ds = sources.find((d) => d.id === screen.dataSourceId);
    (ds?.schema ?? [])
      .filter((f) => f.type === "array")
      .forEach((f) =>
        arrayOptions.push({
          sourceId: SCREEN_SOURCE,
          sourceName: "Screen data",
          path: f.path,
        })
      );
  }

  const current = node.repeat;
  const currentKey = current ? `${current.sourceId}::${current.path}` : "__none__";

  return (
    <Section title="Repeat">
      <Row label="Over">
        <Dropdown
          value={currentKey}
          onChange={(v) => {
            if (v === "__none__") return setRepeat(node.id, null);
            const [sourceId, path] = v.split("::");
            setRepeat(node.id, { sourceId, path });
          }}
          options={[
            { value: "__none__", label: "Don't repeat" },
            ...arrayOptions.map((o) => ({
              value: `${o.sourceId}::${o.path}`,
              label: `${o.sourceName} · ${o.path}`,
            })),
          ]}
        />
      </Row>
      {current ? (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Repeat className="h-3 w-3 text-primary" />
          Children repeat per item. Bind them to{" "}
          <span className="font-medium text-foreground">Current item</span>.
          Expands in Preview.
        </p>
      ) : (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <List className="h-3 w-3" />
          Bind this container to an array to render a list.
        </p>
      )}
    </Section>
  );
}

/* ----------------------------------------------------------- Screen data */
function ScreenDataSection({ node }: { node: DesignNode }) {
  const screen = useEditor((s) => s.currentScreen());
  const project = useEditor((s) => s.currentProject());
  const setScreenData = useEditor((s) => s.setScreenData);
  // Only for the screen root.
  if (!screen || screen.root.id !== node.id) return null;
  const sources = project?.dataSources ?? [];

  return (
    <Section title="Screen data">
      <Row label="Source">
        <Dropdown
          value={screen.dataSourceId ?? "__none__"}
          onChange={(v) =>
            setScreenData(screen.id, v === "__none__" ? null : v)
          }
          options={[
            { value: "__none__", label: "None" },
            ...sources.map((d) => ({ value: d.id, label: d.name })),
          ]}
        />
      </Row>
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Database className="h-3 w-3" />
        Children can bind to <span className="font-medium text-foreground">Screen data</span> fields.
      </p>
    </Section>
  );
}

/* --------------------------------------------------------------- CTA actions */
function ActionEditor({ node }: { node: DesignNode }) {
  const project = useEditor((s) => s.currentProject());
  const setAction = useEditor((s) => s.setNodeAction);
  const action: NodeAction = node.action ?? { trigger: "click", type: "none" };

  const screens = project?.screens ?? [];
  const apiSources = (project?.dataSources ?? []).filter(
    (d) => d.kind === "api"
  );
  const isDynamic = project?.mode === "dynamic";

  const update = (patch: Partial<NodeAction>) =>
    setAction(node.id, { ...action, ...patch });

  return (
    <Section title="On click">
      <Row label="Action">
        <Dropdown
          value={action.type}
          onChange={(v) => update({ type: v as NodeAction["type"] })}
          options={[
            { value: "none", label: "None" },
            { value: "navigate", label: "Navigate to screen" },
            ...(isDynamic
              ? [{ value: "request", label: "Call data source" }]
              : []),
          ]}
        />
      </Row>
      {action.type === "navigate" && (
        <Row label="Screen">
          <Dropdown
            value={action.targetScreenId}
            placeholder="Select screen"
            onChange={(v) => update({ targetScreenId: v })}
            options={screens.map((s) => ({ value: s.id, label: s.name }))}
          />
        </Row>
      )}
      {action.type === "request" && (
        <Row label="Source">
          {apiSources.length > 0 ? (
            <Dropdown
              value={action.dataSourceId}
              placeholder="Select API"
              onChange={(v) => update({ dataSourceId: v })}
              options={apiSources.map((s) => ({ value: s.id, label: s.name }))}
            />
          ) : (
            <span className="text-xs text-muted-foreground">
              Add an API data source first.
            </span>
          )}
        </Row>
      )}
      {!isDynamic && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Zap className="h-3 w-3" />
          Convert to dynamic to call APIs on click.
        </p>
      )}
    </Section>
  );
}
