import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";

const Line = ({ label, value }) => (
  <div className="flex justify-between gap-4 py-1.5 border-b border-border/60 font-mono text-xs">
    <span className="text-muted-foreground">{label}</span>
    <span>{value}</span>
  </div>
);

const ago = (t) => (t ? `${formatDistanceToNow(new Date(t))} ago` : "never");

// Live reachability and latency of every upstream the agent depends on.
export default function SystemHealth() {
  const { data, isFetching } = useQuery({
    queryKey: ["systemHealth"],
    refetchInterval: 30000,
    queryFn: async () => (await base44.functions.invoke("systemHealth", {}))?.data
  });

  const services = data?.services || [];
  const agent = data?.agent || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="font-mono text-base tracking-widest text-gold">SYSTEM HEALTH</h1>
        <span className="font-mono text-[10px] text-muted-foreground">
          {isFetching ? "probing…" : data?.checked_at ? `checked ${ago(data.checked_at)}` : ""}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {services.map((s) => (
          <div key={s.name} className="border border-border rounded-lg bg-card p-4 space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.name}</div>
            <div className={`font-mono text-sm ${s.ok ? "text-profit" : "text-loss"}`}>
              {s.ok ? "ONLINE" : "UNREACHABLE"}
            </div>
            <div className="font-mono text-xs text-gold">{s.latency_ms} ms</div>
            <div className="font-mono text-[10px] text-muted-foreground">
              {s.detail || s.error || `HTTP ${s.status}`}
            </div>
          </div>
        ))}
        {!services.length && (
          <div className="border border-border rounded-lg bg-card p-6 font-mono text-xs text-muted-foreground">
            Probing upstream services…
          </div>
        )}
      </div>

      <div className="border border-border rounded-lg bg-card p-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Agent</div>
        <Line
          label="Run status"
          value={
            <span className={agent.run_status === "RUNNING" ? "text-profit" : "text-gold"}>
              {agent.run_status || "—"}
              {agent.pause_reason ? ` · ${agent.pause_reason}` : ""}
            </span>
          }
        />
        <Line label="Mode" value={agent.mode || "—"} />
        <Line label="Open positions" value={agent.open_positions ?? "—"} />
        <Line label="Last market scan" value={ago(agent.last_scan_at)} />
        <Line label="Last position sync" value={ago(agent.last_sync_at)} />
        <Line label="Last signal recorded" value={ago(agent.last_signal_at)} />
        <Line label="Uptime since deploy" value={ago(agent.config_created_at)} />
      </div>
    </div>
  );
}