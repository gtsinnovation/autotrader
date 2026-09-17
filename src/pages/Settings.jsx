import React from "react";
import PageHeader from "@/components/shell/PageHeader";
import RunStateCard from "@/components/config/RunStateCard";
import PolicyForm from "@/components/config/PolicyForm";
import useAgentConfig from "@/hooks/useAgentConfig";

const FIELDS = [
  { key: "capital_cap_usd", label: "Capital cap ($)", hint: "Total USD the agent may have deployed at once." },
  { key: "max_position_usd", label: "Max position ($)", hint: "Per-entry ceiling." },
  { key: "max_open_positions", label: "Max open positions" },
  { key: "min_age_minutes", label: "Min pair age (min)" },
  { key: "max_age_hours", label: "Max pair age (hours)" },
];

export default function Settings() {
  const { config, reload, saveConfig } = useAgentConfig();

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6 md:px-6">
      <PageHeader
        title="Agent Settings"
        subtitle="Run state, capital caps and position limits. Every value is re-validated server-side on each entry."
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PolicyForm
            title="Capital & Position Limits"
            hint="The scanner refuses an entry that would breach any of these."
            fields={FIELDS}
            config={config}
            onSaved={saveConfig}
          />
        </div>
        <RunStateCard config={config} onChanged={reload} />
      </div>
    </main>
  );
}