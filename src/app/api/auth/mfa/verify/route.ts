import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { OTP } from "otplib"
import prisma from "@/lib/prisma"
import { verifyAccessJWT } from "@/lib/auth"

const mfaVerifySchema = z.object({
  code: z.string(),
})

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

    const body = await req.json()
    const result = mfaVerifySchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid MFA code payload" }, { status: 400 })
    }

    const { code } = result.data

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!user || !user.mfaSecret) {
      return NextResponse.json({ error: "MFA setup has not been initiated" }, { status: 400 })
    }

    // Verify TOTP token
    const otp = new OTP()
    const isValid = otp.verifySync({
      token: code,
      secret: user.mfaSecret,
    }).valid

    if (!isValid) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 })
    }

    // Activate MFA permanently
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          isMfaEnabled: true,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "mfa_activation_success",
          tableName: "User",
          rowId: user.id,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: "Multi-factor authentication successfully enabled on your account.",
    })
  } catch (error) {
    console.error("MFA verify error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
