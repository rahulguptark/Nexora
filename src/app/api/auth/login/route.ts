import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { OTP } from "otplib"
import prisma from "@/lib/prisma"
import { verifyPassword, signAccessJWT, signRefreshJWT } from "@/lib/auth"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  code: z.string().optional(), // for MFA verification
  rememberMe: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = loginSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: result.error.format() },
        { status: 400 }
      )
    }

    const { email, password, code, rememberMe } = result.data

    // Fetch user and roles
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
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    if (user.status === "suspended") {
      return NextResponse.json(
        { error: "This account has been suspended" },
        { status: 403 }
      )
    }

    // Verify Password
    const passwordMatch = await verifyPassword(password, user.passwordHash)
    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Check Multi-Factor Authentication
    if (user.isMfaEnabled) {
      if (!code) {
        // Prompt frontend to show MFA code verify layout
        return NextResponse.json({
          mfaRequired: true,
          userId: user.id,
          message: "Multi-factor authentication required",
        })
      }

      // Verify code
      const otp = new OTP()
      const isValidMfa = otp.verifySync({
        token: code,
        secret: user.mfaSecret || "",
      }).valid

      if (!isValidMfa) {
        return NextResponse.json({ error: "Invalid MFA code" }, { status: 401 })
      }
    }

    // Capture browser session info
    const userAgent = req.headers.get("user-agent") || "unknown"
    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1"

    // Create session in SQLite DB
    const expiresAt = new Date(
      Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000 // 30 days or 1 day
    )

    // Generate session instance first (temp hash placeholder)
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: "TEMP_HASH_" + Math.random().toString(36).substring(2),
        ipAddress,
        userAgent,
        expiresAt,
      },
    })

    // Generate tokens
    const userRolesList = user.roles.map(ur => ur.role.name)
    const accessToken = await signAccessJWT({
      userId: user.id,
      email: user.email,
      roles: userRolesList,
    })

    const refreshToken = await signRefreshJWT({
      sessionId: session.id,
    })

    // Update session record with the actual generated token hash reference
    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: refreshToken, // using token value directly for verification simplicity
      },
    })

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: userRolesList,
        isMfaEnabled: user.isMfaEnabled,
      },
    })

    // Set Access Token cookie (Session lifetime)
    response.cookies.set({
      name: "access_token",
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 15 * 60, // 15 mins
    })

    // Set Refresh Token cookie
    response.cookies.set({
      name: "refresh_token",
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60, // 30 days or 1 day
    })

    // Log login audit event
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "user_login",
        tableName: "User",
        rowId: user.id,
        ipAddress,
      },
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Internal server error during login" },
      { status: 500 }
    )
  }
}
