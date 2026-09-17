import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { getConfig } from "../../shared/agent.js";
import { turnkeyWhoami, walletAddress } from "../../shared/turnkey.js";
import { fetchSolBalanceLamports, fetchTokenBalanceRaw, rpcUrl } from "../../shared/solana.js";
import { USDC_MINT } from "../../shared/marketData.js";
import { ABSOLUTE_MAX_LIVE_POSITION_USD } from "../../shared/liveExecution.js";

// Live-execution preflight. Proves the Turnkey credentials, the wallet and the
// RPC all work, and reports the rails in force — without signing a transaction.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const cfg = await getConfig(base44);
    const svc = base44.asServiceRole.entities;

    let turnkey = null;
    let turnkeyError = null;
    let address = null;
    try {
      address = walletAddress();
      turnkey = await turnkeyWhoami();
    } catch (error) {
      turnkeyError = error.message;
    }

    let sol = null;
    let usdc = null;
    let rpcError = null;
    if (address) {
      try {
        sol = (await fetchSolBalanceLamports(address)) / 1e9;
        const balance = await fetchTokenBalanceRaw(address, USDC_MINT);
        usdc = Number(balance.amount_raw) / 1e6;
      } catch (error) {
        rpcError = error.message;
      }
    }

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const todaysBuys = await svc.LiveOrder.filter(
      { side: "BUY", created_date: { $gte: startOfDay.toISOString() } },
      "-created_date",
      200
    );

    const ceiling = Math.min(
      Number(cfg.live_max_position_usd || 0),
      Number(cfg.max_position_usd || 0),
      ABSOLUTE_MAX_LIVE_POSITION_USD
    );

    return Response.json({
      mode: cfg.mode,
      run_status: cfg.run_status,
      wallet_address: address,
      turnkey_ok: Boolean(turnkey),
      turnkey_user_id: turnkey?.userId || null,
      turnkey_error: turnkeyError,
      rpc_host: new URL(rpcUrl()).host,
      rpc_error: rpcError,
      sol_balance: sol,
      usdc_balance: usdc,
      effective_ceiling_usd: ceiling,
      absolute_ceiling_usd: ABSOLUTE_MAX_LIVE_POSITION_USD,
      slippage_tolerance_percent: Number(cfg.live_max_slippage_percent || 0),
      orders_today: todaysBuys.filter((o) => o.status !== "ABORTED").length,
      orders_per_day_cap: Number(cfg.live_max_orders_per_day || 0),
      ready:
        Boolean(turnkey) && !rpcError && Number(sol) > 0.007 && Number(usdc) >= ceiling && ceiling > 0
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}