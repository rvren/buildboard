import { useEffect, useRef, useState } from "react";
import type { ComponentDefinition, DesignTokens, Screen } from "@/types";
import { StaticNode } from "@/features/editor/canvas/renderTree";
import { ComponentDefsProvider } from "@/features/editor/canvas/componentDefs";
import { tokenStyle } from "@/lib/designSystem";
import { useTheme } from "@/store/theme";
import { ImageOff } from "lucide-react";

/**
 * Renders a screen's root tree at true size, then scales it down to fit the
 * thumbnail container width — an accurate live preview without a screenshot.
 */
export function MiniPreview({
  screen,
  tokens,
  components,
}: {
  screen?: Screen;
  tokens?: DesignTokens;
  components?: ComponentDefinition[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);
  const theme = useTheme((s) => s.theme);

  useEffect(() => {
    if (!ref.current || !screen) return;
    const el = ref.current;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / screen.width);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [screen]);

  if (!screen) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <ImageOff className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div ref={ref} className="pointer-events-none h-full w-full overflow-hidden">
      <div
        style={{
          width: screen.width,
          height: screen.height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          ...(tokens ? tokenStyle(tokens, theme) : {}),
        }}
      >
        <ComponentDefsProvider components={components ?? []}>
          <StaticNode node={screen.root} />
        </ComponentDefsProvider>
      </div>
    </div>
  );
}
