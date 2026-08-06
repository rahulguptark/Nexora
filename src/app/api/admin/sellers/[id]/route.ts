import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { checkCatalogWriteAccess } from "@/lib/auth"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminUser = await checkCatalogWriteAccess(req)
    if (!adminUser || (!adminUser.roles.includes("admin") && !adminUser.roles.includes("super_admin"))) {
      return NextResponse.json({ error: "Forbidden. Admin role required." }, { status: 403 })
    }

    const body = await req.json()
    const { isVerified, name } = body

    const updatedSeller = await prisma.seller.update({
      where: { id },
      data: {
        isVerified: isVerified !== undefined ? !!isVerified : undefined,
        name: name || undefined,
      },
    })

    // Log admin audit action
    await prisma.auditLog.create({
      data: {
        userId: adminUser.userId,
        action: "update_seller_verification_status",
        tableName: "Seller",
        rowId: id,
        newValues: JSON.stringify(body),
      },
    })

    return NextResponse.json({
      success: true,
      message: "Seller account updated successfully",
      seller: updatedSeller,
    })
  } catch (error: any) {
    console.error("PUT /api/admin/sellers/[id] error:", error)
    return NextResponse.json({ error: "Internal server error updating seller account" }, { status: 500 })
  }
}
