import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const FIELDS = [
  { key: "capital_cap_usd", label: "Capital cap ($)" },
  { key: "max_position_usd", label: "Max position ($)" },
  { key: "max_open_positions", label: "Max open positions" },
  { key: "min_liquidity_usd", label: "Min liquidity ($)" },
  { key: "min_buyers_1h", label: "Min 1h buys" },
  { key: "max_structure_risk", label: "Max structure risk" },
  { key: "max_slippage_bps", label: "Max slippage (bps)" },
  { key: "atr_stop_multiple", label: "ATR stop multiple" },
  { key: "take_profit_multiple", label: "Take-profit R multiple" },
  { key: "trailing_stop_pct", label: "Trailing stop (%)" },
  { key: "partial_exit_pct", label: "Partial exit (%)" },
  { key: "min_age_minutes", label: "Min age (min)" },
];

export default function ControlPanel({ config, saving, error, onSave }) {
  const [form, setForm] = useState(config || {});
  useEffect(() => setForm(config || {}), [config]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <section className="rounded-[4px] border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-[1.25rem] font-600 tracking-tight">Risk Policy</h2>
        <p className="mt-1 text-[0.75rem] text-muted-foreground">
          Enforced server-side on every entry. Live mode is refused without MEV protection.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 py-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="block font-display text-[0.6875rem] uppercase tracking-wider text-muted-foreground">{f.label}</span>
            <input
              type="number"
              value={form[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value === "" ? "" : Number(e.target.value))}
              className="mt-1 w-full rounded-[4px] border border-border bg-secondary px-2 py-1.5 font-display text-[0.8125rem] num text-foreground focus:border-primary focus:outline-none"
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 px-4 pb-3">
        <label className="flex items-center gap-2 font-display text-[0.75rem]">
          <input
            type="checkbox"
            checked={!!form.mev_protection}
            onChange={(e) => set("mev_protection", e.target.checked)}
            className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
          />
          MEV PROTECTION
        </label>
        <label className="flex items-center gap-2 font-display text-[0.75rem]">
          <span className="text-muted-foreground">MODE</span>
          <select
            value={form.mode || "paper"}
            onChange={(e) => set("mode", e.target.value)}
            className="rounded-[4px] border border-border bg-secondary px-2 py-1 font-display text-[0.75rem]"
          >
            <option value="paper">paper</option>
            <option value="live">live</option>
          </select>
        </label>
        <button
          onClick={() => onSave(form)}
          disabled={saving}
          className="ml-auto flex items-center gap-1.5 rounded-[4px] bg-primary px-4 py-1.5 font-display text-[0.75rem] font-700 text-primary-foreground disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} SAVE POLICY
        </button>
      </div>
      {error && <p className="px-4 pb-3 font-display text-[0.75rem] text-destructive">{error}</p>}
    </section>
  );
}