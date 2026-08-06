import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const categorySlug = searchParams.get("category")
    const brandName = searchParams.get("brand")
    const search = searchParams.get("search") || ""
    const minPrice = parseFloat(searchParams.get("minPrice") || "0")
    const maxPrice = parseFloat(searchParams.get("maxPrice") || "999999")
    const color = searchParams.get("color")
    const size = searchParams.get("size")
    const sort = searchParams.get("sort") // 'price_asc', 'price_desc', 'newest'
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "12", 10)
    const skip = (page - 1) * limit

    // Build Prisma query clauses
    const whereClause: any = {
      isActive: true,
      AND: [
        categorySlug
          ? {
              categories: {
                some: {
                  category: {
                    slug: categorySlug,
                  },
                },
              },
            }
          : {},
        brandName
          ? {
              brand: {
                name: brandName,
              },
            }
          : {},
        search
          ? {
              OR: [
                { name: { contains: search } },
                { description: { contains: search } },
              ],
            }
          : {},
        // Filter products that contain variants matching price and attribute ranges
        {
          variants: {
            some: {
              AND: [
                { price: { gte: minPrice, lte: maxPrice } },
                color ? { variantAttributes: { path: ["color"], equals: color } } : {},
                size ? { variantAttributes: { path: ["size"], equals: size } } : {},
              ].filter(cond => Object.keys(cond).length > 0) as any,
            },
          },
        },
      ],
    }

    // Determine sorting
    let orderByClause: any = { createdAt: "desc" }
    if (sort === "price_asc") {
      orderByClause = { variants: { _min: { price: "asc" } } } // pseudo sorting representation
    } else if (sort === "price_desc") {
      orderByClause = { variants: { _max: { price: "desc" } } }
    } else if (sort === "newest") {
      orderByClause = { createdAt: "desc" }
    }

    const [products, totalCount] = await prisma.$transaction([
      prisma.product.findMany({
        where: whereClause,
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
        skip,
        take: limit,
      }),
      prisma.product.count({
        where: whereClause,
      }),
    ])

    // Format products
    const formattedProducts = products.map(product => {
      const allPrices = product.variants.map(v => v.price)
      const minVal = allPrices.length > 0 ? Math.min(...allPrices) : 0
      const maxVal = allPrices.length > 0 ? Math.max(...allPrices) : 0

      // Calculate availability
      const totalInventory = product.variants.reduce((acc, v) => {
        const variantInv = v.inventories.reduce((vAcc, i) => vAcc + i.quantityAvailable, 0)
        return acc + variantInv
      }, 0)

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        brand: product.brand?.name || null,
        categories: product.categories.map(c => c.category.name),
        priceRange: { min: minVal, max: maxVal },
        variantsCount: product.variants.length,
        inStock: totalInventory > 0,
        metadata: product.metadata ? JSON.parse(product.metadata as string) : {}, // SQLite handles json as string inside text columns
      }
    })

    return NextResponse.json({
      success: true,
      products: formattedProducts,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error("Public catalog fetch products error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
