import * as React from "react";
import { Minus, Plus, Maximize, Check, Component } from "lucide-react";
import type { Project } from "@/types";
import { useEditor } from "@/store/editorStore";
import { useTheme } from "@/store/theme";
import { tokenStyle } from "@/lib/designSystem";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScreenFrame } from "./ScreenFrame";
import { ColorBlindFilters, cbFilterId } from "@/lib/colorBlind";
import { ComponentFrame } from "./ComponentFrame";
import { NodeRenderer } from "./NodeRenderer";
import { ComponentDefsProvider } from "./componentDefs";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;

export function Canvas({ project }: { project: Project }) {
  const editingComponentId = useEditor((s) => s.editingComponentId);
  const previewMode = useEditor((s) => s.previewMode);
  const editingDef = project.designSystem.components.find(
    (c) => c.id === editingComponentId
  );
  if (editingComponentId && editingDef) {
    return <ComponentEditCanvas definition={editingDef} />;
  }
  // Preview mode = a single-screen, click-through prototype (navigate actions
  // walk between pages like a real app).
  if (previewMode) return <PreviewCanvas project={project} />;
  return <ScreensCanvas project={project} />;
}

function PreviewCanvas({ project }: { project: Project }) {
  const currentScreenId = useEditor((s) => s.currentScreenId);
  const theme = useTheme((s) => s.theme);
  const tokens = project.designSystem.tokens;
  const screen =
    project.screens.find((s) => s.id === currentScreenId) ?? project.screens[0];
  const ref = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !screen) return;
    const fit = () => {
      const pad = 56;
      const s = Math.min(
        (el.clientWidth - pad) / screen.width,
        (el.clientHeight - pad) / screen.height,
        1
      );
      setScale(s > 0 ? s : 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [screen?.width, screen?.height]);

  if (!screen) return null;

  return (
    <div
      ref={ref}
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-muted/30 p-6"
    >
      <div
        className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full border border-border/70 bg-card/85 px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft backdrop-blur"
      >
        {screen.name}
      </div>
      <div
        className="overflow-hidden rounded-xl bg-white shadow-soft-lg ring-1 ring-border dark:bg-card"
        style={{ width: screen.width * scale, height: screen.height * scale }}
      >
        <div
          className="overflow-auto scrollbar-thin"
          style={{
            width: screen.width,
            height: screen.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            ...tokenStyle(tokens, theme),
          }}
        >
          <ComponentDefsProvider components={project.designSystem.components}>
            <NodeRenderer node={screen.root} isRoot />
          </ComponentDefsProvider>
        </div>
      </div>
    </div>
  );
}

