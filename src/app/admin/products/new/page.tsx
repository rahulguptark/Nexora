"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function ProductForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get("id")

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [brandName, setBrandName] = useState("")
  const [categoryNamesInput, setCategoryNamesInput] = useState("")
  const [visibility, setVisibility] = useState("public")
  const [isActive, setIsActive] = useState(true)

  // SEO Fields
  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")
  const [seoKeywords, setSeoKeywords] = useState("")

  // Tags & Recommendations
  const [tagsInput, setTagsInput] = useState("")
  const [recommendationsInput, setRecommendationsInput] = useState("")

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (productId) {
      setFetching(true)
      fetch(`/api/admin/products/${productId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.product) {
            const p = data.product
            setName(p.name || "")
            setSlug(p.slug || "")
            setDescription(p.description || "")
            setBrandName(p.brand?.name || "")
            setCategoryNamesInput(p.categories.map((c: any) => c.category.name).join(", "))
            setVisibility(p.visibility || "public")
            setIsActive(p.isActive !== undefined ? p.isActive : true)
            setSeoTitle(p.seoTitle || "")
            setSeoDescription(p.seoDescription || "")
            setSeoKeywords(p.seoKeywords || "")
            setTagsInput(p.tags ? JSON.parse(p.tags).join(", ") : "")
            setRecommendationsInput(p.recommendations ? JSON.parse(p.recommendations).join(", ") : "")
          } else {
            setError(data.error || "Failed to load product info")
          }
        })
        .catch(err => setError(err.message))
        .finally(() => setFetching(false))
    }
  }, [productId])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setName(val)
    if (!productId) {
      // Auto slugify name when creating new product
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    const categoryNames = categoryNamesInput.split(",").map(c => c.trim()).filter(Boolean)
    const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean)
    const recommendations = recommendationsInput.split(",").map(r => r.trim()).filter(Boolean)

    const payload = {
      name,
      slug,
      description,
      brandName,
      categoryNames,
      visibility,
      isActive,
      seoTitle: seoTitle || undefined,
      seoDescription: seoDescription || undefined,
      seoKeywords: seoKeywords || undefined,
      tags,
      recommendations,
    }

    try {
      const url = productId ? `/api/admin/products/${productId}` : "/api/admin/products"
      const method = productId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Submission failed")

      setSuccess(`Product successfully ${productId ? "updated" : "created"}! Redirecting...`)
      setTimeout(() => {
        router.push("/admin/products")
      }, 1500)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="py-20 text-center text-zinc-500">
        Fetching product information...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-gray-100 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
      
      {/* Title */}
      <div className="mb-8 border-b border-gray-100 pb-4 dark:border-zinc-800">
        <h1 className="font-sans text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {productId ? "Edit Product" : "New Product"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Configure product catalogs, tagging structure, and search settings.
        </p>
      </div>

      {/* Feedback Alerts */}
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Core Product Fields */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-650 dark:text-indigo-400">
            Basic Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Product Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={handleNameChange}
                placeholder="Eco Cotton T-Shirt"
                className="mt-1 flex h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                URL Slug
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="eco-cotton-t-shirt"
                className="mt-1 flex h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Brand Name
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="GreenWear"
                className="mt-1 flex h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Categories (comma-separated)
              </label>
              <input
                type="text"
                value={categoryNamesInput}
                onChange={(e) => setCategoryNamesInput(e.target.value)}
                placeholder="Apparel, Clothing, Men"
                className="mt-1 flex h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the product..."
              rows={4}
              className="mt-1 flex w-full rounded-lg border border-gray-200 bg-transparent p-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Visibility Status
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="mt-1 flex h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              >
                <option value="public">Public (Visible to everyone)</option>
                <option value="hidden">Hidden (Available via link only)</option>
                <option value="draft">Draft (Admin eyes only)</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-650 focus:ring-indigo-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Product is active & publishable
              </label>
            </div>
          </div>
        </div>

        {/* SEO Parameters */}
        <div className="space-y-4 border-t border-gray-100 pt-6 dark:border-zinc-800">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-650 dark:text-indigo-400">
            SEO Index Optimization
          </h2>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              SEO Title Tag
            </label>
            <input
              type="text"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="Eco Cotton T-Shirt | Premium Organic Clothes"
              className="mt-1 flex h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              SEO Meta Description
            </label>
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="High quality organic cotton shirt for daily wear. Available in multiple sizes..."
              rows={2}
              className="mt-1 flex w-full rounded-lg border border-gray-200 bg-transparent p-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              SEO Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={seoKeywords}
              onChange={(e) => setSeoKeywords(e.target.value)}
              placeholder="cotton shirt, organic clothes, sustainable fashion"
              className="mt-1 flex h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
            />
          </div>
        </div>

        {/* Tags & Recommendations */}
        <div className="space-y-4 border-t border-gray-100 pt-6 dark:border-zinc-800">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-650 dark:text-indigo-400">
            Metadata & Recommendations
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Marketing Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="new-arrival, best-seller, summer-deal"
                className="mt-1 flex h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Recommended Product IDs (comma-separated)
              </label>
              <input
                type="text"
                value={recommendationsInput}
                onChange={(e) => setRecommendationsInput(e.target.value)}
                placeholder="id-1, id-2, id-3"
                className="mt-1 flex h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-6 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => router.push("/admin/products")}
            className="flex h-11 items-center justify-center rounded-lg border border-gray-255 bg-white px-5 font-semibold text-zinc-700 shadow-sm hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-6 font-semibold text-white shadow hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "Submitting..." : productId ? "Save Changes" : "Create Product"}
          </button>
        </div>

      </form>
    </div>
  )
}

export default function NewProductWizard() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 dark:bg-zinc-950">
      <Suspense fallback={
        <div className="text-center py-20 text-zinc-500">
          Loading wizard configuration...
        </div>
      }>
        <ProductForm />
      </Suspense>
    </div>
  )
}
