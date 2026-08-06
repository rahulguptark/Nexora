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

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  brandName: z.string().optional(),
  categoryNames: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().optional(),
  visibility: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  tags: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminUser = await checkCatalogWriteAccess(req)
    if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        categories: {
          include: {
            category: true,
          },
        },
        variants: true,
      },
    })

    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

    return NextResponse.json({ success: true, product })
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
    const adminUser = await checkCatalogWriteAccess(req)
    if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await req.json()
    const result = updateProductSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid parameters", details: result.error.format() }, { status: 400 })
    }

    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

    const {
      name,
      slug,
      description,
      brandName,
      categoryNames,
      metadata,
      isActive,
      visibility,
      seoTitle,
      seoDescription,
      seoKeywords,
      tags,
      recommendations,
    } = result.data

    // Check slug collision
    if (slug && slug !== product.slug) {
      const collision = await prisma.product.findUnique({ where: { slug } })
      if (collision) return NextResponse.json({ error: "Slug already in use" }, { status: 409 })
    }

    // Connect or create Brand
    let brandId = product.brandId
    if (brandName !== undefined) {
      if (brandName) {
        let brand = await prisma.brand.findUnique({ where: { name: brandName } })
        if (!brand) brand = await prisma.brand.create({ data: { name: brandName } })
        brandId = brand.id
      } else {
        brandId = null
      }
    }

    // Build update object
    const updateData: any = {}
    if (name) updateData.name = name
    if (slug) updateData.slug = slug
    if (description !== undefined) updateData.description = description
    if (brandId !== undefined) updateData.brandId = brandId
    if (metadata !== undefined) updateData.metadata = metadata ? JSON.stringify(metadata) : null
    if (isActive !== undefined) updateData.isActive = isActive
    if (visibility !== undefined) updateData.visibility = visibility
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle
    if (seoDescription !== undefined) updateData.seoDescription = seoDescription
    if (seoKeywords !== undefined) updateData.seoKeywords = seoKeywords
    if (tags !== undefined) updateData.tags = tags ? JSON.stringify(tags) : null
    if (recommendations !== undefined) updateData.recommendations = recommendations ? JSON.stringify(recommendations) : null

    await prisma.product.update({
      where: { id },
      data: updateData,
    })

    // Sync categories relations if supplied
    if (categoryNames && Array.isArray(categoryNames)) {
      await prisma.productCategory.deleteMany({ where: { productId: id } })
      for (const catName of categoryNames) {
        let category = await prisma.category.findFirst({ where: { name: catName } })
        if (!category) {
          category = await prisma.category.create({
            data: {
              name: catName,
              slug: catName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            },
          })
        }
        await prisma.productCategory.create({
          data: {
            productId: id,
            categoryId: category.id,
          },
        })
      }
    }

    // Log admin audit action
    await prisma.auditLog.create({
      data: {
        userId: adminUser.userId,
        action: "update_product_by_admin",
        tableName: "Product",
        rowId: id,
        newValues: JSON.stringify(body),
      },
    })

    return NextResponse.json({ success: true, message: "Product updated successfully" })
  } catch (error) {
    console.error("Admin put product error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminUser = await checkCatalogWriteAccess(req)
    if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

    await prisma.$transaction([
      prisma.product.delete({
        where: { id },
      }),
      prisma.auditLog.create({
        data: {
          userId: adminUser.userId,
          action: "delete_product_by_admin",
          tableName: "Product",
          rowId: id,
        },
      }),
    ])

    return NextResponse.json({ success: true, message: "Product deleted successfully" })
  } catch (error) {
    console.error("Admin delete product error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
