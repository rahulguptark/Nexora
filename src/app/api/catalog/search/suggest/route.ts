import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyAccessJWT } from "@/lib/auth"

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

    // 1. Autocomplete Suggestions
    let autocompleteSuggestions: Array<{ name: string; slug: string }> = []
    if (q.trim()) {
      const suggestions = await prisma.product.findMany({
        where: {
          isActive: true,
          visibility: "public",
          OR: [
            { name: { contains: q } },
            { slug: { contains: q } },
          ],
        },
        select: {
          name: true,
          slug: true,
        },
        take: 5,
      })
      autocompleteSuggestions = suggestions
    }

    // 2. Recent Searches (User scoped)
    let recentSearches: string[] = []
    const userId = await getUserIdFromSession(req)
    if (userId) {
      const logs = await prisma.searchQueryLog.findMany({
        where: { userId },
        select: { queryText: true },
        orderBy: { createdAt: "desc" },
        take: 30, // scan recent logs
      })
      
      // Deduplicate manually
      const unique = Array.from(new Set(logs.map(l => l.queryText)))
      recentSearches = unique.slice(0, 5)
    }

    // 3. Popular Searches (System-wide)
    const popularAgg = await prisma.searchQueryLog.groupBy({
      by: ["queryText"],
      _count: {
        queryText: true,
      },
      orderBy: {
        _count: {
          queryText: "desc",
        },
      },
      take: 10,
    })
    const popularSearches = popularAgg.map(item => item.queryText)

    // 4. Trending Products
    const trendingProductsRaw = await prisma.product.findMany({
      where: {
        isActive: true,
        visibility: "public",
      },
      take: 4,
      include: {
        variants: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    const trendingProducts = trendingProductsRaw.map(rp => {
      const prices = rp.variants.map(v => v.price)
      return {
        id: rp.id,
        name: rp.name,
        slug: rp.slug,
        price: prices.length > 0 ? Math.min(...prices) : 0,
      }
    })

    return NextResponse.json({
      success: true,
      autocomplete: autocompleteSuggestions,
      recent: recentSearches,
      popular: popularSearches.length > 0 ? popularSearches : ["hoodie", "sneaker", "cotton", "organic"], // seed default populars if empty
      trending: trendingProducts,
    })
  } catch (error: any) {
    console.error("GET /api/catalog/search/suggest error:", error)
    return NextResponse.json({ error: "Internal server error during suggest compilation" }, { status: 500 })
  }
}
