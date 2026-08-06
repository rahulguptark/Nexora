import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getOrCreateCart } from "../route"

// Dynamic mock seeder inside endpoint to facilitate testing
async function seedCouponsAndGiftCardsIfEmpty() {
  const couponsCount = await prisma.coupon.count()
  if (couponsCount === 0) {
    await prisma.coupon.createMany({
      data: [
        { code: "SAVE20", discountType: "percentage", discountValue: 20 },
        { code: "SAVE10", discountType: "fixed", discountValue: 10 },
      ],
    })
  }

  const giftCardsCount = await prisma.giftCard.count()
  if (giftCardsCount === 0) {
    await prisma.giftCard.createMany({
      data: [
        { code: "GIFT50", balance: 50.00 },
        { code: "GIFT100", balance: 100.00 },
      ],
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    await seedCouponsAndGiftCardsIfEmpty()

    const response = NextResponse.json({ success: true })
    const cart = await getOrCreateCart(req, response.cookies)

    const body = await req.json()
    const { type, code } = body

    if (!type || !code) {
      return NextResponse.json({ error: "Type and Code parameters are required" }, { status: 400 })
    }

    const normalizedCode = code.trim().toUpperCase()

    if (type === "coupon") {
      // Find Coupon
      const coupon = await prisma.coupon.findUnique({
        where: { code: normalizedCode, isActive: true },
      })
      if (!coupon) {
        return NextResponse.json({ error: "Invalid or expired coupon code" }, { status: 404 })
      }
      
      // Check expiration
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return NextResponse.json({ error: "This coupon code has expired" }, { status: 410 })
      }

      await prisma.cart.update({
        where: { id: cart.id },
        data: { couponCode: normalizedCode },
      })

      return new NextResponse(JSON.stringify({ success: true, message: `Coupon code '${normalizedCode}' applied successfully!` }), {
        status: 200,
        headers: response.headers,
      })
    } else if (type === "giftcard") {
      // Find GiftCard
      const giftCard = await prisma.giftCard.findUnique({
        where: { code: normalizedCode, isActive: true },
      })
      if (!giftCard) {
        return NextResponse.json({ error: "Invalid or inactive gift card voucher code" }, { status: 404 })
      }

      if (giftCard.balance <= 0) {
        return NextResponse.json({ error: "This gift card voucher code has a zero balance" }, { status: 410 })
      }

      await prisma.cart.update({
        where: { id: cart.id },
        data: { giftCardCode: normalizedCode },
      })

      return new NextResponse(JSON.stringify({ success: true, message: `Gift Card '${normalizedCode}' applied successfully!` }), {
        status: 200,
        headers: response.headers,
      })
    } else {
      return NextResponse.json({ error: "Invalid discount type parameter (must be coupon or giftcard)" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("POST /api/catalog/cart/apply error:", error)
    return NextResponse.json({ error: "Internal server error applying code" }, { status: 500 })
  }
}
