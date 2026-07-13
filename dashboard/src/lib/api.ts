const BASE = "http://localhost:8000";

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  ping: () => fetch(`${BASE}/`, { method: "GET" }).then((r) => r.ok),
  investigate: (alert: string) =>
    req<any>("/api/agent/investigate", { method: "POST", body: JSON.stringify({ alert }) }),
  analyzeAnomaly: (log_text: string) =>
    req<any>("/api/pipeline/anomaly/analyze", {
      method: "POST",
      body: JSON.stringify({ log_text }),
    }),
  feeds: () => req<any>("/api/pipeline/feeds"),
  status: () => req<any>("/api/pipeline/status"),
  history: () => req<any>("/api/agent/history"),
  ragQuery: (question: string) =>
    req<any>("/api/rag/query", { method: "POST", body: JSON.stringify({ question }) }),
  ragStats: () => req<any>("/api/rag/stats"),
};

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export function severityFromScore(score: number): Severity {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

export function severityClass(sev: string) {
  const s = sev?.toUpperCase();
  if (s === "CRITICAL")
    return "bg-severity-critical/15 text-severity-critical border-severity-critical/40";
  if (s === "HIGH")
    return "bg-severity-high/15 text-severity-high border-severity-high/40";
  if (s === "MEDIUM")
    return "bg-severity-medium/15 text-severity-medium border-severity-medium/40";
  return "bg-severity-low/15 text-severity-low border-severity-low/40";
}

export function severityColor(sev: string) {
  const s = sev?.toUpperCase();
  if (s === "CRITICAL") return "var(--severity-critical)";
  if (s === "HIGH") return "var(--severity-high)";
  if (s === "MEDIUM") return "var(--severity-medium)";
  return "var(--severity-low)";
}
