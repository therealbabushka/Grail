import crypto from "node:crypto"

/**
 * BitSkins classic API (v1) — https://bitskins.com/api/v1/{endpoint}/
 * Auth: `api_key` + `code` (6-digit TOTP from the account 2FA secret) + `app_id`.
 * @see https://bitskins.com/docs/api#api-introduction
 */
function decodeBase32(secret: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  let bits = ""
  const upper = secret.replace(/[\s=]/g, "").toUpperCase()
  for (const c of upper) {
    const v = alphabet.indexOf(c)
    if (v === -1) throw new Error(`invalid base32 character: ${c}`)
    bits += v.toString(2).padStart(5, "0")
  }
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2))
  }
  return Buffer.from(bytes)
}

/** RFC 6238 TOTP, SHA-1, 30s step, 6 digits (matches common BitSkins / GA setups). */
export function bitskinsTotpCode(secretBase32: string): string {
  const key = decodeBase32(secretBase32)
  const step = 30
  const counter = Math.floor(Date.now() / 1000 / step)
  const buf = Buffer.alloc(8)
  buf.writeUInt32BE(0, 0)
  buf.writeUInt32BE(counter, 4)
  const hmac = crypto.createHmac("sha1", key).update(buf).digest()
  const offset = hmac[hmac.length - 1]! & 0x0f
  const bin =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff)
  const code = bin % 1_000_000
  return String(code).padStart(6, "0")
}

export async function bitskinsV1Get(
  endpoint: string,
  apiKey: string,
  secret: string,
  extra: Record<string, string | number> = {},
  appId = 730,
) {
  const code = bitskinsTotpCode(secret)
  const sp = new URLSearchParams()
  sp.set("api_key", apiKey)
  sp.set("code", code)
  sp.set("app_id", String(appId))
  for (const [k, v] of Object.entries(extra)) {
    if (v === undefined || v === null) continue
    sp.set(k, String(v))
  }

  const url = `https://bitskins.com/api/v1/${endpoint}/?${sp.toString()}`
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Grail/1.0 (+market cockpit)",
    },
    cache: "no-store",
  })

  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { parseError: true, text: text.slice(0, 800) }
  }

  const body = json as { status?: string; data?: unknown; [k: string]: unknown }
  const ok = res.ok && body?.status === "success"
  return { ok, status: res.status, json: body }
}
