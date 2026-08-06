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
  variantAttributes: string | null
  images: string | null
  videos: string | null
  inventories: Array<{ quantityAvailable: number }>
}

export default function ProductVariantsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [productId, setProductId] = useState<string | null>(null)

  // Variant list
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Form Fields
  const [sku, setSku] = useState("")
  const [barcode, setBarcode] = useState("")
  const [price, setPrice] = useState("")
  const [compareAtPrice, setCompareAtPrice] = useState("")
  const [weightKg, setWeightKg] = useState("")
  const [color, setColor] = useState("")
  const [size, setSize] = useState("")
  const [imagesInput, setImagesInput] = useState("")
  const [videosInput, setVideosInput] = useState("")
  const [inventoryQuantity, setInventoryQuantity] = useState("0")

  const [formLoading, setFormLoading] = useState(false)
  const [success, setSuccess] = useState("")

  useEffect(() => {
    params.then(p => setProductId(p.id))
  }, [params])

  const fetchVariants = async (id: string) => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/products/${id}/variants`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load variants")
      setVariants(data.variants || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (productId) {
      fetchVariants(productId)
    }
  }, [productId])

  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId) return
    setFormLoading(true)
    setError("")
    setSuccess("")

    const images = imagesInput.split(",").map(i => i.trim()).filter(Boolean)
    const videos = videosInput.split(",").map(v => v.trim()).filter(Boolean)

    const payload = {
      sku,
      barcode: barcode || undefined,
      price: parseFloat(price),
      compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : undefined,
      weightKg: weightKg ? parseFloat(weightKg) : 0,
      color: color || undefined,
      size: size || undefined,
      images,
      videos,
      inventoryQuantity: parseInt(inventoryQuantity, 10),
    }

    try {
      const res = await fetch(`/api/admin/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create variant")

      setSuccess("Variant created successfully!")
      setSku("")
      setBarcode("")
      setPrice("")
      setCompareAtPrice("")
      setWeightKg("")
      setColor("")
      setSize("")
      setImagesInput("")
      setVideosInput("")
      setInventoryQuantity("0")

      fetchVariants(productId)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  if (!productId) {
    return (
      <div className="py-20 text-center text-zinc-550">
        Loading product parameter scope...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl">
        
        {/* Header */}
        <div className="mb-8 border-b border-gray-150 pb-4 dark:border-zinc-800">
          <button
            onClick={() => router.push("/admin/products")}
            className="mb-2 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            &larr; Back to Products
          </button>
          <h1 className="font-sans text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Manage Product Variants
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Define pricing matrix, allocate stock, and register barcodes.
          </p>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-400">
            {success}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* 1. Create Variant Form Column */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-base font-bold text-zinc-900 dark:text-zinc-50">
                Add Variant SKU
              </h2>
              <form onSubmit={handleCreateVariant} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. ECO-TSHIRT-BLU-L"
                    className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Barcode Identifier (Optional)
                  </label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="e.g. 880123456789"
                    className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="24.99"
                      className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      List Compare Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={compareAtPrice}
                      onChange={(e) => setCompareAtPrice(e.target.value)}
                      placeholder="29.99"
                      className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Color
                    </label>
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="Blue"
                      className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Size
                    </label>
                    <input
                      type="text"
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      placeholder="L"
                      className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Weight (Kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="0.2"
                      className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Seed Inventory (Qty)
                  </label>
                  <input
                    type="number"
                    required
                    value={inventoryQuantity}
                    onChange={(e) => setInventoryQuantity(e.target.value)}
                    placeholder="100"
                    className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Images URLs (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={imagesInput}
                    onChange={(e) => setImagesInput(e.target.value)}
                    placeholder="/img/1.png, /img/2.png"
                    className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Videos URLs (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={videosInput}
                    onChange={(e) => setVideosInput(e.target.value)}
                    placeholder="https://youtube.com/embed/..."
                    className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex h-10 w-full items-center justify-center rounded-lg bg-zinc-900 font-semibold text-white shadow hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {formLoading ? "Creating..." : "Save Variant"}
                </button>
              </form>
            </div>
          </div>

          {/* 2. Existing Variants List Column */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="py-20 text-center text-zinc-500">
                Fetching variants catalog...
              </div>
            ) : variants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-zinc-500">No variants exist for this product. Use the form to add one.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="border-b border-gray-100 bg-gray-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Active Catalog SKUs
                  </h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {variants.map((v) => {
                    const attrs = v.variantAttributes ? JSON.parse(v.variantAttributes) : {}
                    const images = v.images ? JSON.parse(v.images) : []
                    const stock = v.inventories.reduce((acc, inv) => acc + inv.quantityAvailable, 0)

                    return (
                      <div key={v.id} className="p-4 hover:bg-gray-50/30 dark:hover:bg-zinc-800/10">
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-50">
                                {v.sku}
                              </span>
                              {v.barcode && (
                                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-2xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                  Barcode: {v.barcode}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-450">
                              <span>Price: <strong>${v.price.toFixed(2)}</strong></span>
                              {v.compareAtPrice && (
                                <span className="line-through">List: ${v.compareAtPrice.toFixed(2)}</span>
                              )}
                              {attrs.color && <span>Color: <strong>{attrs.color}</strong></span>}
                              {attrs.size && <span>Size: <strong>{attrs.size}</strong></span>}
                              {v.weightKg > 0 && <span>Weight: {v.weightKg}Kg</span>}
                            </div>
                            {images.length > 0 && (
                              <div className="mt-2 flex gap-1">
                                {images.map((img: string, idx: number) => (
                                  <span key={idx} className="rounded border border-gray-100 px-1 py-0.5 text-3xs text-zinc-450 dark:border-zinc-800">
                                    Img {idx + 1}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* Stock Indicator */}
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className={`block text-sm font-bold ${
                                stock > 0 ? "text-green-600 dark:text-green-400" : "text-red-500"
                              }`}>
                                {stock} units
                              </span>
                              <span className="text-3xs uppercase tracking-wider text-zinc-400">
                                Available stock
                              </span>
                            </div>
                          </div>

                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
