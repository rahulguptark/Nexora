import { NextRequest, NextResponse } from "next/server"
import { OTP } from "otplib"
import prisma from "@/lib/prisma"
import { verifyAccessJWT } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get("access_token")?.value
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = await verifyAccessJWT(accessToken)
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Generate dynamic TOTP secret
    const otp = new OTP()
    const secret = otp.generateSecret()
    const otpauthUrl = otp.generateURI({ secret, label: user.email, issuer: "Nexora ECommerce" })

    // Temporarily save pending secret in DB (we don't activate isMfaEnabled until first success validation)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaSecret: secret,
      },
    })

    // Simulated QR code rendering (using a public chart API as a proxy for client scanning)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`

    return NextResponse.json({
      success: true,
      secret,
      qrCodeUrl,
      otpauthUrl,
    })
  } catch (error) {
    console.error("MFA setup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
