import React from "react";
import ThresholdForm from "./ThresholdForm";
import { useAgentConfig, useAgentControl } from "@/hooks/useAgent";

const LIVE_FIELDS = [
  ["live_max_position_usd", "Max live position $", "Hard ceiling per real order. Code caps this at $250 regardless."],
  ["live_max_orders_per_day", "Max live orders / day", "Real buys per UTC day. Exits are never capped."],
  ["live_max_slippage_percent", "Slippage abort %", "Entry abandoned if the re-quote before signing exceeds this."]
];

export default function LiveRailsForm() {
  const { data: config } = useAgentConfig();
  const { busy, send } = useAgentControl(["agentConfig", "liveWalletStatus"]);

  return (
    <div className="border border-border rounded-lg bg-card">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-mono text-xs uppercase tracking-widest text-gold">Live Rails</h2>
      </div>
      <div className="p-4">
        <ThresholdForm
          config={config}
          fields={LIVE_FIELDS}
          busy={busy}
          onSave={(patch) => send("Live rails saved", { action: "update_config", config: patch })}
          saveLabel="SAVE LIVE RAILS"
        />
      </div>
    </div>
  );
}