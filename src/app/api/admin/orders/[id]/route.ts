import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { checkCatalogWriteAccess } from "@/lib/auth"

export async function GET(
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
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        items: {
          include: {
            productVariant: { include: { product: true } },
          },
        },
        shipments: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Fetch associated notifications
    const notifications = await prisma.orderNotification.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      order,
      notifications,
    })
  } catch (error: any) {
    console.error("GET /api/admin/orders/[id] error:", error)
    return NextResponse.json({ error: "Internal server error fetching order" }, { status: 500 })
  }
}

export async function PUT(
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
      include: { items: { include: { productVariant: { include: { inventories: true } } } } },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const body = await req.json()
    const { action, status, carrier, trackingNumber, refundItemIds, refundAmount } = body

    // Helper to send alert notification log
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

    if (action === "update_status" && status) {
      const updatedOrder = await prisma.order.update({
        where: { id },
        data: { status },
      })

      await createAlertNotification(
        `Order Status Updated: ${status.toUpperCase()}`,
        `Your order #${order.id} status has been updated to ${status}.`
      )

      return NextResponse.json({ success: true, order: updatedOrder })
    }

    if (action === "cancel") {
      if (order.status === "cancelled") {
        return NextResponse.json({ error: "Order is already cancelled" }, { status: 409 })
      }

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Refund back to user's wallet if paid
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
          where: { id },
          data: {
            status: "cancelled",
            paymentStatus: order.paymentStatus === "paid" ? "refunded" : "cancelled",
          },
        })
      })

      await createAlertNotification(
        "Order Cancelled",
        `Your order #${order.id} has been cancelled. Funds have been refunded to your wallet.`
      )

      return NextResponse.json({ success: true, message: "Order cancelled successfully and inventories restored." })
    }

    if (action === "refund") {
      // 1. Partial Refund (by item ids)
      if (refundItemIds && refundItemIds.length > 0) {
        let refundSum = 0
        const itemsToRefund = order.items.filter(item => refundItemIds.includes(item.id))

        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          for (const item of itemsToRefund) {
            refundSum += item.price * item.quantity
            
            // Restore inventory
            const primaryInventory = item.productVariant.inventories[0]
            if (primaryInventory) {
              await tx.inventory.update({
                where: { id: primaryInventory.id },
                data: { quantityAvailable: { increment: item.quantity } },
              })
            }
          }

          if (order.userId && refundSum > 0) {
            await tx.userWallet.upsert({
              where: { userId: order.userId },
              update: { balance: { increment: refundSum } },
              create: { userId: order.userId, balance: refundSum },
            })
          }

          // Mark payment status as partially refunded
          await tx.order.update({
            where: { id },
            data: {
              paymentStatus: "partially_refunded",
              discount: { increment: refundSum },
              total: { decrement: refundSum },
            },
          })
        })

        await createAlertNotification(
          "Partial Refund Issued",
          `A partial refund of $${refundSum.toFixed(2)} has been issued for order #${order.id}.`
        )

        return NextResponse.json({ success: true, message: `Partial refund of $${refundSum.toFixed(2)} issued.` })
      }

      // 2. Full Refund
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        if (order.userId) {
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

        await tx.order.update({
          where: { id },
          data: {
            status: "cancelled",
            paymentStatus: "refunded",
            total: 0,
          },
        })
      })

      await createAlertNotification(
        "Full Refund Issued",
        `A full refund of $${order.total.toFixed(2)} has been issued for order #${order.id}.`
      )

      return NextResponse.json({ success: true, message: "Full refund processed and order set to cancelled." })
    }

    return NextResponse.json({ error: "Invalid action parameter" }, { status: 400 })
  } catch (error: any) {
    console.error("PUT /api/admin/orders/[id] error:", error)
    return NextResponse.json({ error: "Internal server error updating order" }, { status: 500 })
  }
}
