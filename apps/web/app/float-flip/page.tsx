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

import type { Trade, Wear, Variant, Currency, TradeStatus } from "@/lib/demo-seed"
import { demoActions, computeTradeStats, formatMoney, useDemoStore } from "@/lib/prototype-store"

import { AuthRequiredBanner } from "@/components/auth-required-banner"

const WEARS: Wear[] = ["FN", "MW", "FT", "WW", "BS"]
const VARIANTS: Variant[] = ["none", "stattrak", "souvenir"]
const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "CNY"]

function emptyTrade(): Omit<Trade, "id"> {
  return {
    skinName: "",
    wear: "FT",
    variant: "none",
    buyPrice: 0,
    status: "open",
    currency: "USD",
    buyDate: new Date().toISOString().slice(0, 10),
  }
}

function id() {
  return `trade_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

export default function FloatFlipPage() {
  const { profile, trades, ui } = useDemoStore()
  const actions = useMemo(() => demoActions(), [])
  const stats = computeTradeStats(trades)
  const currency = profile.displayCurrency

  const openTrades = useMemo(() => trades.filter((t) => t.status === "open"), [trades])
  const [openPrices, setOpenPrices] = useState<Record<string, number | null>>({})
  const holdings = useMemo(() => {
    return openTrades.map((t) => {
      const p = openPrices[t.id] ?? null
      const pnl = p != null ? p - t.buyPrice : null
      const pnlPct = pnl != null && t.buyPrice ? (pnl / t.buyPrice) * 100 : null
      return { trade: t, currentPrice: p, pnl, pnlPct }
    })
  }, [openTrades, openPrices])

  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "sold">("all")
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyTrade())
  const [deleteTradeId, setDeleteTradeId] = useState<string | null>(null)

  const draftFromTarget = ui.draftTradeFromTarget
  const [marketPrefill, setMarketPrefill] = useState<{ skin?: string; weapon?: string } | null>(null)

  const filteredTrades = trades.filter((t) => {
    if (statusFilter === "open" && t.status !== "open") return false
    if (statusFilter === "sold" && t.status !== "sold") return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!t.skinName.toLowerCase().includes(q)) return false
    }
    return true
  })

  const openCreate = useCallback(() => {
    if (draftFromTarget) {
      setForm({
        skinName: draftFromTarget.skinName,
        weaponType: draftFromTarget.weaponType,
        wear: (draftFromTarget.wear ?? "FT") as Wear,
        variant: draftFromTarget.variant,
        floatValue: draftFromTarget.maxFloat,
        imageUrl: draftFromTarget.imageUrl,
        buyPrice: draftFromTarget.acquiredPrice ?? draftFromTarget.targetPrice,
        sellPrice: undefined,
        status: "open",
        currency: draftFromTarget.currency,
        buyDate: new Date().toISOString().slice(0, 10),
        notes: draftFromTarget.notes,
      })
      actions.consumeTradeDraft()
    } else {
      setForm(emptyTrade())
    }
    setEditingId(null)
    setDialogOpen(true)
  }, [draftFromTarget, actions])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const skin = params.get("skin") ?? undefined
    const weapon = params.get("weapon") ?? undefined
    if (!skin) return
    setMarketPrefill({ skin, weapon })
  }, [])

  useEffect(() => {
    if (!marketPrefill?.skin) return
    setForm({
      skinName: marketPrefill.skin,
      weaponType: marketPrefill.weapon || undefined,
      wear: "FT",
      variant: "none",
      buyPrice: 0,
      status: "open",
      currency: "USD",
      buyDate: new Date().toISOString().slice(0, 10),
    })
    setEditingId(null)
    setDialogOpen(true)
    // Leave the query in place (demo).
  }, [marketPrefill])

  useEffect(() => {
    let cancelled = false
    async function loadPrices() {
      const next: Record<string, number | null> = {}
      for (const t of openTrades) {
        try {
          const res = await fetch(`/api/pricing/snapshot?item=${encodeURIComponent(t.skinName)}&currency=${t.currency}`)
          if (!res.ok) {
            next[t.id] = null
            continue
          }
          const json = (await res.json()) as { markets?: Array<{ price: number | null }> }
          const prices = (json.markets ?? []).map((m) => m.price).filter((x): x is number => typeof x === "number")
          next[t.id] = prices.length ? Math.min(...prices) : null
        } catch {
          next[t.id] = null
        }
      }
      if (!cancelled) setOpenPrices(next)
    }
    if (openTrades.length) loadPrices()
    return () => {
      cancelled = true
    }
  }, [openTrades])

  const openEdit = useCallback((t: Trade) => {
    setForm({
      skinName: t.skinName,
      weaponType: t.weaponType,
      wear: t.wear,
      variant: t.variant,
      floatValue: t.floatValue,
      imageUrl: t.imageUrl,
      buyPrice: t.buyPrice,
      sellPrice: t.sellPrice,
      status: t.status,
      currency: t.currency,
      buyDate: t.buyDate,
      sellDate: t.sellDate,
      notes: t.notes,
    })
    setEditingId(t.id)
    setDialogOpen(true)
  }, [])

  const formSkinName = form.skinName.trim()
  const buyPriceValue = Number(form.buyPrice)
  const buyPriceValid = Number.isFinite(buyPriceValue) && buyPriceValue > 0
  const sellPriceValue = Number(form.sellPrice ?? 0)
  const sellPriceValid =
    form.status === "open" || (Number.isFinite(sellPriceValue) && sellPriceValue > 0)
  const floatInvalid = form.floatValue != null && (form.floatValue < 0 || form.floatValue > 1)
  const sellDateInvalid =
    form.status === "sold" &&
    Boolean(form.sellDate) &&
    new Date(form.sellDate!).getTime() < new Date(form.buyDate).getTime()
  const canSubmit =
    formSkinName.length > 0 && buyPriceValid && sellPriceValid && !floatInvalid && !sellDateInvalid

  const handleSubmit = () => {
    if (!canSubmit) return
    const sellPrice = form.status === "sold" ? form.sellPrice ?? 0 : undefined
    const sellDate = form.status === "sold" ? form.sellDate ?? form.buyDate : undefined
    const trade: Trade = {
      id: editingId ?? id(),
      skinName: formSkinName || "Unknown",
      weaponType: form.weaponType,
      wear: form.wear,
      variant: form.variant,
      floatValue: form.floatValue,
      imageUrl: form.imageUrl || undefined,
      buyPrice: buyPriceValue,
      sellPrice,
      status: form.status as TradeStatus,
      currency: form.currency,
      buyDate: form.buyDate,
      sellDate,
      notes: form.notes?.trim() || undefined,
    }
    actions.upsertTrade(trade)
    setDialogOpen(false)
    setForm(emptyTrade())
    setEditingId(null)
  }

  const confirmDelete = () => {
    if (!deleteTradeId) return
    actions.deleteTrade(deleteTradeId)
    setDeleteTradeId(null)
  }

  const exportCsv = () => {
    const header = [
      "Date",
      "Skin Name",
      "Wear",
      "Variant",
      "Float",
      "Buy Price",
      "Sell Price",
      "Profit",
      "ROI%",
      "Currency",
      "Notes",
      "Status",
    ]
    const rows = trades.map((t) => {
      const profit = t.status === "sold" && t.sellPrice != null ? t.sellPrice - t.buyPrice : ""
      const roi = profit !== "" && t.buyPrice ? ((Number(profit) / t.buyPrice) * 100).toFixed(2) : ""
      const values = [
        t.sellDate ?? t.buyDate,
        t.skinName,
        t.wear,
        t.variant,
        t.floatValue != null ? t.floatValue.toFixed(4) : "",
        t.buyPrice.toFixed(2),
        t.sellPrice != null ? t.sellPrice.toFixed(2) : "",
        profit !== "" ? Number(profit).toFixed(2) : "",
        roi,
        t.currency,
        (t.notes ?? "").replace(/\n/g, " "),
        t.status,
      ]
      return values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    })

    const out = [header.join(","), ...rows].join("\n")
    const blob = new Blob([out], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `grail-trades-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        <AuthRequiredBanner
          subtitle="Sign in to save trades and view your portfolio from your account. While signed out, this page runs in demo mode."
        />
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-tight">
              Trade Links
            </h1>
            <p className="text-xs text-text-secondary">
              Career profit · Capital at risk · Win rate
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv} className="font-mono text-xs tracking-wide">
              Export CSV
            </Button>
            <Button onClick={openCreate} className="font-mono text-xs tracking-wide">
              Add trade
            </Button>
          </div>
        </header>

        {draftFromTarget && (
          <Card className="border-info/50 bg-info/5">
            <CardContent className="flex items-center justify-between py-3">
              <p className="text-xs text-foreground">
                Trade draft from Watchlist: <span className="font-mono">{draftFromTarget.skinName}</span>
              </p>
              <Button size="sm" variant="outline" onClick={openCreate}>
                Use draft
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Metrics */}
        <section className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] uppercase tracking-wider">
                Career profit
              </CardDescription>
              <CardTitle
                className={`font-mono text-2xl ${
                  stats.realizedProfit >= 0 ? "text-profit" : "text-loss"
                }`}
              >
                {stats.realizedProfit >= 0 ? "+" : ""}
                {formatMoney(stats.realizedProfit, currency)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] uppercase tracking-wider">
                Capital at risk
              </CardDescription>
              <CardTitle className="font-mono text-2xl text-foreground">
                {formatMoney(stats.capitalAtRisk, currency)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] uppercase tracking-wider">
                Win rate
              </CardDescription>
              <CardTitle className="font-mono text-2xl text-foreground">
                {stats.winRate != null ? `${Math.round(stats.winRate * 100)}%` : "–"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] uppercase tracking-wider">
                Avg ROI
              </CardDescription>
              <CardTitle className="font-mono text-2xl text-foreground">
                {stats.avgRoi != null ? `${stats.avgRoi >= 0 ? "+" : ""}${stats.avgRoi.toFixed(1)}%` : "–"}
              </CardTitle>
            </CardHeader>
          </Card>
        </section>

        {/* Holdings (open positions) */}
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-sm">Holdings (open positions)</CardTitle>
            <CardDescription className="text-xs">
              Live pricing is best-effort (some sources require API keys). Unrealized P&L is based on best price across sources.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {holdings.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-muted">No open positions.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-secondary">
                      <th className="pb-2 pr-4 font-mono">Skin</th>
                      <th className="pb-2 pr-4 font-mono">Buy</th>
                      <th className="pb-2 pr-4 font-mono">Current</th>
                      <th className="pb-2 pr-4 font-mono">Unrealized</th>
                      <th className="pb-2 font-mono">Unrealized %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map(({ trade: t, currentPrice, pnl, pnlPct }) => (
                      <tr key={`holding_${t.id}`} className="border-b border-border/70">
                        <td className="py-2 pr-4 font-mono">{t.skinName}</td>
                        <td className="py-2 pr-4 font-mono tabular-nums">{formatMoney(t.buyPrice, t.currency)}</td>
                        <td className="py-2 pr-4 font-mono tabular-nums">
                          {currentPrice != null ? `$${currentPrice.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-2 pr-4 font-mono tabular-nums">
                          {pnl != null ? (
                            <span className={pnl >= 0 ? "text-profit" : "text-loss"}>
                              {pnl >= 0 ? "+" : ""}
                              {formatMoney(pnl, t.currency)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 font-mono tabular-nums">
                          {pnlPct != null ? (
                            <span className={pnlPct >= 0 ? "text-profit" : "text-loss"}>
                              {pnlPct >= 0 ? "+" : ""}
                              {pnlPct.toFixed(1)}%
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search skin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-48 font-mono text-xs"
          />
          <div className="flex gap-1">
            {(["all", "open", "sold"] as const).map((s) => (
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
        </div>

        {/* Trade list */}
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-sm">Trade history</CardTitle>
            <CardDescription className="text-xs">
              {filteredTrades.length} trade{filteredTrades.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTrades.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-muted">
                No trades match. Add one or change filters.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-secondary">
                      <th className="pb-2 pr-4 font-mono">Skin</th>
                      <th className="pb-2 pr-4 font-mono">Wear</th>
                      <th className="pb-2 pr-4 font-mono">Variant</th>
                      <th className="pb-2 pr-4 font-mono">Float</th>
                      <th className="pb-2 pr-4 font-mono">Buy</th>
                      <th className="pb-2 pr-4 font-mono">Sell</th>
                      <th className="pb-2 pr-4 font-mono">Status</th>
                      <th className="pb-2 pr-4 font-mono">P/L</th>
                      <th className="pb-2 pr-4 font-mono">ROI</th>
                      <th className="pb-2 font-mono">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.map((t) => {
                      const profit = t.status === "sold" && t.sellPrice != null ? t.sellPrice - t.buyPrice : null
                      const roi = profit != null && t.buyPrice ? (profit / t.buyPrice) * 100 : null
                      return (
                        <tr key={t.id} className="border-b border-border/70">
                          <td className="py-2 pr-4 font-mono">{t.skinName}</td>
                          <td className="py-2 pr-4 font-mono">{t.wear}</td>
                          <td className="py-2 pr-4 font-mono">{t.variant}</td>
                          <td className="py-2 pr-4 font-mono tabular-nums">
                            {t.floatValue != null ? t.floatValue.toFixed(4) : "—"}
                          </td>
                          <td className="py-2 pr-4 font-mono tabular-nums">
                            {formatMoney(t.buyPrice, t.currency)}
                          </td>
                          <td className="py-2 pr-4 font-mono tabular-nums">
                            {t.sellPrice != null ? formatMoney(t.sellPrice, t.currency) : "—"}
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className={
                                t.status === "sold" ? "text-profit" : "text-info"
                              }
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="py-2 pr-4 font-mono tabular-nums">
                            {profit != null ? (
                              <span className={profit >= 0 ? "text-profit" : "text-loss"}>
                                {profit >= 0 ? "+" : ""}
                                {formatMoney(profit, t.currency)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-2 pr-4 font-mono tabular-nums">
                            {roi != null ? (
                              <span className={roi >= 0 ? "text-profit" : "text-loss"}>
                                {roi >= 0 ? "+" : ""}
                                {roi.toFixed(1)}%
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-2 flex gap-1">
                            <Button variant="ghost" size="xs" onClick={() => openEdit(t)}>
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              className="text-destructive"
                              onClick={() => setDeleteTradeId(t.id)}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md gap-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {editingId ? "Edit trade" : "Add trade"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Skin, wear, variant, prices. Profit and ROI are computed when sold.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-xs">
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">
                Skin name
              </label>
              <Input
                value={form.skinName}
                onChange={(e) => setForm((f) => ({ ...f, skinName: e.target.value }))}
                placeholder="e.g. AK-47 | Redline"
                className="font-mono"
              />
              {!formSkinName && (
                <p className="mt-1 text-[11px] text-danger">Skin name is required.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">
                  Wear
                </label>
                <select
                  value={form.wear}
                  onChange={(e) => setForm((f) => ({ ...f, wear: e.target.value as Wear }))}
                  className="h-8 w-full rounded-none border border-input bg-background px-2 font-mono text-xs"
                >
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
                  value={form.variant}
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
                  Float (optional)
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
                {floatInvalid && (
                  <p className="mt-1 text-[11px] text-danger">Float must be within 0.0000-1.0000.</p>
                )}
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">
                  Currency
                </label>
                <select
                  value={form.currency}
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
                  Buy price
                </label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.buyPrice || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, buyPrice: Number(e.target.value) || 0 }))
                  }
                  className="font-mono tabular-nums"
                />
                {!buyPriceValid && (
                  <p className="mt-1 text-[11px] text-danger">Buy price must be greater than 0.</p>
                )}
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">
                  Sell price (if sold)
                </label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.sellPrice ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sellPrice: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="font-mono tabular-nums"
                  disabled={form.status === "open"}
                />
                {form.status === "sold" && !sellPriceValid && (
                  <p className="mt-1 text-[11px] text-danger">Sell price is required when status is sold.</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => {
                    const s = e.target.value as TradeStatus
                    setForm((f) => ({
                      ...f,
                      status: s,
                      sellPrice: s === "sold" ? f.sellPrice ?? f.buyPrice : undefined,
                      sellDate: s === "sold" ? f.sellDate ?? f.buyDate : undefined,
                    }))
                  }}
                  className="h-8 w-full rounded-none border border-input bg-background px-2 font-mono text-xs"
                >
                  <option value="open">open</option>
                  <option value="sold">sold</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">
                  Buy date
                </label>
                <Input
                  type="date"
                  value={form.buyDate}
                  onChange={(e) => setForm((f) => ({ ...f, buyDate: e.target.value }))}
                  className="font-mono"
                />
              </div>
            </div>
            {form.status === "sold" && (
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">
                  Sell date
                </label>
                <Input
                  type="date"
                  value={form.sellDate ?? form.buyDate}
                  onChange={(e) => setForm((f) => ({ ...f, sellDate: e.target.value }))}
                  className="font-mono"
                />
                {sellDateInvalid && (
                  <p className="mt-1 text-[11px] text-danger">Sell date must be on or after buy date.</p>
                )}
              </div>
            )}
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase text-text-secondary">
                Notes (optional)
              </label>
              <Input
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes"
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
              {editingId ? "Save" : "Add trade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTradeId)} onOpenChange={(open) => !open && setDeleteTradeId(null)}>
        <DialogContent className="max-w-md gap-4">
          <DialogHeader>
            <DialogTitle className="font-mono">Delete trade?</DialogTitle>
            <DialogDescription className="text-xs">
              This permanently removes the trade and recalculates portfolio metrics.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTradeId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
