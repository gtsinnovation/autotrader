import React, { useCallback, useEffect, useState } from "react";
import { Power, XOctagon, Play, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shell/PageHeader";

export default function QuickActions() {
  const [config, setConfig] = useState(null);
  const [open, setOpen] = useState([]);
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const [cfgs, pos] = await Promise.all([
      base44.entities.AgentConfig.list("-created_date", 1),
      base44.entities.Position.filter({ status: "open" }),
    ]);
    setConfig(cfgs[0] || null);
    setOpen(pos);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const killed = !!config?.kill_switch;

  const toggleKill = async () => {
    setBusy("kill");
    await base44.functions.invoke("agentControl", { action: "set_kill_switch", engaged: !killed });
    setStatus(killed ? "Kill switch released — entries permitted again." : "Kill switch engaged — no new entries.");
    await load();
    setBusy("");
  };

  const flatten = async () => {
    setBusy("flatten");
    let closed = 0;
    for (const p of open) {
      await base44.functions.invoke("agentControl", { action: "close_position", position_id: p.id });
      closed += 1;
    }
    setStatus(`Flattened ${closed} position${closed === 1 ? "" : "s"} at current market price.`);
    await load();
    setBusy("");
  };

  const forceTick = async () => {
    setBusy("tick");
    await base44.functions.invoke("scanMarket", {});
    await base44.functions.invoke("manageExits", {});
    setStatus("Forced one full agent tick: scan then exit management.");
    await load();
    setBusy("");
  };

  const buttons = [
    {
      id: "kill",
      label: killed ? "RELEASE KILL SWITCH" : "KILL SWITCH",
      sub: killed ? "Entries are currently halted" : "Halt all new entries immediately",
      icon: Power,
      onClick: toggleKill,
      tone: killed
        ? "border-profit/40 bg-profit/10 text-profit hover:bg-profit/20"
        : "border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20",
    },
    {
      id: "flatten",
      label: "FLATTEN ALL POSITIONS",
      sub: `${open.length} open position${open.length === 1 ? "" : "s"} — closes each at market`,
      icon: XOctagon,
      onClick: flatten,
      tone: "border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20",
    },
    {
      id: "tick",
      label: "FORCE AGENT TICK",
      sub: "Run discovery, gating and exit management now",
      icon: Play,
      onClick: forceTick,
      tone: "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
    },
  ];

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-6 md:px-6">
      <PageHeader
        title="Quick Actions"
        subtitle="Manual intervention. The kill switch is what pauses scanning from opening anything — it takes effect on the next tick and on every direct entry attempt."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {buttons.map((b) => (
          <button
            key={b.id}
            onClick={b.onClick}
            disabled={!!busy || (b.id === "flatten" && open.length === 0)}
            className={`flex flex-col items-start gap-2 rounded-[4px] border p-5 text-left transition disabled:opacity-40 ${b.tone}`}
          >
            <span className="flex items-center gap-2 font-display text-[0.9375rem] font-700">
              {busy === b.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <b.icon className="h-5 w-5" />}
              {b.label}
            </span>
            <span className="text-[0.75rem] text-muted-foreground">{b.sub}</span>
          </button>
        ))}
      </div>
      {status && (
        <p className="mt-5 rounded-[4px] border border-border bg-card px-4 py-3 font-display text-[0.75rem] text-foreground">
          {status}
        </p>
      )}
    </main>
  );
}