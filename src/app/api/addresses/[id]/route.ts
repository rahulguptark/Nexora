import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"


import { verifyAccessJWT } from "@/lib/auth"

async function getSessionUser(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null
  return verifyAccessJWT(token)
}

const updateAddressSchema = z.object({
  recipientName: z.string().min(1).optional(),
  phoneNumber: z.string().min(1).optional(),
  addressLine1: z.string().min(1).optional(),
  addressLine2: z.string().optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  postalCode: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  isDefaultBilling: z.boolean().optional(),
  isDefaultShipping: z.boolean().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionUser = await getSessionUser(req)
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const address = await prisma.address.findUnique({
      where: { id },
    })

    if (!address || address.userId !== sessionUser.userId) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, address })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionUser = await getSessionUser(req)
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const result = updateAddressSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid data", details: result.error.format() }, { status: 400 })
    }

    const address = await prisma.address.findUnique({
      where: { id },
    })

    if (!address || address.userId !== sessionUser.userId) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 })
    }

    const { isDefaultBilling, isDefaultShipping } = result.data

    // Handle single default flags overrides
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

    const updated = await prisma.address.update({
      where: { id },
      data: result.data as any,
    })

    return NextResponse.json({
      success: true,
      message: "Address updated successfully",
      address: updated,
    })
  } catch (error) {
    console.error("Update address error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionUser = await getSessionUser(req)
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const address = await prisma.address.findUnique({
      where: { id },
    })

    if (!address || address.userId !== sessionUser.userId) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 })
    }

    await prisma.address.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Address deleted successfully",
    })
  } catch (error) {
    console.error("Delete address error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
