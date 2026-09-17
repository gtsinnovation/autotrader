// Shared agent state helpers used by every backend function.

export const DEFAULT_CONFIG = {
  run_status: "PAUSED_MANUAL",
  mode: "PAPER",
  total_capital_usd: 1000,
  max_position_usd: 50,
  max_open_positions: 5,
  min_liquidity_usd: 25000,
  min_traders_h1: 120,
  max_avg_trade_usd: 400,
  max_top_holders_percent: 25,
  min_holders: 300,
  min_liq_to_fdv_percent: 2,
  max_dev_balance_percent: 5,
  min_organic_volume_percent: 3,
  max_pair_age_hours: 336,
  min_pair_age_minutes: 15,
  max_price_impact_percent: 3,
  min_momentum_h1_percent: 3,
  max_momentum_h1_percent: 300,
  take_profit_percent: 40,
  stop_loss_percent: 18,
  trailing_stop_percent: 15,
  max_loss_usd: 150,
  max_consecutive_losses: 5
};

// Exactly one config row exists; create it on first use.
export async function getConfig(base44) {
  const rows = await base44.asServiceRole.entities.AgentConfig.list("-created_date", 1);
  // Defaults are merged underneath so a threshold added after the row was
  // created never reads as undefined inside a gate.
  if (rows.length) return { ...DEFAULT_CONFIG, ...stripEmpty(rows[0]) };
  return await base44.asServiceRole.entities.AgentConfig.create(DEFAULT_CONFIG);
}

function stripEmpty(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) if (v !== null && v !== undefined) out[k] = v;
  return out;
}

// Only an admin app user may drive the agent by hand. A workflow run carries no
// user at all, which is allowed — it is the platform calling, not the internet.
export async function assertOperator(base44) {
  let user = null;
  try {
    user = await base44.auth.me();
  } catch (_err) {
    user = null;
  }
  if (user && user.role !== "admin") return false;
  return true;
}