import React from "react";

export default function ActiveExposureChart({ positions }) {
  const max = Math.max(...positions.map((p) => Number(p.allocated_usd || 0)), 1);

  return (
    <div className="rounded-[4px] border border-border bg-card p-4">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-[0.8125rem] font-700 tracking-wide text-primary">ACTIVE TRADE POSITIONS</h2>
        <span className="font-display text-[0.75rem] text-muted-foreground">{positions.length} OPEN</span>
      </div>

      {positions.length === 0 ? (
        <p className="py-6 text-center font-display text-[0.75rem] text-muted-foreground">NO OPEN EXPOSURE</p>
      ) : (
        <div className="space-y-3">
          {positions.map((p) => {
            const pnl = Number(p.unrealized_pnl_usd || 0);
            const alloc = Number(p.allocated_usd || 0);
            const pct = alloc > 0 ? (pnl / alloc) * 100 : 0;
            const up = pnl >= 0;
            return (
              <div key={p.id} className="space-y-1.5">
                <div className="flex items-center justify-between font-display text-[0.75rem]">
                  <span className="font-600 text-foreground">${p.symbol || p.token_address.slice(0, 6)}</span>
                  <span className="num text-muted-foreground">
                    ${alloc.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    <span className={`ml-2 font-600 ${up ? "text-profit" : "text-destructive"}`}>
                      {up ? "+" : "−"}
                      {Math.abs(pct).toFixed(1)}%
                    </span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={up ? "h-full bg-profit" : "h-full bg-destructive"}
                    style={{ width: `${Math.max((alloc / max) * 100, 4)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}