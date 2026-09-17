import React from "react";
import { benchmark } from "@/data/analysis";

const Metric = ({ label, value, tone }) => (
  <div className="rounded-[4px] border border-border bg-card px-3 py-2">
    <p className="text-[0.75rem] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className={`font-display text-[1.125rem] font-700 num ${tone || "text-foreground"}`}>{value}</p>
  </div>
);

export default function HeroHeader() {
  return (
    <section className="relative overflow-hidden rounded-[4px] border border-border bg-card">
      <div className="absolute inset-0 grid-overlay opacity-40" />
      <div className="absolute inset-0 metric-glow" />
      <div className="relative px-5 py-7 md:px-8 md:py-10">
        <p className="font-display text-[0.75rem] tracking-[0.2em] text-primary">COMPARATIVE ANALYSIS · SOLANA</p>
        <h1 className="mt-3 max-w-[24ch] font-display font-700 uppercase leading-[1.05] tracking-tight" style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}>
          Solana Memecoin Agent Integration Roadmap
        </h1>
        <p className="mt-4 max-w-[70ch] text-[0.875rem] text-muted-foreground">
          Attached codebase ({benchmark.localFiles} modules, {benchmark.localLoc} LOC — LangGraph gates, Turnkey signer,
          paper-trading control group) benchmarked against GMGNAI/gmgn-skills ({benchmark.gmgnSkills} skills,{" "}
          {benchmark.dataDimensions} data dimensions). Your edge is governance and custody. Your gaps are discovery
          speed, wallet intelligence and exit durability.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Local Latency" value={benchmark.localLatency} tone="text-warning" />
          <Metric label="GMGN Latency" value={benchmark.gmgnLatency} tone="text-primary" />
          <Metric label="Win Rate Proj." value={benchmark.winRateDelta} tone="text-primary" />
          <Metric label="Open Gaps" value="10 / 14" tone="text-destructive" />
        </div>
      </div>
    </section>
  );
}