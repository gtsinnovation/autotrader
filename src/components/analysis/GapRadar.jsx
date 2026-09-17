import React from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend } from "recharts";
import { radar } from "@/data/analysis";

export default function GapRadar() {
  return (
    <section className="rounded-[4px] border border-border bg-card metric-glow">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-[1.25rem] font-600 tracking-tight">Capability Gap Radar</h2>
      </div>
      <div className="h-[280px] px-2 py-3">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radar} outerRadius="70%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontFamily: "var(--font-display)" }}
            />
            <Radar name="Local" dataKey="local" stroke="hsl(var(--chart-4))" fill="hsl(var(--chart-4))" fillOpacity={0.25} />
            <Radar name="GMGN" dataKey="gmgn" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.18} />
            <Legend
              wrapperStyle={{ fontFamily: "var(--font-display)", fontSize: 11, color: "hsl(var(--muted-foreground))" }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}