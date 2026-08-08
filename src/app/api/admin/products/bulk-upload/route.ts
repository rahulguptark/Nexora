import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { verifyAccessJWT } from "@/lib/auth"
import { parseCSV } from "@/lib/csv-parser"

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

export async function POST(req: NextRequest) {
  try {
    const adminUser = await checkCatalogWriteAccess(req)
    if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { csvContent } = await req.json()
    if (!csvContent) {
      return NextResponse.json({ error: "Missing csvContent string in body" }, { status: 400 })
    }

    // Parse CSV
    let rows
    try {
      rows = parseCSV(csvContent)
    } catch (e: any) {
      return NextResponse.json({ error: `CSV Parse Error: ${e.message}` }, { status: 400 })
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "No data rows found in CSV file" }, { status: 400 })
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

    // Ensure a default seller exists
    let defaultSeller = await prisma.seller.findFirst()
    if (!defaultSeller) {
      defaultSeller = await prisma.seller.create({
        data: {
          name: "Default Bulk Uploader Seller",
          email: "bulk@nexora.com",
          isVerified: true,
        },
      })
    }

    // Run transaction insertion
    const results = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const createdVariants = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]

        // Validate SKU duplication on existing DB records
        const existingSku = await tx.productVariant.findUnique({
          where: { sku: row.sku },
        })
        if (existingSku) {
          throw new Error(`Line ${i + 2}: SKU '${row.sku}' already exists in database. Transaction rolled back.`);
        }

        // Validate Barcode duplication on existing DB records
        if (row.barcode) {
          const existingBarcode = await tx.productVariant.findUnique({
            where: { barcode: row.barcode },
          })
          if (existingBarcode) {
            throw new Error(`Line ${i + 2}: Barcode '${row.barcode}' already exists in database. Transaction rolled back.`);
          }
        }

        // Connect or create Brand
        let brandId = undefined
        if (row.brand) {
          let brand = await tx.brand.findUnique({ where: { name: row.brand } })
          if (!brand) {
            brand = await tx.brand.create({ data: { name: row.brand } })
          }
          brandId = brand.id
        }

        // Find or create Product container matching slug
        let product = await tx.product.findUnique({
          where: { slug: row.slug },
        })

        if (!product) {
          product = await tx.product.create({
            data: {
              name: row.name,
              slug: row.slug,
              description: row.description,
              brandId,
              sellerId: defaultSeller.id,
              isActive: true,
              visibility: row.visibility || "public",
              seoTitle: row.seoTitle || null,
              seoDescription: row.seoDescription || null,
              seoKeywords: row.seoKeywords || null,
              tags: row.tags ? JSON.stringify(row.tags) : null,
            },
          })

          // Setup categories links
          for (const catName of row.categories) {
            let category = await tx.category.findFirst({ where: { name: catName } })
            if (!category) {
              category = await tx.category.create({
                data: {
                  name: catName,
                  slug: catName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                },
              })
            }
            await tx.productCategory.create({
              data: {
                productId: product.id,
                categoryId: category.id,
              },
            })
          }
        }

        // Construct attributes
        const variantAttributes: any = {}
        if (row.color) variantAttributes.color = row.color
        if (row.size) variantAttributes.size = row.size

        // Create Variant
        const variant = await tx.productVariant.create({
          data: {
            productId: product.id,
            sku: row.sku,
            barcode: row.barcode || null,
            price: row.price,
            compareAtPrice: row.compareAtPrice,
            weightKg: row.weight,
            variantAttributes: JSON.stringify(variantAttributes),
            images: row.images ? JSON.stringify(row.images) : null,
            videos: row.videos ? JSON.stringify(row.videos) : null,
          },
        })

        // Create inventory stock allocation records
        await tx.inventory.create({
          data: {
            productVariantId: variant.id,
            warehouseId: warehouse.id,
            quantityAvailable: row.inventory,
            quantityReserved: 0,
          },
        })

        createdVariants.push(variant.sku)
      }

      return createdVariants
    })

    // Log admin audit action
    await prisma.auditLog.create({
      data: {
        userId: adminUser.userId,
        action: "bulk_upload_products_csv",
        tableName: "ProductVariant",
        rowId: adminUser.userId, // references actor id
        newValues: JSON.stringify({ count: rows.length, skus: results }),
      },
    })

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${results.length} product variants.`,
      skus: results,
    })
  } catch (error: any) {
    console.error("Bulk upload transaction error:", error)
    return NextResponse.json({ error: error.message || "Internal server error during upload" }, { status: 500 })
  }
}
