"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
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
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0" aria-hidden>
          <div className="absolute inset-0 opacity-70" />
          <div className="absolute -left-48 -top-48 h-[520px] w-[520px] rounded-full bg-info/10 blur-3xl" />
          <div className="absolute -right-56 top-10 h-[620px] w-[620px] rounded-full bg-profit/10 blur-3xl" />
          <div className="absolute left-1/3 top-2/3 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-loss/5 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.05),transparent_55%),radial-gradient(circle_at_70%_30%,rgba(75,105,255,0.08),transparent_60%)]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="grid gap-10 md:grid-cols-[1.15fr,0.85fr] md:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-none border border-border bg-background/30 px-3 py-2 backdrop-blur">
                <span className="inline-block size-1.5 rounded-full bg-profit" aria-hidden />
                <p className="font-mono text-[11px] tracking-[0.22em] text-text-secondary">
                  MARKET_FIRST · TRADER_READY
                </p>
              </div>
              <h1 className="mt-5 max-w-3xl font-mono text-4xl font-bold tracking-tight sm:text-5xl">
                Find the skin.
                <span className="text-info"> Set the target.</span>
                <span className="text-profit"> Log the flip.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-text-secondary">
                A tactical marketplace cockpit for CS2 traders—built for fast scanning, precise targeting, and clean execution.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/market" passHref legacyBehavior>
                  <Button asChild variant="outline" className="h-10 font-mono text-xs tracking-wide">
                    <a>Browse market</a>
                  </Button>
                </Link>
                <Link href="/watchlist" passHref legacyBehavior>
                  <Button asChild variant="ghost" className="h-10 font-mono text-xs tracking-wide">
                    <a>Open Watchlist</a>
                  </Button>
                </Link>
                <Link href="/trade-links" passHref legacyBehavior>
                  <Button asChild variant="ghost" className="h-10 font-mono text-xs tracking-wide">
                    <a>Open Trade Links</a>
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative self-end">
              <div
                className="pointer-events-none absolute inset-x-10 bottom-0 top-8 bg-gradient-to-t from-background/70 via-background/5 to-transparent blur-2xl"
                aria-hidden
              />
              <Image
                src="/images/grail-hero.png"
                alt="Tactical CS2 operator artwork"
                width={1024}
                height={571}
                priority
                className="relative h-auto w-full max-w-[36rem] object-contain drop-shadow-[0_20px_45px_rgba(0,0,0,0.35)] transition-transform duration-500 ease-out hover:-translate-y-1 hover:scale-[1.01]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-text-secondary">
              Trending
            </h2>
            <p className="mt-1 text-xs text-text-muted">Quick picks from the live catalog feed.</p>
          </div>
          <Link href="/market" className="font-mono text-[11px] text-info hover:underline">
            View all →
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(trending.length ? trending : Array.from({ length: 8 })).map((i, idx) => {
            const key = (i as any)?.id ?? `skeleton_${idx}`
            const item = i as CatalogItem | undefined
            return (
              <Link key={key} href={item ? `/market/${encodeURIComponent(item.id)}` : "/market"}>
                <Card className="h-full overflow-hidden border-border bg-surface transition-all hover:bg-surface-hover">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-center rounded-none border border-border bg-background/40 p-2">
                      {item?.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-20 w-auto max-w-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-20 w-full animate-pulse rounded bg-border/40" />
                      )}
                    </div>
                    <div className="mt-3 space-y-1">
                      <p className="font-mono text-[11px] text-foreground line-clamp-2">
                        {item?.name ?? "Loading…"}
                      </p>
                      <p className="text-[10px] text-text-secondary">{item?.weaponName ?? "—"}</p>
                      {item?.rarityName && (
                        <p className="font-mono text-[10px] text-text-muted">{item.rarityName}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-text-secondary">
            Tools
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <ToolCard
              title="Trade Links"
              desc="Track buys/sells, realized P&L, and capital at risk."
              href="/trade-links"
            />
            <ToolCard title="Loadouts" desc="Curate CT/T loadouts with rarity glow and hover tilt." href="/loadout" />
            <ToolCard title="Watchlist" desc="Targets, float ranges, and fast marketplace jumps." href="/watchlist" />
          </div>
        </div>
      </section>
    </main>
  )
}

function HeroStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-none border border-border bg-background/40 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-text-secondary">{label}</span>
        <span className="font-mono text-sm text-foreground">{value}</span>
      </div>
      <p className="mt-1 text-[11px] text-text-muted">{hint}</p>
    </div>
  )
}

function ToolCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Card className="bg-surface">
      <CardHeader>
        <CardTitle className="font-mono text-base">{title}</CardTitle>
        <CardDescription className="text-xs text-text-secondary">{desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href={href} passHref legacyBehavior>
          <Button asChild className="font-mono text-xs tracking-wide">
            <a>Open →</a>
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

