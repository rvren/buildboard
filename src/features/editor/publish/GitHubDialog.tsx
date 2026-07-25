import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  GitBranch,
  GitPullRequest,
  Check,
  Loader2,
  FileCode,
  Copy,
  ExternalLink,
  Github,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import type { Project } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { dialogPop } from "@/lib/motion";

type Phase = "form" | "running" | "done";

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function pascal(s: string) {
  return s
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

export function GitHubDialog({
  project,
  open,
  onOpenChange,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [phase, setPhase] = useState<Phase>("form");
  const [step, setStep] = useState(0);
  const [repo, setRepo] = useState("acme/acme-web");
  const [branch, setBranch] = useState(`buildboard/${slug(project.name)}`);
  const [commit, setCommit] = useState(
    `feat: add ${project.screens.length} screen(s) from BuildBoard`
  );
  const [createPR, setCreatePR] = useState(true);
  const [result, setResult] = useState<{
    prNumber: number;
    sha: string;
    url: string;
  } | null>(null);
  const timers = useRef<number[]>([]);

  const files = project.screens.map((s) => `src/pages/${pascal(s.name)}Page.tsx`);
  const arch = project.architecture;
  if (arch && (arch.services.length > 0 || arch.sequences.length > 0)) {
    files.push("docs/architecture.md");
  }
  if (project.designSystem) files.push("src/design-tokens.css");

  const steps = [
    `Generating ${files.length} page component(s)`,
    "Staging files in working tree",
    `Committing to ${branch}`,
    "Pushing branch to origin",
    ...(createPR ? ["Opening pull request"] : []),
  ];

  useEffect(() => {
    return () => timers.current.forEach((t) => clearTimeout(t));
  }, []);

  const reset = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    setPhase("form");
    setStep(0);
    setResult(null);
  };

  const run = () => {
    setPhase("running");
    setStep(0);
    steps.forEach((_, i) => {
      const t = window.setTimeout(() => setStep(i + 1), (i + 1) * 750);
    timers.current.push(t);
    });
    const done = window.setTimeout(
      () => {
        const sha = Array.from({ length: 7 }, () =>
          "0123456789abcdef".charAt(Math.floor(Math.random() * 16))
        ).join("");
        const prNumber = Math.floor(Math.random() * 900 + 100);
        setResult({
          prNumber,
          sha,
          url: `https://github.com/${repo}/pull/${prNumber}`,
        });
        setPhase("done");
      },
      (steps.length + 1) * 750
    );
    timers.current.push(done);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-3.5 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Github className="h-4 w-4" />
            Push to GitHub
          </DialogTitle>
          <DialogDescription className="text-xs">
            Commit generated code to a branch and open a pull request.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5">
          <AnimatePresence mode="wait">
            {phase === "form" && (
              <motion.div
                key="form"
                variants={dialogPop}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-4"
              >
                <div className="grid gap-2">
                  <Label className="text-xs">Repository</Label>
                  <div className="flex items-center gap-2 rounded-md border px-2">
                    <Github className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={repo}
                      onChange={(e) => setRepo(e.target.value)}
                      className="h-8 border-0 px-0 font-mono text-xs shadow-none focus-visible:ring-0"
                      placeholder="owner/repo"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label className="text-xs">Branch</Label>
                    <Input
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="h-8 font-mono text-xs"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs">Base</Label>
                    <Input
                      value="main"
                      readOnly
                      className="h-8 font-mono text-xs text-muted-foreground"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Commit message</Label>
                  <Input
                    value={commit}
                    onChange={(e) => setCommit(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="rounded-lg border">
                  <div className="border-b px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {files.length} file{files.length === 1 ? "" : "s"}
                  </div>
                  <div className="max-h-28 overflow-auto scrollbar-thin p-1.5">
                    {files.map((f) => (
                      <div
                        key={f}
                        className="flex items-center gap-2 rounded px-2 py-1 font-mono text-[11px] text-muted-foreground"
                      >
                        <FileCode className="h-3 w-3 shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>

                <label className="flex cursor-pointer items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <GitPullRequest className="h-4 w-4 text-muted-foreground" />
                    Open a pull request
                  </span>
                  <Switch checked={createPR} onCheckedChange={setCreatePR} />
                </label>

                <div className="flex items-start gap-2 rounded-md bg-muted/60 p-2.5 text-[11px] text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Demo flow — simulated with dummy data. Connect a GitHub token
                  in a real backend to push for real.
                </div>

                <Button className="w-full" onClick={run}>
                  <GitBranch className="h-4 w-4" />
                  {createPR ? "Push & open PR" : "Push branch"}
                </Button>
              </motion.div>
            )}

            {phase === "running" && (
              <motion.div
                key="running"
                variants={dialogPop}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-1 py-2"
              >
                {steps.map((label, i) => {
                  const state =
                    i < step ? "done" : i === step ? "active" : "pending";
                  return (
                    <div
                      key={label}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        state === "pending" && "text-muted-foreground/50"
                      )}
                    >
                      <span className="grid h-5 w-5 place-items-center">
                        {state === "done" ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : state === "active" ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        )}
                      </span>
                      {label}
                    </div>
                  );
                })}
              </motion.div>
            )}

            {phase === "done" && result && (
              <motion.div
                key="done"
                variants={dialogPop}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-4"
              >
                <div className="flex flex-col items-center gap-2 py-2 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 18 }}
                    className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-500"
                  >
                    <Check className="h-6 w-6" />
                  </motion.div>
                  <p className="text-sm font-semibold">
                    {createPR ? "Pull request opened" : "Branch pushed"}
                  </p>
                </div>

                <div className="space-y-2 rounded-lg border p-3 text-xs">
                  <Detail label="Repository" value={repo} mono />
                  <Detail label="Branch" value={branch} mono />
                  <Detail label="Commit" value={result.sha} mono />
                  {createPR && (
                    <Detail label="Pull request" value={`#${result.prNumber}`} />
                  )}
                </div>

                {createPR && (
                  <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
                    <GitPullRequest className="h-4 w-4 shrink-0 text-primary" />
                    <span className="flex-1 truncate font-mono text-[11px] text-muted-foreground">
                      {result.url}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        navigator.clipboard.writeText(result.url);
                        toast.success("PR link copied");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Demo link"
                      onClick={() =>
                        toast.info("Demo link — connect GitHub to open for real")
                      }
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={reset}
                  >
                    Push again
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      reset();
                      onOpenChange(false);
                    }}
                  >
                    Done
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("truncate", mono && "font-mono")}>{value}</span>
    </div>
  );
}
