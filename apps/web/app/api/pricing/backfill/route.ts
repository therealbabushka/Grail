import { NextResponse } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"

import { createAdminClient } from "@/lib/supabase/admin"
import {
  aggregateDailyCandles,
  fetchBitskinsPricing,
  fetchSteamHistory,
} from "@/lib/pricing/providers"

type BackfillRange = "1w" | "1m" | "3m" | "1y" | "all"

const ALL_MARKETS = ["steam", "bitskins"] as const
type Market = (typeof ALL_MARKETS)[number]

const MARKET_HASH_SUFFIX = "Field-Tested"

function parseRangeDays(range: BackfillRange | string | null | undefined) {
  switch (range) {
    case "1w":
      return 7
    case "1m":
      return 30
    case "3m":
      return 90
    case "1y":
      return 365
    default:
      return null // all-time
  }
}

function toUtcDayStartIso(d: Date) {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x.toISOString()
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function isAuthorized(request: Request) {
  // Mirror the existing catalog sync pattern: allow local runs using a shared secret.
  const explicitSecret = process.env.PRICING_BACKFILL_SECRET ?? process.env.CATALOG_SYNC_SECRET
  const cronSecret = process.env.CRON_SECRET
  const provided = request.headers.get("x-catalog-sync-secret") ?? request.headers.get("x-pricing-backfill-secret")
  const authHeader = request.headers.get("authorization")
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null

  if (explicitSecret && (provided === explicitSecret || bearer === explicitSecret)) return true
  if (cronSecret && bearer === cronSecret) return true
  return false
}

async function readProgressFile() {
  const file = path.join(process.cwd(), ".cache", "pricing-backfill-progress.json")
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
  const file = path.join(dir, "pricing-backfill-progress.json")
  await fs.writeFile(file, JSON.stringify(progress, null, 2), "utf8")
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const range = (url.searchParams.get("range") ?? "1m") as BackfillRange
  const currency = (url.searchParams.get("currency") ?? "USD").toUpperCase()
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? "0"))
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "25")))
  // Keep everything by default; pruning is opt-in via `prune=1`.
  const prune = url.searchParams.get("prune")?.toLowerCase() === "1"
  const exteriorLabel = (url.searchParams.get("exteriorLabel") ?? MARKET_HASH_SUFFIX).trim()
  const interItemDelayMs = Math.min(5000, Math.max(0, Number(url.searchParams.get("delayMs") ?? "700")))

  if (!isAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: "supabase_env_missing" }, { status: 500 })

  const rangeDays = parseRangeDays(range)
  const now = new Date()
  const todayStartIso = toUtcDayStartIso(now)
  const todayStartMs = new Date(todayStartIso).getTime()

  const cutoffStartMs = rangeDays == null ? null : todayStartMs - (rangeDays - 1) * 24 * 60 * 60 * 1000
  const cutoffStartIso = cutoffStartMs == null ? null : new Date(cutoffStartMs).toISOString()

  const progress = await readProgressFile()
  await writeProgressFile({
    ...progress,
    stage: "steam-bitskins-backfill",
    range,
    currency,
    exteriorLabel,
    startedAt: progress?.startedAt ? progress?.startedAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    offset,
    limit,
    processed: progress?.processed ?? 0,
    upserted: progress?.upserted ?? 0,
    lastItemName: progress?.lastItemName ?? null,
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

  const itemNames = (items ?? []).map((r) => (r as { name: string }).name).filter(Boolean)
  const nextOffset = offset + itemNames.length

  const bitskinsApiKey = process.env.BITSKINS_API_KEY
  const bitskinsSecret = process.env.BITSKINS_API_SECRET

  let processed = 0
  let upserted = 0

  for (const itemName of itemNames) {
    const marketHashName = `${itemName} (${exteriorLabel})`

    const steamRes = await fetchSteamHistory(marketHashName)
    const steamDaily = aggregateDailyCandles(steamRes.series)
      .filter((c) => (cutoffStartMs == null ? true : new Date(c.ts).getTime() >= cutoffStartMs))
      .map((c) => ({
        item_name: marketHashName,
        market: "steam" as Market,
        currency,
        timeframe: "1d" as const,
        ts: c.ts,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: null,
      }))

    const bitskinsRes = await fetchBitskinsPricing(marketHashName, bitskinsApiKey, bitskinsSecret)
    const bitskinsDaily = aggregateDailyCandles(bitskinsRes.series)
      .filter((c) => (cutoffStartMs == null ? true : new Date(c.ts).getTime() >= cutoffStartMs))
      .map((c) => ({
        item_name: marketHashName,
        market: "bitskins" as Market,
        currency,
        timeframe: "1d" as const,
        ts: c.ts,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: null,
      }))

    // Upsert candles for the chosen markets only.
    const rows = [...steamDaily, ...bitskinsDaily]
    if (rows.length > 0) {
      const { error: upsertErr } = await admin.from("market_price_candles").upsert(rows, {
        onConflict: "item_name,market,currency,timeframe,ts",
        ignoreDuplicates: false,
      })
      if (upsertErr) {
        const current = (await readProgressFile()) ?? {}
        await writeProgressFile({
          ...current,
          lastError: upsertErr.message,
          processed,
          upserted,
          lastItemName: itemName,
          updatedAt: new Date().toISOString(),
        })
        return NextResponse.json({ error: "upsert_failed", message: upsertErr.message }, { status: 500 })
      }

      upserted += rows.length
    }

    processed += 1
    const current = (await readProgressFile()) ?? {}
    await writeProgressFile({
      ...current,
      processed,
      upserted,
      lastItemName: itemName,
      updatedAt: new Date().toISOString(),
    })

    if (interItemDelayMs > 0) await sleep(interItemDelayMs)
  }

  if (prune && cutoffStartIso) {
    // Enforce retention for backfilled timeframe only.
    // (We don't delete other timeframe rows yet; this keeps the change small and reversible.)
    await admin
      .from("market_price_candles")
      .delete()
      .eq("timeframe", "1d")
      .eq("currency", currency)
      .lt("ts", cutoffStartIso)
  }

  return NextResponse.json({
    ok: true,
    range,
    currency,
    exteriorLabel,
    offset,
    limit,
    processedItemCount: processed,
    upsertedCandleRowsApprox: upserted,
    nextOffset,
    prune,
    todayStartIso,
  })
}

export const runtime = "nodejs"

