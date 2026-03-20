import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

type Suggestion = {
  name: string
  imageUrl?: string
  rarity?: string
  price?: number | null
  currency?: string
}

type CatalogResponse = {
  items?: Array<{
    name: string
    imageUrl?: string
    rarityId?: string
    rarityName?: string
  }>
}

const RARITY_NAME_BY_DB_VALUE: Record<string, string> = {
  consumer: "Consumer",
  industrial: "Industrial",
  milspec: "Mil-Spec Grade",
  restricted: "Restricted",
  classified: "Classified",
  covert: "Covert",
  gold: "Contraband",
}

const UNKNOWN_LABELS = new Set(["unknown", "n/a", "na", "-", "none"])

function normalizeRarityToDisplay(value?: string | null): string | undefined {
  if (!value) return undefined
  const v = value.trim()
  if (!v) return undefined
  if (UNKNOWN_LABELS.has(v.toLowerCase())) return undefined
  const key = v.toLowerCase()
  return RARITY_NAME_BY_DB_VALUE[key] ?? undefined
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get("q") ?? "").trim()

  if (q.length < 2) {
    return NextResponse.json({ items: [] as Suggestion[] })
  }

  const supabase = await createClient()
  if (supabase) {
    const escaped = q.replace(/[%_]/g, "\\$&")
    const { data, error } = await supabase
      .from("items")
      .select("name, image_url, rarity")
      .ilike("name", `%${escaped}%`)
      .limit(8)

    if (!error && data && data.length > 0) {
      const names = data.map((item) => item.name)
      const { data: snapshotRows } = await supabase
        .from("market_price_snapshots")
        .select("item_name, market, currency, price, fetched_at")
        .eq("market", "steam")
        .eq("currency", "USD")
        .in("item_name", names)
        .order("fetched_at", { ascending: false })

      const latestByItem = new Map<string, { price: number | null; currency: string }>()
      for (const row of snapshotRows ?? []) {
        if (latestByItem.has(row.item_name)) continue
        latestByItem.set(row.item_name, {
          price: typeof row.price === "number" ? row.price : row.price == null ? null : Number(row.price),
          currency: row.currency,
        })
      }

      const items: Suggestion[] = data.map((item) => {
        const snap = latestByItem.get(item.name)
        return {
          name: item.name,
          imageUrl: item.image_url ?? undefined,
          rarity: normalizeRarityToDisplay(item.rarity),
          price: snap?.price ?? null,
          currency: snap?.currency ?? "USD",
        }
      })
      return NextResponse.json({ items })
    }
  }

  // Fallback path for demo mode or missing Supabase env.
  try {
    const catalogRes = await fetch(new URL("/api/catalog", request.url), {
      cache: "no-store",
    })
    if (!catalogRes.ok) return NextResponse.json({ items: [] as Suggestion[] })
    const json = (await catalogRes.json()) as CatalogResponse
    const lowered = q.toLowerCase()
    const items: Suggestion[] = (json.items ?? [])
      .filter((item) => item.name.toLowerCase().includes(lowered))
      .slice(0, 8)
      .map((item) => ({
        name: item.name,
        imageUrl: item.imageUrl,
        rarity: item.rarityName ?? normalizeRarityToDisplay(item.rarityId),
        price: null,
        currency: "USD",
      }))
    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ items: [] as Suggestion[] })
  }
}
