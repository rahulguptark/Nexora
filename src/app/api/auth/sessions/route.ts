import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyAccessJWT, verifyRefreshJWT } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get("access_token")?.value
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = await verifyAccessJWT(accessToken)
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Determine current session ID from refresh token cookie
    const refreshToken = req.cookies.get("refresh_token")?.value
    let currentSessionId = ""
    if (refreshToken) {
      const decodedRefresh = await verifyRefreshJWT(refreshToken)
      if (decodedRefresh) {
        currentSessionId = decodedRefresh.sessionId
      }
    }

    // Retrieve active sessions
    const sessions = await prisma.session.findMany({
      where: {
        userId: decoded.userId,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const formattedSessions = sessions.map(session => ({
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: session.id === currentSessionId,
    }))

    return NextResponse.json({
      success: true,
      sessions: formattedSessions,
    })
  } catch (error) {
    console.error("Fetch sessions error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
