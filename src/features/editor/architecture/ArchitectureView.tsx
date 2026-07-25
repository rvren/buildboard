import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Waypoints,
  Wand2,
  GitBranch,
  Copy,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Info,
} from "lucide-react";
import type {
  ArchService,
  Project,
  SeqStep,
  SequenceDiagram,
  ServiceKind,
} from "@/types";
import { useEditor } from "@/store/editorStore";
import { uid } from "@/lib/utils";
import {
  serviceMapMermaid,
  sequenceMermaid,
  deriveSequence,
} from "@/lib/architecture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dropdown } from "@/features/editor/right/controls";
import { cn } from "@/lib/utils";
import { Mermaid } from "./Mermaid";

const KINDS: ServiceKind[] = [
  "frontend",
  "service",
  "database",
  "external",
  "queue",
  "auth",
];

/** Left rail panel for the Architecture view (services or sequences editor). */
export function ArchLeft({ project }: { project: Project }) {
  const tool = useEditor((s) => s.archTool);
  const selectedId = useEditor((s) => s.selectedSeqId);
  const setSelectedId = useEditor((s) => s.setSelectedSeqId);
  useSyncSelectedSeq(project.architecture.sequences);

  return (
    <ScrollArea className="h-full">
      {tool === "services" ? (
        <ServicesEditor project={project} />
      ) : (
        <SequencesEditor
          project={project}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
        />
      )}
    </ScrollArea>
  );
}

/** Main diagram area for the Architecture view. */
export function ArchMain({ project }: { project: Project }) {
  const tool = useEditor((s) => s.archTool);
  const selectedId = useEditor((s) => s.selectedSeqId);
  const arch = project.architecture;
  const selectedSeq = arch.sequences.find((s) => s.id === selectedId) ?? null;

  return (
    <ScrollArea className="min-h-0 flex-1 app-wash bg-background">
      <div className="p-8">
        {tool === "services" ? (
          <Mermaid code={serviceMapMermaid(arch.services, arch.interactions)} />
        ) : (
          <SequencePreview seq={selectedSeq} />
        )}
      </div>
    </ScrollArea>
  );
}

/* Plain-language labels for the raw mermaid step types (model values unchanged). */
const STEP_TYPES: {
  value: SeqStep["type"];
  label: string;
  glyph: string;
}[] = [
  { value: "sync", label: "Calls", glyph: "→" },
  { value: "async", label: "Notifies", glyph: "⇢" },
  { value: "response", label: "Replies", glyph: "⤎" },
];

