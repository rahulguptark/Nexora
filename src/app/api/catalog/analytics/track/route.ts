import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyAccessJWT } from "@/lib/auth"

async function getUserIdFromSession(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null
  const decoded = await verifyAccessJWT(token)
  return decoded ? decoded.userId : null
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromSession(req)
    const body = await req.json()
    const { type, path, referrer, pagePath, selector, x, y } = body

    if (type === "visit") {
      if (!path) {
        return NextResponse.json({ error: "path parameter is required for type 'visit'" }, { status: 400 })
      }

      await prisma.pageVisit.create({
        data: {
          path,
          userId,
          referrer: referrer || null,
        },
      })

      return NextResponse.json({ success: true, message: "Page visit tracked successfully" })
    }

    if (type === "click") {
      if (!pagePath || !selector || x === undefined || y === undefined) {
        return NextResponse.json({ error: "pagePath, selector, x, y are required for type 'click'" }, { status: 400 })
      }

      await prisma.clickLog.create({
        data: {
          pagePath,
          selector,
          x: Math.round(x),
          y: Math.round(y),
        },
      })

      return NextResponse.json({ success: true, message: "Element click tracked successfully" })
    }

    return NextResponse.json({ error: "Invalid event tracking type. Must be 'visit' or 'click'" }, { status: 400 })
  } catch (error: any) {
    console.error("POST /api/catalog/analytics/track error:", error)
    return NextResponse.json({ error: "Internal server error tracking analytics event" }, { status: 500 })
  }
}
