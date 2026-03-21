"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"

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

import type { Target, Wear, Variant, Currency, TargetStatus, Watchlist, PriceAlert } from "@/lib/demo-seed"
import { formatMoney } from "@/lib/prototype-store"

import { AuthGate } from "@/components/auth-gate"

import { createClient as createBrowserClient } from "@/lib/supabase/browser"

const WEARS: Wear[] = ["FN", "MW", "FT", "WW", "BS"]
const VARIANTS: Variant[] = ["none", "stattrak", "souvenir"]
const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "CNY"]

function normalizeWatchlists(
  rows: { id: string; name: string; color: string | null }[] | null,
): Watchlist[] {
  return (rows ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    color: w.color ?? undefined,
  }))
}

function parseWear(value: string | null | undefined): Wear | undefined {
  if (!value) return undefined
  return WEARS.includes(value as Wear) ? (value as Wear) : undefined
}

function parseVariant(value: string | null | undefined): Variant {
  if (value && VARIANTS.includes(value as Variant)) return value as Variant
  return "none"
}

function floatRangeFromWear(w: Wear): { minFloat: number; maxFloat: number } {
  // CS2 float tiers (approx); used to prefill range when coming from market exterior selection.
  switch (w) {
    case "FN":
      return { minFloat: 0.0, maxFloat: 0.07 }
    case "MW":
      return { minFloat: 0.07, maxFloat: 0.15 }
    case "FT":
      return { minFloat: 0.15, maxFloat: 0.38 }
    case "WW":
      return { minFloat: 0.38, maxFloat: 0.45 }
    case "BS":
      return { minFloat: 0.45, maxFloat: 1.0 }
  }
}

function buildMarketplaceLinks(skinName: string): Record<string, string> {
  const encoded = encodeURIComponent(skinName)
  return {
    steam: `https://steamcommunity.com/market/search?q=${encoded}`,
    skinport: `https://skinport.com/item/cs2?search=${encoded}`,
    csfloat: `https://csfloat.com/search?q=${encoded}`,
    csmoney: `https://cs.money/market/buy/?search=${encoded}`,
    buff163: `https://buff.163.com/market/csgo#tab=selling&page_num=1&search=${encoded}`,
  }
}

