import React from "react";
import DocSection from "@/components/terminal/DocSection";

const PIPELINE = [
  ["1. Discovery", "Recent Solana launches are pulled from the Jupiter Token API, the single source of truth for price, liquidity, volume and holder stats."],
  ["2. Entry gates", "Each candidate runs the full gate set. Any failed gate is a hard veto — the signal is recorded as REJECTED with the gate that stopped it."],
  ["3. Scoring", "Survivors receive a 0-100 conviction score. Approved signals open a position if capacity and risk limits allow."],
  ["4. Management", "An autonomous loop re-prices open positions and applies take-profit, stop-loss and trailing-stop rules independently of the scanner."]
];

const GATES = [
  ["Liquidity", "Rejects thin pools below your minimum liquidity floor, where exit slippage would be unacceptable."],
  ["Authority", "Requires mint and freeze authority to be disabled, so supply cannot be inflated and your balance cannot be frozen."],
  ["Concentration", "Caps top-holder and developer balance share. When holder data is unreported, holder count and liquidity-to-FDV act as proxies."],
  ["Volume quality", "Requires real trader counts and an organic volume share, and caps average trade size to filter wash-traded pairs."],
  ["Pair age", "Excludes pairs too new to have price history and pairs past their momentum window."],
  ["Momentum", "Requires 1-hour price change inside your band — enough to signal interest, not so much that entry is chasing a spike."],
  ["Price impact", "Measures the impact of a real quote at your position size and rejects anything above your ceiling."]
];

const RISK = [
  ["Position sizing", "Every entry is capped at your per-trade maximum, and total open positions at your concurrency limit."],
  ["Loss limits", "Cumulative realized loss and consecutive-loss ceilings trip the kill switch, which pauses new entries."],
  ["Kill switch", "PAUSED_KILL_SWITCH and PAUSED_MANUAL both block new entries. Open positions always keep resolving so nothing is left unmanaged."],
  ["Emergency stop", "Risk Settings can halt trading immediately; the pause reason is shown in the agent bar."]
];

const EXECUTION = [
  ["Mode", "The agent runs in PAPER mode. Trades are simulated against live prices, including assumed slippage and costs, so no funds are at risk."],
  ["Signer", "Live execution signs through a Turnkey service user with no human login, isolating trading from your root account."],
  ["Signing policy", "The agent key may only sign. Administrative actions — creating wallets, adding users or keys — are denied by policy."],
  ["Scope note", "Turnkey's condition language cannot scope a signing rule to one address, so the policy covers any key in the organization. With a single trading wallet the effective scope is that wallet."]
];

const PAGES = [
  ["Terminal", "Live view: agent status, capital, open and closed counts, realized P&L, win rate, the signal feed and position management."],
  ["Strategy Editor", "Entry gate thresholds and exit rules — take-profit, stop-loss and trailing stop."],
  ["Risk Settings", "Capital, position sizing, loss limits and the emergency stop."],
  ["Execution Logs", "Every gate evaluation as a searchable row, showing which gates passed, failed, or fell back to a proxy."],
  ["Signal Inspector", "Per-token drill-down: gate results, metrics, verdict and the full scan history for that address."],
  ["Execution History", "Completed trades with entry, exit, gross and net performance, costs and exit reason."],
  ["Performance", "Realized P&L by day and week, win rate, average hold time, and best and worst trades."],
  ["Watchlist", "Manually tracked mints with on-demand price and liquidity refresh."],
  ["System Health", "Upstream reachability and latency for Jupiter and Solana RPC, plus agent run status and last scan, sync and signal times."]
];

export default function Documentation() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-mono text-sm uppercase tracking-widest text-gold">Documentation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How the agent finds, screens, enters and exits trades — and where to change each behaviour.
        </p>
      </div>

      <DocSection
        title="Trading pipeline"
        lead="Every scan moves through four stages. A candidate must clear each stage to reach a position."
        rows={PIPELINE}
      />
      <DocSection
        title="Entry gates"
        lead="Gates are hard vetoes, not weighted inputs. Thresholds live in the Strategy Editor."
        rows={GATES}
      />
      <DocSection
        title="Risk controls"
        lead="Risk is enforced before entry and continuously while positions are open. Thresholds live in Risk Settings."
        rows={RISK}
      />
      <DocSection
        title="Execution and signing"
        lead="Discovery and market data are read-only and keyless. Only execution touches credentials."
        rows={EXECUTION}
      />
      <DocSection title="Dashboard reference" rows={PAGES} />
    </div>
  );
}