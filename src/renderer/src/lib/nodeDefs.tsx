import * as React from "react";
import {
  Box,
  LayoutGrid,
  Heading as HeadingIcon,
  Type,
  Link2,
  RectangleHorizontal,
  TextCursorInput,
  AlignLeft,
  SquareStack,
  Tag,
  CircleUser,
  Image as ImageIcon,
  Minus,
  ToggleRight,
  CheckSquare,
  Component,
  Sparkles,
  Table as TableIcon,
  ChevronsUpDown,
  type LucideIcon,
} from "lucide-react";
import type { DesignNode, NodeType, StyleTokens } from "@/types";
import { cn } from "@/lib/utils";
import { ICONS, iconImportName, iconJsxName } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

export type NodeCategory =
  | "Layout"
  | "Typography"
  | "Actions"
  | "Inputs"
  | "Display";

export interface ImportSpec {
  from: string;
  names: string[];
}

export interface NodeRenderArgs {
  node: DesignNode;
  className: string;
  children: React.ReactNode;
  /** Selection / dnd / hover handlers + data attributes spread onto the root element. */
  rootProps: Record<string, any>;
}

export interface CodegenSpec {
  tag: string;
  imports: ImportSpec[];
  /** Additional JSX attributes (besides className), each a full `key="value"` string. */
  attrs: string[];
  /** Extra classes merged with the style-token classes. */
  extraClass?: string;
  selfClosing?: boolean;
  /** Literal text child (for leaf text nodes). */
  text?: string;
  /** Raw inner JSX inserted verbatim (for fixed-structure nodes like Avatar). */
  innerJSX?: string;
}

export interface NodeDef {
  type: NodeType;
  label: string;
  category: NodeCategory;
  icon: LucideIcon;
  canHaveChildren: boolean;
  defaultProps: Record<string, any>;
  defaultStyles: StyleTokens;
  render: (args: NodeRenderArgs) => React.ReactNode;
  codegen: (node: DesignNode) => CodegenSpec;
}

const UI = (name: string) => `@/components/ui/${name}`;

