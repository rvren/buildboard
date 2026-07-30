import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  Database,
  Plus,
  ChevronRight,
  List,
  Braces,
  Settings2,
} from "lucide-react";
import type { DataSource, SchemaField } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEditor } from "@/store/editorStore";

const TYPE_COLOR: Record<string, string> = {
  string: "text-emerald-500",
  number: "text-blue-500",
  boolean: "text-amber-500",
  object: "text-violet-500",
  array: "text-rose-500",
  null: "text-muted-foreground",
};

export function DataTab() {
  const project = useEditor((s) => s.currentProject());
  const openData = useEditor((s) => s.setDataDialogOpen);
  const sources = project?.dataSources ?? [];

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
            Data sources
          </p>
          <button
            onClick={() => openData(true)}
            className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Manage data sources"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {sources.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-center">
            <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground">
              <Database className="h-4 w-4" />
            </div>
            <p className="text-xs font-medium">No data yet</p>
            <p className="mb-3 mt-0.5 text-[11px] text-muted-foreground">
              Add a source, then drag fields onto the canvas.
            </p>
            <Button size="sm" className="h-7 w-full" onClick={() => openData(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add data source
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {sources.map((ds) => (
              <SourceGroup key={ds.id} ds={ds} />
            ))}
            <p className="px-1 pt-1 text-[11px] leading-snug text-muted-foreground">
              Drag a field onto the canvas to bind it. Drag an{" "}
              <span className="text-rose-500">array</span> onto a container to
              repeat it.
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function SourceGroup({ ds }: { ds: DataSource }) {
  const [open, setOpen] = useState(true);
  const fields = ds.schema ?? [];

  return (
    <div className="rounded-lg border bg-background/60">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            open && "rotate-90"
          )}
        />
        <span
          className={cn(
            "font-mono text-[10px] font-bold",
            ds.kind === "constant" ? "text-violet-500" : "text-emerald-500"
          )}
        >
          {ds.kind === "constant" ? "{ }" : ds.method}
        </span>
        <span className="flex-1 truncate text-xs font-medium">{ds.name}</span>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {fields.length}
        </span>
      </button>
      {open && (
        <div className="space-y-0.5 px-1.5 pb-1.5">
          {fields.length === 0 ? (
            <p className="px-2 py-1 text-[11px] text-muted-foreground">
              No schema — send/define the source first.
            </p>
          ) : (
            fields.map((f) => (
              <FieldChip key={f.path} sourceId={ds.id} field={f} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function FieldChip({
  sourceId,
  field,
}: {
  sourceId: string;
  field: SchemaField;
}) {
  const isArray = field.type === "array";
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `field:${sourceId}:${field.path}`,
    data: { kind: "field", sourceId, path: field.path, fieldType: field.type },
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex w-full cursor-grab items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      {isArray ? (
        <List className="h-3 w-3 shrink-0 text-rose-500" />
      ) : (
        <Braces className="h-3 w-3 shrink-0 text-muted-foreground" />
      )}
      <span className="flex-1 truncate font-mono text-[11px]">{field.path}</span>
      <span className={cn("shrink-0 font-mono text-[10px]", TYPE_COLOR[field.type])}>
        {field.type}
      </span>
    </button>
  );
}
