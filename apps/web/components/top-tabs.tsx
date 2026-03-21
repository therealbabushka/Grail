"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { createClient } from "@/lib/supabase/browser"

type Tab = {
  label: string
  href: string
  short?: string
}

const tabs: Tab[] = [
  { label: "Home", href: "/" },
  { label: "Market", href: "/market" },
  { label: "Trade Links", href: "/trade-links" },
  { label: "Loadouts", href: "/loadout" },
  { label: "Watchlist", href: "/watchlist", short: "List" },
  { label: "Profile", href: "/profile" },
]

type SearchSuggestion = {
  name: string
  imageUrl?: string
  rarity?: string
  price?: number | null
  currency?: string
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

function formatSuggestionPrice(price?: number | null, currency?: string) {
  if (typeof price !== "number" || !Number.isFinite(price)) return "—"
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(price)
  } catch {
    return `$${price.toFixed(2)}`
  }
}

export function TopTabs() {
  const pathname = usePathname() ?? "/"
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [signedIn, setSignedIn] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)
  const searchShellRef = useRef<HTMLDivElement | null>(null)
  const trimmedQuery = searchQuery.trim()

  useEffect(() => {
    let mounted = true

    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSignedIn(Boolean(data.session))
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session))
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!searchShellRef.current) return
      if (!searchShellRef.current.contains(event.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [])

  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) {
      setSuggestions([])
      setSelectedSuggestion(-1)
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/skins/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        })
        const json = (await res.json()) as { items?: SearchSuggestion[] }
        if (cancelled) return
        const next = json.items ?? []
        setSuggestions(next)
        setSelectedSuggestion(-1)
      } catch (err) {
        if (cancelled) return
        // Ignore aborts when the user keeps typing.
        if (err instanceof DOMException && err.name === "AbortError") return
        {
          setSuggestions([])
        }
      }
    }, 150)

    return () => {
      cancelled = true
      controller.abort()
      clearTimeout(t)
    }
  }, [searchQuery])

  function openSuggestion(suggestion: SearchSuggestion) {
    setSearchOpen(false)
    setSearchQuery("")
    router.push(`/market/${encodeURIComponent(suggestion.name)}`)
  }

  function onSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    if (selectedSuggestion >= 0 && selectedSuggestion < suggestions.length) {
      openSuggestion(suggestions[selectedSuggestion]!)
      return
    }
    setSearchOpen(false)
    router.push(`/market?q=${encodeURIComponent(q)}`)
  }

  async function onLogout() {
    if (!supabase) return
    await supabase.auth.signOut()
    router.refresh()
    router.push("/")
  }

  const protectedHrefs = new Set(["/trade-links", "/loadout", "/watchlist", "/profile"])
  const visibleTabs = signedIn ? tabs : tabs.filter((t) => !protectedHrefs.has(t.href))

  return (
    <nav
      className="sticky top-0 z-50 border-b border-border bg-background/90 text-foreground backdrop-blur-md dark:border-[#282828] dark:bg-[rgba(8,8,8,0.8)]"
      aria-label="Primary"
    >
      <div className="mx-auto flex min-h-14 w-full max-w-[1600px] items-center justify-between gap-3 border border-[rgba(24,26,25,1)] px-10 py-0 lg:gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-6 lg:gap-10">
          <Link
            href="/"
            className="shrink-0 font-mono text-sm font-bold leading-5 tracking-[0.22em] text-foreground hover:text-foreground/90 dark:text-[#e5e5e5] dark:hover:text-[#fafafa]"
          >
            GRAIL
          </Link>

          <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto [-webkit-overflow-scrolling:touch] md:flex-none">
            <div className="flex min-h-[55px] min-w-0 items-stretch border border-border dark:border-[rgba(255,255,255,0.09)]">
              {visibleTabs.map((t) => {
                const active = isActive(pathname, t.href)
                return (
                  <Link key={t.href} href={t.href} className="flex shrink-0">
                    <span
                      className={cn(
                        "flex h-[55px] min-w-0 items-center justify-center border-border px-4 py-2 text-[12px] font-medium tracking-[0.017em] sm:px-6",
                        "border-r last:border-r-0 dark:border-[rgba(255,255,255,0.09)]",
                        active
                          ? "bg-muted text-foreground dark:bg-[#151515] dark:text-[#fafafa]"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground dark:text-[#888] dark:hover:bg-[#151515]/40 dark:hover:text-[#fafafa]",
                      )}
                    >
                      <span className="hidden font-mono sm:inline">{t.label}</span>
                      <span className="font-mono sm:hidden">{t.short ?? t.label}</span>
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        <div ref={searchShellRef} className="relative hidden w-[300px] shrink-0 md:block">
          <form onSubmit={onSearchSubmit}>
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(event) => {
                if (!searchOpen || suggestions.length === 0) return
                if (event.key === "ArrowDown") {
                  event.preventDefault()
                  setSelectedSuggestion((idx) => (idx + 1) % suggestions.length)
                } else if (event.key === "ArrowUp") {
                  event.preventDefault()
                  setSelectedSuggestion((idx) => (idx <= 0 ? suggestions.length - 1 : idx - 1))
                } else if (event.key === "Escape") {
                  setSearchOpen(false)
                }
              }}
              placeholder="Search skins..."
              className="h-8 rounded-none border-border bg-muted/60 pr-8 text-xs font-mono tracking-[0.02em] text-foreground placeholder:text-muted-foreground dark:border-[#282828] dark:bg-[rgba(52,52,52,0.3)] dark:text-[#e5e5e5] dark:placeholder:text-[#555]"
              aria-label="Search skins"
            />
          </form>
          {searchOpen && (
            <div className="absolute right-0 top-10 z-[70] w-[300px] rounded-none border border-border bg-popover p-1 shadow-xl backdrop-blur dark:border-[#282828] dark:bg-[rgba(8,8,8,0.95)]">
              {trimmedQuery.length < 2 ? (
                <div className="px-2 py-2 text-[12px] text-text-secondary">Type at least 2 characters…</div>
              ) : suggestions.length > 0 ? (
                suggestions.map((item, idx) => {
                  const active = idx === selectedSuggestion
                  return (
                    <button
                      key={`${item.name}_${idx}`}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-none px-2 py-1.5 text-left",
                        active ? "bg-surface" : "hover:bg-surface/60"
                      )}
                      onMouseEnter={() => setSelectedSuggestion(idx)}
                      onClick={() => openSuggestion(item)}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded-none border border-border bg-background/60">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="h-7 w-auto max-w-[40px] object-contain" />
                          ) : (
                            <span className="font-mono text-[12px] text-text-muted">N/A</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[12px] text-foreground">{item.name}</p>
                          <p className="truncate text-[12px] text-text-secondary">
                            {(() => {
                              const v = item.rarity?.trim()
                              if (!v) return "—"
                              const lower = v.toLowerCase()
                              if (lower === "unknown" || lower === "unknown rarity" || lower === "n/a" || lower === "na") return "—"
                              return v
                            })()}
                          </p>
                        </div>
                      </div>
                      <p className="shrink-0 font-mono text-[12px] text-profit">
                        {formatSuggestionPrice(item.price, item.currency)}
                      </p>
                    </button>
                  )
                })
              ) : (
                <div className="px-2 py-2 text-[12px] text-text-secondary">No matches</div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle className="text-foreground hover:bg-muted dark:text-[#e5e5e5] dark:hover:bg-white/5 dark:hover:text-[#fafafa]" />
          {signedIn ? (
            <Button
              variant="secondary"
              className="h-8 rounded-none border border-border bg-secondary px-4 font-mono text-[12px] font-medium tracking-[0.017em] text-secondary-foreground hover:bg-secondary/80 dark:border-[#282828] dark:bg-[#262626] dark:text-[#fafafa] dark:hover:bg-[#333]"
              onClick={onLogout}
            >
              Logout
            </Button>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? `${pathname}${window.location.search}` : pathname)}`}
              className="shrink-0"
            >
              <span className="inline-flex h-8 items-center justify-center bg-primary px-4 font-mono text-[12px] font-medium tracking-[0.017em] text-primary-foreground transition-opacity hover:opacity-90 dark:bg-[#f3f3f3] dark:text-[#080808] dark:hover:opacity-90">
                Login
              </span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