/* --------------------------------------------------------------- Services */
function ServicesEditor({ project }: { project: Project }) {
  const update = useEditor((s) => s.updateArchitecture);
  const sync = useEditor((s) => s.syncArchitecture);
  const { services, interactions } = project.architecture;

  return (
    <div className="space-y-5 p-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/70">
            Services
          </p>
          <button
            onClick={() =>
              update((a) => ({
                ...a,
                services: [
                  ...a.services,
                  { id: uid("svc"), name: "New service", kind: "service" },
                ],
              }))
            }
            className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-2">
          {services.map((svc) => (
            <div key={svc.id} className="space-y-1.5 rounded-lg border p-2">
              <div className="flex items-center gap-1.5">
                <Input
                  value={svc.name}
                  onChange={(e) =>
                    update((a) => ({
                      ...a,
                      services: a.services.map((s) =>
                        s.id === svc.id ? { ...s, name: e.target.value } : s
                      ),
                    }))
                  }
                  className="h-7 text-xs"
                />
                <button
                  onClick={() =>
                    update((a) => ({
                      ...a,
                      services: a.services.filter((s) => s.id !== svc.id),
                      interactions: a.interactions.filter(
                        (i) => i.from !== svc.id && i.to !== svc.id
                      ),
                    }))
                  }
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <Dropdown
                value={svc.kind}
                onChange={(v) =>
                  update((a) => ({
                    ...a,
                    services: a.services.map((s) =>
                      s.id === svc.id ? { ...s, kind: v as ServiceKind } : s
                    ),
                  }))
                }
                options={KINDS.map((k) => ({ value: k, label: k }))}
              />
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 h-7 w-full"
          onClick={() => {
            sync();
            toast.success("Synced services from data sources");
          }}
        >
          <Wand2 className="h-3.5 w-3.5" />
          Sync from data sources
        </Button>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
            Interactions
          </p>
          <button
            onClick={() =>
              update((a) =>
                a.services.length >= 2
                  ? {
                      ...a,
                      interactions: [
                        ...a.interactions,
                        {
                          id: uid("int"),
                          from: a.services[0].id,
                          to: a.services[1].id,
                          label: "",
                        },
                      ],
                    }
                  : a
              )
            }
            className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-2">
          {interactions.map((it) => (
            <div key={it.id} className="space-y-1.5 rounded-lg border p-2">
              <div className="grid grid-cols-2 gap-1.5">
                <Dropdown
                  value={it.from}
                  onChange={(v) =>
                    update((a) => ({
                      ...a,
                      interactions: a.interactions.map((i) =>
                        i.id === it.id ? { ...i, from: v } : i
                      ),
                    }))
                  }
                  options={services.map((s) => ({ value: s.id, label: s.name }))}
                />
                <Dropdown
                  value={it.to}
                  onChange={(v) =>
                    update((a) => ({
                      ...a,
                      interactions: a.interactions.map((i) =>
                        i.id === it.id ? { ...i, to: v } : i
                      ),
                    }))
                  }
                  options={services.map((s) => ({ value: s.id, label: s.name }))}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  value={it.label ?? ""}
                  placeholder="label (e.g. fetch orders)"
                  onChange={(e) =>
                    update((a) => ({
                      ...a,
                      interactions: a.interactions.map((i) =>
                        i.id === it.id ? { ...i, label: e.target.value } : i
                      ),
                    }))
                  }
                  className="h-7 text-xs"
                />
                <button
                  onClick={() =>
                    update((a) => ({
                      ...a,
                      interactions: a.interactions.filter((i) => i.id !== it.id),
                    }))
                  }
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {interactions.length === 0 && (
            <p className="px-1 text-[11px] text-muted-foreground">
              Connect services to show how they talk to each other.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- Sequences */
/** Keep the store's selectedSeqId valid as sequences change. */
function useSyncSelectedSeq(sequences: SequenceDiagram[]) {
  const id = useEditor((s) => s.selectedSeqId);
  const setId = useEditor((s) => s.setSelectedSeqId);
  useEffect(() => {
    if (sequences.length === 0) {
      if (id !== null) setId(null);
    } else if (!sequences.some((s) => s.id === id)) {
      setId(sequences[0].id);
    }
  }, [sequences, id, setId]);
}

function SequencesEditor({
  project,
  selectedId,
  setSelectedId,
}: {
  project: Project;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}) {
  const update = useEditor((s) => s.updateArchitecture);
  const currentScreen = useEditor((s) => s.currentScreen());
  const sequences = project.architecture.sequences;
  const selected = sequences.find((s) => s.id === selectedId) ?? null;

  const participants = useMemo(
    () =>
      Array.from(
        new Set([
          "User",
          "Web App",
          ...project.architecture.services.map((s) => s.name),
        ])
      ),
    [project.architecture.services]
  );

  /** Immutable helper: patch the currently-selected sequence's steps. */
  const patchSteps = (fn: (steps: SeqStep[]) => SeqStep[]) =>
    update((a) => ({
      ...a,
      sequences: a.sequences.map((s) =>
        s.id === selected?.id ? { ...s, steps: fn(s.steps) } : s
      ),
    }));

  const addSequence = () => {
    const id = uid("seq");
    update((a) => ({
      ...a,
      sequences: [
        ...a.sequences,
        { id, name: `Sequence ${a.sequences.length + 1}`, steps: [] },
      ],
    }));
    setSelectedId(id);
  };

  const generate = () => {
    if (!currentScreen) return;
    const seq = deriveSequence(currentScreen, project);
    let targetId = seq.id;
    update((a) => {
      const existing = a.sequences.find((s) => s.name === seq.name);
      if (existing) {
        targetId = existing.id;
        return {
          ...a,
          sequences: a.sequences.map((s) =>
            s.id === existing.id ? { ...s, steps: seq.steps } : s
          ),
        };
      }
      return { ...a, sequences: [...a.sequences, seq] };
    });
    setSelectedId(targetId);
    toast.success(
      sequences.some((s) => s.name === seq.name)
        ? `Regenerated “${seq.name}”`
        : `Generated “${seq.name}”`
    );
  };

  const deleteSeq = (id: string) =>
    update((a) => ({
      ...a,
      sequences: a.sequences.filter((s) => s.id !== id),
    }));

  const duplicateSeq = (id: string) => {
    const src = sequences.find((s) => s.id === id);
    if (!src) return;
    const newId = uid("seq");
    update((a) => ({
      ...a,
      sequences: [
        ...a.sequences,
        {
          id: newId,
          name: `${src.name} copy`,
          steps: src.steps.map((st) => ({ ...st, id: uid("step") })),
        },
      ],
    }));
    setSelectedId(newId);
  };

  const moveStep = (index: number, dir: -1 | 1) =>
    patchSteps((steps) => {
      const j = index + dir;
      if (j < 0 || j >= steps.length) return steps;
      const next = steps.slice();
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });

  return (
    <div className="space-y-4 p-4">
      {/* What this is */}
      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          A sequence shows the step-by-step interaction between the{" "}
          <b className="font-medium text-foreground">User</b>, your{" "}
          <b className="font-medium text-foreground">Web App</b>, and{" "}
          <b className="font-medium text-foreground">Services</b> for one action
          — like signing in.
        </span>
      </div>

      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-7 flex-1"
          onClick={generate}
          disabled={!currentScreen}
          title={
            currentScreen
              ? `Build a sequence from “${currentScreen.name}”'s buttons`
              : "Open a screen first"
          }
        >
          <Wand2 className="h-3.5 w-3.5" />
          {currentScreen ? `From “${currentScreen.name}”` : "From screen"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 flex-1"
          onClick={addSequence}
        >
          <Plus className="h-3.5 w-3.5" />
          Blank
        </Button>
      </div>

      {sequences.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-center">
          <GitBranch className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="mt-2 text-xs font-medium">No sequences yet</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            <b className="font-medium text-foreground">From “screen”</b>{" "}
            auto-builds one from a screen's buttons (recommended), or start{" "}
            <b className="font-medium text-foreground">Blank</b>.
          </p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {sequences.map((s) => (
            <div
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={cn(
                "group flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-xs transition-colors",
                selectedId === s.id
                  ? "bg-brand-soft text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <GitBranch className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate">{s.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateSeq(s.id);
                }}
                title="Duplicate"
                className="grid h-6 w-6 shrink-0 place-items-center rounded text-muted-foreground/70 opacity-70 transition-opacity hover:bg-background hover:text-foreground hover:opacity-100 group-hover:opacity-100"
              >
                <Copy className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSeq(s.id);
                }}
                title="Delete sequence"
                className="grid h-6 w-6 shrink-0 place-items-center rounded text-muted-foreground/70 opacity-70 transition-opacity hover:bg-background hover:text-destructive hover:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="space-y-2 border-t pt-3">
          <Input
            value={selected.name}
            onChange={(e) =>
              update((a) => ({
                ...a,
                sequences: a.sequences.map((s) =>
                  s.id === selected.id ? { ...s, name: e.target.value } : s
                ),
              }))
            }
            className="h-7 text-xs font-medium"
          />
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
              Steps
            </p>
            <p className="text-[10px] text-muted-foreground/70">
              → Calls · ⇢ Notifies · ⤎ Replies
            </p>
          </div>

          {selected.steps.length === 0 && (
            <p className="rounded-md border border-dashed px-2 py-3 text-center text-[11px] text-muted-foreground">
              Add the first step below.
            </p>
          )}

          {selected.steps.map((st, i) => (
            <div key={st.id} className="rounded-lg border p-2">
              {/* header: number + reorder + delete */}
              <div className="mb-1.5 flex items-center gap-1">
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-soft text-[9px] font-semibold text-primary">
                  {i + 1}
                </span>
                <div className="flex-1" />
                <button
                  onClick={() => moveStep(i, -1)}
                  disabled={i === 0}
                  title="Move up"
                  className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => moveStep(i, 1)}
                  disabled={i === selected.steps.length - 1}
                  title="Move down"
                  className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() =>
                    patchSteps((steps) => steps.filter((x) => x.id !== st.id))
                  }
                  title="Delete step"
                  className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* from → to */}
              <div className="flex items-center gap-1.5">
                <div className="flex-1">
                  <Dropdown
                    value={st.from}
                    onChange={(v) =>
                      patchSteps((steps) =>
                        steps.map((x) =>
                          x.id === st.id ? { ...x, from: v } : x
                        )
                      )
                    }
                    options={participants.map((p) => ({ value: p, label: p }))}
                  />
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <Dropdown
                    value={st.to}
                    onChange={(v) =>
                      patchSteps((steps) =>
                        steps.map((x) => (x.id === st.id ? { ...x, to: v } : x))
                      )
                    }
                    options={participants.map((p) => ({ value: p, label: p }))}
                  />
                </div>
              </div>

              {/* message + type */}
              <div className="mt-1.5 flex items-center gap-1.5">
                <Input
                  value={st.message}
                  placeholder="what happens (e.g. Log in)"
                  onChange={(e) =>
                    patchSteps((steps) =>
                      steps.map((x) =>
                        x.id === st.id ? { ...x, message: e.target.value } : x
                      )
                    )
                  }
                  className="h-7 text-xs"
                />
                <div className="w-28 shrink-0">
                  <Dropdown
                    value={st.type}
                    onChange={(v) =>
                      patchSteps((steps) =>
                        steps.map((x) =>
                          x.id === st.id
                            ? { ...x, type: v as SeqStep["type"] }
                            : x
                        )
                      )
                    }
                    options={STEP_TYPES.map((t) => ({
                      value: t.value,
                      label: `${t.glyph} ${t.label}`,
                    }))}
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            className="h-7 w-full"
            onClick={() =>
              patchSteps((steps) => {
                const prevTo = steps[steps.length - 1]?.to;
                return [
                  ...steps,
                  {
                    id: uid("step"),
                    from: prevTo ?? participants[0],
                    to: participants[1] ?? participants[0],
                    message: "",
                    type: "sync",
                  },
                ];
              })
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add step
          </Button>
        </div>
      )}
    </div>
  );
}

function SequencePreview({ seq }: { seq: SequenceDiagram | null }) {
  if (!seq) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-muted-foreground">
        <Waypoints className="h-6 w-6" />
        <p className="text-sm">No sequence selected</p>
        <p className="text-xs">Generate one from a screen or start blank.</p>
      </div>
    );
  }
  if (seq.steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-muted-foreground">
        <GitBranch className="h-6 w-6" />
        <p className="text-sm">“{seq.name}” has no steps yet</p>
        <p className="text-xs">Add a step on the left to see the diagram.</p>
      </div>
    );
  }
  // Only the selected sequence — keeps the edit ↔ diagram link clear.
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">{seq.name}</h3>
      <Mermaid code={sequenceMermaid(seq)} />
    </div>
  );
}
