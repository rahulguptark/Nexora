import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyAccessJWT } from "@/lib/auth"

// Helper to resolve User ID from session
async function getUserIdFromSession(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null
  const decoded = await verifyAccessJWT(token)
  return decoded ? decoded.userId : null
}

// Get or Create Cart helper (Guest or Logged In)
export async function getOrCreateCart(req: NextRequest, resCookies: any): Promise<any> {
  const userId = await getUserIdFromSession(req)
  
  if (userId) {
    // Member Cart
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            productVariant: {
              include: {
                product: true,
                inventories: true,
              },
            },
          },
        },
      },
    })
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              productVariant: {
                include: {
                  product: true,
                  inventories: true,
                },
              },
            },
          },
        },
      })
    }
    return cart
  } else {
    // Guest Cart
    let guestCartId = req.cookies.get("guest_cart_id")?.value
    let cart = null

    if (guestCartId) {
      cart = await prisma.cart.findUnique({
        where: { id: guestCartId },
        include: {
          items: {
            include: {
              productVariant: {
                include: {
                  product: true,
                  inventories: true,
                },
              },
            },
          },
        },
      })
    }

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: null },
        include: {
          items: {
            include: {
              productVariant: {
                include: {
                  product: true,
                  inventories: true,
                },
              },
            },
          },
        },
      })
      resCookies.set("guest_cart_id", cart.id, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
      })
    }

    return cart
  }
}

// GET /api/catalog/cart
export async function GET(req: NextRequest) {
  try {
    const response = NextResponse.json({ success: true })
    const cart = await getOrCreateCart(req, response.cookies)

    let subtotal = 0
    let totalWeight = 0
    const activeItems: any[] = []
    const savedItems: any[] = []

    // 1. Process items and run Inventory Validations
    for (const item of cart.items) {
      const stock = item.productVariant.inventories.reduce((acc: number, inv: any) => acc + inv.quantityAvailable, 0)
      const hasInventoryError = stock < item.quantity
      const maxAvailable = stock

      const formattedItem = {
        id: item.id,
        quantity: item.quantity,
        isSavedForLater: item.isSavedForLater,
        hasInventoryError,
        maxAvailable,
        productVariant: {
          id: item.productVariant.id,
          sku: item.productVariant.sku,
          price: item.productVariant.price,
          compareAtPrice: item.productVariant.compareAtPrice,
          weightKg: item.productVariant.weightKg,
          attributes: item.productVariant.variantAttributes ? JSON.parse(item.productVariant.variantAttributes) : {},
          productName: item.productVariant.product.name,
          productSlug: item.productVariant.product.slug,
        },
      }

      if (item.isSavedForLater) {
        savedItems.push(formattedItem)
      } else {
        activeItems.push(formattedItem)
        // Only sum items with valid stock
        if (!hasInventoryError) {
          subtotal += item.productVariant.price * item.quantity
          totalWeight += item.productVariant.weightKg * item.quantity
        }
      }
    }

    // 2. Coupon Discount Calculation
    let couponDiscount = 0
    let couponDetails = null
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
        couponDetails = {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
        }
      }
    }

    const priceAfterCoupon = Math.max(0, subtotal - couponDiscount)

    // 3. Gift Card Calculation
    let giftCardApplied = 0
    let giftCardDetails = null
    if (cart.giftCardCode) {
      const giftCard = await prisma.giftCard.findUnique({
        where: { code: cart.giftCardCode, isActive: true },
      })
      if (giftCard && giftCard.balance > 0) {
        giftCardApplied = Math.min(giftCard.balance, priceAfterCoupon)
        giftCardDetails = {
          code: giftCard.code,
          balance: giftCard.balance,
        }
      }
    }

    const priceAfterGiftCard = Math.max(0, priceAfterCoupon - giftCardApplied)

    // 4. Shipping Estimation
    // Tiered shipping: weight-based, free shipping over $150
    let shippingEstimate = 0
    if (subtotal > 0 && subtotal < 150) {
      if (totalWeight < 1) {
        shippingEstimate = 5.00
      } else if (totalWeight <= 5) {
        shippingEstimate = 10.00
      } else {
        shippingEstimate = 20.00
      }
    }

    // 5. Tax Calculation (e.g. 8% sales tax)
    const taxRate = 0.08
    const taxEstimate = priceAfterCoupon * taxRate

    const total = priceAfterGiftCard + shippingEstimate + taxEstimate

    // Modify cookie header context directly
    const body = {
      success: true,
      cart: {
        id: cart.id,
        couponDetails,
        giftCardDetails,
        activeItems,
        savedItems,
        summary: {
          subtotal,
          couponDiscount,
          giftCardApplied,
          shippingEstimate,
          taxEstimate,
          total,
        },
      },
    }

    // Return combined headers response
    return new NextResponse(JSON.stringify(body), {
      status: 200,
      headers: response.headers,
    })
  } catch (error: any) {
    console.error("GET /api/catalog/cart error:", error)
    return NextResponse.json({ error: "Internal server error fetching cart" }, { status: 500 })
  }
}

