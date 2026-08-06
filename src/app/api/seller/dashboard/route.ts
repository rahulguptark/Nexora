import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyAccessJWT } from "@/lib/auth"

async function getAuthenticatedUser(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null
  const decoded = await verifyAccessJWT(token)
  return decoded
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const hasAccess =
      user.roles.includes("seller") ||
      user.roles.includes("admin") ||
      user.roles.includes("super_admin")

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden. Seller role required." }, { status: 403 })
    }

    // Resolve or provision Seller record dynamically
    let seller = await prisma.seller.findUnique({
      where: { email: user.email },
    })

    if (!seller) {
      // Find user details to name the seller workspace
      const userProfile = await prisma.user.findUnique({ where: { id: user.userId } })
      const workspaceName = userProfile 
        ? `${userProfile.firstName} ${userProfile.lastName}'s Store`
        : "Store Workspace"

      seller = await prisma.seller.create({
        data: {
          name: workspaceName,
          email: user.email,
          isVerified: true,
        },
      })
    }

    // 1. Fetch Inventory (seller products & variants)
    const inventory = await prisma.product.findMany({
      where: { sellerId: seller.id },
      include: {
        brand: true,
        categories: { include: { category: true } },
        variants: { include: { inventories: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    // 2. Fetch Orders containing seller's variants
    // Grab all variant IDs owned by this seller
    const sellerVariantIds = inventory.flatMap(p => p.variants.map(v => v.id))

    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            productVariantId: { in: sellerVariantIds },
          },
        },
      },
      include: {
        items: {
          where: { productVariantId: { in: sellerVariantIds } },
          include: { productVariant: { include: { product: true } } },
        },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    // 3. Calculate Analytics Metrics
    let revenue = 0
    let totalItemsSold = 0
    const uniqueCustomerEmails = new Set<string>()

    orders.forEach(order => {
      uniqueCustomerEmails.add(order.email)
      order.items.forEach(item => {
        if (order.paymentStatus === "paid") {
          revenue += item.price * item.quantity
        }
        totalItemsSold += item.quantity
      })
    })

    const totalStock = inventory.reduce((acc, p) => {
      const pStock = p.variants.reduce((vAcc, v) => {
        return vAcc + v.inventories.reduce((iAcc, inv) => iAcc + inv.quantityAvailable, 0)
      }, 0)
      return acc + pStock
    }, 0)

    const analytics = {
      revenue,
      totalOrders: orders.length,
      totalItemsSold,
      activeStock: totalStock,
      totalCustomers: uniqueCustomerEmails.size,
    }

    // 4. Fetch Returns requested for seller items
    const returns = await prisma.order.findMany({
      where: {
        status: { in: ["return_requested", "returned"] },
        items: {
          some: {
            productVariantId: { in: sellerVariantIds },
          },
        },
      },
      include: {
        items: {
          where: { productVariantId: { in: sellerVariantIds } },
          include: { productVariant: { include: { product: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    // 5. Fetch Reviews left for seller products
    const reviews = await prisma.review.findMany({
      where: {
        product: {
          sellerId: seller.id,
        },
      },
      include: {
        product: { select: { name: true, slug: true } },
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      seller: {
        id: seller.id,
        name: seller.name,
        email: seller.email,
        isVerified: seller.isVerified,
      },
      analytics,
      orders,
      inventory,
      returns,
      reviews,
    })
  } catch (error: any) {
    console.error("GET /api/seller/dashboard error:", error)
    return NextResponse.json({ error: "Internal server error compiled seller dashboard" }, { status: 500 })
  }
}
