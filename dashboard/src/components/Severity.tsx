import { cn } from "@/lib/utils";
import { severityClass } from "@/lib/api";

export function SeverityBadge({ severity, className }: { severity: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        severityClass(severity),
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {severity}
    </span>
  );
}

export function RiskBar({ score }: { score: number }) {
  const s = Math.max(0, Math.min(100, score));
  const color =
    s >= 80
      ? "var(--severity-critical)"
      : s >= 60
        ? "var(--severity-high)"
        : s >= 35
          ? "var(--severity-medium)"
          : "var(--severity-low)";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${s}%`, background: color }}
      />
    </div>
  );
}
