import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { signAccessJWT, signRefreshJWT } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")

    if (!code) {
      return NextResponse.json({ error: "Missing authorization code" }, { status: 400 })
    }

    // Mock Google Profile details associated with code
    const googleProfile = {
      email: "oauth.user@gmail.com",
      firstName: "Alex",
      lastName: "Google",
    }

    // Ensure 'customer' role exists
    let customerRole = await prisma.role.findUnique({
      where: { name: "customer" },
    })
    if (!customerRole) {
      customerRole = await prisma.role.create({
        data: {
          name: "customer",
          description: "Default customer role",
        },
      })
    }

    // Find or Upsert user (Google auth accounts are marked active instantly)
    let user = await prisma.user.findUnique({
      where: { email: googleProfile.email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: googleProfile.email,
          passwordHash: "OAUTH_PASSWORDLESS_" + Math.random().toString(36),
          firstName: googleProfile.firstName,
          lastName: googleProfile.lastName,
          status: "active",
          roles: {
            create: {
              roleId: customerRole.id,
            },
          },
          preferences: {
            create: {
              emailTransactional: true,
              emailMarketing: false,
              smsAlerts: true,
              pushNotifications: true,
            },
          },
        },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      })
    }

    // Capture metadata
    const userAgent = req.headers.get("user-agent") || "unknown"
    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1"

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Create login session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: "TEMP_HASH_" + Math.random().toString(36).substring(2),
        ipAddress,
        userAgent,
        expiresAt,
      },
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

    // Sync refresh hash in DB
    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: refreshToken,
      },
    })

    // Log login audit event
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "oauth_google_login_success",
        tableName: "User",
        rowId: user.id,
        ipAddress,
      },
    })

    // Setup redirect back to client dashboard
    const dashboardUrl = new URL("/dashboard", req.url)
    const response = NextResponse.redirect(dashboardUrl)

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
      maxAge: 30 * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error("Google OAuth callback error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
