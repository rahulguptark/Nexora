import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const product = await prisma.product.findUnique({
      where: { slug, isActive: true },
      include: {
        brand: true,
        categories: {
          include: {
            category: true,
          },
        },
        variants: {
          include: {
            inventories: true,
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Fetch related products (matching same brand or sharing same category)
    const relatedProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: product.id },
        OR: [
          product.brandId ? { brandId: product.brandId } : {},
          {
            categories: {
              some: {
                categoryId: {
                  in: product.categories.map(c => c.categoryId),
                },
              },
            },
          },
        ],
      },
      take: 4,
      include: {
        variants: true,
      },
    })

    const formattedRelated = relatedProducts.map(rp => {
      const prices = rp.variants.map(v => v.price)
      return {
        id: rp.id,
        name: rp.name,
        slug: rp.slug,
        price: prices.length > 0 ? Math.min(...prices) : 0,
      }
    })

    // Parse dynamic attributes metadata
    const parsedMetadata = product.metadata
      ? typeof product.metadata === "string"
        ? JSON.parse(product.metadata)
        : product.metadata
      : {}

    const parsedTags = product.tags ? JSON.parse(product.tags) : []
    const parsedRecs = product.recommendations ? JSON.parse(product.recommendations) : []

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        brand: product.brand,
        visibility: product.visibility,
        seoTitle: product.seoTitle,
        seoDescription: product.seoDescription,
        seoKeywords: product.seoKeywords,
        tags: parsedTags,
        recommendations: parsedRecs,
        categories: product.categories.map(c => c.category),
        variants: product.variants.map(v => {
          const attributes = v.variantAttributes
            ? typeof v.variantAttributes === "string"
              ? JSON.parse(v.variantAttributes)
              : v.variantAttributes
            : {}

          const stock = v.inventories.reduce((acc, inv) => acc + inv.quantityAvailable, 0)
          const images = v.images ? JSON.parse(v.images) : []
          const videos = v.videos ? JSON.parse(v.videos) : []

          return {
            id: v.id,
            sku: v.sku,
            barcode: v.barcode,
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            weightKg: v.weightKg,
            dimensions: v.dimensionsJson ? JSON.parse(v.dimensionsJson as string) : null,
            attributes,
            images,
            videos,
            stock,
            inStock: stock > 0,
          }
        }),
        metadata: parsedMetadata,
        relatedProducts: formattedRelated,
      },
    })
  } catch (error) {
    console.error("Public catalog fetch product detail error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
