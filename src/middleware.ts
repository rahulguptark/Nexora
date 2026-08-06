import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "super-secret-key-that-is-at-least-32-characters-long"
)

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protected route matching groups
  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin")
  const isDashboardRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/api/profile") || pathname.startsWith("/api/addresses")

  if (isAdminRoute || isDashboardRoute) {
    const accessToken = req.cookies.get("access_token")?.value

    if (!accessToken) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      const loginUrl = new URL("/auth/login", req.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }

    try {
      // Decode JWT cryptographically on the Edge Runtime
      const { payload } = await jwtVerify(accessToken, JWT_SECRET)
      const roles = (payload.roles as string[]) || []

      // If it is an admin route, verify role privileges
      if (isAdminRoute) {
        const hasAdminRole =
          roles.includes("admin") ||
          roles.includes("super_admin") ||
          roles.includes("seller") ||
          roles.includes("warehouse_manager") ||
          roles.includes("support_executive") ||
          roles.includes("finance_team")

        if (!hasAdminRole) {
          if (pathname.startsWith("/api/")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
          }
          return NextResponse.redirect(new URL("/", req.url))
        }
      }
    } catch (error) {
      // Access token has expired or is invalid
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      const loginUrl = new URL("/auth/login", req.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/dashboard/:path*",
    "/api/profile/:path*",
    "/api/addresses/:path*",
  ],
}
