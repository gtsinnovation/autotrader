import React from "react";

// Re-derives the weighted components of the stored structure-risk score from the
// same measured fields the gate engine used. Nothing here is inferred.
function breakdown(c) {
  const liq = Number(c.liquidity_usd || 0);
  const churn = liq > 0 ? Number(c.volume_24h_usd || 0) / liq : null;
  const floatRatio = liq > 0 ? Number(c.fdv_usd || 0) / liq : null;
  const flow = Number(c.buys_1h || 0) + Number(c.sells_1h || 0);
  const sellPressure = flow > 0 ? Number(c.sells_1h || 0) / flow : null;
  const thinFlow = flow > 0 ? Math.max(0, 1 - flow / 120) : null;
  return [
    { label: "Churn (24h vol / liq)", weight: 30, value: churn, fmt: (v) => `${v.toFixed(1)}x` },
    { label: "Float ratio (FDV / liq)", weight: 30, value: floatRatio, fmt: (v) => `${v.toFixed(0)}x` },
    { label: "Sell pressure", weight: 20, value: sellPressure, fmt: (v) => `${Math.round(v * 100)}%` },
    { label: "Flow thinness", weight: 20, value: thinFlow, fmt: (v) => `${Math.round(v * 100)}%` },
  ];
}

export default function ForensicsTable({ candidates }) {
  if (candidates.length === 0) {
    return (
      <p className="rounded-[4px] border border-border bg-card px-4 py-8 text-center font-display text-[0.75rem] text-muted-foreground">
        NO EVALUATED CANDIDATES YET — RUN THE SCANNER
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {candidates.map((c) => {
        const risk = Number(c.structure_risk ?? 0);
        const tone = risk >= 70 ? "text-destructive" : risk >= 45 ? "text-primary" : "text-profit";
        return (
          <div key={c.id} className="rounded-[4px] border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-display text-[0.875rem] font-700 text-foreground">
                ${c.symbol || c.token_address.slice(0, 6)}
              </span>
              <span className="font-display text-[0.6875rem] uppercase text-muted-foreground">{c.decision}</span>
              <span className={`num ml-auto font-display text-[1.125rem] font-700 ${tone}`}>{risk}/100</span>
              <span className="font-display text-[0.6875rem] text-muted-foreground">WEIGHTED RISK</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {breakdown(c).map((b) => (
                <div key={b.label} className="flex items-center justify-between rounded-[3px] bg-secondary px-2.5 py-1.5">
                  <span className="font-display text-[0.6875rem] text-muted-foreground">
                    {b.label} · {b.weight}pts
                  </span>
                  <span className={`num font-display text-[0.75rem] font-600 ${b.value === null ? "text-destructive" : "text-foreground"}`}>
                    {b.value === null ? "UNMEASURED" : b.fmt(b.value)}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[0.6875rem] text-muted-foreground">
              Insider / bundler / sniper attribution needs wallet-level transaction data, which no connected source
              provides — it is deliberately absent rather than estimated.
            </p>
          </div>
        );
      })}
    </div>
  );
}