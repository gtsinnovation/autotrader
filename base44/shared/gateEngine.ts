// AutoTrader gate pipeline. Fail-closed: unmeasured data never opens a gate.

export const DEFAULT_CONFIG = {
  kill_switch: false,
  mode: "paper",
  mev_protection: true,
  capital_cap_usd: 1000,
  max_position_usd: 50,
  max_open_positions: 5,
  min_liquidity_usd: 25000,
  min_buyers_1h: 40,
  max_structure_risk: 55,
  max_slippage_bps: 600,
  atr_stop_multiple: 1.8,
  take_profit_multiple: 2,
  trailing_stop_pct: 25,
  partial_exit_pct: 50,
  min_age_minutes: 15,
  max_age_hours: 72,
};

export function withDefaults(config) {
  return { ...DEFAULT_CONFIG, ...(config || {}) };
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

// Order-size aware slippage ceiling from tradeable depth (never widened to force a fill).
export function slippageCeilingBps(orderUsd, liquidityUsd) {
  const depth = Math.max(liquidityUsd * 0.5, 1);
  return Math.round(Math.min(Math.max((orderUsd / depth) * 20000, 50), 600));
}

// Composite 0-100 manipulation / insider-risk score (replaces a single concentration check).
export function structureRisk(s) {
  const churn = s.liquidity_usd > 0 ? s.volume_24h_usd / s.liquidity_usd : 999;
  const floatRatio = s.liquidity_usd > 0 ? s.fdv_usd / s.liquidity_usd : 999;
  const flow = s.buys_1h + s.sells_1h;
  const sellPressure = flow > 0 ? s.sells_1h / flow : 1;
  const thinFlow = flow > 0 ? clamp01(1 - flow / 120) : 1;
  return Math.round(
    30 * clamp01(churn / 40) +
      30 * clamp01(floatRatio / 120) +
      20 * clamp01((sellPressure - 0.5) / 0.3) +
      20 * thinFlow
  );
}

// Volatility proxy (%) used to size stops instead of a fixed pullback constant.
export function atrProxyPct(s) {
  const m5 = Math.abs(s.price_change_5m || 0);
  const h1 = Math.abs(s.price_change_1h || 0) / 4;
  return Math.max(2, Math.min(Math.max(m5, h1), 45));
}

export function evaluate(snapshot, rawConfig) {
  const cfg = withDefaults(rawConfig);
  const s = snapshot;
  const gates = [];
  const push = (id, label, measured, passed, detail) =>
    gates.push({ id, label, measured, passed: measured && passed, detail });

  // A — venue depth
  push(
    "A_ANCHOR",
    "Liquidity anchor",
    s.liquidity_usd > 0,
    s.liquidity_usd >= cfg.min_liquidity_usd,
    `$${Math.round(s.liquidity_usd).toLocaleString()} vs $${cfg.min_liquidity_usd.toLocaleString()} min`
  );

  // B — age window: too new = unindexed noise, too old = no memecoin edge
  const ageMeasured = s.age_minutes !== null && s.age_minutes !== undefined;
  push(
    "B_WINDOW",
    "Age window",
    ageMeasured,
    ageMeasured && s.age_minutes >= cfg.min_age_minutes && s.age_minutes <= cfg.max_age_hours * 60,
    ageMeasured ? `${s.age_minutes}m old` : "pair age unavailable"
  );

  // C — participation breadth (buyer count + buy-side dominance)
  const flow = s.buys_1h + s.sells_1h;
  const buyShare = flow > 0 ? s.buys_1h / flow : 0;
  push(
    "C_BREADTH",
    "Participation breadth",
    flow > 0,
    s.buys_1h >= cfg.min_buyers_1h && buyShare >= 0.52,
    `${s.buys_1h} buys / ${s.sells_1h} sells (${Math.round(buyShare * 100)}% buy side)`
  );

  // D — real turnover, not a dead book
  push(
    "D_TURNOVER",
    "Turnover",
    s.volume_1h_usd > 0 || s.volume_24h_usd > 0,
    s.volume_1h_usd >= s.liquidity_usd * 0.05,
    `1h vol $${Math.round(s.volume_1h_usd).toLocaleString()}`
  );

  // E — momentum with a blow-off ceiling
  const momentumMeasured = s.price_change_5m !== null && s.price_change_1h !== null;
  push(
    "E_PULSE",
    "Momentum pulse",
    momentumMeasured,
    s.price_change_1h > 0 && s.price_change_5m > -8 && s.price_change_5m < 60,
    `5m ${s.price_change_5m}% / 1h ${s.price_change_1h}%`
  );

  // F — manipulation / insider structure
  const risk = structureRisk(s);
  push("F_ATLAS", "Structure forensics", s.liquidity_usd > 0, risk < cfg.max_structure_risk, `risk ${risk}/100`);

  // G — executable at an acceptable price
  const slip = slippageCeilingBps(cfg.max_position_usd, s.liquidity_usd);
  push(
    "G_EXECUTION",
    "Execution cost",
    s.price_usd > 0,
    slip <= cfg.max_slippage_bps,
    `${slip} bps ceiling`
  );

  // H — protected submission is mandatory, not a preference
  push("H_SHIELD", "MEV shield", true, cfg.mev_protection === true, cfg.mev_protection ? "protected routing" : "unprotected");

  const failed = gates.find((g) => !g.passed);
  const atr = atrProxyPct(s);
  const conviction = Math.round(
    clamp01(s.buys_1h / 200) * 35 +
      clamp01(s.volume_1h_usd / Math.max(s.liquidity_usd, 1)) * 25 +
      clamp01(s.price_change_1h / 40) * 20 +
      (1 - clamp01(risk / 100)) * 20
  );

  return {
    ...s,
    gates,
    structure_risk: risk,
    slippage_ceiling_bps: slip,
    atr_proxy_pct: atr,
    conviction,
    decision: failed ? "rejected" : "approved",
    reject_reason: failed ? `${failed.id}: ${failed.measured ? failed.detail : "UNMEASURED"}` : "",
  };
}

// ATR-scaled stop / target, replacing fixed-percentage levels. 2:1 R:R preserved.
export function exitLevels(entryPrice, atrPct, cfg) {
  const c = withDefaults(cfg);
  const stop = entryPrice * (1 - (atrPct * c.atr_stop_multiple) / 100);
  const r = entryPrice - stop;
  return { stop_price: stop, target_price: entryPrice + c.take_profit_multiple * r };
}