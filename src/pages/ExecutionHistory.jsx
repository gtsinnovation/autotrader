import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const fmt = (t) => (t ? new Date(t).toLocaleString() : "—");

// Every completed buy/sell leg with its entry conviction and exit reason.
export default function ExecutionHistory() {
  const { data: positions = [] } = useQuery({
    queryKey: ["positions"],
    refetchInterval: 20000,
    queryFn: () => base44.entities.Position.list("-created_date", 200)
  });

  const closed = positions.filter((p) => p.status === "CLOSED");

  return (
    <div className="space-y-4">
      <h1 className="font-mono text-base tracking-widest text-gold">EXECUTION HISTORY</h1>
      <div className="border border-border rounded-lg bg-card overflow-x-auto">
        <table className="w-full font-mono text-xs">
          <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2">Token</th>
              <th className="text-right px-3 py-2">Size</th>
              <th className="text-left px-3 py-2">Buy</th>
              <th className="text-left px-3 py-2">Sell</th>
              <th className="text-right px-3 py-2">Gross</th>
              <th className="text-right px-3 py-2">Cost</th>
              <th className="text-right px-3 py-2">Net</th>
              <th className="text-left px-3 py-2">Exit reason</th>
            </tr>
          </thead>
          <tbody>
            {closed.map((p) => {
              const net = Number(p.net_pnl_percent || 0);
              return (
                <tr key={p.id} className="border-b border-border/60">
                  <td className="px-3 py-2">{p.symbol || p.token_address.slice(0, 8)}</td>
                  <td className="px-3 py-2 text-right">${Number(p.size_usd || 0).toFixed(0)}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {Number(p.entry_price || 0).toPrecision(4)} · {fmt(p.opened_at)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {Number(p.exit_price || 0).toPrecision(4)} · {fmt(p.closed_at)}
                  </td>
                  <td className="px-3 py-2 text-right">{Number(p.gross_pnl_percent || 0).toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {Number(p.cost_percent || 0).toFixed(2)}%
                  </td>
                  <td className={`px-3 py-2 text-right ${net >= 0 ? "text-profit" : "text-loss"}`}>
                    {net >= 0 ? "+" : ""}
                    {net.toFixed(2)}% (${Number(p.net_pnl_usd || 0).toFixed(2)})
                  </td>
                  <td className="px-3 py-2 text-gold">{p.exit_reason || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!closed.length && (
          <div className="p-6 text-center font-mono text-xs text-muted-foreground">
            No completed trades yet — closed positions land here with their exit reason.
          </div>
        )}
      </div>
    </div>
  );
}