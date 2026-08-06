"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  isActive: boolean
  visibility: string
  createdAt: string
  brand: { name: string } | null
  categories: Array<{ category: { name: string } }>
  variants: Array<{ price: number; sku: string }>
}

export default function AdminProductCatalog() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Search & Filter state
  const [search, setSearch] = useState("")
  const [visibilityFilter, setVisibilityFilter] = useState("all")

  const fetchProducts = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/products")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load products")
      setProducts(data.products || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to toggle status")
      fetchProducts()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this product and all associated variants?")) return
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete product")
      fetchProducts()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.slug.toLowerCase().includes(search.toLowerCase())
    const matchesVisibility = visibilityFilter === "all" || p.visibility === visibilityFilter
    return matchesSearch && matchesVisibility
  })

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl">
        
        {/* Header Section */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-sans text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Product Management
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Create, organize, configure variants, and manage inventory.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/admin/products/bulk")}
              className="flex h-11 items-center justify-center rounded-lg border border-gray-250 bg-white px-4 font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Bulk Upload (CSV)
            </button>
            <button
              onClick={() => router.push("/admin/products/new")}
              className="flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-5 font-semibold text-white shadow transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              + Create Product
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search products by name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="all">All Visibilities</option>
              <option value="public">Public</option>
              <option value="hidden">Hidden</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Products Table */}
        {loading ? (
          <div className="py-20 text-center text-zinc-500 dark:text-zinc-400">
            Loading your product catalog...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white py-20 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-zinc-500 dark:text-zinc-450">No products found matching filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800">
              <thead className="bg-gray-50/50 dark:bg-zinc-900/50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Product Info
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Brand & Categories
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Visibility
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Status
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Variants
                  </th>
                  <th className="relative px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
                {filteredProducts.map((p) => {
                  const categoriesStr = p.categories.map(c => c.category.name).join(", ") || "Uncategorized"
                  const prices = p.variants.map(v => v.price)
                  const minPrice = prices.length > 0 ? Math.min(...prices) : 0
                  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/30 dark:hover:bg-zinc-800/10">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                            {p.name}
                          </span>
                          <span className="text-xs text-zinc-450 dark:text-zinc-500">
                            /{p.slug}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            {p.brand?.name || "Generic"}
                          </span>
                          <span className="text-xs text-zinc-450 dark:text-zinc-500">
                            {categoriesStr}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                          p.visibility === "public"
                            ? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
                            : p.visibility === "hidden"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                            : "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}>
                          {p.visibility}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <button
                          onClick={() => handleToggleActive(p.id, p.isActive)}
                          className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold shadow-sm transition-all hover:scale-[0.98] ${
                            p.isActive
                              ? "bg-indigo-650 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-350 dark:hover:bg-zinc-700"
                          }`}
                        >
                          {p.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {p.variants.length} Variants
                          </span>
                          <span className="text-xs text-zinc-450 dark:text-zinc-500">
                            {p.variants.length > 0 
                              ? `$${minPrice.toFixed(2)}${minPrice !== maxPrice ? ` - $${maxPrice.toFixed(2)}` : ""}`
                              : "No pricing"
                            }
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => router.push(`/admin/products/${p.id}/variants`)}
                            className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                          >
                            Manage Variants
                          </button>
                          <button
                            onClick={() => router.push(`/admin/products/new?id=${p.id}`)}
                            className="text-xs text-zinc-600 hover:underline dark:text-zinc-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="text-xs text-red-600 hover:underline dark:text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}
