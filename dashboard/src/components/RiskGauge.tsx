import { useEffect, useState } from "react";
import { severityColor, severityFromScore } from "@/lib/api";

export function RiskGauge({ score, size = 180 }: { score: number; size?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    setValue(0);
    const t = setTimeout(() => setValue(score), 60);
    return () => clearTimeout(t);
  }, [score]);

  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;
  const color = severityColor(severityFromScore(score));

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} stroke="var(--color-muted)" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          stroke={color}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-black tabular-nums" style={{ color }}>
          {Math.round(value)}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Risk Score</div>
      </div>
    </div>
  );
}
