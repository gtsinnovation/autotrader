import React from "react";
import PageHeader from "@/components/shell/PageHeader";
import PolicyForm from "@/components/config/PolicyForm";
import StrategyPreview from "@/components/trader/StrategyPreview";
import useAgentConfig from "@/hooks/useAgentConfig";

const FIELDS = [
  { key: "atr_stop_multiple", label: "ATR stop multiple", hint: "Stop distance = ATR proxy × this." },
  { key: "take_profit_multiple", label: "Take-profit R multiple", hint: "Target = entry + R × this." },
  { key: "partial_exit_pct", label: "Partial exit (%)", hint: "Portion sold when the target prints." },
  { key: "trailing_stop_pct", label: "Trailing stop (%)", hint: "Trail off peak once the partial fires." },
  { key: "min_age_minutes", label: "Entry timing — min age (min)" },
  { key: "max_age_hours", label: "Entry timing — max age (hours)" },
];

export default function StrategyEditor() {
  const { config, saveConfig } = useAgentConfig();

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6 md:px-6">
      <PageHeader
        title="Strategy Editor"
        subtitle="Exit geometry and entry timing. Stops are ATR-scaled, so the same settings behave differently per token volatility."
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PolicyForm
            title="Exit & Timing Logic"
            hint="The exit manager applies these on every tick to all open positions."
            fields={FIELDS}
            config={config}
            onSaved={saveConfig}
          />
        </div>
        <StrategyPreview config={config} />
      </div>
    </main>
  );
}