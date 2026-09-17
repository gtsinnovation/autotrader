import React from "react";
import { Button } from "@/components/ui/button";
import ThresholdForm from "@/components/terminal/ThresholdForm";
import { useAgentConfig, useAgentControl } from "@/hooks/useAgent";
import { ShieldAlert } from "lucide-react";
import LiveExecutionPanel from "@/components/terminal/LiveExecutionPanel";

const FIELDS = [
  ["total_capital_usd", "Total capital $", "Maximum wallet exposure the agent may deploy."],
  ["max_position_usd", "Max per position $", "Size of a single entry."],
  ["max_open_positions", "Max open positions", "Concurrent exposure count."],
  ["max_loss_usd", "Loss limit $", "Realized loss that trips the kill switch."],
  ["max_consecutive_losses", "Max consecutive losses", "Losing streak that trips the kill switch."],
  ["max_top_holders_percent", "Max top holders %", "Supply concentration ceiling."],
  ["max_dev_balance_percent", "Max dev balance %", "Deployer holdings ceiling."],
  ["min_holders", "Min holders", "Concentration proxy floor."],
  ["min_liq_to_fdv_percent", "Min liquidity/FDV %", "Concentration proxy floor."]
];

export default function RiskSettings() {
  const { data: config } = useAgentConfig();
  const { busy, send } = useAgentControl();
  const running = config?.run_status === "RUNNING";
  const deployedCap = (config?.max_position_usd || 0) * (config?.max_open_positions || 0);

  return (
    <div className="space-y-4">
      <h1 className="font-mono text-base tracking-widest text-gold">RISK SETTINGS</h1>

      <div className="border border-border rounded-lg bg-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1 font-mono text-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className={`w-4 h-4 ${running ? "text-profit" : "text-loss"}`} />
            <span>{running ? "TRADING ENABLED" : config?.run_status?.replace("_", " ") || "OFFLINE"}</span>
          </div>
          <div className="text-muted-foreground">
            Worst-case deployed exposure at current limits: ${deployedCap.toLocaleString()}
            {config?.pause_reason ? ` · ${config.pause_reason}` : ""}
          </div>
        </div>
        {running ? (
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => send("Kill switch engaged", { action: "pause" })}
            className="font-mono text-xs"
          >
            EMERGENCY STOP
          </Button>
        ) : (
          <Button disabled={busy} onClick={() => send("Trading enabled", { action: "resume" })} className="font-mono text-xs">
            ENABLE TRADING
          </Button>
        )}
      </div>

      <div className="border border-border rounded-lg bg-card p-4">
        <ThresholdForm
          config={config}
          fields={FIELDS}
          busy={busy}
          onSave={(patch) => send("Risk limits saved", { action: "update_config", config: patch })}
          saveLabel="SAVE RISK LIMITS"
        />
      </div>

      <LiveExecutionPanel />
    </div>
  );
}