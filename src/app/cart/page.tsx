"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface CartItem {
  id: string
  quantity: number
  isSavedForLater: boolean
  hasInventoryError: boolean
  maxAvailable: number
  productVariant: {
    id: string
    sku: string
    price: number
    compareAtPrice: number | null
    weightKg: number
    attributes: Record<string, string>
    productName: string
    productSlug: string
  }
}

interface CartSummary {
  subtotal: number
  couponDiscount: number
  giftCardApplied: number
  shippingEstimate: number
  taxEstimate: number
  total: number
}

interface CartDetails {
  id: string
  couponDetails: { code: string; discountType: string; discountValue: number } | null
  giftCardDetails: { code: string; balance: number } | null
  activeItems: CartItem[]
  savedItems: CartItem[]
  summary: CartSummary
}

export default function CartPage() {
  const router = useRouter()
  const [cart, setCart] = useState<CartDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Form Codes States
  const [couponCodeInput, setCouponCodeInput] = useState("")
  const [giftCardCodeInput, setGiftCardCodeInput] = useState("")
  const [discountLoading, setDiscountLoading] = useState(false)
  const [discountError, setDiscountError] = useState("")
  const [discountSuccess, setDiscountSuccess] = useState("")

  // Estimator States
  const [shippingCountry, setShippingCountry] = useState("USA")
  const [shippingState, setShippingState] = useState("GA")

  const fetchCart = async () => {
    try {
      const res = await fetch("/api/catalog/cart")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch cart details")
      setCart(data.cart)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Trigger merge on mount in case they just logged in
  const mergeCartOnMount = async () => {
    try {
      await fetch("/api/catalog/cart/merge", { method: "POST" })
    } catch (err) {
      console.warn("Guest-to-member cart merge check bypassed")
    }
    fetchCart()
  }

  useEffect(() => {
    mergeCartOnMount()
  }, [])

  const handleUpdateQuantity = async (cartItemId: string, newQty: number) => {
    try {
      const res = await fetch("/api/catalog/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItemId, quantity: newQty }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update quantity")
      fetchCart()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleToggleSaveStatus = async (cartItemId: string, saveStatus: boolean) => {
    try {
      const res = await fetch("/api/catalog/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItemId, isSavedForLater: saveStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to toggle status")
      fetchCart()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleRemoveItem = async (cartItemId: string) => {
    try {
      const res = await fetch(`/api/catalog/cart?cartItemId=${cartItemId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to remove item")
      fetchCart()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleApplyDiscount = async (e: React.FormEvent, type: "coupon" | "giftcard") => {
    e.preventDefault()
    setDiscountLoading(true)
    setDiscountError("")
    setDiscountSuccess("")

    const code = type === "coupon" ? couponCodeInput : giftCardCodeInput
    if (!code.trim()) {
      setDiscountError("Please input a valid code string first")
      setDiscountLoading(false)
      return
    }

    try {
      const res = await fetch("/api/catalog/cart/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Discount application failed")

      setDiscountSuccess(data.message)
      if (type === "coupon") setCouponCodeInput("")
      if (type === "giftcard") setGiftCardCodeInput("")
      fetchCart()
    } catch (err: any) {
      setDiscountError(err.message)
    } finally {
      setDiscountLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-zinc-550 dark:bg-zinc-950">
        Loading shopping cart context...
      </div>
    )
  }

  const activeCount = cart?.activeItems.reduce((acc, item) => acc + item.quantity, 0) || 0
  const savedCount = cart?.savedItems.length || 0

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl">
        
        {/* Header */}
        <div className="mb-8 border-b border-gray-150 pb-4 dark:border-zinc-800">
          <h1 className="font-sans text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Shopping Cart
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            You have <strong>{activeCount}</strong> items inside your active checking queue.
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {activeCount === 0 && savedCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-250 bg-white py-20 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">Your Cart is Empty</h3>
            <p className="mt-2 text-sm text-zinc-500">Explore our catalog of sustainable clothes to add items!</p>
            <button
              onClick={() => router.push("/search")}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-6 font-semibold text-white shadow hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            
            {/* Left Column: Cart items & Saved items */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Active Items Container */}
              {cart && cart.activeItems.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="border-b border-gray-100 bg-gray-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                      Active Checkout Queue ({cart.activeItems.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                    {cart.activeItems.map((item) => {
                      return (
                        <div key={item.id} className="p-5 hover:bg-gray-50/20 dark:hover:bg-zinc-850/10">
                          
                          {/* Stock error banners */}
                          {item.hasInventoryError && (
                            <div className="mb-3 rounded bg-amber-50 px-2 py-1 text-2xs font-semibold text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
                              ⚠️ Warning: Exceeds warehouse stock (Only {item.maxAvailable} units remaining). Please reduce quantity.
                            </div>
                          )}

                          <div className="flex gap-4">
                            <div className="h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-950 flex">
                              <span className="text-3xl text-zinc-300 dark:text-zinc-800">📦</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 
                                    onClick={() => router.push(`/products/${item.productVariant.productSlug}`)}
                                    className="cursor-pointer font-bold text-zinc-900 hover:text-indigo-650 hover:underline dark:text-zinc-50 dark:hover:text-indigo-400"
                                  >
                                    {item.productVariant.productName}
                                  </h4>
                                  <span className="mt-0.5 block font-mono text-2xs text-zinc-400">
                                    SKU: {item.productVariant.sku}
                                  </span>
                                </div>
                                <span className="font-bold text-zinc-900 dark:text-zinc-50">
                                  ${(item.productVariant.price * item.quantity).toFixed(2)}
                                </span>
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500">
                                {item.productVariant.attributes.color && (
                                  <span>Color: <strong>{item.productVariant.attributes.color}</strong></span>
                                )}
                                {item.productVariant.attributes.size && (
                                  <span>Size: <strong>{item.productVariant.attributes.size}</strong></span>
                                )}
                                <span>Unit: ${item.productVariant.price.toFixed(2)}</span>
                              </div>

                              <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3 dark:border-zinc-850">
                                
                                {/* Quantity controls */}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                    className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-zinc-650 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                  >
                                    -
                                  </button>
                                  <span className="w-8 text-center text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                                    {item.quantity}
                                  </span>
                                  <button
                                    disabled={item.quantity >= item.maxAvailable}
                                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                    className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-zinc-650 disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                  >
                                    +
                                  </button>
                                </div>

                                <div className="flex gap-4 text-xs font-semibold">
                                  <button
                                    onClick={() => handleToggleSaveStatus(item.id, true)}
                                    className="text-indigo-600 hover:underline dark:text-indigo-400"
                                  >
                                    Save for Later
                                  </button>
                                  <button
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="text-red-500 hover:underline"
                                  >
                                    Remove
                                  </button>
                                </div>

                              </div>

                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Save for later Container */}
              {cart && cart.savedItems.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="border-b border-gray-100 bg-gray-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                      Saved for Later ({cart.savedItems.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                    {cart.savedItems.map((item) => (
                      <div key={item.id} className="p-4 hover:bg-gray-50/20 dark:hover:bg-zinc-850/10">
                        <div className="flex gap-4">
                          <div className="h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-950 flex text-zinc-400">
                            📦
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-zinc-800 dark:text-zinc-200">
                                  {item.productVariant.productName}
                                </h4>
                                <span className="mt-0.5 block text-3xs text-zinc-400 font-mono">
                                  {item.productVariant.sku}
                                </span>
                              </div>
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                ${item.productVariant.price.toFixed(2)}
                              </span>
                            </div>
                            <div className="mt-3 flex justify-between items-center text-xs">
                              <button
                                onClick={() => handleToggleSaveStatus(item.id, false)}
                                className="font-semibold text-indigo-650 hover:underline dark:text-indigo-400"
                              >
                                Move to Active Cart
                              </button>
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="font-semibold text-red-500 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Right Column: Checkout Pricing Summary & Coupon / Gift Cards forms */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Dynamic summary card */}
              {cart && (
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <h3 className="mb-4 text-base font-bold text-zinc-900 dark:text-zinc-50">
                    Checkout Summary
                  </h3>

                  <div className="space-y-3 border-b border-gray-100 pb-4 text-sm text-zinc-650 dark:border-zinc-850 dark:text-zinc-350">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-150">${cart.summary.subtotal.toFixed(2)}</span>
                    </div>

                    {cart.summary.couponDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Coupon Discount ({cart.couponDetails?.code})</span>
                        <span className="font-medium">-${cart.summary.couponDiscount.toFixed(2)}</span>
                      </div>
                    )}

                    {cart.summary.giftCardApplied > 0 && (
                      <div className="flex justify-between text-indigo-600">
                        <span>Gift Voucher Balance ({cart.giftCardDetails?.code})</span>
                        <span className="font-medium">-${cart.summary.giftCardApplied.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span>Shipping (to {shippingCountry})</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-150">
                        {cart.summary.shippingEstimate === 0 ? "FREE" : `$${cart.summary.shippingEstimate.toFixed(2)}`}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Estimated Sales Tax (8%)</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-150">${cart.summary.taxEstimate.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between text-base font-extrabold text-zinc-900 dark:text-zinc-50">
                    <span>Total Amount</span>
                    <span>${cart.summary.total.toFixed(2)}</span>
                  </div>

                  <button
                    disabled={activeCount === 0 || cart.activeItems.some(i => i.hasInventoryError)}
                    className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-zinc-900 font-semibold text-white shadow hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    Proceed to Payment Gateways
                  </button>
                </div>
              )}

              {/* Discount panel inputs */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-4 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Offers & Vouchers
                </h3>

                {/* Display apply messages */}
                {discountError && (
                  <div className="mb-3 rounded bg-red-50 p-2.5 text-2xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400">
                    {discountError}
                  </div>
                )}
                {discountSuccess && (
                  <div className="mb-3 rounded bg-green-50 p-2.5 text-2xs font-semibold text-green-700 dark:bg-green-950/20 dark:text-green-400">
                    {discountSuccess}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Coupon Form */}
                  <form onSubmit={(e) => handleApplyDiscount(e, "coupon")} className="space-y-2">
                    <label className="block text-3xs font-bold uppercase tracking-wider text-zinc-400">
                      Promo Coupon (e.g. SAVE20, SAVE10)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value)}
                        placeholder="SAVE20"
                        className="flex h-9 flex-1 rounded-lg border border-gray-200 bg-transparent px-2.5 text-xs focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                      />
                      <button
                        type="submit"
                        disabled={discountLoading}
                        className="flex h-9 items-center justify-center rounded-lg bg-zinc-100 px-3 text-xs font-semibold text-zinc-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-350 dark:hover:bg-zinc-700"
                      >
                        Apply
                      </button>
                    </div>
                  </form>

                  {/* GiftCard Form */}
                  <form onSubmit={(e) => handleApplyDiscount(e, "giftcard")} className="space-y-2">
                    <label className="block text-3xs font-bold uppercase tracking-wider text-zinc-400">
                      Gift Voucher Card (e.g. GIFT50, GIFT100)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={giftCardCodeInput}
                        onChange={(e) => setGiftCardCodeInput(e.target.value)}
                        placeholder="GIFT100"
                        className="flex h-9 flex-1 rounded-lg border border-gray-200 bg-transparent px-2.5 text-xs focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                      />
                      <button
                        type="submit"
                        disabled={discountLoading}
                        className="flex h-9 items-center justify-center rounded-lg bg-zinc-100 px-3 text-xs font-semibold text-zinc-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-350 dark:hover:bg-zinc-700"
                      >
                        Apply
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Shipping location estimator */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="mb-4 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Fulfillment Calculator
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-3xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Shipping Country
                    </label>
                    <select
                      value={shippingCountry}
                      onChange={(e) => setShippingCountry(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-xs focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                    >
                      <option value="USA">United States</option>
                      <option value="CAN">Canada</option>
                      <option value="UK">United Kingdom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-3xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Shipping State / Province
                    </label>
                    <input
                      type="text"
                      value={shippingState}
                      onChange={(e) => setShippingState(e.target.value)}
                      placeholder="e.g. GA"
                      className="flex h-9 w-full rounded-lg border border-gray-200 bg-transparent px-2.5 text-xs focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                    />
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  )
}
