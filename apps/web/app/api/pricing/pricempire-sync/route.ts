import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { fetchItemPrices, transformToSnapshotRows } from "@/lib/pricing/pricempire"

const DEFAULT_SOURCES = [
  "buff163",
  "skinport",
  "dmarket",
  "waxpeer",
  "csmoney",
  "steam",
  "bitskins",
  "csfloat",
] as const

/** Item types to fetch — each type = 1 API call. Prioritize high-value categories. */
const ITEM_TYPES = [
  "weapon",
  "sticker",
  "container",
  "key",
  "agent",
  "patch",
  "graffiti",
  "charm",
  "souvenir-package",
  "pin-capsule",
  "other",
] as const

function toUtcDayStartIso(d: Date) {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x.toISOString()
}

function isAuthorized(request: Request) {
  const explicitSecret =
    process.env.PRICING_SCRAPE_SECRET ??
    process.env.CATALOG_SYNC_SECRET ??
    process.env.PRICE_EMPIRE_SYNC_SECRET
  const cronSecret = process.env.CRON_SECRET
  const provided =
    request.headers.get("x-catalog-sync-secret") ??
    request.headers.get("x-pricing-scrape-secret") ??
    request.headers.get("x-pricempire-sync-secret")
  const authHeader = request.headers.get("authorization")
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null

  if (explicitSecret && (provided === explicitSecret || bearer === explicitSecret)) return true
  if (cronSecret && bearer === cronSecret) return true
  return false
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  // Accept key from query, header, or env (query takes precedence when server env is empty)
  const url = new URL(req.url)
  const apiKey =
    url.searchParams.get("apiKey")?.trim() ||
    req.headers.get("x-pricempire-api-key")?.trim() ||
    process.env.PRICE_EMPIRE_API_KEY?.trim()
  if (!apiKey) {
    return NextResponse.json(
      { error: "PRICE_EMPIRE_API_KEY not set. Add it to .env.local before running the seed." },
      { status: 500 }
    )
  }

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: "supabase_env_missing" }, { status: 500 })
  const currency = (url.searchParams.get("currency") ?? "USD").toUpperCase()
  const maxCalls = Math.min(100, Math.max(1, Number(url.searchParams.get("maxCalls") ?? "50")))
  const dryRun = url.searchParams.get("dryRun") === "1" || url.searchParams.get("dryRun") === "true"
  const typesParam = url.searchParams.get("types")?.trim()

  const typesToFetch = typesParam
    ? typesParam.split(",").map((t) => t.trim()).filter(Boolean)
    : [...ITEM_TYPES]

  const nowIso = new Date().toISOString()
  const dayTs = toUtcDayStartIso(new Date())

  let callsUsed = 0
  let totalItems = 0
  let totalSnapshots = 0
  let totalCandles = 0
  const typesSynced: string[] = []
  const errors: string[] = []

  for (const type of typesToFetch) {
    if (callsUsed >= maxCalls) break

    try {
      const items = await fetchItemPrices({
        apiKey: apiKey ?? undefined,
        appId: 730,
        sources: [...DEFAULT_SOURCES],
        currency,
        type,
      })
      callsUsed += 1

      if (items.length === 0) {
        typesSynced.push(`${type}:0`)
        continue
      }

      const { snapshots, candles } = transformToSnapshotRows(items, currency, dayTs, nowIso)
      totalItems += items.length
      totalSnapshots += snapshots.length
      totalCandles += candles.length
      typesSynced.push(`${type}:${items.length}`)

      if (!dryRun && snapshots.length > 0) {
        const { error: snapErr } = await admin.from("market_price_snapshots").upsert(snapshots, {
          onConflict: "item_name,market,currency",
          ignoreDuplicates: false,
        })
        if (snapErr) errors.push(`snapshots ${type}: ${snapErr.message}`)
      }

      if (!dryRun && candles.length > 0) {
        const { error: candErr } = await admin.from("market_price_candles").upsert(candles, {
          onConflict: "item_name,market,currency,timeframe,ts",
          ignoreDuplicates: false,
        })
        if (candErr) errors.push(`candles ${type}: ${candErr.message}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${type}: ${msg}`)
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    dryRun,
    currency,
    callsUsed,
    maxCalls,
    totalItems,
    totalSnapshots,
    totalCandles,
    typesSynced,
    errors: errors.length > 0 ? errors : undefined,
    dayTs,
  })
}

export const runtime = "nodejs"
