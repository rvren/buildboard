import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "@/store/theme";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid h-8 w-8 place-items-center rounded-xl bg-brand text-white glow",
        className
      )}
    >
      <div className="grid grid-cols-2 gap-[2.5px]">
        <span className="h-1.5 w-1.5 rounded-[2px] bg-current" />
        <span className="h-1.5 w-1.5 rounded-[2px] bg-current opacity-55" />
        <span className="h-1.5 w-1.5 rounded-[2px] bg-current opacity-80" />
        <span className="h-1.5 w-1.5 rounded-[2px] bg-current opacity-40" />
      </div>
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight">
        BuildBoard
      </span>
    </div>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={toggle}>
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {theme === "dark" ? "Light mode" : "Dark mode"}
      </TooltipContent>
    </Tooltip>
  );
}
