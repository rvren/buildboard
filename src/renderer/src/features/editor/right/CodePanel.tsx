import { useMemo, useState } from "react";
import { Highlight, themes } from "prism-react-renderer";
import { Check, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { findNode } from "@/lib/tree";
import { generateComponentCode, generatePageCode } from "@/lib/codegen";
import { useEditor } from "@/store/editorStore";
import { useTheme } from "@/store/theme";
import { downloadText } from "@/lib/export";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Mode = "selection" | "page";

export function CodePanel() {
  const screen = useEditor((s) => s.currentScreen());
  const project = useEditor((s) => s.currentProject());
  const selectedId = useEditor((s) => s.selectedNodeId);
  const theme = useTheme((s) => s.theme);
  const [mode, setMode] = useState<Mode>("selection");
  const [copied, setCopied] = useState(false);

  const selectedNode =
    screen && selectedId ? findNode(screen.root, selectedId) : null;
  const effectiveMode: Mode =
    mode === "selection" && !selectedNode ? "page" : mode;

  const code = useMemo(() => {
    if (!screen) return "";
    if (effectiveMode === "page") return generatePageCode(screen, project);
    return selectedNode
      ? generateComponentCode(selectedNode, project, screen.dataSourceId)
      : "";
  }, [screen, selectedNode, effectiveMode, project]);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const name =
      effectiveMode === "page"
        ? `${screen?.name ?? "Page"}.tsx`
        : `${selectedNode?.name ?? "Component"}.tsx`;
    downloadText(name.replace(/\s+/g, ""), code);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex rounded-md border bg-muted/40 p-0.5">
          {(["selection", "page"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              disabled={m === "selection" && !selectedNode}
              className={cn(
                "h-7 rounded-[5px] px-3 text-xs font-medium capitalize transition-colors disabled:opacity-40",
                effectiveMode === m
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={download}
            title="Download .tsx"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={copy}
            title="Copy"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin bg-[#1e1e1e] dark:bg-[#141414]">
        <Highlight
          code={code}
          language="tsx"
          theme={theme === "dark" ? themes.vsDark : themes.nightOwl}
        >
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={cn(className, "p-4 text-[12.5px] leading-relaxed")}
              style={{
                ...style,
                background: undefined,
                backgroundColor: "transparent",
                margin: 0,
                fontFamily: "'Geist Mono', ui-monospace, monospace",
              }}
            >
              {tokens.map((line, i) => {
                const lineProps = getLineProps({ line });
                return (
                  <div key={i} {...lineProps} className={cn(lineProps.className, "table-row")}>
                    <span className="table-cell select-none pr-4 text-right text-[11px] text-white/25">
                      {i + 1}
                    </span>
                    <span className="table-cell">
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </span>
                  </div>
                );
              })}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
