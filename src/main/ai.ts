import type { DesignNode, NodeType, StyleTokens } from "@shared/types";
import { getAiKey } from "./secrets";

// AI generate-from-prompt: ask Claude for a UI layout as JSON, then validate/
// coerce it into a real DesignNode[] the canvas can render + export. All calls
// run here in main with the BYO key — never exposed to the renderer.

const MODEL = "claude-sonnet-5";
const API_URL = "https://api.anthropic.com/v1/messages";

const NODE_TYPES: NodeType[] = [
  "Container", "Grid", "Heading", "Text", "Link", "Button", "Input",
  "Textarea", "Card", "Badge", "Avatar", "Image", "Divider", "Switch", "Checkbox",
];
const STYLE_KEYS: (keyof StyleTokens)[] = [
  "display", "direction", "align", "justify", "wrap", "gap", "gridCols",
  "padding", "margin", "width", "height", "bg", "textColor", "radius", "border",
  "shadow", "fontSize", "fontWeight", "textAlign",
];
const CONTAINERS = new Set(["Container", "Grid", "Card"]);
const TYPESET = new Set<string>(NODE_TYPES);
const STYLESET = new Set<string>(STYLE_KEYS as string[]);

const SYSTEM = `You generate UI layouts for a design-to-code tool. Return ONLY a JSON array of node objects — no prose, no markdown fences.

Node shape: { "type": <NodeType>, "props"?: {…}, "styles"?: {…}, "children"?: [ …nodes ] }

NodeType is one of: ${NODE_TYPES.join(", ")}. Only Container, Grid, and Card may have children.

props by type:
- Heading / Text: { "content": string }  (Heading also { "level": 1-4 })
- Button / Badge: { "label": string, "variant"?: "default"|"secondary"|"outline"|"ghost"|"destructive" }
- Link: { "content": string, "href": string }
- Input / Textarea: { "placeholder": string }
- Image: { "src"?: string, "alt"?: string }

styles (all optional) use ONLY these keys/values:
- display: "flex"|"grid"|"block"; direction: "row"|"col"; align: "start"|"center"|"end"|"stretch"; justify: "start"|"center"|"end"|"between"|"around"; wrap: boolean; gap: 0-12; gridCols: 1-6
- padding/margin: 0-12; width/height: "full"|"auto"|"fit"|"1/2"|"1/3"|"2/3"|"1/4" or a px number as a string
- bg: "background"|"card"|"muted"|"secondary"|"accent"|"primary"|"transparent"; textColor: "foreground"|"muted"|"primary"|"secondary"|"destructive"|"white"
- radius: "none"|"sm"|"md"|"lg"|"xl"|"2xl"|"full"; border: boolean; shadow: "none"|"sm"|"md"|"lg"|"xl"
- fontSize: "xs"|"sm"|"base"|"lg"|"xl"|"2xl"|"3xl"|"4xl"; fontWeight: "normal"|"medium"|"semibold"|"bold"; textAlign: "left"|"center"|"right"

Wrap the layout in a single top-level Container (flex col, some padding, width "full"). Keep it tasteful and realistic. Return 1-2 top-level nodes.`;

/** Pull the human-readable message out of an Anthropic error body, else fall back to the raw text. */
function errorMessage(raw: string): string {
  try {
    const j = JSON.parse(raw) as { error?: { message?: string } };
    if (j?.error?.message) return j.error.message;
  } catch {
    /* not JSON */
  }
  return raw.slice(0, 180) || "request failed";
}

function extractJson(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const start = t.search(/[[{]/);
  if (start >= 0) t = t.slice(start);
  const end = Math.max(t.lastIndexOf("]"), t.lastIndexOf("}"));
  if (end >= 0) t = t.slice(0, end + 1);
  return JSON.parse(t);
}

let _idc = 0;
function coerce(raw: unknown): DesignNode | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const type = r.type;
  if (typeof type !== "string" || !TYPESET.has(type)) return null;
  const styles: Record<string, unknown> = {};
  if (r.styles && typeof r.styles === "object") {
    for (const [k, v] of Object.entries(r.styles as object)) {
      if (STYLESET.has(k)) styles[k] = v;
    }
  }
  const props =
    r.props && typeof r.props === "object" ? { ...(r.props as object) } : {};
  const children: DesignNode[] = [];
  if (CONTAINERS.has(type) && Array.isArray(r.children)) {
    for (const c of r.children) {
      const cc = coerce(c);
      if (cc) children.push(cc);
    }
  }
  return {
    id: `ai${++_idc}`,
    type: type as NodeType,
    props: props as Record<string, unknown>,
    styles: styles as StyleTokens,
    children,
  };
}

export async function aiGenerate(
  prompt: string
): Promise<{ ok: true; nodes: DesignNode[] } | { ok: false; error: string }> {
  const key = getAiKey();
  if (!key) return { ok: false, error: "Connect your Anthropic API key first." };
  const clean = (prompt || "").trim();
  if (!clean) return { ok: false, error: "Describe what to build." };
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        // This is a structured-JSON extraction task, not a reasoning one. Sonnet 5
        // runs adaptive thinking by default, which would consume the max_tokens
        // budget and truncate the JSON — disable it so the full budget is output.
        thinking: { type: "disabled" },
        system: SYSTEM,
        messages: [{ role: "user", content: clean }],
      }),
    });
    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      const msg = errorMessage(raw);
      console.error(`[ai] Anthropic API ${res.status}:`, raw.slice(0, 500));
      return { ok: false, error: `Anthropic API ${res.status}: ${msg}` };
    }
    const data = (await res.json()) as {
      content?: { text?: string }[];
      stop_reason?: string;
    };
    const text = Array.isArray(data.content)
      ? data.content.map((b) => b.text ?? "").join("")
      : "";
    let parsed: unknown;
    try {
      parsed = extractJson(text);
    } catch {
      console.error("[ai] Non-JSON response (stop_reason:", data.stop_reason, "):", text.slice(0, 500));
      return {
        ok: false,
        error:
          data.stop_reason === "max_tokens"
            ? "Response was cut off — try a shorter prompt."
            : "AI response wasn't valid JSON.",
      };
    }
    const arr = Array.isArray(parsed)
      ? parsed
      : (parsed as { nodes?: unknown })?.nodes;
    if (!Array.isArray(arr)) return { ok: false, error: "AI returned an unexpected shape." };
    const nodes = arr.map(coerce).filter((n): n is DesignNode => n != null);
    if (!nodes.length) return { ok: false, error: "AI returned no usable nodes." };
    return { ok: true, nodes };
  } catch (e) {
    console.error("[ai] request failed:", e);
    return { ok: false, error: (e as Error)?.message ?? "Network request failed." };
  }
}
