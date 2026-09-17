import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const Row = ({ label, value }) => (
  <div className="flex justify-between gap-4 py-1 border-b border-border/60">
    <span className="text-muted-foreground">{label}</span>
    <span>{value}</span>
  </div>
);

// Full pass/fail history of every gate check for one scanned token.
export default function SignalInspector() {
  const [selectedId, setSelectedId] = useState(null);
  const { data: signals = [] } = useQuery({
    queryKey: ["signals"],
    refetchInterval: 20000,
    queryFn: () => base44.entities.Signal.list("-created_date", 150)
  });

  const selected = signals.find((s) => s.id === selectedId) || signals[0] || null;
  const tokenScans = selected ? signals.filter((s) => s.token_address === selected.token_address) : [];

  return (
    <div className="space-y-4">
      <h1 className="font-mono text-base tracking-widest text-gold">SIGNAL INSPECTOR</h1>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="border border-border rounded-lg bg-card max-h-[70vh] overflow-y-auto divide-y divide-border">
          {signals.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`w-full text-left px-3 py-2 font-mono text-xs ${
                selected?.id === s.id ? "bg-secondary text-gold" : "hover:bg-secondary/60"
              }`}
            >
              <div className="flex justify-between">
                <span>{s.symbol || s.token_address.slice(0, 8)}</span>
                <span className={s.verdict === "APPROVED" ? "text-profit" : "text-muted-foreground"}>{s.score ?? 0}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">{new Date(s.created_date).toLocaleString()}</div>
            </button>
          ))}
          {!signals.length && (
            <div className="p-6 text-center font-mono text-xs text-muted-foreground">No scans recorded yet.</div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selected ? (
            <>
              <div className="border border-border rounded-lg bg-card p-4 font-mono text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gold">{selected.symbol || selected.token_address.slice(0, 10)}</span>
                  <span className={selected.verdict === "APPROVED" ? "text-profit" : "text-loss"}>{selected.verdict}</span>
                </div>
                <div className="text-[10px] break-all text-muted-foreground">{selected.token_address}</div>
                <Row label="Score" value={selected.score ?? 0} />
                <Row label="Price" value={`$${Number(selected.price_usd || 0).toPrecision(5)}`} />
                <Row label="Liquidity" value={`$${Math.round(selected.liquidity_usd || 0).toLocaleString()}`} />
                <Row label="1h volume" value={`$${Math.round(selected.volume_h1_usd || 0).toLocaleString()}`} />
                <Row label="Traders 1h" value={selected.traders_h1 ?? "—"} />
                <Row label="Holders" value={(selected.holder_count || 0).toLocaleString()} />
                <Row label="Organic volume" value={`${Number(selected.organic_volume_share || 0).toFixed(2)}%`} />
                <Row label="Pair age" value={selected.pair_age_minutes ? `${selected.pair_age_minutes}m` : "—"} />
                <Row
                  label="Measured slippage"
                  value={
                    selected.price_impact_measured
                      ? `${Number(selected.price_impact_percent).toFixed(2)}%`
                      : "not measured"
                  }
                />
                <Row label="Outcome" value={selected.opened_position ? "position opened" : selected.skip_reason || "no entry"} />
              </div>

              <div className="border border-border rounded-lg bg-card divide-y divide-border font-mono text-xs">
                {(selected.gates || []).map((g, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 px-3 py-2">
                    <span className={g.passed ? "text-profit" : "text-loss"}>{g.passed ? "PASS" : "VETO"}</span>
                    <span className="text-gold w-36">{g.name}</span>
                    <span className="flex-1 text-right text-muted-foreground">
                      {g.detail}
                      {!g.measured && g.passed ? " (proxy)" : ""}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border border-border rounded-lg bg-card p-3 font-mono text-xs">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  Scan history for this token
                </div>
                {tokenScans.map((s) => (
                  <div key={s.id} className="flex justify-between border-b border-border/60 py-1">
                    <span className="text-muted-foreground">{new Date(s.created_date).toLocaleString()}</span>
                    <span className={s.verdict === "APPROVED" ? "text-profit" : "text-loss"}>
                      {s.verdict}{s.rejected_by ? ` · ${s.rejected_by}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="border border-border rounded-lg bg-card p-6 text-center font-mono text-xs text-muted-foreground">
              Run a scan to inspect gate history.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}