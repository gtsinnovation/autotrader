import React, { useState } from "react";
import { Check, X, HelpCircle } from "lucide-react";

export default function CandidatePanel({ candidates }) {
  const [openId, setOpenId] = useState(null);

  return (
    <section className="rounded-[4px] border border-border bg-card">
      <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
        <h2 className="text-[1.25rem] font-600 tracking-tight">Gate Feed</h2>
        <span className="font-display text-[0.75rem] text-muted-foreground">LAST {candidates.length}</span>
      </div>

      {candidates.length === 0 && (
        <p className="px-4 py-6 text-[0.875rem] text-muted-foreground">No candidates evaluated yet — run a tick.</p>
      )}

      <ul className="divide-y divide-border">
        {candidates.map((c) => {
          const approved = c.decision === "approved";
          const expanded = openId === c.id;
          return (
            <li key={c.id}>
              <button onClick={() => setOpenId(expanded ? null : c.id)} className="w-full px-4 py-2.5 text-left">
                <div className="flex items-center gap-2">
                  <span className={`font-display text-[0.8125rem] font-700 ${approved ? "text-profit" : "text-foreground"}`}>
                    {c.symbol || "???"}
                  </span>
                  <span className="font-display text-[0.6875rem] text-muted-foreground">
                    risk {c.structure_risk} · conv {c.conviction}
                  </span>
                  <span
                    className={`ml-auto rounded-[4px] border px-1.5 py-0.5 font-display text-[0.6875rem] font-700 ${
                      approved
                        ? "border-profit/40 bg-profit/10 text-profit"
                        : "border-destructive/40 bg-destructive/10 text-destructive"
                    }`}
                  >
                    {approved ? "APPROVED" : "REJECTED"}
                  </span>
                </div>
                {!approved && c.reject_reason && (
                  <p className="mt-1 truncate font-display text-[0.6875rem] text-muted-foreground">{c.reject_reason}</p>
                )}
              </button>

              {expanded && (
                <ul className="space-y-1.5 bg-secondary/40 px-4 py-3">
                  {(c.gates || []).map((g) => {
                    const Icon = !g.measured ? HelpCircle : g.passed ? Check : X;
                    const tone = !g.measured ? "text-primary" : g.passed ? "text-profit" : "text-destructive";
                    return (
                      <li key={g.id} className="flex items-start gap-2 font-display text-[0.6875rem]">
                        <Icon className={`mt-0.5 h-3 w-3 shrink-0 ${tone}`} />
                        <span className="w-[6.5rem] shrink-0 text-foreground">{g.id}</span>
                        <span className="text-muted-foreground">{g.measured ? g.detail : "UNMEASURED — fail closed"}</span>
                      </li>
                    );
                  })}
                  <li className="pt-1 font-display text-[0.6875rem] text-muted-foreground">
                    liq ${Math.round(c.liquidity_usd || 0).toLocaleString()} · atr {c.atr_proxy_pct}% · slip{" "}
                    {c.slippage_ceiling_bps}bps · {c.source}
                  </li>
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}