function ScreensCanvas({ project }: { project: Project }) {
  const viewport = useEditor((s) => s.viewport);
  const setViewport = useEditor((s) => s.setViewport);
  const setSelected = useEditor((s) => s.setSelected);
  const cbFilter = cbFilterId(useEditor((s) => s.cbSim));
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
      return;
    }
    // If the pointer is over a scrollable page element with room to scroll in
    // this direction, let it scroll natively instead of panning the canvas.
    if (
      canScrollNatively(e.target, e.deltaX, e.deltaY, containerRef.current)
    ) {
      return;
    }
    setViewport({
      x: viewport.x - e.deltaX,
      y: viewport.y - e.deltaY,
    });
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

  // Fit all screens into the viewport (bounding box + padding, centered).
  const fitView = React.useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || project.screens.length === 0) return;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const s of project.screens) {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + s.width);
      maxY = Math.max(maxY, s.y + s.height);
    }
    const pad = 96;
    const bw = Math.max(maxX - minX, 1);
    const bh = Math.max(maxY - minY, 1);
    const zoom = clamp(
      Math.min((rect.width - pad * 2) / bw, (rect.height - pad * 2) / bh),
      MIN_ZOOM,
      MAX_ZOOM
    );
    setViewport({
      zoom,
      x: (rect.width - bw * zoom) / 2 - minX * zoom,
      y: (rect.height - bh * zoom) / 2 - minY * zoom,
    });
  }, [project.screens, setViewport]);

  const zoomToPercent = (target: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = rect.width / 2;
    const py = rect.height / 2;
    const next = clamp(target, MIN_ZOOM, MAX_ZOOM);
    const wx = (px - viewport.x) / viewport.zoom;
    const wy = (py - viewport.y) / viewport.zoom;
    setViewport({ zoom: next, x: px - wx * next, y: py - wy * next });
  };

  // Frame the screens on first entry (only when the viewport is untouched, so a
  // user's pan/zoom is never overridden when they come back).
  const didFit = React.useRef(false);
  React.useEffect(() => {
    if (didFit.current) return;
    didFit.current = true;
    if (viewport.x === 0 && viewport.y === 0 && viewport.zoom === 1) fitView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ⌘0 fit · ⌘= zoom in · ⌘- zoom out.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || isTypingTarget(e.target)) return;
      if (e.key === "0") {
        e.preventDefault();
        fitView();
      } else if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        zoomAtCenter(containerRef, viewport, setViewport, 1.1);
      } else if (e.key === "-") {
        e.preventDefault();
        zoomAtCenter(containerRef, viewport, setViewport, 0.9);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewport, fitView, setViewport]);

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
            filter: cbFilter ? `url(#${cbFilter})` : undefined,
          }}
        >
          {project.screens.map((screen) => (
            <ScreenFrame key={screen.id} screen={screen} />
          ))}
        </div>
      </div>

      <ColorBlindFilters />

      {/* Live dimensions of the selected element */}
      <SelectionSizeBadge zoom={viewport.zoom} />

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
        <button
          className="w-12 rounded text-center text-xs tabular-nums text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => zoomToPercent(1)}
          title="Reset to 100%"
        >
          {Math.round(viewport.zoom * 100)}%
        </button>
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
          onClick={fitView}
          title="Fit to screen (⌘0)"
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

/** Live width×height (in design px) of the selected element, shown bottom-left. */
function SelectionSizeBadge({ zoom }: { zoom: number }) {
  const selectedId = useEditor((s) => s.selectedNodeId);
  const previewMode = useEditor((s) => s.previewMode);
  const [size, setSize] = React.useState<{ w: number; h: number } | null>(null);

  React.useEffect(() => {
    if (!selectedId || previewMode) {
      setSize(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(
      `[data-node-id="${selectedId}"]`
    );
    if (!el) {
      setSize(null);
      return;
    }
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.round(r.width / zoom), h: Math.round(r.height / zoom) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [selectedId, zoom, previewMode]);

  if (!size) return null;
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-border/70 bg-card/90 px-2 py-1 text-[11px] font-medium tabular-nums text-muted-foreground shadow-soft backdrop-blur">
      {size.w} × {size.h}
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

/**
 * Walk up from the wheel target to (but excluding) the canvas surface. If any
 * ancestor is a scroll container with room to scroll in the wheel's direction,
 * the browser should scroll it natively — so the canvas must NOT pan.
 */
function canScrollNatively(
  target: EventTarget | null,
  deltaX: number,
  deltaY: number,
  boundary: HTMLElement | null
): boolean {
  let el = target as HTMLElement | null;
  while (el && el !== boundary) {
    const style = getComputedStyle(el);
    if (deltaY !== 0) {
      const oy = style.overflowY;
      if (
        (oy === "auto" || oy === "scroll") &&
        el.scrollHeight > el.clientHeight
      ) {
        const atTop = el.scrollTop <= 0;
        const atBottom =
          el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
        if (!(deltaY < 0 && atTop) && !(deltaY > 0 && atBottom)) return true;
      }
    }
    if (deltaX !== 0) {
      const ox = style.overflowX;
      if (
        (ox === "auto" || ox === "scroll") &&
        el.scrollWidth > el.clientWidth
      ) {
        const atLeft = el.scrollLeft <= 0;
        const atRight = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
        if (!(deltaX < 0 && atLeft) && !(deltaX > 0 && atRight)) return true;
      }
    }
    el = el.parentElement;
  }
  return false;
}

function isTypingTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}
