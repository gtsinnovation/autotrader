import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import AgentHeader from "@/components/trader/AgentHeader";
import StatsRail from "@/components/trader/StatsRail";
import PositionsPanel from "@/components/trader/PositionsPanel";
import CandidatePanel from "@/components/trader/CandidatePanel";
import AuditPanel from "@/components/trader/AuditPanel";
import ControlPanel from "@/components/trader/ControlPanel";

export default function Terminal() {
  const [config, setConfig] = useState(null);
  const [positions, setPositions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closingId, setClosingId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [cfgs, pos, cands, audit] = await Promise.all([
      base44.entities.AgentConfig.list("-created_date", 1),
      base44.entities.Position.list("-created_date", 60),
      base44.entities.TokenCandidate.list("-created_date", 40),
      base44.entities.AuditLog.list("-created_date", 40),
    ]);
    setConfig(cfgs[0] || null);
    setPositions(pos);
    setCandidates(cands);
    setLogs(audit);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const runTick = async () => {
    setBusy(true);
    setError("");
    try {
      await base44.functions.invoke("scanMarket", {});
      await base44.functions.invoke("manageExits", {});
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
    setBusy(false);
  };

  const toggleKill = async () => {
    await base44.functions.invoke("agentControl", { action: "set_kill_switch", engaged: !config?.kill_switch });
    await load();
  };

  const savePolicy = async (form) => {
    setSaving(true);
    setError("");
    try {
      await base44.functions.invoke("agentControl", { action: "update_config", config: form });
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
    setSaving(false);
  };

  const closePosition = async (id) => {
    setClosingId(id);
    await base44.functions.invoke("agentControl", { action: "close_position", position_id: id });
    await load();
    setClosingId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <AgentHeader config={config} busy={busy} onRunNow={runTick} onToggleKill={toggleKill} />
      <main className="mx-auto max-w-[1500px] space-y-5 px-4 py-5 md:px-6">
        <StatsRail positions={positions} config={config} />
        {error && (
          <p className="rounded-[4px] border border-destructive/40 bg-destructive/10 px-4 py-2 font-display text-[0.75rem] text-destructive">
            {error}
          </p>
        )}
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <PositionsPanel positions={positions} onClose={closePosition} closingId={closingId} />
            <ControlPanel config={config} saving={saving} error={error} onSave={savePolicy} />
          </div>
          <div className="space-y-5">
            <CandidatePanel candidates={candidates} />
            <AuditPanel logs={logs} />
          </div>
        </div>
      </main>
    </div>
  );
}