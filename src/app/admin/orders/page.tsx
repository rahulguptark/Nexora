"use client"

import React, { useState, useEffect } from "react"

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
  shipmentId: string | null
}

interface Order {
  id: string
  email: string
  shippingAddress: string
  billingAddress: string
  shippingMethod: string
  paymentMethod: string
  paymentStatus: string
  paymentIntentId: string | null
  subtotal: number
  discount: number
  shippingFee: number
  tax: number
  total: number
  status: string
  createdAt: string
  user: { firstName: string; lastName: string; email: string } | null
  items: OrderItem[]
  shipments: Shipment[]
}

export default function AdminOrderPanel() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedOrderNotifications, setSelectedOrderNotifications] = useState<any[]>([])

  // Split Shipment wizard form states
  const [shipmentCarrier, setShipmentCarrier] = useState("FedEx")
  const [shipmentTracking, setShipmentTracking] = useState("")
  const [selectedItemsForShipment, setSelectedItemsForShipment] = useState<string[]>([])

  // Partial Refund states
  const [selectedItemsForRefund, setSelectedItemsForRefund] = useState<string[]>([])

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/admin/orders")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load orders")
      setOrders(data.orders || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrderDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`)
      const data = await res.json()
      if (res.ok) {
        setSelectedOrder(data.order)
        setSelectedOrderNotifications(data.notifications || [])
        // reset form fields
        setShipmentTracking("")
        setSelectedItemsForShipment([])
        setSelectedItemsForRefund([])
      }
    } catch (err: any) {
      alert("Failed to load details: " + err.message)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Update status failed")
      
      fetchOrders()
      fetchOrderDetails(id)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleCancelOrder = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this order and issue a full wallet refund?")) return
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Cancellation failed")
      
      fetchOrders()
      fetchOrderDetails(id)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleCreateSplitShipment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrder) return
    if (!shipmentTracking.trim()) {
      alert("Please input a carrier tracking code first")
      return
    }

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/shipments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrier: shipmentCarrier,
          trackingNumber: shipmentTracking,
          itemIds: selectedItemsForShipment,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Split shipment creation failed")

      alert("Split shipment successfully dispatched!")
      fetchOrders()
      fetchOrderDetails(selectedOrder.id)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleProcessRefund = async (type: "full" | "partial") => {
    if (!selectedOrder) return
    const isPartial = type === "partial"
    
    if (isPartial && selectedItemsForRefund.length === 0) {
      alert("Please check the items to issue a partial refund for first")
      return
    }

    const msg = isPartial 
      ? "Are you sure you want to issue a partial refund for the selected items?"
      : "Are you sure you want to issue a full order refund and cancel?"
    
    if (!confirm(msg)) return

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refund",
          refundItemIds: isPartial ? selectedItemsForRefund : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Refund failed")

      alert(data.message)
      fetchOrders()
      fetchOrderDetails(selectedOrder.id)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const toggleShipmentItemSelection = (id: string) => {
    setSelectedItemsForShipment(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const toggleRefundItemSelection = (id: string) => {
    setSelectedItemsForRefund(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl">
        
        {/* Header */}
        <div className="mb-8 border-b border-gray-150 pb-4 dark:border-zinc-800">
          <h1 className="font-sans text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Order Fulfillment Board
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Process splits, tracking coordinates, cancellations, and refunds.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* 1. Orders List */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
              Orders Listing
            </h3>
            {loading ? (
              <div className="py-12 text-center text-zinc-550">
                Loading orders database...
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-250 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-zinc-400 text-sm">No orders registered yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {orders.map((o) => {
                  const name = o.user ? `${o.user.firstName} ${o.user.lastName}` : "Guest Checkout"
                  const isSelected = selectedOrder?.id === o.id

                  return (
                    <div
                      key={o.id}
                      onClick={() => fetchOrderDetails(o.id)}
                      className={`cursor-pointer rounded-xl border p-4 transition-all ${
                        isSelected 
                          ? "border-indigo-650 bg-indigo-50/20 dark:border-indigo-400" 
                          : "border-gray-150 bg-white hover:border-gray-300 dark:border-zinc-850 dark:bg-zinc-900"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-2xs font-bold text-zinc-900 dark:text-zinc-100">
                          #{o.id.substring(0, 8)}
                        </span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-3xs font-bold uppercase tracking-wider ${
                          o.status === "processing"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/20"
                            : o.status === "shipped" || o.status === "delivered"
                            ? "bg-green-50 text-green-700 dark:bg-green-950/20"
                            : "bg-red-50 text-red-700 dark:bg-red-950/20"
                        }`}>
                          {o.status}
                        </span>
                      </div>
                      <h4 className="mt-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {name}
                      </h4>
                      <div className="mt-3 flex justify-between items-center text-3xs text-zinc-400 font-semibold uppercase tracking-wider">
                        <span>{o.paymentMethod} • {o.paymentStatus}</span>
                        <span className="text-zinc-700 dark:text-zinc-300">${o.total.toFixed(2)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 2. Order Details & Admin Actions */}
          <div className="lg:col-span-2 space-y-6">
            {selectedOrder ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-6">
                
                {/* Details Header */}
                <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-4 sm:flex-row sm:items-center dark:border-zinc-850">
                  <div>
                    <h3 className="font-sans text-lg font-bold text-zinc-900 dark:text-zinc-50">
                      Order Details #{selectedOrder.id.substring(0, 8)}
                    </h3>
                    <p className="mt-0.5 text-xs text-zinc-450">
                      Placed by: <strong>{selectedOrder.email}</strong>
                    </p>
                  </div>
                  
                  {/* Status updates select */}
                  <div className="flex items-center gap-2">
                    <span className="text-2xs font-bold uppercase tracking-wider text-zinc-400">Fulfillment Status</span>
                    <select
                      value={selectedOrder.status}
                      onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                      className="flex h-8 rounded border border-gray-200 bg-white px-2 text-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                    >
                      <option value="processing">Processing</option>
                      <option value="ready_for_pickup">Ready for Pickup</option>
                      <option value="shipped">Shipped</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="return_requested">Return Requested</option>
                      <option value="returned">Returned</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Items Purchased list */}
                <div>
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Ordered items
                  </h4>
                  <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-zinc-850 dark:border-zinc-800">
                    {selectedOrder.items.map((item) => {
                      const isShipped = item.shipmentId !== null
                      return (
                        <div key={item.id} className="p-3 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{item.productName}</span>
                            <span className="block text-3xs text-zinc-450">SKU: {item.sku} • Qty: {item.quantity}</span>
                            {isShipped && (
                              <span className="inline-flex mt-1 rounded bg-green-50 px-1.5 py-0.5 text-3xs font-semibold text-green-700 dark:bg-green-950/20">
                                ✓ Packed & Dispatched
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-zinc-900 dark:text-zinc-150">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Split Shipment Creation wizard */}
                {selectedOrder.items.some(i => i.shipmentId === null) && selectedOrder.status !== "cancelled" && (
                  <div className="rounded-xl border border-dashed border-gray-200 p-4 dark:border-zinc-800">
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Dispatched Shipment Split wizard
                    </h4>
                    <form onSubmit={handleCreateSplitShipment} className="space-y-4">
                      
                      {/* Checkboxes to select items */}
                      <div>
                        <span className="block text-3xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                          Select Items to split/ship
                        </span>
                        <div className="space-y-2">
                          {selectedOrder.items.filter(i => i.shipmentId === null).map((item) => (
                            <label key={item.id} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedItemsForShipment.includes(item.id)}
                                onChange={() => toggleShipmentItemSelection(item.id)}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-650"
                              />
                              <span className="text-zinc-700 dark:text-zinc-300">
                                {item.productName} ({item.quantity} units)
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-3xs font-bold uppercase tracking-wider text-zinc-400">
                            Carrier
                          </label>
                          <select
                            value={shipmentCarrier}
                            onChange={(e) => setShipmentCarrier(e.target.value)}
                            className="mt-1 flex h-8 w-full rounded border border-gray-200 bg-white px-2 text-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                          >
                            <option value="FedEx">FedEx Express</option>
                            <option value="DHL">DHL Express</option>
                            <option value="UPS">UPS Logistics</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-3xs font-bold uppercase tracking-wider text-zinc-400">
                            Tracking Number
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. TRK123456"
                            value={shipmentTracking}
                            onChange={(e) => setShipmentTracking(e.target.value)}
                            className="mt-1 flex h-8 w-full rounded border border-gray-200 bg-transparent px-2.5 text-xs outline-none dark:border-zinc-800"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={selectedItemsForShipment.length === 0}
                        className="flex h-8 w-full items-center justify-center rounded-lg bg-zinc-900 text-xs font-semibold text-white shadow hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        Create Split Shipment Package
                      </button>
                    </form>
                  </div>
                )}

                {/* Refund & Cancellation Admin actions panel */}
                {selectedOrder.status !== "cancelled" && (
                  <div className="border-t border-gray-100 pt-6 dark:border-zinc-850 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Refunds & Cancellations
                    </h4>
                    
                    {/* Partial Refund checkboxes */}
                    <div>
                      <span className="block text-3xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                        Select Items to Refund (Partial)
                      </span>
                      <div className="space-y-2 mb-3">
                        {selectedOrder.items.map((item) => (
                          <label key={item.id} className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedItemsForRefund.includes(item.id)}
                              onChange={() => toggleRefundItemSelection(item.id)}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-650"
                            />
                            <span className="text-zinc-700 dark:text-zinc-300">
                              {item.productName} - ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleProcessRefund("partial")}
                          className="flex h-8 flex-1 items-center justify-center rounded-lg border border-indigo-150 text-indigo-750 text-xs font-semibold hover:bg-indigo-50/20 dark:border-indigo-900 dark:text-indigo-400"
                        >
                          Issue Checked Partial Refund
                        </button>
                        <button
                          type="button"
                          onClick={() => handleProcessRefund("full")}
                          className="flex h-8 flex-1 items-center justify-center rounded-lg border border-red-150 text-red-500 text-xs font-semibold hover:bg-red-50/20 dark:border-red-950/20"
                        >
                          Issue Full Refund & Cancel
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-gray-50 pt-4 dark:border-zinc-850">
                      <button
                        onClick={() => handleCancelOrder(selectedOrder.id)}
                        className="flex h-9 w-full items-center justify-center rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-500"
                      >
                        Force Cancel Order & Restock Inventory
                      </button>
                    </div>
                  </div>
                )}

                {/* Notifications Dispatch logs */}
                {selectedOrderNotifications.length > 0 && (
                  <div className="border-t border-gray-100 pt-6 dark:border-zinc-850">
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Sent Notification Alerts ({selectedOrderNotifications.length})
                    </h4>
                    <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                      {selectedOrderNotifications.map((n) => (
                        <div key={n.id} className="rounded-lg bg-zinc-50/50 p-3 text-xs dark:bg-zinc-950/20">
                          <div className="flex justify-between font-bold text-zinc-850 dark:text-zinc-200 mb-1">
                            <span>{n.title}</span>
                            <span className="text-3xs text-zinc-400">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-zinc-500 dark:text-zinc-450 text-3xs">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-32 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-zinc-500 text-sm">Select an order from the left to manage fulfillment details.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
