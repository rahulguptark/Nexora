import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyAccessJWT } from "@/lib/auth"
import { executeEnterpriseSearch } from "@/lib/elasticsearch"

async function getUserIdFromSession(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null
  const decoded = await verifyAccessJWT(token)
  return decoded ? decoded.userId : null
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") || ""
    const category = searchParams.get("category") || undefined
    const brand = searchParams.get("brand") || undefined
    const minPrice = searchParams.get("minPrice") ? parseFloat(searchParams.get("minPrice")!) : undefined
    const maxPrice = searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : undefined
    const color = searchParams.get("color") || undefined
    const size = searchParams.get("size") || undefined
    const sort = searchParams.get("sort") || "relevance"
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "12", 10)

    // Execute query
    const results = await executeEnterpriseSearch({
      q,
      category,
      brand,
      minPrice,
      maxPrice,
      color,
      size,
      sort,
      page,
      limit,
    })

    // Log query in SearchQueryLog database table (if query text is not blank)
    if (q.trim()) {
      const userId = await getUserIdFromSession(req)
      await prisma.searchQueryLog.create({
        data: {
          queryText: q.trim().toLowerCase(),
          userId,
        },
      })
    }

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error: any) {
    console.error("GET /api/catalog/search error:", error)
    return NextResponse.json({ error: "Internal server error during search query" }, { status: 500 })
  }
}