// POST /api/catalog/cart - Add item to cart
export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json({ success: true })
    const cart = await getOrCreateCart(req, response.cookies)
    
    const body = await req.json()
    const { variantId, quantity = 1 } = body
    if (!variantId) {
      return NextResponse.json({ error: "Variant parameter required" }, { status: 400 })
    }

    // 1. Verify variant exists and validation stocks
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { inventories: true },
    })
    if (!variant) {
      return NextResponse.json({ error: "Product variant not found" }, { status: 404 })
    }

    const stockAvailable = variant.inventories.reduce((acc, inv) => acc + inv.quantityAvailable, 0)
    if (stockAvailable < quantity) {
      return NextResponse.json({ error: "Insufficient stock quantity available" }, { status: 409 })
    }

    // 2. Check if item already exists inside the active cart
    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productVariantId: variantId },
    })

    if (existingItem) {
      const newQty = existingItem.quantity + quantity
      if (stockAvailable < newQty) {
        return NextResponse.json({ error: "Adding this quantity exceeds available warehouse stocks" }, { status: 409 })
      }
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      })
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productVariantId: variantId,
          quantity,
        },
      })
    }

    return new NextResponse(JSON.stringify({ success: true, message: "Item added to cart successfully" }), {
      status: 201,
      headers: response.headers,
    })
  } catch (error: any) {
    console.error("POST /api/catalog/cart error:", error)
    return NextResponse.json({ error: "Internal server error adding cart item" }, { status: 500 })
  }
}

// PUT /api/catalog/cart - Update item quantity or save status
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { cartItemId, quantity, isSavedForLater } = body

    if (!cartItemId) {
      return NextResponse.json({ error: "cartItemId parameter is required" }, { status: 400 })
    }

    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { productVariant: { include: { inventories: true } } },
    })

    if (!cartItem) {
      return NextResponse.json({ error: "Cart item not found" }, { status: 404 })
    }

    const updateData: any = {}
    if (quantity !== undefined) {
      if (quantity <= 0) {
        // delete item if quantity drops to 0
        await prisma.cartItem.delete({ where: { id: cartItemId } })
        return NextResponse.json({ success: true, message: "Cart item removed" })
      }
      
      const stock = cartItem.productVariant.inventories.reduce((acc, inv) => acc + inv.quantityAvailable, 0)
      if (stock < quantity) {
        return NextResponse.json({ error: "Quantity requested exceeds available stock" }, { status: 409 })
      }
      updateData.quantity = quantity
    }

    if (isSavedForLater !== undefined) {
      updateData.isSavedForLater = isSavedForLater
    }

    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: updateData,
    })

    return NextResponse.json({ success: true, message: "Cart item updated successfully" })
  } catch (error: any) {
    console.error("PUT /api/catalog/cart error:", error)
    return NextResponse.json({ error: "Internal server error updating cart" }, { status: 500 })
  }
}

// DELETE /api/catalog/cart - Delete item
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const cartItemId = searchParams.get("cartItemId")

    if (!cartItemId) {
      return NextResponse.json({ error: "cartItemId parameter is required" }, { status: 400 })
    }

    await prisma.cartItem.delete({
      where: { id: cartItemId },
    })

    return NextResponse.json({ success: true, message: "Cart item removed successfully" })
  } catch (error: any) {
    console.error("DELETE /api/catalog/cart error:", error)
    return NextResponse.json({ error: "Internal server error deleting item" }, { status: 500 })
  }
}
