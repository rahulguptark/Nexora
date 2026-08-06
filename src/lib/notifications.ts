import prisma from "./prisma"

// Pre-configured notification templates
export const notificationTemplates: Record<
  string,
  { title: string; body: string }
> = {
  order_placed: {
    title: "Nexora Order #{{orderId}} Confirmed",
    body: "Hi {{name}},\n\nYour sustainable e-commerce order has been received!\nSubtotal: ${{subtotal}}\nTax: ${{tax}}\nTotal: ${{total}}\n\nThank you for shopping with Nexora!",
  },
  shipment_dispatched: {
    title: "Nexora Shipment Dispatched",
    body: "Hi {{name}},\n\nItems from order #{{orderId}} have been packaged and shipped via {{carrier}}.\nTracking code: {{trackingNumber}}\nEstimated Delivery: {{estimatedDelivery}}.",
  },
  otp_auth: {
    title: "Your Nexora MFA Security Code",
    body: "Your Nexora security code to authenticate is: {{code}}. This code is valid for 10 minutes.",
  },
}

// Compile template placeholders
export function compileTemplate(text: string, payload: Record<string, any>): string {
  let result = text
  Object.keys(payload).forEach((key) => {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), String(payload[key]))
  })
  return result
}

// Enqueue notification job in database
export async function enqueueNotification(
  userId: string | null,
  channel: string, // 'email', 'sms', 'push', 'whatsapp'
  templateName: string,
  recipient: string,
  payload: Record<string, any>
) {
  try {
    // 1. Check user preferences if userId is provided
    if (userId) {
      const preferences = await prisma.notificationPreference.findUnique({
        where: { userId },
      })

      if (preferences) {
        let isOptedIn = true
        if (channel === "email" && !preferences.emailTransactional) isOptedIn = false
        if (channel === "sms" && !preferences.smsAlerts) isOptedIn = false
        if (channel === "push" && !preferences.pushNotifications) isOptedIn = false
        if (channel === "whatsapp" && !preferences.smsAlerts) isOptedIn = false

        if (!isOptedIn) {
          console.log(`Skipping notification job to user ${userId} on channel ${channel} due to preferences setting.`)
          return null
        }
      }
    }

    // 2. Create pending job
    const job = await prisma.notificationJob.create({
      data: {
        userId,
        channel,
        templateName,
        recipient,
        payload: JSON.stringify(payload),
        status: "pending",
      },
    })

    return job
  } catch (error) {
    console.error("Failed to enqueue notification job:", error)
    return null
  }
}

// Simulated Channel Delivery Engines
export async function simulateEmailDelivery(recipient: string, title: string, body: string): Promise<boolean> {
  console.log(`[SMTP SIMULATOR] Sending Email to ${recipient}...\nSubject: ${title}\nBody:\n${body}\n---`)
  return true
}

export async function simulateSMSDelivery(recipient: string, body: string): Promise<boolean> {
  console.log(`[TWILIO SIMULATOR] Sending SMS to ${recipient}...\nMessage: ${body}\n---`)
  // Randomly fail 25% of SMS delivery attempts to verify automatic retry policy
  if (Math.random() < 0.25) {
    throw new Error("SMS Gateway Timeout (simulated delivery failure)")
  }
  return true
}

export async function simulateWhatsAppDelivery(recipient: string, body: string): Promise<boolean> {
  console.log(`[WHATSAPP BUSINESS SIMULATOR] Sending WhatsApp message to ${recipient}...\nContent:\n${body}\n---`)
  return true
}

export async function simulatePushDelivery(recipient: string, title: string, body: string): Promise<boolean> {
  console.log(`[WEB PUSH SIMULATOR] Sending push browser alert to subscription ${recipient}...\nTitle: ${title}\nBody: ${body}\n---`)
  return true
}
