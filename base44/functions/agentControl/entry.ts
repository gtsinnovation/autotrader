import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { fetchPrices } from "../../shared/marketData.js";
import { roundTripCostPercent } from "../../shared/gates.js";
import { getConfig } from "../../shared/agent.js";
import { executeLiveSell, ABSOLUTE_MAX_LIVE_POSITION_USD } from "../../shared/liveExecution.js";

const ALLOWED_CONFIG_FIELDS = [
  "total_capital_usd", "max_position_usd", "max_open_positions", "min_liquidity_usd",
  "min_traders_h1", "max_avg_trade_usd", "max_top_holders_percent", "max_dev_balance_percent",
  "min_organic_volume_percent", "min_holders", "min_liq_to_fdv_percent", "max_pair_age_hours",
  "min_pair_age_minutes", "max_price_impact_percent", "min_momentum_h1_percent",
  "max_momentum_h1_percent", "take_profit_percent", "stop_loss_percent",
  "trailing_stop_percent", "max_loss_usd", "max_consecutive_losses",
  "live_max_position_usd", "live_max_orders_per_day", "live_max_slippage_percent"
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

    // Switching to LIVE spends real funds, so it needs an explicit confirmation
    // string and always lands paused — the operator starts trading deliberately.
    if (action === "set_mode") {
      const mode = body?.mode;
      if (mode !== "PAPER" && mode !== "LIVE") {
        return Response.json({ error: "mode must be PAPER or LIVE" }, { status: 400 });
      }
      if (mode === "LIVE" && body?.confirm !== "LIVE") {
        return Response.json({ error: "confirmation required to enable live trading" }, { status: 400 });
      }
      await svc.AgentConfig.update(cfg.id, {
        mode,
        run_status: "PAUSED_MANUAL",
        pause_reason: `switched to ${mode} mode`
      });
      return Response.json({ mode, run_status: "PAUSED_MANUAL", absolute_ceiling_usd: ABSOLUTE_MAX_LIVE_POSITION_USD });
    }

    if (action === "update_config") {
      const patch = {};
      // These two arms the kill switch in syncPositions; zeroing them would
      // silently disable the only loss brake. They must stay positive.
      // max_loss_usd / max_consecutive_losses arm the kill switch; zeroing them
      // would silently disable the only loss brake, so they must stay positive.
      const MUST_BE_POSITIVE = new Set(["max_loss_usd", "max_consecutive_losses"]);
      for (const key of ALLOWED_CONFIG_FIELDS) {
        if (body?.config && body.config[key] !== undefined && body.config[key] !== null) {
          const value = Number(body.config[key]);
          if (!Number.isFinite(value) || value < 0) continue;
          if (MUST_BE_POSITIVE.has(key) && value === 0) continue;
          patch[key] = value;
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
      let price = prices[p.token_address] || Number(p.last_price) || Number(p.entry_price);
      let netUsd = null;
      let exitSignature = null;

      // A live position must be sold on-chain before it can be marked closed.
      if (p.is_live) {
        const sale = await executeLiveSell(svc, p);
        if (!sale.ok) {
          await svc.Position.update(p.id, { exit_error: `manual exit failed: ${sale.reason}`.slice(0, 400) });
          return Response.json({ error: `live exit failed: ${sale.reason}` }, { status: 502 });
        }
        price = sale.exit_price_usd || price;
        netUsd = sale.usdc_received - Number(p.size_usd);
        exitSignature = sale.tx_signature;
      }

      const gross = ((price - Number(p.entry_price)) / Number(p.entry_price)) * 100;
      const net = netUsd === null ? gross - roundTripCostPercent(p.assumed_slippage_percent) : (netUsd / Number(p.size_usd)) * 100;
      const cost = gross - net;
      await svc.Position.update(p.id, {
        status: "CLOSED",
        exit_price: price,
        last_price: price,
        exit_reason: "MANUAL",
        exit_tx_signature: exitSignature,
        exit_error: null,
        gross_pnl_percent: Number(gross.toFixed(2)),
        cost_percent: Number(cost.toFixed(2)),
        net_pnl_percent: Number(net.toFixed(2)),
        net_pnl_usd: Number((netUsd === null ? (net / 100) * Number(p.size_usd) : netUsd).toFixed(2)),
        closed_at: new Date().toISOString()
      });
      return Response.json({ closed: p.id, exit_price: price, tx_signature: exitSignature });
    }

    return Response.json({ error: "unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}