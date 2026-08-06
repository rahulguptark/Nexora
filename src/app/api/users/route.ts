import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyAccessJWT, hashPassword } from "@/lib/auth"

// Admin helper validation
async function checkAdminAccess(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null

  const decoded = await verifyAccessJWT(token)
  if (!decoded) return null

  const hasAccess = decoded.roles.includes("admin") || decoded.roles.includes("super_admin")
  return hasAccess ? decoded : null
}

export async function GET(req: NextRequest) {
  try {
    const adminUser = await checkAdminAccess(req)
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const roleParam = searchParams.get("role")
    const statusParam = searchParams.get("status")
    const search = searchParams.get("search") || ""

    const users = await prisma.user.findMany({
      where: {
        AND: [
          roleParam
            ? {
                roles: {
                  some: {
                    role: {
                      name: roleParam,
                    },
                  },
                },
              }
            : {},
          statusParam ? { status: statusParam } : {},
          search
            ? {
                OR: [
                  { email: { contains: search } },
                  { firstName: { contains: search } },
                  { lastName: { contains: search } },
                ],
              }
            : {},
        ],
      },
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
      orderBy: {
        createdAt: "desc",
      },
    })

    const formattedUsers = users.map(user => ({
      ...user,
      roles: user.roles.map(ur => ur.role.name),
    }))

    return NextResponse.json({ success: true, users: formattedUsers })
  } catch (error) {
    console.error("Admin fetch users error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await checkAdminAccess(req)
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { email, password, firstName, lastName, role } = await req.json()
    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check existing
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    // Lookup specified role
    let targetRole = await prisma.role.findUnique({
      where: { name: role },
    })

    if (!targetRole) {
      targetRole = await prisma.role.create({
        data: {
          name: role,
          description: `Automatically created ${role} role`,
        },
      })
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        status: "active",
        roles: {
          create: {
            roleId: targetRole.id,
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
    })

    // Log admin audit action
    await prisma.auditLog.create({
      data: {
        userId: adminUser.userId,
        action: "create_user_by_admin",
        tableName: "User",
        rowId: newUser.id,
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        status: newUser.status,
      },
    }, { status: 201 })
  } catch (error) {
    console.error("Admin user creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
