import React from "react";
import { Activity, Zap, Play } from "lucide-react";

const Stat = ({ label, value, tone = "text-foreground" }) => (
  <div className="flex flex-col leading-tight">
    <span className="text-[0.75rem] uppercase tracking-wider text-muted-foreground">{label}</span>
    <span className={`font-display text-[0.8125rem] font-600 num ${tone}`}>{value}</span>
  </div>
);

export default function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px] shadow-primary" />
          <span className="font-display text-[0.8125rem] font-700 tracking-tight">GMGN SKILL SYNC: ACTIVE</span>
        </div>
        <div className="hidden items-center gap-8 md:flex">
          <Stat label="SOL TPS" value="3,412" tone="text-primary" />
          <Stat label="Prio Fee" value="0.00019 SOL" />
          <Stat label="Agent" value="AUTONOMOUS_RUNNING" tone="text-primary" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-[4px] border border-primary/40 bg-primary/10 px-3 py-1.5 font-display text-[0.75rem] font-600 text-primary transition hover:bg-primary/20">
            <Zap className="h-3.5 w-3.5" /> DEPLOY INTEGRATION
          </button>
          <button className="hidden items-center gap-1.5 rounded-[4px] border border-border bg-secondary px-3 py-1.5 font-display text-[0.75rem] font-600 text-muted-foreground transition hover:text-foreground sm:flex">
            <Play className="h-3.5 w-3.5" /> TRIGGER REBALANCE
          </button>
          <Activity className="hidden h-4 w-4 text-muted-foreground lg:block" />
        </div>
      </div>
    </header>
  );
}