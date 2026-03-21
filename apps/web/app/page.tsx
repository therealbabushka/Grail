"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { DM_Sans } from "next/font/google"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"

import { AuthLink } from "@/components/auth-link"
import { cn } from "@workspace/ui/lib/utils"

const dmSans = DM_Sans({ subsets: ["latin"], display: "swap" })

type CatalogItem = {
  id: string
  name: string
  weaponName?: string
  rarityName?: string
  imageUrl?: string
  rarityColor?: string
  exteriors?: Array<"FN" | "MW" | "FT" | "WW" | "BS">
}

const RARITY_ORDER = ["Contraband", "Covert", "Classified", "Restricted", "Mil-Spec Grade"] as const

/** GrailHero / Figma export: accent on headline keywords */
const HERO_ACCENT = "#c438f3"
/** Diagonal stroke between copy and artwork (Figma `471865`) */
const HERO_DIVIDER_STROKE = "#471865"
/** Left desktop panel mask — Figma `8646:30424` (viewBox 936×600) */
const HERO_LEFT_SHAPE_PATH = "M0 0H936L662 599.5L0 600V0Z"
function HeroPrimary({
  className,
  headlineClassName,
}: {
  className?: string
  headlineClassName?: string
}) {
  return (
    <div className={cn("flex flex-col gap-10", className)}>
      <h1
        className={cn(
          dmSans.className,
          "text-balance text-4xl font-medium leading-[0.95] tracking-[-0.02em] sm:text-5xl md:text-6xl lg:text-7xl xl:text-[86px]",
          "text-foreground dark:text-[#f3f3f3]",
          headlineClassName,
        )}
      >
        <span className="leading-[0.95]">The fastest way from </span>
        <span className="leading-[0.95]" style={{ color: HERO_ACCENT }}>
          target
        </span>
        <span className="leading-[0.95]"> to </span>
        <span className="leading-[0.95]" style={{ color: HERO_ACCENT }}>
          trad
        </span>
        <span className="leading-[0.95]" style={{ color: HERO_ACCENT }}>
          e
        </span>
        <span className="leading-[0.95]" style={{ color: HERO_ACCENT }}>
          .
        </span>
      </h1>

      <div className="flex flex-wrap gap-3">
        <Link href="/market" className="inline-flex">
          <span
            className={cn(
              "inline-flex h-8 min-w-[156px] items-center justify-center px-4 font-mono text-[12px] font-normal tracking-[0.025em]",
              "bg-primary text-primary-foreground hover:opacity-90",
              "dark:bg-[#f3f3f3] dark:text-[#080808]",
            )}
          >
            Browse Market
          </span>
        </Link>
        <AuthLink
          href="/watchlist"
          loginText="Login to create Watchlist"
          variant="outline"
          size="sm"
          className={cn(
            "h-8 min-w-[156px] rounded-none border font-mono text-[12px] font-normal tracking-[0.025em]",
            "border-border bg-muted/50 text-foreground hover:bg-muted",
            "dark:border-[#282828] dark:bg-[rgba(52,52,52,0.3)] dark:text-[#f3f3f3] dark:hover:bg-[rgba(52,52,52,0.45)]",
          )}
        >
          Create Watchlist
        </AuthLink>
      </div>
    </div>
  )
}

