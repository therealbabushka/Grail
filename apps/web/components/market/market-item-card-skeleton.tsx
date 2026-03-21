"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

import {
  MARKET_CARD_INTRINSIC_HEIGHT_PX,
  MARKET_CARD_MIN_WIDTH_PX,
  MARKET_CARD_RADIAL_BG,
} from "./market-card-constants"

function ShimmerLine({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "skeleton-shimmer rounded-[3px] bg-muted/35 dark:bg-[rgba(40,40,40,0.55)]",
        className,
      )}
    />
  )
}

/** Loading placeholder aligned with `MarketItemCard` layout (image + details + float bar). */
export function MarketItemCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("block h-full min-h-0 w-full", className)} aria-hidden>
      <div
        className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-none"
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
          <div className="relative aspect-[180/200] w-full shrink-0 rounded-none">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-none border-t-[3px] border-solid border-[#b8bec8] dark:border-[#2a2a2a]"
            />
            <div className="flex size-full flex-col items-center justify-center p-[16px]">
              <div className="relative aspect-[512/384] w-full shrink-0 overflow-hidden rounded-none">
                <div className="skeleton-shimmer absolute inset-0 rounded-none bg-muted/40 dark:bg-[rgba(32,32,32,0.85)]" />
              </div>
            </div>
          </div>

          <div className="relative flex min-h-0 w-full flex-1 flex-col">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 border-t-[0.5px] border-solid border-[#b8bec8] dark:border-[#202020]"
            />
            <div className="relative flex min-h-0 w-full flex-1 flex-col justify-between gap-[16px] py-[16px] pl-[16px] pr-[20px] leading-[0.98]">
              <div className="flex min-h-0 w-full flex-col gap-[16px]">
                <div className="flex w-full min-w-0 flex-col gap-[6px]">
                  <ShimmerLine className="h-[12px] w-[45%]" />
                  <ShimmerLine className="h-[16px] w-[92%]" />
                  <ShimmerLine className="h-[16px] w-[72%]" />
                </div>

                <ShimmerLine className="h-[20px] w-[58%]" />
              </div>

              <div className="flex w-full min-w-0 shrink-0 flex-col gap-[10px]">
                <ShimmerLine className="h-[12px] w-full" />
                <ShimmerLine className="h-[12px] w-[88%]" />
                <div className="relative h-[6px] w-full overflow-clip rounded-none bg-border/80 dark:bg-[rgba(40,40,40,0.7)]">
                  <div className="skeleton-shimmer absolute inset-0 opacity-80" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[2] rounded-none border-[0.5px] border-solid border-[#b8bec8] dark:border-[#202020]"
        />
      </div>
    </div>
  )
}
