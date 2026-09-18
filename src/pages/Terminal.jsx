import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import AgentBar from "@/components/terminal/AgentBar";
import PositionsTable from "@/components/terminal/PositionsTable";
import SignalFeed from "@/components/terminal/SignalFeed";
import ConfigPanel from "@/components/terminal/ConfigPanel";
import Section from "@/components/terminal/Section";

export default function Terminal() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["terminal"],
    refetchInterval: 15000,
    queryFn: async () => {
      const [configs, positions, signals] = await Promise.all([
        base44.entities.AgentConfig.list("-created_date", 1),
        base44.entities.Position.list("-created_date", 100),
        base44.entities.Signal.list("-created_date", 60)
      ]);
      return { config: configs[0] || null, positions, signals };
    }
  });

  const config = data?.config;
  const positions = data?.positions || [];
  const signals = data?.signals || [];
  const closed = positions.filter((p) => p.status === "CLOSED");
  const stats = {
    open: positions.filter((p) => p.status === "OPEN").length,
    closed: closed.length,
    netPnlUsd: closed.reduce((s, p) => s + Number(p.net_pnl_usd || 0), 0),
    winRate: closed.length
      ? Math.round((closed.filter((p) => Number(p.net_pnl_usd || 0) > 0).length / closed.length) * 100)
      : 0
  };

  const run = async (label, fn) => {
    setBusy(true);
    try {
      const res = await fn();
      const payload = res?.data || {};
      if (payload.error) toast({ title: label, description: payload.error, variant: "destructive" });
      else toast({ title: label, description: JSON.stringify(payload) });
      await qc.invalidateQueries({ queryKey: ["terminal"] });
    } catch (err) {
      toast({ title: label, description: err.message, variant: "destructive" });
    }
    setBusy(false);
  };

  const control = (body) => base44.functions.invoke("agentControl", body);

  return (
    <div className="space-y-5">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h1 className="font-mono text-lg font-bold tracking-widest">
          <span className="text-gold">AUTO</span>
          <span className="text-profit">TRADER</span>
        </h1>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          live terminal · read-only data · guarded execution
        </span>
      </div>

      <AgentBar
        config={config}
        stats={stats}
        busy={busy}
        onResume={() => run("Agent started", () => control({ action: "resume" }))}
        onPause={() => run("Agent paused", () => control({ action: "pause" }))}
        onScan={() => run("Scan complete", () => base44.functions.invoke("scanMarket", {}))}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Section title="Signal Feed" flush>
          <SignalFeed signals={signals} />
        </Section>
        <Section title="Positions" flush>
          <PositionsTable
            positions={positions}
            busy={busy}
            onClose={(id) => run("Position closed", () => control({ action: "close_position", position_id: id }))}
          />
        </Section>
      </div>

      <Section title="Strategy Thresholds" flush>
        <ConfigPanel
          config={config}
          busy={busy}
          onSave={(patch) => run("Thresholds updated", () => control({ action: "update_config", config: patch }))}
        />
      </Section>
    </div>
  );
}