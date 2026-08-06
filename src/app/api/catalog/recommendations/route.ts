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
    const userId = await getUserIdFromSession(req)
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get("productId") || ""
    const recentlyViewedIdsStr = searchParams.get("recentlyViewedIds") || ""

    // Parse recently viewed product IDs from string
    const recentlyViewedIds = recentlyViewedIdsStr
      .split(",")
      .map(id => id.trim())
      .filter(id => id.length > 0)

    // Output variables
    let frequentlyBoughtTogether: any[] = []
    let relatedProducts: any[] = []
    let upsell: any[] = []
    let crossSell: any[] = []
    let recentlyViewed: any[] = []
    let trending: any[] = []
    let popular: any[] = []
    let collaborativeFiltering: any[] = []
    let similarityMatrix: any[] = [] // For frontend architectural visualizer

    // 1. Contextual Recommendations (requires active productId)
    if (productId) {
      const activeProduct = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          categories: { include: { category: true } },
          variants: true,
        },
      })

      if (activeProduct) {
        const categoryIds = activeProduct.categories.map(c => c.categoryId)
        const activePrice = activeProduct.variants[0]?.price || 0

        // Related Products (same category, excluding active product)
        relatedProducts = await prisma.product.findMany({
          where: {
            id: { not: productId },
            categories: {
              some: {
                categoryId: { in: categoryIds },
              },
            },
          },
          include: { variants: true },
          take: 4,
        })

        // Upsell (same category, price is 15% to 50% higher)
        upsell = await prisma.product.findMany({
          where: {
            id: { not: productId },
            categories: {
              some: {
                categoryId: { in: categoryIds },
              },
            },
            variants: {
              some: {
                price: {
                  gte: activePrice * 1.15,
                  lte: activePrice * 1.5,
                },
              },
            },
          },
          include: { variants: true },
          take: 4,
        })

        // Cross Sell (complementary category, e.g. accessories)
        // Look up categories that are not the active categories
        crossSell = await prisma.product.findMany({
          where: {
            id: { not: productId },
            categories: {
              none: {
                categoryId: { in: categoryIds },
              },
            },
          },
          include: { variants: true },
          take: 4,
        })

        // Frequently Bought Together (Products ordered in the same cart context)
        const activeVariantIds = activeProduct.variants.map(v => v.id)
        
        // Find orders containing the active product's variants
        const relatedOrders = await prisma.order.findMany({
          where: {
            items: {
              some: {
                productVariantId: { in: activeVariantIds },
              },
            },
          },
          include: {
            items: {
              include: {
                productVariant: { include: { product: { include: { variants: true } } } },
              },
            },
          },
        })

        const coOccurrenceMap: Record<string, { product: any; count: number }> = {}

        relatedOrders.forEach(order => {
          order.items.forEach(item => {
            const p = item.productVariant.product
            if (p.id === productId) return
            
            if (!coOccurrenceMap[p.id]) {
              coOccurrenceMap[p.id] = { product: p, count: 0 }
            }
            coOccurrenceMap[p.id].count += item.quantity
          })
        })

        frequentlyBoughtTogether = Object.values(coOccurrenceMap)
          .sort((a, b) => b.count - a.count)
          .map(entry => entry.product)
          .slice(0, 3)
      }
    }

    // 2. Recently Viewed (Resolve detailed information)
    if (recentlyViewedIds.length > 0) {
      recentlyViewed = await prisma.product.findMany({
        where: { id: { in: recentlyViewedIds } },
        include: { variants: true },
      })
    }

    // 3. Trending & Popular Products (Overall Database Sales Stats)
    const allProducts = await prisma.product.findMany({
      include: {
        variants: { include: { orderItems: true } },
        reviews: true,
      },
    })

    // Sort by sales quantity
    trending = [...allProducts]
      .map(p => {
        const totalSold = p.variants.reduce((acc, v) => {
          return acc + v.orderItems.reduce((oiAcc, oi) => oiAcc + oi.quantity, 0)
        }, 0)
        return { ...p, totalSold }
      })
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 4)

    // Sort by review ratings
    popular = [...allProducts]
      .map(p => {
        const avgRating = p.reviews.length > 0
          ? p.reviews.reduce((acc, r) => acc + r.rating, 0) / p.reviews.length
          : 0
        return { ...p, avgRating }
      })
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 4)

    // 4. Personalized Recommendations / Collaborative Filtering (Jaccard Index Math)
    if (userId) {
      // Fetch all customer checkouts to compile user-item matrix
      const ordersDataset = await prisma.order.findMany({
        where: { userId: { not: null } },
        include: { items: true },
      })

      const userVariantMap: Record<string, Set<string>> = {}
      ordersDataset.forEach(o => {
        const uId = o.userId
        if (!uId) return
        if (!userVariantMap[uId]) userVariantMap[uId] = new Set()
        o.items.forEach(item => {
          userVariantMap[uId].add(item.productVariantId)
        })
      })

      const currentUserPurchases = userVariantMap[userId] || new Set<string>()

      if (currentUserPurchases.size > 0) {
        const userSimilarities: Array<{ userId: string; similarity: number }> = []

        Object.keys(userVariantMap).forEach(otherUserId => {
          if (otherUserId === userId) return
          
          const otherPurchases = userVariantMap[otherUserId]
          
          // Intersection
          const intersection = new Set(
            [...currentUserPurchases].filter(x => otherPurchases.has(x))
          )
          
          // Union
          const union = new Set([...currentUserPurchases, ...otherPurchases])
          
          const jaccardSimilarity = union.size > 0 ? intersection.size / union.size : 0
          userSimilarities.push({ userId: otherUserId, similarity: jaccardSimilarity })
        })

        // Sort by similarity coefficients
        userSimilarities.sort((a, b) => b.similarity - a.similarity)
        similarityMatrix = userSimilarities.slice(0, 5) // Top similar users list for sandbox preview

        const mostSimilarUser = userSimilarities[0]

        if (mostSimilarUser && mostSimilarUser.similarity > 0) {
          const similarUserPurchases = userVariantMap[mostSimilarUser.userId]
          
          // Recommend items bought by similar user that current user hasn't bought
          const recommendedVariantIds = [...similarUserPurchases].filter(
            vId => !currentUserPurchases.has(vId)
          )

          collaborativeFiltering = await prisma.product.findMany({
            where: {
              variants: {
                some: {
                  id: { in: recommendedVariantIds },
                },
              },
            },
            include: { variants: true },
            take: 4,
          })
        }
      }
    }

    // Fallbacks if Collaborative Filtering is empty
    if (collaborativeFiltering.length === 0) {
      collaborativeFiltering = trending.slice(0, 4)
    }

    return NextResponse.json({
      success: true,
      frequentlyBoughtTogether,
      relatedProducts,
      upsell,
      crossSell,
      recentlyViewed,
      trending: trending.slice(0, 4),
      popular: popular.slice(0, 4),
      collaborativeFiltering,
      similarityMatrix,
    })
  } catch (error: any) {
    console.error("GET /api/catalog/recommendations error:", error)
    return NextResponse.json({ error: "Internal server error fetching recommendations" }, { status: 500 })
  }
}
