import React from "react";
import { X, ShieldCheck, TrendingUp } from "lucide-react";

const px = (n) => (n ? Number(n).toPrecision(5) : "—");
const money = (n) => `${n < 0 ? "-" : ""}$${Math.abs(n || 0).toFixed(2)}`;

export default function PositionsPanel({ positions, onClose, closingId }) {
  const open = positions.filter((p) => p.status === "open");
  const closed = positions.filter((p) => p.status === "closed").slice(0, 8);

  return (
    <section className="rounded-[4px] border border-border bg-card">
      <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
        <h2 className="text-[1.25rem] font-600 tracking-tight">Positions</h2>
        <span className="font-display text-[0.75rem] text-muted-foreground">{open.length} OPEN</span>
      </div>

      {open.length === 0 && (
        <p className="px-4 py-6 text-[0.875rem] text-muted-foreground">
          No open positions. The agent opens one only when every gate passes.
        </p>
      )}

      <ul className="divide-y divide-border">
        {open.map((p) => {
          const pnl = p.unrealized_pnl_usd || 0;
          return (
            <li key={p.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-display text-[0.9375rem] font-700">{p.symbol || "???"}</span>
                {p.trailing_armed && (
                  <span className="flex items-center gap-1 rounded-[4px] border border-profit/40 bg-profit/10 px-1.5 py-0.5 font-display text-[0.6875rem] text-profit">
                    <TrendingUp className="h-3 w-3" /> TRAILING
                  </span>
                )}
                {p.mev_protected && (
                  <span className="flex items-center gap-1 font-display text-[0.6875rem] text-muted-foreground">
                    <ShieldCheck className="h-3 w-3 text-profit" /> {p.slippage_ceiling_bps}bps
                  </span>
                )}
                <span className={`ml-auto font-display text-[0.9375rem] font-700 num ${pnl >= 0 ? "text-profit" : "text-destructive"}`}>
                  {money(pnl)}
                </span>
                <button
                  onClick={() => onClose(p.id)}
                  disabled={closingId === p.id}
                  className="rounded-[4px] border border-destructive/40 p-1 text-destructive transition hover:bg-destructive/10 disabled:opacity-40"
                  aria-label="Close position"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 font-display text-[0.75rem] text-muted-foreground sm:grid-cols-4">
                <span>entry {px(p.entry_price)}</span>
                <span>last {px(p.last_price)}</span>
                <span className="text-destructive/80">stop {px(p.stop_price)}</span>
                <span className="text-profit/80">target {px(p.target_price)}</span>
                <span>size {money(p.allocated_usd)}</span>
                <span>left {p.remaining_pct ?? 100}%</span>
                <span>conviction {p.conviction ?? "—"}</span>
                <span>realized {money(p.realized_pnl_usd)}</span>
              </div>
            </li>
          );
        })}
      </ul>

      {closed.length > 0 && (
        <div className="border-t border-border">
          <p className="px-4 py-2 font-display text-[0.75rem] uppercase tracking-wider text-muted-foreground">Recently closed</p>
          <ul className="divide-y divide-border">
            {closed.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2 font-display text-[0.75rem]">
                <span className="font-600">{p.symbol || "???"}</span>
                <span className="text-muted-foreground">{p.exit_reason}</span>
                <span className={`ml-auto num ${(p.realized_pnl_usd || 0) >= 0 ? "text-profit" : "text-destructive"}`}>
                  {money(p.realized_pnl_usd)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}