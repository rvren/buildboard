// Color-blindness simulation via SVG feColorMatrix filters applied over the
// canvas. Matrices are the widely-used Machado/Vienot approximations. Purely a
// preview aid — never affects the stored design or exported code.

export type CbSim =
  | "none"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia"
  | "achromatopsia";

export const CB_SIMS: { id: CbSim; label: string }[] = [
  { id: "none", label: "Off" },
  { id: "protanopia", label: "Protanopia (red-blind)" },
  { id: "deuteranopia", label: "Deuteranopia (green-blind)" },
  { id: "tritanopia", label: "Tritanopia (blue-blind)" },
  { id: "achromatopsia", label: "Achromatopsia (grayscale)" },
];

const MATRICES: Record<Exclude<CbSim, "none">, string> = {
  protanopia:
    "0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0",
  deuteranopia:
    "0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0",
  tritanopia:
    "0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0",
  achromatopsia:
    "0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0",
};

export function cbFilterId(sim: CbSim): string | undefined {
  return sim === "none" ? undefined : `cb-${sim}`;
}

/** Hidden SVG holding one filter per simulation; mount once at the app root. */
export function ColorBlindFilters() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute h-0 w-0"
      style={{ position: "absolute" }}
    >
      <defs>
        {(Object.keys(MATRICES) as Exclude<CbSim, "none">[]).map((id) => (
          <filter key={id} id={`cb-${id}`} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={MATRICES[id]} />
          </filter>
        ))}
      </defs>
    </svg>
  );
}
