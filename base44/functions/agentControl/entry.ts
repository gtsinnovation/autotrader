import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { fetchPairSnapshots } from "../../shared/market.ts";
import { loadConfig, log } from "../../shared/agentState.ts";

const NUMERIC_KEYS = [
  "capital_cap_usd",
  "max_position_usd",
  "max_open_positions",
  "min_liquidity_usd",
  "min_buyers_1h",
  "max_structure_risk",
  "max_slippage_bps",
  "atr_stop_multiple",
  "take_profit_multiple",
  "trailing_stop_pct",
  "partial_exit_pct",
  "min_age_minutes",
  "max_age_hours",
];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const cfg = await loadConfig(base44);
    const svc = base44.asServiceRole;

    if (action === "update_config") {
      const patch = {};
      const incoming = body.config || {};
      for (const k of NUMERIC_KEYS) {
        if (typeof incoming[k] === "number" && incoming[k] >= 0) patch[k] = incoming[k];
      }
      if (typeof incoming.mev_protection === "boolean") patch.mev_protection = incoming.mev_protection;
      if (typeof incoming.kill_switch === "boolean") patch.kill_switch = incoming.kill_switch;
      if (incoming.mode === "paper" || incoming.mode === "live") patch.mode = incoming.mode;

      // Live trading is refused without protected submission — configuration cannot opt out.
      const nextMev = patch.mev_protection ?? cfg.mev_protection;
      if ((patch.mode ?? cfg.mode) === "live" && !nextMev) {
        return Response.json({ error: "Live mode requires MEV protection enabled." }, { status: 400 });
      }

      const updated = await svc.entities.AgentConfig.update(cfg.id, patch);
      await log(base44, { action: "CONFIG_CHANGE", detail: JSON.stringify(patch).slice(0, 400) });
      return Response.json({ config: updated });
    }

    if (action === "set_kill_switch") {
      const engaged = body.engaged === true;
      const updated = await svc.entities.AgentConfig.update(cfg.id, { kill_switch: engaged });
      await log(base44, {
        action: "KILL_SWITCH",
        severity: engaged ? "warn" : "info",
        detail: engaged ? "engaged — no new entries" : "released",
      });
      return Response.json({ config: updated });
    }

    if (action === "close_position") {
      const position = await svc.entities.Position.filter({ id: body.position_id, status: "open" });
      const p = position[0];
      if (!p) return Response.json({ error: "Open position not found" }, { status: 404 });
      const pairs = await fetchPairSnapshots([p.token_address]);
      const price = Number(pairs.get(p.token_address)?.priceUsd || p.last_price || p.entry_price);
      const remaining = p.remaining_pct ?? 100;
      const pnl = ((price - p.entry_price) / p.entry_price) * p.allocated_usd * (remaining / 100);
      const fills = Array.isArray(p.fills) ? [...p.fills] : [];
      fills.push({ kind: "manual_exit", price, pct: remaining, pnl_usd: pnl, at: new Date().toISOString() });
      const updated = await svc.entities.Position.update(p.id, {
        status: "closed",
        remaining_pct: 0,
        last_price: price,
        realized_pnl_usd: (p.realized_pnl_usd || 0) + pnl,
        unrealized_pnl_usd: 0,
        exit_reason: "MANUAL",
        closed_at: new Date().toISOString(),
        fills,
      });
      await log(base44, {
        action: "EXIT",
        token_address: p.token_address,
        symbol: p.symbol,
        amount_usd: pnl,
        detail: `manual close at ${price}`,
      });
      return Response.json({ position: updated });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}