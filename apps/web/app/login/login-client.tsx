"use client"

import { useState } from "react"
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

import { createClient } from "@/lib/supabase/browser"

export function LoginClient() {
  const searchParams = useSearchParams()

  const error = searchParams.get("error")
  const next = searchParams.get("next") ?? "/dashboard"
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  async function onGoogleSignIn() {
    const supabase = createClient()
    if (!supabase) {
      setLocalError(
        "Supabase env missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.",
      )
      return
    }

    setLocalError(null)
    const redirectTo = new URL("/auth/callback", window.location.origin)
    redirectTo.searchParams.set("next", next)

    setIsSigningIn(true)
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectTo.toString() },
      })

      // Supabase will redirect on success; only handle errors here.
      if (oauthError) setLocalError(oauthError.message ?? "oauth_failed")
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "oauth_failed")
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background px-6 py-10 text-foreground">
      <div className="mx-auto w-full max-w-md space-y-8">
        <header className="text-center">
          <div className="inline-flex items-center gap-2 rounded-none border border-border bg-background/40 px-3 py-2 backdrop-blur">
            <span className="inline-block size-1.5 rounded-full bg-profit" aria-hidden />
            <span className="font-mono text-[11px] tracking-[0.22em] text-text-secondary">
              AUTH ENABLED
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
            {localError ? (
              <div className="rounded-none border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger">
                Sign-in error: <span className="font-mono">{localError}</span>
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 border-border pt-4">
            <Button
              className="w-full rounded-none font-mono text-xs tracking-wide"
              disabled={isSigningIn}
              onClick={() => {
                void onGoogleSignIn()
              }}
            >
              {isSigningIn ? "Signing in…" : `Continue with Google`}
            </Button>

            <p className="text-[11px] text-text-muted">
              After signing in, you will be redirected to: <span className="font-mono">{next}</span>
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}

