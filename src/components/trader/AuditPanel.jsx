import React from "react";

const tones = { info: "text-muted-foreground", warn: "text-primary", error: "text-destructive" };

export default function AuditPanel({ logs }) {
  return (
    <section className="rounded-[4px] border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-[1.25rem] font-600 tracking-tight">Audit Log</h2>
      </div>
      {logs.length === 0 && <p className="px-4 py-6 text-[0.875rem] text-muted-foreground">No agent activity recorded yet.</p>}
      <ul className="max-h-[320px] divide-y divide-border overflow-auto">
        {logs.map((l) => (
          <li key={l.id} className="px-4 py-2 font-display text-[0.6875rem]">
            <div className="flex items-center gap-2">
              <span className="text-primary">{l.action}</span>
              {l.symbol && <span className="text-foreground">{l.symbol}</span>}
              {typeof l.amount_usd === "number" && (
                <span className={`ml-auto num ${l.amount_usd >= 0 ? "text-profit" : "text-destructive"}`}>
                  ${l.amount_usd.toFixed(2)}
                </span>
              )}
            </div>
            <p className={`mt-0.5 ${tones[l.severity] || tones.info}`}>{l.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}