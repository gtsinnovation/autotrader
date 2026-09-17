// Keyless Solana market data, read-only. Jupiter's token API is the single
// source: one request returns price, liquidity, 1h trade stats, holder count,
// mint/freeze authority state, top-holder concentration, dev balance and an
// organic-vs-bot volume split — the facts every entry gate needs.
// Jupiter's quote endpoint supplies real price impact for the position size.

const JUP = "https://lite-api.jup.ag";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL_MINT = "So11111111111111111111111111111111111111112";
const UA = "solana-autotrader/1.0";

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": UA } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return await res.json();
}

// Strip control / zero-width / bidi characters from attacker-chosen token metadata.
export function sanitizeText(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .slice(0, 64)
    .trim();
}

// Two independent slices of the market: what is being traded most right now,
// and what just launched. Rows already carry every field the gates need, so
// discovery and snapshot are the same call.
export async function discoverSnapshots(limit = 60) {
  const feeds = [
    `${JUP}/tokens/v2/toporganicscore/1h?limit=50`,
    `${JUP}/tokens/v2/toptraded/1h?limit=30`,
    `${JUP}/tokens/v2/recent?limit=30`
  ];
  const byMint = new Map();
  for (const url of feeds) {
    try {
      const rows = await getJson(url);
      for (const row of Array.isArray(rows) ? rows : []) {
        const snap = normalizeToken(row);
        if (snap && !byMint.has(snap.token_address)) byMint.set(snap.token_address, snap);
      }
    } catch (err) {
      console.warn("discovery feed failed", url, err.message);
    }
  }
  return Array.from(byMint.values()).slice(0, limit);
}

export async function fetchSnapshots(mints) {
  if (!mints.length) return [];
  const rows = await getJson(`${JUP}/tokens/v2/search?query=${mints.slice(0, 100).join(",")}`);
  return (Array.isArray(rows) ? rows : []).map(normalizeToken).filter(Boolean);
}

export async function fetchPrices(mints) {
  const prices = {};
  for (const s of await fetchSnapshots(mints)) prices[s.token_address] = s.price_usd;
  return prices;
}

function normalizeToken(t) {
  if (!t?.id) return null;
  const s = t.stats1h || {};
  const audit = t.audit || {};
  const buyVol = Number(s.buyVolume || 0);
  const sellVol = Number(s.sellVolume || 0);
  const volume = buyVol + sellVol;
  const organic = Number(s.buyOrganicVolume || 0) + Number(s.sellOrganicVolume || 0);
  const created = t?.firstPool?.createdAt ? Date.parse(t.firstPool.createdAt) : null;

  return {
    token_address: t.id,
    symbol: sanitizeText(t.symbol),
    name: sanitizeText(t.name),
    launchpad: sanitizeText(t.launchpad || t.metaLaunchpad || ""),
    price_usd: Number(t.usdPrice || 0),
    liquidity_usd: Number(t.liquidity || 0),
    fdv_usd: Number(t.fdv || t.mcap || 0),
    volume_h1_usd: volume,
    buys_h1: Number(s.numBuys || 0),
    sells_h1: Number(s.numSells || 0),
    txns_h1: Number(s.numBuys || 0) + Number(s.numSells || 0),
    traders_h1: Number(s.numTraders || 0),
    net_buyers_h1: Number(s.numNetBuyers || 0),
    buy_volume_share: volume > 0 ? (buyVol / volume) * 100 : null,
    organic_volume_share: volume > 0 ? (organic / volume) * 100 : null,
    organic_score: Number(t.organicScore || 0),
    organic_score_label: sanitizeText(t.organicScoreLabel || ""),
    holder_count: Number(t.holderCount || 0),
    top_holders_percent: numOrNull(audit.topHoldersPercent),
    dev_balance_percent: numOrNull(audit.devBalancePercentage),
    mint_authority_disabled: audit.mintAuthorityDisabled ?? (t.mintAuthority == null),
    freeze_authority_disabled: audit.freezeAuthorityDisabled ?? (t.freezeAuthority == null),
    price_change_m5: numOrNull(t?.stats5m?.priceChange) ?? 0,
    price_change_h1: numOrNull(s.priceChange) ?? 0,
    liquidity_change_h1: numOrNull(s.liquidityChange) ?? 0,
    pair_age_minutes: created ? Math.round((Date.now() - created) / 60000) : null,
    is_verified: Boolean(t.isVerified)
  };
}

function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Real price impact for a position-sized buy. Returns null when unmeasurable —
// never a fabricated zero, because the slippage gate would then pass on nothing.
export async function fetchPriceImpactPercent(mint, usdSize) {
  try {
    const amount = Math.max(1, Math.round(usdSize * 1e6)); // USDC has 6 decimals
    const quote = await getJson(
      `${JUP}/swap/v1/quote?inputMint=${USDC_MINT}&outputMint=${mint}&amount=${amount}&slippageBps=300`
    );
    const impact = Number(quote?.priceImpactPct);
    return Number.isFinite(impact) ? Math.abs(impact) * 100 : null;
  } catch (err) {
    console.warn("price impact probe failed", mint, err.message);
    return null;
  }
}

export { SOL_MINT, USDC_MINT };