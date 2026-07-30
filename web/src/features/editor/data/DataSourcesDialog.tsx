import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Database, Trash2, Copy, Circle, Braces } from "lucide-react";
import { toast } from "sonner";
import type { DataSource, DataSourceKind } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditor } from "@/store/editorStore";
import { runRequest } from "@/lib/dataSource";
import { listRow } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { RequestEditor } from "./RequestEditor";
import { ResponseViewer } from "./ResponseViewer";
import { ConstantEditor } from "./ConstantEditor";

const METHOD_COLOR: Record<string, string> = {
  GET: "text-emerald-500",
  POST: "text-amber-500",
  PUT: "text-blue-500",
  PATCH: "text-violet-500",
  DELETE: "text-rose-500",
};

export function DataSourcesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const project = useEditor((s) => s.currentProject());
  const addDataSource = useEditor((s) => s.addDataSource);
  const updateDataSource = useEditor((s) => s.updateDataSource);
  const deleteDataSource = useEditor((s) => s.deleteDataSource);
  const duplicateDataSource = useEditor((s) => s.duplicateDataSource);

  const sources = useMemo(() => project?.dataSources ?? [], [project]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Keep a valid selection as the list changes.
  useEffect(() => {
    if (!open) return;
    if (sources.length === 0) {
      setSelectedId(null);
    } else if (!sources.some((s) => s.id === selectedId)) {
      setSelectedId(sources[0].id);
    }
  }, [open, sources, selectedId]);

  const selected = sources.find((s) => s.id === selectedId) ?? null;

  const create = (kind: DataSourceKind = "api") => {
    const id = addDataSource(undefined, kind);
    if (id) setSelectedId(id);
  };

  const send = async (ds: DataSource) => {
    setSendingId(ds.id);
    try {
      const result = await runRequest(ds);
      updateDataSource(ds.id, { lastResult: result, lastError: undefined });
    } catch (e: any) {
      updateDataSource(ds.id, {
        lastError: e?.message || "Network request failed",
        lastResult: undefined,
      });
    } finally {
      setSendingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] max-h-[720px] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-3.5 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-primary" />
            Data sources
          </DialogTitle>
          <DialogDescription className="text-xs">
            Define API endpoints, send live requests, and infer response schemas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          {/* Master list */}
          <div className="flex w-60 shrink-0 flex-col border-r bg-muted/20">
            <div className="grid grid-cols-2 gap-1.5 p-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-center px-2"
                onClick={() => create("api")}
              >
                <Plus className="h-3.5 w-3.5" />
                API
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-center px-2"
                onClick={() => create("constant")}
              >
                <Braces className="h-3.5 w-3.5" />
                Constant
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-0.5 px-2 pb-2">
                <AnimatePresence initial={false}>
                  {sources.map((ds) => (
                    <motion.button
                      key={ds.id}
                      layout
                      variants={listRow}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      onClick={() => setSelectedId(ds.id)}
                      className={cn(
                        "group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors",
                        selectedId === ds.id
                          ? "bg-background shadow-sm ring-1 ring-border"
                          : "hover:bg-background/60"
                      )}
                    >
                      <span
                        className={cn(
                          "font-mono text-[10px] font-bold",
                          ds.kind === "constant"
                            ? "text-violet-500"
                            : METHOD_COLOR[ds.method]
                        )}
                      >
                        {ds.kind === "constant" ? "{ }" : ds.method}
                      </span>
                      <span className="flex-1 truncate font-medium">
                        {ds.name}
                      </span>
                      <span className="hidden items-center gap-0.5 group-hover:flex">
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateDataSource(ds.id);
                          }}
                          className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="h-3 w-3" />
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDataSource(ds.id);
                            toast.success("Data source deleted");
                          }}
                          className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </span>
                      </span>
                      {ds.schema && ds.schema.length > 0 && (
                        <Circle className="h-1.5 w-1.5 fill-primary text-primary group-hover:hidden" />
                      )}
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>

          {/* Detail */}
          <div className="flex min-h-0 flex-1 flex-col">
            {selected ? (
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto scrollbar-thin p-4">
                {selected.kind === "constant" ? (
                  <ConstantEditor
                    ds={selected}
                    onChange={(patch) => updateDataSource(selected.id, patch)}
                  />
                ) : (
                  <>
                    <RequestEditor
                      ds={selected}
                      onChange={(patch) => updateDataSource(selected.id, patch)}
                      onSend={() => send(selected)}
                      sending={sendingId === selected.id}
                    />
                    <ResponseViewer
                      ds={selected}
                      onUseSchema={(schema) =>
                        updateDataSource(selected.id, { schema })
                      }
                    />
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">No data sources yet</p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    Create a request to connect your design to a live API.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => create("api")}>
                    <Plus className="h-3.5 w-3.5" />
                    API request
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => create("constant")}
                  >
                    <Braces className="h-3.5 w-3.5" />
                    Constant
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
