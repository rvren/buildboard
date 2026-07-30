import type { ComponentDefinition, DesignNode, NodeType } from "@/types";

// Component "props / slots": an instance can override the TEXT of a definition's
// descendant nodes (a nested Heading, Button, Link…) — not just the root's props —
// without detaching or editing the definition. Slot overrides are stored in the
// same instance `overrides` bag under keys of the form "<nodeId>@<prop>", so no
// new persisted state is needed. The renderer (resolveInstance) and the code
// generator both call resolveInstanceTree, so the canvas equals the export.

type SlotProp = "content" | "label" | "href";

const SLOT_PROPS: Partial<Record<NodeType, SlotProp[]>> = {
  Heading: ["content"],
  Text: ["content"],
  Button: ["label"],
  Badge: ["label"],
  Link: ["content", "href"],
};

export interface TextSlot {
  key: string; // "<nodeId>@<prop>"
  nodeId: string;
  prop: SlotProp;
  type: NodeType;
  label: string; // human label for the field
  defaultValue: string; // the definition's value
}

const slotKey = (nodeId: string, prop: SlotProp) => `${nodeId}@${prop}`;

/** Overridable text slots inside a definition (descendants only, not the root). */
export function textSlots(def: ComponentDefinition): TextSlot[] {
  const out: TextSlot[] = [];
  const walk = (n: DesignNode, isRoot: boolean) => {
    if (!isRoot) {
      const props = SLOT_PROPS[n.type];
      if (props) {
        for (const prop of props) {
          out.push({
            key: slotKey(n.id, prop),
            nodeId: n.id,
            prop,
            type: n.type,
            label: n.name || `${n.type} ${prop === "href" ? "link" : "text"}`,
            defaultValue: String(n.props?.[prop] ?? ""),
          });
        }
      }
    }
    for (const c of n.children ?? []) walk(c, false);
  };
  walk(def.root, true);
  return out;
}

/**
 * Apply an instance's overrides to its definition: variant styles + root-prop
 * overrides (plain keys) + descendant slot overrides (keys with "@") → a fully
 * resolved DesignNode subtree.
 */
export function resolveInstanceTree(
  def: ComponentDefinition,
  instance: DesignNode
): DesignNode {
  const overrides = instance.overrides ?? {};
  const rootProps: Record<string, unknown> = {};
  const slots = new Map<string, Record<string, unknown>>();
  for (const [k, v] of Object.entries(overrides)) {
    const at = k.indexOf("@");
    if (at > 0) {
      const id = k.slice(0, at);
      const prop = k.slice(at + 1);
      const cur = slots.get(id) ?? {};
      cur[prop] = v;
      slots.set(id, cur);
    } else {
      rootProps[k] = v;
    }
  }
  const variant = instance.variant
    ? def.variants?.find((x) => x.id === instance.variant)
    : undefined;

  const patch = (n: DesignNode, isRoot: boolean): DesignNode => {
    const slot = slots.get(n.id);
    return {
      ...n,
      props: {
        ...n.props,
        ...(isRoot ? rootProps : {}),
        ...(slot ?? {}),
      },
      styles: isRoot ? { ...n.styles, ...(variant?.styles ?? {}) } : n.styles,
      children: (n.children ?? []).map((c) => patch(c, false)),
    };
  };
  return patch(def.root, true);
}
