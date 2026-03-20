"use client"

import { useSyncExternalStore } from "react"

import type { DemoState, LoadoutSlot, PriceAlert, Target, Trade, Watchlist } from "@/lib/demo-seed"
import { createDemoSeed } from "@/lib/demo-seed"

const STORAGE_KEY = "grail.demo.v1"

type Listener = () => void

type StateWithUI = DemoState & {
  ui: {
    draftTradeFromTarget?: Target
    draftTargetFromSlot?: Pick<LoadoutSlot, "slotKey" | "weaponLabel">
  }
}

let state: StateWithUI | null = null
const listeners = new Set<Listener>()

function safeParse(raw: string | null) {
  if (!raw) return null
  try {
    return JSON.parse(raw) as DemoState
  } catch {
    return null
  }
}

function loadInitial(): StateWithUI {
  const seed = createDemoSeed()
  if (typeof window === "undefined") {
    return { ...seed, ui: {} }
  }

  const fromStorage = safeParse(window.localStorage.getItem(STORAGE_KEY))
  const normalized: DemoState | null = fromStorage
    ? {
        profile: { ...seed.profile, ...(fromStorage.profile ?? {}) },
        watchlists: Array.isArray(fromStorage.watchlists) ? fromStorage.watchlists : seed.watchlists,
        alerts: Array.isArray(fromStorage.alerts) ? fromStorage.alerts : seed.alerts,
        trades: Array.isArray(fromStorage.trades) ? fromStorage.trades : seed.trades,
        loadouts: Array.isArray(fromStorage.loadouts) ? fromStorage.loadouts : seed.loadouts,
        targets: Array.isArray(fromStorage.targets) ? fromStorage.targets : seed.targets,
      }
    : null
  const initial = normalized ?? seed
  if (!normalized) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
  }
  return { ...initial, ui: {} }
}

function ensureState() {
  if (!state) {
    state = loadInitial()
  }
  return state
}

function persist(next: DemoState) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

function emit() {
  for (const l of listeners) l()
}

function setState(mutator: (prev: StateWithUI) => StateWithUI) {
  const prev = ensureState()
  const next = mutator(prev)
  state = next
  persist({
    profile: next.profile,
    watchlists: next.watchlists,
    trades: next.trades,
    loadouts: next.loadouts,
    targets: next.targets,
    alerts: next.alerts,
  })
  emit()
}

export function useDemoStore() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => ensureState(),
    () => ensureState(),
  )
}

