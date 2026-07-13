import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Search } from "lucide-react";

export const Route = createFileRoute("/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge Base — SecureIQ" },
      { name: "description", content: "Query the RAG-powered security knowledge base." },
    ],
  }),
  component: Knowledge,
});

const EXAMPLES = ["SQL injection", "buffer overflow", "brute force attack"];

function Knowledge() {
  const [q, setQ] = useState("");

  const mutation = useMutation({
    mutationFn: (question: string) => api.ragQuery(question),
    onError: () => toast.error("Backend offline — start with: python main.py"),
  });

  const r = mutation.data;
  const answer = r?.answer ?? r?.response ?? "";
  const sources: any[] = r?.sources ?? r?.documents ?? [];
  const confidence = r?.confidence ?? r?.score ?? null;
  const confidenceDisplay =
    answer && (confidence === 0 || confidence == null)
      ? "HIGH"
      : typeof confidence === "number"
        ? `${Math.round(confidence * 100)}%`
        : confidence;

  const submit = () => {
    if (!q.trim()) return;
    mutation.mutate(q);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/40">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Knowledge Base</h1>
          <p className="text-xs text-muted-foreground">RAG-powered semantic search over threat intel.</p>
        </div>
      </header>

      <Card className="border-border/70 bg-card p-5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Search security knowledge base..."
              className="border-border/70 bg-background/60 pl-9"
            />
          </div>
          <Button onClick={submit} disabled={!q.trim() || mutation.isPending}>
            {mutation.isPending ? "Searching…" : "Search"}
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setQ(ex);
                mutation.mutate(ex);
              }}
              className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/60 hover:text-primary"
            >
              {ex}
            </button>
          ))}
        </div>
      </Card>

      {mutation.isPending && (
        <Card className="mt-4 border-border/70 bg-card p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-24 w-full" />
        </Card>
      )}

      {r && !mutation.isPending && (
        <Card className="mt-4 border-border/70 bg-card p-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Answer</h2>
            {confidenceDisplay != null && (
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Confidence{" "}
                <span className="text-foreground tabular-nums">{confidenceDisplay}</span>
              </span>
            )}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {answer || "No answer returned."}
          </p>

          {sources.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Sources
              </h3>
              <ul className="mt-2 space-y-2">
                {sources.map((s, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs"
                  >
                    <div className="font-semibold">{s.title ?? s.source ?? `Source ${i + 1}`}</div>
                    {s.snippet && <p className="mt-1 text-muted-foreground">{s.snippet}</p>}
                    {s.url && (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-primary hover:underline"
                      >
                        {s.url}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
