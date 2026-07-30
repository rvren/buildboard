import { useEffect, useMemo } from "react";
import { AlertTriangle, ListTree } from "lucide-react";
import type { DataSource } from "@/types";
import { schemaFromBody } from "@/lib/dataSource";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TYPE_COLOR: Record<string, string> = {
  string: "text-emerald-500",
  number: "text-blue-500",
  boolean: "text-amber-500",
  object: "text-violet-500",
  array: "text-rose-500",
  null: "text-muted-foreground",
};

export function ConstantEditor({
  ds,
  onChange,
}: {
  ds: DataSource;
  onChange: (patch: Partial<DataSource>) => void;
}) {
  const schema = useMemo(
    () => schemaFromBody(ds.data ?? ""),
    [ds.data]
  );
  const valid = schema !== null;

  // Backfill schema for constants created before schema-on-create.
  useEffect(() => {
    if (!ds.schema && schema && schema.length) {
      onChange({ schema });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ds.id]);

  const setData = (data: string) => {
    onChange({ data, schema: schemaFromBody(data) ?? undefined });
  };

  return (
    <div className="space-y-3">
      <input
        value={ds.name}
        onChange={(e) => onChange({ name: e.target.value })}
        className="w-full bg-transparent text-sm font-semibold outline-none"
        placeholder="Constant name"
      />
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          JSON data
        </p>
        <Textarea
          value={ds.data ?? ""}
          onChange={(e) => setData(e.target.value)}
          spellCheck={false}
          className={cn(
            "min-h-[200px] font-mono text-xs",
            !valid && (ds.data ?? "").trim() && "border-destructive/50"
          )}
        />
        {!valid && (ds.data ?? "").trim() && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            Invalid JSON
          </p>
        )}
      </div>

      <div className="rounded-lg border">
        <div className="flex items-center gap-1.5 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
          <ListTree className="h-3.5 w-3.5" />
          Schema
        </div>
        <div className="p-2">
          {schema && schema.length > 0 ? (
            <div className="font-mono text-[12px]">
              {schema.map((f) => (
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
            <p className="p-2 text-xs text-muted-foreground">
              Enter valid JSON to derive bindable fields.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
