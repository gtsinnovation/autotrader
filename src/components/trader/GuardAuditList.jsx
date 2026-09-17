import React from "react";
import { ShieldCheck, ShieldX } from "lucide-react";

export default function GuardAuditList({ audits }) {
  return (
    <section className="rounded-[4px] border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-display text-[0.8125rem] font-700 tracking-wide text-primary">POLICY GUARD DECISIONS</h2>
        <p className="mt-1 text-[0.75rem] text-muted-foreground">
          Every signing request, with each check re-derived at request time.
        </p>
      </div>
      {audits.length === 0 ? (
        <p className="px-4 py-6 text-center font-display text-[0.75rem] text-muted-foreground">
          NO SIGNING REQUESTS RECORDED
        </p>
      ) : (
        <div className="divide-y divide-border">
          {audits.map((a) => (
            <div key={a.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 font-display text-[0.75rem]">
                {a.allowed ? (
                  <ShieldCheck className="h-3.5 w-3.5 text-profit" />
                ) : (
                  <ShieldX className="h-3.5 w-3.5 text-destructive" />
                )}
                <span className={`font-700 ${a.allowed ? "text-profit" : "text-destructive"}`}>
                  {a.allowed ? "ALLOWED" : "REFUSED"}
                </span>
                <span className="text-foreground">${a.symbol || a.token_address?.slice(0, 6)}</span>
                <span className="num text-muted-foreground">${Number(a.requested_usd || 0).toFixed(2)}</span>
                <span className="ml-auto text-muted-foreground">{new Date(a.created_date).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-[0.75rem] text-muted-foreground">{a.reason}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(a.checks || []).map((c, i) => (
                  <span
                    key={i}
                    title={c.detail}
                    className={`rounded-[3px] border px-1.5 py-0.5 font-display text-[0.625rem] ${
                      c.passed ? "border-profit/40 text-profit" : "border-destructive/40 text-destructive"
                    }`}
                  >
                    {c.id}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}