import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyRefreshJWT } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get("refresh_token")?.value

    if (refreshToken) {
      // Decode and invalidate session record in database
      const decoded = await verifyRefreshJWT(refreshToken)
      if (decoded) {
        await prisma.session.updateMany({
          where: {
            id: decoded.sessionId,
            isRevoked: false,
          },
          data: {
            isRevoked: true,
          },
        })
      }
    }

    const response = NextResponse.json({
      success: true,
      message: "Successfully logged out",
    })

    // Delete cookies
    response.cookies.set({
      name: "access_token",
      value: "",
      httpOnly: true,
      path: "/",
      expires: new Date(0),
    })

    response.cookies.set({
      name: "refresh_token",
      value: "",
      httpOnly: true,
      path: "/",
      expires: new Date(0),
    })

    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Internal server error during logout" }, { status: 500 })
  }
}
