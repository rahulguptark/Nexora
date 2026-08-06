"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface Shipment {
  id: string
  carrier: string | null
  trackingNumber: string | null
  status: string
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
  shippingAddress: string
  shippingMethod: string
  paymentMethod: string
  paymentStatus: string
  subtotal: number
  discount: number
  shippingFee: number
  tax: number
  total: number
  status: string
  createdAt: string
  items: OrderItem[]
  shipments: Shipment[]
}

interface OrderNotification {
  id: string
  title: string
  message: string
  createdAt: string
}

export default function UserOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [notifications, setNotifications] = useState<OrderNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Guest lookup email state
  const [guestEmail, setGuestEmail] = useState("")

  const fetchUserOrders = async (emailSearch = "") => {
    setLoading(true)
    setError("")
    try {
      const url = emailSearch 
        ? `/api/catalog/orders?email=${encodeURIComponent(emailSearch)}`
        : "/api/catalog/orders"
      
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load orders")
      
      setOrders(data.orders || [])
      setNotifications(data.notifications || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserOrders()
  }, [])

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order? This will refund payment back to your wallet.")) return
    try {
      const res = await fetch("/api/catalog/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "cancel" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Cancellation request failed")

      alert("Order cancelled successfully!")
      fetchUserOrders(guestEmail)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleRequestReturn = async (orderId: string) => {
    if (!confirm("Are you sure you want to submit a return request for this order?")) return
    try {
      const res = await fetch("/api/catalog/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "return" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Return submission failed")

      alert("Return request submitted! Please wait for administrative approval.")
      fetchUserOrders(guestEmail)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleGuestSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestEmail.trim()) {
      alert("Please input your purchase email address first")
      return
    }
    fetchUserOrders(guestEmail)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl">
        
        {/* Header */}
        <div className="mb-8 border-b border-gray-150 pb-4 dark:border-zinc-800 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-sans text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Your Orders
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Track active package shipments, manage returns, and view logs.
            </p>
          </div>
          
          {/* Guest Lookup Form */}
          <form onSubmit={handleGuestSearch} className="flex gap-2">
            <input
              type="email"
              placeholder="Or search by Guest Email..."
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="flex h-9 w-52 rounded-lg border border-gray-200 bg-white px-2.5 text-xs focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <button
              type="submit"
              className="flex h-9 items-center justify-center rounded-lg bg-zinc-900 px-3 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
            >
              Lookup
            </button>
          </form>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Alerts / Notifications Banner on Top */}
        {notifications.length > 0 && (
          <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/20 p-5 dark:border-indigo-900/30">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-300">
              Notifications & Alerts
            </h3>
            <div className="space-y-3">
              {notifications.map((n) => (
                <div key={n.id} className="text-xs text-indigo-900 dark:text-indigo-400">
                  <strong>{n.title}</strong>: {n.message} 
                  <span className="ml-2 text-3xs text-zinc-400 font-normal">
                    ({new Date(n.createdAt).toLocaleDateString()})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders List */}
        {loading ? (
          <div className="py-20 text-center text-zinc-500">
            Loading order tracking records...
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-250 bg-white py-20 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">No Orders Found</h3>
            <p className="mt-2 text-xs text-zinc-500">You haven't placed any orders yet. Explore our sustainable clothes!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((o) => {
              const formattedDate = new Date(o.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })

              return (
                <div key={o.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  
                  {/* Order Top Panel Header */}
                  <div className="bg-gray-50/50 px-6 py-4 dark:bg-zinc-900/50 border-b border-gray-50 dark:border-zinc-850 flex flex-col justify-between gap-4 sm:flex-row sm:items-center text-xs">
                    <div>
                      <p className="text-zinc-450 uppercase tracking-wider text-3xs font-bold">Order Number</p>
                      <p className="font-mono font-bold text-zinc-800 dark:text-zinc-200">#{o.id}</p>
                    </div>
                    <div>
                      <p className="text-zinc-450 uppercase tracking-wider text-3xs font-bold">Placed On</p>
                      <p className="font-bold text-zinc-800 dark:text-zinc-200">{formattedDate}</p>
                    </div>
                    <div>
                      <p className="text-zinc-450 uppercase tracking-wider text-3xs font-bold">Total Charged</p>
                      <p className="font-bold text-zinc-800 dark:text-zinc-200">${o.total.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-450 uppercase tracking-wider text-3xs font-bold">Fulfillment Status</p>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-3xs font-bold uppercase tracking-wider ${
                        o.status === "processing"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/20"
                          : o.status === "shipped" || o.status === "delivered"
                          ? "bg-green-50 text-green-700 dark:bg-green-950/20"
                          : "bg-red-50 text-red-700 dark:bg-red-950/20"
                      }`}>
                        {o.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Order items lists */}
                  <div className="p-6 divide-y divide-gray-50 dark:divide-zinc-850">
                    {o.items.map((item) => (
                      <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{item.productName}</span>
                          <span className="block text-3xs text-zinc-450">SKU: {item.sku} • Qty: {item.quantity}</span>
                        </div>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Shipments tracking details if active */}
                  {o.shipments.length > 0 && (
                    <div className="mx-6 mb-6 rounded-xl border border-gray-100 bg-gray-50/20 p-4 dark:border-zinc-800 text-xs">
                      <h4 className="mb-2 text-3xs font-bold uppercase tracking-wider text-zinc-450">
                        Dispatched Shipments packages
                      </h4>
                      <div className="space-y-3">
                        {o.shipments.map((s) => (
                          <div key={s.id} className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-zinc-700 dark:text-zinc-300">{s.carrier}</p>
                              <p className="text-3xs text-zinc-400 font-mono">Tracking: {s.trackingNumber}</p>
                            </div>
                            <span className="text-3xs font-bold uppercase tracking-wider text-green-600">
                              Status: {s.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customer self-service action footer buttons */}
                  <div className="bg-gray-50/30 px-6 py-4 dark:bg-zinc-900/10 border-t border-gray-50 dark:border-zinc-850 flex justify-between gap-3">
                    <button
                      onClick={() => router.push(`/checkout/confirmation?orderId=${o.id}`)}
                      className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      View Invoice Receipt &rsaquo;
                    </button>
                    <div className="flex gap-2">
                      <button
                        disabled={o.status !== "processing"}
                        onClick={() => handleCancelOrder(o.id)}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50/50 disabled:opacity-40 dark:border-red-900 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                      >
                        Cancel Order
                      </button>
                      <button
                        disabled={o.status !== "delivered"}
                        onClick={() => handleRequestReturn(o.id)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-gray-50 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-350"
                      >
                        Request Return
                      </button>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
