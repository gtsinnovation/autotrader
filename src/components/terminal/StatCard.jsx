import React from "react";

export default function StatCard({ label, value, tone, hint }) {
  return (
    <div className="rounded-lg border border-gold/25 bg-card px-4 py-3 hover:border-gold/50 transition-colors">
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-lg font-bold ${tone || "text-foreground"}`}>{value}</div>
      {hint && <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}