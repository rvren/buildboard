import { useEffect, useState } from "react";
import { Replace } from "lucide-react";
import { toast } from "sonner";
import { useEditor } from "@/store/editorStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

/** Global find & replace of text content across every screen + component. */
export function FindReplaceDialog() {
  const open = useEditor((s) => s.findReplaceOpen);
  const setOpen = useEditor((s) => s.setFindReplaceOpen);
  const countMatches = useEditor((s) => s.countTextMatches);
  const replaceAll = useEditor((s) => s.replaceTextEverywhere);

  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);

  useEffect(() => {
    if (open) {
      setFind("");
      setReplace("");
      setCaseSensitive(false);
    }
  }, [open]);

  const matches = find ? countMatches(find, caseSensitive) : 0;

  const run = () => {
    if (!find) return;
    const n = replaceAll(find, replace, caseSensitive);
    if (n > 0) toast.success(`Replaced ${n} occurrence${n === 1 ? "" : "s"}`);
    else toast.error("No matches to replace");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Replace className="h-4 w-4 text-primary" />
            Find &amp; replace text
          </DialogTitle>
          <DialogDescription>
            Replaces text in every screen and component (headings, buttons,
            links, placeholders…).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            autoFocus
            value={find}
            placeholder="Find…"
            onChange={(e) => setFind(e.target.value)}
          />
          <Input
            value={replace}
            placeholder="Replace with…"
            onChange={(e) => setReplace(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
              />
              Case sensitive
            </label>
            {find && (
              <span>
                {matches} match{matches === 1 ? "" : "es"}
              </span>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="brand" onClick={run} disabled={!find || matches === 0}>
            Replace all
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
