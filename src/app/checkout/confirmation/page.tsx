import React from "react"
import prisma from "@/lib/prisma"
import ConfirmationClient from "./ConfirmationClient"

export default async function OrderConfirmationPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ orderId?: string }> 
}) {
  const { orderId } = await searchParams

  if (!orderId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-zinc-550 dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Invalid Reference</h1>
          <p className="mt-2 text-sm text-zinc-400">Order ID parameter is missing.</p>
        </div>
      </div>
    )
  }

  // Fetch Order details with items
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          productVariant: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  })

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-zinc-550 dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Order Not Found</h1>
          <p className="mt-2 text-sm text-zinc-400">We could not locate order reference code '{orderId}'.</p>
        </div>
      </div>
    )
  }

  // Parse address fields
  let shippingAddr = null
  let billingAddr = null

  try {
    shippingAddr = typeof order.shippingAddress === "string" ? JSON.parse(order.shippingAddress) : order.shippingAddress
    billingAddr = typeof order.billingAddress === "string" ? JSON.parse(order.billingAddress) : order.billingAddress
  } catch (err) {
    shippingAddr = { street: order.shippingAddress }
    billingAddr = { street: order.billingAddress }
  }

  const formattedOrder = {
    id: order.id,
    email: order.email,
    shippingAddress: shippingAddr,
    billingAddress: billingAddr,
    shippingMethod: order.shippingMethod,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paymentIntentId: order.paymentIntentId,
    subtotal: order.subtotal,
    discount: order.discount,
    shippingFee: order.shippingFee,
    tax: order.tax,
    walletAmountUsed: order.walletAmountUsed,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    items: order.items.map(item => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      sku: item.productVariant.sku,
      productName: item.productVariant.product.name,
    })),
  }

  return (
    <ConfirmationClient order={formattedOrder} />
  )
}
