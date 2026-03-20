"use client"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import type { Currency } from "@/lib/demo-seed"
import { demoActions, useDemoStore } from "@/lib/prototype-store"

import { AuthRequiredBanner } from "@/components/auth-required-banner"

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "CNY"]

export default function ProfilePage() {
  const { profile } = useDemoStore()
  const actions = demoActions()

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-xl space-y-6">
        <AuthRequiredBanner
          subtitle="Sign in to persist your settings to your account. While signed out, profile settings are stored in demo/local state."
        />
        <header>
          <div className="inline-flex items-center gap-2 rounded-none border border-border bg-background/40 px-3 py-2 backdrop-blur">
            <span className="inline-block size-1.5 rounded-full bg-info" aria-hidden />
            <span className="font-mono text-[11px] tracking-[0.22em] text-text-secondary">SETTINGS</span>
          </div>
          <h1 className="mt-4 font-mono text-2xl font-bold tracking-tight">Profile</h1>
          <p className="mt-1 text-xs text-text-secondary">Demo settings · Stored locally</p>
        </header>

        <Card className="bg-background/40 backdrop-blur">
          <CardHeader>
            <CardTitle className="font-mono text-sm">Display currency</CardTitle>
            <CardDescription className="text-xs">
              Preferred currency for showing amounts across the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {CURRENCIES.map((c) => (
                <Button
                  key={c}
                  variant={profile.displayCurrency === c ? "default" : "outline"}
                  size="sm"
                  className="font-mono text-xs"
                  onClick={() => actions.setDisplayCurrency(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-warning/30 bg-background/30 backdrop-blur">
          <CardHeader>
            <CardTitle className="font-mono text-sm text-warning">Demo data</CardTitle>
            <CardDescription className="text-xs">
              Reset all demo trades, loadouts, and targets to the initial seed. This cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              size="sm"
              className="font-mono text-xs"
              onClick={() => {
                if (typeof window !== "undefined" && window.confirm("Reset all demo data to seed state?")) {
                  actions.resetDemo()
                }
              }}
            >
              Reset demo data
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
