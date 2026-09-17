import React, { useState } from "react";

// Mirrors exitLevels() in the gate engine so the operator can see what a change
// actually does to the stop and target before saving it.
export default function StrategyPreview({ config }) {
  const [entry, setEntry] = useState(1);
  const [atr, setAtr] = useState(8);

  const stopMult = Number(config?.atr_stop_multiple ?? 1.8);
  const tpMult = Number(config?.take_profit_multiple ?? 2);
  const stop = entry * (1 - (atr * stopMult) / 100);
  const r = entry - stop;
  const target = entry + tpMult * r;
  const partial = Number(config?.partial_exit_pct ?? 50);
  const trail = Number(config?.trailing_stop_pct ?? 25);

  const rows = [
    { label: "HARD STOP", value: `$${stop.toFixed(6)}`, tone: "text-destructive" },
    { label: "TAKE PROFIT", value: `$${target.toFixed(6)}`, tone: "text-profit" },
    { label: "RISK PER UNIT (1R)", value: `$${r.toFixed(6)}`, tone: "text-foreground" },
    { label: "PARTIAL AT TARGET", value: `${partial}% out`, tone: "text-primary" },
    { label: "THEN TRAILS", value: `${trail}% off peak`, tone: "text-primary" },
  ];

  return (
    <section className="rounded-[4px] border border-primary/30 bg-card p-4">
      <h2 className="font-display text-[0.8125rem] font-700 tracking-wide text-primary">LIVE EXIT PREVIEW</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block font-display text-[0.625rem] uppercase tracking-wider text-muted-foreground">Entry price</span>
          <input
            type="number"
            step="any"
            value={entry}
            onChange={(e) => setEntry(Number(e.target.value) || 0)}
            className="num mt-1 w-full rounded-[4px] border border-border bg-secondary px-2 py-1.5 font-display text-[0.8125rem]"
          />
        </label>
        <label className="block">
          <span className="block font-display text-[0.625rem] uppercase tracking-wider text-muted-foreground">ATR proxy (%)</span>
          <input
            type="number"
            step="any"
            value={atr}
            onChange={(e) => setAtr(Number(e.target.value) || 0)}
            className="num mt-1 w-full rounded-[4px] border border-border bg-secondary px-2 py-1.5 font-display text-[0.8125rem]"
          />
        </label>
      </div>
      <div className="mt-4 space-y-2 border-t border-border pt-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="font-display text-[0.6875rem] text-muted-foreground">{row.label}</span>
            <span className={`num font-display text-[0.8125rem] font-600 ${row.tone}`}>{row.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}