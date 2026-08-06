import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { verifyAccessJWT } from "@/lib/auth"

const revokeSchema = z.object({
  sessionId: z.string(),
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
    const result = revokeSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }

    const { sessionId } = result.data

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    })

    if (!session || session.userId !== decoded.userId) {
      return NextResponse.json({ error: "Session not found or forbidden" }, { status: 404 })
    }

    await prisma.$transaction([
      prisma.session.update({
        where: { id: sessionId },
        data: {
          isRevoked: true,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: decoded.userId,
          action: "session_revoke_success",
          tableName: "Session",
          rowId: sessionId,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: "Session successfully revoked.",
    })
  } catch (error) {
    console.error("Revoke session error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
