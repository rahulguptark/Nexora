import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    const code = searchParams.get("code")

    if (!email || !code) {
      return NextResponse.json({ error: "Missing email or verification code" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.status === "active") {
      return NextResponse.json({ message: "Email is already verified and active" })
    }

    // Verify verification code
    const otp = await prisma.otp.findFirst({
      where: {
        userId: user.id,
        otpCodeHash: code,
        purpose: "email_verification",
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (!otp) {
      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 })
    }

    // Update user status and mark OTP as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { status: "active" },
      }),
      prisma.otp.update({
        where: { id: otp.id },
        data: { isUsed: true },
      }),
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "email_verification_success",
          tableName: "User",
          rowId: user.id,
        },
      }),
    ])

    return NextResponse.json({ success: true, message: "Email verified successfully. Account is now active." })
  } catch (error) {
    console.error("Email verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
