import React from "react";
import { Button } from "@/components/ui/button";

const pnlTone = (v) => (v >= 0 ? "text-profit" : "text-loss");

export default function PositionsTable({ positions, busy, onClose }) {
  if (!positions.length) {
    return <div className="p-6 text-center font-mono text-xs text-muted-foreground">No positions yet.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-xs">
        <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
          <tr className="border-b border-border">
            <th className="text-left px-3 py-2">Token</th>
            <th className="text-right px-3 py-2">Size</th>
            <th className="text-right px-3 py-2">Entry</th>
            <th className="text-right px-3 py-2">Last</th>
            <th className="text-right px-3 py-2">Net P&L</th>
            <th className="text-left px-3 py-2">State</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => {
            const live =
              p.status === "OPEN" && p.entry_price
                ? ((Number(p.last_price || p.entry_price) - p.entry_price) / p.entry_price) * 100
                : Number(p.net_pnl_percent || 0);
            return (
              <tr key={p.id} className="border-b border-border/60">
                <td className="px-3 py-2">{p.symbol || p.token_address.slice(0, 6)}</td>
                <td className="px-3 py-2 text-right">${Number(p.size_usd || 0).toFixed(0)}</td>
                <td className="px-3 py-2 text-right">{Number(p.entry_price || 0).toPrecision(4)}</td>
                <td className="px-3 py-2 text-right">{Number(p.last_price || p.entry_price || 0).toPrecision(4)}</td>
                <td className={`px-3 py-2 text-right ${pnlTone(live)}`}>
                  {live >= 0 ? "+" : ""}
                  {live.toFixed(2)}%
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {p.status === "OPEN" ? "OPEN" : p.exit_reason || "CLOSED"}
                </td>
                <td className="px-3 py-2 text-right">
                  {p.status === "OPEN" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => onClose(p.id)}
                      className="h-6 font-mono text-[10px] text-loss hover:text-loss/80"
                    >
                      CLOSE
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}