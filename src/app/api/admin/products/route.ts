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

const createProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  brandName: z.string().optional(),
  categoryNames: z.array(z.string()).optional().default([]),
  metadata: z.record(z.string(), z.any()).optional(),
  sellerId: z.string().optional(),
  visibility: z.string().optional().default("public"),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  tags: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const adminUser = await checkCatalogWriteAccess(req)
    if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const products = await prisma.product.findMany({
      include: {
        brand: true,
        categories: {
          include: {
            category: true,
          },
        },
        variants: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, products })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await checkCatalogWriteAccess(req)
    if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const body = await req.json()
    const result = createProductSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Invalid product parameters", details: result.error.format() }, { status: 400 })
    }

    const {
      name,
      slug,
      description,
      brandName,
      categoryNames,
      metadata,
      sellerId,
      visibility,
      seoTitle,
      seoDescription,
      seoKeywords,
      tags,
      recommendations,
    } = result.data

    // Check slug collision
    const existing = await prisma.product.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: "Product slug already exists" }, { status: 409 })
    }

    // Connect or create Brand
    let brandId = undefined
    if (brandName) {
      let brand = await prisma.brand.findUnique({ where: { name: brandName } })
      if (!brand) {
        brand = await prisma.brand.create({ data: { name: brandName } })
      }
      brandId = brand.id
    }

    // Connect or create Seller (fallback to current user if seller not supplied)
    let finalSellerId = sellerId
    if (!finalSellerId) {
      let seller = await prisma.seller.findFirst() // grab any default first seller
      if (!seller) {
        seller = await prisma.seller.create({
          data: {
            name: "Default Marketplace Seller",
            email: "merchant@nexora.com",
            isVerified: true,
          },
        })
      }
      finalSellerId = seller.id
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        brandId,
        sellerId: finalSellerId,
        metadata: metadata ? JSON.stringify(metadata) : null,
        isActive: true,
        visibility: visibility || "public",
        seoTitle,
        seoDescription,
        seoKeywords,
        tags: tags ? JSON.stringify(tags) : null,
        recommendations: recommendations ? JSON.stringify(recommendations) : null,
      },
    })

    // Connect categories
    if (categoryNames && categoryNames.length > 0) {
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
            productId: product.id,
            categoryId: category.id,
          },
        })
      }
    }

    // Log admin audit action
    await prisma.auditLog.create({
      data: {
        userId: adminUser.userId,
        action: "create_product_by_admin",
        tableName: "Product",
        rowId: product.id,
        newValues: JSON.stringify(result.data),
      },
    })

    return NextResponse.json({
      success: true,
      message: "Product created successfully",
      product,
    }, { status: 201 })
  } catch (error) {
    console.error("Admin create product error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
