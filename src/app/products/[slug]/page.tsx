import React from "react"
import prisma from "@/lib/prisma"
import { Metadata } from "next"
import ProductDetailClient from "./ProductDetailClient"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const product = await prisma.product.findUnique({
    where: { slug, isActive: true },
    select: {
      name: true,
      description: true,
      seoTitle: true,
      seoDescription: true,
      seoKeywords: true,
    },
  })

  if (!product) {
    return {
      title: "Product Not Found | Nexora",
    }
  }

  return {
    title: `${product.seoTitle || product.name} | Nexora`,
    description: product.seoDescription || product.description,
    keywords: product.seoKeywords || undefined,
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // Retrieve complete product detail directly on the server to prevent waterfall client fetches
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-zinc-550 dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Product Not Found</h1>
          <p className="mt-2 text-sm text-zinc-400">The product you are looking for does not exist or has been removed.</p>
        </div>
      </div>
    )
  }

  // Parse recommendations if any
  const recommendationsIds = product.recommendations ? JSON.parse(product.recommendations) as string[] : []
  const recommendedProducts = recommendationsIds.length > 0 
    ? await prisma.product.findMany({
        where: { id: { in: recommendationsIds }, isActive: true },
        include: { variants: true },
      })
    : []

  const formattedProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    brandName: product.brand?.name || null,
    categories: product.categories.map(c => c.category.name),
    tags: product.tags ? JSON.parse(product.tags) : [],
    variants: product.variants.map(v => {
      const attributes = v.variantAttributes ? JSON.parse(v.variantAttributes) : {}
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
        dimensions: v.dimensionsJson ? JSON.parse(v.dimensionsJson) : null,
        attributes,
        images,
        videos,
        stock,
        inStock: stock > 0,
      }
    }),
  }

  const formattedRecommendations = recommendedProducts.map(rp => {
    const prices = rp.variants.map(v => v.price)
    return {
      id: rp.id,
      name: rp.name,
      slug: rp.slug,
      price: prices.length > 0 ? Math.min(...prices) : 0,
    }
  })

  return (
    <ProductDetailClient 
      product={formattedProduct} 
      recommendations={formattedRecommendations} 
    />
  )
}
