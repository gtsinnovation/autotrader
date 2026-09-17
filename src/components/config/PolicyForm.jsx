import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// Generic numeric policy editor. Every field maps 1:1 to an AgentConfig key the
// server already validates — no client-side enforcement is implied here.
export default function PolicyForm({ title, hint, fields, config, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => setForm(config || {}), [config]);

  const set = (k, v) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const patch = {};
      fields.forEach((f) => {
        if (typeof form[f.key] === "number") patch[f.key] = form[f.key];
      });
      await onSaved(patch);
      setSaved(true);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
    setSaving(false);
  };

  return (
    <section className="rounded-[4px] border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-[1.125rem] font-600 tracking-tight">{title}</h2>
        {hint && <p className="mt-1 text-[0.75rem] text-muted-foreground">{hint}</p>}
      </div>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="block font-display text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
              {f.label}
            </span>
            <input
              type="number"
              step="any"
              value={form[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value === "" ? "" : Number(e.target.value))}
              className="num mt-1 w-full rounded-[4px] border border-border bg-secondary px-2 py-1.5 font-display text-[0.8125rem] text-foreground focus:border-primary focus:outline-none"
            />
            {f.hint && <span className="mt-1 block text-[0.6875rem] text-muted-foreground">{f.hint}</span>}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3 px-4 pb-4">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-[4px] bg-primary px-4 py-1.5 font-display text-[0.75rem] font-700 text-primary-foreground disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} SAVE
        </button>
        {saved && <span className="font-display text-[0.75rem] text-profit">SAVED</span>}
        {error && <span className="font-display text-[0.75rem] text-destructive">{error}</span>}
      </div>
    </section>
  );
}