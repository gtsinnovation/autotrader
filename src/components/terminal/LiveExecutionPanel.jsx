import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import LiveRailsForm from "./LiveRailsForm";

function Row({ label, value, tone }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`font-mono text-xs ${tone || "text-foreground"}`}>{value}</span>
    </div>
  );
}

export default function LiveExecutionPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["liveWalletStatus"],
    queryFn: async () => (await base44.functions.invoke("liveWalletStatus", {})).data,
    refetchInterval: 30000
  });

  const setMode = async (mode) => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke("agentControl", {
        action: "set_mode",
        mode,
        confirm: mode === "LIVE" ? confirm : undefined
      });
      if (res.data?.error) toast({ title: "Mode unchanged", description: res.data.error, variant: "destructive" });
      else toast({ title: `Mode set to ${mode}`, description: "Trading is paused — start it when ready." });
      setConfirm("");
      queryClient.invalidateQueries();
    } catch (error) {
      toast({ title: "Mode unchanged", description: error.message, variant: "destructive" });
    }
    setBusy(false);
  };

  if (isLoading) {
    return <div className="border border-border rounded-lg bg-card p-4 font-mono text-xs text-muted-foreground">Checking wallet…</div>;
  }

  const isLive = data?.mode === "LIVE";
  const blocked = data?.turnkey_error || data?.rpc_error;

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-lg bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest text-gold">Live Execution</h2>
          <span className={`font-mono text-[11px] px-2 py-0.5 rounded ${isLive ? "bg-loss/20 text-loss" : "bg-secondary text-muted-foreground"}`}>
            {data?.mode || "PAPER"}
          </span>
        </div>

        <div className="px-4 py-3 divide-y divide-border">
          <Row label="Wallet" value={data?.wallet_address ? `${data.wallet_address.slice(0, 6)}…${data.wallet_address.slice(-4)}` : "—"} />
          <Row
            label="Turnkey signer"
            value={data?.turnkey_ok ? "authenticated" : data?.turnkey_error || "unavailable"}
            tone={data?.turnkey_ok ? "text-profit" : "text-loss"}
          />
          <Row
            label="RPC"
            value={data?.rpc_error ? `${data.rpc_host} — blocked` : data?.rpc_host}
            tone={data?.rpc_error ? "text-loss" : "text-profit"}
          />
          <Row label="SOL balance" value={data?.sol_balance === null ? "unreadable" : `${Number(data.sol_balance).toFixed(4)} SOL`} />
          <Row label="USDC balance" value={data?.usdc_balance === null ? "unreadable" : `$${Number(data.usdc_balance).toFixed(2)}`} />
          <Row label="Per-trade ceiling" value={`$${data?.effective_ceiling_usd} (code cap $${data?.absolute_ceiling_usd})`} />
          <Row label="Orders today" value={`${data?.orders_today} / ${data?.orders_per_day_cap}`} />
          <Row label="Slippage abort above" value={`${data?.slippage_tolerance_percent}%`} />
          <Row
            label="Ready for live orders"
            value={data?.ready ? "yes" : "no"}
            tone={data?.ready ? "text-profit" : "text-loss"}
          />
        </div>

        <div className="px-4 py-3 border-t border-border space-y-3">
          {isLive ? (
            <Button variant="outline" disabled={busy} onClick={() => setMode("PAPER")} className="font-mono text-xs">
              RETURN TO PAPER MODE
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {blocked
                  ? "Live mode is unavailable until the signer and RPC checks above pass."
                  : "Type LIVE to confirm. Real USDC will be swapped on approved signals, capped by the rails above."}
              </p>
              <div className="flex gap-2">
                <Input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="LIVE"
                  className="font-mono text-xs max-w-[120px]"
                />
                <Button
                  variant="destructive"
                  disabled={busy || confirm !== "LIVE" || Boolean(blocked)}
                  onClick={() => setMode("LIVE")}
                  className="font-mono text-xs"
                >
                  ENABLE LIVE TRADING
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <LiveRailsForm />
    </div>
  );
}