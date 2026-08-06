import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { checkCatalogWriteAccess } from "@/lib/auth"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminUser = await checkCatalogWriteAccess(req)
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const body = await req.json()
    const { carrier, trackingNumber, itemIds } = body

    if (!carrier || !trackingNumber || !itemIds || itemIds.length === 0) {
      return NextResponse.json({ error: "Missing required parameters: carrier, trackingNumber, itemIds" }, { status: 400 })
    }

    // Process shipment creation and relink items transactionally
    const shipment = await prisma.$transaction(async (tx) => {
      const newShipment = await tx.orderShipment.create({
        data: {
          orderId: id,
          carrier,
          trackingNumber,
          status: "shipped",
        },
      })

      for (const itemId of itemIds) {
        await tx.orderItem.update({
          where: { id: itemId },
          data: { shipmentId: newShipment.id },
        })
      }

      return newShipment
    })

    // Log notification
    await prisma.orderNotification.create({
      data: {
        userId: order.userId,
        email: order.email,
        orderId: order.id,
        title: "Shipment Dispatched (Split Order)",
        message: `Items from your order #${order.id} have been shipped via ${carrier}. Tracking: ${trackingNumber}`,
      },
    })

    return NextResponse.json({
      success: true,
      shipment,
    })
  } catch (error: any) {
    console.error("POST /api/admin/orders/[id]/shipments error:", error)
    return NextResponse.json({ error: "Internal server error during split shipment" }, { status: 500 })
  }
}
