"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

export function LoginClient() {
  const searchParams = useSearchParams()

  const error = searchParams.get("error")
  const next = searchParams.get("next") ?? "/dashboard"

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background px-6 py-10 text-foreground">
      <div className="mx-auto w-full max-w-md space-y-8">
        <header className="text-center">
          <div className="inline-flex items-center gap-2 rounded-none border border-border bg-background/40 px-3 py-2 backdrop-blur">
            <span className="inline-block size-1.5 rounded-full bg-profit" aria-hidden />
            <span className="font-mono text-[11px] tracking-[0.22em] text-text-secondary">
              AUTH_DISABLED
            </span>
          </div>
          <h1 className="mt-4 font-mono text-3xl font-bold tracking-tight">
            GRAIL
          </h1>
          <p className="mt-2 text-sm text-text-secondary">CS2 market cockpit</p>
        </header>

        <Card className="bg-background/40 backdrop-blur">
          <CardHeader className="space-y-2">
            <CardTitle className="font-mono text-lg">Market-first. Tool-linked.</CardTitle>
            <CardDescription className="text-xs text-text-secondary">
              Browse the catalog, then route items directly into Watchlist and Trades.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-secondary">
            <ul className="space-y-2">
              <li className="flex gap-2">
                <span className="font-mono text-info">I</span>
                <span>Trades — P&amp;L and trade tracking</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-info">II</span>
                <span>Loadouts — CT/T gallery with rarity glow</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-info">III</span>
                <span>Watchlist — target watchlist and marketplace links</span>
              </li>
            </ul>
            {error ? (
              <div className="rounded-none border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger">
                Sign-in error: <span className="font-mono">{error}</span>
              </div>
            ) : null}
            <div className="rounded-none border border-border bg-background/40 px-3 py-2 text-[11px] text-text-secondary">
              Authentication is temporarily disabled. Continue to{" "}
              <span className="font-mono">{next}</span>.
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 border-border pt-4">
            <Button asChild className="w-full font-mono text-xs tracking-wide">
              <Link href={next}>Continue</Link>
            </Button>
            <p className="text-[11px] text-text-muted">
              When auth is re-enabled, this page will switch back to sign-in.
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}

