import { NextResponse } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"

import { fetchAllMarketSnapshots } from "@/lib/pricing/providers"
import { createAdminClient } from "@/lib/supabase/admin"

const DEFAULT_EXTERIOR = "Field-Tested"
const ALL_MARKETS = ["steam", "skinport", "bitskins", "csfloat", "buff163", "dmarket", "waxpeer"] as const

function toUtcDayStartIso(d: Date) {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x.toISOString()
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function isAuthorized(request: Request) {
  const explicitSecret = process.env.PRICING_SCRAPE_SECRET ?? process.env.CATALOG_SYNC_SECRET
  const cronSecret = process.env.CRON_SECRET
  const provided = request.headers.get("x-catalog-sync-secret") ?? request.headers.get("x-pricing-scrape-secret")
  const authHeader = request.headers.get("authorization")
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null

  if (explicitSecret && (provided === explicitSecret || bearer === explicitSecret)) return true
  if (cronSecret && bearer === cronSecret) return true
  return false
}

async function readProgressFile() {
  const file = path.join(process.cwd(), ".cache", "pricing-scrape-today-progress.json")
  try {
    const raw = await fs.readFile(file, "utf8")
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

async function writeProgressFile(progress: Record<string, unknown>) {
  const dir = path.join(process.cwd(), ".cache")
  await fs.mkdir(dir, { recursive: true })
  const file = path.join(dir, "pricing-scrape-today-progress.json")
  await fs.writeFile(file, JSON.stringify(progress, null, 2), "utf8")
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: "supabase_env_missing" }, { status: 500 })

  const url = new URL(req.url)
  const currency = (url.searchParams.get("currency") ?? "USD").toUpperCase()
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0"))
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "25")))
  const exteriorLabel = (url.searchParams.get("exteriorLabel") ?? DEFAULT_EXTERIOR).trim()
  const interItemDelayMs = Math.min(5000, Math.max(0, Number(url.searchParams.get("delayMs") ?? "700")))
  const force = url.searchParams.get("force") === "1"

  const nowIso = new Date().toISOString()
  const dayTs = toUtcDayStartIso(new Date())

  await writeProgressFile({
    stage: "scrape-today-all-items",
    startedAt: nowIso,
    updatedAt: nowIso,
    currency,
    offset,
    limit,
    exteriorLabel,
    processed: 0,
    upsertedSnapshots: 0,
    upsertedCandles: 0,
    lastItemName: null,
    lastError: null,
  })

  const { data: items, error } = await admin
    .from("items")
    .select("name")
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    const current = (await readProgressFile()) ?? {}
    await writeProgressFile({ ...current, lastError: error.message, updatedAt: new Date().toISOString() })
    return NextResponse.json({ error: "items_fetch_failed", message: error.message }, { status: 500 })
  }

  const bitskinsApiKey = process.env.BITSKINS_API_KEY
  const bitskinsSecret = process.env.BITSKINS_API_SECRET
  const itemNames = (items ?? []).map((r) => (r as { name: string }).name).filter(Boolean)

  let processed = 0
  let upsertedSnapshots = 0
  let upsertedCandles = 0

  for (const itemName of itemNames) {
    const marketHashName = `${itemName} (${exteriorLabel})`
    const displayName = itemName

    const markets = await fetchAllMarketSnapshots({
      itemName: displayName,
      marketHashName,
      currency,
      bitskinsApiKey,
      bitskinsSecret,
    })

    const allRows = ALL_MARKETS.map((market) => {
      const row = markets.find((m) => m.market === market)
      return {
        market,
        price: row?.price ?? null,
        volume24h: row?.volume24h ?? null,
      }
    })

    // Keep latest snapshot cache for all providers.
    const snapshotRows = allRows.map((m) => ({
      item_name: marketHashName,
      market: m.market,
      currency,
      price: m.price,
      volume_24h: m.volume24h,
      fetched_at: nowIso,
      change_24h_pct: null,
      change_7d_pct: null,
    }))
    const { error: snapshotsErr } = await admin.from("market_price_snapshots").upsert(snapshotRows, {
      onConflict: "item_name,market,currency",
      ignoreDuplicates: false,
    })
    if (snapshotsErr) {
      const current = (await readProgressFile()) ?? {}
      await writeProgressFile({
        ...current,
        processed,
        upsertedSnapshots,
        upsertedCandles,
        lastItemName: itemName,
        lastError: snapshotsErr.message,
        updatedAt: new Date().toISOString(),
      })
      return NextResponse.json({ error: "snapshot_upsert_failed", message: snapshotsErr.message }, { status: 500 })
    }
    upsertedSnapshots += snapshotRows.length

    // One daily candle per market for "today".
    const candleRows = allRows.map((m) => ({
      item_name: marketHashName,
      market: m.market,
      currency,
      timeframe: "1d" as const,
      ts: dayTs,
      open: m.price,
      high: m.price,
      low: m.price,
      close: m.price,
      volume: m.volume24h,
      fetched_at: nowIso,
    }))
    const { error: candlesErr } = await admin.from("market_price_candles").upsert(candleRows, {
      onConflict: "item_name,market,currency,timeframe,ts",
      ignoreDuplicates: false,
    })
    if (candlesErr) {
      const current = (await readProgressFile()) ?? {}
      await writeProgressFile({
        ...current,
        processed,
        upsertedSnapshots,
        upsertedCandles,
        lastItemName: itemName,
        lastError: candlesErr.message,
        updatedAt: new Date().toISOString(),
      })
      return NextResponse.json({ error: "candle_upsert_failed", message: candlesErr.message }, { status: 500 })
    }
    upsertedCandles += candleRows.length

    processed += 1
    const current = (await readProgressFile()) ?? {}
    await writeProgressFile({
      ...current,
      processed,
      upsertedSnapshots,
      upsertedCandles,
      lastItemName: itemName,
      lastError: null,
      updatedAt: new Date().toISOString(),
    })

    if (interItemDelayMs > 0) await sleep(interItemDelayMs)
  }

  return NextResponse.json({
    ok: true,
    force,
    currency,
    exteriorLabel,
    offset,
    limit,
    processedItemCount: processed,
    upsertedSnapshots,
    upsertedCandles,
    dayTs,
    nextOffset: offset + itemNames.length,
  })
}

export const runtime = "nodejs"

