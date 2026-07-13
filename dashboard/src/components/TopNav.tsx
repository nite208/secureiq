import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { title: "Dashboard", url: "/" },
  { title: "Investigate", url: "/investigate" },
  { title: "Anomaly", url: "/anomaly" },
  { title: "Threat Feed", url: "/feeds" },
  { title: "History", url: "/history" },
  { title: "Knowledge", url: "/knowledge" },
];

export function TopNav() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card shadow-[0_1px_0_0_rgba(0,0,0,0.02)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-6 md:px-10">
        <Link to="/" className="flex shrink-0 items-center gap-2" onClick={() => setOpen(false)}>
          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
          <span className="text-[17px] font-bold tracking-tight text-foreground">SecureIQ</span>
        </Link>

        <nav className="mx-auto hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const active = pathname === n.url;
            return (
              <Link
                key={n.url}
                to={n.url}
                className={cn(
                  "group relative px-3 py-2 text-[13.5px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-primary",
                )}
              >
                {n.title}
                <span
                  className={cn(
                    "absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full bg-primary transition-transform duration-200",
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/investigate"
            className="hidden items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition-all hover:brightness-110 hover:shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_18%,transparent)] md:inline-flex"
          >
            <Sparkles className="h-3.5 w-3.5" />
            New Investigation
          </Link>
          <button
            className="rounded-md p-2 hover:bg-muted md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-card md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-4 py-2">
            {NAV.map((n) => {
              const active = pathname === n.url;
              return (
                <Link
                  key={n.url}
                  to={n.url}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2.5 text-sm",
                    active
                      ? "bg-primary/10 font-semibold text-primary"
                      : "font-medium text-muted-foreground hover:bg-muted hover:text-primary",
                  )}
                >
                  {n.title}
                </Link>
              );
            })}
            <Link
              to="/investigate"
              onClick={() => setOpen(false)}
              className="mx-3 my-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
            >
              <Sparkles className="h-3.5 w-3.5" />
              New Investigation
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
