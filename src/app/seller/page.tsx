"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface Analytics {
  revenue: number
  totalOrders: number
  totalItemsSold: number
  activeStock: number
  totalCustomers: number
}

interface OrderItem {
  id: string
  quantity: number
  price: number
  sku: string
  productName: string
}

interface Order {
  id: string
  email: string
  status: string
  paymentStatus: string
  total: number
  createdAt: string
  user: { firstName: string; lastName: string; email: string } | null
  items: OrderItem[]
}

interface ProductVariant {
  id: string
  sku: string
  price: number
  inventories: Array<{ quantityAvailable: number }>
}

interface Product {
  id: string
  name: string
  slug: string
  brand: { name: string } | null
  categories: Array<{ category: { name: string } }>
  variants: ProductVariant[]
}

interface Review {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  product: { name: string; slug: string }
  user: { firstName: string; lastName: string } | null
}

export default function SellerDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  
  // Dashboard details state
  const [sellerName, setSellerName] = useState("")
  const [sellerEmail, setSellerEmail] = useState("")
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [inventory, setInventory] = useState<Product[]>([])
  const [returns, setReturns] = useState<Order[]>([])
  const [reviews, setReviews] = useState<Review[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Quick edit states for variant
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null)
  const [editingPrice, setEditingPrice] = useState("")
  const [editingStock, setEditingStock] = useState("")
  const [updatingVariant, setUpdatingVariant] = useState(false)

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/seller/dashboard")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load seller dashboard details")
      
      setSellerName(data.seller?.name || "")
      setSellerEmail(data.seller?.email || "")
      setAnalytics(data.analytics)
      setOrders(data.orders || [])
      setInventory(data.inventory || [])
      setReturns(data.returns || [])
      setReviews(data.reviews || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleUpdateVariant = async (productId: string, variantId: string) => {
    setUpdatingVariant(true)
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId,
          price: editingPrice ? parseFloat(editingPrice) : undefined,
          inventoryQuantity: editingStock ? parseInt(editingStock, 10) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update variant specifications")

      alert("Variant specifications updated successfully!")
      setEditingVariantId(null)
      fetchDashboardData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUpdatingVariant(false)
    }
  }

  const handleApproveReturn = async (orderId: string) => {
    if (!confirm("Are you sure you want to approve this return request? This will refund payment back to user wallet.")) return
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", status: "returned" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to approve return")

      alert("Return request approved and marked returned.")
      fetchDashboardData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDeclineReturn = async (orderId: string) => {
    if (!confirm("Are you sure you want to decline this return request?")) return
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", status: "delivered" }), // revert status back to delivered
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to decline return")

      alert("Return request declined.")
      fetchDashboardData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleExportReport = () => {
    if (!analytics) return
    const csvRows = [
      ["Nexora Seller Report - " + sellerName],
      ["Metric", "Value"],
      ["Total Payout Revenue", `$${analytics.revenue.toFixed(2)}`],
      ["Total Placed Orders", analytics.totalOrders],
      ["Total Items Dispatched", analytics.totalItemsSold],
      ["Unique Customer Volume", analytics.totalCustomers],
      ["Active Warehouse Stock", analytics.activeStock],
    ]
    const csvContent = "data:text/csv;charset=utf-8," 
      + csvRows.map(e => e.join(",")).join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `sales_report_${sellerName.toLowerCase().replace(/\s+/g, "_")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-zinc-550 dark:bg-zinc-950">
        Loading seller workspace panel...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl">
        
        {/* Dashboard Header Panel */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-gray-150 pb-6 dark:border-zinc-800">
          <div>
            <h1 className="font-sans text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              {sellerName}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Seller Profile: <strong>{sellerEmail}</strong> • Status: <span className="text-green-600 font-bold uppercase">Verified Merchant</span>
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push("/admin/products/new")}
              className="flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-xs font-semibold text-white shadow hover:bg-zinc-850 dark:bg-zinc-50 dark:text-zinc-900"
            >
              + Upload Product
            </button>
            <button
              onClick={() => router.push("/admin/products/bulk")}
              className="flex h-10 items-center justify-center rounded-lg border border-gray-250 bg-white px-4 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            >
              Bulk Import (CSV)
            </button>
            <button
              onClick={handleExportReport}
              className="flex h-10 items-center justify-center rounded-lg border border-indigo-150 bg-indigo-50/20 px-4 text-xs font-semibold text-indigo-750 hover:bg-indigo-50/40 dark:border-indigo-900 dark:text-indigo-400"
            >
              Export Report
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-6 flex gap-1 border-b border-gray-150 pb-px dark:border-zinc-850">
          {[
            { id: "overview", label: "Overview & Analytics" },
            { id: "orders", label: `Fulfillment Orders (${orders.length})` },
            { id: "inventory", label: "Catalog Inventory" },
            { id: "returns", label: `Returns Processing (${returns.length})` },
            { id: "reviews", label: "Customer Reviews" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-4 py-2.5 text-xs font-semibold tracking-wide transition-all ${
                activeTab === tab.id
                  ? "border-indigo-650 text-indigo-650 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview & Analytics */}
        {activeTab === "overview" && analytics && (
          <div className="space-y-6 animate-fade-in">
            {/* Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <span className="block text-3xs font-bold uppercase tracking-wider text-zinc-400">Total Revenue Earned</span>
                <span className="mt-2 block text-2xl font-black text-zinc-900 dark:text-zinc-50">${analytics.revenue.toFixed(2)}</span>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <span className="block text-3xs font-bold uppercase tracking-wider text-zinc-400">Orders Processed</span>
                <span className="mt-2 block text-2xl font-black text-zinc-900 dark:text-zinc-50">{analytics.totalOrders}</span>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <span className="block text-3xs font-bold uppercase tracking-wider text-zinc-400">Dispatched Items</span>
                <span className="mt-2 block text-2xl font-black text-zinc-900 dark:text-zinc-50">{analytics.totalItemsSold}</span>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <span className="block text-3xs font-bold uppercase tracking-wider text-zinc-400">Active Stock count</span>
                <span className="mt-2 block text-2xl font-black text-zinc-900 dark:text-zinc-50">{analytics.activeStock} units</span>
              </div>
            </div>

            {/* Top Products sold */}
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-gray-100 bg-gray-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <h3 className="font-bold text-zinc-850 dark:text-zinc-100 text-xs uppercase tracking-wider">Top Catalog Products</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-zinc-850">
                {inventory.slice(0, 4).map((p) => {
                  const categoriesStr = p.categories.map(c => c.category.name).join(", ")
                  return (
                    <div key={p.id} className="p-4 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-semibold text-zinc-850 dark:text-zinc-150">{p.name}</span>
                        <span className="block text-3xs text-zinc-400 font-mono">Category: {categoriesStr || "Uncategorized"}</span>
                      </div>
                      <span className="font-bold text-zinc-500">{p.variants.length} SKU Variants</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Orders Management */}
        {activeTab === "orders" && (
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800 text-xs">
              <thead className="bg-gray-50/50 dark:bg-zinc-900/50">
                <tr className="text-left font-semibold text-zinc-450 uppercase tracking-wider text-2xs">
                  <th className="px-6 py-3.5">Order Info</th>
                  <th className="px-6 py-3.5">Customer details</th>
                  <th className="px-6 py-3.5">Products purchased</th>
                  <th className="px-6 py-3.5 text-right">Revenue</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-850 bg-white dark:bg-zinc-900">
                {orders.map((o) => {
                  const customerName = o.user ? `${o.user.firstName} ${o.user.lastName}` : "Guest customer"
                  return (
                    <tr key={o.id} className="hover:bg-gray-50/30 dark:hover:bg-zinc-800/10">
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">#{o.id.substring(0, 8)}</span>
                        <span className="block text-3xs text-zinc-450">{new Date(o.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-250">{customerName}</span>
                        <span className="block text-3xs text-zinc-400 break-all">{o.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {o.items.map((item) => (
                            <p key={item.id} className="text-3xs text-zinc-550 dark:text-zinc-400">
                              {item.productName} (x{item.quantity})
                            </p>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                        ${o.items.reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider ${
                          o.status === "processing" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"
                        }`}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Inventory Catalog */}
        {activeTab === "inventory" && (
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800 text-xs">
              <thead className="bg-gray-50/50 dark:bg-zinc-900/50">
                <tr className="text-left font-semibold text-zinc-450 uppercase tracking-wider text-2xs">
                  <th className="px-6 py-3.5">Product Name</th>
                  <th className="px-6 py-3.5">SKU Variant</th>
                  <th className="px-6 py-3.5 text-right">Base Price</th>
                  <th className="px-6 py-3.5 text-center">Active Stock</th>
                  <th className="px-6 py-3.5 text-right">Quick Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-850 bg-white dark:bg-zinc-900">
                {inventory.flatMap((p) => 
                  p.variants.map((v) => {
                    const stock = v.inventories.reduce((acc, inv) => acc + inv.quantityAvailable, 0)
                    const isEditing = editingVariantId === v.id

                    return (
                      <tr key={v.id} className="hover:bg-gray-50/30 dark:hover:bg-zinc-800/10">
                        <td className="px-6 py-4 font-semibold text-zinc-850 dark:text-zinc-200">
                          {p.name}
                        </td>
                        <td className="px-6 py-4 font-mono text-3xs text-zinc-450">
                          {v.sku}
                        </td>
                        <td className="px-6 py-4 text-right font-medium">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editingPrice}
                              onChange={(e) => setEditingPrice(e.target.value)}
                              className="w-16 rounded border border-gray-200 px-1 py-0.5 text-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 text-right"
                            />
                          ) : (
                            `$${v.price.toFixed(2)}`
                          )}
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-zinc-800 dark:text-zinc-300">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editingStock}
                              onChange={(e) => setEditingStock(e.target.value)}
                              className="w-16 rounded border border-gray-200 px-1 py-0.5 text-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 text-center"
                            />
                          ) : (
                            `${stock} units`
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold">
                          {isEditing ? (
                            <div className="flex justify-end gap-2">
                              <button
                                disabled={updatingVariant}
                                onClick={() => handleUpdateVariant(p.id, v.id)}
                                className="text-3xs text-green-600 hover:underline"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingVariantId(null)}
                                className="text-3xs text-zinc-400 hover:underline"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingVariantId(v.id)
                                setEditingPrice(v.price.toString())
                                setEditingStock(stock.toString())
                              }}
                              className="text-3xs text-indigo-650 hover:underline dark:text-indigo-400"
                            >
                              Quick Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Returns Processing */}
        {activeTab === "returns" && (
          <div className="space-y-4">
            {returns.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-250 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-zinc-550">No return requests registered for your store catalog.</p>
              </div>
            ) : (
              returns.map((o) => (
                <div key={o.id} className="rounded-xl border border-gray-150 bg-white p-5 shadow-sm dark:border-zinc-850 dark:bg-zinc-900 text-xs">
                  <div className="flex justify-between items-center border-b border-gray-50 pb-2 dark:border-zinc-850">
                    <span className="font-bold font-mono">Return Request #{o.id.substring(0, 8)}</span>
                    <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-3xs font-semibold text-amber-700 dark:bg-amber-950/20">
                      {o.status.replace("_", " ")}
                    </span>
                  </div>
                  
                  <div className="py-3 space-y-1">
                    {o.items.map((item) => (
                      <p key={item.id} className="text-zinc-650 dark:text-zinc-400">
                        {item.productName} - SKU: {item.sku} (x{item.quantity})
                      </p>
                    ))}
                  </div>

                  {o.status === "return_requested" && (
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => handleApproveReturn(o.id)}
                        className="flex h-8 items-center justify-center rounded-lg bg-zinc-900 px-4 text-xs font-semibold text-white shadow hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
                      >
                        Approve Return & Refund
                      </button>
                      <button
                        onClick={() => handleDeclineReturn(o.id)}
                        className="flex h-8 items-center justify-center rounded-lg border border-gray-200 px-4 text-xs font-semibold text-zinc-600 hover:bg-gray-50 dark:border-zinc-800 dark:text-zinc-300"
                      >
                        Decline Return
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 5: Customer Reviews */}
        {activeTab === "reviews" && (
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-250 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-zinc-550">No customer feedback reviews left for your products yet.</p>
              </div>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 text-xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      Product: <strong>{r.product.name}</strong>
                    </span>
                    <span className="text-indigo-650 font-bold dark:text-indigo-400">
                      Rating: {"⭐".repeat(r.rating)} ({r.rating}/5)
                    </span>
                  </div>
                  <p className="text-zinc-650 dark:text-zinc-400 italic mb-2">
                    "{r.comment || "No comment provided."}"
                  </p>
                  <span className="block text-3xs text-zinc-450 text-right">
                    By: {r.user ? `${r.user.firstName} ${r.user.lastName}` : "Verified Shopper"} • {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  )
}
