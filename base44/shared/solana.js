// Solana RPC access: broadcast, confirm, and read what a trade actually filled.
// Read-only calls tolerate the public endpoint; broadcasting is where a private
// RPC matters, so SOLANA_RPC_URL is used whenever it is set.

import { secrets } from "base44:runtime";

const PUBLIC_RPC = "https://api.mainnet-beta.solana.com";

export function rpcUrl() {
  try {
    return secrets.get("SOLANA_RPC_URL") || PUBLIC_RPC;
  } catch (_err) {
    return PUBLIC_RPC;
  }
}

export async function rpc(method, params) {
  const res = await fetch(rpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
  });
  if (!res.ok) throw new Error(`RPC ${method} -> ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`RPC ${method}: ${json.error.message}`);
  return json.result;
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// A serialized transaction is: compact-u16 signature count, then 64 bytes per
// signature, then the message. Jupiter returns it with a zeroed slot for the
// fee payer, which is the slot the wallet signature belongs in.
export function attachSignature(base64Transaction, signature) {
  const bytes = base64ToBytes(base64Transaction);
  const count = bytes[0];
  if (count < 1 || count > 8) throw new Error(`unexpected signature count ${count}`);
  if (signature.length !== 64) throw new Error("signature must be 64 bytes");
  bytes.set(signature, 1);
  return bytesToBase64(bytes);
}

export function messageBytes(base64Transaction) {
  const bytes = base64ToBytes(base64Transaction);
  const count = bytes[0];
  return bytes.slice(1 + count * 64);
}

export async function sendRawTransaction(base64Transaction) {
  return await rpc("sendTransaction", [
    base64Transaction,
    { encoding: "base64", skipPreflight: false, maxRetries: 3, preflightCommitment: "confirmed" }
  ]);
}

// Polls until the network commits or rejects the transaction.
export async function confirmTransaction(signature, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await rpc("getSignatureStatuses", [[signature], { searchTransactionHistory: false }]);
    const status = result?.value?.[0];
    if (status) {
      if (status.err) throw new Error(`transaction failed on-chain: ${JSON.stringify(status.err).slice(0, 200)}`);
      if (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized") return status;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("transaction not confirmed before timeout");
}

// The authoritative record of a fill: token balance deltas for our own wallet,
// straight from the committed transaction rather than from the quote.
export async function fetchFill(signature, owner, mint, quoteMint) {
  const tx = await rpc("getTransaction", [
    signature,
    { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }
  ]);
  if (!tx) throw new Error("confirmed transaction could not be read back");

  const pre = tx.meta?.preTokenBalances || [];
  const post = tx.meta?.postTokenBalances || [];
  const amountFor = (rows, targetMint) => {
    const row = rows.find((r) => r.owner === owner && r.mint === targetMint);
    return row ? BigInt(row.uiTokenAmount.amount) : 0n;
  };
  const decimalsFor = (targetMint) => {
    const row = [...post, ...pre].find((r) => r.mint === targetMint);
    return row ? Number(row.uiTokenAmount.decimals) : null;
  };

  return {
    token_delta_raw: amountFor(post, mint) - amountFor(pre, mint),
    quote_delta_raw: amountFor(post, quoteMint) - amountFor(pre, quoteMint),
    token_decimals: decimalsFor(mint),
    fee_lamports: Number(tx.meta?.fee || 0),
    slot: Number(tx.slot || 0)
  };
}

export async function fetchSolBalanceLamports(address) {
  const out = await rpc("getBalance", [address, { commitment: "confirmed" }]);
  return Number(out?.value || 0);
}

export async function fetchTokenBalanceRaw(owner, mint) {
  const out = await rpc("getTokenAccountsByOwner", [
    owner,
    { mint },
    { encoding: "jsonParsed", commitment: "confirmed" }
  ]);
  let total = 0n;
  let decimals = null;
  for (const account of out?.value || []) {
    const info = account.account?.data?.parsed?.info?.tokenAmount;
    if (!info) continue;
    total += BigInt(info.amount);
    decimals = Number(info.decimals);
  }
  return { amount_raw: total, decimals };
}