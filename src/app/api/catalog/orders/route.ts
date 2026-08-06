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
    const guestEmail = searchParams.get("email") || ""

    let orders: any[] = []

    if (userId) {
      // Logged-in user orders
      orders = await prisma.order.findMany({
        where: { userId },
        include: {
          items: { include: { productVariant: { include: { product: true } } } },
          shipments: true,
        },
        orderBy: { createdAt: "desc" },
      })
    } else if (guestEmail.trim()) {
      // Guest orders matching email query parameter
      orders = await prisma.order.findMany({
        where: { email: guestEmail.trim(), userId: null },
        include: {
          items: { include: { productVariant: { include: { product: true } } } },
          shipments: true,
        },
        orderBy: { createdAt: "desc" },
      })
    }

    // Load customer notifications
    let notifications: any[] = []
    if (userId) {
      notifications = await prisma.orderNotification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    } else if (guestEmail.trim()) {
      notifications = await prisma.orderNotification.findMany({
        where: { email: guestEmail.trim(), userId: null },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    }

    return NextResponse.json({
      success: true,
      orders,
      notifications,
    })
  } catch (error: any) {
    console.error("GET /api/catalog/orders error:", error)
    return NextResponse.json({ error: "Internal server error fetching orders" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserIdFromSession(req)
    const body = await req.json()
    const { orderId, action } = body

    if (!orderId || !action) {
      return NextResponse.json({ error: "orderId and action are required parameters" }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { productVariant: { include: { inventories: true } } } } },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Verify ownership
    if (userId && order.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized access to this order reference" }, { status: 403 })
    }

    const createAlertNotification = async (title: string, message: string) => {
      await prisma.orderNotification.create({
        data: {
          userId: order.userId,
          email: order.email,
          orderId: order.id,
          title,
          message,
        },
      })
    }

    if (action === "cancel") {
      // Cancellation only allowed if order is in processing state
      if (order.status !== "processing") {
        return NextResponse.json({ error: "Order has already been dispatched or processed and cannot be cancelled." }, { status: 409 })
      }

      await prisma.$transaction(async (tx) => {
        // Refund back to wallet if paid
        if (order.paymentStatus === "paid" && order.userId) {
          await tx.userWallet.upsert({
            where: { userId: order.userId },
            update: { balance: { increment: order.total } },
            create: { userId: order.userId, balance: order.total },
          })
        }

        // Restore inventories
        for (const item of order.items) {
          const primaryInventory = item.productVariant.inventories[0]
          if (primaryInventory) {
            await tx.inventory.update({
              where: { id: primaryInventory.id },
              data: { quantityAvailable: { increment: item.quantity } },
            })
          }
        }

        // Update Order
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: "cancelled",
            paymentStatus: order.paymentStatus === "paid" ? "refunded" : "cancelled",
          },
        })
      })

      await createAlertNotification(
        "Self-Service Cancellation",
        `You have successfully cancelled order #${order.id}.`
      )

      return NextResponse.json({ success: true, message: "Order cancelled successfully." })
    }

    if (action === "return") {
      // Returns only allowed for delivered orders
      if (order.status !== "delivered") {
        return NextResponse.json({ error: "Returns are only permitted for delivered items." }, { status: 409 })
      }

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status: "return_requested" },
      })

      await createAlertNotification(
        "Return Requested",
        `A return request has been submitted for order #${order.id}. Please wait for admin approval.`
      )

      return NextResponse.json({ success: true, message: "Return requested successfully." })
    }

    return NextResponse.json({ error: "Invalid action parameter" }, { status: 400 })
  } catch (error: any) {
    console.error("PUT /api/catalog/orders error:", error)
    return NextResponse.json({ error: "Internal server error submitting request" }, { status: 500 })
  }
}
