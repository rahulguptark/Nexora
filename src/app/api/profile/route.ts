import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyAccessJWT } from "@/lib/auth"

async function getAuthenticatedUser(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null
  return verifyAccessJWT(token)
}

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getAuthenticatedUser(req)
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        status: true,
        isMfaEnabled: true,
        createdAt: true,
        preferences: true,
        addresses: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, profile: user })
  } catch (error) {
    console.error("Fetch profile error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await getAuthenticatedUser(req)
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { firstName, lastName, phoneNumber } = body

    const updateData: any = {}
    if (firstName) updateData.firstName = firstName
    if (lastName) updateData.lastName = lastName
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber

    const updatedUser = await prisma.user.update({
      where: { id: sessionUser.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      profile: updatedUser,
    })
  } catch (error) {
    console.error("Update profile error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
