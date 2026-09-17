import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Play, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shell/PageHeader";
import CandidatePanel from "@/components/trader/CandidatePanel";

export default function MarketScanner() {
  const [candidates, setCandidates] = useState([]);
  const [busy, setBusy] = useState(false);
  const [pinning, setPinning] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setCandidates(await base44.entities.TokenCandidate.list("-created_date", 60));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const scan = async () => {
    setBusy(true);
    setError("");
    try {
      await base44.functions.invoke("scanMarket", {});
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
    setBusy(false);
  };

  const pin = async (c) => {
    setPinning(c.id);
    await base44.entities.WatchlistItem.create({
      token_address: c.token_address,
      symbol: c.symbol,
      source: "manual",
      liquidity_usd: c.liquidity_usd,
      conviction: c.conviction,
      structure_risk: c.structure_risk,
      note: `Pinned from scanner — ${c.decision}`,
    });
    setPinning("");
  };

  const approved = candidates.filter((c) => c.decision === "approved");

  return (
    <main className="mx-auto max-w-[1300px] px-4 py-6 md:px-6">
      <PageHeader
        title="Market Scanner"
        subtitle={`${candidates.length} evaluated · ${approved.length} approved. Liquidity, turnover and participation are measured from live pair data.`}
      >
        <button
          onClick={scan}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-[4px] bg-primary px-4 py-2 font-display text-[0.75rem] font-700 text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} RUN SCAN
        </button>
      </PageHeader>

      {error && (
        <p className="mb-4 rounded-[4px] border border-destructive/40 bg-destructive/10 px-4 py-2 font-display text-[0.75rem] text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <CandidatePanel candidates={candidates} />
        <section className="rounded-[4px] border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-display text-[0.8125rem] font-700 tracking-wide text-primary">DISCOVERED TOKENS</h2>
            <p className="mt-1 text-[0.75rem] text-muted-foreground">
              Smart-money inflow per wallet is not shown — no wallet-level source is connected. Liquidity and 1h flow
              below are measured.
            </p>
          </div>
          <div className="max-h-[520px] divide-y divide-border overflow-y-auto">
            {candidates.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 font-display text-[0.75rem]">
                <span className="font-600 text-foreground">${c.symbol || c.token_address.slice(0, 6)}</span>
                <span className="num text-muted-foreground">
                  liq ${Math.round(Number(c.liquidity_usd || 0)).toLocaleString()}
                </span>
                <span className="num text-muted-foreground">
                  {c.buys_1h || 0}b / {c.sells_1h || 0}s
                </span>
                <span className={`num ml-auto ${c.decision === "approved" ? "text-profit" : "text-muted-foreground"}`}>
                  conv {c.conviction ?? "—"}
                </span>
                <button
                  onClick={() => pin(c)}
                  disabled={pinning === c.id}
                  className="flex items-center gap-1 rounded-[3px] border border-border px-2 py-1 text-[0.6875rem] text-muted-foreground transition hover:text-primary disabled:opacity-50"
                >
                  <Star className="h-3 w-3" /> PIN
                </button>
              </div>
            ))}
            {candidates.length === 0 && (
              <p className="px-4 py-8 text-center text-[0.75rem] text-muted-foreground">NO CANDIDATES YET</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}