// Turnkey API access for the agent's sign-only service user.
// Two jobs: stamp every request with a P-256 signature over the exact body,
// and sign Solana transaction messages with the ed25519 wallet key.
//
// The POLICY credentials are used deliberately: that service user is scoped by
// Turnkey policy to signing only, so a bug here cannot create wallets or keys.

import { secrets } from "base44:runtime";

const TURNKEY_BASE = "https://api.turnkey.com";

// secp256r1 (P-256) field parameters, needed to recover y from the compressed
// public key so the private scalar can be imported as a JWK.
const P = BigInt("0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff");
const A = P - 3n;
const B = BigInt("0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b");

function hexToBytes(hex) {
  const clean = String(hex).replace(/^0x/, "").trim();
  if (clean.length % 2 !== 0) throw new Error("odd-length hex");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function base64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function modPow(base, exp, mod) {
  let result = 1n;
  let b = base % mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= 1n;
  }
  return result;
}

function bigToBytes32(n) {
  const hex = n.toString(16).padStart(64, "0");
  return hexToBytes(hex);
}

// Compressed SEC1 point (33 bytes, 0x02/0x03 prefix) -> { x, y } byte pairs.
function decompressPoint(compressedHex) {
  const bytes = hexToBytes(compressedHex);
  if (bytes.length !== 33 || (bytes[0] !== 2 && bytes[0] !== 3)) {
    throw new Error("TURNKEY public key is not a 33-byte compressed P-256 point");
  }
  const x = BigInt("0x" + bytesToHex(bytes.slice(1)));
  const ySquared = (modPow(x, 3n, P) + A * x + B) % P;
  // p ≡ 3 mod 4, so the square root is y = ySquared^((p+1)/4).
  let y = modPow(ySquared, (P + 1n) / 4n, P);
  const wantOdd = bytes[0] === 3;
  if ((y % 2n === 1n) !== wantOdd) y = P - y;
  return { x: bigToBytes32(x), y: bigToBytes32(y) };
}

async function importStampKey() {
  const privateHex = secrets.get("TURNKEY_POLICY_API_PRIVATE_KEY");
  const publicHex = secrets.get("TURNKEY_POLICY_API_PUBLIC_KEY");
  if (!privateHex || !publicHex) throw new Error("Turnkey policy API credentials are not configured");

  const { x, y } = decompressPoint(publicHex);
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: base64url(hexToBytes(privateHex)),
    x: base64url(x),
    y: base64url(y),
    ext: true
  };
  return await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

// WebCrypto emits raw r||s; Turnkey stamps expect DER.
function rawToDer(raw) {
  const encodeInt = (bytes) => {
    let i = 0;
    while (i < bytes.length - 1 && bytes[i] === 0) i++;
    let value = bytes.slice(i);
    if (value[0] & 0x80) value = new Uint8Array([0, ...value]);
    return new Uint8Array([0x02, value.length, ...value]);
  };
  const r = encodeInt(raw.slice(0, 32));
  const s = encodeInt(raw.slice(32, 64));
  const body = new Uint8Array([...r, ...s]);
  return new Uint8Array([0x30, body.length, ...body]);
}

async function stampedFetch(path, bodyObject) {
  const body = JSON.stringify(bodyObject);
  const key = await importStampKey();
  const raw = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(body))
  );
  const stamp = base64url(
    new TextEncoder().encode(
      JSON.stringify({
        publicKey: String(secrets.get("TURNKEY_POLICY_API_PUBLIC_KEY")).replace(/^0x/, ""),
        scheme: "SIGNATURE_SCHEME_TK_API_P256",
        signature: bytesToHex(rawToDer(raw))
      })
    )
  );

  const res = await fetch(`${TURNKEY_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Stamp": stamp },
    body
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Turnkey ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

export function walletAddress() {
  const address = secrets.get("TURNKEY_SIGN_WITH");
  if (!address) throw new Error("TURNKEY_SIGN_WITH is not configured");
  return address;
}

// Confirms the credentials and policy work without moving any funds.
export async function turnkeyWhoami() {
  const organizationId = secrets.get("TURNKEY_ORGANIZATION_ID");
  if (!organizationId) throw new Error("TURNKEY_ORGANIZATION_ID is not configured");
  const out = await stampedFetch("/public/v1/query/whoami", { organizationId });
  return { organizationId: out.organizationId, userId: out.userId, username: out.username };
}

// Signs raw Solana transaction-message bytes. ed25519 signs the message
// directly, so no client-side hashing is applied.
export async function signSolanaMessage(messageBytes) {
  const organizationId = secrets.get("TURNKEY_ORGANIZATION_ID");
  if (!organizationId) throw new Error("TURNKEY_ORGANIZATION_ID is not configured");

  const out = await stampedFetch("/public/v1/submit/sign_raw_payload", {
    type: "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2",
    timestampMs: String(Date.now()),
    organizationId,
    parameters: {
      signWith: walletAddress(),
      payload: bytesToHex(messageBytes),
      encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
      hashFunction: "HASH_FUNCTION_NOT_APPLICABLE"
    }
  });

  const activity = out?.activity;
  const result = activity?.result?.signRawPayloadResult;
  if (!result?.r || !result?.s) {
    throw new Error(`Turnkey did not return a signature (status ${activity?.status || "unknown"})`);
  }
  const r = hexToBytes(result.r.padStart(64, "0"));
  const s = hexToBytes(result.s.padStart(64, "0"));
  return new Uint8Array([...r, ...s]);
}

export { hexToBytes, bytesToHex };