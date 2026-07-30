import { useEffect, useState } from "react";
import { Sparkles, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useEditor } from "@/store/editorStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

/** Generate a UI layout from a prompt (BYO Anthropic key; desktop only). */
export function AiDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const insertStarter = useEditor((s) => s.insertStarter);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPrompt("");
    setKeyInput("");
    setHasKey(null);
    // Guard against a stale main process (e.g. after an electron-vite dev reload
    // where the renderer refreshed but main/preload didn't) or any IPC error —
    // never leave the dialog spinning: fall back to the connect form.
    if (typeof window.api?.aiHasKey !== "function") {
      setHasKey(false);
      toast.error("AI isn't wired up yet — fully quit and relaunch the app.");
      return;
    }
    let cancelled = false;
    window.api
      .aiHasKey()
      .then((v) => {
        if (!cancelled) setHasKey(v);
      })
      .catch(() => {
        if (!cancelled) {
          setHasKey(false);
          toast.error("Couldn't reach the key store — try relaunching the app.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const connect = async () => {
    const k = keyInput.trim();
    if (!k) return;
    if (typeof window.api?.aiSetKey !== "function") {
      toast.error("AI isn't wired up yet — fully quit and relaunch the app.");
      return;
    }
    setBusy(true);
    try {
      await window.api.aiSetKey(k);
      const ok = await window.api.aiHasKey();
      setHasKey(ok);
      if (!ok) toast.error("Couldn't store the key.");
    } catch (e) {
      toast.error((e as Error)?.message ?? "Couldn't store the key.");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    await window.api.aiClearKey();
    setHasKey(false);
  };

  const generate = async () => {
    const p = prompt.trim();
    if (!p) return;
    if (typeof window.api?.aiGenerate !== "function") {
      toast.error("AI isn't wired up yet — fully quit and relaunch the app.");
      return;
    }
    setBusy(true);
    try {
      const res = await window.api.aiGenerate(p);
      if (res.ok) {
        insertStarter(res.nodes);
        toast.success("Generated — added to the canvas");
        onOpenChange(false);
      } else {
        toast.error(res.error);
      }
    } catch (e) {
      toast.error((e as Error)?.message ?? "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Generate with AI
          </DialogTitle>
          <DialogDescription>
            {hasKey
              ? "Describe a screen or section — it's added to the current page as editable elements."
              : "Bring your own Anthropic API key. It's encrypted in your OS keychain and only used on this device."}
          </DialogDescription>
        </DialogHeader>

        {hasKey === null ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : hasKey ? (
          <div className="space-y-3">
            <Textarea
              autoFocus
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. A pricing section with three plan cards and a heading"
              className="min-h-[96px] text-sm"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void generate();
              }}
            />
            <button
              type="button"
              onClick={disconnect}
              className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Disconnect API key
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                type="password"
                autoFocus
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-ant-…"
                onKeyDown={(e) => e.key === "Enter" && void connect()}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Get a key at console.anthropic.com. Nothing is sent anywhere except
              directly to Anthropic when you generate.
            </p>
          </div>
        )}

        <DialogFooter>
          {hasKey ? (
            <Button variant="brand" onClick={generate} disabled={busy || !prompt.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate
            </Button>
          ) : (
            <Button variant="brand" onClick={connect} disabled={busy || !keyInput.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Connect
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
