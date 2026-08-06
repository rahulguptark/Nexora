import { NextRequest, NextResponse } from "next/server"
import { enqueueNotification } from "@/lib/notifications"
import { verifyAccessJWT } from "@/lib/auth"

async function getUserIdFromSession(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null
  const decoded = await verifyAccessJWT(token)
  return decoded ? decoded.userId : null
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromSession(req)
    const body = await req.json()
    const { channel, templateName, recipient, payload } = body

    if (!channel || !templateName || !recipient || !payload) {
      return NextResponse.json({ error: "Missing required parameters: channel, templateName, recipient, payload" }, { status: 400 })
    }

    const job = await enqueueNotification(
      userId,
      channel,
      templateName,
      recipient,
      payload
    )

    if (!job) {
      return NextResponse.json({
        success: false,
        message: "Notification enqueue skipped (user opted out or error occurred)",
      })
    }

    return NextResponse.json({
      success: true,
      message: "Notification enqueued in active job queue successfully!",
      job,
    })
  } catch (error: any) {
    console.error("POST /api/catalog/notifications/test error:", error)
    return NextResponse.json({ error: "Internal server error enqueuing notification" }, { status: 500 })
  }
}