export default function HomePage() {
  const [items, setItems] = useState<CatalogItem[] | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/catalog")
        const json = (await res.json()) as { items?: CatalogItem[] }
        if (!res.ok || !json.items) return
        if (!cancelled) setItems(json.items)
      } catch {
        // Landing should still work without catalog.
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const trending = useMemo(() => {
    if (!items) return []
    const order = new Map<string, number>()
    for (const [i, rarity] of RARITY_ORDER.entries()) order.set(rarity, i)
    return [...items]
      .sort((a, b) => (order.get(a.rarityName ?? "") ?? 999) - (order.get(b.rarityName ?? "") ?? 999))
      .slice(0, 8)
  }, [items])

  return (
    <main className="min-h-screen w-full min-w-0 border border-[rgba(31,33,32,1)] bg-background text-foreground">
      {/* Hero — Figma `8646:30422` Section 1600×600: right art → mask + copy → divider */}
      <section
        className={cn(
          "relative w-full overflow-hidden",
          "bg-muted/40 dark:bg-[#080808]",
        )}
      >
        {/* Mobile, tablet, light desktop — stacked / two-column grid */}
        <div
          className={cn(
            "relative w-full min-h-[min(100vh,600px)] lg:min-h-[600px]",
            "grid gap-8 px-10 py-12 lg:grid-cols-[minmax(0,661px)_1fr] lg:items-center lg:gap-12 lg:px-10 lg:py-0",
            "dark:lg:hidden",
          )}
        >
          <HeroPrimary className="relative z-10 max-w-[661px]" />

          <div
            className={cn(
              "relative flex min-h-[280px] items-end justify-center lg:min-h-[520px] lg:justify-end",
            )}
          >
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 top-1/4 bg-gradient-to-t from-background/80 via-transparent to-transparent dark:from-[#080808]/90"
              aria-hidden
            />
            <Image
              src="/images/hero-section-right.png"
              alt="CS2 Karambit — Grail hero artwork"
              width={1875}
              height={1200}
              priority
              unoptimized
              className="relative h-auto w-full max-w-lg object-contain object-right drop-shadow-[0_20px_45px_rgba(0,0,0,0.35)] transition-transform duration-500 ease-out hover:-translate-y-1 hover:scale-[1.01] lg:max-w-none lg:max-h-[min(520px,55vh)]"
            />
          </div>
        </div>

        {/* Dark desktop — Figma `8646:30422`: `#080808` frame; image 150 first (right), then mask + copy, then stroke */}
        <div className="relative z-10 hidden h-[600px] w-full border-b border-[#181A19] bg-[#080808] dark:lg:block">
          <div className="pointer-events-none absolute right-0 top-0 z-0 h-[600px] w-[58.59375%] max-w-[937.5px] overflow-hidden">
            <Image
              src="/images/hero-section-right.png"
              alt=""
              fill
              sizes="(min-width: 1024px) 938px, 100vw"
              priority
              unoptimized
              className="object-cover object-center"
            />
          </div>

          <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
            <svg
              className="absolute left-0 top-0 h-[600px] w-[58.5%] max-w-[936px]"
              viewBox="0 0 936 600"
              fill="none"
              preserveAspectRatio="none"
            >
              <path d={HERO_LEFT_SHAPE_PATH} fill="#080808" />
            </svg>
          </div>

          <div
            className="pointer-events-none absolute left-[calc(50%+0.06px)] top-[calc(50%-0.05px)] z-[2] h-[600px] w-[17.6325%] max-w-[282.12px] -translate-x-1/2 -translate-y-1/2"
            aria-hidden
          >
            <div className="absolute inset-[-0.2%_-0.77%_-0.17%_-0.8%]">
              <svg className="block size-full" viewBox="0 0 286.546 617.815" fill="none" preserveAspectRatio="none">
                <path
                  d="M284.381 1.25L279.762 9.25L6.26205 608.25L2.26205 616.75"
                  stroke={HERO_DIVIDER_STROKE}
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <HeroPrimary className="absolute left-10 top-[138px] z-20 max-w-[661px]" />
        </div>

        {/* Trending — same hero band; cards match Figma item card (square corners, radial fill, top accent). */}
        <div className="mx-auto w-full max-w-[1600px] border-0 px-10 pb-10 pt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-mono text-sm font-bold uppercase tracking-[0.1em] text-text-secondary dark:text-[#888]">
                Trending
              </h2>
              <p className="mt-1 text-xs text-text-muted dark:text-[#555]">Quick picks from the live catalog feed.</p>
            </div>
            <Link
              href="/market"
              className="font-mono text-[12px] text-info hover:underline dark:text-[#4b69ff]"
            >
              View all →
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {trending.length ? (
              trending.map((i) => {
                const item = i as CatalogItem
                return (
                  <Link key={item.id} href={`/market/${encodeURIComponent(item.id)}`}>
                    <Card
                      className={cn(
                        "h-full overflow-hidden border-border/50 bg-gradient-to-b from-surface to-background/80 py-0 transition-all hover:bg-surface-hover",
                        "dark:bg-[radial-gradient(ellipse_120%_90%_at_50%_0%,#1a1a1a_0%,#0f0f0f_64%)] dark:hover:opacity-[0.98]",
                      )}
                    >
                      <CardContent className="p-0">
                        <div
                          className={cn(
                            "flex items-center justify-center rounded-t-none border-t-[3px] border-solid border-border p-4 dark:border-[#2a2a2a]",
                            "bg-muted/20 dark:bg-[rgba(8,8,8,0.35)]",
                          )}
                        >
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-20 w-auto max-w-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-20 w-full bg-border/10 dark:bg-[#1a1a1a]" />
                          )}
                        </div>
                        <div className="space-y-1 border-t border-[0.5px] border-border/70 px-4 py-3 dark:border-[#202020]">
                          <p className="font-sans text-[12px] font-medium leading-[0.98] tracking-[-0.1px] text-[#878787]">
                            {item.weaponName ?? "—"}
                          </p>
                          <p className="line-clamp-2 font-hero-serif text-base font-normal leading-[0.98] text-foreground dark:text-[#f9f9f9]">
                            {item.name}
                          </p>
                          {item.rarityName && (
                            <p className="font-mono text-[12px] text-text-muted dark:text-[#555]">{item.rarityName}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })
            ) : (
              <div className="col-span-full py-8 text-center text-xs text-text-muted">No trending skins yet.</div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-background dark:bg-[#080808]">
        <div className="w-full px-10 py-10">
          <h2 className="font-mono text-sm font-bold uppercase tracking-[0.1em] text-text-secondary dark:text-[#888]">
            Tools
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <ToolCard
              title="Trade Links"
              desc="Track buys/sells, realized P&L, and capital at risk."
              href="/trade-links"
              requiresAuth
            />
            <ToolCard title="Loadouts" desc="Curate CT/T loadouts with rarity glow and hover tilt." href="/loadout" requiresAuth />
            <ToolCard title="Watchlist" desc="Targets, float ranges, and fast marketplace jumps." href="/watchlist" requiresAuth />
          </div>
        </div>
      </section>
    </main>
  )
}

function ToolCard({ title, desc, href, requiresAuth }: { title: string; desc: string; href: string; requiresAuth?: boolean }) {
  return (
    <Card
      className={cn(
        "relative min-h-[124px] overflow-hidden border-border/50 bg-surface pb-4 pt-4",
        "dark:bg-[radial-gradient(ellipse_120%_90%_at_50%_0%,#1a1a1a_0%,#0f0f0f_64%)]",
      )}
    >
      <CardHeader className="space-y-1 px-4 pb-0 pt-0">
        <CardTitle className="font-mono text-base font-medium text-foreground dark:text-[#fafafa]">{title}</CardTitle>
        <CardDescription className="text-xs font-sans text-text-secondary dark:text-[#888]">{desc}</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pt-3">
        {requiresAuth ? (
          <AuthLink
            href={href}
            variant="secondary"
            size="sm"
            loginText={`Login to open ${title}`}
            className={cn(
              "inline-flex h-8 items-center justify-center rounded-none px-2.5 font-mono text-xs font-medium tracking-wide",
              "dark:bg-[#e5e5e5] dark:text-[#171717] dark:hover:bg-[#e5e5e5]/90",
            )}
          >
            Open →
          </AuthLink>
        ) : (
          <Link href={href} passHref legacyBehavior>
            <Button
              asChild
              size="sm"
              className={cn(
                "h-8 rounded-none px-2.5 font-mono text-xs font-medium",
                "dark:bg-[#e5e5e5] dark:text-[#171717] dark:hover:bg-[#e5e5e5]/90",
              )}
            >
              <a>Open →</a>
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
