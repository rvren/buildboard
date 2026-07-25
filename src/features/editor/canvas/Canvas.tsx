import * as React from "react";
import { Minus, Plus, Maximize, Check, Component } from "lucide-react";
import type { Project } from "@/types";
import { useEditor } from "@/store/editorStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScreenFrame } from "./ScreenFrame";
import { ComponentFrame } from "./ComponentFrame";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;

export function Canvas({ project }: { project: Project }) {
  const editingComponentId = useEditor((s) => s.editingComponentId);
  const editingDef = project.designSystem.components.find(
    (c) => c.id === editingComponentId
  );
  if (editingComponentId && editingDef) {
    return <ComponentEditCanvas definition={editingDef} />;
  }
  return <ScreensCanvas project={project} />;
}

function ScreensCanvas({ project }: { project: Project }) {
  const viewport = useEditor((s) => s.viewport);
  const setViewport = useEditor((s) => s.setViewport);
  const setSelected = useEditor((s) => s.setSelected);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pan = React.useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const [spaceHeld, setSpaceHeld] = React.useState(false);
  const [panning, setPanning] = React.useState(false);

  // Space to pan
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTypingTarget(e.target)) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const next = clamp(viewport.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    const wx = (px - viewport.x) / viewport.zoom;
    const wy = (py - viewport.y) / viewport.zoom;
    setViewport({
      zoom: next,
      x: px - wx * next,
      y: py - wy * next,
    });
  };

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.08 : 0.92);
    } else {
      setViewport({
        x: viewport.x - e.deltaX,
        y: viewport.y - e.deltaY,
      });
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const isBg = e.currentTarget === e.target;
    const shouldPan = e.button === 1 || spaceHeld || isBg;
    if (!shouldPan) return;
    if (isBg) setSelected(null);
    pan.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: viewport.x,
      origY: viewport.y,
    };
    setPanning(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pan.current.active) return;
    setViewport({
      x: pan.current.origX + (e.clientX - pan.current.startX),
      y: pan.current.origY + (e.clientY - pan.current.startY),
    });
  };

  const endPan = () => {
    pan.current.active = false;
    setPanning(false);
  };

  const resetView = () => setViewport({ x: 80, y: 80, zoom: 0.85 });

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      {/* Interaction surface */}
      <div
        ref={containerRef}
        className={cn(
          "canvas-grid absolute inset-0 [background-size:22px_22px]",
          panning ? "cursor-grabbing" : spaceHeld ? "cursor-grab" : "cursor-default"
        )}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerLeave={endPan}
      >
        {/* World */}
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          }}
        >
          {project.screens.map((screen) => (
            <ScreenFrame key={screen.id} screen={screen} />
          ))}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border/70 bg-card/85 p-1 shadow-soft-lg backdrop-blur-xl">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => zoomAtCenter(containerRef, viewport, setViewport, 0.9)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(viewport.zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => zoomAtCenter(containerRef, viewport, setViewport, 1.1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-4 w-px bg-border" />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={resetView}
          title="Reset view"
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ComponentEditCanvas({
  definition,
}: {
  definition: import("@/types").ComponentDefinition;
}) {
  const editComponent = useEditor((s) => s.editComponent);
  const setEditorView = useEditor((s) => s.setEditorView);
  const done = () => {
    editComponent(null);
    setEditorView("system");
  };
  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      {/* Editing banner */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 border-b border-primary/20 bg-brand-soft/80 px-4 py-2 backdrop-blur">
        <Component className="h-4 w-4 text-primary" />
        <div className="flex-1 text-xs">
          <span className="font-semibold text-foreground">
            Editing “{definition.name}”
          </span>
          <span className="ml-2 text-muted-foreground">
            Changes apply to every instance across all pages.
          </span>
        </div>
        <Button size="sm" variant="brand" className="h-7" onClick={done}>
          <Check className="h-3.5 w-3.5" />
          Done
        </Button>
      </div>

      {/* Centered component artboard */}
      <div className="canvas-grid absolute inset-0 flex items-center justify-center overflow-auto p-10 pt-16 [background-size:22px_22px]">
        <ComponentFrame definition={definition} />
      </div>
    </div>
  );
}

function zoomAtCenter(
  ref: React.RefObject<HTMLDivElement>,
  viewport: { x: number; y: number; zoom: number },
  setViewport: (v: Partial<{ x: number; y: number; zoom: number }>) => void,
  factor: number
) {
  const rect = ref.current?.getBoundingClientRect();
  if (!rect) return;
  const px = rect.width / 2;
  const py = rect.height / 2;
  const next = clamp(viewport.zoom * factor, MIN_ZOOM, MAX_ZOOM);
  const wx = (px - viewport.x) / viewport.zoom;
  const wy = (py - viewport.y) / viewport.zoom;
  setViewport({ zoom: next, x: px - wx * next, y: py - wy * next });
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function isTypingTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}
