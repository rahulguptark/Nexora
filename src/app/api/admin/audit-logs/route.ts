import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyAccessJWT } from "@/lib/auth"

async function checkAdminAccess(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null

  const decoded = await verifyAccessJWT(token)
  if (!decoded) return null

  const hasAccess = decoded.roles.includes("admin") || decoded.roles.includes("super_admin")
  return hasAccess ? decoded : null
}

export async function GET(req: NextRequest) {
  try {
    const adminUser = await checkAdminAccess(req)
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get("action")
    const tableName = searchParams.get("tableName")

    const logs = await prisma.auditLog.findMany({
      where: {
        AND: [
          action ? { action } : {},
          tableName ? { tableName } : {},
        ],
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100, // safety limit
    })

    return NextResponse.json({
      success: true,
      logs,
    })
  } catch (error) {
    console.error("Fetch audit logs error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
