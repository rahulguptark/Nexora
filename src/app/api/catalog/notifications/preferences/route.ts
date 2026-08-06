import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyAccessJWT } from "@/lib/auth"

async function getUserIdFromSession(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null
  const decoded = await verifyAccessJWT(token)
  return decoded ? decoded.userId : null
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromSession(req)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    })

    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId,
          emailTransactional: true,
          emailMarketing: true,
          smsAlerts: true,
          pushNotifications: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      preferences,
    })
  } catch (error: any) {
    console.error("GET /api/catalog/notifications/preferences error:", error)
    return NextResponse.json({ error: "Internal server error fetching preferences" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserIdFromSession(req)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { emailTransactional, emailMarketing, smsAlerts, pushNotifications } = body

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        emailTransactional: emailTransactional !== undefined ? !!emailTransactional : undefined,
        emailMarketing: emailMarketing !== undefined ? !!emailMarketing : undefined,
        smsAlerts: smsAlerts !== undefined ? !!smsAlerts : undefined,
        pushNotifications: pushNotifications !== undefined ? !!pushNotifications : undefined,
      },
      create: {
        userId,
        emailTransactional: emailTransactional !== undefined ? !!emailTransactional : true,
        emailMarketing: emailMarketing !== undefined ? !!emailMarketing : true,
        smsAlerts: smsAlerts !== undefined ? !!smsAlerts : true,
        pushNotifications: pushNotifications !== undefined ? !!pushNotifications : true,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Preferences updated successfully",
      preferences,
    })
  } catch (error: any) {
    console.error("PUT /api/catalog/notifications/preferences error:", error)
    return NextResponse.json({ error: "Internal server error saving preferences" }, { status: 500 })
  }
}
