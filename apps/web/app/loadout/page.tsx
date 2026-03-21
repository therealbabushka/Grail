"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { CaretDown } from "@phosphor-icons/react"

import type { Json } from "@/lib/supabase/database.types"
import { createClient as createBrowserClient } from "@/lib/supabase/browser"

import { AuthGate } from "@/components/auth-gate"

const RARITIES = [
  "consumer",
  "industrial",
  "milspec",
  "restricted",
  "classified",
  "covert",
  "gold",
] as const

const RARITY_GLOW: Record<string, string> = {
  consumer: "#b0c3d9",
  industrial: "#5e98d9",
  milspec: "#4b69ff",
  restricted: "#8847ff",
  classified: "#d32ce6",
  covert: "#eb4b4b",
  gold: "#ffd700",
}

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

type LoadoutSlot = {
  slotKey: string
  weaponLabel: string
  skinName?: string
  imageUrl?: string
  floatValue?: number
  pricePaid?: number
  rarity?: (typeof RARITIES)[number]
  variant?: "none" | "stattrak" | "souvenir"
}

type UiLoadout = {
  id: string
  name: string
  isPublic: boolean
  updatedAt: string
  slots: Record<string, LoadoutSlot>
}

type SkinSuggestion = {
  name: string
  imageUrl?: string
  rarity?: LoadoutSlot["rarity"]
}

function defaultSlot(slotKey: string): LoadoutSlot {
  return {
    slotKey,
    weaponLabel: SLOT_LABELS[slotKey] ?? slotKey.replace(/^(ct_|t_)/, "").replace("_", " "),
  }
}

function defaultSlots() {
  const all = [...CT_SLOTS, ...T_SLOTS]
  return all.reduce<Record<string, LoadoutSlot>>((acc, slotKey) => {
    acc[slotKey] = defaultSlot(slotKey)
    return acc
  }, {})
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    const on = () => setReduced(mq.matches)
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])
  return reduced
}

function parseSlot(slotKey: string, raw: unknown): LoadoutSlot {
  const base = defaultSlot(slotKey)
  if (!raw || typeof raw !== "object") return base
  const value = raw as Record<string, unknown>
  return {
    slotKey,
    weaponLabel:
      typeof value.weapon_label === "string"
        ? value.weapon_label
        : typeof value.weaponLabel === "string"
          ? value.weaponLabel
          : base.weaponLabel,
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
    pricePaid:
      typeof value.price_paid === "number"
        ? value.price_paid
        : typeof value.pricePaid === "number"
          ? value.pricePaid
          : undefined,
    rarity:
      typeof value.rarity === "string" && (RARITIES as readonly string[]).includes(value.rarity)
        ? (value.rarity as LoadoutSlot["rarity"])
        : undefined,
    variant:
      value.variant === "none" || value.variant === "stattrak" || value.variant === "souvenir"
        ? value.variant
        : undefined,
  }
}

function parseSlots(raw: Json): Record<string, LoadoutSlot> {
  const output = defaultSlots()
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return output
  const value = raw as Record<string, unknown>
  for (const slotKey of Object.keys(output)) {
    output[slotKey] = parseSlot(slotKey, value[slotKey])
  }
  return output
}

function serializeSlots(slots: Record<string, LoadoutSlot>): Json {
  return Object.entries(slots).reduce<Record<string, Json>>((acc, [slotKey, slot]) => {
    acc[slotKey] = {
      slot_key: slot.slotKey,
      weapon_label: slot.weaponLabel,
      skin_name: slot.skinName ?? null,
      image_url: slot.imageUrl ?? null,
      float_value: slot.floatValue ?? null,
      price_paid: slot.pricePaid ?? null,
      rarity: slot.rarity ?? null,
      variant: slot.variant ?? null,
    }
    return acc
  }, {})
}

function toUiLoadout(record: {
  id: string
  name: string
  is_public: boolean
  updated_at: string
  slots: Json
}): UiLoadout {
  return {
    id: record.id,
    name: record.name,
    isPublic: record.is_public,
    updatedAt: record.updated_at,
    slots: parseSlots(record.slots),
  }
}

