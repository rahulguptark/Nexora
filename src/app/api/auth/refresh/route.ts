import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyRefreshJWT, signAccessJWT, signRefreshJWT } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get("refresh_token")?.value

    if (!refreshToken) {
      return NextResponse.json({ error: "Refresh token missing" }, { status: 401 })
    }

    // Verify JWT
    const decoded = await verifyRefreshJWT(refreshToken)
    if (!decoded) {
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 })
    }

    // Lookup session in DB
    const session = await prisma.session.findUnique({
      where: { id: decoded.sessionId },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    })

    if (!session || session.isRevoked || new Date() > session.expiresAt) {
      return NextResponse.json({ error: "Session has expired or is revoked" }, { status: 401 })
    }

    // Optional reuse detection / hash consistency check
    if (session.refreshTokenHash !== refreshToken) {
      return NextResponse.json({ error: "Token mismatch or reuse detected" }, { status: 401 })
    }

    // Generate new credentials tokens
    const userRolesList = session.user.roles.map(ur => ur.role.name)
    const newAccessToken = await signAccessJWT({
      userId: session.user.id,
      email: session.user.email,
      roles: userRolesList,
    })

    const newRefreshToken = await signRefreshJWT({
      sessionId: session.id,
    })

    // Update Session token hash reference
    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newRefreshToken,
      },
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        roles: userRolesList,
      },
    })

    // Update cookies
    response.cookies.set({
      name: "access_token",
      value: newAccessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 15 * 60,
    })

    response.cookies.set({
      name: "refresh_token",
      value: newRefreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error("Refresh token error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
