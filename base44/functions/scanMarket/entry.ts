import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { discoverSolanaAddresses, fetchPairSnapshots, normalizeSnapshot } from "../../shared/market.ts";
import { evaluate, exitLevels } from "../../shared/gateEngine.ts";
import { loadConfig, log } from "../../shared/agentState.ts";

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (_e) {
      user = null; // scheduled workflow run — no user session
    }
    if (user && user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const cfg = await loadConfig(base44);
    const svc = base44.asServiceRole;

    const found = await discoverSolanaAddresses(24);
    if (!found.length) {
      await log(base44, { action: "SCAN_TICK", detail: "no candidates returned by discovery", severity: "warn" });
      return Response.json({ scanned: 0, approved: 0, opened: 0 });
    }

    const sourceByAddr = new Map(found.map((f) => [f.address, f.source]));
    const pairs = await fetchPairSnapshots(found.map((f) => f.address));

    const openPositions = await svc.entities.Position.filter({ status: "open" });
    const openAddresses = new Set(openPositions.map((p) => p.token_address));
    let deployed = openPositions.reduce((sum, p) => sum + (p.allocated_usd || 0) * ((p.remaining_pct || 100) / 100), 0);
    let slots = Math.max(cfg.max_open_positions - openPositions.length, 0);

    const evaluated = [];
    for (const [addr, pair] of pairs) {
      const snapshot = normalizeSnapshot(pair, sourceByAddr.get(addr));
      evaluated.push(evaluate(snapshot, cfg));
    }
    evaluated.sort((a, b) => b.conviction - a.conviction);

    if (evaluated.length) await svc.entities.TokenCandidate.bulkCreate(evaluated);

    let opened = 0;
    for (const c of evaluated) {
      if (c.decision !== "approved") continue;
      if (cfg.kill_switch) {
        await log(base44, {
          action: "ENTRY_BLOCKED",
          severity: "warn",
          token_address: c.token_address,
          symbol: c.symbol,
          detail: "kill switch engaged",
        });
        continue;
      }
      if (slots <= 0 || openAddresses.has(c.token_address)) continue;

      const size = Math.min(cfg.max_position_usd, Math.max(cfg.capital_cap_usd - deployed, 0));
      if (size < 1) {
        await log(base44, {
          action: "ENTRY_BLOCKED",
          severity: "warn",
          token_address: c.token_address,
          symbol: c.symbol,
          detail: "capital cap reached",
        });
        break;
      }

      const levels = exitLevels(c.price_usd, c.atr_proxy_pct, cfg);
      await svc.entities.Position.create({
        token_address: c.token_address,
        symbol: c.symbol,
        pair_address: c.pair_address,
        mode: cfg.mode,
        status: "open",
        entry_price: c.price_usd,
        allocated_usd: size,
        remaining_pct: 100,
        stop_price: levels.stop_price,
        target_price: levels.target_price,
        peak_price: c.price_usd,
        last_price: c.price_usd,
        trailing_armed: false,
        mev_protected: cfg.mev_protection,
        slippage_ceiling_bps: c.slippage_ceiling_bps,
        conviction: c.conviction,
        fills: [],
      });
      await log(base44, {
        action: "ENTRY_APPROVED",
        token_address: c.token_address,
        symbol: c.symbol,
        amount_usd: size,
        detail: `conviction ${c.conviction}, risk ${c.structure_risk}, ${c.slippage_ceiling_bps}bps, ${cfg.mode}`,
      });
      deployed += size;
      slots -= 1;
      openAddresses.add(c.token_address);
      opened += 1;
    }

    const approved = evaluated.filter((c) => c.decision === "approved").length;
    await log(base44, {
      action: "SCAN_TICK",
      detail: `${evaluated.length} evaluated, ${approved} approved, ${opened} opened`,
    });

    return Response.json({ scanned: evaluated.length, approved, opened });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}