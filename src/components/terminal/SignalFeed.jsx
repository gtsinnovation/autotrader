import React from "react";

const Gate = ({ gate }) => (
  <span
    title={gate.detail}
    className={`px-1.5 py-0.5 rounded text-[10px] ${
      gate.passed
        ? gate.measured
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-sky-500/10 text-sky-400"
        : "bg-red-500/10 text-red-400"
    }`}
  >
    {gate.name}
  </span>
);

export default function SignalFeed({ signals }) {
  if (!signals.length) {
    return <div className="p-6 text-center font-mono text-xs text-muted-foreground">No signals yet — run a scan.</div>;
  }

  return (
    <div className="divide-y divide-border">
      {signals.map((s) => (
        <div key={s.id} className="px-3 py-3 space-y-2">
          <div className="flex items-center justify-between gap-2 font-mono text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  s.verdict === "APPROVED" ? "bg-emerald-500/15 text-emerald-400" : "bg-secondary text-muted-foreground"
                }`}
              >
                {s.verdict}
              </span>
              <span className="truncate">{s.symbol || s.token_address.slice(0, 8)}</span>
              {s.opened_position && <span className="text-[10px] text-emerald-400">ENTERED</span>}
            </div>
            <div className="flex items-center gap-3 shrink-0 text-muted-foreground">
              <span>${Math.round(s.liquidity_usd || 0).toLocaleString()} liq</span>
              <span className={Number(s.price_change_h1) >= 0 ? "text-emerald-400" : "text-red-400"}>
                {Number(s.price_change_h1 || 0).toFixed(1)}% 1h
              </span>
              <span className="text-foreground">{s.score ?? 0}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 font-mono">
            {(s.gates || []).map((g, i) => (
              <Gate key={i} gate={g} />
            ))}
          </div>
          {(s.reject_reason || s.skip_reason) && (
            <div className="font-mono text-[10px] text-muted-foreground">
              {s.rejected_by ? `${s.rejected_by}: ${s.reject_reason}` : s.skip_reason}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}