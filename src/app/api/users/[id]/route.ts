import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyAccessJWT } from "@/lib/auth"

async function checkAdminAccess(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null

  const decoded = await verifyAccessJWT(token)
  if (!decoded) return null

  const hasAccess = decoded.roles.includes("admin") || decoded.roles.includes("super_admin")
  return hasAccess ? decoded : null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminUser = await checkAdminAccess(req)
    if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        status: true,
        isMfaEnabled: true,
        createdAt: true,
        roles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        roles: user.roles.map(ur => ur.role.name),
      },
    })
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
    const adminUser = await checkAdminAccess(req)
    if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await req.json()
    const { firstName, lastName, phoneNumber, status, roles } = body

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    // Build update payload
    const updateData: any = {}
    if (firstName) updateData.firstName = firstName
    if (lastName) updateData.lastName = lastName
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber
    if (status) updateData.status = status

    // Update main fields
    await prisma.user.update({
      where: { id },
      data: updateData,
    })

    // If roles are supplied, sync roles relations
    if (roles && Array.isArray(roles)) {
      // Delete existing roles relations
      await prisma.userRole.deleteMany({
        where: { userId: id },
      })

      // Map and create new roles relations
      for (const roleName of roles) {
        let role = await prisma.role.findUnique({ where: { name: roleName } })
        if (!role) {
          role = await prisma.role.create({ data: { name: roleName } })
        }
        await prisma.userRole.create({
          data: {
            userId: id,
            roleId: role.id,
          },
        })
      }
    }

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: adminUser.userId,
        action: "update_user_by_admin",
        tableName: "User",
        rowId: id,
        newValues: JSON.stringify(body),
      },
    })

    return NextResponse.json({ success: true, message: "User updated successfully" })
  } catch (error) {
    console.error("Admin put user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminUser = await checkAdminAccess(req)
    if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    // Check self-deletion lock
    if (user.id === adminUser.userId) {
      return NextResponse.json({ error: "Self-deletion is blocked" }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.user.delete({
        where: { id },
      }),
      prisma.auditLog.create({
        data: {
          userId: adminUser.userId,
          action: "delete_user_by_admin",
          tableName: "User",
          rowId: id,
        },
      }),
    ])

    return NextResponse.json({ success: true, message: "User deleted successfully" })
  } catch (error) {
    console.error("Admin delete user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
