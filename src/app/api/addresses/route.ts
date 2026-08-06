import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { verifyAccessJWT } from "@/lib/auth"

async function getAuthenticatedUser(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null
  return verifyAccessJWT(token)
}

const addressSchema = z.object({
  recipientName: z.string().min(1),
  phoneNumber: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  isDefaultBilling: z.boolean().optional().default(false),
  isDefaultShipping: z.boolean().optional().default(false),
})

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getAuthenticatedUser(req)
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const addresses = await prisma.address.findMany({
      where: { userId: sessionUser.userId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, addresses })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getAuthenticatedUser(req)
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const result = addressSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid address payload", details: result.error.format() }, { status: 400 })
    }

    const { isDefaultBilling, isDefaultShipping, ...addressData } = result.data

    // If default fields are true, clear other defaults first
    await prisma.$transaction(async (tx) => {
      if (isDefaultBilling) {
        await tx.address.updateMany({
          where: { userId: sessionUser.userId, isDefaultBilling: true },
          data: { isDefaultBilling: false },
        })
      }
      if (isDefaultShipping) {
        await tx.address.updateMany({
          where: { userId: sessionUser.userId, isDefaultShipping: true },
          data: { isDefaultShipping: false },
        })
      }
    })

    const address = await prisma.address.create({
      data: {
        ...addressData,
        userId: sessionUser.userId,
        isDefaultBilling,
        isDefaultShipping,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Address created successfully",
      address,
    }, { status: 201 })
  } catch (error) {
    console.error("Create address error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
