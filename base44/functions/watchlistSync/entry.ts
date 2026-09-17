import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { fetchSnapshots } from "../../shared/marketData.js";

// Refresh live price/liquidity for the operator's watchlist, and resolve the
// symbol of a newly added mint from Jupiter rather than trusting typed input.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const svc = base44.asServiceRole.entities;
    const rows = await svc.Watchlist.list("-created_date", 100);
    if (!rows.length) return Response.json({ refreshed: 0 });

    const snapshots = await fetchSnapshots(rows.map((r) => r.token_address));
    const byMint = new Map(snapshots.map((s) => [s.token_address, s]));
    const now = new Date().toISOString();

    const updates = rows
      .filter((r) => byMint.has(r.token_address))
      .map((r) => {
        const s = byMint.get(r.token_address);
        return {
          id: r.id,
          symbol: r.symbol || s.symbol,
          last_price_usd: s.price_usd,
          last_liquidity_usd: s.liquidity_usd,
          last_checked_at: now
        };
      });

    if (updates.length) await svc.Watchlist.bulkUpdate(updates);
    return Response.json({ refreshed: updates.length, unresolved: rows.length - updates.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}