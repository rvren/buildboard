import type { DesignNode, NodeType, StyleTokens } from "@/types";
import { createNode } from "@/lib/factory";

// One-click starter layouts for an empty screen. Each `build()` returns a fresh
// subtree (new ids via createNode) inserted into the current screen's root.

function n(
  type: NodeType,
  opts: {
    styles?: Partial<StyleTokens>;
    props?: Record<string, unknown>;
    children?: DesignNode[];
  } = {}
): DesignNode {
  const node = createNode(type);
  if (opts.styles) node.styles = { ...node.styles, ...opts.styles };
  if (opts.props) node.props = { ...node.props, ...opts.props };
  if (opts.children) node.children = opts.children;
  return node;
}

export interface Starter {
  id: string;
  name: string;
  hint: string;
  build: () => DesignNode[];
}

export const STARTERS: Starter[] = [
  {
    id: "hero",
    name: "Hero",
    hint: "Heading, subtext, and CTAs",
    build: () => [
      n("Container", {
        styles: {
          display: "flex",
          direction: "col",
          align: "center",
          justify: "center",
          gap: 4,
          padding: 12,
          width: "full",
        },
        children: [
          n("Heading", {
            props: { content: "Design, then ship.", level: 1 },
            styles: { fontSize: "4xl", fontWeight: "bold", textAlign: "center" },
          }),
          n("Text", {
            props: { content: "A one-line subheading that sells the idea." },
            styles: { textColor: "muted", fontSize: "lg", textAlign: "center" },
          }),
          n("Container", {
            styles: { display: "flex", direction: "row", gap: 3 },
            children: [
              n("Button", { props: { label: "Get started" } }),
              n("Button", { props: { label: "Learn more", variant: "outline" } }),
            ],
          }),
        ],
      }),
    ],
  },
  {
    id: "navbar",
    name: "Navbar",
    hint: "Logo, links, and a button",
    build: () => [
      n("Container", {
        styles: {
          display: "flex",
          direction: "row",
          align: "center",
          justify: "between",
          padding: 4,
          width: "full",
          border: true,
        },
        children: [
          n("Heading", {
            props: { content: "Logo", level: 3 },
            styles: { fontSize: "lg", fontWeight: "bold" },
          }),
          n("Container", {
            styles: { display: "flex", direction: "row", align: "center", gap: 6 },
            children: [
              n("Link", { props: { content: "Features", href: "#features" } }),
              n("Link", { props: { content: "Pricing", href: "#pricing" } }),
              n("Link", { props: { content: "About", href: "/about" } }),
              n("Button", { props: { label: "Sign in", variant: "outline" } }),
            ],
          }),
        ],
      }),
    ],
  },
  {
    id: "cards",
    name: "Card grid",
    hint: "A responsive 3-up grid",
    build: () => [
      n("Grid", {
        styles: { display: "grid", gridCols: 3, gap: 4, padding: 6, width: "full" },
        children: [1, 2, 3].map((i) =>
          n("Card", {
            styles: {
              display: "flex",
              direction: "col",
              gap: 2,
              padding: 5,
              radius: "lg",
              border: true,
            },
            children: [
              n("Heading", {
                props: { content: `Feature ${i}`, level: 3 },
                styles: { fontSize: "lg", fontWeight: "semibold" },
              }),
              n("Text", {
                props: { content: "Describe the feature in a sentence or two." },
                styles: { textColor: "muted", fontSize: "sm" },
              }),
            ],
          })
        ),
      }),
    ],
  },
  {
    id: "form",
    name: "Sign-up form",
    hint: "A centered card with inputs",
    build: () => [
      n("Container", {
        styles: {
          display: "flex",
          direction: "col",
          align: "center",
          justify: "center",
          padding: 12,
          width: "full",
        },
        children: [
          n("Card", {
            styles: {
              display: "flex",
              direction: "col",
              gap: 3,
              padding: 6,
              radius: "lg",
              border: true,
              width: "384",
            },
            children: [
              n("Heading", {
                props: { content: "Create your account", level: 2 },
                styles: { fontSize: "xl", fontWeight: "semibold" },
              }),
              n("Input", {
                props: { placeholder: "Email address" },
                styles: { width: "full" },
              }),
              n("Input", {
                props: { placeholder: "Password", type: "password" },
                styles: { width: "full" },
              }),
              n("Button", { props: { label: "Sign up" }, styles: { width: "full" } }),
            ],
          }),
        ],
      }),
    ],
  },
];
