import React from "react";
import ThresholdForm from "@/components/terminal/ThresholdForm";
import { useAgentConfig, useAgentControl } from "@/hooks/useAgent";

const EXIT_FIELDS = [
  ["take_profit_percent", "Take profit %", "Position closes when price gains this much."],
  ["stop_loss_percent", "Stop loss %", "Hard exit below entry."],
  ["trailing_stop_percent", "Trailing stop %", "Exit when price falls this far from its peak."]
];

const ENTRY_FIELDS = [
  ["min_liquidity_usd", "Min liquidity $", "Pool depth floor."],
  ["min_traders_h1", "Min traders 1h", "Distinct traders in the last hour."],
  ["max_avg_trade_usd", "Max avg trade $", "Caps whale-driven fake volume."],
  ["min_organic_volume_percent", "Min organic volume %", "Non-bot share of volume."],
  ["max_price_impact_percent", "Max slippage %", "Measured impact for one position."],
  ["min_momentum_h1_percent", "Min 1h momentum %", "Lower band of the trend filter."],
  ["max_momentum_h1_percent", "Max 1h momentum %", "Rejects already-vertical charts."],
  ["min_pair_age_minutes", "Min pair age (min)", "Avoids unpriced launches."],
  ["max_pair_age_hours", "Max pair age (h)", "Upper age bound."]
];

export default function StrategyEditor() {
  const { data: config } = useAgentConfig();
  const { busy, send } = useAgentControl();
  const save = (patch) => send("Strategy saved", { action: "update_config", config: patch });

  return (
    <div className="space-y-4">
      <h1 className="font-mono text-base tracking-widest text-gold">STRATEGY EDITOR</h1>

      <section className="border border-border rounded-lg bg-card p-4 space-y-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-profit">Exit rules</h2>
        <ThresholdForm config={config} fields={EXIT_FIELDS} busy={busy} onSave={save} saveLabel="SAVE EXIT RULES" />
      </section>

      <section className="border border-border rounded-lg bg-card p-4 space-y-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-profit">Entry gates</h2>
        <ThresholdForm config={config} fields={ENTRY_FIELDS} busy={busy} onSave={save} saveLabel="SAVE ENTRY GATES" />
      </section>
    </div>
  );
}