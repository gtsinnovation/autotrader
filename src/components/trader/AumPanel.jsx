import React from "react";

const fmt = (n) => `$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function AumPanel({ aum, deployed, unrealized, realized }) {
  const rows = [
    { label: "DEPLOYED CAPITAL", value: fmt(deployed), tone: "text-foreground" },
    {
      label: "OPEN UNREALIZED",
      value: `${unrealized >= 0 ? "+" : "−"}${fmt(unrealized)}`,
      tone: unrealized >= 0 ? "text-profit" : "text-destructive",
    },
    {
      label: "REALIZED TO DATE",
      value: `${realized >= 0 ? "+" : "−"}${fmt(realized)}`,
      tone: realized >= 0 ? "text-profit" : "text-destructive",
    },
  ];

  return (
    <div className="metric-glow rounded-[4px] border border-primary/30 bg-card p-4">
      <h2 className="font-display text-[0.8125rem] font-700 tracking-wide text-primary">ASSETS UNDER MANAGEMENT</h2>
      <p className="num mt-3 font-display text-[2rem] font-700 leading-none text-primary">{fmt(aum)}</p>
      <p className="mt-1 font-display text-[0.6875rem] text-muted-foreground">DEPLOYED + OPEN UNREALIZED</p>
      <div className="mt-4 space-y-2 border-t border-border pt-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between">
            <span className="font-display text-[0.6875rem] text-muted-foreground">{r.label}</span>
            <span className={`num font-display text-[0.8125rem] font-600 ${r.tone}`}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}