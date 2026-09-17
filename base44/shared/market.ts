// DexScreener market data access (no API key required).
const BASE = "https://api.dexscreener.com";

export function sanitizeText(value, max = 40) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F<>]/g, "")
    .trim()
    .slice(0, max);
}

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`dexscreener ${res.status} for ${url}`);
  return await res.json();
}

// Discovery: newest token profiles + boosted tokens, Solana only.
export async function discoverSolanaAddresses(limit = 24) {
  const sources = [
    { url: `${BASE}/token-profiles/latest/v1`, source: "dexscreener_profiles" },
    { url: `${BASE}/token-boosts/latest/v1`, source: "dexscreener_boosts" },
  ];
  const seen = new Map();
  for (const s of sources) {
    let rows = [];
    try {
      rows = await getJson(s.url);
    } catch (_e) {
      continue;
    }
    for (const r of Array.isArray(rows) ? rows : []) {
      if (r?.chainId !== "solana" || !r?.tokenAddress) continue;
      if (!seen.has(r.tokenAddress)) seen.set(r.tokenAddress, s.source);
      if (seen.size >= limit) break;
    }
    if (seen.size >= limit) break;
  }
  return [...seen.entries()].map(([address, source]) => ({ address, source }));
}

// Best (deepest) Solana pair snapshot per token. Accepts up to 30 addresses per call.
export async function fetchPairSnapshots(addresses) {
  const out = new Map();
  for (let i = 0; i < addresses.length; i += 30) {
    const chunk = addresses.slice(i, i + 30);
    let data;
    try {
      data = await getJson(`${BASE}/tokens/v1/solana/${chunk.join(",")}`);
    } catch (_e) {
      continue;
    }
    for (const p of Array.isArray(data) ? data : []) {
      if (p?.chainId !== "solana" || !p?.baseToken?.address) continue;
      const addr = p.baseToken.address;
      const prev = out.get(addr);
      const liq = Number(p?.liquidity?.usd || 0);
      if (prev && Number(prev?.liquidity?.usd || 0) >= liq) continue;
      out.set(addr, p);
    }
  }
  return out;
}

export function normalizeSnapshot(pair, source) {
  const created = Number(pair?.pairCreatedAt || 0);
  return {
    token_address: pair.baseToken.address,
    symbol: sanitizeText(pair?.baseToken?.symbol, 16),
    name: sanitizeText(pair?.baseToken?.name, 48),
    source: source || "dexscreener",
    dex: sanitizeText(pair?.dexId, 24),
    pair_address: sanitizeText(pair?.pairAddress, 64),
    price_usd: Number(pair?.priceUsd || 0),
    liquidity_usd: Number(pair?.liquidity?.usd || 0),
    fdv_usd: Number(pair?.fdv || 0),
    volume_24h_usd: Number(pair?.volume?.h24 || 0),
    volume_1h_usd: Number(pair?.volume?.h1 || 0),
    buys_1h: Number(pair?.txns?.h1?.buys || 0),
    sells_1h: Number(pair?.txns?.h1?.sells || 0),
    price_change_5m: Number(pair?.priceChange?.m5 ?? 0),
    price_change_1h: Number(pair?.priceChange?.h1 ?? 0),
    age_minutes: created ? Math.round((Date.now() - created) / 60000) : null,
  };
}