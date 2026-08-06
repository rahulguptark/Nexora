"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"

export default function BulkUploadPage() {
  const router = useRouter()
  const [csvContent, setCsvContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [uploadedSkus, setUploadedSkus] = useState<string[]>([])

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvContent.trim()) {
      setError("Please paste some CSV content first")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")
    setUploadedSkus([])

    try {
      const res = await fetch("/api/admin/products/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Bulk upload failed")

      setSuccess(data.message || "Successfully uploaded products!")
      setUploadedSkus(data.skus || [])
      setCsvContent("")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const sampleCSV = `name,slug,description,brand,categories,sku,barcode,price,compareAtPrice,weight,color,size,inventory,images,videos,tags,seoTitle,seoDescription,seoKeywords,visibility
Premium Eco Hoodie,premium-eco-hoodie,Organic warm hood,GreenWear,"Apparel, Outerwear",HOOD-ECO-BLU-M,880123456781,49.99,59.99,0.5,Blue,M,150,"/img/h1.png,/img/h2.png","https://youtube.com/embed/123","sustainable,hoodie",Premium Eco Hoodie - GreenWear,Comfortable organic cotton hoodie,eco hoodie greenwear,public
Premium Eco Hoodie,premium-eco-hoodie,Organic warm hood,GreenWear,"Apparel, Outerwear",HOOD-ECO-BLU-L,880123456782,49.99,59.99,0.52,Blue,L,100,"/img/h1.png,/img/h2.png","https://youtube.com/embed/123","sustainable,hoodie",Premium Eco Hoodie - GreenWear,Comfortable organic cotton hoodie,eco hoodie greenwear,public`

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl">
        
        {/* Header */}
        <div className="mb-8 border-b border-gray-150 pb-4 dark:border-zinc-800">
          <button
            onClick={() => router.push("/admin/products")}
            className="mb-2 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            &larr; Back to Products
          </button>
          <h1 className="font-sans text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            CSV Bulk Product Upload
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Import multiple products and variants in a single transaction.
          </p>
        </div>

        {/* Info Box */}
        <div className="mb-6 rounded-lg bg-indigo-50/50 p-4 text-sm text-indigo-800 dark:bg-indigo-950/20 dark:text-indigo-300">
          <strong>Database Integrity Notice:</strong> All bulk uploads run inside an interactive transaction. 
          If a single row contains validation errors (like duplicated SKUs/Barcodes) or fails to parse, 
          the entire sequence rolls back automatically.
        </div>

        {/* Error / Success alert */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            <strong>Upload Failed:</strong> {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-400">
            {success}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Paste Area Form */}
          <div className="md:col-span-2 space-y-4">
            <form onSubmit={handleBulkUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  CSV Raw Content
                </label>
                <textarea
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder="name,slug,description,brand,categories,sku,price..."
                  rows={12}
                  className="mt-1 flex w-full rounded-lg border border-gray-200 bg-white p-3 font-mono text-xs focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 font-semibold text-white shadow hover:bg-zinc-800 disabled:opacity-50 active:scale-[0.98] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {loading ? "Processing transaction..." : "Parse & Import CSV"}
              </button>
            </form>

            {uploadedSkus.length > 0 && (
              <div className="rounded-xl border border-gray-150 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Successfully Imported SKUs ({uploadedSkus.length})
                </h3>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {uploadedSkus.map((sku) => (
                    <span key={sku} className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {sku}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sample template */}
          <div className="md:col-span-1">
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                CSV Template
              </h3>
              <p className="mb-3 text-xs text-zinc-500">
                Ensure headers match precisely. Comma-separated category strings must be surrounded by double quotes.
              </p>
              <textarea
                readOnly
                value={sampleCSV}
                rows={10}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                className="w-full rounded-lg border border-gray-150 bg-gray-50/50 p-2 font-mono text-3xs text-zinc-650 cursor-pointer focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400"
              />
              <span className="mt-2 block text-center text-3xs text-zinc-400">
                (Click text to select all and copy)
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
