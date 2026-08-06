"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface Variant {
  id: string
  sku: string
  barcode: string | null
  price: number
  compareAtPrice: number | null
  weightKg: number
  dimensions: any
  attributes: Record<string, string>
  images: string[]
  videos: string[]
  stock: number
  inStock: boolean
}

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  brandName: string | null
  categories: string[]
  tags: string[]
  variants: Variant[]
}

interface Recommendation {
  id: string
  name: string
  slug: string
  price: number
}

export default function ProductDetailClient({ 
  product, 
  recommendations 
}: { 
  product: Product
  recommendations: Recommendation[]
}) {
  const router = useRouter()

  // Find unique values for color/size attributes across all variants
  const colors = Array.from(new Set(product.variants.map(v => v.attributes.color).filter(Boolean)))
  const sizes = Array.from(new Set(product.variants.map(v => v.attributes.size).filter(Boolean)))

  // Chosen attribute states
  const [selectedColor, setSelectedColor] = useState(colors[0] || "")
  const [selectedSize, setSelectedSize] = useState(sizes[0] || "")

  // Current matched variant state
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)

  // Current active image gallery index
  const [activeImage, setActiveImage] = useState("")

  // Resolve matching variant based on chosen attributes
  useEffect(() => {
    const match = product.variants.find(v => {
      const matchColor = !selectedColor || v.attributes.color === selectedColor
      const matchSize = !selectedSize || v.attributes.size === selectedSize
      return matchColor && matchSize
    })

    if (match) {
      setSelectedVariant(match)
      if (match.images && match.images.length > 0) {
        setActiveImage(match.images[0])
      } else {
        setActiveImage("/placeholder.svg")
      }
    } else {
      setSelectedVariant(product.variants[0] || null)
      if (product.variants[0]?.images?.length > 0) {
        setActiveImage(product.variants[0].images[0])
      } else {
        setActiveImage("/placeholder.svg")
      }
    }
  }, [selectedColor, selectedSize, product.variants])

  // Get active images array safely
  const galleryImages = selectedVariant?.images && selectedVariant.images.length > 0
    ? selectedVariant.images
    : ["/next.svg"] // fallback

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl">
        
        {/* Breadcrumbs */}
        <div className="mb-6 flex gap-2 text-xs font-semibold text-zinc-450 dark:text-zinc-500">
          <span className="cursor-pointer hover:underline" onClick={() => router.push("/")}>Home</span>
          <span>&rsaquo;</span>
          <span>Products</span>
          <span>&rsaquo;</span>
          <span className="text-zinc-700 dark:text-zinc-300">{product.name}</span>
        </div>

        {/* Product Grid */}
        <div className="grid gap-8 lg:grid-cols-2 bg-white rounded-3xl border border-gray-100 p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          
          {/* Column 1: Image Gallery & Video Media */}
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-gray-100 bg-zinc-50 dark:border-zinc-850 dark:bg-zinc-950 flex items-center justify-center">
              {/* Main Image Display */}
              <img
                src={activeImage}
                alt={product.name}
                className="max-h-full max-w-full object-contain p-4"
              />
            </div>
            
            {/* Gallery Thumbnails */}
            {galleryImages.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={`h-16 w-16 overflow-hidden rounded-lg border bg-zinc-50 transition-all ${
                      activeImage === img 
                        ? "border-indigo-650 scale-[1.03]" 
                        : "border-gray-150 hover:border-gray-300"
                    }`}
                  >
                    <img src={img} className="h-full w-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            )}

            {/* Video Player Section */}
            {selectedVariant?.videos && selectedVariant.videos.length > 0 && (
              <div className="mt-6 border-t border-gray-100 pt-6 dark:border-zinc-800">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Product Demonstration
                </h3>
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                  {selectedVariant.videos.map((vidUrl, idx) => (
                    <div key={idx} className="aspect-video w-full">
                      <iframe
                        src={vidUrl}
                        title="Product Video"
                        className="h-full w-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Details & Selectors */}
          <div className="flex flex-col justify-between">
            <div>
              {/* Brand & Title */}
              <div className="mb-4">
                {product.brandName && (
                  <span className="text-sm font-semibold uppercase tracking-wider text-indigo-650 dark:text-indigo-400">
                    {product.brandName}
                  </span>
                )}
                <h1 className="mt-1 font-sans text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
                  {product.name}
                </h1>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {product.tags.map((tag) => (
                    <span key={tag} className="rounded bg-zinc-100 px-2 py-0.5 text-2xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Dynamic Prices & Identifiers */}
              {selectedVariant && (
                <div className="mb-6 rounded-2xl bg-zinc-50/50 p-4 dark:bg-zinc-950/20">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
                      ${selectedVariant.price.toFixed(2)}
                    </span>
                    {selectedVariant.compareAtPrice && (
                      <span className="text-sm text-zinc-450 line-through dark:text-zinc-500">
                        ${selectedVariant.compareAtPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-450">
                    <span>SKU: <strong className="font-mono">{selectedVariant.sku}</strong></span>
                    {selectedVariant.barcode && (
                      <span>Barcode: <strong className="font-mono">{selectedVariant.barcode}</strong></span>
                    )}
                    {selectedVariant.weightKg > 0 && (
                      <span>Weight: {selectedVariant.weightKg}Kg</span>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="mb-6 border-b border-gray-100 pb-6 dark:border-zinc-800">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Overview Description
                </h3>
                <p className="text-sm leading-relaxed text-zinc-650 dark:text-zinc-355">
                  {product.description || "No overview description has been registered for this catalog item."}
                </p>
              </div>

              {/* Attribute Selectors */}
              <div className="space-y-4">
                {colors.length > 0 && (
                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Available Color: <strong className="text-zinc-800 dark:text-zinc-200">{selectedColor}</strong>
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {colors.map((c) => (
                        <button
                          key={c}
                          onClick={() => setSelectedColor(c)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                            selectedColor === c
                              ? "border-indigo-650 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/20 dark:text-indigo-350"
                              : "border-gray-200 hover:border-gray-400 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {sizes.length > 0 && (
                  <div>
                    <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Available Size: <strong className="text-zinc-800 dark:text-zinc-200">{selectedSize}</strong>
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {sizes.map((s) => (
                        <button
                          key={s}
                          onClick={() => setSelectedSize(s)}
                          className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold border transition-all ${
                            selectedSize === s
                              ? "border-indigo-650 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/20 dark:text-indigo-350"
                              : "border-gray-200 hover:border-gray-400 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Checkout Row */}
            <div className="mt-8 border-t border-gray-100 pt-6 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="block text-xs text-zinc-400 uppercase tracking-wider">
                    Fulfillment Status
                  </span>
                  <span className={`text-sm font-bold ${
                    selectedVariant?.inStock ? "text-green-600 dark:text-green-400" : "text-red-500"
                  }`}>
                    {selectedVariant?.inStock 
                      ? `In Stock (${selectedVariant.stock} units)` 
                      : "Temporarily Unavailable"
                    }
                  </span>
                </div>
                <button
                  disabled={!selectedVariant?.inStock}
                  className="flex h-12 flex-1 max-w-xs items-center justify-center rounded-xl bg-zinc-900 font-semibold text-white shadow hover:bg-zinc-800 disabled:opacity-40 active:scale-[0.98] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Add to Shopping Cart
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-6 font-sans text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Recommended for You
            </h2>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
              {recommendations.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => router.push(`/products/${item.slug}`)}
                  className="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow transition-all dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="aspect-square w-full overflow-hidden rounded-xl bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                    <span className="text-4xl text-zinc-300 dark:text-zinc-800">📦</span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-zinc-900 group-hover:text-indigo-650 dark:text-zinc-150 dark:group-hover:text-indigo-400 truncate">
                    {item.name}
                  </h3>
                  <span className="mt-1 block text-xs font-bold text-zinc-500">
                    From ${item.price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
