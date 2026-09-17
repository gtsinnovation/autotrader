import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

const NAV = [
  ["/", "Terminal"],
  ["/strategy-editor", "Strategy Editor"],
  ["/risk-settings", "Risk Settings"],
  ["/execution-logs", "Execution Logs"],
  ["/signal-inspector", "Signal Inspector"],
  ["/execution-history", "Execution History"],
  ["/performance-analytics", "Performance"],
  ["/watchlist", "Watchlist"],
  ["/system-health", "System Health"],
  ["/documentation", "Docs"]
];

export default function Shell() {
  const { pathname } = useLocation();

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link to="/" className="font-mono text-sm tracking-widest">
            <span className="text-gold">SOL</span>
            <span className="text-profit">AGENT</span>
          </Link>
          <nav className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-wider">
            {NAV.map(([to, label]) => (
              <Link
                key={to}
                to={to}
                className={
                  pathname === to
                    ? "text-gold border-b border-gold pb-0.5"
                    : "text-muted-foreground hover:text-foreground"
                }
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}