import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { fetchPairSnapshots } from "../../shared/market.ts";
import { loadConfig, log } from "../../shared/agentState.ts";

// Durable exit manager: runs independently of the scan loop so open positions
// stay managed (ATR stop, partial take-profit, trailing giveback) on every tick.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (_e) {
      user = null;
    }
    if (user && user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const cfg = await loadConfig(base44);
    const svc = base44.asServiceRole;
    const positions = await svc.entities.Position.filter({ status: "open" });
    if (!positions.length) return Response.json({ managed: 0, closed: 0, partials: 0 });

    const pairs = await fetchPairSnapshots(positions.map((p) => p.token_address));
    let closed = 0;
    let partials = 0;

    for (const p of positions) {
      const pair = pairs.get(p.token_address);
      const price = Number(pair?.priceUsd || 0);
      if (!price) {
        await log(base44, {
          action: "PRICE_UNAVAILABLE",
          severity: "warn",
          token_address: p.token_address,
          symbol: p.symbol,
          detail: "no live price this tick, position left open",
        });
        continue;
      }

      const peak = Math.max(p.peak_price || p.entry_price, price);
      const remaining = p.remaining_pct ?? 100;
      const fills = Array.isArray(p.fills) ? [...p.fills] : [];
      const patch = { last_price: price, peak_price: peak };
      const pnlFor = (pct) => ((price - p.entry_price) / p.entry_price) * p.allocated_usd * (pct / 100);

      const trailStop = peak * (1 - cfg.trailing_stop_pct / 100);
      const hardStop = p.stop_price || 0;
      const stop = p.trailing_armed ? Math.max(trailStop, hardStop) : hardStop;

      if (price <= stop) {
        const pnl = pnlFor(remaining);
        fills.push({ kind: p.trailing_armed ? "trailing_stop" : "stop_loss", price, pct: remaining, pnl_usd: pnl, at: new Date().toISOString() });
        await svc.entities.Position.update(p.id, {
          ...patch,
          status: "closed",
          remaining_pct: 0,
          realized_pnl_usd: (p.realized_pnl_usd || 0) + pnl,
          unrealized_pnl_usd: 0,
          exit_reason: p.trailing_armed ? "TRAILING_STOP" : "STOP_LOSS",
          closed_at: new Date().toISOString(),
          fills,
        });
        await log(base44, {
          action: "EXIT",
          severity: pnl >= 0 ? "info" : "warn",
          token_address: p.token_address,
          symbol: p.symbol,
          amount_usd: pnl,
          detail: `${p.trailing_armed ? "trailing stop" : "stop loss"} at ${price}`,
        });
        closed += 1;
        continue;
      }

      // Partial de-risk at target, then trail the remainder instead of exiting flat.
      if (!p.trailing_armed && p.target_price && price >= p.target_price) {
        const pct = Math.min(cfg.partial_exit_pct, remaining);
        const pnl = pnlFor(pct);
        fills.push({ kind: "partial_take_profit", price, pct, pnl_usd: pnl, at: new Date().toISOString() });
        await svc.entities.Position.update(p.id, {
          ...patch,
          remaining_pct: remaining - pct,
          trailing_armed: true,
          realized_pnl_usd: (p.realized_pnl_usd || 0) + pnl,
          unrealized_pnl_usd: pnlFor(remaining - pct),
          fills,
        });
        await log(base44, {
          action: "PARTIAL_EXIT",
          token_address: p.token_address,
          symbol: p.symbol,
          amount_usd: pnl,
          detail: `${pct}% out at ${price}, trailing ${cfg.trailing_stop_pct}% on remainder`,
        });
        partials += 1;
        continue;
      }

      await svc.entities.Position.update(p.id, { ...patch, unrealized_pnl_usd: pnlFor(remaining) });
    }

    return Response.json({ managed: positions.length, closed, partials });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}