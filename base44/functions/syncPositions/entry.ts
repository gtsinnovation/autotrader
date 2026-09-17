import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { fetchPrices } from "../../shared/marketData.js"; // Jupiter token API
import { roundTripCostPercent } from "../../shared/gates.js";
import { getConfig, assertOperator } from "../../shared/agent.js";
import { executeLiveSell } from "../../shared/liveExecution.js";

// Marks open positions to real market prices and closes them on take-profit,
// stop-loss or trailing stop. Runs on every tick regardless of run_status: a
// pause blocks new entries only, it never leaves an open position unmanaged.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    if (!(await assertOperator(base44))) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const cfg = await getConfig(base44);
    const svc = base44.asServiceRole.entities;
    const open = await svc.Position.filter({ status: "OPEN" });

    let closed = 0;
    let priced = 0;
    let failedExits = 0;

    if (open.length) {
      const prices = await fetchPrices(open.map((p) => p.token_address));

      for (const pos of open) {
        const price = prices[pos.token_address];
        if (!price || price <= 0) continue; // no fresh quote: leave the position untouched
        priced += 1;

        const peak = Math.max(Number(pos.peak_price || pos.entry_price), price);
        const trailingStop = peak * (1 - Number(pos.trailing_stop_percent || 0) / 100);

        let exitReason = null;
        if (price >= Number(pos.take_profit_price)) exitReason = "TAKE_PROFIT";
        else if (price <= Number(pos.stop_loss_price)) exitReason = "STOP_LOSS";
        else if (pos.trailing_stop_percent > 0 && price <= trailingStop && peak > Number(pos.entry_price)) {
          exitReason = "TRAILING_STOP";
        }

        if (!exitReason) {
          await svc.Position.update(pos.id, { last_price: price, peak_price: peak });
          continue;
        }

        // A live position only closes once the sell actually lands. If the swap
        // fails the position stays OPEN and is retried on the next tick —
        // marking it closed while tokens are still held would lose track of them.
        let exitPrice = price;
        let netUsd = null;
        let exitSignature = null;

        if (pos.is_live) {
          const sale = await executeLiveSell(svc, pos);
          if (!sale.ok) {
            await svc.Position.update(pos.id, {
              last_price: price,
              peak_price: peak,
              exit_error: `${exitReason} exit failed: ${sale.reason}`.slice(0, 400)
            });
            failedExits += 1;
            continue;
          }
          exitPrice = sale.exit_price_usd || price;
          netUsd = sale.usdc_received - Number(pos.size_usd);
          exitSignature = sale.tx_signature;
        }

        const gross = ((exitPrice - Number(pos.entry_price)) / Number(pos.entry_price)) * 100;
        const net = netUsd === null ? gross - roundTripCostPercent(pos.assumed_slippage_percent) : (netUsd / Number(pos.size_usd)) * 100;
        const cost = gross - net;
        await svc.Position.update(pos.id, {
          status: "CLOSED",
          last_price: price,
          peak_price: peak,
          exit_price: exitPrice,
          exit_reason: exitReason,
          exit_tx_signature: exitSignature,
          exit_error: null,
          gross_pnl_percent: Number(gross.toFixed(2)),
          cost_percent: Number(cost.toFixed(2)),
          net_pnl_percent: Number(net.toFixed(2)),
          net_pnl_usd: Number((netUsd === null ? (net / 100) * Number(pos.size_usd) : netUsd).toFixed(2)),
          closed_at: new Date().toISOString()
        });
        closed += 1;
      }
    }

    // Kill switch, evaluated on realized P&L only.
    const closedRows = await svc.Position.filter({ status: "CLOSED" }, "-closed_at", 200);
    const realized = closedRows.reduce((sum, p) => sum + Number(p.net_pnl_usd || 0), 0);
    let streak = 0;
    for (const p of closedRows) {
      if (Number(p.net_pnl_usd || 0) < 0) streak += 1;
      else break;
    }

    let killed = null;
    if (cfg.run_status === "RUNNING") {
      if (cfg.max_loss_usd > 0 && realized <= -Math.abs(cfg.max_loss_usd)) {
        killed = `realized loss $${realized.toFixed(2)} breached the $${cfg.max_loss_usd} limit`;
      } else if (cfg.max_consecutive_losses > 0 && streak >= cfg.max_consecutive_losses) {
        killed = `${streak} consecutive losing trades`;
      }
    }

    await svc.AgentConfig.update(cfg.id, {
      last_sync_at: new Date().toISOString(),
      ...(killed ? { run_status: "PAUSED_KILL_SWITCH", pause_reason: killed } : {})
    });

    return Response.json({
      open: open.length,
      priced,
      closed,
      failed_exits: failedExits,
      realized_usd: Number(realized.toFixed(2)),
      loss_streak: streak,
      killed
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}