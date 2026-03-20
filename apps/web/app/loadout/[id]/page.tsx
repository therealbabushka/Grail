import type { Metadata } from "next"
import { notFound } from "next/navigation"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import type { Json } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"

const CT_SLOTS = [
  "ct_knife",
  "ct_gloves",
  "ct_awp",
  "ct_m4a4",
  "ct_usp_s",
  "ct_famas",
  "ct_p250",
]

const T_SLOTS = [
  "t_knife",
  "t_gloves",
  "t_ak47",
  "t_glock",
  "t_awp",
  "t_galil",
  "t_p250",
]

const SLOT_LABELS: Record<string, string> = {
  ct_knife: "Knife",
  ct_gloves: "Gloves",
  ct_awp: "AWP",
  ct_m4a4: "M4A4 / M4A1-S",
  ct_usp_s: "USP-S / P2000",
  ct_famas: "FAMAS",
  ct_p250: "P250",
  t_knife: "Knife",
  t_gloves: "Gloves",
  t_ak47: "AK-47",
  t_glock: "Glock-18",
  t_awp: "AWP",
  t_galil: "Galil AR",
  t_p250: "P250",
}

type Slot = {
  skinName?: string
  imageUrl?: string
  floatValue?: number
}

function parseSlot(slotKey: string, raw: unknown): Slot {
  if (!raw || typeof raw !== "object") return {}
  const value = raw as Record<string, unknown>
  return {
    skinName:
      typeof value.skin_name === "string"
        ? value.skin_name
        : typeof value.skinName === "string"
          ? value.skinName
          : undefined,
    imageUrl:
      typeof value.image_url === "string"
        ? value.image_url
        : typeof value.imageUrl === "string"
          ? value.imageUrl
          : undefined,
    floatValue:
      typeof value.float_value === "number"
        ? value.float_value
        : typeof value.floatValue === "number"
          ? value.floatValue
          : undefined,
  }
}

function parseSlots(raw: Json) {
  const out = {} as Record<string, Slot>
  const all = [...CT_SLOTS, ...T_SLOTS]
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const value = raw as Record<string, unknown>
    for (const key of all) out[key] = parseSlot(key, value[key])
    return out
  }
  for (const key of all) out[key] = {}
  return out
}

async function fetchPublicLoadout(id: string) {
  const supabase = await createClient()
  if (!supabase) return null
  const { data, error } = await supabase
    .from("loadouts")
    .select("id, name, is_public, updated_at, slots")
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle()
  if (error || !data) return null
  return data
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const loadout = await fetchPublicLoadout(id)
  if (!loadout) {
    return { title: "Loadout not found | Grail" }
  }
  const title = `${loadout.name} loadout | Grail`
  const description = "Public CS2 loadout showcase from Grail."
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function PublicLoadoutPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const loadout = await fetchPublicLoadout(id)
  if (!loadout) notFound()

  const slots = parseSlots(loadout.slots)

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="font-mono text-2xl font-bold tracking-tight">{loadout.name}</h1>
          <p className="text-xs text-text-secondary">Public loadout showcase</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-sm">CT / T grid</CardTitle>
            <CardDescription className="text-xs">Shared from Grail</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-text-secondary">CT</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CT_SLOTS.map((key) => {
                    const slot = slots[key] ?? {}
                    return (
                      <Card key={key} className="overflow-hidden border-border bg-surface">
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-3">
                          {slot.imageUrl ? (
                            <img
                              src={slot.imageUrl}
                              alt={slot.skinName ?? SLOT_LABELS[key]}
                              className="h-14 w-auto max-w-full object-contain"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded border border-border bg-background/50">
                              <span className="font-mono text-[10px] text-text-muted">
                                {SLOT_LABELS[key].slice(0, 6)}
                              </span>
                            </div>
                          )}
                          <span className="max-w-full line-clamp-1 font-mono text-[10px] text-foreground">
                            {slot.skinName ?? SLOT_LABELS[key]}
                          </span>
                          {slot.floatValue != null && (
                            <span className="font-mono text-[9px] tabular-nums text-text-muted">
                              {slot.floatValue.toFixed(4)}
                            </span>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
              <div>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-text-secondary">T</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {T_SLOTS.map((key) => {
                    const slot = slots[key] ?? {}
                    return (
                      <Card key={key} className="overflow-hidden border-border bg-surface">
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-3">
                          {slot.imageUrl ? (
                            <img
                              src={slot.imageUrl}
                              alt={slot.skinName ?? SLOT_LABELS[key]}
                              className="h-14 w-auto max-w-full object-contain"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded border border-border bg-background/50">
                              <span className="font-mono text-[10px] text-text-muted">
                                {SLOT_LABELS[key].slice(0, 6)}
                              </span>
                            </div>
                          )}
                          <span className="max-w-full line-clamp-1 font-mono text-[10px] text-foreground">
                            {slot.skinName ?? SLOT_LABELS[key]}
                          </span>
                          {slot.floatValue != null && (
                            <span className="font-mono text-[9px] tabular-nums text-text-muted">
                              {slot.floatValue.toFixed(4)}
                            </span>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
