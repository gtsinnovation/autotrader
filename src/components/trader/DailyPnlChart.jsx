import React from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function DailyPnlChart({ data }) {
  const total = data.reduce((s, d) => s + d.pnl, 0);
  return (
    <div className="h-full rounded-[4px] border border-border bg-card p-4">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-[0.8125rem] font-700 tracking-wide text-primary">DAILY P&L · 14D</h2>
        <span className={`num font-display text-[0.9375rem] font-700 ${total >= 0 ? "text-profit" : "text-destructive"}`}>
          {total >= 0 ? "+" : "−"}${Math.abs(total).toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontFamily: "var(--font-mono)" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 4,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
              }}
              formatter={(v) => [`$${v}`, "Realized"]}
            />
            <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.pnl >= 0 ? "hsl(var(--profit))" : "hsl(var(--destructive))"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}