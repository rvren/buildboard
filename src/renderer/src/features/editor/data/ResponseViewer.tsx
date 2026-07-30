import { useMemo, useState } from "react";
import { Highlight, themes } from "prism-react-renderer";
import { AlertTriangle, Check, Braces, ListTree } from "lucide-react";
import { toast } from "sonner";
import type { DataSource } from "@/types";
import { schemaFromBody } from "@/lib/dataSource";
import { useTheme } from "@/store/theme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type View = "response" | "schema";

const TYPE_COLOR: Record<string, string> = {
  string: "text-emerald-500",
  number: "text-blue-500",
  boolean: "text-amber-500",
  object: "text-violet-500",
  array: "text-rose-500",
  null: "text-muted-foreground",
};

export function ResponseViewer({
  ds,
  onUseSchema,
}: {
  ds: DataSource;
  onUseSchema: (schema: NonNullable<DataSource["schema"]>) => void;
}) {
  const theme = useTheme((s) => s.theme);
  const [view, setView] = useState<View>("response");

  const inferred = useMemo(
    () => (ds.lastResult ? schemaFromBody(ds.lastResult.body) : null),
    [ds.lastResult]
  );

  if (ds.lastError) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-destructive">Request failed</p>
          <p className="text-xs text-muted-foreground">{ds.lastError}</p>
          <p className="pt-1 text-xs text-muted-foreground/80">
            Browser requests are subject to CORS. Public / CORS-enabled APIs
            work; others may be blocked without a backend proxy.
          </p>
        </div>
      </div>
    );
  }

  if (!ds.lastResult) {
    return (
      <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
        <Braces className="h-5 w-5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Send the request to see the response and inferred schema.
        </p>
      </div>
    );
  }

  const r = ds.lastResult;

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Badge
            variant={r.ok ? "secondary" : "destructive"}
            className={cn("font-mono text-[10px]", r.ok && "text-emerald-500")}
          >
            {r.status}
          </Badge>
          <span className="text-xs tabular-nums text-muted-foreground">
            {r.timeMs} ms
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex rounded-md border bg-muted/40 p-0.5">
            {(["response", "schema"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "flex h-6 items-center gap-1 rounded-[5px] px-2 text-[11px] font-medium capitalize transition-colors",
                  view === v
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v === "response" ? (
                  <Braces className="h-3 w-3" />
                ) : (
                  <ListTree className="h-3 w-3" />
                )}
                {v}
              </button>
            ))}
          </div>
          {view === "schema" && inferred && inferred.length > 0 && (
            <Button
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() => {
                onUseSchema(inferred);
                toast.success("Schema saved to data source");
              }}
            >
              <Check className="h-3 w-3" />
              Use as schema
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
        {view === "response" ? (
          <Highlight
            code={r.body}
            language="json"
            theme={theme === "dark" ? themes.vsDark : themes.nightOwlLight}
          >
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
              <pre
                className={cn(className, "p-3 text-[12px] leading-relaxed")}
                style={{
                  ...style,
                  background: undefined,
                  backgroundColor: "transparent",
                  margin: 0,
                  fontFamily: "'Geist Mono', ui-monospace, monospace",
                }}
              >
                {tokens.map((line, i) => (
                  <div key={i} {...getLineProps({ line })}>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </div>
                ))}
              </pre>
            )}
          </Highlight>
        ) : (
          <div className="p-2">
            {inferred && inferred.length > 0 ? (
              <div className="font-mono text-[12px]">
                {inferred.map((f) => (
                  <div
                    key={f.path}
                    className="flex items-center justify-between rounded px-2 py-1 hover:bg-muted/50"
                  >
                    <span className="truncate text-foreground/90">{f.path}</span>
                    <span className={cn("ml-3 shrink-0", TYPE_COLOR[f.type])}>
                      {f.type}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-3 text-xs text-muted-foreground">
                Response isn't JSON — no schema to infer.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
