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
    if (!userId) {
      return NextResponse.json({ success: true, balance: 0, isGuest: true })
    }

    let wallet = await prisma.userWallet.findUnique({
      where: { userId },
    })

    if (!wallet) {
      // Seed wallet with $150.00 for testing checkouts
      wallet = await prisma.userWallet.create({
        data: {
          userId,
          balance: 150.00,
        },
      })
    }

    return NextResponse.json({
      success: true,
      balance: wallet.balance,
      isGuest: false,
    })
  } catch (error: any) {
    console.error("GET /api/catalog/checkout/wallet error:", error)
    return NextResponse.json({ error: "Internal server error fetching wallet" }, { status: 500 })
  }
}
