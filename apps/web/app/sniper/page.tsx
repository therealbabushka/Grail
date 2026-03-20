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
import { demoActions, formatMoney, useDemoStore } from "@/lib/prototype-store"

import { AuthRequiredBanner } from "@/components/auth-required-banner"

const WEARS: Wear[] = ["FN", "MW", "FT", "WW", "BS"]
const VARIANTS: Variant[] = ["none", "stattrak", "souvenir"]
const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "CNY"]

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
    buff163: `https://buff.163.com/market/csgo#tab=selling&page_num=1&search=${encoded}`,
  }
}

function id() {
  return `target_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

function watchlistId() {
  return `wl_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

export default function SniperPage() {
  const store = useDemoStore()
  const profile = store.profile
  const targets = store.targets ?? []
  const ui = store.ui
  const watchlists = store.watchlists ?? []
  const alerts = store.alerts ?? []
  const actions = useMemo(() => demoActions(), [])
  const currency = profile.displayCurrency

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

  const draftFromSlot = ui.draftTargetFromSlot
  const [marketPrefill, setMarketPrefill] = useState<{ skin?: string; weapon?: string; wear?: Wear } | null>(
    null,
  )

  useEffect(() => {
    if (activeWatchlistId !== "all") return
    if (!watchlists.length) return
    setActiveWatchlistId(watchlists[0]!.id)
  }, [activeWatchlistId, watchlists])

  useEffect(() => {
    if (watchlists.length > 0) return
    const starter: Watchlist = { id: watchlistId(), name: "Primary" }
    actions.upsertWatchlist(starter)
    setActiveWatchlistId(starter.id)
  }, [actions, watchlists.length])

  const filteredTargets = targets.filter((t) => {
    if (activeWatchlistId !== "all" && t.watchlistId !== activeWatchlistId) return false
    if (statusFilter === "all") return true
    return t.status === statusFilter
  })

  const activeAlerts = useMemo(() => alerts.filter((a) => a.isActive), [alerts])

  const openCreate = useCallback(() => {
    if (draftFromSlot) {
      setForm({
        skinName: "",
        watchlistId: watchlists[0]?.id,
        weaponType: draftFromSlot.weaponLabel,
        variant: "none",
        targetPrice: undefined,
        currency: "USD",
        status: "hunting",
        marketplaceLinks: {},
      })
      actions.consumeTargetDraft()
    } else {
      setForm({
        skinName: "",
        watchlistId: watchlists[0]?.id,
        variant: "none",
        targetPrice: undefined,
        currency: "USD",
        status: "hunting",
        marketplaceLinks: {},
      })
    }
    setEditingId(null)
    setDialogOpen(true)
  }, [draftFromSlot, actions, watchlists])

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
      watchlistId: watchlists[0]?.id,
      weaponType: marketPrefill.weapon || undefined,
      wear: marketPrefill.wear,
      minFloat: wearRange?.minFloat,
      maxFloat: wearRange?.maxFloat,
      variant: "none",
      targetPrice: undefined,
      currency: "USD",
      status: "hunting",
      marketplaceLinks: buildMarketplaceLinks(marketPrefill.skin),
    })
    setEditingId(null)
    setDialogOpen(true)
    // Leave the query in place (demo); user can refresh/share.
  }, [marketPrefill])

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
  const canSubmit = formSkinName.length > 0 && targetPriceValid && !floatRangeInvalid

  const handleSubmit = () => {
    if (!canSubmit) return
    const target: Target = {
      id: editingId ?? id(),
      skinName: formSkinName || "Unknown",
      watchlistId: form.watchlistId,
      weaponType: form.weaponType,
      wear: form.wear,
      variant: form.variant ?? "none",
      targetPrice: targetPriceValue,
      currency: form.currency ?? "USD",
      minFloat: form.minFloat,
      maxFloat: form.maxFloat,
      imageUrl: form.imageUrl,
      notes: form.notes?.trim(),
      status: (form.status as TargetStatus) ?? "hunting",
      acquiredPrice: form.acquiredPrice,
      acquiredDate: form.acquiredDate,
      marketplaceLinks: form.marketplaceLinks ?? buildMarketplaceLinks(formSkinName),
    }
    actions.upsertTarget(target)
    setDialogOpen(false)
    setEditingId(null)
    setForm({})
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
    actions.upsertTarget({
      ...acquireDialogTarget,
      status: "acquired",
      acquiredPrice: parsed,
      acquiredDate: acquireDate,
    })
    setStampVisible(acquireDialogTarget.id)
    setAcquireDialogTarget(null)
    setAcquirePrice("")
    setAcquireDate("")
  }, [acquireDate, acquireDialogTarget, acquirePrice, actions])

  const createWatchlist = () => {
    const name = watchlistName.trim()
    if (!name) return
    const wl: Watchlist = { id: watchlistId(), name }
    actions.upsertWatchlist(wl)
    setActiveWatchlistId(wl.id)
    setWatchlistName("")
  }

  const createAlert = () => {
    const name = alertSkin.trim()
    const p = Number(alertPrice)
    if (!name || !Number.isFinite(p) || p <= 0) return
    const a: PriceAlert = {
      id: `alert_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`,
      itemName: name,
      condition: "below",
      triggerPrice: p,
      currency: "USD",
      isActive: true,
    }
    actions.upsertAlert(a)
    setAlertDialogOpen(false)
    setAlertSkin("")
    setAlertPrice(0)
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

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        <AuthRequiredBanner
          subtitle="Sign in to sync watchlist targets to your account. While signed out, this page uses demo data."
        />
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

        {draftFromSlot && (
          <Card className="border-info/50 bg-info/5">
            <CardContent className="flex items-center justify-between py-3">
              <p className="text-xs text-foreground">
                Target draft from Loadout: <span className="font-mono">{draftFromSlot.weaponLabel}</span>
              </p>
              <Button size="sm" variant="outline" onClick={openCreate}>
                Use draft
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Status tabs */}
        <div className="flex gap-1">
          {(["all", "hunting", "acquired", "abandoned"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "ghost"}
              size="sm"
              className="font-mono text-[11px]"
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
              <p className="text-[11px] text-text-muted">
                Active: {activeAlerts.length} · Triggered now: {triggered.length}
              </p>
              <Button size="sm" variant="outline" onClick={() => setAlertDialogOpen(true)} className="font-mono text-[11px]">
                New alert
              </Button>
            </div>
            {triggered.length > 0 && (
              <div className="rounded-none border border-profit/40 bg-profit/5 p-2 text-[11px]">
                <p className="font-mono text-[10px] uppercase tracking-wider text-profit">Triggered</p>
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
                    className={`shrink-0 font-mono text-[10px] ${
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
                    <Button size="xs" variant="outline" asChild onClick={() => actions.primeTradeFromTarget(t.id)}>
                      <Link href="/trade-links" className="font-mono text-[11px]">
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
                        className="font-mono text-[10px] text-info hover:underline"
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
              <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">
                Skin name
              </label>
              <Input
                value={form.skinName ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, skinName: e.target.value }))}
                placeholder="e.g. M4A1-S | Printstream"
                className="font-mono"
              />
              {!formSkinName && (
                <p className="mt-1 text-[11px] text-danger">Enter the exact skin name to generate links.</p>
              )}
            </div>
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">
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
                <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">
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
                <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">
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
                <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">
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
                  <p className="mt-1 text-[11px] text-danger">Target price must be greater than 0.</p>
                )}
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">
                  Currency
                </label>
                <select
                  value={form.currency ?? "USD"}
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
                <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">
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
                <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">
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
              <p className="text-[11px] text-danger">
                Float values must be within 0.0000-1.0000 and min float cannot exceed max float.
              </p>
            )}
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">
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
              <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">
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
              <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">
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
              <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">Skin</label>
              <Input value={acquireDialogTarget?.skinName ?? ""} disabled className="font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">
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
                <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">
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
  )
}
