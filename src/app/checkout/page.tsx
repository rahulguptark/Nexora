"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface CartItem {
  id: string
  quantity: number
  productVariant: {
    sku: string
    price: number
    productName: string
  }
}

interface CartDetails {
  id: string
  couponDetails: { code: string; discountType: string; discountValue: number } | null
  giftCardDetails: { code: string; balance: number } | null
  activeItems: CartItem[]
  summary: {
    subtotal: number
    couponDiscount: number
    giftCardApplied: number
    shippingEstimate: number
    taxEstimate: number
    total: number
  }
}

export default function CheckoutPage() {
  const router = useRouter()
  const [cart, setCart] = useState<CartDetails | null>(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const [isGuest, setIsGuest] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Shipping Form
  const [email, setEmail] = useState("")
  const [shippingName, setShippingName] = useState("")
  const [shippingStreet, setShippingStreet] = useState("")
  const [shippingCity, setShippingCity] = useState("")
  const [shippingState, setShippingState] = useState("")
  const [shippingZip, setShippingZip] = useState("")
  const [shippingCountry, setShippingCountry] = useState("USA")
  const [shippingPhone, setShippingPhone] = useState("")

  // Billing address toggle
  const [billingSame, setBillingSame] = useState(true)
  const [billingName, setBillingName] = useState("")
  const [billingStreet, setBillingStreet] = useState("")
  const [billingCity, setBillingCity] = useState("")
  const [billingState, setBillingState] = useState("")
  const [billingZip, setBillingZip] = useState("")
  const [billingCountry, setBillingCountry] = useState("USA")

  // Delivery & Payment
  const [shippingMethod, setShippingMethod] = useState("standard")
  const [paymentMethod, setPaymentMethod] = useState("cod")
  const [useWallet, setUseWallet] = useState(false)

  // Card details (for mock gateways)
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvc, setCardCvc] = useState("")

  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const fetchData = async () => {
    try {
      // 1. Fetch Cart
      const cartRes = await fetch("/api/catalog/cart")
      const cartData = await cartRes.json()
      if (!cartRes.ok) throw new Error(cartData.error || "Failed to load active cart")
      setCart(cartData.cart)

      // 2. Fetch Wallet Details
      const walletRes = await fetch("/api/catalog/checkout/wallet")
      const walletData = await walletRes.json()
      if (walletRes.ok) {
        setWalletBalance(walletData.balance || 0)
        setIsGuest(walletData.isGuest)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Recalculate values dynamically inside checkout frontend summary
  const subtotal = cart?.summary.subtotal || 0
  const couponDiscount = cart?.summary.couponDiscount || 0
  const giftCardApplied = cart?.summary.giftCardApplied || 0
  
  let shippingFee = cart?.summary.shippingEstimate || 0
  if (shippingMethod === "express" && subtotal > 0) {
    shippingFee += 15.00
  }

  const tax = cart?.summary.taxEstimate || 0
  const totalBeforeWallet = subtotal - couponDiscount - giftCardApplied + shippingFee + tax
  
  const walletDeducted = useWallet ? Math.min(walletBalance, totalBeforeWallet) : 0
  const finalOrderTotal = Math.max(0, totalBeforeWallet - walletDeducted)

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCheckoutLoading(true)
    setError("")

    const shippingAddress = {
      name: shippingName,
      street: shippingStreet,
      city: shippingCity,
      state: shippingState,
      zip: shippingZip,
      country: shippingCountry,
      phone: shippingPhone,
    }

    const billingAddress = billingSame ? shippingAddress : {
      name: billingName,
      street: billingStreet,
      city: billingCity,
      state: billingState,
      zip: billingZip,
      country: billingCountry,
    }

    const payload = {
      email,
      shippingAddress,
      billingAddress,
      shippingMethod,
      paymentMethod: finalOrderTotal === 0 ? "wallet" : paymentMethod,
      useWallet,
    }

    try {
      const res = await fetch("/api/catalog/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Order placement failed")

      // Redirect to Order Confirmation page
      router.push(`/checkout/confirmation?orderId=${data.orderId}`)
    } catch (err: any) {
      setError(err.message)
      setCheckoutLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-zinc-550 dark:bg-zinc-950">
        Preparing secure checkout workspace...
      </div>
    )
  }

  if (!cart || cart.activeItems.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-zinc-550 dark:bg-zinc-950">
        <div className="text-center">
          <h2 className="text-xl font-bold">Your Checkout Cart is Empty</h2>
          <button
            onClick={() => router.push("/search")}
            className="mt-4 rounded-xl bg-zinc-900 px-6 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
          >
            Go back to search
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl">
        
        {/* Header */}
        <div className="mb-8 border-b border-gray-150 pb-4 dark:border-zinc-800">
          <h1 className="font-sans text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Secure Checkout
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Complete your purchase details below.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleCheckoutSubmit} className="grid gap-8 lg:grid-cols-3">
          
          {/* Left Column: Address, Shipping method, Payment selection */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Contact & Shipping Address */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 border-b border-gray-50 pb-2 dark:border-zinc-850">
                Contact & Shipping Details
              </h3>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Notification Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Recipient Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingName}
                    onChange={(e) => setShippingName(e.target.value)}
                    placeholder="John Doe"
                    className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingPhone}
                    onChange={(e) => setShippingPhone(e.target.value)}
                    placeholder="+1 555-0199"
                    className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Street Address
                </label>
                <input
                  type="text"
                  required
                  value={shippingStreet}
                  onChange={(e) => setShippingStreet(e.target.value)}
                  placeholder="123 Shopping Blvd"
                  className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    City
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    placeholder="Atlanta"
                    className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    State
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingState}
                    onChange={(e) => setShippingState(e.target.value)}
                    placeholder="GA"
                    className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Zip Code
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingZip}
                    onChange={(e) => setShippingZip(e.target.value)}
                    placeholder="30301"
                    className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                  />
                </div>
              </div>
            </div>

            {/* 2. Billing Address logic */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
              <div className="flex items-center gap-2">
                <input
                  id="billingSame"
                  type="checkbox"
                  checked={billingSame}
                  onChange={(e) => setBillingSame(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-650 focus:ring-indigo-500"
                />
                <label htmlFor="billingSame" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Billing Address is the same as Shipping Address
                </label>
              </div>

              {!billingSame && (
                <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-4">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    Billing Details
                  </h4>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Billing Name
                    </label>
                    <input
                      type="text"
                      required={!billingSame}
                      value={billingName}
                      onChange={(e) => setBillingName(e.target.value)}
                      placeholder="John Doe"
                      className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Billing Street Address
                    </label>
                    <input
                      type="text"
                      required={!billingSame}
                      value={billingStreet}
                      onChange={(e) => setBillingStreet(e.target.value)}
                      placeholder="456 Card St"
                      className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        City
                      </label>
                      <input
                        type="text"
                        required={!billingSame}
                        value={billingCity}
                        onChange={(e) => setBillingCity(e.target.value)}
                        placeholder="Atlanta"
                        className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-2.5 text-xs focus:border-indigo-500 focus:outline-none dark:border-zinc-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        State
                      </label>
                      <input
                        type="text"
                        required={!billingSame}
                        value={billingState}
                        onChange={(e) => setBillingState(e.target.value)}
                        placeholder="GA"
                        className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-2 text-xs focus:border-indigo-500 focus:outline-none dark:border-zinc-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Zip Code
                      </label>
                      <input
                        type="text"
                        required={!billingSame}
                        value={billingZip}
                        onChange={(e) => setBillingZip(e.target.value)}
                        placeholder="30301"
                        className="mt-1 flex h-10 w-full rounded-lg border border-gray-200 bg-transparent px-2 text-xs focus:border-indigo-500 focus:outline-none dark:border-zinc-800"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Shipping delivery options */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 border-b border-gray-50 pb-2 dark:border-zinc-850">
                Delivery Preferences
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${
                  shippingMethod === "standard" 
                    ? "border-indigo-650 bg-indigo-50/20 dark:border-indigo-400" 
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="shippingMethod"
                      value="standard"
                      checked={shippingMethod === "standard"}
                      onChange={() => setShippingMethod("standard")}
                      className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="text-left">
                      <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">Standard shipping</span>
                      <span className="text-3xs text-zinc-500">Arrives in 3-5 business days</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    {cart.summary.shippingEstimate === 0 ? "FREE" : `$${cart.summary.shippingEstimate.toFixed(2)}`}
                  </span>
                </label>

                <label className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all ${
                  shippingMethod === "express" 
                    ? "border-indigo-650 bg-indigo-50/20 dark:border-indigo-400" 
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="shippingMethod"
                      value="express"
                      checked={shippingMethod === "express"}
                      onChange={() => setShippingMethod("express")}
                      className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="text-left">
                      <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">Express delivery</span>
                      <span className="text-3xs text-zinc-500">Arrives in 1-2 business days</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    +${(cart.summary.shippingEstimate + 15.00).toFixed(2)}
                  </span>
                </label>
              </div>
            </div>

            {/* 4. Payment Integrations Method Selectors */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 border-b border-gray-50 pb-2 dark:border-zinc-850">
                Payment Gateways Options
              </h3>

              {/* Wallet Deductions Toggle (if logged in member and has balance) */}
              {!isGuest && walletBalance > 0 && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/20 p-4 dark:border-indigo-900/30">
                  <div className="flex items-center gap-2">
                    <input
                      id="useWallet"
                      type="checkbox"
                      checked={useWallet}
                      onChange={(e) => setUseWallet(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-650 focus:ring-indigo-500"
                    />
                    <label htmlFor="useWallet" className="text-xs font-semibold text-indigo-900 dark:text-indigo-350">
                      Apply wallet balance (Available balance: <strong>${walletBalance.toFixed(2)}</strong>)
                    </label>
                  </div>
                  {useWallet && (
                    <span className="mt-1 block text-3xs text-indigo-600/80">
                      Deducting <strong>${walletDeducted.toFixed(2)}</strong> from wallet. 
                      {finalOrderTotal > 0 ? ` Remaining subtotal balance: $${finalOrderTotal.toFixed(2)}` : " Fully covered!"}
                    </span>
                  )}
                </div>
              )}

              {finalOrderTotal > 0 ? (
                <div className="space-y-3">
                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                    paymentMethod === "cod" ? "border-indigo-650 bg-indigo-50/20" : "border-gray-250 hover:bg-gray-50/30"
                  }`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      className="mt-1 h-4 w-4 border-gray-300 text-indigo-600"
                    />
                    <div className="text-left">
                      <span className="block text-xs font-bold text-zinc-800">Cash on Delivery (COD)</span>
                      <span className="text-3xs text-zinc-500">Pay cash when items arrive at your doorstep.</span>
                    </div>
                  </label>

                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                    paymentMethod === "stripe" ? "border-indigo-650 bg-indigo-50/20" : "border-gray-250 hover:bg-gray-50/30"
                  }`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="stripe"
                      checked={paymentMethod === "stripe"}
                      onChange={() => setPaymentMethod("stripe")}
                      className="mt-1 h-4 w-4 border-gray-300 text-indigo-600"
                    />
                    <div className="flex-1 text-left">
                      <span className="block text-xs font-bold text-zinc-800">Stripe Gateway (Credit Card)</span>
                      <span className="text-3xs text-zinc-500">Secure credit card gateway processed by Stripe.</span>
                      
                      {paymentMethod === "stripe" && (
                        <div className="mt-3 grid grid-cols-3 gap-3 rounded-lg border border-gray-200 bg-white p-3">
                          <div className="col-span-3">
                            <input
                              type="text"
                              required
                              placeholder="Card Number (e.g. 4242 4242 4242 4242)"
                              value={cardNumber}
                              onChange={(e) => setCardNumber(e.target.value)}
                              className="flex h-8 w-full rounded border border-gray-200 px-2.5 text-xs outline-none"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              required
                              placeholder="MM/YY"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                              className="flex h-8 w-full rounded border border-gray-200 px-2.5 text-xs outline-none"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              required
                              placeholder="CVC"
                              value={cardCvc}
                              onChange={(e) => setCardCvc(e.target.value)}
                              className="flex h-8 w-full rounded border border-gray-200 px-2.5 text-xs outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </label>

                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                    paymentMethod === "paypal" ? "border-indigo-650 bg-indigo-50/20" : "border-gray-250 hover:bg-gray-50/30"
                  }`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="paypal"
                      checked={paymentMethod === "paypal"}
                      onChange={() => setPaymentMethod("paypal")}
                      className="mt-1 h-4 w-4 border-gray-300 text-indigo-600"
                    />
                    <div className="text-left">
                      <span className="block text-xs font-bold text-zinc-800">PayPal Checkout</span>
                      <span className="text-3xs text-zinc-500">Pay using your saved PayPal digital wallet balance.</span>
                    </div>
                  </label>

                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                    paymentMethod === "razorpay" ? "border-indigo-650 bg-indigo-50/20" : "border-gray-250 hover:bg-gray-50/30"
                  }`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="razorpay"
                      checked={paymentMethod === "razorpay"}
                      onChange={() => setPaymentMethod("razorpay")}
                      className="mt-1 h-4 w-4 border-gray-300 text-indigo-600"
                    />
                    <div className="text-left">
                      <span className="block text-xs font-bold text-zinc-800">Razorpay (Cards/UPI)</span>
                      <span className="text-3xs text-zinc-500">Indian localized card networks, netbanking, or UPI payments.</span>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="py-4 text-center rounded-xl bg-green-50/50 border border-green-150 text-xs font-semibold text-green-700 dark:bg-green-950/20 dark:text-green-400">
                  ✓ Wallet covers 100% of this checkout amount. No secondary payment gateways needed.
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Checkout Pricing Summary breakdowns */}
          <div className="lg:col-span-1 space-y-6">
            
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-4 text-base font-bold text-zinc-900 dark:text-zinc-50">
                Order Items Summary
              </h3>
              
              <div className="divide-y divide-gray-50 mb-6 max-h-48 overflow-y-auto pr-1 dark:divide-zinc-850">
                {cart.activeItems.map((item) => (
                  <div key={item.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{item.productVariant.productName}</span>
                      <span className="block text-3xs text-zinc-450">Qty: {item.quantity}</span>
                    </div>
                    <span className="font-bold text-zinc-900 dark:text-zinc-150">
                      ${(item.productVariant.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5 border-t border-gray-100 pt-4 text-xs text-zinc-550 dark:border-zinc-800 dark:text-zinc-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon Discount</span>
                    <span>-${couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                {giftCardApplied > 0 && (
                  <div className="flex justify-between text-indigo-650">
                    <span>Gift Card</span>
                    <span>-${giftCardApplied.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span>{shippingFee === 0 ? "FREE" : `$${shippingFee.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Taxes (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                {walletDeducted > 0 && (
                  <div className="flex justify-between text-indigo-600">
                    <span>Wallet Allocation</span>
                    <span>-${walletDeducted.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-gray-100 pt-4 flex justify-between text-sm font-black text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                <span>Total Charge</span>
                <span>${finalOrderTotal.toFixed(2)}</span>
              </div>

              <button
                type="submit"
                disabled={checkoutLoading}
                className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-zinc-900 font-semibold text-white shadow hover:bg-zinc-800 disabled:opacity-40 active:scale-[0.98] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {checkoutLoading ? "Placing Order..." : `Pay $${finalOrderTotal.toFixed(2)} & Check out`}
              </button>
            </div>

          </div>

        </form>

      </div>
    </div>
  )
}
