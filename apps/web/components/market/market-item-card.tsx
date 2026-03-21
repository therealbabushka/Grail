"use client"

import Link from "next/link"
import Image from "next/image"
import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

import {
  MARKET_CARD_INTRINSIC_HEIGHT_PX,
  MARKET_CARD_MIN_WIDTH_PX,
  MARKET_CARD_RADIAL_BG,
} from "./market-card-constants"

export type MarketCatalogItem = {
  id: string
  name: string
  weaponName?: string
  rarityName?: string
  rarityColor?: string
  imageUrl?: string
  floatMin?: number
  floatMax?: number
  exteriors: Array<"FN" | "MW" | "FT" | "WW" | "BS">
  hasStatTrak: boolean
  referencePrice?: number
  marketPrices?: Record<string, number>
}

function fmtFloatRange(min?: number, max?: number) {
  if (typeof min !== "number" || typeof max !== "number") return null
  return `${min.toFixed(2)}–${max.toFixed(2)}`
}

function wearLabelByFloat(value: number) {
  if (value <= 0.07) return "Factory New"
  if (value <= 0.15) return "Minimal Wear"
  if (value <= 0.38) return "Field-Tested"
  if (value <= 0.45) return "Well-Worn"
  return "Battle-Scarred"
}

function pickPreferredExterior(exteriors: MarketCatalogItem["exteriors"]) {
  const pref: MarketCatalogItem["exteriors"] = ["FT", "MW", "FN", "WW", "BS"]
  for (const p of pref) if (exteriors.includes(p)) return p
  return exteriors[0] ?? "FT"
}

function steamExteriorLabel(exterior: MarketCatalogItem["exteriors"][number]) {
  switch (exterior) {
    case "FN":
      return "Factory New"
    case "MW":
      return "Minimal Wear"
    case "FT":
      return "Field-Tested"
    case "WW":
      return "Well-Worn"
    case "BS":
      return "Battle-Scarred"
  }
}

/** Matches `/market/[id]` pricing: Steam-style hash name with preferred wear when exteriors exist. */
function marketHashNameForPricing(item: MarketCatalogItem) {
  const name = item.name
  if (!item.exteriors?.length) return name
  return `${name} (${steamExteriorLabel(pickPreferredExterior(item.exteriors))})`
}

function isNoWearCategory(weaponName?: string) {
  const w = (weaponName ?? "").toLowerCase()
  return (
    w.includes("agent") ||
    w.includes("sticker") ||
    w.includes("patch") ||
    w.includes("charm") ||
    w.includes("container") ||
    w.includes("graffiti")
  )
}

function wearSummaryLine(item: MarketCatalogItem, floatMid: number | null, floatRangeStr: string | null) {
  if (floatMid != null && floatRangeStr) {
    return `${wearLabelByFloat(floatMid)} · ${floatMid.toFixed(6)} · ${floatRangeStr}`
  }
  if (isNoWearCategory(item.weaponName)) {
    return "No wear rating"
  }
  const ex = item.exteriors ?? []
  if (ex.length > 0 && ex.length < 5) {
    return `Wear varies by exterior (${ex.join(" · ")})`
  }
  if (ex.length > 0) {
    return "Wear varies by exterior (FN–BS)"
  }
  return "Wear data unavailable"
}

type SnapshotJson = {
  currency?: string
  markets?: Array<{ price?: number | null }>
}

