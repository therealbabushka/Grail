import { NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import type { CatalogItem } from "../route"
type RemoteSkin = {
  id?: string
  name: string
  weapon?: { name?: string }
  rarity?: { id?: string; name?: string; color?: string }
  min_float?: number | null
  max_float?: number | null
  stattrak?: boolean | null
  image?: string
}
const ALL_EXTERIORS = ["FN", "MW", "FT", "WW", "BS"] as const
const RARITY_NAME_BY_DB_VALUE: Record<string, string> = {
  consumer: "Consumer",
  industrial: "Industrial",
  milspec: "Mil-Spec Grade",
  restricted: "Restricted",
  classified: "Classified",
  covert: "Covert",
  gold: "Contraband",
}
const RARITY_COLOR_BY_DB_VALUE: Record<string, string> = {
  consumer: "#b0c3d9",
  industrial: "#5e98d9",
  milspec: "#4b69ff",
  restricted: "#8847ff",
  classified: "#d32ce6",
  covert: "#eb4b4b",
  gold: "#ffd700",
}
const UNKNOWN_LABELS = new Set(["unknown", "n/a", "na", "-", "none"])
const REMOTE_DATASETS = [
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json",
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/stickers.json",
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/agents.json",
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/containers.json",
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/patches.json",
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/charms.json",
] as const

function cleanLabel(value?: string | null) {
  if (!value) return undefined
  const v = value.trim()
  if (!v) return undefined
  if (UNKNOWN_LABELS.has(v.toLowerCase())) return undefined
  return v
}

function exteriorsFromFloatRange(min: number, max: number): CatalogItem["exteriors"] {
  const tiers: Array<[CatalogItem["exteriors"][number], number, number]> = [
    ["FN", 0.0, 0.07],
    ["MW", 0.07, 0.15],
    ["FT", 0.15, 0.38],
    ["WW", 0.38, 0.45],
    ["BS", 0.45, 1.0],
  ]
  const out: CatalogItem["exteriors"] = []
  for (const [label, a, b] of tiers) {
    const overlaps = max > a && min <= b
    if (overlaps) out.push(label)
  }
  return out
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const decoded = decodeURIComponent(id)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (url && anonKey) {
    const supabase = createSupabaseClient(url, anonKey)
    const { data } = await supabase
      .from("items")
      .select("name, weapon_type, rarity, image_url")
      .eq("name", decoded)
      .maybeSingle()

    if (data) {
      const rarityKey = (data.rarity ?? "").toLowerCase()
      const item: CatalogItem = {
        id: data.name,
        name: data.name,
        weaponName: cleanLabel(data.weapon_type),
        rarityName: RARITY_NAME_BY_DB_VALUE[rarityKey],
        rarityId: rarityKey || undefined,
        rarityColor: RARITY_COLOR_BY_DB_VALUE[rarityKey],
        imageUrl: data.image_url ?? undefined,
        exteriors: [...ALL_EXTERIORS],
        hasStatTrak: /stattrak/i.test(data.name),
      }
      return NextResponse.json({ item, source: "supabase" })
    }
  }

  const catalogUrl = new URL("/api/catalog", req.url)
  const catalogRes = await fetch(catalogUrl, { cache: "no-store" })
  if (!catalogRes.ok) {
    return NextResponse.json({ error: "catalog_fetch_failed", status: catalogRes.status }, { status: 502 })
  }

  const catalogJson = (await catalogRes.json()) as { items?: CatalogItem[]; source?: string }
  const found = (catalogJson.items ?? []).find((x) => String(x.id) === String(decoded) || String(x.id) === String(id))
  if (found) {
    return NextResponse.json({ item: found, source: catalogJson.source ?? "remote" })
  }

  // Fallback for old saved links that use remote IDs while current list source is Supabase names.
  for (const dataset of REMOTE_DATASETS) {
    const res = await fetch(dataset, { next: { revalidate: 60 * 60 } })
    if (!res.ok) continue
    const rows = (await res.json()) as RemoteSkin[]
    const hit = rows.find((x) => {
      const remoteId = String(x.id ?? x.name)
      return remoteId === decoded || remoteId === id || String(x.name) === decoded
    })
    if (!hit) continue

    const floatMin = typeof hit.min_float === "number" ? hit.min_float : undefined
    const floatMax = typeof hit.max_float === "number" ? hit.max_float : undefined
    const exteriors =
      typeof floatMin === "number" && typeof floatMax === "number"
        ? exteriorsFromFloatRange(floatMin, floatMax)
        : (["FN", "MW", "FT", "WW", "BS"] as const).slice()

    const item: CatalogItem = {
      id: hit.id ?? hit.name,
      name: hit.name,
      weaponName: hit.weapon?.name,
      rarityName: hit.rarity?.name,
      rarityId: hit.rarity?.id,
      rarityColor: hit.rarity?.color,
      imageUrl: hit.image,
      floatMin,
      floatMax,
      exteriors,
      hasStatTrak: Boolean(hit.stattrak),
    }
    return NextResponse.json({ item, source: "remote-fallback" })
  }

  return NextResponse.json({ error: "not_found" }, { status: 404 })
}

