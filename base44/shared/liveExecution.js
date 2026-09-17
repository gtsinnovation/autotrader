// Live USDC <-> token execution: quote, guard, sign via Turnkey, broadcast,
// confirm, then record the real fill.
//
// Asymmetry is intentional. Entries are heavily gated — a refused buy costs
// nothing. Exits are never blocked by a rail, because refusing to sell strands
// a live position, which is the worse failure.

import { USDC_MINT } from "./marketData.js";
import { signSolanaMessage, walletAddress } from "./turnkey.js";
import {
  attachSignature,
  confirmTransaction,
  fetchFill,
  fetchSolBalanceLamports,
  fetchTokenBalanceRaw,
  messageBytes,
  sendRawTransaction
} from "./solana.js";

const JUP = "https://lite-api.jup.ag";
const USDC_DECIMALS = 6;

// A ceiling in code, above the configurable one. Config is data and can be
// edited by mistake; this constant is the backstop that a single bad number in
// the database cannot raise.
export const ABSOLUTE_MAX_LIVE_POSITION_USD = 250;

// Fees plus rent for a fresh token account. Below this a swap cannot land.
const MIN_SOL_LAMPORTS = 7_000_000;

async function jupiter(path, options) {
  const res = await fetch(`${JUP}${path}`, options);
  const text = await res.text();
  if (!res.ok) throw new Error(`Jupiter ${path} -> ${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

async function fetchQuote(inputMint, outputMint, amountRaw, slippageBps) {
  return await jupiter(
    `/swap/v1/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountRaw}&slippageBps=${slippageBps}`,
    { headers: { Accept: "application/json" } }
  );
}

async function buildSwapTransaction(quote, owner) {
  const out = await jupiter("/swap/v1/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: owner,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: { maxLamports: 2_000_000, priorityLevel: "high" }
      }
    })
  });
  if (!out?.swapTransaction) throw new Error("Jupiter returned no swap transaction");
  return out.swapTransaction;
}

async function signSendConfirm(base64Transaction, owner, mint) {
  const signature = await signSolanaMessage(messageBytes(base64Transaction));
  const signed = attachSignature(base64Transaction, signature);
  const txSignature = await sendRawTransaction(signed);
  await confirmTransaction(txSignature);
  const fill = await fetchFill(txSignature, owner, mint, USDC_MINT);
  return { txSignature, fill };
}

function startOfUtcDay() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

// Every rail that can refuse an entry, checked before anything is signed.
export async function checkEntryRails(svc, cfg, requestedUsd) {
  if (cfg.mode !== "LIVE") return { ok: false, reason: "agent is not in LIVE mode" };

  const ceiling = Math.min(
    Number(cfg.live_max_position_usd || 0),
    Number(cfg.max_position_usd || 0),
    ABSOLUTE_MAX_LIVE_POSITION_USD
  );
  if (!(ceiling > 0)) return { ok: false, reason: "live position ceiling is zero" };
  if (requestedUsd > ceiling) {
    return { ok: false, reason: `size $${requestedUsd} exceeds live ceiling $${ceiling}` };
  }

  const cap = Number(cfg.live_max_orders_per_day || 0);
  if (cap > 0) {
    const today = await svc.LiveOrder.filter({ side: "BUY", created_date: { $gte: startOfUtcDay() } }, "-created_date", 200);
    const sent = today.filter((o) => o.status !== "ABORTED").length;
    if (sent >= cap) return { ok: false, reason: `daily live order cap reached (${sent}/${cap})` };
  }

  const lamports = await fetchSolBalanceLamports(walletAddress());
  if (lamports < MIN_SOL_LAMPORTS) {
    return { ok: false, reason: `wallet SOL too low for fees (${(lamports / 1e9).toFixed(4)} SOL)` };
  }

  const usdc = await fetchTokenBalanceRaw(walletAddress(), USDC_MINT);
  const usdcAvailable = Number(usdc.amount_raw) / 10 ** USDC_DECIMALS;
  if (usdcAvailable < requestedUsd) {
    return { ok: false, reason: `wallet USDC $${usdcAvailable.toFixed(2)} below size $${requestedUsd}` };
  }

  return { ok: true, size_usd: Math.min(requestedUsd, ceiling) };
}

// Buys `sizeUsd` of `mint` with USDC. Re-quotes immediately before signing and
// abandons the trade if the route degraded past tolerance.
export async function executeLiveBuy(svc, cfg, snap, sizeUsd) {
  const owner = walletAddress();
  const tolerance = Number(cfg.live_max_slippage_percent || 2);
  const amountRaw = Math.round(sizeUsd * 10 ** USDC_DECIMALS);

  const order = await svc.LiveOrder.create({
    side: "BUY",
    token_address: snap.token_address,
    symbol: snap.symbol,
    size_usd: sizeUsd,
    status: "QUOTING"
  });

  try {
    const quote = await fetchQuote(USDC_MINT, snap.token_address, amountRaw, Math.round(tolerance * 100));
    const impact = Math.abs(Number(quote?.priceImpactPct || 0)) * 100;
    await svc.LiveOrder.update(order.id, { quoted_impact_percent: Number(impact.toFixed(3)) });

    // Slippage abort: the gate measured impact minutes ago, this is now.
    if (impact > tolerance) {
      const reason = `route degraded to ${impact.toFixed(2)}% impact, above ${tolerance}% tolerance`;
      await svc.LiveOrder.update(order.id, { status: "ABORTED", abort_reason: reason });
      return { ok: false, reason, order_id: order.id };
    }

    const base64Transaction = await buildSwapTransaction(quote, owner);
    await svc.LiveOrder.update(order.id, { status: "SUBMITTED" });

    const { txSignature, fill } = await signSendConfirm(base64Transaction, owner, snap.token_address);
    const tokenRaw = fill.token_delta_raw;
    const usdcSpent = Number(-fill.quote_delta_raw) / 10 ** USDC_DECIMALS;
    if (tokenRaw <= 0n) throw new Error("transaction confirmed but no tokens were received");

    const decimals = fill.token_decimals ?? 9;
    const tokens = Number(tokenRaw) / 10 ** decimals;
    const fillPrice = usdcSpent / tokens;

    await svc.LiveOrder.update(order.id, {
      status: "CONFIRMED",
      tx_signature: txSignature,
      filled_token_amount: tokens,
      filled_usdc_amount: Number(usdcSpent.toFixed(4)),
      fill_price_usd: fillPrice
    });

    return {
      ok: true,
      order_id: order.id,
      tx_signature: txSignature,
      fill_price_usd: fillPrice,
      usdc_spent: usdcSpent,
      token_amount_raw: tokenRaw.toString(),
      token_decimals: decimals,
      realized_slippage_percent: Number(impact.toFixed(3))
    };
  } catch (error) {
    await svc.LiveOrder.update(order.id, { status: "FAILED", abort_reason: error.message.slice(0, 400) });
    return { ok: false, reason: error.message, order_id: order.id };
  }
}

// Sells the position's actual on-chain balance back to USDC. Uses the wallet
// balance rather than the stored amount so a partial or dusty holding still
// exits cleanly, and never aborts on impact.
export async function executeLiveSell(svc, position) {
  const owner = walletAddress();
  const order = await svc.LiveOrder.create({
    side: "SELL",
    token_address: position.token_address,
    symbol: position.symbol,
    position_id: position.id,
    status: "QUOTING"
  });

  try {
    const held = await fetchTokenBalanceRaw(owner, position.token_address);
    if (held.amount_raw <= 0n) throw new Error("wallet holds none of this token");

    const quote = await fetchQuote(position.token_address, USDC_MINT, held.amount_raw.toString(), 500);
    const impact = Math.abs(Number(quote?.priceImpactPct || 0)) * 100;
    const base64Transaction = await buildSwapTransaction(quote, owner);
    await svc.LiveOrder.update(order.id, {
      status: "SUBMITTED",
      quoted_impact_percent: Number(impact.toFixed(3))
    });

    const { txSignature, fill } = await signSendConfirm(base64Transaction, owner, position.token_address);
    const usdcReceived = Number(fill.quote_delta_raw) / 10 ** USDC_DECIMALS;
    const decimals = fill.token_decimals ?? Number(position.token_decimals || 9);
    const tokensSold = Number(-fill.token_delta_raw) / 10 ** decimals;
    if (usdcReceived <= 0) throw new Error("transaction confirmed but no USDC was received");

    await svc.LiveOrder.update(order.id, {
      status: "CONFIRMED",
      tx_signature: txSignature,
      filled_token_amount: tokensSold,
      filled_usdc_amount: Number(usdcReceived.toFixed(4)),
      fill_price_usd: tokensSold > 0 ? usdcReceived / tokensSold : null
    });

    return {
      ok: true,
      order_id: order.id,
      tx_signature: txSignature,
      usdc_received: usdcReceived,
      exit_price_usd: tokensSold > 0 ? usdcReceived / tokensSold : null,
      realized_slippage_percent: Number(impact.toFixed(3))
    };
  } catch (error) {
    await svc.LiveOrder.update(order.id, { status: "FAILED", abort_reason: error.message.slice(0, 400) });
    return { ok: false, reason: error.message, order_id: order.id };
  }
}