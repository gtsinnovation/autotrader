import React from "react";

// One documentation block: heading, optional lead paragraph, and key/value rows.
export default function DocSection({ title, lead, rows, children }) {
  return (
    <section className="border border-border rounded-lg bg-card">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-mono text-xs uppercase tracking-widest text-gold">{title}</h2>
        {lead && <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{lead}</p>}
      </div>
      {rows && (
        <dl className="divide-y divide-border">
          {rows.map(([term, desc]) => (
            <div key={term} className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="font-mono text-xs text-foreground">{term}</dt>
              <dd className="sm:col-span-2 text-sm text-muted-foreground leading-relaxed">{desc}</dd>
            </div>
          ))}
        </dl>
      )}
      {children && <div className="px-4 py-3">{children}</div>}
    </section>
  );
}