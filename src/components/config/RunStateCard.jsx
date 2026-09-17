import React, { useState } from "react";
import { Power, ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function RunStateCard({ config, onChanged }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const killed = !!config?.kill_switch;

  const run = async (label, payload) => {
    setBusy(label);
    setError("");
    try {
      await base44.functions.invoke("agentControl", payload);
      await onChanged();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
    setBusy("");
  };

  return (
    <section className="rounded-[4px] border border-border bg-card p-4">
      <h2 className="text-[1.125rem] font-600 tracking-tight">Run State</h2>
      <div className="mt-4 space-y-3">
        <button
          onClick={() => run("kill", { action: "set_kill_switch", engaged: !killed })}
          disabled={busy === "kill"}
          className={`flex w-full items-center justify-center gap-2 rounded-[4px] border px-4 py-2.5 font-display text-[0.8125rem] font-700 transition ${
            killed
              ? "border-profit/40 bg-profit/10 text-profit hover:bg-profit/20"
              : "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
          }`}
        >
          {busy === "kill" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
          {killed ? "RELEASE KILL SWITCH" : "ENGAGE KILL SWITCH"}
        </button>

        <div className="flex items-center justify-between font-display text-[0.75rem]">
          <span className="text-muted-foreground">MODE</span>
          <select
            value={config?.mode || "paper"}
            onChange={(e) => run("mode", { action: "update_config", config: { mode: e.target.value } })}
            className="rounded-[4px] border border-border bg-secondary px-2 py-1 font-display text-[0.75rem]"
          >
            <option value="paper">paper</option>
            <option value="live">live</option>
          </select>
        </div>

        <button
          onClick={() => run("mev", { action: "update_config", config: { mev_protection: !config?.mev_protection } })}
          disabled={busy === "mev"}
          className="flex w-full items-center justify-between rounded-[4px] border border-border px-3 py-2 font-display text-[0.75rem]"
        >
          <span className="text-muted-foreground">MEV PROTECTION</span>
          {config?.mev_protection ? (
            <span className="flex items-center gap-1 text-profit"><ShieldCheck className="h-3.5 w-3.5" /> ON</span>
          ) : (
            <span className="flex items-center gap-1 text-destructive"><ShieldOff className="h-3.5 w-3.5" /> OFF</span>
          )}
        </button>
        <p className="text-[0.6875rem] text-muted-foreground">
          Live mode is refused server-side while MEV protection is off.
        </p>
        {error && <p className="font-display text-[0.75rem] text-destructive">{error}</p>}
      </div>
    </section>
  );
}