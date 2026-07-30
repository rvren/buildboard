import { Plus, Trash2, Send, Loader2 } from "lucide-react";
import type { DataSource, HeaderPair, HttpMethod } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const METHOD_COLOR: Record<HttpMethod, string> = {
  GET: "text-emerald-500",
  POST: "text-amber-500",
  PUT: "text-blue-500",
  PATCH: "text-violet-500",
  DELETE: "text-rose-500",
};

export function RequestEditor({
  ds,
  onChange,
  onSend,
  sending,
}: {
  ds: DataSource;
  onChange: (patch: Partial<DataSource>) => void;
  onSend: () => void;
  sending: boolean;
}) {
  const showBody = ds.method !== "GET";

  return (
    <div className="space-y-3">
      <input
        value={ds.name}
        onChange={(e) => onChange({ name: e.target.value })}
        className="w-full bg-transparent text-sm font-semibold outline-none"
        placeholder="Request name"
      />

      {/* Method + URL + Send */}
      <div className="flex gap-2">
        <Select
          value={ds.method}
          onValueChange={(v) => onChange({ method: v as HttpMethod })}
        >
          <SelectTrigger className="h-9 w-28 shrink-0 font-mono text-xs font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                <span className={cn("font-mono text-xs font-semibold", METHOD_COLOR[m])}>
                  {m}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={ds.url}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://api.example.com/resource"
          className="h-9 font-mono text-xs"
          onKeyDown={(e) => e.key === "Enter" && !sending && onSend()}
        />
        <Button className="h-9 shrink-0" onClick={onSend} disabled={sending}>
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send
        </Button>
      </div>

      <Tabs defaultValue="headers">
        <TabsList>
          <TabsTrigger value="headers">
            Headers
            {ds.headers.length > 0 && (
              <span className="ml-1 rounded bg-muted-foreground/20 px-1 text-[10px]">
                {ds.headers.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="auth">Auth</TabsTrigger>
          {showBody && <TabsTrigger value="body">Body</TabsTrigger>}
        </TabsList>

        <TabsContent value="headers" className="pt-3">
          <HeaderEditor
            headers={ds.headers}
            onChange={(headers) => onChange({ headers })}
          />
        </TabsContent>

        <TabsContent value="auth" className="pt-3">
          <div className="space-y-3">
            <Select
              value={ds.auth.type}
              onValueChange={(v) =>
                onChange({ auth: { ...ds.auth, type: v as "none" | "bearer" } })
              }
            >
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No auth</SelectItem>
                <SelectItem value="bearer">Bearer token</SelectItem>
              </SelectContent>
            </Select>
            {ds.auth.type === "bearer" && (
              <Input
                value={ds.auth.token ?? ""}
                onChange={(e) =>
                  onChange({ auth: { ...ds.auth, token: e.target.value } })
                }
                placeholder="Token"
                className="h-8 font-mono text-xs"
              />
            )}
          </div>
        </TabsContent>

        {showBody && (
          <TabsContent value="body" className="pt-3">
            <Textarea
              value={ds.body ?? ""}
              onChange={(e) => onChange({ body: e.target.value })}
              placeholder='{ "title": "hello" }'
              className="min-h-[120px] font-mono text-xs"
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function HeaderEditor({
  headers,
  onChange,
}: {
  headers: HeaderPair[];
  onChange: (h: HeaderPair[]) => void;
}) {
  const update = (i: number, patch: Partial<HeaderPair>) =>
    onChange(headers.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  const remove = (i: number) => onChange(headers.filter((_, idx) => idx !== i));
  const add = () => onChange([...headers, { key: "", value: "" }]);

  return (
    <div className="space-y-2">
      {headers.map((h, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={h.key}
            onChange={(e) => update(i, { key: e.target.value })}
            placeholder="Header"
            className="h-8 font-mono text-xs"
          />
          <Input
            value={h.value}
            onChange={(e) => update(i, { value: e.target.value })}
            placeholder="Value"
            className="h-8 font-mono text-xs"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => remove(i)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="h-8" onClick={add}>
        <Plus className="h-3.5 w-3.5" />
        Add header
      </Button>
    </div>
  );
}
