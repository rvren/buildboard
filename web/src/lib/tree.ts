import type { DesignNode } from "@/types";

/** Deep-clone a node, assigning fresh ids to it and all descendants. */
export function cloneNodeWithNewIds(
  node: DesignNode,
  makeId: (prefix?: string) => string
): DesignNode {
  return {
    ...node,
    id: makeId("node"),
    props: { ...node.props },
    styles: { ...node.styles },
    children: node.children.map((c) => cloneNodeWithNewIds(c, makeId)),
  };
}

/** Find a node by id (depth-first). Returns null if absent. */
export function findNode(
  root: DesignNode,
  id: string
): DesignNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

/** Find a node's parent and its index within that parent. */
export function findParent(
  root: DesignNode,
  id: string
): { parent: DesignNode; index: number } | null {
  for (let i = 0; i < root.children.length; i++) {
    if (root.children[i].id === id) return { parent: root, index: i };
    const deeper = findParent(root.children[i], id);
    if (deeper) return deeper;
  }
  return null;
}

/** Immutably map over a node subtree, replacing the node with matching id. */
export function updateNodeById(
  root: DesignNode,
  id: string,
  updater: (node: DesignNode) => DesignNode
): DesignNode {
  if (root.id === id) return updater(root);
  return {
    ...root,
    children: root.children.map((c) => updateNodeById(c, id, updater)),
  };
}

/** Immutably insert `child` into parent `parentId` at `index` (append if -1). */
export function insertChild(
  root: DesignNode,
  parentId: string,
  child: DesignNode,
  index: number
): DesignNode {
  return updateNodeById(root, parentId, (parent) => {
    const children = [...parent.children];
    const i = index < 0 || index > children.length ? children.length : index;
    children.splice(i, 0, child);
    return { ...parent, children };
  });
}

/** Immutably remove node `id`, returning the new tree and the removed node. */
export function removeNode(
  root: DesignNode,
  id: string
): { tree: DesignNode; removed: DesignNode | null } {
  let removed: DesignNode | null = null;
  const walk = (node: DesignNode): DesignNode => {
    const children: DesignNode[] = [];
    for (const c of node.children) {
      if (c.id === id) {
        removed = c;
        continue;
      }
      children.push(walk(c));
    }
    return { ...node, children };
  };
  const tree = walk(root);
  return { tree, removed };
}

/** Path of nodes from root down to `id` (inclusive), or null if not found. */
export function findPath(
  root: DesignNode,
  id: string,
  trail: DesignNode[] = []
): DesignNode[] | null {
  const next = [...trail, root];
  if (root.id === id) return next;
  for (const child of root.children) {
    const found = findPath(child, id, next);
    if (found) return found;
  }
  return null;
}

/** Nearest ancestor (excluding the node itself) that has a `repeat` binding. */
export function findRepeatAncestor(
  root: DesignNode,
  id: string
): DesignNode | null {
  const path = findPath(root, id);
  if (!path) return null;
  for (let i = path.length - 2; i >= 0; i--) {
    if (path[i].repeat) return path[i];
  }
  return null;
}

/** True if `ancestorId` is an ancestor of (or equal to) `id`. */
export function isAncestor(
  root: DesignNode,
  ancestorId: string,
  id: string
): boolean {
  const ancestor = findNode(root, ancestorId);
  if (!ancestor) return false;
  return !!findNode(ancestor, id);
}
