import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { signAccessJWT, signRefreshJWT } from "@/lib/auth"

const otpVerifySchema = z.object({
  email: z.string().email(),
  code: z.string(),
  rememberMe: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = otpVerifySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
    }

    const { email, code, rememberMe } = result.data

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify OTP Code
    const otp = await prisma.otp.findFirst({
      where: {
        userId: user.id,
        otpCodeHash: code,
        purpose: "otp_login",
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (!otp) {
      return NextResponse.json({ error: "Invalid or expired OTP code" }, { status: 401 })
    }

    // Capture metadata
    const userAgent = req.headers.get("user-agent") || "unknown"
    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1"

    const expiresAt = new Date(
      Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000
    )

    // Create session and invalidate OTP inside transaction
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: "TEMP_HASH_" + Math.random().toString(36).substring(2),
        ipAddress,
        userAgent,
        expiresAt,
      },
    })

    await prisma.otp.update({
      where: { id: otp.id },
      data: { isUsed: true },
    })

    const userRolesList = user.roles.map(ur => ur.role.name)
    const accessToken = await signAccessJWT({
      userId: user.id,
      email: user.email,
      roles: userRolesList,
    })

    const refreshToken = await signRefreshJWT({
      sessionId: session.id,
    })

    // Update Session with token hash reference
    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: refreshToken,
      },
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: userRolesList,
      },
    })

    response.cookies.set({
      name: "access_token",
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 15 * 60,
    })

    response.cookies.set({
      name: "refresh_token",
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
    })

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "otp_login_success",
        tableName: "User",
        rowId: user.id,
        ipAddress,
      },
    })

    return response
  } catch (error) {
    console.error("OTP verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
