import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { SeverityBadge } from "@/components/Severity";
import { AlertTriangle, ShieldCheck, Play, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/anomaly")({
  head: () => ({
    meta: [
      { title: "Anomaly Detection — SecureIQ" },
      { name: "description", content: "Analyze raw log text for anomalous access patterns and threats." },
    ],
  }),
  component: Anomaly,
});

const SAMPLE = `2024-01-15 03:14:22 [INFO] Login attempt user=admin ip=203.0.113.42 status=FAIL
2024-01-15 03:14:23 [INFO] Login attempt user=admin ip=203.0.113.42 status=FAIL
2024-01-15 03:14:24 [INFO] Login attempt user=admin ip=203.0.113.42 status=FAIL
2024-01-15 03:14:25 [INFO] Login attempt user=admin ip=198.51.100.7 status=FAIL
2024-01-15 03:14:27 [INFO] Login attempt user=root ip=198.51.100.7 status=FAIL
2024-01-15 03:14:29 [WARN] Rate limit exceeded ip=198.51.100.7
2024-01-15 03:14:33 [INFO] Login attempt user=admin ip=203.0.113.42 status=SUCCESS
2024-01-15 03:14:35 [INFO] Admin panel accessed user=admin
2024-01-15 03:14:41 [WARN] Privilege escalation attempted user=admin
2024-01-15 03:14:44 [INFO] GET /admin/users user=admin
2024-01-15 03:14:47 [INFO] GET /admin/config user=admin`;

function Anomaly() {
  const [text, setText] = useState(SAMPLE);
  const lineCount = useMemo(() => text.split("\n").length, [text]);

  const mutation = useMutation({
    mutationFn: (v: string) => api.analyzeAnomaly(v),
    onError: () => toast.error("Backend offline — start with: python main.py"),
  });

  const r = mutation.data;
  const anomaly = Boolean(r?.anomaly ?? r?.is_anomaly);
  const rawScore = (r?.anomaly_score ?? r?.score ?? 0) as number;
  const score = Math.round(rawScore > 1 ? rawScore : rawScore * 100);
  const features = r?.features ?? {};
  const severity = r?.severity ?? (score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW");
  const rec =
    r?.recommendation ??
    (severity === "CRITICAL"
      ? "Immediate action required. Block source IPs and rotate admin credentials."
      : severity === "HIGH"
        ? "Investigate promptly and review authentication logs."
        : severity === "MEDIUM"
          ? "Monitor closely and enable additional logging."
          : "No immediate action required. Continue routine monitoring.");

  const featureItems = [
    { key: "failed_attempts", label: "Failed Attempts", value: features.failed_attempts ?? 0, max: 20 },
    { key: "unique_ips", label: "Unique IPs", value: features.unique_ips ?? 0, max: 10 },
    { key: "request_count", label: "Requests", value: features.request_count ?? 0, max: 50 },
    { key: "has_admin", label: "Admin Activity", value: features.has_admin ? 1 : 0, max: 1 },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-navy">Anomaly Detection</h1>
        <p className="mt-1 text-sm text-muted-foreground">Paste raw log lines to detect anomalous behavior.</p>
      </header>

      {/* Terminal-style log input */}
      <Card className="overflow-hidden border border-border bg-card shadow-md">
        <div className="flex items-center justify-between border-b border-[#1e293b] bg-[#0f172a] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ef4444]" />
            <span className="h-3 w-3 rounded-full bg-[#eab308]" />
            <span className="h-3 w-3 rounded-full bg-[#22c55e]" />
            <div className="ml-3 flex items-center gap-2 text-xs text-slate-400">
              <Terminal className="h-3.5 w-3.5" />
              logs.txt — {lineCount} lines
            </div>
          </div>
          <button
            onClick={() => mutation.mutate(text)}
            disabled={!text.trim() || mutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white shadow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            {mutation.isPending ? "Analyzing…" : "Analyze"}
          </button>
        </div>
        <div className="relative flex bg-[#0b1220] font-mono text-xs">
          {/* Line numbers */}
          <div
            aria-hidden
            className="select-none border-r border-[#1e293b] bg-[#0a0f1c] px-3 py-3 text-right text-[#475569]"
          >
            {Array.from({ length: lineCount }).map((_, i) => (
              <div key={i} className="leading-relaxed">{i + 1}</div>
            ))}
          </div>
          <textarea
            value={text}
            spellCheck={false}
            onChange={(e) => setText(e.target.value)}
            rows={Math.max(12, lineCount)}
            className="min-h-[280px] w-full resize-y bg-transparent px-4 py-3 leading-relaxed text-[#e2e8f0] caret-primary outline-none"
          />
        </div>
      </Card>

      {r && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Verdict */}
          <Card className="flex flex-col items-center justify-center border border-border bg-card p-6 text-center shadow-md">
            <div
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full",
                anomaly
                  ? "bg-severity-critical/10 text-severity-critical"
                  : "bg-severity-low/10 text-severity-low",
              )}
            >
              {anomaly ? <AlertTriangle className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
            </div>
            <div className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Verdict
            </div>
            <div
              className={cn(
                "mt-1 text-2xl font-black",
                anomaly ? "text-severity-critical" : "text-severity-low",
              )}
            >
              {anomaly ? "ANOMALY" : "NORMAL"}
            </div>
            <div className="mt-3">
              <SeverityBadge severity={severity} />
            </div>
          </Card>

          {/* Score */}
          <Card className="border border-border bg-card p-6 shadow-md">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Anomaly Score
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-5xl font-black tabular-nums text-navy">{score}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${score}%`,
                  background:
                    score >= 80
                      ? "var(--severity-critical)"
                      : score >= 60
                        ? "var(--severity-high)"
                        : score >= 35
                          ? "var(--severity-medium)"
                          : "var(--severity-low)",
                }}
              />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{rec}</p>
          </Card>

          {/* Feature bars */}
          <Card className="border border-border bg-card p-6 shadow-md">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Feature Signals
            </div>
            <div className="mt-3 space-y-3">
              {featureItems.map((f) => {
                const pct = Math.min(100, (Number(f.value) / f.max) * 100);
                return (
                  <div key={f.key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground">{f.label}</span>
                      <span className="font-semibold tabular-nums text-navy">
                        {typeof f.value === "number" && f.max === 1
                          ? (f.value ? "Yes" : "No")
                          : String(f.value)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