function SlotCard({
  slot,
  onEdit,
  onAddToSniper,
  prefersReducedMotion,
}: {
  slot: LoadoutSlot
  onEdit: () => void
  onAddToSniper: () => void
  prefersReducedMotion: boolean
}) {
  const hasSkin = Boolean(slot.skinName || slot.imageUrl)
  const glowColor = slot.rarity ? RARITY_GLOW[slot.rarity] : undefined

  return (
    <Card
      className={`group relative overflow-hidden bg-surface transition-all dark:bg-[radial-gradient(ellipse_120%_90%_at_50%_0%,#1a1a1a_0%,#0f0f0f_64%)] ${
        prefersReducedMotion ? "" : "hover:shadow-lg"
      }`}
      style={
        glowColor
          ? {
              boxShadow: prefersReducedMotion
                ? undefined
                : `0 0 16px ${glowColor}40, inset 0 1px 0 ${glowColor}22`,
            }
          : undefined
      }
    >
      <button
        type="button"
        onClick={onEdit}
        className={`flex h-full w-full flex-col items-center justify-center gap-1 p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          prefersReducedMotion
            ? ""
            : "transition-transform [transform-style:preserve-3d] group-hover:[transform:perspective(400px)_rotateX(4deg)_rotateY(-4deg)]"
        }`}
      >
        {slot.imageUrl ? (
          <img
            src={slot.imageUrl}
            alt={slot.skinName ?? slot.weaponLabel}
            className="h-14 w-auto max-w-full object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none"
            }}
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded border border-border bg-background/50">
            <span className="font-mono text-[12px] text-text-muted">
              {slot.weaponLabel.slice(0, 6)}
            </span>
          </div>
        )}
        <span className="max-w-full line-clamp-1 font-mono text-[12px] text-foreground">
          {slot.skinName ?? slot.weaponLabel}
        </span>
        {slot.floatValue != null && (
          <span className="font-mono text-[12px] tabular-nums text-text-muted">
            {slot.floatValue.toFixed(4)}
          </span>
        )}
      </button>
      {!hasSkin && (
        <div className="absolute bottom-1 right-1">
          <Button
            variant="ghost"
            size="icon-xs"
            className="h-5 w-5 text-info"
            onClick={(e) => {
              e.stopPropagation()
              onAddToSniper()
            }}
            title="Add to Watchlist"
          >
            +
          </Button>
        </div>
      )}
    </Card>
  )
}

