import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Plus, Trash2, Component, Pencil, Download, Upload } from "lucide-react";
import type { DesignNode, NodeType, Project, ThemePalette } from "@/types";
import { createNode } from "@/lib/factory";
import { nodeDefList, categoryOrder } from "@/lib/nodeDefs";
import { StaticNode } from "@/features/editor/canvas/renderTree";
import { ComponentDefsProvider } from "@/features/editor/canvas/componentDefs";
import { generateComponentCode } from "@/lib/codegen";
import { tokenStyle, ensureFontLoaded, DS_FONTS, tokensToCss } from "@/lib/designSystem";
import { downloadText } from "@/lib/export";
import { THEME_PRESETS } from "@/lib/themePresets";
import { useEditor } from "@/store/editorStore";
import { useTheme } from "@/store/theme";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Dropdown } from "@/features/editor/right/controls";
import { cn } from "@/lib/utils";

/**
 * "New component" button + base-type picker. Creating a component seeds it from
 * a chosen base type and enters inline editing WITHOUT leaving the Design System
 * view (the editor layout is hosted here while `editingComponentId` is set).
 */
function NewComponentButton({
  count,
  variant = "brand",
  className,
  label = "New component",
}: {
  count: number;
  variant?: "brand" | "outline";
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const addComponentDefinitionOfType = useEditor(
    (s) => s.addComponentDefinitionOfType
  );
  const editComponent = useEditor((s) => s.editComponent);

  const pick = (type: NodeType) => {
    const id = addComponentDefinitionOfType(`Component ${count + 1}`, type);
    setOpen(false);
    // Stay in the Design System view; EditorPage renders the inline editor
    // whenever `editingComponentId` is set.
    editComponent(id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={variant} className={className}>
          <Plus className="h-3.5 w-3.5" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Start from a base component</DialogTitle>
          <DialogDescription>
            Pick a building block to base your component on. You can restyle it
            and add more inside afterwards.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto scrollbar-thin pr-1">
          {categoryOrder.map((cat) => {
            const items = nodeDefList.filter((d) => d.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat}>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/70">
                  {cat}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {items.map((d) => {
                    const Icon = d.icon;
                    return (
                      <button
                        key={d.type}
                        onClick={() => pick(d.type)}
                        className="flex items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2.5 text-left text-sm transition-colors hover:border-brand hover:bg-muted/40"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="truncate font-medium">{d.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* Build a sample node of a type with prop/style overrides. */
function sample(
  type: NodeType,
  props: Record<string, any> = {},
  children: DesignNode[] = []
): DesignNode {
  const n = createNode(type);
  return { ...n, props: { ...n.props, ...props }, children };
}

interface Story {
  label: string;
  node: DesignNode;
}
interface Group {
  title: string;
  stories: Story[];
}

function buildGroups(): Group[] {
  return [
    {
      title: "Button",
      stories: [
        { label: "default", node: sample("Button", { label: "Button" }) },
        { label: "secondary", node: sample("Button", { label: "Secondary", variant: "secondary" }) },
        { label: "outline", node: sample("Button", { label: "Outline", variant: "outline" }) },
        { label: "ghost", node: sample("Button", { label: "Ghost", variant: "ghost" }) },
        { label: "destructive", node: sample("Button", { label: "Delete", variant: "destructive" }) },
        { label: "link", node: sample("Button", { label: "Link", variant: "link" }) },
        { label: "sm", node: sample("Button", { label: "Small", size: "sm" }) },
        { label: "lg", node: sample("Button", { label: "Large", size: "lg" }) },
      ],
    },
    {
      title: "Badge",
      stories: [
        { label: "default", node: sample("Badge", { label: "Badge" }) },
        { label: "secondary", node: sample("Badge", { label: "New", variant: "secondary" }) },
        { label: "outline", node: sample("Badge", { label: "Beta", variant: "outline" }) },
        { label: "destructive", node: sample("Badge", { label: "Error", variant: "destructive" }) },
      ],
    },
    {
      title: "Inputs",
      stories: [
        { label: "input", node: sample("Input", { placeholder: "Email address" }) },
        { label: "textarea", node: sample("Textarea", { placeholder: "Your message…" }) },
        { label: "switch (on)", node: sample("Switch", { checked: true }) },
        { label: "switch (off)", node: sample("Switch", { checked: false }) },
        { label: "checkbox", node: sample("Checkbox", { checked: true }) },
      ],
    },
    {
      title: "Typography",
      stories: [
        { label: "H1", node: sample("Heading", { content: "Heading 1", level: 1 }) },
        { label: "H2", node: sample("Heading", { content: "Heading 2", level: 2 }) },
        { label: "H3", node: sample("Heading", { content: "Heading 3", level: 3 }) },
        { label: "Text", node: sample("Text", { content: "Body text sample." }) },
      ],
    },
    {
      title: "Display",
      stories: [
        { label: "avatar", node: sample("Avatar") },
        { label: "divider", node: sample("Divider") },
      ],
    },
  ];
}

/** Left rail panel for the Design System view (tokens editor or components manager). */
export function SystemLeft({ project }: { project: Project }) {
  const tool = useEditor((s) => s.systemTool);
  return tool === "components" ? (
    <ComponentsPanel project={project} />
  ) : (
    <TokensPanel project={project} />
  );
}

/** Full palette editors, grouped. Labels kept short for the narrow rail. */
const TOKEN_GROUPS: {
  title: string;
  fields: { key: keyof ThemePalette; label: string }[];
}[] = [
  {
    title: "Surfaces",
    fields: [
      { key: "background", label: "Background" },
      { key: "foreground", label: "Foreground" },
      { key: "card", label: "Card" },
      { key: "cardForeground", label: "Card fg" },
      { key: "popover", label: "Popover" },
      { key: "popoverForeground", label: "Popover fg" },
    ],
  },
  {
    title: "Primary & brand",
    fields: [
      { key: "primary", label: "Primary" },
      { key: "primaryForeground", label: "Primary fg" },
      { key: "ring", label: "Ring" },
      { key: "brandFrom", label: "Gradient A" },
      { key: "brandTo", label: "Gradient B" },
    ],
  },
  {
    title: "Secondary, accent & muted",
    fields: [
      { key: "secondary", label: "Secondary" },
      { key: "secondaryForeground", label: "Secondary fg" },
      { key: "accent", label: "Accent" },
      { key: "accentForeground", label: "Accent fg" },
      { key: "muted", label: "Muted" },
      { key: "mutedForeground", label: "Muted fg" },
    ],
  },
  {
    title: "Status",
    fields: [
      { key: "destructive", label: "Destructive" },
      { key: "destructiveForeground", label: "Destructive fg" },
      { key: "success", label: "Success" },
      { key: "warning", label: "Warning" },
    ],
  },
  {
    title: "Borders",
    fields: [
      { key: "border", label: "Border" },
      { key: "input", label: "Input" },
    ],
  },
];

/** Export the project's design tokens (JSON / CSS variables) and import a theme. */
function TokensToolbar({ project }: { project: Project }) {
  const tokens = project.designSystem.tokens;
  const importTokens = useEditor((s) => s.importTokens);
  const fileRef = useRef<HTMLInputElement>(null);

  const slug = project.name.replace(/\s+/g, "-").toLowerCase() || "theme";

  const exportJson = () => {
    downloadText(`${slug}-tokens.json`, JSON.stringify(tokens, null, 2));
    toast.success("Tokens exported");
  };
  const copyCss = () => {
    void navigator.clipboard
      .writeText(tokensToCss(tokens))
      .then(() => toast.success("CSS variables copied"))
      .catch(() => toast.error("Couldn't copy"));
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void file.text().then((text) => {
      try {
        importTokens(JSON.parse(text));
        toast.success("Tokens imported");
      } catch {
        toast.error("Invalid tokens file");
      }
    });
  };

  return (
    <div className="flex gap-1.5">
      <Button size="sm" variant="outline" className="h-7 flex-1 gap-1.5" onClick={exportJson}>
        <Download className="h-3.5 w-3.5" />
        Export
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 flex-1 gap-1.5"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="h-3.5 w-3.5" />
        Import
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 w-7 shrink-0 p-0"
        title="Copy as CSS variables"
        onClick={copyCss}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onFile}
      />
    </div>
  );
}

// ---- WCAG contrast (design-system tokens) --------------------------------
function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function relLuminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
/** WCAG 2.1 contrast ratio (1–21) between two hex colors, or null if unparseable. */
function contrastRatio(fg: string, bg: string): number | null {
  const a = hexToRgb(fg);
  const b = hexToRgb(bg);
  if (!a || !b) return null;
  const la = relLuminance(a);
  const lb = relLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const CONTRAST_PAIRS: { label: string; fg: keyof ThemePalette; bg: keyof ThemePalette }[] = [
  { label: "Body text", fg: "foreground", bg: "background" },
  { label: "Card", fg: "cardForeground", bg: "card" },
  { label: "Muted", fg: "mutedForeground", bg: "muted" },
  { label: "Primary", fg: "primaryForeground", bg: "primary" },
  { label: "Secondary", fg: "secondaryForeground", bg: "secondary" },
  { label: "Accent", fg: "accentForeground", bg: "accent" },
  { label: "Destructive", fg: "destructiveForeground", bg: "destructive" },
];

/** Reads each fg/bg token pair and flags WCAG AA/AAA (normal-text) contrast. */
function ContrastChecker({ palette }: { palette: ThemePalette }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
        Contrast (WCAG · normal text)
      </p>
      <div className="space-y-1">
        {CONTRAST_PAIRS.map((p) => {
          const ratio = contrastRatio(palette[p.fg], palette[p.bg]);
          const grade =
            ratio == null ? "—" : ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : "Fail";
          const tone =
            grade === "AAA" || grade === "AA"
              ? "text-emerald-600 dark:text-emerald-400"
              : grade === "Fail"
                ? "text-destructive"
                : "text-muted-foreground";
          return (
            <div
              key={p.label}
              className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1"
              title={`${p.label}: ${palette[p.fg]} on ${palette[p.bg]}`}
            >
              <span
                className="grid h-5 w-5 shrink-0 place-items-center rounded text-[10px] font-bold"
                style={{ background: palette[p.bg], color: palette[p.fg] }}
              >
                Aa
              </span>
              <span className="flex-1 text-[11px] text-muted-foreground">{p.label}</span>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {ratio == null ? "—" : `${ratio.toFixed(2)}:1`}
              </span>
              <span className={cn("w-8 text-right text-[10px] font-semibold", tone)}>
                {grade}
              </span>
            </div>
          );
        })}
      </div>
      <p className="px-0.5 text-[10px] leading-relaxed text-muted-foreground/70">
        AA needs 4.5:1, AAA needs 7:1 for normal text. Fix "Fail" pairs before export.
      </p>
    </div>
  );
}

function TokensPanel({ project }: { project: Project }) {
  const tokens = project.designSystem.tokens;
  const updateTokens = useEditor((s) => s.updateTokens);
  const updateThemeToken = useEditor((s) => s.updateThemeToken);
  const theme = useTheme((s) => s.theme);
  const setTheme = useTheme((s) => s.setTheme);
  const palette = tokens[theme];

  useEffect(() => {
    ensureFontLoaded(tokens.font);
    if (tokens.headingFont) ensureFontLoaded(tokens.headingFont);
  }, [tokens.font, tokens.headingFont]);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-4">
        {/* Light / Dark toggle — synced to the app theme so the canvas shows
            the mode you're editing. */}
        <div>
          <div className="flex rounded-lg border border-border/70 bg-muted p-0.5 text-[12px] font-medium">
            {(["light", "dark"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setTheme(m)}
                className={cn(
                  "flex-1 rounded-md px-2 py-1 capitalize transition-colors",
                  theme === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <p className="mt-1.5 px-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
            Editing the <b className="font-medium text-foreground">{theme}</b>{" "}
            palette. Toggle to edit the other mode.
          </p>
        </div>

        <TokensToolbar project={project} />

        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
            Theme presets
          </p>
          <div className="flex flex-wrap gap-1.5">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                title={`Apply ${preset.name}`}
                onClick={() => {
                  updateThemeToken("light", preset.light);
                  updateThemeToken("dark", preset.dark);
                  toast.success(`${preset.name} theme applied`);
                }}
                className="flex items-center gap-1.5 rounded-md border border-border/70 bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <span
                  className="h-3 w-3 rounded-full border border-black/10"
                  style={{ background: preset.swatch }}
                />
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {TOKEN_GROUPS.map((group) => (
          <div key={group.title} className="space-y-2.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
              {group.title}
            </p>
            {group.fields.map((f) => (
              <ColorRow
                key={f.key}
                label={f.label}
                value={palette[f.key]}
                onChange={(v) => updateThemeToken(theme, { [f.key]: v })}
              />
            ))}
          </div>
        ))}

        <div className="space-y-2.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
            Shape & type
            <span className="ml-1 normal-case tracking-normal text-muted-foreground/50">
              (both modes)
            </span>
          </p>
          <div className="grid grid-cols-[88px_1fr] items-center gap-2">
            <label className="text-[12px] text-muted-foreground">Radius</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={28}
                value={tokens.radius}
                onChange={(e) =>
                  updateTokens({ radius: Number(e.target.value) })
                }
                className="flex-1 accent-[hsl(var(--primary))]"
              />
              <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">
                {tokens.radius}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-[88px_1fr] items-center gap-2">
            <label className="text-[12px] text-muted-foreground">Font</label>
            <Dropdown
              value={tokens.font}
              onChange={(v) => updateTokens({ font: v })}
              options={DS_FONTS.map((f) => ({ value: f, label: f }))}
            />
          </div>
          <div className="grid grid-cols-[88px_1fr] items-center gap-2">
            <label className="text-[12px] text-muted-foreground">Headings</label>
            <Dropdown
              value={tokens.headingFont || tokens.font}
              onChange={(v) =>
                updateTokens({ headingFont: v === tokens.font ? undefined : v })
              }
              options={[
                { value: tokens.font, label: `Same as body (${tokens.font})` },
                ...DS_FONTS.filter((f) => f !== tokens.font).map((f) => ({
                  value: f,
                  label: f,
                })),
              ]}
            />
          </div>
        </div>

        <ContrastChecker palette={palette} />

        {/* live preview of the active mode */}
        <div
          className="space-y-2 rounded-xl border p-3"
          style={tokenStyle(tokens, theme)}
        >
          <div className="h-9 rounded-lg bg-brand" />
          <div className="flex flex-wrap gap-2">
            <Button variant="brand" size="sm" className="pointer-events-none">
              Primary
            </Button>
            <Button variant="outline" size="sm" className="pointer-events-none">
              Outline
            </Button>
          </div>
          <div className="rounded-lg border bg-card p-2 text-card-foreground">
            <p className="text-xs font-medium">Card surface</p>
            <p className="text-[11px] text-muted-foreground">Muted text</p>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

/** Compact components manager in the left rail (New / edit / insert / delete). */
function ComponentsPanel({ project }: { project: Project }) {
  const components = project.designSystem.components;
  const deleteComponentDefinition = useEditor(
    (s) => s.deleteComponentDefinition
  );
  const createInstance = useEditor((s) => s.createInstance);
  const editComponent = useEditor((s) => s.editComponent);

  const insert = (defId: string) => {
    const root = useEditor.getState().currentRoot();
    if (!root) {
      toast.error("Open a screen first");
      return;
    }
    createInstance(root.id, defId);
    toast.success("Added to current screen");
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-3">
        <NewComponentButton count={components.length} className="h-7 w-full" />

        {components.length === 0 ? (
          <p className="px-1 py-3 text-center text-[11px] text-muted-foreground">
            No components yet. Create one, then drop it on any page — edit it
            once and every page updates.
          </p>
        ) : (
          <div className="space-y-0.5 pt-1">
            {components.map((c) => (
              <div
                key={c.id}
                className="group flex h-8 items-center gap-2 rounded-md px-2 text-xs hover:bg-muted"
              >
                <button
                  onClick={() => editComponent(c.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  title="Edit component"
                >
                  <Component className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate font-medium">{c.name}</span>
                </button>
                <button
                  onClick={() => insert(c.id)}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded text-muted-foreground opacity-0 hover:text-primary group-hover:opacity-100"
                  title="Add to current screen"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => deleteComponentDefinition(c.id)}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                  title="Delete component"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

/** Main gallery for the Design System view (component showcase + primitives). */
export function SystemMain({ project }: { project: Project }) {
  const tokens = project.designSystem.tokens;
  const theme = useTheme((s) => s.theme);
  const groups = useMemo(buildGroups, []);

  useEffect(() => {
    ensureFontLoaded(tokens.font);
    if (tokens.headingFont) ensureFontLoaded(tokens.headingFont);
  }, [tokens.font, tokens.headingFont]);

  return (
    <ScrollArea className="min-h-0 flex-1 bg-background">
      <ComponentDefsProvider components={project.designSystem.components}>
        <div className="p-8" style={tokenStyle(tokens, theme)}>
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              Design System
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Set your <b className="font-medium text-foreground">tokens</b>,
              build <b className="font-medium text-foreground">components</b>{" "}
              from them, then use those on pages — edit a component once and
              every page updates.
            </p>
          </div>

          <ComponentsSection project={project} />
          <PresetsSection project={project} />

          <section>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
              Primitives
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Building blocks, themed by your tokens. Combine them into
              components above.
            </p>
            <div className="space-y-8">
              {groups.map((g) => (
                <section key={g.title}>
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
                    {g.title}
                  </h3>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                    {g.stories.map((st) => (
                      <StoryCard
                        key={st.label}
                        label={st.label}
                        node={st.node}
                        project={project}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        </div>
      </ComponentDefsProvider>
    </ScrollArea>
  );
}

/* ---------------------------------------------------------- Components (defs) */
/** Count instances of a component definition, and on how many screens they appear. */
function componentUsage(
  project: Project,
  defId: string
): { instances: number; screens: number } {
  let instances = 0;
  let screens = 0;
  const countIn = (node: DesignNode): number => {
    let n = node.instanceOf === defId ? 1 : 0;
    for (const c of node.children ?? []) n += countIn(c);
    return n;
  };
  for (const screen of project.screens) {
    const n = countIn(screen.root);
    if (n > 0) {
      instances += n;
      screens += 1;
    }
  }
  return { instances, screens };
}

function ComponentsSection({ project }: { project: Project }) {
  const components = project.designSystem.components;
  const deleteComponentDefinition = useEditor(
    (s) => s.deleteComponentDefinition
  );
  const renameComponentDefinition = useEditor(
    (s) => s.renameComponentDefinition
  );
  const createInstance = useEditor((s) => s.createInstance);
  const editComponent = useEditor((s) => s.editComponent);
  const importComponents = useEditor((s) => s.importComponents);
  const libRef = useRef<HTMLInputElement>(null);

  const slug = project.name.replace(/\s+/g, "-").toLowerCase() || "components";
  const exportLibrary = () => {
    if (!components.length) {
      toast.error("No components to export");
      return;
    }
    downloadText(`${slug}-components.json`, JSON.stringify(components, null, 2));
    toast.success("Component library exported");
  };
  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void file.text().then((text) => {
      try {
        const parsed = JSON.parse(text);
        const defs = Array.isArray(parsed) ? parsed : parsed?.components;
        const n = importComponents(defs);
        if (n > 0) toast.success(`Imported ${n} component${n === 1 ? "" : "s"}`);
        else toast.error("No components found in that file");
      } catch {
        toast.error("Invalid components file");
      }
    });
  };

  const edit = (id: string) => editComponent(id);

  const insert = (defId: string) => {
    const root = useEditor.getState().currentRoot();
    if (!root) {
      toast.error("Open a screen first");
      return;
    }
    createInstance(root.id, defId);
    toast.success("Added to current screen");
  };

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
          Components
        </h2>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5"
            onClick={exportLibrary}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5"
            onClick={() => libRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            Import
          </Button>
          <input
            ref={libRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onImportFile}
          />
          <NewComponentButton count={components.length} className="h-7" />
        </div>
      </div>

      {components.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed p-8 text-center">
          <Component className="h-6 w-6 text-muted-foreground" />
          <p className="mt-1 text-sm font-medium">No components yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Build a reusable component (a button, a card, a header) from the
            primitives below. Use it on any page — editing it updates every
            instance everywhere.
          </p>
          <NewComponentButton
            count={components.length}
            variant="outline"
            className="mt-2 h-7"
            label="Create your first component"
          />
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          {components.map((c) => {
            const usage = componentUsage(project, c.id);
            return (
            <div
              key={c.id}
              className="group flex flex-col overflow-hidden rounded-xl border border-primary/30 bg-card shadow-soft"
            >
              <button
                onClick={() => edit(c.id)}
                className="relative flex min-h-[104px] flex-1 items-center justify-center p-4 text-left transition-colors hover:bg-muted/40"
                title="Edit component"
              >
                <StaticNode node={c.root} />
                <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  <Pencil className="h-3 w-3" />
                </span>
                <span
                  className="absolute left-1.5 top-1.5 rounded-md bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground backdrop-blur-sm"
                  title={
                    usage.instances === 0
                      ? "Not used on any screen yet"
                      : `${usage.instances} instance${usage.instances === 1 ? "" : "s"} across ${usage.screens} screen${usage.screens === 1 ? "" : "s"}`
                  }
                >
                  {usage.instances === 0
                    ? "Unused"
                    : `${usage.instances}× · ${usage.screens} screen${usage.screens === 1 ? "" : "s"}`}
                </span>
              </button>
              <div className="flex items-center gap-1 border-t border-border/60 px-2 py-1.5">
                <input
                  value={c.name}
                  onChange={(e) =>
                    renameComponentDefinition(c.id, e.target.value)
                  }
                  className="min-w-0 flex-1 bg-transparent text-[11px] font-medium outline-none"
                />
                <button
                  onClick={() => insert(c.id)}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
                  title="Add to current screen"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => deleteComponentDefinition(c.id)}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:text-destructive"
                  title="Delete component"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-center gap-2">
      <label className="truncate text-[12px] text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-md border px-2 py-1">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent font-mono text-[11px] uppercase outline-none"
        />
      </div>
    </div>
  );
}

function StoryCard({
  label,
  node,
  project,
}: {
  label: string;
  node: DesignNode;
  project: Project;
}) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-soft">
      <div className="relative flex min-h-[92px] flex-1 items-center justify-center p-4 [&>*]:min-w-0 [&>*]:max-w-full">
        <StaticNode node={node} />
        <button
          onClick={() => {
            navigator.clipboard.writeText(generateComponentCode(node, project));
            toast.success("Component code copied");
          }}
          className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
          title="Copy code"
        >
          <Copy className="h-3 w-3" />
        </button>
      </div>
      <div className="border-t border-border/60 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function PresetsSection({ project }: { project: Project }) {
  const presets = project.designSystem.presets;
  const deletePreset = useEditor((s) => s.deletePreset);
  const createNodeFromPreset = useEditor((s) => s.createNodeFromPreset);
  const currentScreen = useEditor((s) => s.currentScreen());

  const insert = (presetId: string) => {
    const screen = currentScreen;
    if (!screen) return;
    createNodeFromPreset(screen.root.id, presetId);
    toast.success("Added to current screen");
  };

  if (presets.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
        Presets
      </h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
        {presets.map((p) => (
          <div
            key={p.id}
            className="group flex flex-col overflow-hidden rounded-xl border border-primary/30 bg-card shadow-soft"
          >
            <div className="flex min-h-[92px] flex-1 items-center justify-center p-4">
              <StaticNode node={{ ...createNode(p.type), props: p.props, styles: p.styles }} />
            </div>
            <div className="flex items-center gap-1 border-t border-border/60 px-2 py-1.5">
              <span className="flex-1 truncate text-[11px] font-medium">
                {p.name}
              </span>
              <button
                onClick={() => insert(p.id)}
                className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
                title="Add to screen"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => deletePreset(p.id)}
                className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:text-destructive"
                title="Delete preset"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
