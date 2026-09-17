import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Generic numeric-threshold editor. `fields` is [key, label, hint][].
export default function ThresholdForm({ config, fields, busy, onSave, saveLabel = "SAVE" }) {
  const [draft, setDraft] = useState({});
  const dirty = Object.keys(draft).length > 0;
  const value = (key) => (draft[key] !== undefined ? draft[key] : config?.[key] ?? "");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([key, label, hint]) => (
          <label key={key} className="block space-y-1">
            <span className="block font-mono text-[10px] uppercase tracking-widest text-gold">{label}</span>
            <Input
              type="number"
              value={value(key)}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              className="h-9 font-mono text-xs"
            />
            {hint && <span className="block font-mono text-[10px] text-muted-foreground">{hint}</span>}
          </label>
        ))}
      </div>
      <Button
        disabled={busy || !dirty}
        onClick={async () => {
          await onSave(draft);
          setDraft({});
        }}
        className="font-mono text-xs"
      >
        {dirty ? saveLabel : "NO CHANGES"}
      </Button>
    </div>
  );
}