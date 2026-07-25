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
      primaryColor: dark ? "#0b3324" : "#e6f7ef",
      primaryBorderColor: "#008A53",
      primaryTextColor: dark ? "#e7e7ef" : "#083d29",
      lineColor: dark ? "#34c98a" : "#008A53",
      textColor: dark ? "#c7c7d4" : "#0a7a49",
      // sequence-specific
      actorBkg: dark ? "#0b3324" : "#e6f7ef",
      actorBorder: "#008A53",
      actorTextColor: dark ? "#e7e7ef" : "#083d29",
      actorLineColor: dark ? "#2a5a45" : "#bce8d3",
      signalColor: dark ? "#c7c7d4" : "#0a7a49",
      signalTextColor: dark ? "#c7c7d4" : "#0a7a49",
      labelBoxBkgColor: dark ? "#0b3324" : "#e6f7ef",
      labelBoxBorderColor: "#008A53",
      labelTextColor: dark ? "#e7e7ef" : "#083d29",
      noteBkgColor: dark ? "#1e3a2e" : "#eefaf3",
      noteBorderColor: "#34c98a",
      noteTextColor: dark ? "#e7e7ef" : "#083d29",
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
