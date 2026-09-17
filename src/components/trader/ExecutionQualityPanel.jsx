import React from "react";

export default function ExecutionQualityPanel({ positions }) {
  const closed = positions.filter((p) => p.status === "closed");
  const protectedCount = positions.filter((p) => p.mev_protected).length;
  const wins = closed.filter((p) => Number(p.realized_pnl_usd || 0) > 0).length;
  const ceilings = positions.map((p) => Number(p.slippage_ceiling_bps || 0)).filter((n) => n > 0);
  const avgCeiling = ceilings.length ? Math.round(ceilings.reduce((a, b) => a + b, 0) / ceilings.length) : null;
  const live = positions.filter((p) => p.mode === "live").length;

  const stats = [
    { label: "PROTECTED SUBMISSION", value: positions.length ? `${Math.round((protectedCount / positions.length) * 100)}%` : "—" },
    { label: "CLOSED TRADES", value: closed.length },
    { label: "WIN RATE", value: closed.length ? `${Math.round((wins / closed.length) * 100)}%` : "—" },
    { label: "AVG SLIPPAGE CEILING", value: avgCeiling === null ? "—" : `${avgCeiling} bps` },
  ];

  return (
    <section className="rounded-[4px] border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-display text-[0.8125rem] font-700 tracking-wide text-primary">EXECUTION QUALITY</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[3px] bg-secondary px-3 py-2.5">
            <p className="font-display text-[0.625rem] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="num mt-1 font-display text-[1.125rem] font-700 text-foreground">{s.value}</p>
          </div>
        ))}
      </div>
      <p className="border-t border-border px-4 py-3 text-[0.75rem] text-muted-foreground">
        {live === 0
          ? "All recorded trades are paper fills, so realized slippage and Jito bundle landing rates do not exist yet — those require a live protected submission path, which is not connected."
          : "Realized slippage versus ceiling appears here only once the live submission path reports fill prices; ceilings shown above are the pre-trade limits enforced by the gate engine."}
      </p>
    </section>
  );
}