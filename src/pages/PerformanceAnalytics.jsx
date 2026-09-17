import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, startOfDay, startOfWeek } from "date-fns";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Metric = ({ label, value, tone }) => (
  <div className="border border-border rounded-lg bg-card p-4">
    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    <div className={`font-mono text-lg ${tone || "text-foreground"}`}>{value}</div>
  </div>
);

function bucket(closed, mode) {
  const map = new Map();
  for (const p of closed) {
    const at = new Date(p.closed_at || p.created_date);
    const key = format(mode === "weekly" ? startOfWeek(at) : startOfDay(at), "MMM d");
    const row = map.get(key) || { period: key, pnl: 0, wins: 0, losses: 0 };
    const net = Number(p.net_pnl_usd || 0);
    row.pnl += net;
    if (net > 0) row.wins += 1;
    else row.losses += 1;
    map.set(key, row);
  }
  return Array.from(map.values()).map((r) => ({ ...r, pnl: Number(r.pnl.toFixed(2)) }));
}

// Realized performance of closed positions, bucketed by day and by week.
export default function PerformanceAnalytics() {
  const { data: positions = [] } = useQuery({
    queryKey: ["positions"],
    refetchInterval: 20000,
    queryFn: () => base44.entities.Position.list("-created_date", 300)
  });

  const closed = positions.filter((p) => p.status === "CLOSED");
  const netPnl = closed.reduce((s, p) => s + Number(p.net_pnl_usd || 0), 0);
  const wins = closed.filter((p) => Number(p.net_pnl_usd || 0) > 0);
  const holds = closed
    .filter((p) => p.opened_at && p.closed_at)
    .map((p) => (new Date(p.closed_at) - new Date(p.opened_at)) / 60000);
  const avgHold = holds.length ? holds.reduce((a, b) => a + b, 0) / holds.length : 0;
  const best = closed.reduce((m, p) => Math.max(m, Number(p.net_pnl_percent || 0)), 0);
  const worst = closed.reduce((m, p) => Math.min(m, Number(p.net_pnl_percent || 0)), 0);

  const chart = (mode) => (
    <div className="border border-border rounded-lg bg-card p-4 h-72">
      {closed.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bucket(closed, mode)}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                fontFamily: "var(--font-mono)",
                fontSize: 11
              }}
            />
            <Bar dataKey="pnl" name="Net P&L $" fill="hsl(var(--gold))" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex items-center justify-center font-mono text-xs text-muted-foreground">
          No closed positions to chart yet.
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <h1 className="font-mono text-base tracking-widest text-gold">PERFORMANCE ANALYTICS</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric
          label="Realized P&L"
          value={`${netPnl >= 0 ? "+" : ""}$${netPnl.toFixed(2)}`}
          tone={netPnl >= 0 ? "text-profit" : "text-loss"}
        />
        <Metric
          label="Win rate"
          value={closed.length ? `${Math.round((wins.length / closed.length) * 100)}%` : "—"}
        />
        <Metric label="Trades closed" value={closed.length} />
        <Metric label="Avg hold" value={avgHold ? `${Math.round(avgHold)}m` : "—"} />
        <Metric
          label="Best / worst"
          value={`${best.toFixed(1)}% / ${worst.toFixed(1)}%`}
        />
      </div>
      <Tabs defaultValue="daily">
        <TabsList className="font-mono text-xs">
          <TabsTrigger value="daily">DAILY</TabsTrigger>
          <TabsTrigger value="weekly">WEEKLY</TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="mt-3">{chart("daily")}</TabsContent>
        <TabsContent value="weekly" className="mt-3">{chart("weekly")}</TabsContent>
      </Tabs>
    </div>
  );
}