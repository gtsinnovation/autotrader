import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { getConfig } from "../../shared/agent.js";

const CHECKS = [
  { name: "Jupiter Token API", url: "https://lite-api.jup.ag/tokens/v2/recent?limit=1", method: "GET" },
  { name: "Jupiter Quote API", url: "https://lite-api.jup.ag/swap/v1/quote?inputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&outputMint=So11111111111111111111111111111111111111112&amount=1000000&slippageBps=300", method: "GET" }
];

// Live reachability + latency for every upstream the agent depends on.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const services = [];
    for (const check of CHECKS) {
      const started = Date.now();
      try {
        const res = await fetch(check.url, { headers: { Accept: "application/json" } });
        services.push({ name: check.name, ok: res.ok, status: res.status, latency_ms: Date.now() - started });
      } catch (err) {
        services.push({ name: check.name, ok: false, status: 0, latency_ms: Date.now() - started, error: err.message });
      }
    }

    // Solana mainnet RPC: current slot + node health.
    const rpcStart = Date.now();
    try {
      const res = await fetch("https://solana-rpc.publicnode.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getSlot" })
      });
      const json = await res.json();
      services.push({
        name: "Solana Mainnet RPC",
        ok: res.ok && Number.isFinite(json?.result),
        status: res.status,
        latency_ms: Date.now() - rpcStart,
        detail: json?.result ? `slot ${json.result}` : "no slot returned"
      });
    } catch (err) {
      services.push({ name: "Solana Mainnet RPC", ok: false, status: 0, latency_ms: Date.now() - rpcStart, error: err.message });
    }

    const cfg = await getConfig(base44);
    const svc = base44.asServiceRole.entities;
    const [openPositions, recentSignals] = await Promise.all([
      svc.Position.filter({ status: "OPEN" }),
      svc.Signal.list("-created_date", 1)
    ]);

    return Response.json({
      checked_at: new Date().toISOString(),
      services,
      agent: {
        run_status: cfg.run_status,
        mode: cfg.mode,
        pause_reason: cfg.pause_reason || null,
        open_positions: openPositions.length,
        last_scan_at: cfg.last_scan_at || null,
        last_sync_at: cfg.last_sync_at || null,
        last_signal_at: recentSignals[0]?.created_date || null,
        config_created_at: cfg.created_date || null
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}