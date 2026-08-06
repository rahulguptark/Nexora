import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyAccessJWT } from "@/lib/auth"

async function getUserIdFromSession(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null
  const decoded = await verifyAccessJWT(token)
  return decoded ? decoded.userId : null
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromSession(req)
    
    // Resolve Cart
    let cart = null
    const guestCartId = req.cookies.get("guest_cart_id")?.value
    
    if (userId) {
      cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            where: { isSavedForLater: false },
            include: { productVariant: { include: { product: true, inventories: true } } },
          },
        },
      })
    } else if (guestCartId) {
      cart = await prisma.cart.findUnique({
        where: { id: guestCartId },
        include: {
          items: {
            where: { isSavedForLater: false },
            include: { productVariant: { include: { product: true, inventories: true } } },
          },
        },
      })
    }

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Your active checkout cart is empty" }, { status: 400 })
    }

    // Extract checkout parameters
    const body = await req.json()
    const {
      email,
      shippingAddress,
      billingAddress,
      shippingMethod = "standard",
      paymentMethod = "cod",
      useWallet = false,
    } = body

    if (!email || !shippingAddress || !billingAddress) {
      return NextResponse.json({ error: "Missing required parameters: email, shippingAddress, billingAddress" }, { status: 400 })
    }

    // 1. Inventory Validation Check
    for (const item of cart.items) {
      const stock = item.productVariant.inventories.reduce((acc, inv) => acc + inv.quantityAvailable, 0)
      if (stock < item.quantity) {
        return NextResponse.json({
          error: `Insufficient stock for variant SKU '${item.productVariant.sku}'. Please adjust your cart.`,
        }, { status: 409 })
      }
    }

    // 2. Pricing Calculations
    let subtotal = 0
    let totalWeight = 0
    cart.items.forEach(item => {
      subtotal += item.productVariant.price * item.quantity
      totalWeight += item.productVariant.weightKg * item.quantity
    })

    // Coupon Discount
    let couponDiscount = 0
    if (cart.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: cart.couponCode, isActive: true },
      })
      if (coupon) {
        if (coupon.discountType === "percentage") {
          couponDiscount = subtotal * (coupon.discountValue / 100)
        } else if (coupon.discountType === "fixed") {
          couponDiscount = Math.min(coupon.discountValue, subtotal)
        }
      }
    }

    const priceAfterCoupon = Math.max(0, subtotal - couponDiscount)

    // Gift Card Discount
    let giftCardApplied = 0
    if (cart.giftCardCode) {
      const giftCard = await prisma.giftCard.findUnique({
        where: { code: cart.giftCardCode, isActive: true },
      })
      if (giftCard && giftCard.balance > 0) {
        giftCardApplied = Math.min(giftCard.balance, priceAfterCoupon)
      }
    }

    const priceAfterGiftCard = Math.max(0, priceAfterCoupon - giftCardApplied)

    // Shipping Estimation
    let shippingFee = 0
    if (subtotal > 0 && subtotal < 150) {
      if (totalWeight < 1) {
        shippingFee = 5.00
      } else if (totalWeight <= 5) {
        shippingFee = 10.00
      } else {
        shippingFee = 20.00
      }
    }
    // Express premium surcharge
    if (shippingMethod === "express") {
      shippingFee += 15.00
    }

    // Tax estimation (8%)
    const taxRate = 0.08
    const tax = priceAfterCoupon * taxRate

    const orderTotalBeforeWallet = priceAfterGiftCard + shippingFee + tax

    // 3. Wallet deduction logic
    let walletAmountUsed = 0
    if (useWallet && userId) {
      const wallet = await prisma.userWallet.findUnique({
        where: { userId },
      })
      if (wallet && wallet.balance > 0) {
        walletAmountUsed = Math.min(wallet.balance, orderTotalBeforeWallet)
      }
    }

    const finalOrderTotal = Math.max(0, orderTotalBeforeWallet - walletAmountUsed)

    // 4. Payment Integrations Process (Mock)
    let paymentStatus = "pending"
    let paymentIntentId = null

    if (finalOrderTotal === 0) {
      paymentStatus = "paid"
      paymentIntentId = "wallet_full_coverage"
    } else {
      if (paymentMethod === "stripe") {
        paymentStatus = "paid"
        paymentIntentId = "ch_stripe_" + Math.random().toString(36).substring(2, 10)
      } else if (paymentMethod === "paypal") {
        paymentStatus = "paid"
        paymentIntentId = "ch_paypal_" + Math.random().toString(36).substring(2, 10)
      } else if (paymentMethod === "razorpay") {
        paymentStatus = "paid"
        paymentIntentId = "ch_razor_" + Math.random().toString(36).substring(2, 10)
      } else if (paymentMethod === "wallet") {
        paymentStatus = "paid"
        paymentIntentId = "ch_wallet_" + Math.random().toString(36).substring(2, 10)
      } else {
        paymentStatus = "pending" // COD payment collects at delivery
      }
    }

    // 5. Transaction Database Placement
    const order = await prisma.$transaction(async (tx) => {
      // Create Order
      const newOrder = await tx.order.create({
        data: {
          userId,
          email,
          shippingAddress: typeof shippingAddress === "object" ? JSON.stringify(shippingAddress) : shippingAddress,
          billingAddress: typeof billingAddress === "object" ? JSON.stringify(billingAddress) : billingAddress,
          shippingMethod,
          paymentMethod,
          paymentStatus,
          paymentIntentId,
          subtotal,
          discount: couponDiscount + giftCardApplied,
          shippingFee,
          tax,
          walletAmountUsed,
          total: finalOrderTotal,
          status: "processing",
        },
      })

      // Create OrderItems & decrement stock levels
      for (const item of cart.items) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productVariantId: item.productVariantId,
            quantity: item.quantity,
            price: item.productVariant.price,
          },
        })

        // Find primary inventory allocate and decrement stock levels
        const primaryInventory = item.productVariant.inventories[0]
        if (primaryInventory) {
          await tx.inventory.update({
            where: { id: primaryInventory.id },
            data: {
              quantityAvailable: {
                decrement: item.quantity,
              },
            },
          })
        }
      }

      // Decrement Wallet balance if applicable
      if (walletAmountUsed > 0 && userId) {
        await tx.userWallet.update({
          where: { userId },
          data: {
            balance: {
              decrement: walletAmountUsed,
            },
          },
        })
      }

      // If gift card was applied, decrement gift card balance
      if (giftCardApplied > 0 && cart.giftCardCode) {
        await tx.giftCard.update({
          where: { code: cart.giftCardCode },
          data: {
            balance: {
              decrement: giftCardApplied,
            },
          },
        })
      }

      // Clear active checked-out items from Cart
      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
          isSavedForLater: false,
        },
      })

      // Reset coupon/giftcard on cart container
      await tx.cart.update({
        where: { id: cart.id },
        data: {
          couponCode: null,
          giftCardCode: null,
        },
      })

      return newOrder
    })

    const response = NextResponse.json({
      success: true,
      orderId: order.id,
      message: "Order placed successfully!",
    })
    
    // Clear guest cart cookie on successful checkout
    if (!userId) {
      response.cookies.delete("guest_cart_id")
    }

    return response
  } catch (error: any) {
    console.error("POST /api/catalog/checkout error:", error)
    return NextResponse.json({ error: "Internal server error during order placement" }, { status: 500 })
  }
}
