import React, { useState } from "react";
import { Check, X, Wrench, ArrowRight } from "lucide-react";

const TABS = [
  { key: "pros", label: "PROS" },
  { key: "cons", label: "CONS" },
  { key: "how", label: "HOW" },
];

export default function RecommendationCard({ rec, onPreview }) {
  const [tab, setTab] = useState("pros");
  const items = rec[tab];
  const Icon = tab === "pros" ? Check : tab === "cons" ? X : Wrench;
  const tone = tab === "pros" ? "text-primary" : tab === "cons" ? "text-destructive" : "text-warning";

  return (
    <article className="flex h-full flex-col rounded-[4px] border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[1.25rem] font-600 leading-tight tracking-tight">{rec.title}</h3>
          <div className="shrink-0 text-right">
            <p className="font-display text-[1.125rem] font-700 num text-primary">{rec.impact}</p>
            <p className="font-display text-[0.6875rem] uppercase text-muted-foreground">{rec.effort} effort</p>
          </div>
        </div>
        <p className="mt-2 text-[0.875rem] text-muted-foreground">{rec.summary}</p>
      </div>

      <div className="flex border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 px-3 py-2 font-display text-[0.75rem] font-600 tracking-wider transition ${
              tab === t.key ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ul className="flex-1 space-y-2.5 px-4 py-3">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-[0.875rem]">
            <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tone}`} />
            <span className="text-muted-foreground">{it}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onPreview(rec.id)}
        className="flex items-center justify-center gap-1.5 border-t border-border px-4 py-2.5 font-display text-[0.75rem] font-600 text-primary transition hover:bg-primary/10"
      >
        VIEW PATCH <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </article>
  );
}