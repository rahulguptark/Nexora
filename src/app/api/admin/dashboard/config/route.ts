import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { checkCatalogWriteAccess } from "@/lib/auth"

export async function PUT(req: NextRequest) {
  try {
    const adminUser = await checkCatalogWriteAccess(req)
    if (!adminUser || (!adminUser.roles.includes("admin") && !adminUser.roles.includes("super_admin"))) {
      return NextResponse.json({ error: "Forbidden. Admin role required." }, { status: 403 })
    }

    const body = await req.json()
    const {
      guestCheckoutEnabled,
      walletPaymentEnabled,
      couponValidationEnabled,
      maintenanceMode,
      homepageBanners,
    } = body

    const updatedConfig = await prisma.systemConfig.upsert({
      where: { id: "primary_config" },
      update: {
        guestCheckoutEnabled: guestCheckoutEnabled !== undefined ? !!guestCheckoutEnabled : undefined,
        walletPaymentEnabled: walletPaymentEnabled !== undefined ? !!walletPaymentEnabled : undefined,
        couponValidationEnabled: couponValidationEnabled !== undefined ? !!couponValidationEnabled : undefined,
        maintenanceMode: maintenanceMode !== undefined ? !!maintenanceMode : undefined,
        homepageBanners: homepageBanners !== undefined ? homepageBanners : undefined,
      },
      create: {
        id: "primary_config",
        guestCheckoutEnabled: guestCheckoutEnabled !== undefined ? !!guestCheckoutEnabled : true,
        walletPaymentEnabled: walletPaymentEnabled !== undefined ? !!walletPaymentEnabled : true,
        couponValidationEnabled: couponValidationEnabled !== undefined ? !!couponValidationEnabled : true,
        maintenanceMode: maintenanceMode !== undefined ? !!maintenanceMode : false,
        homepageBanners: homepageBanners || "[]",
      },
    })

    return NextResponse.json({
      success: true,
      message: "System configuration updated successfully",
      systemConfig: updatedConfig,
    })
  } catch (error: any) {
    console.error("PUT /api/admin/dashboard/config error:", error)
    return NextResponse.json({ error: "Internal server error updating system settings" }, { status: 500 })
  }
}
