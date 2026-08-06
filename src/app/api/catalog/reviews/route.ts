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
      return NextResponse.json({ error: "Unauthorized. Login required to submit a product review." }, { status: 401 })
    }

    const body = await req.json()
    const { productId, rating, comment } = body

    if (!productId || !rating) {
      return NextResponse.json({ error: "productId and rating parameters are required" }, { status: 400 })
    }

    const numericRating = parseInt(rating, 10)
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return NextResponse.json({ error: "Rating value must be an integer between 1 and 5" }, { status: 400 })
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const review = await prisma.review.create({
      data: {
        productId,
        userId,
        rating: numericRating,
        comment: comment || null,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Feedback review submitted successfully!",
      review,
    }, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/catalog/reviews error:", error)
    return NextResponse.json({ error: "Internal server error submitting review" }, { status: 500 })
  }
}
