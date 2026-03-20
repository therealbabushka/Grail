import { NextResponse, type NextRequest } from "next/server"

import { createServerClient } from "@supabase/ssr"

const AUTH_DISABLED = false

const PUBLIC_PATHS = [
  "/",
  "/market",
  "/login",
  "/auth/callback",
  "/design-system",
  "/shadcn-preview",
]

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true
  if (pathname.startsWith("/api/")) return true // Public marketplace/catalog endpoints.
  if (pathname.startsWith("/market/")) return true
  if (pathname.startsWith("/loadout/")) return true // public share links
  return false
}

export async function middleware(request: NextRequest) {
  if (AUTH_DISABLED) return NextResponse.next()

  const { pathname } = request.nextUrl

  // Skip Next internals/static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap")
  ) {
    return NextResponse.next()
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If env isn't configured yet, don't block local navigation.
  if (!url || !anonKey) return NextResponse.next()

  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // IMPORTANT: do not remove; refreshes session + cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isPublicPath(pathname)) {
    // If already logged in, keep /login from being a dead-end.
    if (pathname === "/login" && user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = "/"
      redirectUrl.search = ""
      return NextResponse.redirect(redirectUrl)
    }
    return response
  }

  if (!user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    // Always return to homepage after login (per product requirement).
    redirectUrl.searchParams.set("next", "/")
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)"],
}

