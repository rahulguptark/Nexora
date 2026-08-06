import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { verifyAccessJWT } from "@/lib/auth"

async function checkCatalogWriteAccess(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value
  if (!token) return null

  const decoded = await verifyAccessJWT(token)
  if (!decoded) return null

  const hasAccess =
    decoded.roles.includes("admin") ||
    decoded.roles.includes("super_admin") ||
    decoded.roles.includes("seller")
  return hasAccess ? decoded : null
}

const variantSchema = z.object({
  sku: z.string().min(1),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().optional(),
  weightKg: z.number().optional().default(0),
  color: z.string().optional(),
  size: z.string().optional(),
  inventoryQuantity: z.number().nonnegative().optional().default(0),
  barcode: z.string().optional(),
  images: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminUser = await checkCatalogWriteAccess(req)
    if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const variants = await prisma.productVariant.findMany({
      where: { productId: id },
      include: {
        inventories: true,
      },
    })

    return NextResponse.json({ success: true, variants })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminUser = await checkCatalogWriteAccess(req)
    if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await req.json()
    const result = variantSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid variant payload", details: result.error.format() }, { status: 400 })
    }

    const { sku, barcode, price, compareAtPrice, weightKg, color, size, images, videos, inventoryQuantity } = result.data

    // Check SKU collision
    const existing = await prisma.productVariant.findUnique({ where: { sku } })
    if (existing) {
      return NextResponse.json({ error: "SKU identifier already exists" }, { status: 409 })
    }

    // Check Barcode collision
    if (barcode) {
      const existingBarcode = await prisma.productVariant.findUnique({ where: { barcode } })
      if (existingBarcode) {
        return NextResponse.json({ error: "Barcode identifier already exists" }, { status: 409 })
      }
    }

    // Ensure a default warehouse exists
    let warehouse = await prisma.warehouse.findFirst()
    if (!warehouse) {
      warehouse = await prisma.warehouse.create({
        data: {
          name: "Primary Distribution Center",
          addressLine1: "100 Warehouse Way",
          city: "Atlanta",
          state: "GA",
          postalCode: "30301",
          country: "USA",
        },
      })
    }

    // Build variant attributes JSON
    const variantAttributes = {
      ...(color ? { color } : {}),
      ...(size ? { size } : {}),
    }

    // Create variant inside transaction with initial stock allocation
    const variant = await prisma.$transaction(async (tx) => {
      const v = await tx.productVariant.create({
        data: {
          productId: id,
          sku,
          barcode: barcode || null,
          price,
          compareAtPrice,
          weightKg,
          variantAttributes: JSON.stringify(variantAttributes),
          images: images ? JSON.stringify(images) : null,
          videos: videos ? JSON.stringify(videos) : null,
        },
      })

      await tx.inventory.create({
        data: {
          productVariantId: v.id,
          warehouseId: warehouse.id,
          quantityAvailable: inventoryQuantity,
          quantityReserved: 0,
        },
      })

      return v
    })

    // Log admin audit action
    await prisma.auditLog.create({
      data: {
        userId: adminUser.userId,
        action: "create_variant_by_admin",
        tableName: "ProductVariant",
        rowId: variant.id,
        newValues: JSON.stringify(result.data),
      },
    })

    return NextResponse.json({
      success: true,
      message: "Variant created successfully",
      variant,
    }, { status: 201 })
  } catch (error) {
    console.error("Admin create variant error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await checkCatalogWriteAccess(req)
    if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await req.json()
    const { variantId, price, inventoryQuantity } = body

    if (!variantId) {
      return NextResponse.json({ error: "variantId is required" }, { status: 400 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Update Price if provided
      if (price !== undefined) {
        await tx.productVariant.update({
          where: { id: variantId },
          data: { price: parseFloat(price) },
        })
      }

      // Update Inventory stock if provided
      if (inventoryQuantity !== undefined) {
        const inventory = await tx.inventory.findFirst({
          where: { productVariantId: variantId },
        })
        if (inventory) {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantityAvailable: parseInt(inventoryQuantity, 10) },
          })
        }
      }
      return true
    })

    return NextResponse.json({
      success: true,
      message: "Variant updated successfully",
    })
  } catch (error: any) {
    console.error("PUT admin variant error:", error)
    return NextResponse.json({ error: "Internal server error updating variant details" }, { status: 500 })
  }
}
