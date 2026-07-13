import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, severityClass } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { SeverityBadge } from "@/components/Severity";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — SecureIQ" },
      { name: "description", content: "Past AI-driven security investigations." },
    ],
  }),
  component: History,
});

function History() {
  const q = useQuery({ queryKey: ["history"], queryFn: api.history, retry: false });
  const [open, setOpen] = useState<any | null>(null);
  const rows: any[] = q.data?.history ?? q.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-black tracking-tight">Investigation History</h1>
        <p className="text-xs text-muted-foreground">Click a row to view the full report.</p>
      </header>

      <Card className="border-border/70 bg-card">
        {q.isLoading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
              <Inbox className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="mt-4 text-sm font-semibold">No investigations yet</div>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Investigations you run will appear here with their full report and risk analysis.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Timestamp</th>
                  <th className="px-5 py-3 text-left font-medium">Alert Summary</th>
                  <th className="px-5 py-3 text-left font-medium">Risk Score</th>
                  <th className="px-5 py-3 text-left font-medium">Severity</th>
                  <th className="px-5 py-3 text-left font-medium">Event Type</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any, i: number) => {
                  const sev = (r.severity ?? "LOW").toString();
                  const score = r.risk_score ?? r.score ?? 0;
                  return (
                    <tr
                      key={r.id ?? i}
                      onClick={() => setOpen(r)}
                      className="cursor-pointer border-t border-border/50 hover:bg-muted/20"
                    >
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-muted-foreground">
                        {fmtTime(r.timestamp)}
                      </td>
                      <td className="max-w-md truncate px-5 py-3">
                        {r.alert ?? r.summary ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "inline-flex min-w-10 justify-center rounded-md border px-2 py-0.5 text-xs font-bold tabular-nums",
                            severityClass(sev),
                          )}
                        >
                          {score}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <SeverityBadge severity={sev} />
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {r.event_type ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl border-border/70 bg-card">
          <DialogHeader>
            <DialogTitle className="pr-8">
              {open?.alert ?? open?.summary ?? "Investigation Report"}
            </DialogTitle>
          </DialogHeader>
          {open && (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={open.severity ?? "LOW"} />
                <span className="text-xs text-muted-foreground">
                  Risk {open.risk_score ?? open.score ?? 0} · {fmtTime(open.timestamp)}
                </span>
              </div>
              <pre className="mt-4 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-background/60 p-4 font-mono text-xs">
{open.report ?? open.incident_report ?? JSON.stringify(open, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function fmtTime(t?: string | number) {
  if (!t) return "—";
  try {
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return String(t);
    return d.toLocaleString();
  } catch {
    return String(t);
  }
}
