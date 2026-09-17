import React, { useCallback, useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shell/PageHeader";

export default function Watchlist() {
  const [items, setItems] = useState([]);
  const [address, setAddress] = useState("");
  const [symbol, setSymbol] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setItems(await base44.entities.WatchlistItem.list("-created_date", 100));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!address.trim()) return;
    setSaving(true);
    await base44.entities.WatchlistItem.create({
      token_address: address.trim(),
      symbol: symbol.trim(),
      note: note.trim(),
      source: "manual",
    });
    setAddress("");
    setSymbol("");
    setNote("");
    await load();
    setSaving(false);
  };

  const remove = async (id) => {
    await base44.entities.WatchlistItem.delete(id);
    await load();
  };

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-6 md:px-6">
      <PageHeader
        title="Token Watchlist"
        subtitle="Tokens parked for deeper analysis. Pinning does not authorize trading — the gate pipeline still decides."
      />

      <section className="mb-5 rounded-[4px] border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Token mint address"
            className="rounded-[4px] border border-border bg-secondary px-2.5 py-2 font-display text-[0.75rem] sm:col-span-2"
          />
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Symbol"
            className="rounded-[4px] border border-border bg-secondary px-2.5 py-2 font-display text-[0.75rem]"
          />
          <button
            onClick={add}
            disabled={saving || !address.trim()}
            className="flex items-center justify-center gap-1.5 rounded-[4px] bg-primary px-3 py-2 font-display text-[0.75rem] font-700 text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> PIN TOKEN
          </button>
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why is this interesting?"
          className="mt-3 w-full rounded-[4px] border border-border bg-secondary px-2.5 py-2 font-display text-[0.75rem]"
        />
      </section>

      <section className="rounded-[4px] border border-border bg-card">
        {items.length === 0 ? (
          <p className="px-4 py-10 text-center font-display text-[0.75rem] text-muted-foreground">
            WATCHLIST EMPTY — PIN A TOKEN HERE OR FROM THE SCANNER
          </p>
        ) : (
          <div className="divide-y divide-border">
            {items.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="font-display text-[0.8125rem] font-600 text-foreground">
                  ${i.symbol || i.token_address.slice(0, 6)}
                </span>
                <span className="font-display text-[0.625rem] uppercase text-muted-foreground">{i.source}</span>
                {i.liquidity_usd ? (
                  <span className="num font-display text-[0.75rem] text-muted-foreground">
                    liq ${Math.round(i.liquidity_usd).toLocaleString()}
                  </span>
                ) : null}
                {i.structure_risk != null && (
                  <span className="num font-display text-[0.75rem] text-muted-foreground">risk {i.structure_risk}</span>
                )}
                <span className="min-w-0 flex-1 truncate text-[0.75rem] text-muted-foreground">{i.note}</span>
                <button onClick={() => remove(i.id)} className="text-muted-foreground transition hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}