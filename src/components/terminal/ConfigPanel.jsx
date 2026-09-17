import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FIELDS = [
  ["total_capital_usd", "Capital $"],
  ["max_position_usd", "Per trade $"],
  ["max_open_positions", "Max open"],
  ["min_liquidity_usd", "Min liquidity $"],
  ["min_traders_h1", "Min traders 1h"],
  ["max_top_holders_percent", "Max top holders %"],
  ["min_organic_volume_percent", "Min organic %"],
  ["max_price_impact_percent", "Max slippage %"],
  ["min_pair_age_minutes", "Min age (min)"],
  ["max_pair_age_hours", "Max age (h)"],
  ["min_momentum_h1_percent", "Min 1h momentum %"],
  ["max_momentum_h1_percent", "Max 1h momentum %"],
  ["take_profit_percent", "Take profit %"],
  ["stop_loss_percent", "Stop loss %"],
  ["trailing_stop_percent", "Trailing stop %"],
  ["max_loss_usd", "Kill switch loss $"]
];

export default function ConfigPanel({ config, busy, onSave }) {
  const [draft, setDraft] = useState({});
  const value = (key) => (draft[key] !== undefined ? draft[key] : config?.[key] ?? "");
  const dirty = Object.keys(draft).length > 0;

  return (
    <div className="space-y-3 p-3">
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map(([key, label]) => (
          <label key={key} className="block space-y-1">
            <span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
            <Input
              type="number"
              value={value(key)}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              className="h-8 font-mono text-xs"
            />
          </label>
        ))}
      </div>
      <Button
        size="sm"
        disabled={busy || !dirty}
        onClick={async () => {
          await onSave(draft);
          setDraft({});
        }}
        className="w-full font-mono text-xs"
      >
        {dirty ? "APPLY THRESHOLDS" : "NO CHANGES"}
      </Button>
    </div>
  );
}