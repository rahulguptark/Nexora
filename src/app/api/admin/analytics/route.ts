import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { checkCatalogWriteAccess } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const adminUser = await checkCatalogWriteAccess(req)
    if (!adminUser || (!adminUser.roles.includes("admin") && !adminUser.roles.includes("super_admin"))) {
      return NextResponse.json({ error: "Forbidden. Admin role required." }, { status: 403 })
    }

    // 1. Fetch Orders details to calculate Revenue & AOV
    const orders = await prisma.order.findMany({
      select: { id: true, total: true, createdAt: true, status: true },
    })

    const totalOrdersCount = orders.length
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
    const averageOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0

    // Group sales over time (last 7 days simple mock mapping)
    const salesOverTime = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date()
      d.setDate(d.getDate() - idx)
      const dayStr = d.toLocaleDateString("en-US", { weekday: "short" })
      
      const dayOrders = orders.filter(o => {
        const oDate = new Date(o.createdAt)
        return oDate.toDateString() === d.toDateString()
      })
      const daySales = dayOrders.reduce((sum, o) => sum + o.total, 0)

      return {
        day: dayStr,
        sales: daySales,
        orders: dayOrders.length,
      }
    }).reverse()

    // 2. Conversion Funnel Calculations
    const totalCatalogVisits = await prisma.pageVisit.count({
      where: {
        path: { in: ["/", "/search"] },
      },
    })
    const totalCartViews = await prisma.pageVisit.count({
      where: {
        path: "/cart",
      },
    })
    const totalCheckoutViews = await prisma.pageVisit.count({
      where: {
        path: "/checkout",
      },
    })
    const completedOrders = await prisma.order.count()

    const conversionFunnel = {
      visits: totalCatalogVisits || 10, // Avoid 0 division in math previews
      cartAdds: totalCartViews || 5,
      checkouts: totalCheckoutViews || 2,
      orders: completedOrders || 1,
    }

    // 3. Traffic statistics (visits grouped by path)
    const visits = await prisma.pageVisit.findMany({
      select: { path: true },
    })

    const trafficMap: Record<string, number> = {}
    visits.forEach(v => {
      trafficMap[v.path] = (trafficMap[v.path] || 0) + 1
    })

    const trafficLogs = Object.keys(trafficMap).map(path => ({
      path,
      count: trafficMap[path],
    })).sort((a, b) => b.count - a.count)

    // 4. Click Heatmap coordinates list
    const clickLogs = await prisma.clickLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json({
      success: true,
      sales: {
        totalRevenue,
        totalOrdersCount,
        averageOrderValue,
        salesOverTime,
      },
      conversionFunnel,
      trafficLogs,
      clickLogs,
    })
  } catch (error: any) {
    console.error("GET /api/admin/analytics error:", error)
    return NextResponse.json({ error: "Internal server error fetching analytics details" }, { status: 500 })
  }
}
