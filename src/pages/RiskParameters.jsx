import React from "react";
import PageHeader from "@/components/shell/PageHeader";
import PolicyForm from "@/components/config/PolicyForm";
import useAgentConfig from "@/hooks/useAgentConfig";

const FIELDS = [
  { key: "min_liquidity_usd", label: "Min liquidity ($)", hint: "Venue depth floor — gate A." },
  { key: "min_buyers_1h", label: "Min 1h buys", hint: "Participation floor — gate C." },
  {
    key: "min_capital_per_participant_usd",
    label: "Min capital per participant ($)",
    hint: "Bot-farm filter. Fails closed when participation data is missing.",
  },
  { key: "max_structure_risk", label: "Max structure risk (0-100)", hint: "Weighted manipulation score — gate F." },
  { key: "max_slippage_bps", label: "Max slippage (bps)", hint: "Order-size aware ceiling — gate G." },
];

export default function RiskParameters() {
  const { config, saveConfig } = useAgentConfig();

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-6 md:px-6">
      <PageHeader
        title="Risk Parameters"
        subtitle="Global thresholds the gate pipeline enforces before any entry. Unmeasured data never satisfies a threshold."
      />
      <PolicyForm
        title="Exposure & Tolerance"
        hint="These are hard refusals, not preferences — a candidate missing the data for a check is rejected."
        fields={FIELDS}
        config={config}
        onSaved={saveConfig}
      />
      <p className="mt-4 rounded-[4px] border border-border bg-card px-4 py-3 text-[0.75rem] text-muted-foreground">
        Max daily drawdown is not listed because nothing measures a daily equity curve yet — adding it as a slider
        without an enforcing check would show a limit that does not exist.
      </p>
    </main>
  );
}