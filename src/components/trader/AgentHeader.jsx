import React from "react";
import { Link } from "react-router-dom";
import { Play, ShieldCheck, ShieldOff, Power, Loader2, Map } from "lucide-react";
import AutoTraderLogo from "@/components/brand/AutoTraderLogo";

export default function AgentHeader({ config, busy, onRunNow, onToggleKill }) {
  const killed = config?.kill_switch;
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 md:px-6">
        <AutoTraderLogo />

        <div className="flex items-center gap-2 font-display text-[0.75rem]">
          <span className={`h-2 w-2 rounded-full ${killed ? "bg-destructive" : "bg-profit"}`} />
          <span className={killed ? "text-destructive" : "text-profit"}>
            {killed ? "HALTED" : "ARMED"}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="uppercase text-primary">{config?.mode || "paper"}</span>
          <span className="text-muted-foreground">·</span>
          {config?.mev_protection ? (
            <span className="flex items-center gap-1 text-profit"><ShieldCheck className="h-3.5 w-3.5" /> MEV SHIELD</span>
          ) : (
            <span className="flex items-center gap-1 text-destructive"><ShieldOff className="h-3.5 w-3.5" /> UNSHIELDED</span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/roadmap"
            className="hidden items-center gap-1.5 rounded-[4px] border border-border px-3 py-1.5 font-display text-[0.75rem] font-600 text-muted-foreground transition hover:text-foreground sm:flex"
          >
            <Map className="h-3.5 w-3.5" /> ROADMAP
          </Link>
          <button
            onClick={onRunNow}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-[4px] border border-primary/40 bg-primary/10 px-3 py-1.5 font-display text-[0.75rem] font-600 text-primary transition hover:bg-primary/20 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} RUN TICK
          </button>
          <button
            onClick={onToggleKill}
            className={`flex items-center gap-1.5 rounded-[4px] border px-3 py-1.5 font-display text-[0.75rem] font-600 transition ${
              killed
                ? "border-profit/40 bg-profit/10 text-profit hover:bg-profit/20"
                : "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
            }`}
          >
            <Power className="h-3.5 w-3.5" /> {killed ? "RELEASE" : "KILL SWITCH"}
          </button>
        </div>
      </div>
    </header>
  );
}