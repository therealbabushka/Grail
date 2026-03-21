"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { createClient } from "@/lib/supabase/browser"

export type AuthGateProps = {
  title?: string
  subtitle?: string
  loginText?: string
  children: React.ReactNode
}

export function AuthGate({
  title = "Login to proceed",
  subtitle = "Sign in to access this feature. While signed out, you can browse the Market and explore public loadouts.",
  loginText = "Login to proceed",
  children,
}: AuthGateProps) {
  const supabase = useMemo(() => createClient(), [])
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true

    if (!supabase) {
      setSignedIn(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSignedIn(Boolean(data.session))
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setSignedIn(Boolean(session))
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [supabase])

  // While we’re determining auth status, show a minimal card instead of content.
  if (signedIn === null || !signedIn) {
    const nextTarget = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/"
    return (
      <Card className="w-full max-w-none border-warning/30 bg-warning/10">
        <CardHeader className="py-4">
          <CardTitle className="font-mono text-sm">{title}</CardTitle>
          <CardDescription className="text-xs text-text-muted">{subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Button asChild variant="secondary" className="h-8 rounded-none font-mono text-xs tracking-wide">
            <Link href={`/login?next=${encodeURIComponent(nextTarget)}`}>{loginText}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}

