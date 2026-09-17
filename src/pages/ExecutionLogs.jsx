import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";

// Every gate event the agent produced, flattened one row per gate check.
export default function ExecutionLogs() {
  const [filter, setFilter] = useState("");
  const { data: signals = [] } = useQuery({
    queryKey: ["signals"],
    refetchInterval: 20000,
    queryFn: () => base44.entities.Signal.list("-created_date", 150)
  });

  const rows = signals.flatMap((s) =>
    (s.gates || []).map((g, i) => ({
      key: `${s.id}-${i}`,
      time: s.created_date,
      symbol: s.symbol || s.token_address.slice(0, 8),
      verdict: s.verdict,
      gate: g.name,
      passed: g.passed,
      measured: g.measured,
      detail: g.detail
    }))
  );

  const q = filter.trim().toUpperCase();
  const visible = q ? rows.filter((r) => r.symbol.toUpperCase().includes(q) || r.gate.includes(q)) : rows;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-mono text-base tracking-widest text-gold">EXECUTION LOGS</h1>
        <Input
          placeholder="Filter by token or gate…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-8 w-64 font-mono text-xs"
        />
      </div>
      <div className="border border-border rounded-lg bg-card overflow-x-auto">
        <table className="w-full font-mono text-xs">
          <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2">Time</th>
              <th className="text-left px-3 py-2">Token</th>
              <th className="text-left px-3 py-2">Gate</th>
              <th className="text-left px-3 py-2">Result</th>
              <th className="text-left px-3 py-2">Measurement</th>
            </tr>
          </thead>
          <tbody>
            {visible.slice(0, 400).map((r) => (
              <tr key={r.key} className="border-b border-border/60">
                <td className="px-3 py-2 text-muted-foreground">{new Date(r.time).toLocaleTimeString()}</td>
                <td className="px-3 py-2">{r.symbol}</td>
                <td className="px-3 py-2 text-gold">{r.gate}</td>
                <td className={`px-3 py-2 ${r.passed ? "text-profit" : "text-loss"}`}>
                  {r.passed ? (r.measured ? "PASS" : "PASS (proxy)") : "VETO"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <div className="p-6 text-center font-mono text-xs text-muted-foreground">No gate events recorded yet.</div>
        )}
      </div>
    </div>
  );
}