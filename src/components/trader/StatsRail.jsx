import React from "react";

const money = (n) => `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function StatsRail({ positions, config }) {
  const open = positions.filter((p) => p.status === "open");
  const closed = positions.filter((p) => p.status === "closed");
  const deployed = open.reduce((s, p) => s + (p.allocated_usd || 0) * ((p.remaining_pct ?? 100) / 100), 0);
  const unrealized = open.reduce((s, p) => s + (p.unrealized_pnl_usd || 0), 0);
  const realized = positions.reduce((s, p) => s + (p.realized_pnl_usd || 0), 0);
  const wins = closed.filter((p) => (p.realized_pnl_usd || 0) > 0).length;
  const winRate = closed.length ? Math.round((wins / closed.length) * 100) : 0;

  const cells = [
    { label: "Realized P&L", value: money(realized), tone: realized >= 0 ? "text-profit" : "text-destructive" },
    { label: "Unrealized", value: money(unrealized), tone: unrealized >= 0 ? "text-profit" : "text-destructive" },
    { label: "Deployed", value: `${money(deployed)} / ${money(config?.capital_cap_usd || 0)}`, tone: "text-primary" },
    { label: "Open / Cap", value: `${open.length} / ${config?.max_open_positions ?? 0}`, tone: "text-foreground" },
    { label: "Closed", value: String(closed.length), tone: "text-foreground" },
    { label: "Win Rate", value: `${winRate}%`, tone: winRate >= 50 ? "text-profit" : "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cells.map((c) => (
        <div key={c.label} className="rounded-[4px] border border-border bg-card px-3 py-2.5">
          <p className="text-[0.75rem] uppercase tracking-wider text-muted-foreground">{c.label}</p>
          <p className={`font-display text-[1.125rem] font-700 num ${c.tone}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}