function newId() {
  const c = globalThis.crypto
  if (c && "randomUUID" in c && typeof c.randomUUID === "function") return c.randomUUID()
  if (!c || typeof c.getRandomValues !== "function") return `${Date.now()}`
  // RFC 4122 v4 fallback
  const bytes = new Uint8Array(16)
  c.getRandomValues(bytes)
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function newWatchlistId() {
  return newId()
}

export default function SniperPage() {
  const supabase = useMemo(() => createBrowserClient(), [])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const [currency, setCurrency] = useState<Currency>("USD")
  const [targets, setTargets] = useState<Target[]>([])
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [alerts, setAlerts] = useState<PriceAlert[]>([])

  const [statusFilter, setStatusFilter] = useState<"all" | "hunting" | "acquired" | "abandoned">("all")
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Target>>({})
  const [stampVisible, setStampVisible] = useState<string | null>(null)
  const [watchlistName, setWatchlistName] = useState("")
  const [alertDialogOpen, setAlertDialogOpen] = useState(false)
  const [alertSkin, setAlertSkin] = useState("")
  const [alertPrice, setAlertPrice] = useState<number>(0)
  const [triggered, setTriggered] = useState<PriceAlert[]>([])
  const [acquireDialogTarget, setAcquireDialogTarget] = useState<Target | null>(null)
  const [acquirePrice, setAcquirePrice] = useState<string>("")
  const [acquireDate, setAcquireDate] = useState<string>("")

  const [marketPrefill, setMarketPrefill] = useState<{ skin?: string; weapon?: string; wear?: Wear } | null>(
    null,
  )

  const refreshAll = useCallback(
    async (overrideUserId?: string) => {
      if (!supabase) return
      const effectiveUserId = overrideUserId ?? userId
      if (!effectiveUserId) return

      const [{ data: wlRows }, { data: tRows }, { data: linkRows }, { data: alRows }] = await Promise.all([
        supabase
          .from("target_watchlists")
          .select("id, name, color")
          .eq("user_id", effectiveUserId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("targets")
          .select(
            "id, skin_name, wear, variant, target_price, currency, min_float, max_float, image_url, notes, status, acquired_price, acquired_date, marketplace_links",
          )
          .eq("user_id", effectiveUserId)
          .order("created_at", { ascending: false }),
        supabase
          .from("target_watchlist_items")
          .select("target_id, watchlist_id")
          .eq("user_id", effectiveUserId),
        supabase
          .from("price_alerts")
          .select("id, item_name, market, currency, condition, trigger_price, is_active, last_triggered_at")
          .eq("user_id", effectiveUserId)
          .order("created_at", { ascending: false }),
      ])

      let wl = normalizeWatchlists(wlRows)

      // Auto-create an empty "Primary" watchlist (no dummy targets).
      if (wl.length === 0) {
        const inserted = await supabase.from("target_watchlists").insert({
          user_id: effectiveUserId,
          name: "Primary",
          color: "info",
        })
        if (inserted.error) throw inserted.error
        const { data: wlRefetched } = await supabase
          .from("target_watchlists")
          .select("id, name, color")
          .eq("user_id", effectiveUserId)
          .order("sort_order", { ascending: true })
        wl = normalizeWatchlists(wlRefetched)
        setWatchlists(wl)
      } else {
        setWatchlists(wl)
      }

      const watchlistByTargetId = new Map<string, string>()
      for (const l of linkRows ?? []) {
        if (l.watchlist_id) watchlistByTargetId.set(l.target_id, l.watchlist_id)
      }

      const mappedTargets: Target[] = (tRows ?? []).map((r) => ({
        id: r.id,
        skinName: r.skin_name,
        watchlistId: watchlistByTargetId.get(r.id) ?? wl[0]?.id ?? undefined,
        weaponType: undefined,
        wear: parseWear(r.wear),
        variant: parseVariant(r.variant),
        targetPrice: Number(r.target_price),
        currency: r.currency as Currency,
        minFloat: typeof r.min_float === "number" ? r.min_float : undefined,
        maxFloat: typeof r.max_float === "number" ? r.max_float : undefined,
        imageUrl: r.image_url ?? undefined,
        notes: r.notes ?? undefined,
        status: r.status as TargetStatus,
        acquiredPrice: typeof r.acquired_price === "number" ? r.acquired_price : undefined,
        acquiredDate: typeof r.acquired_date === "string" ? r.acquired_date : undefined,
        marketplaceLinks:
          r.marketplace_links && typeof r.marketplace_links === "object" && Object.keys(r.marketplace_links as any).length
            ? (r.marketplace_links as any)
            : undefined,
      }))

      const mappedAlerts: PriceAlert[] = (alRows ?? []).map((a) => ({
        id: a.id,
        itemName: a.item_name,
        market: a.market ?? undefined,
        condition: a.condition as "below" | "above",
        triggerPrice: Number(a.trigger_price),
        currency: a.currency as Currency,
        isActive: a.is_active,
        lastTriggeredAt: a.last_triggered_at ?? undefined,
      }))

      setTargets(mappedTargets)
      setAlerts(mappedAlerts)
    },
    [supabase, userId],
  )

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!supabase) {
        setLoadError("Supabase is not configured.")
        setIsLoading(false)
        return
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setLoadError("Sign in required.")
          setIsLoading(false)
          return
        }

        setUserId(user.id)
        await refreshAll(user.id)

        if (!cancelled) setIsLoading(false)
      } catch (e) {
        if (cancelled) return
        setLoadError(e instanceof Error ? e.message : "Failed to load watchlist.")
        setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [supabase, refreshAll])

  useEffect(() => {
    if (activeWatchlistId !== "all") return
    if (!watchlists.length) return
    setActiveWatchlistId(watchlists[0]!.id)
  }, [activeWatchlistId, watchlists])

  const filteredTargets = targets.filter((t) => {
    if (activeWatchlistId !== "all" && t.watchlistId !== activeWatchlistId) return false
    if (statusFilter === "all") return true
    return t.status === statusFilter
  })

  const activeAlerts = useMemo(() => alerts.filter((a) => a.isActive), [alerts])

  const openCreate = useCallback(() => {
    const defaultWatchlistId = activeWatchlistId !== "all" ? activeWatchlistId : watchlists[0]?.id
    setForm({
      skinName: "",
      watchlistId: defaultWatchlistId,
      variant: "none",
      targetPrice: undefined,
      currency,
      status: "hunting",
      marketplaceLinks: undefined,
    })
    setEditingId(null)
    setDialogOpen(true)
  }, [activeWatchlistId, currency, watchlists])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const skin = params.get("skin") ?? undefined
    const weapon = params.get("weapon") ?? undefined
    const wearParam = params.get("wear") ?? undefined
    const wear = wearParam && WEARS.includes(wearParam as Wear) ? (wearParam as Wear) : undefined
    if (!skin) return
    setMarketPrefill({ skin, weapon, wear })
  }, [])

  useEffect(() => {
    if (!marketPrefill?.skin) return
    const wearRange = marketPrefill.wear ? floatRangeFromWear(marketPrefill.wear) : null
    setForm({
      skinName: marketPrefill.skin,
      watchlistId: activeWatchlistId !== "all" ? activeWatchlistId : watchlists[0]?.id,
      weaponType: marketPrefill.weapon || undefined,
      wear: marketPrefill.wear,
      minFloat: wearRange?.minFloat,
      maxFloat: wearRange?.maxFloat,
      variant: "none",
      targetPrice: undefined,
      currency,
      status: "hunting",
      marketplaceLinks: buildMarketplaceLinks(marketPrefill.skin),
    })
    setEditingId(null)
    setDialogOpen(true)
    // Leave the query in place (demo); user can refresh/share.
  }, [marketPrefill, currency, activeWatchlistId, watchlists])

  // If URL prefill ran before watchlists loaded, `watchlistId` can be missing; patch when lists arrive.
  useEffect(() => {
    if (!marketPrefill?.skin) return
    if (!watchlists.length) return
    setForm((f) => {
      if (f.watchlistId) return f
      const nextId = activeWatchlistId !== "all" ? activeWatchlistId : watchlists[0]?.id
      if (!nextId) return f
      return { ...f, watchlistId: nextId }
    })
  }, [marketPrefill, watchlists, activeWatchlistId])

  const openEdit = useCallback((t: Target) => {
    setForm({
      skinName: t.skinName,
      watchlistId: t.watchlistId,
      weaponType: t.weaponType,
      wear: t.wear,
      variant: t.variant,
      targetPrice: t.targetPrice,
      currency: t.currency,
      minFloat: t.minFloat,
      maxFloat: t.maxFloat,
      imageUrl: t.imageUrl,
      notes: t.notes,
      status: t.status,
      acquiredPrice: t.acquiredPrice,
      acquiredDate: t.acquiredDate,
      marketplaceLinks: t.marketplaceLinks ?? {},
    })
    setEditingId(t.id)
    setDialogOpen(true)
  }, [])

  const formSkinName = form.skinName?.trim() ?? ""
  const targetPriceValue =
    typeof form.targetPrice === "number" ? form.targetPrice : Number(form.targetPrice)
  const targetPriceValid = Number.isFinite(targetPriceValue) && targetPriceValue > 0
  const minFloatProvided = typeof form.minFloat === "number" && Number.isFinite(form.minFloat)
  const maxFloatProvided = typeof form.maxFloat === "number" && Number.isFinite(form.maxFloat)
  const floatRangeInvalid =
    (minFloatProvided && (form.minFloat! < 0 || form.minFloat! > 1)) ||
    (maxFloatProvided && (form.maxFloat! < 0 || form.maxFloat! > 1)) ||
    (minFloatProvided && maxFloatProvided && form.minFloat! > form.maxFloat!)
  const canSubmit = formSkinName.length > 0 && targetPriceValid && !floatRangeInvalid && Boolean(form.watchlistId)

  const handleSubmit = () => {
    if (!canSubmit) return
    if (!supabase) return
    if (!userId) return
    const watchlistId = form.watchlistId ?? watchlists[0]?.id
    if (!watchlistId) return
    const target: Target = {
      id: editingId ?? newId(),
      skinName: formSkinName || "Unknown",
      watchlistId,
      weaponType: form.weaponType,
      wear: form.wear,
      variant: form.variant ?? "none",
      targetPrice: targetPriceValue,
      currency: (form.currency ?? currency) as Currency,
      minFloat: form.minFloat,
      maxFloat: form.maxFloat,
      imageUrl: form.imageUrl,
      notes: form.notes?.trim(),
      status: (form.status as TargetStatus) ?? "hunting",
      acquiredPrice: form.acquiredPrice,
      acquiredDate: form.acquiredDate,
      marketplaceLinks: form.marketplaceLinks ?? buildMarketplaceLinks(formSkinName),
    }

    ;(async () => {
      try {
        const marketplaceLinks = target.marketplaceLinks ?? buildMarketplaceLinks(target.skinName)

        const { error: targetErr } = await supabase.from("targets").upsert({
          id: target.id,
          user_id: userId,
          skin_name: target.skinName,
          wear: target.wear ?? null,
          variant: target.variant,
          image_url: target.imageUrl ?? null,
          target_price: target.targetPrice,
          currency: target.currency,
          min_float: target.minFloat ?? null,
          max_float: target.maxFloat ?? null,
          status: target.status,
          acquired_price: target.status === "acquired" ? target.acquiredPrice ?? null : null,
          acquired_date: target.status === "acquired" ? target.acquiredDate ?? null : null,
          notes: target.notes ?? null,
          marketplace_links: marketplaceLinks ?? {},
        })

        if (targetErr) throw targetErr

        // Keep watchlist membership in sync with the selected watchlist.
        const { error: linkDelErr } = await supabase
          .from("target_watchlist_items")
          .delete()
          .eq("target_id", target.id)
          .eq("user_id", userId)
        if (linkDelErr) throw linkDelErr

        const { error: linkInsErr } = await supabase
          .from("target_watchlist_items")
          .insert({
            user_id: userId,
            watchlist_id: watchlistId,
            target_id: target.id,
          })
        if (linkInsErr) throw linkInsErr

        await refreshAll()
        setDialogOpen(false)
        setEditingId(null)
        setForm({})
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to save target.")
      }
    })()
  }

  const openAcquireDialog = useCallback((target: Target) => {
    setAcquireDialogTarget(target)
    setAcquirePrice(
      Number.isFinite(target.targetPrice) && target.targetPrice > 0 ? String(target.targetPrice) : ""
    )
    setAcquireDate(new Date().toISOString().slice(0, 10))
  }, [])

  const confirmAcquire = useCallback(() => {
    if (!acquireDialogTarget) return
    const parsed = Number(acquirePrice)
    if (!Number.isFinite(parsed) || parsed <= 0 || !acquireDate) return

    if (!supabase) return
    if (!userId) return

    ;(async () => {
      try {
        const { error } = await supabase
          .from("targets")
          .update({
            status: "acquired",
            acquired_price: parsed,
            acquired_date: acquireDate,
          })
          .eq("id", acquireDialogTarget.id)
          .eq("user_id", userId)

        if (error) throw error

        await refreshAll()
        setStampVisible(acquireDialogTarget.id)
        setAcquireDialogTarget(null)
        setAcquirePrice("")
        setAcquireDate("")
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to mark acquired.")
      }
    })()
  }, [acquireDate, acquireDialogTarget, acquirePrice, refreshAll, supabase, userId])

  const createWatchlist = () => {
    const name = watchlistName.trim()
    if (!name) return

    if (!supabase) return
    if (!userId) return

    ;(async () => {
      try {
        const { data, error } = await supabase
          .from("target_watchlists")
          .insert({
            user_id: userId,
            name,
            color: "info",
          })
          .select("id")
          .single()

        if (error) throw error

        await refreshAll()
        setActiveWatchlistId(data.id)
        setWatchlistName("")
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to create watchlist.")
      }
    })()
  }

  const createAlert = () => {
    const name = alertSkin.trim()
    const p = Number(alertPrice)
    if (!name || !Number.isFinite(p) || p <= 0) return

    if (!supabase) return
    if (!userId) return

    ;(async () => {
      try {
        const { error } = await supabase.from("price_alerts").insert({
          user_id: userId,
          item_name: name,
          market: null,
          condition: "below",
          trigger_price: p,
          currency,
          is_active: true,
        })

        if (error) throw error

        await refreshAll()
        setAlertDialogOpen(false)
        setAlertSkin("")
        setAlertPrice(0)
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to create alert.")
      }
    })()
  }

  useEffect(() => {
    let cancelled = false
    async function poll() {
      const nextTriggered: PriceAlert[] = []
      for (const a of activeAlerts) {
        try {
          const res = await fetch(`/api/pricing/snapshot?item=${encodeURIComponent(a.itemName)}&currency=${a.currency}`)
          if (!res.ok) continue
          const json = (await res.json()) as { markets?: Array<{ price: number | null }> }
          const prices = (json.markets ?? []).map((m) => m.price).filter((x): x is number => typeof x === "number")
          const best = prices.length ? Math.min(...prices) : null
          if (best == null) continue
          const hit = a.condition === "below" ? best <= a.triggerPrice : best >= a.triggerPrice
          if (hit) nextTriggered.push(a)
        } catch {
          // ignore
        }
      }
      if (!cancelled) setTriggered(nextTriggered)
    }
    if (activeAlerts.length) poll()
    const t = setInterval(() => {
      if (activeAlerts.length) poll()
    }, 60_000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [activeAlerts])

  useEffect(() => {
    if (!stampVisible) return
    const t = setTimeout(() => setStampVisible(null), 1200)
    return () => clearTimeout(t)
  }, [stampVisible])

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mq.matches)
    const on = () => setPrefersReducedMotion(mq.matches)
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])

  if (isLoading) {
    return (
      <AuthGate subtitle="Login to proceed">
        <main className="min-h-screen w-full min-w-0 bg-background px-10 py-10 text-foreground">
          <div className="w-full space-y-6">
            <p className="text-sm text-text-muted">Loading watchlist…</p>
          </div>
        </main>
      </AuthGate>
    )
  }

  if (loadError) {
    return (
      <AuthGate subtitle="Login to proceed">
        <main className="min-h-screen w-full min-w-0 bg-background px-10 py-10 text-foreground">
          <div className="w-full space-y-6">
            <Card className="border-destructive/40">
              <CardContent className="py-6 text-sm text-destructive">Failed to load: {loadError}</CardContent>
            </Card>
          </div>
        </main>
      </AuthGate>
    )
  }

  return (
    <AuthGate subtitle="Login to proceed">
      <main className="min-h-screen w-full min-w-0 bg-background px-10 py-10 text-foreground">
        <div className="w-full space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-tight">
              Watchlist
            </h1>
            <p className="text-xs text-text-secondary">
              Target watchlist · Float range · Marketplace links
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <select
                value={activeWatchlistId}
                onChange={(e) => setActiveWatchlistId(e.target.value)}
                className="h-9 rounded-none border border-input bg-background px-2 font-mono text-xs"
                aria-label="Watchlist"
              >
                <option value="all">All watchlists</option>
                {watchlists.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              <Input
                value={watchlistName}
                onChange={(e) => setWatchlistName(e.target.value)}
                placeholder="New watchlist…"
                className="h-9 w-40 font-mono text-xs"
              />
              <Button size="sm" variant="outline" onClick={createWatchlist} className="font-mono text-xs">
                Add
              </Button>
            </div>
            <Button onClick={openCreate} className="font-mono text-xs tracking-wide">
              Add target
            </Button>
          </div>
        </header>

        {/* Status tabs */}
        <div className="flex gap-1">
          {(["all", "hunting", "acquired", "abandoned"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "ghost"}
              size="sm"
              className="font-mono text-[12px]"
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </Button>
          ))}
        </div>

        <Card className="border-border bg-background/40">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-sm">Alerts (GTT-like)</CardTitle>
            <CardDescription className="text-xs">
              Notify when best price crosses your level (link-only execution).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] text-text-muted">
                Active: {activeAlerts.length} · Triggered now: {triggered.length}
              </p>
              <Button size="sm" variant="outline" onClick={() => setAlertDialogOpen(true)} className="font-mono text-[12px]">
                New alert
              </Button>
            </div>
            {triggered.length > 0 && (
              <div className="rounded-none border border-profit/40 bg-profit/5 p-2 text-[12px]">
                <p className="font-mono text-[12px] uppercase tracking-wider text-profit">Triggered</p>
                <div className="mt-1 space-y-1">
                  {triggered.slice(0, 5).map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3">
                      <span className="text-foreground">{a.itemName}</span>
                      <span className="font-mono tabular-nums text-profit">
                        ≤ {formatMoney(a.triggerPrice, a.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Target cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTargets.map((t) => (
            <Card
              key={t.id}
              className={`relative overflow-hidden border-border ${
                t.status === "acquired" ? "border-profit/50" : ""
              }`}
            >
              {t.status === "acquired" && stampVisible === t.id && !prefersReducedMotion && (
                <div
                  className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-profit/10"
                  aria-hidden
                >
                  <span className="font-mono text-2xl font-bold uppercase tracking-widest text-profit animate-in fade-in zoom-in duration-300">
                    Acquired
                  </span>
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="font-mono text-sm line-clamp-2">
                    {t.skinName}
                  </CardTitle>
                  <span
                    className={`shrink-0 font-mono text-[12px] ${
                      t.status === "hunting"
                        ? "text-warning"
                        : t.status === "acquired"
                          ? "text-profit"
                          : "text-text-muted"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <CardDescription className="font-mono text-xs text-text-secondary">
                  {formatMoney(t.targetPrice, t.currency)}
                  {t.minFloat != null && t.maxFloat != null && (
                    <> · {t.minFloat.toFixed(2)}–{t.maxFloat.toFixed(2)} float</>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" size="xs" onClick={() => openEdit(t)}>
                    Edit
                  </Button>
                  {t.status === "hunting" && (
                    <Button
                      size="xs"
                      onClick={() => openAcquireDialog(t)}
                      className="text-profit"
                    >
                      Mark acquired
                    </Button>
                  )}
                  {t.status === "acquired" && (
                    <Button size="xs" variant="outline" asChild>
                      <Link
                        href={`/trade-links?skin=${encodeURIComponent(t.skinName)}&variant=${encodeURIComponent(t.variant)}&wear=${encodeURIComponent(
                          t.wear ?? "",
                        )}&buyPrice=${encodeURIComponent(String(t.acquiredPrice ?? t.targetPrice))}&currency=${encodeURIComponent(
                          t.currency,
                        )}&floatValue=${encodeURIComponent(t.maxFloat != null ? String(t.maxFloat) : "")}&notes=${encodeURIComponent(
                          t.notes ?? "",
                        )}&buyDate=${encodeURIComponent(t.acquiredDate ?? "")}`}
                        className="font-mono text-[12px]"
                      >
                        Log as trade →
                      </Link>
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 border-t border-border pt-2">
                  {Object.entries(t.marketplaceLinks ?? buildMarketplaceLinks(t.skinName)).map(
                    ([site, url]) => (
                      <a
                        key={site}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[12px] text-info hover:underline"
                      >
                        {site}
                      </a>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTargets.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-text-muted">
              No targets match. Add one or change filter.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md gap-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {editingId ? "Edit target" : "Add target"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Skin name and target price are required. Float and notes help narrow listings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div>
              <label className="mb-1 block font-mono text-[12px] uppercase text-text-secondary">
                Skin name
              </label>
              <Input
                value={form.skinName ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, skinName: e.target.value }))}
                placeholder="e.g. M4A1-S | Printstream"
                className="font-mono"
              />
              {!formSkinName && (
                <p className="mt-1 text-[12px] text-danger">Enter the exact skin name to generate links.</p>
              )}
            </div>
            <div>
              <label className="mb-1 block font-mono text-[12px] uppercase text-text-secondary">
                Watchlist
              </label>
              <select
                value={form.watchlistId ?? watchlists[0]?.id ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, watchlistId: e.target.value || undefined }))}
                className="h-8 w-full rounded-none border border-input bg-background px-2 font-mono text-xs"
              >
                {watchlists.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block font-mono text-[12px] uppercase text-text-secondary">
                  Wear
                </label>
                <select
                  value={form.wear ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, wear: (e.target.value || undefined) as Wear | undefined }))}
                  className="h-8 w-full rounded-none border border-input bg-background px-2 font-mono text-xs"
                >
                  <option value="">—</option>
                  {WEARS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-mono text-[12px] uppercase text-text-secondary">
                  Variant
                </label>
                <select
                  value={form.variant ?? "none"}
                  onChange={(e) => setForm((f) => ({ ...f, variant: e.target.value as Variant }))}
                  className="h-8 w-full rounded-none border border-input bg-background px-2 font-mono text-xs"
                >
                  {VARIANTS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block font-mono text-[12px] uppercase text-text-secondary">
                  Target price
                </label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.targetPrice ?? ""}
                  onChange={(e) => {
                    const next = e.target.value
                    setForm((f) => ({
                      ...f,
                      targetPrice: next === "" ? undefined : Number(next),
                    }))
                  }}
                  className="font-mono tabular-nums"
                />
                {!targetPriceValid && (
                  <p className="mt-1 text-[12px] text-danger">Target price must be greater than 0.</p>
                )}
              </div>
              <div>
                <label className="mb-1 block font-mono text-[12px] uppercase text-text-secondary">
                  Currency
                </label>
                <select
                  value={form.currency ?? currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as Currency }))}
                  className="h-8 w-full rounded-none border border-input bg-background px-2 font-mono text-xs"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block font-mono text-[12px] uppercase text-text-secondary">
                  Min float
                </label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.0001}
                  value={form.minFloat ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      minFloat: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[12px] uppercase text-text-secondary">
                  Max float
                </label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.0001}
                  value={form.maxFloat ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      maxFloat: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="font-mono tabular-nums"
                />
              </div>
            </div>
            {floatRangeInvalid && (
              <p className="text-[12px] text-danger">
                Float values must be within 0.0000-1.0000 and min float cannot exceed max float.
              </p>
            )}
            <div>
              <label className="mb-1 block font-mono text-[12px] uppercase text-text-secondary">
                Notes
              </label>
              <Input
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {editingId ? "Save" : "Add target"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent className="max-w-md gap-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">New alert</DialogTitle>
            <DialogDescription className="text-xs">
              Trigger when best price drops below your level.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div>
              <label className="mb-1 block font-mono text-[12px] uppercase text-text-secondary">
                Skin name
              </label>
              <Input
                value={alertSkin}
                onChange={(e) => setAlertSkin(e.target.value)}
                placeholder="e.g. AWP | Asiimov"
                className="font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[12px] uppercase text-text-secondary">
                Trigger price (USD)
              </label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={alertPrice || ""}
                onChange={(e) => setAlertPrice(Number(e.target.value) || 0)}
                className="font-mono tabular-nums"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlertDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createAlert} disabled={!alertSkin.trim() || alertPrice <= 0}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(acquireDialogTarget)} onOpenChange={(open) => !open && setAcquireDialogTarget(null)}>
        <DialogContent className="max-w-md gap-4">
          <DialogHeader>
            <DialogTitle className="font-mono">Mark acquired</DialogTitle>
            <DialogDescription className="text-xs">
              Save actual fill details so Trades can be prefilled correctly.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div>
              <label className="mb-1 block font-mono text-[12px] uppercase text-text-secondary">Skin</label>
              <Input value={acquireDialogTarget?.skinName ?? ""} disabled className="font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block font-mono text-[12px] uppercase text-text-secondary">
                  Acquired price
                </label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={acquirePrice}
                  onChange={(e) => setAcquirePrice(e.target.value)}
                  className="font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[12px] uppercase text-text-secondary">
                  Acquired date
                </label>
                <Input
                  type="date"
                  value={acquireDate}
                  onChange={(e) => setAcquireDate(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcquireDialogTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmAcquire}
              disabled={!acquireDate || !Number.isFinite(Number(acquirePrice)) || Number(acquirePrice) <= 0}
            >
              Confirm acquired
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </main>
    </AuthGate>
  )
}
