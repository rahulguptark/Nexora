"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface ProductVariant {
  id: string
  sku: string
  price: number
}

interface Product {
  id: string
  name: string
  slug: string
  variants: ProductVariant[]
}

interface SimilarityEntry {
  userId: string
  similarity: number
}

export default function RecommendationsPlayground() {
  const router = useRouter()

  // Select active product context state
  const [productsList, setProductsList] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")

  // Recommendations data states
  const [frequentlyBought, setFrequentlyBought] = useState<Product[]>([])
  const [related, setRelated] = useState<Product[]>([])
  const [upsell, setUpsell] = useState<Product[]>([])
  const [crossSell, setCrossSell] = useState<Product[]>([])
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([])
  const [trending, setTrending] = useState<Product[]>([])
  const [popular, setPopular] = useState<Product[]>([])
  const [personalized, setPersonalized] = useState<Product[]>([])
  const [similarityMatrix, setSimilarityMatrix] = useState<SimilarityEntry[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Fetch initial product contexts list
  const fetchProductsContexts = async () => {
    try {
      const res = await fetch("/api/catalog/products")
      const data = await res.json()
      if (res.ok) {
        setProductsList(data.products || [])
        if (data.products?.length > 0) {
          setSelectedProductId(data.products[0].id)
        }
      }
    } catch (err) {
      console.error("Products load error:", err)
    }
  }

  // Load recommendations matching selection context
  const loadRecommendations = async (prodId: string) => {
    setError("")
    
    // Read recently viewed from localstorage
    let recentlyViewedIds: string[] = []
    try {
      const stored = localStorage.getItem("recently-viewed")
      if (stored) {
        recentlyViewedIds = JSON.parse(stored)
      }
      
      // Add current selection to recently viewed localStorage
      if (prodId && !recentlyViewedIds.includes(prodId)) {
        recentlyViewedIds.unshift(prodId)
        recentlyViewedIds = recentlyViewedIds.slice(0, 5) // limit to 5
        localStorage.setItem("recently-viewed", JSON.stringify(recentlyViewedIds))
      }
    } catch (err) {
      console.error("LocalStorage error:", err)
    }

    try {
      const queryParams = new URLSearchParams()
      if (prodId) queryParams.set("productId", prodId)
      if (recentlyViewedIds.length > 0) {
        queryParams.set("recentlyViewedIds", recentlyViewedIds.join(","))
      }

      const res = await fetch(`/api/catalog/recommendations?${queryParams.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to query recommendations engine")

      setFrequentlyBought(data.frequentlyBoughtTogether || [])
      setRelated(data.relatedProducts || [])
      setUpsell(data.upsell || [])
      setCrossSell(data.crossSell || [])
      setRecentlyViewed(data.recentlyViewed || [])
      setTrending(data.trending || [])
      setPopular(data.popular || [])
      setPersonalized(data.collaborativeFiltering || [])
      setSimilarityMatrix(data.similarityMatrix || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProductsContexts()
  }, [])

  useEffect(() => {
    if (selectedProductId) {
      loadRecommendations(selectedProductId)
    }
  }, [selectedProductId])

  const handleAddBundleToCart = async (bundleProducts: Product[]) => {
    try {
      const activeProd = productsList.find(p => p.id === selectedProductId)
      const allToBuy = activeProd ? [activeProd, ...bundleProducts] : bundleProducts

      for (const prod of allToBuy) {
        const variantId = prod.variants[0]?.id
        if (!variantId) continue

        await fetch("/api/catalog/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productVariantId: variantId, quantity: 1 }),
        })
      }

      alert("Bundle added to your cart successfully!")
      router.push("/cart")
    } catch (err: any) {
      alert("Failed to add bundle: " + err.message)
    }
  }

  const handleAddSingleToCart = async (variantId: string) => {
    try {
      const res = await fetch("/api/catalog/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productVariantId: variantId, quantity: 1 }),
      })
      if (!res.ok) throw new Error("Failed to add item to cart")
      alert("Item added to cart!")
      router.push("/cart")
    } catch (err: any) {
      alert(err.message)
    }
  }

  const activeProductObj = productsList.find(p => p.id === selectedProductId)

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl">
        
        {/* Header Block */}
        <div className="mb-8 border-b border-gray-150 pb-4 dark:border-zinc-800 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-sans text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Recommendation Engine Sandbox
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Test Frequently Bought Together, Upsells, and Collaborative Filtering matrices.
            </p>
          </div>

          {/* Product Simulator Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Simulate viewing:</span>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="flex h-9 rounded-lg border border-gray-250 bg-white px-3 text-xs font-semibold focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
            >
              {productsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (${p.variants[0]?.price.toFixed(2)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* Main Context recommendations grid */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* 1. Frequently Bought Together Bundle */}
            {activeProductObj && (
              <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-sm dark:border-zinc-850 dark:bg-zinc-900 space-y-4">
                <h3 className="font-sans text-sm font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-wider">
                  Frequently Bought Together
                </h3>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  
                  {/* Active Product Card */}
                  <div className="rounded-xl border border-gray-100 p-3 bg-gray-50/50 dark:border-zinc-800 dark:bg-zinc-950/20 text-xs flex-1">
                    <span className="text-3xs uppercase font-bold text-indigo-600 dark:text-indigo-400">Current Item</span>
                    <h4 className="font-semibold text-zinc-850 dark:text-zinc-100 mt-1">{activeProductObj.name}</h4>
                    <p className="font-bold text-zinc-900 dark:text-zinc-200 mt-2">${activeProductObj.variants[0]?.price.toFixed(2)}</p>
                  </div>

                  <span className="text-xl font-bold text-zinc-400 text-center sm:block">+</span>

                  {/* Bundle Product Card */}
                  {frequentlyBought.length > 0 ? (
                    frequentlyBought.map((fbProduct) => (
                      <div key={fbProduct.id} className="rounded-xl border border-gray-100 p-3 bg-gray-50/50 dark:border-zinc-800 dark:bg-zinc-950/20 text-xs flex-1">
                        <span className="text-3xs uppercase font-bold text-green-600">Co-Purchased Item</span>
                        <h4 className="font-semibold text-zinc-850 dark:text-zinc-100 mt-1">{fbProduct.name}</h4>
                        <p className="font-bold text-zinc-900 dark:text-zinc-200 mt-2">${fbProduct.variants[0]?.price.toFixed(2)}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-250 p-4 text-center text-3xs text-zinc-400 flex-1">
                      No matching purchase associations yet
                    </div>
                  )}

                  <div className="sm:pl-4 flex flex-col justify-center">
                    <button
                      onClick={() => handleAddBundleToCart(frequentlyBought)}
                      disabled={frequentlyBought.length === 0}
                      className="flex h-9 items-center justify-center rounded-lg bg-zinc-900 px-4 text-xs font-semibold text-white shadow hover:bg-zinc-850 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
                    >
                      Buy Bundle Packages
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Upsells & Cross-sells columns */}
            <div className="grid gap-6 sm:grid-cols-2">
              
              {/* Upsell Alternatives (Higher price, same category) */}
              <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-sm dark:border-zinc-850 dark:bg-zinc-900">
                <h3 className="font-sans text-xs font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-wider mb-4">
                  Premium Upsell Options
                </h3>
                {upsell.length === 0 ? (
                  <p className="text-3xs text-zinc-400 text-center py-6">No higher-priced alternative products found in this category.</p>
                ) : (
                  <div className="space-y-3">
                    {upsell.map((prod) => (
                      <div key={prod.id} className="flex justify-between items-center text-xs">
                        <div>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{prod.name}</span>
                          <span className="block text-3xs text-green-600 font-bold mt-0.5">${prod.variants[0]?.price.toFixed(2)}</span>
                        </div>
                        <button
                          onClick={() => handleAddSingleToCart(prod.variants[0].id)}
                          className="text-3xs text-indigo-650 hover:underline dark:text-indigo-400"
                        >
                          Upgrade &rsaquo;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cross-sell Accessories (Complementary categories) */}
              <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-sm dark:border-zinc-850 dark:bg-zinc-900">
                <h3 className="font-sans text-xs font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-wider mb-4">
                  Frequently Cross-Sold Accessories
                </h3>
                {crossSell.length === 0 ? (
                  <p className="text-3xs text-zinc-400 text-center py-6">No cross-sell category recommendations available.</p>
                ) : (
                  <div className="space-y-3">
                    {crossSell.map((prod) => (
                      <div key={prod.id} className="flex justify-between items-center text-xs">
                        <div>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{prod.name}</span>
                          <span className="block text-3xs text-zinc-400 mt-0.5">${prod.variants[0]?.price.toFixed(2)}</span>
                        </div>
                        <button
                          onClick={() => handleAddSingleToCart(prod.variants[0].id)}
                          className="text-3xs text-indigo-650 hover:underline dark:text-indigo-400"
                        >
                          Add Accessory &rsaquo;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* 3. Related Products Slider view */}
            <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-sm dark:border-zinc-850 dark:bg-zinc-900">
              <h3 className="font-sans text-xs font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-wider mb-4">
                Customers Also Viewed (Related)
              </h3>
              <div className="grid gap-4 sm:grid-cols-4">
                {related.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => setSelectedProductId(prod.id)}
                    className="cursor-pointer rounded-xl border border-gray-100 p-3 hover:border-indigo-500 text-center text-xs bg-gray-50/20 dark:border-zinc-850"
                  >
                    <span className="block font-semibold text-zinc-800 dark:text-zinc-250 truncate">{prod.name}</span>
                    <span className="block font-bold text-zinc-900 dark:text-zinc-200 mt-1">${prod.variants[0]?.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Sidebar blocks: Personalized CF & Telemetries */}
          <div className="space-y-6">
            
            {/* 1. Personalized Recommendations */}
            <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-sm dark:border-zinc-850 dark:bg-zinc-900 space-y-4">
              <h3 className="font-sans text-xs font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-wider">
                Personalized Recommendations
              </h3>
              <div className="space-y-3">
                {personalized.map((prod) => (
                  <div key={prod.id} className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{prod.name}</span>
                      <span className="block text-3xs text-zinc-450">${prod.variants[0]?.price.toFixed(2)}</span>
                    </div>
                    <button
                      onClick={() => handleAddSingleToCart(prod.variants[0].id)}
                      className="text-3xs text-indigo-650 hover:underline dark:text-indigo-400"
                    >
                      Buy &rsaquo;
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Jaccard Similarity Matrix details */}
            <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-sm dark:border-zinc-850 dark:bg-zinc-900 space-y-4">
              <h3 className="font-sans text-xs font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-wider">
                Collaborative Filtering Matrix
              </h3>
              <p className="text-3xs text-zinc-450 leading-relaxed">
                Platform-wide shopper purchase correlation computed via Jaccard index coefficients mapping overlaps.
              </p>
              {similarityMatrix.length === 0 ? (
                <div className="rounded-xl bg-gray-50/50 p-4 border border-gray-100 text-center text-3xs text-zinc-400">
                  No other active users profiles found to calculate similarity coefficients.
                </div>
              ) : (
                <div className="space-y-2">
                  {similarityMatrix.map((item) => (
                    <div key={item.userId} className="flex justify-between items-center text-3xs rounded bg-gray-50 p-2 dark:bg-zinc-950">
                      <span className="font-mono text-zinc-550 truncate max-w-[140px]">Customer: {item.userId}</span>
                      <span className="font-bold text-indigo-650 dark:text-indigo-400">{(item.similarity * 100).toFixed(0)}% Match</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Recently Viewed list */}
            {recentlyViewed.length > 0 && (
              <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-sm dark:border-zinc-850 dark:bg-zinc-900 space-y-4">
                <h3 className="font-sans text-xs font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-wider">
                  Recently Viewed Items
                </h3>
                <div className="space-y-3">
                  {recentlyViewed.map((prod) => (
                    <div key={prod.id} className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[180px]">{prod.name}</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-200">${prod.variants[0]?.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  )
}
