import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { checkCatalogWriteAccess } from "@/lib/auth"

// GET /api/admin/orders - Retrieve all orders for Admin console
export async function GET(req: NextRequest) {
  try {
    const adminUser = await checkCatalogWriteAccess(req)
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || undefined

    const orders = await prisma.order.findMany({
      where: status ? { status } : undefined,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        items: {
          include: {
            productVariant: { include: { product: true } },
          },
        },
        shipments: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      orders,
    })
  } catch (error: any) {
    console.error("GET /api/admin/orders error:", error)
    return NextResponse.json({ error: "Internal server error fetching admin orders" }, { status: 500 })
  }
}
