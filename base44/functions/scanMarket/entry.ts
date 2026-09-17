import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { discoverSnapshots, fetchPriceImpactPercent } from "../../shared/marketData.js";
import { runGates, roundTripCostPercent } from "../../shared/gates.js";
import { getConfig, assertOperator } from "../../shared/agent.js";

const COOLDOWN_MINUTES = 60; // one evaluation per token per hour
const MAX_IMPACT_PROBES = 10; // stay polite to Jupiter's keyless endpoint

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    if (!(await assertOperator(base44))) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const cfg = await getConfig(base44);
    const svc = base44.asServiceRole.entities;

    const snapshots = await discoverSnapshots(60);
    if (!snapshots.length) {
      return Response.json({ candidates: 0, note: "no candidates returned by discovery feeds" });
    }

    // Skip tokens already held, and tokens evaluated inside the cooldown.
    const openPositions = await svc.Position.filter({ status: "OPEN" });
    const held = new Set(openPositions.map((p) => p.token_address));
    const cutoff = new Date(Date.now() - COOLDOWN_MINUTES * 60000).toISOString();
    const recent = await svc.Signal.filter({ created_date: { $gte: cutoff } }, "-created_date", 500);
    const seen = new Set(recent.map((s) => s.token_address));

    const fresh = snapshots.filter(
      (s) => s.price_usd > 0 && !held.has(s.token_address) && !seen.has(s.token_address)
    );

    // Two passes. The free gates run on every candidate first; only the ones
    // that clear all of them are worth a network round-trip to Jupiter for a
    // real price-impact quote.
    const shortlist = [];
    const results = [];
    for (const snap of fresh) {
      const dry = runGates(snap, cfg);
      const blockers = dry.gates.filter((g) => !g.passed && g.name !== "SLIPPAGE");
      if (!blockers.length) shortlist.push(snap);
      else if (blockers.length <= 2) results.push({ snap, evaluated: dry }); // near-miss, worth logging
    }

    shortlist.sort((a, b) => b.liquidity_usd - a.liquidity_usd);
    for (const snap of shortlist.slice(0, MAX_IMPACT_PROBES)) {
      snap.price_impact_percent = await fetchPriceImpactPercent(snap.token_address, cfg.max_position_usd);
      results.push({ snap, evaluated: runGates(snap, cfg) });
    }

    // Capacity is decided once, then consumed as positions open.
    const deployed = openPositions.reduce((sum, p) => sum + Number(p.size_usd || 0), 0);
    let slots = Math.max(0, Number(cfg.max_open_positions) - openPositions.length);
    let capital = Math.max(0, Number(cfg.total_capital_usd) - deployed);
    const tradingOpen = cfg.run_status === "RUNNING";

    let opened = 0;
    const approvedFirst = results.sort((a, b) => b.evaluated.score - a.evaluated.score).slice(0, 20);

    for (const { snap, evaluated } of approvedFirst) {
      let skipReason = null;
      let openedPosition = false;

      if (evaluated.verdict === "APPROVED") {
        if (!tradingOpen) skipReason = `entries blocked: ${cfg.run_status}`;
        else if (slots <= 0) skipReason = "max open positions reached";
        else if (capital < cfg.max_position_usd) skipReason = "capital allocation exhausted";
        else {
          const size = Number(cfg.max_position_usd);
          const entry = snap.price_usd;
          await svc.Position.create({
            token_address: snap.token_address,
            symbol: snap.symbol,
            pair_address: snap.pair_address,
            size_usd: size,
            entry_price: entry,
            last_price: entry,
            peak_price: entry,
            take_profit_price: entry * (1 + cfg.take_profit_percent / 100),
            stop_loss_price: entry * (1 - cfg.stop_loss_percent / 100),
            trailing_stop_percent: cfg.trailing_stop_percent,
            entry_score: evaluated.score,
            assumed_slippage_percent: snap.price_impact_percent,
            status: "OPEN",
            opened_at: new Date().toISOString()
          });
          slots -= 1;
          capital -= size;
          opened += 1;
          openedPosition = true;
        }
      }

      await svc.Signal.create({
        ...snap,
        price_impact_measured: snap.price_impact_percent !== null && snap.price_impact_percent !== undefined,
        gates: evaluated.gates,
        verdict: evaluated.verdict,
        rejected_by: evaluated.rejected_by,
        reject_reason: evaluated.reject_reason,
        score: evaluated.score,
        opened_position: openedPosition,
        skip_reason: skipReason
      });
    }

    await base44.asServiceRole.entities.AgentConfig.update(cfg.id, { last_scan_at: new Date().toISOString() });

    return Response.json({
      candidates: snapshots.length,
      evaluated: results.length,
      approved: results.filter((r) => r.evaluated.verdict === "APPROVED").length,
      opened,
      example_cost_percent: roundTripCostPercent(1)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}