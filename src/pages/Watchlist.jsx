import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Pin, RefreshCw, Trash2 } from "lucide-react";

// Manually pinned mints the operator wants tracked closely.
export default function Watchlist() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: rows = [] } = useQuery({
    queryKey: ["watchlist"],
    refetchInterval: 30000,
    queryFn: () => base44.entities.Watchlist.list("-pinned", 100)
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["watchlist"] });

  const add = async () => {
    const mint = address.trim();
    if (mint.length < 32) {
      toast({ title: "Invalid address", description: "Enter a full Solana mint address.", variant: "destructive" });
      return;
    }
    setBusy(true);
    await base44.entities.Watchlist.create({ token_address: mint, note: note.trim(), active: true });
    await base44.functions.invoke("watchlistSync", {});
    setAddress("");
    setNote("");
    await refresh();
    setBusy(false);
  };

  const sync = async () => {
    setBusy(true);
    await base44.functions.invoke("watchlistSync", {});
    await refresh();
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-mono text-base tracking-widest text-gold">TOKEN WATCHLIST</h1>
        <Button size="sm" variant="outline" disabled={busy} onClick={sync} className="font-mono text-xs">
          <RefreshCw className={`w-3 h-3 mr-1 ${busy ? "animate-spin" : ""}`} /> REFRESH PRICES
        </Button>
      </div>

      <div className="border border-border rounded-lg bg-card p-3 flex flex-wrap gap-2">
        <Input
          placeholder="Token mint address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="h-9 flex-1 min-w-[260px] font-mono text-xs"
        />
        <Input
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="h-9 w-48 font-mono text-xs"
        />
        <Button size="sm" disabled={busy} onClick={add} className="h-9 font-mono text-xs">
          ADD
        </Button>
      </div>

      <div className="border border-border rounded-lg bg-card divide-y divide-border">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-2 font-mono text-xs">
            <button
              onClick={async () => {
                await base44.entities.Watchlist.update(r.id, { pinned: !r.pinned });
                refresh();
              }}
              title={r.pinned ? "Unpin" : "Pin"}
            >
              <Pin className={`w-3.5 h-3.5 ${r.pinned ? "text-gold" : "text-muted-foreground"}`} />
            </button>
            <span className="w-20">{r.symbol || "—"}</span>
            <span className="flex-1 min-w-[180px] truncate text-muted-foreground">{r.token_address}</span>
            <span className="w-24 text-right">
              {r.last_price_usd ? `$${Number(r.last_price_usd).toPrecision(4)}` : "—"}
            </span>
            <span className="w-28 text-right text-muted-foreground">
              {r.last_liquidity_usd ? `$${Math.round(r.last_liquidity_usd).toLocaleString()} liq` : "—"}
            </span>
            <span className="w-40 truncate text-muted-foreground">{r.note}</span>
            <button
              onClick={async () => {
                await base44.entities.Watchlist.delete(r.id);
                refresh();
              }}
              title="Remove"
            >
              <Trash2 className="w-3.5 h-3.5 text-loss" />
            </button>
          </div>
        ))}
        {!rows.length && (
          <div className="p-6 text-center font-mono text-xs text-muted-foreground">
            Watchlist is empty — paste a mint address above.
          </div>
        )}
      </div>
    </div>
  );
}