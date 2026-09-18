import React from "react";

export default function Section({ title, action, children, flush }) {
  return (
    <section className="rounded-lg border border-gold/30 bg-card overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gold/25 bg-black/40">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">{title}</h2>
        {action}
      </header>
      <div className={flush ? "" : "p-4"}>{children}</div>
    </section>
  );
}