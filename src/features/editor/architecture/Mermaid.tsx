import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { AlertTriangle } from "lucide-react";
import { useTheme } from "@/store/theme";

let counter = 0;
let initedTheme: string | null = null;

/** Initialize mermaid once per theme (config is global, so per-instance init is wasteful). */
function ensureInit(theme: string) {
  if (initedTheme === theme) return;
  initedTheme = theme;
  const dark = theme === "dark";
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: dark ? "dark" : "default",
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: "basis",
      nodeSpacing: 44,
      rankSpacing: 60,
      padding: 12,
    },
    sequence: {
      mirrorActors: false,
      useMaxWidth: true,
      actorMargin: 48,
      boxMargin: 10,
      messageFontSize: 13,
      actorFontSize: 13,
      noteFontSize: 12,
      height: 40,
    },
    themeVariables: {
      fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
      fontSize: "13px",
      primaryColor: dark ? "#312e81" : "#eef2ff",
      primaryBorderColor: "#6366f1",
      primaryTextColor: dark ? "#e7e7ef" : "#1e1b4b",
      lineColor: dark ? "#a78bfa" : "#8b5cf6",
      textColor: dark ? "#c7c7d4" : "#3730a3",
      // sequence-specific
      actorBkg: dark ? "#312e81" : "#eef2ff",
      actorBorder: "#6366f1",
      actorTextColor: dark ? "#e7e7ef" : "#1e1b4b",
      actorLineColor: dark ? "#4c4a86" : "#c7d2fe",
      signalColor: dark ? "#c7c7d4" : "#4338ca",
      signalTextColor: dark ? "#c7c7d4" : "#3730a3",
      labelBoxBkgColor: dark ? "#312e81" : "#eef2ff",
      labelBoxBorderColor: "#6366f1",
      labelTextColor: dark ? "#e7e7ef" : "#1e1b4b",
      noteBkgColor: dark ? "#3f3f6b" : "#f5f3ff",
      noteBorderColor: "#a78bfa",
      noteTextColor: dark ? "#e7e7ef" : "#4c1d95",
    },
  });
}

export function Mermaid({ code }: { code: string }) {
  const theme = useTheme((s) => s.theme);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(`mmd-${(counter += 1)}`);

  useEffect(() => {
    let cancelled = false;
    ensureInit(theme);
    mermaid
      .render(idRef.current + "-" + (counter += 1), code)
      .then(({ svg }) => {
        if (!cancelled) {
          setSvg(svg);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Could not render diagram");
      });
    return () => {
      cancelled = true;
    };
  }, [code, theme]);

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Diagram error</p>
          <p className="mt-0.5 text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div
        className="mermaid-container mx-auto flex max-w-3xl justify-center [&_svg]:h-auto [&_svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
