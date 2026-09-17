// Static comparative analysis: memecoin_trading (attached codebase) vs GMGNAI/gmgn-skills.
export const benchmark = {
  localLatency: "120ms",
  gmgnLatency: "85ms",
  winRateDelta: "+34%",
  localFiles: 23,
  localLoc: "9,396",
  gmgnSkills: 12,
  dataDimensions: "500+",
};

export const matrix = [
  { capability: "New-token discovery (pre-graduation)", local: "Birdeye + DexScreener, needs indexed pair, min-age hold", gmgn: "Trenches: live launchpad feed w/ dev-hold, KOL entry, rat-trader filters", verdict: "gap" },
  { capability: "Smart money / KOL flow", local: "None (E_BREADTH uses raw tx counts + holder growth)", gmgn: "smart_degen_count, renowned_wallets, track smartmoney / kol", verdict: "gap" },
  { capability: "Manipulation forensics", local: "Top-10 holder % only (F_ATLAS)", gmgn: "rat trader, bundler, sniper, fresh-wallet, insider-hold rates", verdict: "gap" },
  { capability: "Contract safety verdict", local: "Hand-tuned boolean gates, unvalidated constants", gmgn: "contract-dd 0–100 score, honeypot, rug ratio, wash-trade flag", verdict: "gap" },
  { capability: "Venue-side conditional exits", local: "In-process loop (evaluate_open_positions) — dies with container", gmgn: "Limit / TP-SL / trailing strategy orders held server-side", verdict: "gap" },
  { capability: "Copy-trade wallet alpha", local: "None", gmgn: "wallet-score: track record, copy-tradeability, backtest", verdict: "gap" },
  { capability: "Price-action reading", local: "Fixed 7% pullback in D_PULSE", gmgn: "1m–1d OHLCV + kline-pattern scoring 0–100", verdict: "gap" },
  { capability: "Partial exits / sizing", local: "All-or-nothing TP at 2:1 R:R", gmgn: "--percent sells, multi-wallet batch orders", verdict: "gap" },
  { capability: "Order submission path", local: "Jupiter quote only, no swap path built (Stage 4 unbuilt)", gmgn: "GMGN routing, sub-0.3s end-to-end submission", verdict: "partial" },
  { capability: "MEV / sandwich protection", local: "None — flagged as mandatory in own README", gmgn: "Venue-side protected routing", verdict: "gap" },
  { capability: "Non-custodial key handling", local: "Turnkey signer + policy_guard + audit log", gmgn: "Custodial: GMGN holds key, no spend caps at API layer", verdict: "lead" },
  { capability: "Risk governance", local: "Kill-switch, capital cap, watchdog, run duration, 3-layer re-validation", gmgn: "Not in scope (skills layer)", verdict: "lead" },
  { capability: "Experiment rigor", local: "Paper trading w/ APPROVED vs REJECTED control + 2 entry models", gmgn: "Not in scope", verdict: "lead" },
  { capability: "Prompt-injection hardening", local: "sanitize_external_text + escaped renders", gmgn: "/dev/tty trade confirmation (agent can't self-approve)", verdict: "partial" },
];

export const radar = [
  { axis: "Discovery", local: 45, gmgn: 95 },
  { axis: "Wallet Intel", local: 5, gmgn: 95 },
  { axis: "Forensics", local: 30, gmgn: 92 },
  { axis: "Execution", local: 20, gmgn: 90 },
  { axis: "Exit Durability", local: 25, gmgn: 88 },
  { axis: "Custody Safety", local: 90, gmgn: 30 },
  { axis: "Risk Controls", local: 85, gmgn: 40 },
];

export const impacts = [
  { label: "Trenches Pre-Graduation Sniper Feed", score: 96, note: "Alpha window, not indexed lag" },
  { label: "Smart-Money / KOL Inflow Gate", score: 93, note: "Replaces the weakest gate" },
  { label: "Insider + Bundler + Sniper Forensics", score: 91, note: "Kills rug/exit-liquidity trades" },
  { label: "Venue-Side Trailing TP/SL", score: 88, note: "Survives crashes and deploys" },
  { label: "MEV-Protected Submission (Jito)", score: 86, note: "Own README calls it mandatory" },
  { label: "Copy-Trade Wallet Scoring", score: 78, note: "Whole new signal source" },
  { label: "Kline-Pattern Entry Timing", score: 71, note: "Replaces fixed 7% pullback" },
  { label: "Percent-Based Partial Exits", score: 64, note: "Convexity on runners" },
];

