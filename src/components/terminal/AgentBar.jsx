import React from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RefreshCw, Activity } from "lucide-react";
import StatCard from "./StatCard";

export default function AgentBar({ config, stats, busy, onResume, onPause, onScan }) {
  const running = config?.run_status === "RUNNING";
  const pnl = stats?.netPnlUsd || 0;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-gold/30 bg-card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${running ? "text-profit" : "text-gold"}`} />
          <span className="font-mono text-sm font-bold">
            {running ? "AGENT RUNNING" : config?.run_status?.replace("_", " ") || "OFFLINE"}
          </span>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-gold/40 text-gold">
            {config?.mode || "PAPER"}
          </span>
          {config?.pause_reason && (
            <span className="font-mono text-[10px] text-gold">{config.pause_reason}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={onScan} className="font-mono text-xs border-gold/40 text-gold">
            <RefreshCw className={`w-3 h-3 mr-1 ${busy ? "animate-spin" : ""}`} /> SCAN NOW
          </Button>
          {running ? (
            <Button size="sm" variant="destructive" disabled={busy} onClick={onPause} className="font-mono text-xs">
              <Pause className="w-3 h-3 mr-1" /> PAUSE
            </Button>
          ) : (
            <Button size="sm" disabled={busy} onClick={onResume} className="font-mono text-xs">
              <Play className="w-3 h-3 mr-1" /> START
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard label="Capital" value={`$${(config?.total_capital_usd || 0).toLocaleString()}`} />
        <StatCard label="Per Trade" value={`$${config?.max_position_usd || 0}`} />
        <StatCard
          label="Open Positions"
          value={`${stats?.open || 0} / ${config?.max_open_positions || 0}`}
        />
        <StatCard label="Closed" value={stats?.closed || 0} />
        <StatCard
          label="Realized P&L"
          value={`${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
          tone={pnl >= 0 ? "text-profit" : "text-loss"}
        />
        <StatCard label="Win Rate" value={`${stats?.winRate ?? 0}%`} />
        <StatCard
          label="Last Scan"
          value={config?.last_scan_at ? new Date(config.last_scan_at).toLocaleTimeString() : "—"}
        />
        <StatCard label="Mode" value={config?.mode || "PAPER"} tone="text-gold" />
      </div>
    </div>
  );
}