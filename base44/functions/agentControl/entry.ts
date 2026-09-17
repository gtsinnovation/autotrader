import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { fetchPrices } from "../../shared/marketData.js";
import { roundTripCostPercent } from "../../shared/gates.js";
import { getConfig } from "../../shared/agent.js";

const ALLOWED_CONFIG_FIELDS = [
  "total_capital_usd", "max_position_usd", "max_open_positions", "min_liquidity_usd",
  "min_traders_h1", "max_avg_trade_usd", "max_top_holders_percent", "max_dev_balance_percent",
  "min_organic_volume_percent", "min_holders", "min_liq_to_fdv_percent", "max_pair_age_hours",
  "min_pair_age_minutes", "max_price_impact_percent", "min_momentum_h1_percent",
  "max_momentum_h1_percent", "take_profit_percent", "stop_loss_percent",
  "trailing_stop_percent", "max_loss_usd", "max_consecutive_losses"
];

// Operator controls: start/stop the agent, retune the gates, force-close a position.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const action = body?.action;
    const cfg = await getConfig(base44);
    const svc = base44.asServiceRole.entities;

    if (action === "resume") {
      await svc.AgentConfig.update(cfg.id, { run_status: "RUNNING", pause_reason: null });
      return Response.json({ run_status: "RUNNING" });
    }

    if (action === "pause") {
      await svc.AgentConfig.update(cfg.id, { run_status: "PAUSED_MANUAL", pause_reason: "paused by operator" });
      return Response.json({ run_status: "PAUSED_MANUAL" });
    }

    if (action === "update_config") {
      const patch = {};
      for (const key of ALLOWED_CONFIG_FIELDS) {
        if (body?.config && body.config[key] !== undefined && body.config[key] !== null) {
          const value = Number(body.config[key]);
          if (Number.isFinite(value) && value >= 0) patch[key] = value;
        }
      }
      if (!Object.keys(patch).length) return Response.json({ error: "no valid fields" }, { status: 400 });
      await svc.AgentConfig.update(cfg.id, patch);
      return Response.json({ updated: patch });
    }

    if (action === "close_position") {
      const pos = await svc.Position.filter({ id: body?.position_id, status: "OPEN" });
      if (!pos.length) return Response.json({ error: "open position not found" }, { status: 404 });
      const p = pos[0];
      const prices = await fetchPrices([p.token_address]);
      const price = prices[p.token_address] || Number(p.last_price) || Number(p.entry_price);
      const gross = ((price - Number(p.entry_price)) / Number(p.entry_price)) * 100;
      const cost = roundTripCostPercent(p.assumed_slippage_percent);
      const net = gross - cost;
      await svc.Position.update(p.id, {
        status: "CLOSED",
        exit_price: price,
        last_price: price,
        exit_reason: "MANUAL",
        gross_pnl_percent: Number(gross.toFixed(2)),
        cost_percent: Number(cost.toFixed(2)),
        net_pnl_percent: Number(net.toFixed(2)),
        net_pnl_usd: Number(((net / 100) * Number(p.size_usd)).toFixed(2)),
        closed_at: new Date().toISOString()
      });
      return Response.json({ closed: p.id, exit_price: price });
    }

    return Response.json({ error: "unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}