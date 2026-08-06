import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { checkCatalogWriteAccess } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const adminUser = await checkCatalogWriteAccess(req)
    if (!adminUser || (!adminUser.roles.includes("admin") && !adminUser.roles.includes("super_admin"))) {
      return NextResponse.json({ error: "Forbidden. Admin role required." }, { status: 403 })
    }

    // 1. Fetch systemConfig or seed it
    let systemConfig = await prisma.systemConfig.findUnique({
      where: { id: "primary_config" },
    })

    if (!systemConfig) {
      systemConfig = await prisma.systemConfig.create({
        data: {
          guestCheckoutEnabled: true,
          walletPaymentEnabled: true,
          couponValidationEnabled: true,
          maintenanceMode: false,
          homepageBanners: JSON.stringify([
            { id: "slide-1", title: "Eco Summer Sale", imageUrl: "/images/slide-eco.jpg" },
            { id: "slide-2", title: "Zero Waste Living", imageUrl: "/images/slide-waste.jpg" },
          ]),
        },
      })
    }

    // 2. Platform aggregates
    const totalUsers = await prisma.user.count()
    const totalSellers = await prisma.seller.count()
    const totalOrders = await prisma.order.count()

    const paidOrders = await prisma.order.findMany({
      where: { paymentStatus: "paid" },
      select: { total: true },
    })
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0)

    // 3. Low stock alerts (quantityAvailable < 10)
    const lowStockInventories = await prisma.inventory.findMany({
      where: { quantityAvailable: { lt: 10 } },
      include: {
        productVariant: {
          include: { product: true },
        },
      },
      take: 20,
    })

    const lowStockAlerts = lowStockInventories.map(inv => ({
      variantId: inv.productVariantId,
      sku: inv.productVariant.sku,
      productName: inv.productVariant.product.name,
      stock: inv.quantityAvailable,
    }))

    // 4. Users list
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        createdAt: true,
        roles: { select: { role: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    })

    // 5. Sellers list
    const sellers = await prisma.seller.findMany({
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      analytics: {
        totalUsers,
        totalSellers,
        totalOrders,
        totalRevenue,
        lowStockAlerts,
      },
      systemConfig,
      users: users.map(u => ({
        ...u,
        roles: u.roles.map(r => r.role.name),
      })),
      sellers,
    })
  } catch (error: any) {
    console.error("GET /api/admin/dashboard error:", error)
    return NextResponse.json({ error: "Internal server error compiled admin dashboard details" }, { status: 500 })
  }
}
