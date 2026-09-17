import React from "react";
import { impacts } from "@/data/analysis";

export default function ImpactList() {
  return (
    <section className="rounded-[4px] border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-[1.25rem] font-600 tracking-tight">Impact Scores</h2>
      </div>
      <ul className="divide-y divide-border">
        {impacts.map((i) => (
          <li key={i.label} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[0.875rem] font-600">{i.label}</p>
              <span className="font-display text-[0.875rem] font-700 num text-primary">{i.score}</span>
            </div>
            <div className="mt-2 h-1 w-full bg-secondary">
              <div className="h-1 bg-primary" style={{ width: `${i.score}%` }} />
            </div>
            <p className="mt-1.5 text-[0.75rem] text-muted-foreground">{i.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}