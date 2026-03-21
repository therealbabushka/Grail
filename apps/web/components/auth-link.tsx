"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { createClient } from "@/lib/supabase/browser"

type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"

export type AuthLinkProps = {
  href: string
  children: React.ReactNode
  className?: string
  variant?: ButtonVariant
  size?: ButtonSize
  loginText?: string
  /**
   * Override the post-login redirect target.
   * Defaults to the page the user is currently on.
   */
  next?: string
}

export function AuthLink({ href, children, className, variant = "ghost", size = "sm", loginText = "Login to proceed", next }: AuthLinkProps) {
  const supabase = useMemo(() => createClient(), [])
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  const nextTarget =
    next ??
    (typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/")

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

  const label = signedIn ? children : loginText

  // Render as a normal button+link when signed in; otherwise show login CTA.
  return (
    <Button
      asChild
      className={className}
      variant={variant}
      size={size}
    >
      <Link href={signedIn ? href : `/login?next=${encodeURIComponent(nextTarget)}`}>{label}</Link>
    </Button>
  )
}

