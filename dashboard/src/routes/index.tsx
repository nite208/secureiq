import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ChevronRight,
  Sparkles,
  ScanLine,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import { api, severityColor } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SecureIQ" },
      { name: "description", content: "Live security intelligence overview: alerts, threats, anomalies, and CVEs." },
    ],
  }),
  component: Dashboard,
});

function useCountUp(target: number, duration = 900) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!Number.isFinite(target)) return;
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return n;
}

function Stat({
  label,
  value,
  accent,
  trend,
  delay,
}: {
  label: string;
  value: number;
  accent: string;
  trend?: string;
  delay: number;
}) {
  const n = useCountUp(value);
  return (
    <div
      className="card-hover animate-fade-up relative overflow-hidden rounded-xl border border-border bg-card p-6"
      style={{ borderLeft: `4px solid ${accent}`, animationDelay: `${delay}ms` }}
    >
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-3 text-[36px] font-bold leading-none tabular-nums tracking-tight text-foreground">
        {n}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-[12px] font-medium text-severity-low">
          <TrendingUp className="h-3 w-3" />
          {trend}
        </div>
      )}
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  title,
  subtitle,
  delay,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  delay: number;
}) {
  return (
    <Link
      to={to}
      className="card-hover animate-fade-up group flex items-start gap-4 rounded-xl border border-border bg-card p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[15px] font-semibold text-foreground">
          {title}
          <ArrowUpRight className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 text-primary" />
        </div>
        <div className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</div>
      </div>
    </Link>
  );
}

function Dashboard() {
  const historyQ = useQuery({ queryKey: ["history"], queryFn: api.history, retry: false });
  const feedsQ = useQuery({ queryKey: ["feeds"], queryFn: api.feeds, retry: false });

  const history: any[] = historyQ.data?.history ?? historyQ.data ?? [];
  const alerts = history.slice(0, 10);
  const critical = history.filter((h: any) => (h.severity || "").toUpperCase() === "CRITICAL").length;
  const anomalies = history.filter((h: any) => h.event_type?.toLowerCase?.().includes("anomal")).length;
  const cves = feedsQ.data?.cves?.length ?? feedsQ.data?.cve_count ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-14">
      <header className="mb-8 animate-fade-up">
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1.5 text-[14px] text-muted-foreground">
          Real-time overview of your security posture.
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total Alerts Today" value={history.length} accent="#7c3aed" trend="+12% this week" delay={0} />
        <Stat label="Critical Threats" value={critical} accent="#dc2626" trend="+3 today" delay={80} />
        <Stat label="Anomalies Detected" value={anomalies} accent="#ea580c" trend="+8% this week" delay={160} />
        <Stat label="CVEs Tracked" value={cves} accent="#2563eb" trend="Live feed" delay={240} />
      </div>

      {/* Quick actions */}
      <div className="mt-10">
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <QuickAction
            to="/investigate"
            icon={Sparkles}
            title="New Investigation"
            subtitle="Triage an alert with the AI agent"
            delay={300}
          />
          <QuickAction
            to="/anomaly"
            icon={ScanLine}
            title="Analyze Logs"
            subtitle="Detect anomalies in raw log data"
            delay={380}
          />
          <QuickAction
            to="/knowledge"
            icon={BookOpen}
            title="Search Knowledge Base"
            subtitle="Semantic search across security docs"
            delay={460}
          />
        </div>
      </div>

      {/* Live alerts */}
      <div className="mt-10 animate-fade-up" style={{ animationDelay: "540ms" }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            Live Alert Feed
          </h2>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-severity-low">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-severity-low" />
            LIVE
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {historyQ.isLoading ? (
            <div className="space-y-1 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <div className="text-[15px] font-semibold text-foreground">No alerts yet</div>
              <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
                Alerts you investigate will stream here in real time.
              </p>
              <Link
                to="/investigate"
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[13px] font-semibold text-white hover:brightness-110"
              >
                <Sparkles className="h-3.5 w-3.5" /> Start an investigation
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {alerts.map((a: any, i: number) => {
                const sev = (a.severity ?? "LOW").toUpperCase();
                const score = a.risk_score ?? a.score ?? 0;
                const color = severityColor(sev);
                return (
                  <li
                    key={a.id ?? i}
                    className="animate-slide-in-left group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/60"
                    style={{ animationDelay: `${600 + i * 60}ms` }}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: color, boxShadow: `0 0 10px ${color}` }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium text-foreground">
                        {a.alert ?? a.summary ?? "Security event"}
                      </div>
                      <div className="mt-0.5 text-[12px] text-muted-foreground">
                        {a.event_type ?? "alert"} · {fmtTime(a.timestamp)}
                      </div>
                    </div>
                    <span
                      className="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums"
                      style={{
                        color,
                        borderColor: `color-mix(in oklab, ${color} 35%, transparent)`,
                        background: `color-mix(in oklab, ${color} 10%, transparent)`,
                      }}
                    >
                      Risk {score}
                    </span>
                    <Link
                      to="/investigate"
                      className={cn(
                        "shrink-0 rounded-md p-1.5 text-muted-foreground transition-all",
                        "group-hover:bg-primary/10 group-hover:text-primary group-hover:translate-x-0.5",
                      )}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function fmtTime(t?: string | number) {
  if (!t) return "—";
  try {
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return String(t);
    return d.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" });
  } catch {
    return String(t);
  }
}
