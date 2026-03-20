import { bitskinsTotpCode } from "@/lib/pricing/bitskins-v1"

/**
 * BitSkins API v2 — https://bitskins.com/api/v2/{endpoint}/
 *
 * Auth: `api_key` + `code` (6-digit TOTP from the account 2FA secret) + `app_id`.
 * Note: we intentionally keep the same auth mechanism as v1 to match the
 * existing BitSkins account setup in this project.
 */
export async function bitskinsV2Get(
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

  const url = `https://bitskins.com/api/v2/${endpoint}/?${sp.toString()}`
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