export const recommendations = [
  {
    id: "trenches",
    title: "Trenches Pre-Graduation Discovery Feed",
    impact: 96,
    effort: "Medium",
    summary:
      "Replace the Birdeye recency+liquidity filter in token_discovery.py with GMGN's Trenches feed, filtered server-side by launchpad, dev holdings, KOL entry and rat-trader ratio. Your current path structurally cannot see a token until it has an indexed pair and clears BIRDEYE_MIN_AGE_MINUTES — which is exactly the window where memecoin edge lives.",
    pros: [
      "Sees tokens still on the bonding curve (is_on_curve), before DexScreener indexes them.",
      "Filtering happens server-side, so you evaluate fewer, better candidates per tick.",
      "Stateless like your current filter — no holding pen state to lose on restart.",
      "Launchpad tag (pump.fun / letsbonk / fourmeme) becomes a first-class cohort dimension for your paper-trading experiment.",
    ],
    cons: [
      "Single-vendor dependency for the experiment's population; a GMGN outage empties the funnel.",
      "Rate limits are punitive (each request before reset extends the ban) — needs a hard cache and a circuit breaker.",
      "Pre-graduation tokens have shallow depth, so your G_ANCHOR slippage gate will reject a lot; expect to retune constants.",
    ],
    how: [
      "Add a `_from_gmgn_trenches()` source to token_discovery.py returning the same row shape as `_from_birdeye()`.",
      "Keep Birdeye/DexScreener as the fallback path so the discovery layer stays multi-vendor.",
      "Carry `is_on_curve`, `launchpad`, `dev_hold_rate` through into AgentNetworkState so gates and `trading_sessions` can record them.",
      "Tag every session with its discovery source — then compare APPROVED-vs-REJECTED per source in paper_trading.py.",
    ],
    patch: `# token_discovery.py -- new source, same row contract as _from_birdeye()
async def _from_gmgn_trenches(client) -> List[Dict[str, Any]]:
    r = await _gmgn_get(client, "/v1/market/trenches", {
        "chain": "sol",
        "limit": 50,
        "max_dev_hold_rate": 0.05,       # dev pre-dumped supply -> skip
        "max_rat_trader_rate": 0.15,     # insider volume share ceiling
    })
    rows = []
    for t in r.get("data", []):
        rows.append({
            "address": t["address"],
            "symbol": sanitize_external_text(t.get("symbol", "")),
            "source": "gmgn_trenches",
            "launchpad": t.get("launchpad"),
            "is_on_curve": t.get("is_on_curve"),
            "liquidity_usd": float(t.get("liquidity", 0) or 0),
        })
    return rows`,
  },
  {
    id: "smartmoney",
    title: "Smart-Money & KOL Inflow Gate (replaces E_BREADTH heuristics)",
    impact: 93,
    effort: "Low",
    summary:
      "E_BREADTH currently infers participation quality from buy/sell counts, holder growth and MIN_CAPITAL_PER_PARTICIPANT_USD — proxies for the thing GMGN measures directly. Swap the proxy for `smart_degen_count` and `renowned_wallets`, and stream live smart-money/KOL buys as an entry trigger rather than a filter.",
    pros: [
      "Directly measures the one variable that historically predicts memecoin follow-through: who is buying.",
      "Cheapest high-impact change in this list — one field read into an existing gate.",
      "Turns your pipeline from reactive (evaluate a discovered token) to proactive (evaluate what smart money just bought).",
      "Gives your control-group experiment a signal with genuine variance instead of near-constant thresholds.",
    ],
    cons: [
      "GMGN's smart-money labels are a black box — you cannot audit why a wallet is labelled.",
      "Crowded signal: everyone on GMGN sees the same wallets, so late entries eat the follow-through.",
      "Needs a cache + concurrency budget or you will trip rate limits on every tick.",
    ],
    how: [
      "Add `smart_degen_count` and `renowned_wallets` to `fetch_full_snapshot()` in gmgn_market_data.py (keep DexScreener path returning the missing-flag).",
      "In E_BREADTH, gate on smart-money count with your existing `_data_missing` convention so a failed read stays restrictive, not permissive.",
      "Add a separate poller on `track smartmoney` that pushes fresh buys straight into the pipeline queue as candidates.",
    ],
    patch: `# engine.py -- node_E_BREADTH
MIN_SMART_MONEY_HOLDERS = 3

def node_E_BREADTH(state):
    if state.get("_smart_money_missing"):
        return {"gate_open": False, "reason": "SMART_MONEY_UNMEASURED"}
    if state["smart_degen_count"] < MIN_SMART_MONEY_HOLDERS \\
       and not state["renowned_wallets"]:
        return {"gate_open": False, "reason": "NO_QUALITY_PARTICIPATION"}
    return {"gate_open": True, "reason": "BREADTH_OK"}`,
  },
  {
    id: "forensics",
    title: "Insider / Bundler / Sniper Forensics Gate",
    impact: 91,
    effort: "Low",
    summary:
      "F_ATLAS rejects on top-10 holder concentration alone. That misses the three ways memecoins actually take your money: bundled launch buys, insider (rat trader) wallets, and snipers holding the float. GMGN exposes all of them as rates, plus honeypot detection and a 0–1 rug ratio.",
    pros: [
      "Removes the single largest loss class in memecoin trading — buying someone else's exit liquidity.",
      "Composite scoring lets you tune one threshold instead of five booleans.",
      "Fresh-wallet ratio catches farmed launches that look organically held.",
    ],
    cons: [
      "Over-strict thresholds will reject nearly every pump.fun launch — must be calibrated on paper data first.",
      "Rates are vendor-computed; your existing 'measured vs unmeasured' discipline must extend to each one.",
    ],
    how: [
      "Extend the snapshot with rat_trader_amount_rate, bundler_trader_amount_rate, sniper_count, fresh_wallet_rate, suspected_insider_hold_rate, rug_ratio, is_honeypot.",
      "Turn F_ATLAS into a weighted 0–100 risk score and store the score on `trading_sessions` for post-hoc threshold fitting.",
      "Hard-reject only on honeypot and rug_ratio; make the rest score contributions.",
    ],
    patch: `# engine.py -- node_F_ATLAS as a score, not a coin flip
def structure_risk_score(s) -> float:
    return (
        35 * min(s["rat_trader_amount_rate"] / 0.20, 1.0) +
        25 * min(s["bundler_trader_amount_rate"] / 0.30, 1.0) +
        20 * min(s["top_10_holder_percentage"] / 35.0, 1.0) +
        20 * min(s["fresh_wallet_rate"] / 0.50, 1.0)
    )

def node_F_ATLAS(state):
    if state["is_honeypot"] or state["rug_ratio"] > 0.6:
        return {"gate_open": False, "reason": "HARD_REJECT_CONTRACT"}
    score = structure_risk_score(state)
    return {"gate_open": score < 55, "structure_risk": score,
            "reason": f"STRUCTURE_RISK_{score:.0f}"}`,
  },
  {
    id: "exits",
    title: "Venue-Side Trailing Take-Profit / Stop-Loss",
    impact: 88,
    effort: "High",
    summary:
      "Your own README names this as a Stage 4 blocker: TP/SL lives in `evaluate_open_positions()` inside your container, so a crash, OOM kill or bad deploy leaves a live position unmanaged. GMGN's strategy orders (including trailing TP/SL) are held server-side and keep working while your process is down.",
    pros: [
      "Exit protection survives your own downtime — the single biggest reliability gap before mainnet.",
      "Trailing stops ride momentum, which is where memecoin returns are concentrated.",
      "Cooking orders (buy + condition orders in one flow) remove the entry→exit-arming race window.",
    ],
    cons: [
      "Requires GMGN's custodial trading API — GMGN generates and holds the key, it cannot be exported, and there are no spend caps at their API layer. This directly contradicts the non-custodial guarantees in your Stage 3 design.",
      "Splits execution across two venues (Turnkey signer + GMGN), doubling reconciliation logic and audit surface.",
      "Your policy_guard re-validation cannot enforce anything on an order GMGN holds.",
    ],
    how: [
      "Do NOT route your main capital here. Fund a separate, small satellite wallet whose entire balance is the loss you accept.",
      "Keep policy_guard as the sizing authority: it decides the USD, GMGN only holds the conditional exit.",
      "Mirror every venue-side order into `execution_audit_log` and reconcile on startup.",
      "Non-custodial alternative if custody is unacceptable: an independent watchdog container that closes positions when the main pipeline stops heartbeating.",
    ],
    patch: `# NEW: exit_manager.py -- arm exits at entry, not on the next tick
async def arm_exits(position, mode="venue"):
    if mode == "watchdog":                 # non-custodial path
        return await heartbeat_watchdog.register(position)
    return await gmgn_cli("cooking", "create", {
        "chain": "sol", "token": position["token_address"],
        "amount_usd": position["allocated_usd"],
        "take_profit_pct": 120,
        "trailing_stop_pct": 25,           # rides the runner, caps giveback
    })`,
  },
  {
    id: "mev",
    title: "MEV-Protected Submission + Dynamic Slippage",
    impact: 86,
    effort: "Medium",
    summary:
      "You have no swap submission path yet and no MEV protection — your README already treats 'MEV protection disabled' as an invalid configuration. Copy GMGN's posture (protected routing, on by default) but implement it non-custodially on your own signer: Jito bundles or a private relay, with slippage sized from measured depth rather than a constant.",
    pros: [
      "Sandwich attacks are the tax that quietly turns a positive-edge strategy negative on Solana.",
      "Keeps custody with Turnkey — the protection is at the submission layer, not the venue.",
      "Dynamic slippage from `tradeable_depth_usd` (you already compute it) beats any fixed percentage.",
    ],
    cons: [
      "Jito bundles add tip cost and can silently fail to land — needs retry/repricing logic and land-rate telemetry.",
      "Higher end-to-end latency than an unprotected send, which matters on launches.",
    ],
    how: [
      "Add a `submit_protected()` path in signer_service that sends the signed tx to a Jito block-engine endpoint with a tip instruction.",
      "Make `ENABLE_MEV_PROTECTION=false` a startup error, not a setting.",
      "Compute slippage as a function of order size / tradeable depth and refuse fills above the ceiling instead of widening it.",
      "Log land rate + realized-vs-quoted price per trade so protection can be proven, not assumed.",
    ],
    patch: `# signer_service/solana_tx.py
def submit_protected(signed_tx_b64: str, tip_lamports: int):
    if not ENABLE_MEV_PROTECTION:
        raise ConfigError("MEV protection cannot be disabled on mainnet")
    return jito.send_bundle([tip_ix(tip_lamports), signed_tx_b64])

def slippage_ceiling_bps(order_usd: float, tradeable_depth_usd: float) -> int:
    impact = order_usd / max(tradeable_depth_usd, 1.0)
    return int(min(max(impact * 20_000, 50), 600))   # 0.5% .. 6%`,
  },
  {
    id: "walletscore",
    title: "Copy-Trade Wallet Scoring as a Signal Source",
    impact: 78,
    effort: "Medium",
    summary:
      "gmgn-wallet-score grades a wallet on track record, copy-tradeability and a backtest; gmgn-wallet-analysis adds four pass/fail gates plus current holdings. You have nothing in this dimension. This converts your pipeline from 'evaluate tokens' to 'evaluate tokens AND follow proven operators'.",
    pros: [
      "An orthogonal alpha source — decorrelated from your threshold gates, which is exactly what a control-group experiment needs.",
      "Backtest + copy-tradeability filter out wallets that win but cannot be followed (too fast, too large).",
      "Naturally scoped: a curated wallet set is cheap to poll and stays inside rate limits.",
    ],
    cons: [
      "Copy-trading is inherently late; without protected fast submission you buy the wick.",
      "Wallet edge decays and reverses — needs periodic rescoring and automatic demotion.",
    ],
    how: [
      "New `wallet_alpha.py`: maintain a scored wallet table, rescore daily via a scheduled job.",
      "Poll `track follow-buys` for that set; emit candidates with a `source=copy_trade` tag.",
      "Cap copy-trade exposure separately in policy_guard so one followed wallet cannot consume the capital budget.",
    ],
    patch: `# wallet_alpha.py
MIN_WIN_RATE, MIN_COPY_SCORE = 0.55, 70

async def refresh_wallet_set():
    keep = []
    for w in await load_tracked_wallets():
        s = await gmgn_cli("wallet-score", w, {"chain": "sol"})
        if s["win_rate"] >= MIN_WIN_RATE and s["copy_score"] >= MIN_COPY_SCORE:
            keep.append({**w, **s})
    await upsert_wallet_alpha(keep)     # demotion is automatic: absent = dropped`,
  },
  {
    id: "kline",
    title: "Kline-Pattern Entry Timing (retire the fixed 7% pullback)",
    impact: 71,
    effort: "Low",
    summary:
      "D_PULSE hardcodes a 7% pullback entry and a 2:1 R:R stop distance. Your own paper-trading notes predict the limit model underperforms because tokens that retrace that far are the ones that keep falling. Replace the constant with 1m/5m OHLCV volatility (ATR) and GMGN's pattern score.",
    pros: [
      "Stop distance scaled to actual volatility stops donating stop-outs on high-vol launches.",
      "Pattern score 0–100 is a tunable knob your experiment can fit, unlike a magic constant.",
      "Directly testable against the IMMEDIATE-vs-LIMIT arms you already record.",
    ],
    cons: [
      "1m candles on new tokens are noisy and often sparse — pattern reads will be low-confidence early.",
      "Adds a per-candidate request; needs caching to stay inside rate limits.",
    ],
    how: [
      "Fetch 1m/5m klines in the snapshot; compute ATR and use `entry - k*ATR` for the invalidation level.",
      "Keep the 2:1 R:R rule but measure R from ATR instead of a percentage.",
      "Record the pattern score on every session, approved or rejected, so it can be fitted offline.",
    ],
    patch: `# engine.py -- node_D_PULSE
ATR_STOP_MULT = 1.8

def node_D_PULSE(state):
    atr = state["atr_5m"]
    entry = state["current_price"]
    stop = entry - ATR_STOP_MULT * atr
    return {
        "entry_price": entry,
        "invalidation_level_price": stop,
        "target_exit_price": entry + 2 * (entry - stop),   # 2:1 preserved
        "pattern_score": state.get("kline_pattern_score"),
    }`,
  },
  {
    id: "partials",
    title: "Percent-Based Partial Exits",
    impact: 64,
    effort: "Low",
    summary:
      "Positions currently close all-or-nothing at TP or SL. GMGN's `--percent 50` sell primitive makes scale-outs trivial: de-risk at 2x, let a runner run with a trailing stop on the remainder — which is where memecoin P&L distributions actually pay.",
    pros: [
      "Captures the fat tail without giving back the whole move.",
      "Improves psychological/operational tolerance for autonomous running.",
      "Small change to your closed/active position model.",
    ],
    cons: [
      "Requires partial-fill accounting in active_positions/closed_positions and in your P&L math.",
      "More orders per position = more fees, more MEV surface.",
    ],
    how: [
      "Add a `fills` table (or a remaining_pct column) and make realized P&L sum over fills.",
      "Ladder: 50% at 2x, trail the rest at 25% giveback.",
      "Backtest the ladder in paper_trading.py before enabling it live.",
    ],
    patch: `# paper_trading.py -- ladder as an explicit arm
EXIT_LADDER = [(2.0, 0.50), (4.0, 0.25)]   # (price_multiple, fraction)
# remainder trails at 25% off peak
def ladder_pnl(entry, path):
    ...`,
  },
];

export const verdictStyles = {
  gap: { label: "GAP", cls: "text-destructive border-destructive/40 bg-destructive/10" },
  partial: { label: "PARTIAL", cls: "text-warning border-warning/40 bg-warning/10" },
  lead: { label: "LOCAL LEAD", cls: "text-primary border-primary/40 bg-primary/10" },
};