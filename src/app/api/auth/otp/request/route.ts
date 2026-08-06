import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"

const otpRequestSchema = z.object({
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = otpRequestSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }

    const { email } = result.data

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.status !== "active") {
      return NextResponse.json({ error: "Account must be verified and active to request OTP login" }, { status: 403 })
    }

    // Generate OTP Code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes validity

    await prisma.otp.create({
      data: {
        userId: user.id,
        otpCodeHash: code,
        purpose: "otp_login",
        expiresAt,
      },
    })

    // Simulate SMS/Email channel delivery
    console.log(`[OTP SIMULATOR] To: ${email} | Subject: Your OTP Login Code | Code: ${code}`)

    return NextResponse.json({
      success: true,
      message: "One-Time Password code simulated and sent.",
    })
  } catch (error) {
    console.error("OTP request error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
