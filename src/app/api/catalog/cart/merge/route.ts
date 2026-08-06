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
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Login required to merge carts." }, { status: 401 })
    }

    const guestCartId = req.cookies.get("guest_cart_id")?.value
    if (!guestCartId) {
      return NextResponse.json({ success: true, message: "No guest cart to merge." })
    }

    const guestCart = await prisma.cart.findUnique({
      where: { id: guestCartId },
      include: { items: true },
    })

    if (!guestCart || guestCart.items.length === 0) {
      // Clear cookie since it is empty or invalid
      const response = NextResponse.json({ success: true, message: "Guest cart empty. Cookie cleared." })
      response.cookies.delete("guest_cart_id")
      return response
    }

    // Find or create User's member cart
    let userCart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    })

    if (!userCart) {
      userCart = await prisma.cart.create({
        data: { userId },
        include: { items: true },
      })
    }

    // Merge items transactionally
    await prisma.$transaction(async (tx) => {
      for (const guestItem of guestCart.items) {
        const matchingUserItem = userCart.items.find(
          (ui) => ui.productVariantId === guestItem.productVariantId
        )

        if (matchingUserItem) {
          // Combine quantities
          const combinedQty = matchingUserItem.quantity + guestItem.quantity
          
          // Verify stock limit
          const variant = await tx.productVariant.findUnique({
            where: { id: guestItem.productVariantId },
            include: { inventories: true },
          })
          const stock = variant
            ? variant.inventories.reduce((acc, inv) => acc + inv.quantityAvailable, 0)
            : 0
          
          const finalQty = Math.min(combinedQty, stock > 0 ? stock : combinedQty)

          await tx.cartItem.update({
            where: { id: matchingUserItem.id },
            data: { quantity: finalQty },
          })

          // Delete duplicate guest item
          await tx.cartItem.delete({
            where: { id: guestItem.id },
          })
        } else {
          // Relink guest item to user cart container
          await tx.cartItem.update({
            where: { id: guestItem.id },
            data: { cartId: userCart.id },
          })
        }
      }

      // If coupons or gift cards are linked to guest cart, move them if none are on user cart yet
      const updateData: any = {}
      if (!userCart.couponCode && guestCart.couponCode) {
        updateData.couponCode = guestCart.couponCode
      }
      if (!userCart.giftCardCode && guestCart.giftCardCode) {
        updateData.giftCardCode = guestCart.giftCardCode
      }

      if (Object.keys(updateData).length > 0) {
        await tx.cart.update({
          where: { id: userCart.id },
          data: updateData,
        })
      }

      // Delete empty guest cart container
      await tx.cart.delete({
        where: { id: guestCart.id },
      })
    })

    const response = NextResponse.json({ success: true, message: "Cart successfully merged!" })
    response.cookies.delete("guest_cart_id")
    return response
  } catch (error: any) {
    console.error("POST /api/catalog/cart/merge error:", error)
    return NextResponse.json({ error: "Internal server error merging carts" }, { status: 500 })
  }
}
