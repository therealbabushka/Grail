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

/** Forward pathname for consumers that need the request path on the server (e.g. headers in RSC). */
function nextWithPathname(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", request.nextUrl.pathname)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export async function middleware(request: NextRequest) {
  if (AUTH_DISABLED) return nextWithPathname(request)

  const { pathname } = request.nextUrl

  // Skip Next internals/static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap")
  ) {
    return nextWithPathname(request)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If env isn't configured yet, don't block local navigation.
  if (!url || !anonKey) return nextWithPathname(request)

  const response = nextWithPathname(request)

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
    // Auth-required pages should still render; UI will show "login to proceed".
    return response
  }

  return response
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)"],
}