export default function LoadoutPage() {
  const [supabaseReady, setSupabaseReady] = useState(false)
  const [loadouts, setLoadouts] = useState<UiLoadout[]>([])
  const [activeLoadoutId, setActiveLoadoutId] = useState<string | null>(null)
  const [editingSlotKey, setEditingSlotKey] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<LoadoutSlot>>({})
  const [createName, setCreateName] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameValue, setRenameValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [skinSuggestions, setSkinSuggestions] = useState<SkinSuggestion[]>([])
  const [showSkinSuggestions, setShowSkinSuggestions] = useState(false)
  const [isSearchingSkins, setIsSearchingSkins] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const activeLoadout = useMemo(
    () => loadouts.find((l) => l.id === activeLoadoutId) ?? loadouts[0] ?? null,
    [loadouts, activeLoadoutId],
  )

  const refreshRemoteLoadouts = useCallback(async () => {
    const supabase = createBrowserClient()
    if (!supabase) return
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from("loadouts")
      .select("id, name, is_public, updated_at, slots")
      .order("updated_at", { ascending: false })
    if (error) throw error
    const mapped = (data ?? []).map(toUiLoadout)
    if (mapped.length === 0) {
      setLoadouts([])
      setActiveLoadoutId(null)
      return
    }
    setLoadouts(mapped)
    setActiveLoadoutId(mapped[0]?.id ?? null)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function init() {
      const supabase = createBrowserClient()
      if (!supabase) {
        if (!cancelled) {
          setLoadouts([])
          setActiveLoadoutId(null)
          setSupabaseReady(true)
        }
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        if (!cancelled) {
          setLoadouts([])
          setActiveLoadoutId(null)
          setSupabaseReady(true)
        }
        return
      }

      try {
        await refreshRemoteLoadouts()
        if (!cancelled) {
          setSupabaseReady(true)
        }
      } catch {
        if (!cancelled) {
          setToast("Could not load loadouts.")
          setLoadouts([])
          setActiveLoadoutId(null)
          setSupabaseReady(true)
        }
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [refreshRemoteLoadouts])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!editingSlotKey) {
      setSkinSuggestions([])
      setShowSkinSuggestions(false)
      return
    }

    const q = form.skinName?.trim() ?? ""
    if (q.length < 2) {
      setSkinSuggestions([])
      return
    }

    let active = true
    const timer = setTimeout(async () => {
      setIsSearchingSkins(true)
      try {
        const res = await fetch(`/api/skins/search?q=${encodeURIComponent(q)}`, {
          cache: "no-store",
        })
        const json = (await res.json()) as {
          items?: Array<{ name: string; imageUrl?: string; rarity?: string }>
        }
        if (!active) return
        const mapped: SkinSuggestion[] = (json.items ?? []).map((item) => ({
          name: item.name,
          imageUrl: item.imageUrl,
          rarity:
            typeof item.rarity === "string" && (RARITIES as readonly string[]).includes(item.rarity)
              ? (item.rarity as LoadoutSlot["rarity"])
              : undefined,
        }))
        setSkinSuggestions(mapped)
      } catch {
        if (active) setSkinSuggestions([])
      }
      if (active) {
        setShowSkinSuggestions(true)
        setIsSearchingSkins(false)
      }
    }, 180)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [form.skinName, editingSlotKey])

  const openSlotEditor = useCallback(
    (slotKey: string) => {
      const s = activeLoadout?.slots[slotKey]
      setForm(
        s
          ? {
              slotKey: s.slotKey,
              weaponLabel: s.weaponLabel,
              skinName: s.skinName,
              imageUrl: s.imageUrl,
              floatValue: s.floatValue,
              pricePaid: s.pricePaid,
              rarity: s.rarity,
              variant: s.variant,
            }
          : defaultSlot(slotKey),
      )
      setEditingSlotKey(slotKey)
    },
    [activeLoadout],
  )

  const closeEditor = useCallback(() => {
    setEditingSlotKey(null)
    setForm({})
  }, [])

  const persistLoadout = useCallback(
    async (nextLoadout: UiLoadout) => {
      setLoadouts((prev) => prev.map((l) => (l.id === nextLoadout.id ? nextLoadout : l)))
      const supabase = createBrowserClient()
      if (!supabase) return
      const { error } = await supabase
        .from("loadouts")
        .update({
          name: nextLoadout.name,
          is_public: nextLoadout.isPublic,
          slots: serializeSlots(nextLoadout.slots),
        })
        .eq("id", nextLoadout.id)
      if (error) {
        setToast("Failed to save changes.")
        await refreshRemoteLoadouts()
      }
    },
    [refreshRemoteLoadouts],
  )

  const saveSlot = useCallback(async () => {
    if (!activeLoadout || !editingSlotKey) return
    const base = activeLoadout.slots[editingSlotKey] ?? defaultSlot(editingSlotKey)
    const nextLoadout: UiLoadout = {
      ...activeLoadout,
      updatedAt: new Date().toISOString(),
      slots: {
        ...activeLoadout.slots,
        [editingSlotKey]: {
          slotKey: editingSlotKey,
          weaponLabel: base.weaponLabel,
          skinName: form.skinName?.trim() || undefined,
          imageUrl: form.imageUrl?.trim() || undefined,
          floatValue: form.floatValue,
          pricePaid: form.pricePaid,
          rarity: form.rarity,
          variant: form.variant,
        },
      },
    }
    setIsSaving(true)
    await persistLoadout(nextLoadout)
    setIsSaving(false)
    closeEditor()
  }, [activeLoadout, editingSlotKey, form, closeEditor, persistLoadout])

  const clearSlot = useCallback(async () => {
    if (!activeLoadout || !editingSlotKey) return
    const current = activeLoadout.slots[editingSlotKey] ?? defaultSlot(editingSlotKey)
    const nextLoadout: UiLoadout = {
      ...activeLoadout,
      updatedAt: new Date().toISOString(),
      slots: {
        ...activeLoadout.slots,
        [editingSlotKey]: {
          slotKey: editingSlotKey,
          weaponLabel: current.weaponLabel,
        },
      },
    }
    setIsSaving(true)
    await persistLoadout(nextLoadout)
    setIsSaving(false)
    closeEditor()
  }, [activeLoadout, editingSlotKey, closeEditor, persistLoadout])

  const createLoadout = useCallback(async () => {
    const name = createName.trim()
    if (!name) return
    setIsSaving(true)
    const supabase = createBrowserClient()
    if (!supabase) {
      setIsSaving(false)
      return
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setToast("Sign in required for cloud loadouts.")
      setIsSaving(false)
      return
    }
    const { data, error } = await supabase
      .from("loadouts")
      .insert({
        user_id: user.id,
        name,
        is_public: false,
        slots: serializeSlots(defaultSlots()),
      })
      .select("id, name, is_public, updated_at, slots")
      .single()
    if (error) {
      setToast("Failed to create loadout.")
      setIsSaving(false)
      return
    }
    const created = toUiLoadout(data)
    setLoadouts((prev) => [created, ...prev])
    setActiveLoadoutId(created.id)
    setCreateName("")
    setCreateDialogOpen(false)
    setIsSaving(false)
  }, [createName])

  const renameActiveLoadout = useCallback(async () => {
    if (!activeLoadout) return
    const nextName = renameValue.trim()
    if (!nextName || nextName === activeLoadout.name) {
      setRenameDialogOpen(false)
      return
    }
    setIsSaving(true)
    await persistLoadout({ ...activeLoadout, name: nextName })
    setIsSaving(false)
    setRenameDialogOpen(false)
    setRenameValue("")
  }, [activeLoadout, persistLoadout, renameValue])

  const toggleActivePublic = useCallback(async () => {
    if (!activeLoadout) return
    setIsSaving(true)
    await persistLoadout({ ...activeLoadout, isPublic: !activeLoadout.isPublic })
    setIsSaving(false)
  }, [activeLoadout, persistLoadout])

  const copyShareLink = useCallback(async () => {
    if (!activeLoadout?.isPublic) return
    const link = `${window.location.origin}/loadout/${activeLoadout.id}`
    try {
      await navigator.clipboard.writeText(link)
      setToast("Public link copied.")
    } catch {
      setToast("Could not copy link.")
    }
  }, [activeLoadout])

  const onAddToSniper = useCallback((slot: LoadoutSlot) => {
    const skin = slot.skinName?.trim()
    const weapon = slot.weaponLabel
    const search = skin
      ? `?skin=${encodeURIComponent(skin)}&weapon=${encodeURIComponent(weapon)}`
      : ""
    window.location.href = `/watchlist${search}`
  }, [])

  return (
    <AuthGate subtitle="Login to proceed">
      <main className="min-h-screen w-full min-w-0 bg-background px-10 py-10 text-foreground">
        {!supabaseReady && (
          <div className="w-full">
            <p className="text-sm text-text-muted">Loading loadouts…</p>
          </div>
        )}

        {supabaseReady && !activeLoadout && (
          <div className="w-full space-y-4">
            <h1 className="font-mono text-2xl font-bold tracking-tight">Loadouts</h1>
            <p className="text-sm text-text-muted">
              No loadouts yet. Create one to start building your CT/T grid.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>New loadout</Button>
          </div>
        )}

        {supabaseReady && activeLoadout && (
        <div className="w-full space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-tight">Loadouts</h1>
            <p className="text-xs text-text-secondary">
              {activeLoadout.name} · {activeLoadout.isPublic ? "Public" : "Private"} · Cloud
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={activeLoadout.id}
                onChange={(e) => {
                  const nextId = e.target.value
                  setActiveLoadoutId(nextId)
                }}
                className="h-8 appearance-none rounded-none border border-input bg-background pl-3 pr-8 font-mono text-xs"
                aria-label="Active loadout"
              >
                {loadouts.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <CaretDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1 text-text-muted" />
            </div>
            <Button variant="outline" onClick={() => setCreateDialogOpen(true)} disabled={isSaving}>
              New
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setRenameValue(activeLoadout.name)
                setRenameDialogOpen(true)
              }}
              disabled={isSaving}
            >
              Rename
            </Button>
            <Button variant="outline" onClick={toggleActivePublic} disabled={isSaving}>
              {activeLoadout.isPublic ? "Make private" : "Make public"}
            </Button>
            <Button
              variant="outline"
              onClick={copyShareLink}
              disabled={!activeLoadout.isPublic}
            >
              Copy link
            </Button>
            {activeLoadout.isPublic && (
              <Button asChild>
                <a href={`/loadout/${activeLoadout.id}`} target="_blank" rel="noreferrer">
                  View public
                </a>
              </Button>
            )}
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-sm">CT / T grid</CardTitle>
            <CardDescription className="text-xs">
              Click a slot to edit. Empty slots can &quot;Add to Watchlist&quot;.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <p className="mb-3 font-mono text-[12px] uppercase tracking-wider text-text-secondary">
                  CT
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CT_SLOTS.map((key) => {
                    const s = activeLoadout.slots[key] ?? defaultSlot(key)
                    return (
                      <SlotCard
                        key={key}
                        slot={s}
                        prefersReducedMotion={prefersReducedMotion}
                        onEdit={() => openSlotEditor(key)}
                        onAddToSniper={() => onAddToSniper(s)}
                      />
                    )
                  })}
                </div>
              </div>
              <div>
                <p className="mb-3 font-mono text-[12px] uppercase tracking-wider text-text-secondary">
                  T
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {T_SLOTS.map((key) => {
                    const s = activeLoadout.slots[key] ?? defaultSlot(key)
                    return (
                      <SlotCard
                        key={key}
                        slot={s}
                        prefersReducedMotion={prefersReducedMotion}
                        onEdit={() => openSlotEditor(key)}
                        onAddToSniper={() => onAddToSniper(s)}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
        )}

      {supabaseReady && (
      <>
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md gap-4">
          <DialogHeader>
            <DialogTitle className="font-mono">Create loadout</DialogTitle>
            <DialogDescription className="text-xs">
              Add a named preset such as Dream, Current, or Budget.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="Loadout name"
            className="font-mono"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createLoadout} disabled={!createName.trim() || isSaving}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="max-w-md gap-4">
          <DialogHeader>
            <DialogTitle className="font-mono">Rename loadout</DialogTitle>
            <DialogDescription className="text-xs">
              Keep names short and scannable (e.g. Dream, Current, Budget).
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Loadout name"
            className="font-mono"
          />
          {!renameValue.trim() && (
            <p className="text-[12px] text-danger">Name is required.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={renameActiveLoadout}
              disabled={!renameValue.trim() || isSaving}
            >
              Save name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeLoadout && (
      <Dialog open={Boolean(editingSlotKey)} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="max-w-md gap-4">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {activeLoadout.slots[editingSlotKey ?? ""]?.weaponLabel ?? editingSlotKey} — slot
            </DialogTitle>
            <DialogDescription className="text-xs">
              Search skin name with suggestions. Float and rarity are optional.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div className="relative">
              <label className="mb-1 block font-mono text-[12px] uppercase text-text-secondary">
                Skin name
              </label>
              <Input
                value={form.skinName ?? ""}
                onChange={(e) => {
                  const nextValue = e.target.value
                  setForm((f) => ({ ...f, skinName: nextValue }))
                  setShowSkinSuggestions(true)
                }}
                onFocus={() => setShowSkinSuggestions(true)}
                placeholder="e.g. AWP | Asiimov"
                className="font-mono"
              />
              {showSkinSuggestions && (isSearchingSkins || skinSuggestions.length > 0) && (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-none border border-border bg-background shadow-lg">
                  {skinSuggestions.map((skin) => (
                    <button
                      key={skin.name}
                      type="button"
                      className="flex w-full items-center gap-2 border-b border-border/60 px-2 py-2 text-left last:border-b-0 hover:bg-surface"
                      onClick={() => {
                        setForm((f) => ({
                          ...f,
                          skinName: skin.name,
                          imageUrl: skin.imageUrl ?? f.imageUrl,
                          rarity: skin.rarity ?? f.rarity,
                        }))
                        setShowSkinSuggestions(false)
                      }}
                    >
                      {skin.imageUrl ? (
                        <img
                          src={skin.imageUrl}
                          alt={skin.name}
                          className="h-8 w-8 shrink-0 object-contain"
                        />
                      ) : (
                        <div className="h-8 w-8 shrink-0 rounded border border-border bg-surface" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs text-foreground">{skin.name}</p>
                        <p className="truncate font-mono text-[12px] uppercase text-text-secondary">
                          {skin.rarity ?? "unknown"}
                        </p>
                      </div>
                    </button>
                  ))}
                  {isSearchingSkins && (
                    <p className="px-2 py-2 font-mono text-[12px] text-text-secondary">Searching…</p>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block font-mono text-[12px] uppercase text-text-secondary">
                  Float
                </label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.0001}
                  value={form.floatValue ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      floatValue: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[12px] uppercase text-text-secondary">
                  Price paid
                </label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.pricePaid ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      pricePaid: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="font-mono tabular-nums"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block font-mono text-[12px] uppercase text-text-secondary">
                Rarity
              </label>
              <select
                value={form.rarity ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    rarity: e.target.value
                      ? (e.target.value as LoadoutSlot["rarity"])
                      : undefined,
                  }))
                }
                className="h-8 w-full rounded-none border border-input bg-background px-2 font-mono text-xs"
              >
                <option value="">—</option>
                {RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={clearSlot} disabled={isSaving}>
              Clear slot
            </Button>
            <div className="flex flex-1 justify-end gap-2">
              <Button variant="outline" onClick={closeEditor}>
                Cancel
              </Button>
              <Button onClick={saveSlot} disabled={isSaving}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      </>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 rounded-none border border-border bg-background px-3 py-2 font-mono text-xs text-foreground shadow-lg">
          {toast}
        </div>
      )}
    </main>
    </AuthGate>
  )
}
