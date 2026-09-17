// The entry gate pipeline. Every gate is a hard veto: one failure rejects the
// candidate. A gate that cannot measure its input fails closed rather than
// passing on missing data.

const round = (n, d = 2) => (Number.isFinite(n) ? Number(n.toFixed(d)) : null);
const money = (n) => `$${Math.round(n || 0).toLocaleString()}`;

export function runGates(snap, cfg) {
  const gates = [];
  const add = (name, passed, detail, measured = true) => gates.push({ name, passed: Boolean(passed), detail, measured });

  // 1. AUTHORITY — a live mint or freeze authority means the dev can print or
  // freeze your bag. Non-negotiable.
  add(
    "AUTHORITY",
    snap.mint_authority_disabled && snap.freeze_authority_disabled,
    `mint ${snap.mint_authority_disabled ? "revoked" : "LIVE"} / freeze ${snap.freeze_authority_disabled ? "revoked" : "LIVE"}`
  );

  // 2. LIQUIDITY — is there a pool deep enough to exit into?
  add(
    "LIQUIDITY",
    snap.liquidity_usd >= cfg.min_liquidity_usd,
    `${money(snap.liquidity_usd)} pool vs ${money(cfg.min_liquidity_usd)} floor`
  );

  // 3. AGE — old enough to be priced, young enough to still move.
  const age = snap.pair_age_minutes;
  add(
    "AGE",
    age !== null && age >= cfg.min_pair_age_minutes && age <= cfg.max_pair_age_hours * 60,
    age === null ? "first-pool time unavailable" : `${age}m old (window ${cfg.min_pair_age_minutes}m–${cfg.max_pair_age_hours}h)`,
    age !== null
  );

  // 4. CONCENTRATION — top-holder share when the mint reports it; otherwise a
  // stated proxy: a real holder base plus liquidity that is not trivial against
  // FDV. The proxy is labelled as one so it is never read as a measured fact.
  const top = snap.top_holders_percent;
  const liqToFdv = snap.fdv_usd > 0 ? (snap.liquidity_usd / snap.fdv_usd) * 100 : null;
  if (top !== null) {
    add("CONCENTRATION", top <= cfg.max_top_holders_percent, `top holders ${round(top, 1)}% (cap ${cfg.max_top_holders_percent}%)`);
  } else {
    add(
      "CONCENTRATION",
      snap.holder_count >= cfg.min_holders && liqToFdv !== null && liqToFdv >= cfg.min_liq_to_fdv_percent,
      liqToFdv === null
        ? "FDV unavailable — proxy unmeasurable"
        : `proxy: ${snap.holder_count.toLocaleString()} holders (floor ${cfg.min_holders}), liquidity ${round(liqToFdv, 1)}% of FDV (floor ${cfg.min_liq_to_fdv_percent}%)`,
      false
    );
  }

  // 5. DEV — how much of the supply the deployer still sits on. Informational
  // when unreported (older mints carry no dev record) — CONCENTRATION above is
  // the hard supply veto.
  const dev = snap.dev_balance_percent;
  add(
    "DEV_HOLDINGS",
    dev === null || dev <= cfg.max_dev_balance_percent,
    dev === null ? "dev balance unreported — not enforced" : `dev holds ${round(dev, 2)}% (cap ${cfg.max_dev_balance_percent}%)`,
    dev !== null
  );

  // 6. BREADTH — many distinct traders, not three whales printing volume.
  const avgTrade = snap.txns_h1 > 0 ? snap.volume_h1_usd / snap.txns_h1 : null;
  add(
    "BREADTH",
    snap.traders_h1 >= cfg.min_traders_h1 && avgTrade !== null && avgTrade <= cfg.max_avg_trade_usd,
    avgTrade === null
      ? "no 1h trade activity"
      : `${snap.traders_h1} traders/1h, $${round(avgTrade)} avg trade (cap $${cfg.max_avg_trade_usd})`
  );

  // 7. ORGANIC — Jupiter's bot/wash-volume split. This is the closest keyless
  // equivalent to a rat-trader / bundler exposure check.
  const organic = snap.organic_volume_share;
  add(
    "ORGANIC_FLOW",
    organic !== null && organic >= cfg.min_organic_volume_percent,
    organic === null ? "organic split unavailable" : `${round(organic, 2)}% organic volume (floor ${cfg.min_organic_volume_percent}%)`,
    organic !== null
  );

  // 8. FLOW — buy pressure and net new buyers must both be positive.
  const buyShare = snap.buy_volume_share;
  add(
    "BUY_PRESSURE",
    buyShare !== null && buyShare >= 50 && snap.net_buyers_h1 > 0,
    buyShare === null
      ? "no flow data"
      : `${round(buyShare, 1)}% buy volume, ${snap.net_buyers_h1} net new buyers`
  );

  // 9. MOMENTUM — trending up, but not already vertical.
  add(
    "MOMENTUM",
    snap.price_change_h1 >= cfg.min_momentum_h1_percent && snap.price_change_h1 <= cfg.max_momentum_h1_percent,
    `${round(snap.price_change_h1, 1)}% 1h (band ${cfg.min_momentum_h1_percent}–${cfg.max_momentum_h1_percent}%)`
  );

  // 10. SLIPPAGE — measured price impact for the real position size.
  const impact = snap.price_impact_percent;
  add(
    "SLIPPAGE",
    impact !== null && impact !== undefined && impact <= cfg.max_price_impact_percent,
    impact === null || impact === undefined
      ? "price impact unmeasurable — failing closed"
      : `${round(impact)}% impact (cap ${cfg.max_price_impact_percent}%)`,
    impact !== null && impact !== undefined
  );

  const failed = gates.find((g) => !g.passed);
  return {
    gates,
    verdict: failed ? "REJECTED" : "APPROVED",
    rejected_by: failed ? failed.name : null,
    reject_reason: failed ? failed.detail : null,
    score: scoreSnapshot(snap, cfg)
  };
}

// Composite conviction score — ranks approved candidates, never overrides a gate.
export function scoreSnapshot(snap, cfg) {
  const clamp = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
  const liquidity = clamp(snap.liquidity_usd / (cfg.min_liquidity_usd * 8));
  const breadth = clamp(snap.traders_h1 / (cfg.min_traders_h1 * 6));
  const organic = clamp((snap.organic_volume_share || 0) / 25);
  const flow = clamp(((snap.buy_volume_share || 0) - 50) / 20);
  const momentum = clamp(snap.price_change_h1 / 120);
  const safety = clamp(1 - (snap.top_holders_percent ?? 100) / 100);
  const impact = snap.price_impact_percent == null ? 0 : clamp(1 - snap.price_impact_percent / cfg.max_price_impact_percent);
  return Math.round(liquidity * 15 + breadth * 20 + organic * 20 + flow * 15 + momentum * 10 + safety * 10 + impact * 10);
}

export function roundTripCostPercent(slippagePercent) {
  const FEE_PERCENT = 0.25; // DEX + priority fee estimate, each side
  return FEE_PERCENT * 2 + Math.abs(slippagePercent || 0) * 2;
}