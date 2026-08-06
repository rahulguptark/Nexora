import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { hashPassword } from "@/lib/auth"

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = registerSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid registration payload", details: result.error.format() },
        { status: 400 }
      )
    }

    const { email, password, firstName, lastName, phoneNumber } = result.data

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          phoneNumber ? { phoneNumber } : {},
        ].filter(Boolean) as any,
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email or phone number already in use" },
        { status: 409 }
      )
    }

    // Encrypt password
    const passwordHash = await hashPassword(password)

    // Ensure 'customer' role exists
    let customerRole = await prisma.role.findUnique({
      where: { name: "customer" },
    })

    if (!customerRole) {
      customerRole = await prisma.role.create({
        data: {
          name: "customer",
          description: "Default customer role with purchasing privileges",
        },
      })
    }

    // Create user along with roles and default preferences
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phoneNumber,
        status: "pending_verification",
        roles: {
          create: {
            roleId: customerRole.id,
          },
        },
        preferences: {
          create: {
            emailTransactional: true,
            emailMarketing: false,
            smsAlerts: true,
            pushNotifications: true,
          },
        },
      },
      include: {
        preferences: true,
      },
    })

    // Generate Verification Token
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString() // 6 digit code
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours expiry

    await prisma.otp.create({
      data: {
        userId: user.id,
        otpCodeHash: verificationCode, // using code directly for local testing checks
        purpose: "email_verification",
        expiresAt,
      },
    })

    // Log simulated verification email delivery
    console.log(`[EMAIL SIMULATOR] To: ${email} | Subject: Verify Your Email | Code: ${verificationCode}`);

    return NextResponse.json(
      {
        message: "User registered successfully. Verification email simulated.",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error during registration" },
      { status: 500 }
    )
  }
}
