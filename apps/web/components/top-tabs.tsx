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
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/skins/search?q=${encodeURIComponent(q)}`)
        const json = (await res.json()) as { items?: SearchSuggestion[] }
        if (cancelled) return
        const next = json.items ?? []
        setSuggestions(next)
        setSelectedSuggestion(-1)
      } catch {
        if (!cancelled) {
          setSuggestions([])
        }
      }
    }, 150)

    return () => {
      cancelled = true
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

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-5 px-6 py-3">
        <Link href="/" className="font-mono text-sm font-bold tracking-[0.22em] text-primary">
          GRAIL
        </Link>

        <div className="flex flex-1 items-center gap-1 overflow-x-auto [-webkit-overflow-scrolling:touch]">
          {tabs.map((t) => {
            const active = isActive(pathname, t.href)
            return (
              <Link key={t.href} href={t.href} className="shrink-0">
                <Button
                  variant="ghost"
                  className={cn(
                    "h-8 rounded-none border-b-2 px-3 text-[11px] font-mono tracking-wide",
                    active
                      ? "border-primary text-foreground"
                      : "border-transparent text-text-secondary hover:text-foreground",
                  )}
                >
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.short ?? t.label}</span>
                </Button>
              </Link>
            )
          })}
        </div>

        <div ref={searchShellRef} className="relative hidden w-[320px] md:block">
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
              className="h-8 rounded-none border-border bg-surface/60 pr-8 text-[11px] font-mono tracking-wide placeholder:text-text-muted"
              aria-label="Search skins"
            />
          </form>
          {searchOpen && (
            <div className="absolute right-0 top-10 z-[70] w-[320px] rounded-none border border-border bg-background/95 p-1 shadow-xl backdrop-blur">
              {trimmedQuery.length < 2 ? (
                <div className="px-2 py-2 text-[11px] text-text-secondary">Type at least 2 characters…</div>
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
                            <span className="font-mono text-[10px] text-text-muted">N/A</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[11px] text-foreground">{item.name}</p>
                          <p className="truncate text-[10px] text-text-secondary">
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
                      <p className="shrink-0 font-mono text-[11px] text-profit">
                        {formatSuggestionPrice(item.price, item.currency)}
                      </p>
                    </button>
                  )
                })
              ) : (
                <div className="px-2 py-2 text-[11px] text-text-secondary">No matches</div>
              )}
            </div>
          )}
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <ThemeToggle />
          {signedIn ? (
            <Button
              variant="secondary"
              className="h-8 rounded-none font-mono text-[11px] tracking-wide"
              onClick={onLogout}
            >
              Logout
            </Button>
          ) : (
            <Link href="/login" className="shrink-0">
              <Button
                variant="secondary"
                className="h-8 rounded-none font-mono text-[11px] tracking-wide"
              >
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

