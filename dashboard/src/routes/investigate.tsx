import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Brain, Search, BarChart3, FileText, Send, CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, severityFromScore } from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";
import { SeverityBadge } from "@/components/Severity";
import { RiskGauge } from "@/components/RiskGauge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/investigate")({
  head: () => ({
    meta: [
      { title: "Investigate — SecureIQ" },
      { name: "description", content: "Run AI-driven security investigations on any alert." },
    ],
  }),
  component: Investigate,
});

const EXAMPLES = [
  "Failed login from suspicious IP",
  "Fire detected in server room",
  "Unauthorized admin access at 3am",
  "Malware signature detected",
];

const STEPS = [
  { label: "Analyzing Input", desc: "Parsing alert content and extracting entities", icon: Brain },
  { label: "Searching Knowledge Base", desc: "Retrieving related threats and playbooks", icon: Search },
  { label: "Scoring Risk", desc: "Calculating severity and impact", icon: BarChart3 },
  { label: "Generating Report", desc: "Composing the incident summary", icon: FileText },
];

function formatInlineText(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .split(/\n/)
    .join("<br />");
}

function formatReport(text: string) {
  if (!text) return null;

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return null;

  const blocks = normalized.split(/\n\n+/).filter(Boolean);

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => {
        const trimmed = block.trim();

        if (/^##\s+/.test(trimmed)) {
          return (
            <h3 key={index} className="text-[15px] font-semibold text-foreground">
              {trimmed.replace(/^##\s+/, "")}
            </h3>
          );
        }

        if (trimmed.split("\n").every((line) => line.trim().startsWith("- "))) {
          const items = trimmed
            .split("\n")
            .map((line) => line.trim().replace(/^-\s+/, ""))
            .filter(Boolean);

          return (
            <ul key={index} className="ml-5 list-disc space-y-2 text-[13px] leading-relaxed text-foreground">
              {items.map((item, itemIndex) => (
                <li key={`${index}-${itemIndex}`}>{formatInlineText(item)}</li>
              ))}
            </ul>
          );
        }

        return (
          <p
            key={index}
            className="text-[13px] leading-relaxed text-foreground"
            dangerouslySetInnerHTML={{ __html: formatInlineText(trimmed) }}
          />
        );
      })}
    </div>
  );
}

function Investigate() {
  const [alert, setAlert] = useState("");
  const [activeStep, setActiveStep] = useState(-1);

  const mutation = useMutation({
    mutationFn: async (a: string) => {
      for (let i = 0; i < STEPS.length; i++) {
        setActiveStep(i);
        await new Promise((r) => setTimeout(r, 500));
      }
      const res = await api.investigate(a);
      setActiveStep(STEPS.length);
      return res;
    },
    onError: () => {
      setActiveStep(-1);
      toast.error("Investigation failed — check the backend and try again.");
    },
  });

  const result = mutation.data;
  const running = mutation.isPending;
  const score = result?.risk_score ?? result?.score ?? 0;
  const severity = result?.severity ?? severityFromScore(score);
  const report = result?.report ?? result?.incident_report ?? result?.summary ?? "";
  const alertSent = Boolean(result?.alert_sent);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-14">
      <header className="mb-8 animate-fade-up">
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">Investigate Alert</h1>
        <p className="mt-1.5 text-[14px] text-muted-foreground">
          Paste a security event and let the AI agent handle triage.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* LEFT 40% — input */}
        <section className="animate-fade-up rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Alert Input
          </label>
          <Textarea
            value={alert}
            onChange={(e) => setAlert(e.target.value)}
            rows={10}
            placeholder="Paste security alert here..."
            className="mt-2 resize-none rounded-lg border-border bg-background font-mono text-[13px] text-foreground"
          />

          <div className="mt-5">
            <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Try an example
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setAlert(ex)}
                  className="rounded-full border border-primary/30 bg-transparent px-3 py-1 text-[12px] font-medium text-primary transition hover:bg-primary/10"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={!alert.trim() || running}
            onClick={() => mutation.mutate(alert)}
            className={cn(
              "mt-6 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-[14px] font-semibold text-white shadow-sm transition-all",
              "bg-gradient-to-r from-primary to-primary-glow",
              "hover:brightness-110 hover:shadow-[0_0_0_5px_color-mix(in_oklab,var(--primary)_18%,transparent)]",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
            )}
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {running ? "Investigating…" : "Start Investigation"}
          </button>
        </section>

        {/* RIGHT 60% — results */}
        <div className="space-y-6 lg:col-span-3">
          {running || result ? (
            <>
              {/* Vertical timeline */}
              <section className="animate-fade-up rounded-xl border border-border bg-card p-6">
                <div className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Agent Progress
                </div>
                <ol className="relative">
                  {STEPS.map((s, i) => {
                    const done = activeStep > i || (!running && !!result);
                    const active = activeStep === i && running;
                    const Icon = s.icon;
                    const isLast = i === STEPS.length - 1;
                    return (
                      <li
                        key={s.label}
                        className={cn(
                          "relative flex gap-4 pb-6",
                          !active && !done && "opacity-40",
                        )}
                        style={{ animationDelay: `${i * 300}ms` }}
                      >
                        {!isLast && (
                          <span
                            className={cn(
                              "absolute left-[19px] top-10 h-[calc(100%-1.5rem)] w-px transition-colors",
                              done ? "bg-severity-low" : "bg-border",
                            )}
                          />
                        )}
                        <div
                          className={cn(
                            "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-bold transition-all",
                            active && "border-primary bg-primary text-white animate-pulse-glow",
                            done && !active && "border-severity-low bg-severity-low text-white",
                            !active && !done && "border-border bg-card text-muted-foreground",
                          )}
                        >
                          {done && !active ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : active ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>
                        <div className="pt-1.5">
                          <div className="text-[14px] font-semibold text-foreground">{s.label}</div>
                          <div className="text-[12.5px] text-muted-foreground">{s.desc}</div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>

              {result && (
                <section className="animate-fade-up rounded-xl border border-border bg-card p-8">
                  <div className="flex flex-col items-center gap-5">
                    <RiskGauge score={score} size={220} />
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <SeverityBadge severity={severity} />
                      {alertSent && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                          <Send className="h-3 w-3" /> Alert Sent
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-8">
                    <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Incident Report
                    </h3>
                    <div className="mt-3 max-h-[420px] overflow-auto rounded-lg border border-border bg-muted/40 p-4 text-[13px] leading-relaxed text-foreground">
                      {formatReport(report) || <pre className="whitespace-pre-wrap font-mono">{JSON.stringify(result, null, 2)}</pre>}
                    </div>
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="animate-fade-up flex h-full min-h-[420px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-foreground">Ready to investigate</h3>
                <p className="mt-1.5 max-w-sm text-[13px] text-muted-foreground">
                  Paste an alert on the left and hit Start Investigation. Progress and results appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

