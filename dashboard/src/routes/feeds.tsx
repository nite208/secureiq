import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Bug, Newspaper } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SeverityBadge } from "@/components/Severity";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/feeds")({
  head: () => ({
    meta: [
      { title: "Threat Feed — SecureIQ" },
      { name: "description", content: "Live CVE and security news feed." },
    ],
  }),
  component: Feeds,
});

function Feeds() {
  const q = useQuery({ queryKey: ["feeds"], queryFn: api.feeds, retry: false });
  const data: any = q.data ?? {};
  const cves: any[] = data.cves ?? [];
  const news: any[] = data.news ?? data.articles ?? [];
  const updated = data.updated_at ?? data.last_updated;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Threat Feed</h1>
          <p className="text-xs text-muted-foreground">
            {updated ? `Last updated ${new Date(updated).toLocaleString()}` : "Live intelligence"}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => q.refetch()} disabled={q.isFetching}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${q.isFetching ? "animate-spin" : ""}`} />
          Refresh Feed
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FeedColumn title="CVE Feed" icon={Bug} items={cves} loading={q.isLoading} kind="cve" />
        <FeedColumn title="Security News" icon={Newspaper} items={news} loading={q.isLoading} kind="news" />
      </div>
    </div>
  );
}

function FeedColumn({
  title,
  icon: Icon,
  items,
  loading,
  kind,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: any[];
  loading: boolean;
  kind: "cve" | "news";
}) {
  return (
    <Card className="border-border/70 bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold">{title}</h2>
        <span className="ml-auto text-[10px] text-muted-foreground">{items.length} items</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 bg-background/30 px-4 py-10 text-center text-xs text-muted-foreground">
          Feed not yet fetched — scheduler runs hourly.
        </div>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 12).map((item, i) => (
            <div
              key={item.id ?? i}
              className="rounded-lg border border-border/60 bg-background/40 p-3 hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {kind === "cve" ? item.id ?? item.cve_id ?? "CVE" : item.title ?? "Untitled"}
                  </div>
                  {item.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </div>
                {item.severity && <SeverityBadge severity={item.severity} />}
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">
                {item.published ?? item.date ?? ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
