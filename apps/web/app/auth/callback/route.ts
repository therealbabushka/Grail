import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

// Ensure Next doesn't try to optimize this route in a way that breaks auth cookie handling.
export const dynamic = "force-dynamic"

function getSafeNextTarget(_next: string | null | undefined) {
  // Per requirement: always go to homepage after successful auth.
  return "/"
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const code = searchParams.get("code")
  const next = getSafeNextTarget(searchParams.get("next"))

  const error =
    searchParams.get("error_description") ??
    searchParams.get("error") ??
    searchParams.get("message") ??
    null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const redirectTo = new URL(next, request.url)
  const res = NextResponse.redirect(redirectTo.toString())

  if (!url || !anonKey) {
    redirectTo.pathname = "/login"
    redirectTo.search = `?error=${encodeURIComponent("supabase_env_missing")}&next=${encodeURIComponent(next)}`
    return NextResponse.redirect(redirectTo)
  }

  if (error) {
    redirectTo.pathname = "/login"
    redirectTo.search = `?error=${encodeURIComponent(error)}&next=${encodeURIComponent(next)}`
    return NextResponse.redirect(redirectTo)
  }

  if (!code) {
    redirectTo.pathname = "/login"
    redirectTo.search = `?error=${encodeURIComponent("missing_oauth_code")}&next=${encodeURIComponent(next)}`
    return NextResponse.redirect(redirectTo)
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options)
        })
      },
    },
  })

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    redirectTo.pathname = "/login"
    redirectTo.search = `?error=${encodeURIComponent(exchangeError.message)}&next=${encodeURIComponent(next)}`
    return NextResponse.redirect(redirectTo)
  }

  return res
}

