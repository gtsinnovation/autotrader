import React from "react";
import { matrix, verdictStyles } from "@/data/analysis";

export default function FeatureMatrix() {
  return (
    <section className="rounded-[4px] border border-border bg-card">
      <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
        <h2 className="text-[1.25rem] font-600 tracking-tight">Feature Matrix</h2>
        <span className="font-display text-[0.75rem] text-muted-foreground">LOCAL / GMGN</span>
      </div>
      <ul className="divide-y divide-border">
        {matrix.map((row) => {
          const v = verdictStyles[row.verdict];
          return (
            <li key={row.capability} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[0.875rem] font-600">{row.capability}</p>
                <span className={`shrink-0 rounded-[4px] border px-1.5 py-0.5 font-display text-[0.6875rem] font-700 ${v.cls}`}>
                  {v.label}
                </span>
              </div>
              <p className="mt-1.5 text-[0.75rem] text-muted-foreground">
                <span className="font-display text-foreground/70">LOCAL</span> {row.local}
              </p>
              <p className="mt-1 text-[0.75rem] text-muted-foreground">
                <span className="font-display text-primary">GMGN</span> {row.gmgn}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}