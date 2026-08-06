import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { checkCatalogWriteAccess } from "@/lib/auth"
import {
  notificationTemplates,
  compileTemplate,
  simulateEmailDelivery,
  simulateSMSDelivery,
  simulateWhatsAppDelivery,
  simulatePushDelivery,
} from "@/lib/notifications"

export async function POST(req: NextRequest) {
  try {
    const adminUser = await checkCatalogWriteAccess(req)
    if (!adminUser || (!adminUser.roles.includes("admin") && !adminUser.roles.includes("super_admin"))) {
      return NextResponse.json({ error: "Forbidden. Admin role required." }, { status: 403 })
    }

    // Pull all pending jobs or failed jobs that haven't hit max retries yet
    const pendingJobs = await prisma.notificationJob.findMany({
      where: {
        status: { in: ["pending", "retry_pending"] },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    })

    const processedLogs: Array<{ jobId: string; channel: string; status: string; error?: string }> = []

    for (const job of pendingJobs) {
      try {
        const payloadObj = JSON.parse(job.payload)
        const template = notificationTemplates[job.templateName]

        if (!template) {
          await prisma.notificationJob.update({
            where: { id: job.id },
            data: { status: "failed", errorMessage: "Template definition not found" },
          })
          processedLogs.push({ jobId: job.id, channel: job.channel, status: "failed", error: "Template not found" })
          continue
        }

        const title = compileTemplate(template.title, payloadObj)
        const body = compileTemplate(template.body, payloadObj)

        let deliverySuccess = false

        if (job.channel === "email") {
          deliverySuccess = await simulateEmailDelivery(job.recipient, title, body)
        } else if (job.channel === "sms") {
          deliverySuccess = await simulateSMSDelivery(job.recipient, body)
        } else if (job.channel === "whatsapp") {
          deliverySuccess = await simulateWhatsAppDelivery(job.recipient, body)
        } else if (job.channel === "push") {
          deliverySuccess = await simulatePushDelivery(job.recipient, title, body)
        }

        if (deliverySuccess) {
          await prisma.notificationJob.update({
            where: { id: job.id },
            data: { status: "sent", errorMessage: null },
          })
          processedLogs.push({ jobId: job.id, channel: job.channel, status: "sent" })
        }
      } catch (err: any) {
        console.error(`Delivery failed for notification job ${job.id}:`, err.message)
        
        const nextRetryCount = job.retryCount + 1
        const nextStatus = nextRetryCount >= job.maxRetries ? "failed" : "retry_pending"

        await prisma.notificationJob.update({
          where: { id: job.id },
          data: {
            status: nextStatus,
            retryCount: nextRetryCount,
            errorMessage: err.message || "Unknown delivery error",
          },
        })

        processedLogs.push({
          jobId: job.id,
          channel: job.channel,
          status: nextStatus,
          error: err.message || "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: pendingJobs.length,
      logs: processedLogs,
    })
  } catch (error: any) {
    console.error("POST /api/admin/notifications/process error:", error)
    return NextResponse.json({ error: "Internal server error processing notification queue" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const adminUser = await checkCatalogWriteAccess(req)
    if (!adminUser || (!adminUser.roles.includes("admin") && !adminUser.roles.includes("super_admin"))) {
      return NextResponse.json({ error: "Forbidden. Admin role required." }, { status: 403 })
    }

    const queue = await prisma.notificationJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    return NextResponse.json({
      success: true,
      queue,
    })
  } catch (error: any) {
    console.error("GET /api/admin/notifications/process error:", error)
    return NextResponse.json({ error: "Internal server error querying queue list" }, { status: 500 })
  }
}