export const nodeDefs: Record<NodeType, NodeDef> = {
  // ---------------------------------------------------------------- Layout
  Container: {
    type: "Container",
    label: "Container",
    category: "Layout",
    icon: Box,
    canHaveChildren: true,
    defaultProps: {},
    defaultStyles: {
      display: "flex",
      direction: "col",
      gap: 4,
      padding: 6,
      width: "full",
      bg: "transparent",
      radius: "lg",
    },
    render: ({ className, children, rootProps }) => (
      <div className={className} {...rootProps}>
        {children}
      </div>
    ),
    codegen: () => ({ tag: "div", imports: [], attrs: [] }),
  },

  Grid: {
    type: "Grid",
    label: "Grid",
    category: "Layout",
    icon: LayoutGrid,
    canHaveChildren: true,
    defaultProps: {},
    defaultStyles: {
      display: "grid",
      gridCols: 2,
      gap: 4,
      width: "full",
    },
    render: ({ className, children, rootProps }) => (
      <div className={className} {...rootProps}>
        {children}
      </div>
    ),
    codegen: () => ({ tag: "div", imports: [], attrs: [] }),
  },

  // ------------------------------------------------------------ Typography
  Heading: {
    type: "Heading",
    label: "Heading",
    category: "Typography",
    icon: HeadingIcon,
    canHaveChildren: false,
    defaultProps: { content: "Heading", level: 2 },
    defaultStyles: {
      fontSize: "2xl",
      fontWeight: "bold",
      textColor: "foreground",
    },
    render: ({ node, className, rootProps }) => {
      const Tag = `h${node.props.level ?? 2}` as any;
      return (
        <Tag
          className={cn(
            "tracking-tight font-[family-name:var(--font-heading)]",
            className
          )}
          {...rootProps}
        >
          {node.props.content}
        </Tag>
      );
    },
    codegen: (node) => ({
      tag: `h${node.props.level ?? 2}`,
      imports: [],
      attrs: [],
      extraClass: "tracking-tight font-[family-name:var(--font-heading)]",
      text: node.props.content,
    }),
  },

  Text: {
    type: "Text",
    label: "Text",
    category: "Typography",
    icon: Type,
    canHaveChildren: false,
    defaultProps: {
      content: "The quick brown fox jumps over the lazy dog.",
    },
    defaultStyles: {
      fontSize: "sm",
      textColor: "muted",
    },
    render: ({ node, className, rootProps }) => (
      <p className={className} {...rootProps}>
        {node.props.content}
      </p>
    ),
    codegen: (node) => ({
      tag: "p",
      imports: [],
      attrs: [],
      text: node.props.content,
    }),
  },

  Link: {
    type: "Link",
    label: "Link",
    category: "Typography",
    icon: Link2,
    canHaveChildren: false,
    defaultProps: { content: "Link", href: "/" },
    defaultStyles: { textColor: "primary" },
    // No functional href on the canvas so clicking selects (never navigates);
    // codegen emits the real anchor.
    render: ({ node, className, rootProps }) => (
      <a className={className} {...rootProps}>
        {node.props.content}
      </a>
    ),
    codegen: (node) => ({
      tag: "a",
      imports: [],
      attrs: [`href=${JSON.stringify(node.props.href || "#")}`],
      text: node.props.content,
    }),
  },

  // --------------------------------------------------------------- Actions
  Button: {
    type: "Button",
    label: "Button",
    category: "Actions",
    icon: RectangleHorizontal,
    canHaveChildren: false,
    defaultProps: { label: "Button", variant: "default", size: "default" },
    defaultStyles: {},
    render: ({ node, className, rootProps }) => (
      <Button
        variant={node.props.variant}
        size={node.props.size}
        className={className}
        {...rootProps}
      >
        {node.props.label}
      </Button>
    ),
    codegen: (node) => {
      const attrs: string[] = [];
      if (node.props.variant && node.props.variant !== "default")
        attrs.push(`variant="${node.props.variant}"`);
      if (node.props.size && node.props.size !== "default")
        attrs.push(`size="${node.props.size}"`);
      return {
        tag: "Button",
        imports: [{ from: UI("button"), names: ["Button"] }],
        attrs,
        text: node.props.label,
      };
    },
  },

  // ---------------------------------------------------------------- Inputs
  Input: {
    type: "Input",
    label: "Input",
    category: "Inputs",
    icon: TextCursorInput,
    canHaveChildren: false,
    defaultProps: { placeholder: "Enter text…", type: "text" },
    defaultStyles: { width: "full" },
    render: ({ node, className, rootProps }) => (
      <Input
        placeholder={node.props.placeholder}
        type={node.props.type}
        className={className}
        readOnly
        {...rootProps}
      />
    ),
    codegen: (node) => {
      const attrs: string[] = [];
      if (node.props.type && node.props.type !== "text")
        attrs.push(`type="${node.props.type}"`);
      if (node.props.placeholder)
        attrs.push(`placeholder="${node.props.placeholder}"`);
      return {
        tag: "Input",
        imports: [{ from: UI("input"), names: ["Input"] }],
        attrs,
        selfClosing: true,
      };
    },
  },

  Textarea: {
    type: "Textarea",
    label: "Textarea",
    category: "Inputs",
    icon: AlignLeft,
    canHaveChildren: false,
    defaultProps: { placeholder: "Type your message…" },
    defaultStyles: { width: "full" },
    render: ({ node, className, rootProps }) => (
      <Textarea
        placeholder={node.props.placeholder}
        className={className}
        readOnly
        {...rootProps}
      />
    ),
    codegen: (node) => ({
      tag: "Textarea",
      imports: [{ from: UI("textarea"), names: ["Textarea"] }],
      attrs: node.props.placeholder
        ? [`placeholder="${node.props.placeholder}"`]
        : [],
      selfClosing: true,
    }),
  },

  Switch: {
    type: "Switch",
    label: "Switch",
    category: "Inputs",
    icon: ToggleRight,
    canHaveChildren: false,
    defaultProps: { checked: true },
    defaultStyles: {},
    render: ({ node, className, rootProps }) => (
      <Switch
        checked={!!node.props.checked}
        onCheckedChange={() => {}}
        className={className}
        {...rootProps}
      />
    ),
    codegen: (node) => ({
      tag: "Switch",
      imports: [{ from: UI("switch"), names: ["Switch"] }],
      attrs: node.props.checked ? ["defaultChecked"] : [],
      selfClosing: true,
    }),
  },

  Checkbox: {
    type: "Checkbox",
    label: "Checkbox",
    category: "Inputs",
    icon: CheckSquare,
    canHaveChildren: false,
    defaultProps: { checked: false },
    defaultStyles: {},
    render: ({ node, className, rootProps }) => (
      <Checkbox
        checked={!!node.props.checked}
        onCheckedChange={() => {}}
        className={className}
        {...rootProps}
      />
    ),
    codegen: (node) => ({
      tag: "Checkbox",
      imports: [{ from: UI("checkbox"), names: ["Checkbox"] }],
      attrs: node.props.checked ? ["defaultChecked"] : [],
      selfClosing: true,
    }),
  },

  // --------------------------------------------------------------- Display
  Card: {
    type: "Card",
    label: "Card",
    category: "Display",
    icon: SquareStack,
    canHaveChildren: true,
    defaultProps: {},
    defaultStyles: {
      display: "flex",
      direction: "col",
      gap: 4,
      padding: 6,
      width: "full",
    },
    render: ({ className, children, rootProps }) => (
      <Card className={className} {...rootProps}>
        {children}
      </Card>
    ),
    codegen: () => ({
      tag: "Card",
      imports: [{ from: UI("card"), names: ["Card"] }],
      attrs: [],
    }),
  },

  Badge: {
    type: "Badge",
    label: "Badge",
    category: "Display",
    icon: Tag,
    canHaveChildren: false,
    defaultProps: { label: "Badge", variant: "default" },
    defaultStyles: {},
    render: ({ node, className, rootProps }) => (
      <Badge variant={node.props.variant} className={className} {...rootProps}>
        {node.props.label}
      </Badge>
    ),
    codegen: (node) => ({
      tag: "Badge",
      imports: [{ from: UI("badge"), names: ["Badge"] }],
      attrs:
        node.props.variant && node.props.variant !== "default"
          ? [`variant="${node.props.variant}"`]
          : [],
      text: node.props.label,
    }),
  },

  Avatar: {
    type: "Avatar",
    label: "Avatar",
    category: "Display",
    icon: CircleUser,
    canHaveChildren: false,
    defaultProps: {
      src: "https://github.com/shadcn.png",
      fallback: "CN",
    },
    defaultStyles: {},
    render: ({ node, className, rootProps }) => (
      <Avatar className={className} {...rootProps}>
        <AvatarImage src={node.props.src} />
        <AvatarFallback>{node.props.fallback}</AvatarFallback>
      </Avatar>
    ),
    codegen: (node) => ({
      tag: "Avatar",
      imports: [
        {
          from: UI("avatar"),
          names: ["Avatar", "AvatarImage", "AvatarFallback"],
        },
      ],
      attrs: [],
      innerJSX: `<AvatarImage src="${node.props.src}" />\n<AvatarFallback>${node.props.fallback}</AvatarFallback>`,
    }),
  },

  Image: {
    type: "Image",
    label: "Image",
    category: "Display",
    icon: ImageIcon,
    canHaveChildren: false,
    defaultProps: {
      src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&q=80",
      alt: "Image",
    },
    defaultStyles: { width: "full", radius: "lg" },
    render: ({ node, className, rootProps }) => (
      <img
        src={node.props.src}
        alt={node.props.alt}
        className={cn("object-cover", className)}
        draggable={false}
        {...rootProps}
      />
    ),
    codegen: (node) => ({
      tag: "img",
      imports: [],
      attrs: [`src="${node.props.src}"`, `alt="${node.props.alt}"`],
      extraClass: "object-cover",
      selfClosing: true,
    }),
  },

  Collapsible: {
    type: "Collapsible",
    label: "Collapsible",
    category: "Layout",
    icon: ChevronsUpDown,
    canHaveChildren: true,
    defaultProps: { title: "Details" },
    defaultStyles: { width: "full", border: true, radius: "lg", padding: 3 },
    render: ({ node, className, children, rootProps }) => (
      <details open className={cn("group", className)} {...rootProps}>
        <summary className="cursor-pointer list-none font-medium marker:hidden">
          {node.props.title ?? "Details"}
        </summary>
        <div className="pt-2">{children}</div>
      </details>
    ),
    // Custom child handling (summary + panel) is emitted in codegen's walk().
    codegen: (node) => ({
      tag: "details",
      imports: [],
      attrs: ["open"],
      extraClass: "group",
      text: node.props.title ?? "Details",
    }),
  },

  Icon: {
    type: "Icon",
    label: "Icon",
    category: "Display",
    icon: Sparkles,
    canHaveChildren: false,
    defaultProps: { icon: "Star" },
    defaultStyles: { textColor: "foreground" },
    render: ({ node, className, rootProps }) => {
      const Cmp = ICONS[node.props.icon] ?? ICONS.Star;
      return <Cmp className={cn("h-6 w-6", className)} {...rootProps} />;
    },
    codegen: (node) => {
      const name = node.props.icon && ICONS[node.props.icon] ? node.props.icon : "Star";
      return {
        tag: iconJsxName(name),
        imports: [{ from: "lucide-react", names: [iconImportName(name)] }],
        attrs: [],
        extraClass: "h-6 w-6",
        selfClosing: true,
      };
    },
  },

  Table: {
    type: "Table",
    label: "Table",
    category: "Display",
    icon: TableIcon,
    canHaveChildren: false,
    defaultProps: {
      headers: ["Name", "Role", "Status"],
      rows: [
        ["Ada Lovelace", "Engineer", "Active"],
        ["Grace Hopper", "Admiral", "Active"],
        ["Alan Turing", "Researcher", "Pending"],
      ],
    },
    defaultStyles: { width: "full" },
    render: ({ node, className, rootProps }) => {
      const headers: string[] = node.props.headers ?? [];
      const rows: string[][] = node.props.rows ?? [];
      return (
        <table
          className={cn("w-full border-collapse text-sm", className)}
          {...rootProps}
        >
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="border-b border-border px-3 py-2 text-left font-semibold"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, ci) => (
                  <td key={ci} className="border-b border-border px-3 py-2">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    },
    codegen: (node) => {
      const headers: string[] = node.props.headers ?? [];
      const rows: string[][] = node.props.rows ?? [];
      const esc = (s: string) =>
        String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/[{}]/g, (m) => `{'${m}'}`);
      const thead = `<thead>\n  <tr>\n${headers
        .map((h) => `    <th className="border-b px-3 py-2 text-left font-semibold">${esc(h)}</th>`)
        .join("\n")}\n  </tr>\n</thead>`;
      const tbody = `<tbody>\n${rows
        .map(
          (r) =>
            `  <tr>\n${r
              .map((c) => `    <td className="border-b px-3 py-2">${esc(c)}</td>`)
              .join("\n")}\n  </tr>`
        )
        .join("\n")}\n</tbody>`;
      return {
        tag: "table",
        imports: [],
        attrs: [],
        extraClass: "w-full border-collapse text-sm",
        innerJSX: `${thead}\n${tbody}`,
      };
    },
  },

  Divider: {
    type: "Divider",
    label: "Divider",
    category: "Display",
    icon: Minus,
    canHaveChildren: false,
    defaultProps: {},
    defaultStyles: { width: "full" },
    render: ({ className, rootProps }) => (
      <Separator className={className} {...rootProps} />
    ),
    codegen: () => ({
      tag: "Separator",
      imports: [{ from: UI("separator"), names: ["Separator"] }],
      attrs: [],
      selfClosing: true,
    }),
  },

  // Instance of a design-system component. Rendering/codegen resolve the linked
  // definition BEFORE consulting this def, so these bodies are safe fallbacks
  // only. Excluded from the palette (see nodeDefList below).
  Instance: {
    type: "Instance",
    label: "Component",
    category: "Display",
    icon: Component,
    canHaveChildren: false,
    defaultProps: {},
    defaultStyles: {},
    render: ({ className, children, rootProps }) => (
      <div className={className} {...rootProps}>
        {children}
      </div>
    ),
    codegen: () => ({ tag: "div", imports: [], attrs: [] }),
  },
};

/** Palette list — excludes "Instance" (components come from the design system). */
export const nodeDefList = Object.values(nodeDefs).filter(
  (d) => d.type !== "Instance"
);

export const categoryOrder: NodeCategory[] = [
  "Layout",
  "Typography",
  "Actions",
  "Inputs",
  "Display",
];

export function defFor(type: NodeType): NodeDef {
  return nodeDefs[type];
}
