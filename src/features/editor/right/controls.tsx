import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BG_TOKENS, TEXT_TOKENS } from "@/lib/styles";

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b px-4 py-4">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/70">
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-center gap-3">
      <label className="text-[12.5px] text-muted-foreground">{label}</label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T | undefined;
  options: { value: T; label: React.ReactNode; title?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-md border bg-muted/40 p-0.5">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          title={opt.title}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex h-7 flex-1 items-center justify-center rounded-[5px] text-xs font-medium transition-colors",
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 24,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const v = value ?? 0;
  const set = (n: number) => onChange(Math.max(min, Math.min(max, n)));
  return (
    <div className="flex h-8 items-center rounded-md border">
      <button
        className="grid h-full w-8 place-items-center text-muted-foreground hover:text-foreground"
        onClick={() => set(v - 1)}
      >
        −
      </button>
      <input
        type="number"
        value={v}
        onChange={(e) => set(Number(e.target.value))}
        className="h-full w-full min-w-0 bg-transparent text-center text-xs outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        className="grid h-full w-8 place-items-center text-muted-foreground hover:text-foreground"
        onClick={() => set(v + 1)}
      >
        +
      </button>
    </div>
  );
}

export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: T | undefined;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TextControl({
  value,
  onChange,
  placeholder,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Input
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 text-xs"
    />
  );
}

const SWATCH_COLORS: Record<string, string> = {
  transparent:
    "bg-[linear-gradient(45deg,#ccc_25%,transparent_25%,transparent_75%,#ccc_75%),linear-gradient(45deg,#ccc_25%,transparent_25%,transparent_75%,#ccc_75%)] bg-[length:8px_8px] bg-[position:0_0,4px_4px]",
  background: "bg-background",
  card: "bg-card",
  muted: "bg-muted",
  secondary: "bg-secondary",
  accent: "bg-accent",
  primary: "bg-primary",
  destructive: "bg-destructive",
  white: "bg-white",
  black: "bg-black",
  foreground: "bg-foreground",
  "primary-foreground": "bg-primary-foreground",
};

export function ColorControl({
  value,
  onChange,
  kind,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  kind: "bg" | "text";
}) {
  const tokens = Object.keys(kind === "bg" ? BG_TOKENS : TEXT_TOKENS);
  return (
    <div className="flex flex-wrap gap-1.5">
      {tokens.map((token) => (
        <button
          key={token}
          title={token}
          onClick={() => onChange(token)}
          className={cn(
            "h-6 w-6 rounded-md border transition-transform hover:scale-110",
            SWATCH_COLORS[token] ?? "bg-muted",
            value === token && "ring-2 ring-primary ring-offset-1 ring-offset-background"
          )}
        />
      ))}
    </div>
  );
}