export function demoActions() {
  return {
    resetDemo() {
      setState(() => {
        const seed = createDemoSeed()
        return { ...seed, ui: {} }
      })
    },
    setDisplayCurrency(displayCurrency: DemoState["profile"]["displayCurrency"]) {
      setState((prev) => ({ ...prev, profile: { ...prev.profile, displayCurrency } }))
    },
    upsertTrade(trade: Trade) {
      setState((prev) => {
        const idx = prev.trades.findIndex((t) => t.id === trade.id)
        const nextTrades = idx === -1 ? [trade, ...prev.trades] : prev.trades.map((t) => (t.id === trade.id ? trade : t))
        return { ...prev, trades: nextTrades }
      })
    },
    deleteTrade(tradeId: string) {
      setState((prev) => ({ ...prev, trades: prev.trades.filter((t) => t.id !== tradeId) }))
    },
    upsertTarget(target: Target) {
      setState((prev) => {
        const idx = prev.targets.findIndex((t) => t.id === target.id)
        const nextTargets = idx === -1 ? [target, ...prev.targets] : prev.targets.map((t) => (t.id === target.id ? target : t))
        return { ...prev, targets: nextTargets }
      })
    },
    deleteTarget(targetId: string) {
      setState((prev) => ({ ...prev, targets: prev.targets.filter((t) => t.id !== targetId) }))
    },
    setActiveLoadout(loadoutId: string) {
      setState((prev) => {
        const exists = prev.loadouts.some((l) => l.id === loadoutId)
        if (!exists) return prev
        const ordered = [...prev.loadouts].sort((a, b) => (a.id === loadoutId ? -1 : b.id === loadoutId ? 1 : 0))
        return { ...prev, loadouts: ordered }
      })
    },
    updateLoadoutSlot(loadoutId: string, slotKey: string, patch: Partial<LoadoutSlot>) {
      setState((prev) => {
        const nextLoadouts = prev.loadouts.map((l) => {
          if (l.id !== loadoutId) return l
          const current = l.slots[slotKey]
          const nextSlot: LoadoutSlot = { ...(current ?? { slotKey, weaponLabel: slotKey }), ...patch, slotKey }
          return { ...l, updatedAt: new Date().toISOString(), slots: { ...l.slots, [slotKey]: nextSlot } }
        })
        return { ...prev, loadouts: nextLoadouts }
      })
    },
    clearLoadoutSlot(loadoutId: string, slotKey: string) {
      setState((prev) => {
        const nextLoadouts = prev.loadouts.map((l) => {
          if (l.id !== loadoutId) return l
          const current = l.slots[slotKey]
          if (!current) return l
          const nextSlot: LoadoutSlot = { slotKey, weaponLabel: current.weaponLabel }
          return { ...l, updatedAt: new Date().toISOString(), slots: { ...l.slots, [slotKey]: nextSlot } }
        })
        return { ...prev, loadouts: nextLoadouts }
      })
    },
    primeTradeFromTarget(targetId: string) {
      setState((prev) => {
        const t = prev.targets.find((x) => x.id === targetId)
        if (!t) return prev
        return { ...prev, ui: { ...prev.ui, draftTradeFromTarget: t } }
      })
    },
    consumeTradeDraft() {
      setState((prev) => ({ ...prev, ui: { ...prev.ui, draftTradeFromTarget: undefined } }))
    },
    primeTargetFromSlot(slot: Pick<LoadoutSlot, "slotKey" | "weaponLabel">) {
      setState((prev) => ({ ...prev, ui: { ...prev.ui, draftTargetFromSlot: slot } }))
    },
    consumeTargetDraft() {
      setState((prev) => ({ ...prev, ui: { ...prev.ui, draftTargetFromSlot: undefined } }))
    },
    upsertWatchlist(watchlist: Watchlist) {
      setState((prev) => {
        const idx = prev.watchlists.findIndex((w) => w.id === watchlist.id)
        const nextWatchlists =
          idx === -1 ? [watchlist, ...prev.watchlists] : prev.watchlists.map((w) => (w.id === watchlist.id ? watchlist : w))
        return { ...prev, watchlists: nextWatchlists }
      })
    },
    deleteWatchlist(watchlistId: string) {
      setState((prev) => {
        const remaining = prev.watchlists.filter((w) => w.id !== watchlistId)
        const fallback = remaining[0]?.id
        const nextTargets = prev.targets.map((t) =>
          t.watchlistId === watchlistId ? { ...t, watchlistId: fallback } : t
        )
        return { ...prev, watchlists: remaining, targets: nextTargets }
      })
    },
    upsertAlert(alert: PriceAlert) {
      setState((prev) => {
        const idx = prev.alerts.findIndex((a) => a.id === alert.id)
        const nextAlerts =
          idx === -1 ? [alert, ...prev.alerts] : prev.alerts.map((a) => (a.id === alert.id ? alert : a))
        return { ...prev, alerts: nextAlerts }
      })
    },
    toggleAlert(alertId: string, isActive: boolean) {
      setState((prev) => ({
        ...prev,
        alerts: prev.alerts.map((a) => (a.id === alertId ? { ...a, isActive } : a)),
      }))
    },
  }
}

export function computeTradeStats(trades: Trade[]) {
  const sold = trades.filter((t) => t.status === "sold" && typeof t.sellPrice === "number")
  const realizedProfit = sold.reduce((sum, t) => sum + ((t.sellPrice ?? 0) - t.buyPrice), 0)
  const open = trades.filter((t) => t.status === "open")
  const capitalAtRisk = open.reduce((sum, t) => sum + t.buyPrice, 0)
  const wins = sold.filter((t) => (t.sellPrice ?? 0) - t.buyPrice > 0).length
  const winRate = sold.length > 0 ? wins / sold.length : null
  const avgRoi =
    sold.length > 0
      ? sold.reduce((sum, t) => sum + (((t.sellPrice ?? 0) - t.buyPrice) / t.buyPrice) * 100, 0) / sold.length
      : null

  return {
    realizedProfit,
    capitalAtRisk,
    winRate,
    avgRoi,
    openPositions: open.length,
    closedPositions: sold.length,
  }
}

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export type HoldingRow = {
  tradeId: string
  skinName: string
  currency: string
  buyPrice: number
  currentPrice: number | null
  unrealizedPnL: number | null
  unrealizedPnLPct: number | null
}

