import Link from "next/link"
import Image from "next/image"
import * as React from "react"

import { Card, CardContent } from "@workspace/ui/components/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@workspace/ui/components/tooltip"

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
}

function rarityLabel(name?: string) {
  if (!name) return "—"
  if (name.trim().toLowerCase() === "unknown") return "—"
  if (name === "Mil-Spec Grade") return "Mil-Spec"
  return name
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

function chip(text: string, tone: "default" | "muted" = "default") {
  const base =
    "rounded-none border border-border bg-background/40 px-1.5 py-0.5 font-mono text-[10px] tabular-nums"
  const color = tone === "muted" ? "text-text-muted" : "text-text-secondary"
  return <span className={`${base} ${color}`}>{text}</span>
}

export function MarketItemCard({
  item,
  isRecent,
  dense = false,
}: {
  item: MarketCatalogItem
  isRecent?: boolean
  dense?: boolean
}) {
  const isUnknown = (value?: string) => {
    if (!value) return true
    const v = value.trim().toLowerCase()
    return v.length === 0 || v === "unknown" || v === "n/a" || v === "-"
  }

  const floatRange = fmtFloatRange(item.floatMin, item.floatMax)
  const exteriors = item.exteriors ?? []
  const exteriorChips = dense ? exteriors.slice(0, 2) : exteriors.slice(0, 3)
  const remainingExteriorCount = Math.max(0, exteriors.length - exteriorChips.length)
  const floatMid =
    typeof item.floatMin === "number" && typeof item.floatMax === "number"
      ? (item.floatMin + item.floatMax) / 2
      : null
  const floatMarkerPercent = floatMid != null ? Math.max(0, Math.min(100, floatMid * 100)) : null
  const weaponName = isUnknown(item.weaponName) ? "—" : item.weaponName!

  return (
    <Link
      href={`/market/${encodeURIComponent(item.id)}`}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      aria-label={`Open ${item.name}`}
    >
      <Card
        className="h-full w-full overflow-hidden border-border bg-gradient-to-b from-surface to-background/70 transition-all hover:-translate-y-0.5 hover:bg-surface-hover"
        style={
          item.rarityColor
            ? ({
                boxShadow: `0 0 0 1px ${item.rarityColor}33, 0 10px 30px -22px ${item.rarityColor}55`,
                contentVisibility: "auto",
                containIntrinsicSize: "176px 240px",
              } as React.CSSProperties)
            : ({
                contentVisibility: "auto",
                containIntrinsicSize: "176px 240px",
              } as React.CSSProperties)
        }
      >
        <CardContent className={dense ? "p-2.5" : "p-3"}>
          <div className="mb-1 flex items-center justify-between text-[10px]">
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <span className="inline-block size-1.5 rounded-full bg-emerald-400" />
              Tradable
            </span>
          </div>

          <div className="relative flex items-center justify-center overflow-hidden rounded-none border border-border bg-background/40 p-1.5">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.name}
                width={420}
                height={260}
                className={dense ? "h-14 w-auto max-w-full object-contain transition-transform duration-200 group-hover:scale-105" : "h-16 w-auto max-w-full object-contain transition-transform duration-200 group-hover:scale-105"}
                sizes={dense ? "(min-width: 1024px) 12vw, (min-width: 640px) 24vw, 40vw" : "(min-width: 1024px) 18vw, (min-width: 640px) 36vw, 70vw"}
              />
            ) : (
              <div className={dense ? "h-16 w-full" : "h-20 w-full"} />
            )}

            <span
              className="absolute top-2 right-2 inline-flex items-center gap-1"
              aria-label={[
                item.rarityName ? `Rarity: ${item.rarityName}` : null,
                isRecent ? "Recently viewed" : null,
              ]
                .filter(Boolean)
                .join(". ")}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-block size-2 rounded-full border border-border"
                      style={item.rarityColor ? ({ backgroundColor: item.rarityColor } as React.CSSProperties) : undefined}
                      aria-label={item.rarityName ? `Rarity: ${item.rarityName}` : "Rarity"}
                      role="img"
                      tabIndex={0}
                    />
                  </TooltipTrigger>
                  {item.rarityName ? (
                    <TooltipContent side="bottom" align="end">
                      {item.rarityName}
                    </TooltipContent>
                  ) : null}
                </Tooltip>
              </TooltipProvider>
            </span>
          </div>

          <div className={dense ? "mt-1.5 space-y-1" : "mt-2 space-y-1"}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-mono text-[11px] text-foreground line-clamp-2">{item.name}</p>
            </div>

            <p className="text-[10px] text-text-secondary">{weaponName}</p>
            <p className="text-[10px] text-text-muted">
              {floatMid != null ? `${wearLabelByFloat(floatMid)} · ${floatMid.toFixed(6)}` : "Wear data unavailable"}
            </p>

            {floatMarkerPercent != null ? (
              <div className="space-y-1 pt-0.5">
                <div className="relative h-1.5 overflow-hidden rounded-none bg-border/70">
                  <div className="absolute inset-y-0 left-0 w-[7%] bg-cyan-400/80" />
                  <div className="absolute inset-y-0 left-[7%] w-[8%] bg-emerald-400/80" />
                  <div className="absolute inset-y-0 left-[15%] w-[23%] bg-yellow-400/80" />
                  <div className="absolute inset-y-0 left-[38%] w-[7%] bg-orange-400/80" />
                  <div className="absolute inset-y-0 left-[45%] right-0 bg-red-400/70" />
                  <span
                    className="absolute top-1/2 h-2 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-white"
                    style={{ left: `${floatMarkerPercent}%` }}
                    aria-hidden
                  />
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {exteriorChips.map((x) => (
                <React.Fragment key={x}>{chip(x)}</React.Fragment>
              ))}
              {remainingExteriorCount > 0 && chip(`+${remainingExteriorCount}`, "muted")}
              {item.hasStatTrak && chip("ST")}
              {item.rarityName && chip(rarityLabel(item.rarityName), "muted")}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

