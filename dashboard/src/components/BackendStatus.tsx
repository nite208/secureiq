import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function useBackendStatus() {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    let cancel = false;
    const check = async () => {
      try {
        const ok = await api.ping();
        if (!cancel) setOnline(ok);
      } catch {
        if (!cancel) setOnline(false);
      }
    };
    check();
    const t = setInterval(check, 10_000);
    return () => {
      cancel = true;
      clearInterval(t);
    };
  }, []);
  return online;
}

export function BackendStatusDot() {
  const online = useBackendStatus();
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs">
      <span
        className={cn(
          "h-2 w-2 rounded-full animate-pulse-dot",
          online === null && "bg-muted-foreground",
          online === true && "bg-severity-low shadow-[0_0_8px_var(--severity-low)]",
          online === false && "bg-severity-critical shadow-[0_0_8px_var(--severity-critical)]",
        )}
      />
      <span className="text-muted-foreground">
        Backend {online === null ? "checking…" : online ? "online" : "offline"}
      </span>
    </div>
  );
}

export function BackendStatus() {
  const online = useBackendStatus();
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs shadow-lg backdrop-blur">
      <span
        className={cn(
          "h-2 w-2 rounded-full animate-pulse-dot",
          online === null && "bg-muted-foreground",
          online === true && "bg-severity-low shadow-[0_0_8px_var(--severity-low)]",
          online === false && "bg-severity-critical shadow-[0_0_8px_var(--severity-critical)]",
        )}
      />
      <span className="text-muted-foreground">
        Backend {online === null ? "checking…" : online ? "online" : "offline"}
      </span>
    </div>
  );
}
