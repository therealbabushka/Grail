import { NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

type SteamSearchResult = {
  hash_name?: string
  name?: string
  asset_description?: {
    type?: string
    icon_url?: string
    market_hash_name?: string
  }
}

type SteamSearchResponse = {
  success?: boolean
  start?: number
  pagesize?: number
  total_count?: number
  results?: SteamSearchResult[]
}

type SyncRow = {
  name: string
  weapon_type: string | null
  collection: string | null
  rarity: "consumer" | "industrial" | "milspec" | "restricted" | "classified" | "covert" | "gold" | null
  image_url: string | null
}

const STEAM_SEARCH_URL = "https://steamcommunity.com/market/search/render"

function inferMarketType(rawType: string, name: string) {
  const type = rawType.toLowerCase()
  const n = name.toLowerCase()
  if (type.includes("sticker") || n.includes("sticker")) return "Sticker"
  if (type.includes("container") || type.includes("case") || type.includes("capsule") || n.includes("case") || n.includes("capsule")) return "Container"
  if (type.includes("graffiti") || n.includes("graffiti")) return "Graffiti"
  if (type.includes("music kit") || n.includes("music kit")) return "Music Kit"
  if (type.includes("agent") || n.includes("agent")) return "Agent"
  if (type.includes("patch") || n.includes("patch")) return "Patch"
  if (type.includes("charm") || type.includes("keychain") || n.includes("charm") || n.includes("keychain")) return "Charm"
  if (name.includes("|") || type.includes("weapon")) return "Weapon Skin"
  return "Other"
}

function toImageUrl(iconUrl?: string) {
  if (!iconUrl) return null
  return `https://community.cloudflare.steamstatic.com/economy/image/${iconUrl}/330x192`
}

function parseIntParam(value: string | null, fallback: number, min: number, max: number) {
  const n = Number.parseInt(value ?? "", 10)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

function mapResultToRow(item: SteamSearchResult): SyncRow | null {
  const hashName = item.hash_name?.trim() || item.asset_description?.market_hash_name?.trim() || item.name?.trim()
  if (!hashName) return null
  const type = inferMarketType(item.asset_description?.type ?? "", hashName)
  return {
    name: hashName,
    weapon_type: type,
    collection: "steam_market",
    rarity: null,
    image_url: toImageUrl(item.asset_description?.icon_url),
  }
}

function isAuthorized(request: Request) {
  const explicitSecret = process.env.CATALOG_SYNC_SECRET
  const cronSecret = process.env.CRON_SECRET
  const provided = request.headers.get("x-catalog-sync-secret")
  const authHeader = request.headers.get("authorization")
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null

  if (explicitSecret && (provided === explicitSecret || bearer === explicitSecret)) return true
  if (cronSecret && bearer === cronSecret) return true
  return false
}

async function runSync(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "supabase_env_missing" }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const start = parseIntParam(searchParams.get("start"), 0, 0, 200000)
  const count = parseIntParam(searchParams.get("count"), 100, 1, 100)
  const pages = parseIntParam(searchParams.get("pages"), 5, 1, 25)
  const query = (searchParams.get("query") ?? "").trim()
  const dryRun = searchParams.get("dryRun") === "1"

  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey)

  let cursor = start
  let totalCount = 0
  let processed = 0
  let upserted = 0

  for (let page = 0; page < pages; page++) {
    const steamUrl = new URL(STEAM_SEARCH_URL)
    steamUrl.searchParams.set("query", query)
    steamUrl.searchParams.set("start", String(cursor))
    steamUrl.searchParams.set("count", String(count))
    steamUrl.searchParams.set("search_descriptions", "0")
    steamUrl.searchParams.set("sort_column", "name")
    steamUrl.searchParams.set("sort_dir", "asc")
    steamUrl.searchParams.set("appid", "730")
    steamUrl.searchParams.set("norender", "1")

    const res = await fetch(steamUrl, {
      headers: {
        "user-agent": "GrailCatalogSync/1.0 (+https://grail.local)",
      },
      cache: "no-store",
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: "steam_fetch_failed", status: res.status, cursor, processed, upserted },
        { status: 502 }
      )
    }

    const json = (await res.json()) as SteamSearchResponse
    const results = Array.isArray(json.results) ? json.results : []
    totalCount = Number.isFinite(json.total_count) ? Number(json.total_count) : totalCount

    const rows = results.map(mapResultToRow).filter((x): x is SyncRow => Boolean(x))
    processed += rows.length

    if (!dryRun && rows.length > 0) {
      const { error } = await supabase.from("items").upsert(rows, { onConflict: "name", ignoreDuplicates: false })
      if (error) {
        return NextResponse.json(
          { error: "supabase_upsert_failed", message: error.message, cursor, processed, upserted },
          { status: 500 }
        )
      }
      upserted += rows.length
    }

    cursor += results.length
    if (results.length === 0 || (totalCount > 0 && cursor >= totalCount)) break
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    start,
    nextStart: cursor,
    count,
    pages,
    totalCount,
    processed,
    upserted,
  })
}

export async function POST(request: Request) {
  return runSync(request)
}

export async function GET(request: Request) {
  return runSync(request)
}