function useMarketPriceRange(pricingKey: string) {
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const [shouldLoad, setShouldLoad] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [range, setRange] = React.useState<{
    min: number
    max: number
    currency: string
  } | null>(null)
  const [fetchError, setFetchError] = React.useState(false)

  React.useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setShouldLoad(true)
      },
      { rootMargin: "160px", threshold: 0.01 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  React.useEffect(() => {
    if (!shouldLoad) return
    const ac = new AbortController()
    let cancelled = false

    async function run() {
      setLoading(true)
      setFetchError(false)
      setRange(null)
      try {
        const res = await fetch(
          `/api/pricing/snapshot?item=${encodeURIComponent(pricingKey)}&currency=USD`,
          { signal: ac.signal }
        )
        if (!res.ok) throw new Error("snapshot_failed")
        const json = (await res.json()) as SnapshotJson
        const prices = (json.markets ?? [])
          .map((m) => m.price)
          .filter((p): p is number => typeof p === "number" && Number.isFinite(p) && p > 0)
        if (cancelled) return
        if (prices.length === 0) {
          setRange(null)
          return
        }
        const min = Math.min(...prices)
        const max = Math.max(...prices)
        const currency = (json.currency ?? "USD").toUpperCase()
        setRange({ min, max, currency })
      } catch {
        if (ac.signal.aborted) return
        if (!cancelled) {
          setRange(null)
          setFetchError(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
      ac.abort()
    }
  }, [shouldLoad, pricingKey])

  return { rootRef, range, loading, fetchError, started: shouldLoad }
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.length === 3 ? currency : "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `$${amount.toFixed(2)}`
  }
}

/** Category (weapon) + skin line split on `|` for clearer hierarchy on catalog cards. */
function categoryAndSkinTitle(
  name: string,
  weaponName: string | undefined,
  isUnknownWeapon: (v?: string) => boolean
) {
  const pipe = name.indexOf("|")
  if (pipe >= 0) {
    const leftRaw = name
      .slice(0, pipe)
      .replace(/★\s*/g, "")
      .trim()
    const skinLine = name.slice(pipe + 1).trim()
    const category = !isUnknownWeapon(weaponName) ? weaponName!.trim() : leftRaw || "—"
    return { category, skinTitle: skinLine || name.replace(/★\s*/g, "").trim() }
  }
  return {
    category: !isUnknownWeapon(weaponName) ? weaponName!.trim() : "—",
    skinTitle: name.replace(/★\s*/g, "").trim(),
  }
}

export function MarketItemCard({ item }: { item: MarketCatalogItem }) {
  const pricingKey = React.useMemo(
    () => marketHashNameForPricing(item),
    [item.name, item.exteriors.join(",")]
  )
  const { rootRef, range, loading: priceLoading, fetchError: priceError, started: priceStarted } =
    useMarketPriceRange(pricingKey)

  const isUnknown = (value?: string) => {
    if (!value) return true
    const v = value.trim().toLowerCase()
    return v.length === 0 || v === "unknown" || v === "n/a" || v === "-"
  }

  const floatRangeStr = fmtFloatRange(item.floatMin, item.floatMax)
  const floatMid =
    typeof item.floatMin === "number" && typeof item.floatMax === "number"
      ? (item.floatMin + item.floatMax) / 2
      : null
  const floatMarkerPercent = floatMid != null ? Math.max(0, Math.min(100, floatMid * 100)) : null
  const floatMinPct =
    typeof item.floatMin === "number" ? Math.max(0, Math.min(100, item.floatMin * 100)) : null
  const floatMaxPct =
    typeof item.floatMax === "number" ? Math.max(0, Math.min(100, item.floatMax * 100)) : null
  const { category: categoryLabel, skinTitle } = categoryAndSkinTitle(item.name, item.weaponName, isUnknown)
  const wearLine = wearSummaryLine(item, floatMid, floatRangeStr)

  return (
    <Link
      href={`/market/${encodeURIComponent(item.id)}`}
      className="group block h-full min-h-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      aria-label={`Open ${item.name}`}
    >
      <div ref={rootRef} className="h-full min-h-0">
        <div
          className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-none transition-all hover:-translate-y-0.5"
          style={
            {
              contentVisibility: "auto",
              containIntrinsicSize: `${MARKET_CARD_MIN_WIDTH_PX}px ${MARKET_CARD_INTRINSIC_HEIGHT_PX}px`,
            } as React.CSSProperties
          }
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] bg-gradient-to-b from-muted/60 to-card dark:hidden"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 hidden rounded-[inherit] dark:block"
            style={{ backgroundImage: MARKET_CARD_RADIAL_BG }}
          />
          <div className="relative z-[1] flex size-full min-h-0 flex-col items-start overflow-clip rounded-[inherit]">
            {/* Frame1 — image block (Frame1984080233) */}
            <div className="relative aspect-[180/200] w-full shrink-0 rounded-none">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-none border-t-[3px] border-solid"
                style={
                  {
                    borderTopColor: item.rarityColor ?? "#ff3744",
                  } as React.CSSProperties
                }
              />
              <div className="flex size-full flex-col items-center justify-center">
                <div className="relative flex size-full flex-col items-center justify-center gap-[10px] p-[16px]">
                  <div className="relative aspect-[512/384] w-full shrink-0">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                        sizes="(min-width: 1024px) 18vw, (min-width: 640px) 28vw, 45vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-muted/30 dark:bg-background/20" aria-hidden />
                    )}
                  </div>

                  {item.hasStatTrak ? (
                    <span
                      className="pointer-events-none absolute top-[13px] left-[12px] z-10 rounded-none bg-[#ff7a37] px-2 py-[5px] font-sans text-[12px] font-medium leading-[0.98] tracking-[-0.1px] text-[#f9f9f9]"
                      title="StatTrak™ available"
                    >
                      StatTrak™
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Frame2 — details (fills remaining height so grid rows align) */}
            <div className="relative flex min-h-0 w-full flex-1 flex-col">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 border-t-[0.5px] border-solid border-[#b8bec8] dark:border-t-[1px] dark:border-[#202020]"
              />
              <div className="relative flex min-h-0 w-full flex-1 flex-col justify-between gap-[16px] py-[16px] pl-[16px] pr-[20px] leading-[0.98]">
                <div className="flex min-h-0 w-full flex-col gap-[16px]">
                  <div className="flex w-full min-w-0 flex-col gap-[6px] leading-[0.98]">
                    <p className="font-sans text-[12px] font-medium tracking-[-0.1px] text-text-muted">
                      {categoryLabel}
                    </p>

                    <p className="line-clamp-2 h-fit min-h-0 w-fit max-w-full font-hero-serif text-[16px] font-semibold not-italic leading-[0.98] text-foreground">
                      {skinTitle}
                    </p>
                  </div>

                  <p
                    className={cn(
                      "font-hero-serif text-[20px] font-bold not-italic leading-[0.98] tabular-nums whitespace-nowrap",
                      range ? "text-foreground" : "text-text-muted",
                    )}
                    title={range ? "Low–high across markets with a live price" : undefined}
                  >
                    {!priceStarted && <span>—</span>}
                    {priceStarted && priceLoading && <span>…</span>}
                    {priceStarted && !priceLoading && range && (
                      <span>
                        {range.min === range.max
                          ? formatMoney(range.min, range.currency)
                          : `${formatMoney(range.min, range.currency)} – ${formatMoney(range.max, range.currency)}`}
                      </span>
                    )}
                    {priceStarted && !priceLoading && !range && priceError && <span>—</span>}
                    {priceStarted && !priceLoading && !range && !priceError && <span>No live range</span>}
                  </p>
                </div>

                <div className="flex w-full min-w-0 shrink-0 flex-col gap-[10px]">
                  <p className="line-clamp-2 min-h-[2lh] font-sans text-[12px] font-normal not-italic leading-[0.98] text-text-muted">
                    {wearLine}
                  </p>

                  <div className="relative h-[6px] w-full min-w-0 shrink-0 overflow-clip bg-border/80 dark:bg-[rgba(40,40,40,0.7)]">
                      {floatMarkerPercent != null ? (
                        <>
                          <div
                            className="absolute inset-y-0 left-0 bg-[rgba(0,211,243,0.8)]"
                            style={{ width: "7%" }}
                          />
                          <div
                            className="absolute inset-y-0 bg-[rgba(0,212,146,0.8)]"
                            style={{ left: "7%", width: "8%" }}
                          />
                          <div
                            className="absolute inset-y-0 bg-[rgba(253,199,0,0.8)]"
                            style={{ left: "15%", width: "23%" }}
                          />
                          <div
                            className="absolute inset-y-0 bg-[rgba(255,137,3,0.8)]"
                            style={{ left: "38%", width: "7%" }}
                          />
                          <div
                            className="absolute inset-y-0 bg-[rgba(255,100,103,0.7)]"
                            style={{ left: "45%", right: 0 }}
                          />
                          {floatMinPct != null && floatMaxPct != null ? (
                            <>
                              <span
                                className="absolute top-[-1px] h-[8px] w-[2px] -translate-x-1/2 bg-foreground"
                                style={{ left: `${floatMinPct}%` }}
                                aria-hidden
                              />
                              <span
                                className="absolute top-[-1px] h-[8px] w-[2px] -translate-x-1/2 bg-foreground"
                                style={{ left: `${floatMaxPct}%` }}
                                aria-hidden
                              />
                            </>
                          ) : (
                            <span
                              className="absolute top-[-1px] h-[8px] w-[2px] -translate-x-1/2 bg-foreground"
                              style={{ left: `${floatMarkerPercent}%` }}
                              aria-hidden
                            />
                          )}
                        </>
                      ) : (
                        <div className="h-[6px]" aria-hidden />
                      )}
                    </div>
                  </div>
                </div>
            </div>
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[2] rounded-none border-[0.5px] border-solid border-[#b8bec8] dark:border-[1px] dark:border-[#202020]"
          />
        </div>
      </div>
    </Link>
  )
}
