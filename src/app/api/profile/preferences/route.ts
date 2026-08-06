import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { verifyAccessJWT } from "@/lib/auth"

async function getAuthenticatedUser(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null
  return verifyAccessJWT(token)
}

const preferencesSchema = z.object({
  emailTransactional: z.boolean().optional(),
  emailMarketing: z.boolean().optional(),
  smsAlerts: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getAuthenticatedUser(req)
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId: sessionUser.userId },
    })

    if (!preferences) {
      // Create defaults on-demand if missing
      const defaults = await prisma.notificationPreference.create({
        data: {
          userId: sessionUser.userId,
          emailTransactional: true,
          emailMarketing: false,
          smsAlerts: true,
          pushNotifications: true,
        },
      })
      return NextResponse.json({ success: true, preferences: defaults })
    }

    return NextResponse.json({ success: true, preferences })
  } catch (error) {
    console.error("Get preferences error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await getAuthenticatedUser(req)
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const result = preferencesSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid data", details: result.error.format() }, { status: 400 })
    }

    const updated = await prisma.notificationPreference.upsert({
      where: { userId: sessionUser.userId },
      create: {
        userId: sessionUser.userId,
        emailTransactional: result.data.emailTransactional ?? true,
        emailMarketing: result.data.emailMarketing ?? false,
        smsAlerts: result.data.smsAlerts ?? true,
        pushNotifications: result.data.pushNotifications ?? true,
      },
      update: result.data,
    })

    return NextResponse.json({
      success: true,
      message: "Preferences updated successfully",
      preferences: updated,
    })
  } catch (error) {
    console.error("Update preferences error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
