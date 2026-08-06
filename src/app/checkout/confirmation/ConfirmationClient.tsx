"use client"

import React from "react"
import { useRouter } from "next/navigation"

interface OrderAddress {
  name: string
  street: string
  city: string
  state: string
  zip: string
  country: string
  phone?: string
}

interface OrderItem {
  id: string
  quantity: number
  price: number
  sku: string
  productName: string
}

interface OrderDetails {
  id: string
  email: string
  shippingAddress: OrderAddress
  billingAddress: OrderAddress
  shippingMethod: string
  paymentMethod: string
  paymentStatus: string
  paymentIntentId: string | null
  subtotal: number
  discount: number
  shippingFee: number
  tax: number
  walletAmountUsed: number
  total: number
  status: string
  createdAt: string
  items: OrderItem[]
}

export default function ConfirmationClient({ order }: { order: OrderDetails }) {
  const router = useRouter()

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 print:bg-white print:py-0 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl space-y-6">
        
        {/* Success Alert Header - Hidden on Print */}
        <div className="rounded-2xl border border-green-150 bg-green-50/50 p-6 text-center shadow-sm print:hidden dark:border-green-900/30 dark:bg-green-950/20">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700 dark:bg-green-900 dark:text-green-300">
            ✓
          </span>
          <h2 className="mt-3 font-sans text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Order Placed Successfully!
          </h2>
          <p className="mt-1 text-sm text-zinc-550 dark:text-zinc-400">
            Thank you for shopping with Nexora. Your order has been placed and is currently processing.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={handlePrint}
              className="flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-xs font-semibold text-zinc-700 hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            >
              Print Invoice
            </button>
            <button
              onClick={() => router.push("/search")}
              className="flex h-9 items-center justify-center rounded-lg bg-zinc-900 px-4 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
            >
              Continue Shopping
            </button>
          </div>
        </div>

        {/* Invoice Summary Block */}
        <div className="overflow-hidden rounded-2xl border border-gray-150 bg-white p-8 shadow-sm print:border-0 print:shadow-none dark:border-zinc-850 dark:bg-zinc-900">
          
          {/* Invoice Header */}
          <div className="flex flex-col justify-between border-b border-gray-100 pb-6 sm:flex-row dark:border-zinc-800">
            <div>
              <h1 className="font-sans text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                NEXORA LTD.
              </h1>
              <span className="text-3xs uppercase tracking-wider text-zinc-450">
                Official Purchase Receipt
              </span>
            </div>
            <div className="mt-4 text-left sm:mt-0 sm:text-right text-xs text-zinc-500">
              <p>Receipt Code: <strong className="font-mono text-zinc-800 dark:text-zinc-200">#{order.id}</strong></p>
              <p className="mt-0.5">Date: {order.createdAt}</p>
              <p className="mt-0.5">Contact: {order.email}</p>
            </div>
          </div>

          {/* Billing vs Shipping Addresses */}
          <div className="grid gap-6 border-b border-gray-100 py-6 sm:grid-cols-2 dark:border-zinc-800 text-xs">
            <div>
              <h3 className="mb-2 font-bold uppercase tracking-wider text-zinc-450 text-2xs">
                Shipping Address
              </h3>
              <div className="text-zinc-700 dark:text-zinc-300 space-y-0.5">
                <p className="font-semibold">{order.shippingAddress.name}</p>
                <p>{order.shippingAddress.street}</p>
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
                <p>{order.shippingAddress.country}</p>
                {order.shippingAddress.phone && <p>Phone: {order.shippingAddress.phone}</p>}
              </div>
            </div>
            <div>
              <h3 className="mb-2 font-bold uppercase tracking-wider text-zinc-450 text-2xs">
                Billing Address
              </h3>
              <div className="text-zinc-700 dark:text-zinc-300 space-y-0.5">
                <p className="font-semibold">{order.billingAddress.name}</p>
                <p>{order.billingAddress.street}</p>
                <p>{order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.zip}</p>
                <p>{order.billingAddress.country}</p>
              </div>
            </div>
          </div>

          {/* Invoice Items Table */}
          <div className="py-6">
            <h3 className="mb-3 font-bold uppercase tracking-wider text-zinc-450 text-2xs">
              Purchased Items
            </h3>
            <table className="min-w-full text-xs text-zinc-700 dark:text-zinc-300">
              <thead>
                <tr className="border-b border-gray-100 dark:border-zinc-800 text-left text-2xs uppercase tracking-wider font-semibold text-zinc-450">
                  <th className="py-2">Item Description</th>
                  <th className="py-2">SKU</th>
                  <th className="py-2 text-right">Unit Price</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-zinc-850">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 font-medium text-zinc-900 dark:text-zinc-150">{item.productName}</td>
                    <td className="py-3 font-mono text-3xs text-zinc-450">{item.sku}</td>
                    <td className="py-3 text-right">${item.price.toFixed(2)}</td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    <td className="py-3 text-right font-semibold text-zinc-900 dark:text-zinc-50">
                      ${(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing breakdowns */}
          <div className="flex justify-end border-t border-gray-100 pt-6 dark:border-zinc-800 text-xs">
            <div className="w-64 space-y-2.5 text-zinc-550 dark:text-zinc-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">${order.subtotal.toFixed(2)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Applied Discounts</span>
                  <span className="font-semibold">-${order.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping Fee ({order.shippingMethod})</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {order.shippingFee === 0 ? "FREE" : `$${order.shippingFee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Sales Tax</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">${order.tax.toFixed(2)}</span>
              </div>
              {order.walletAmountUsed > 0 && (
                <div className="flex justify-between text-indigo-650">
                  <span>Wallet Deducted</span>
                  <span className="font-semibold">-${order.walletAmountUsed.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-50 pt-2 text-sm font-black text-zinc-900 dark:border-zinc-850 dark:text-zinc-50">
                <span>Total Amount Charged</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment metadata */}
          <div className="mt-8 rounded-xl bg-gray-50/50 p-4 border border-gray-100 dark:bg-zinc-950/20 dark:border-zinc-850 text-xs">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <span className="block text-3xs font-bold uppercase tracking-wider text-zinc-400">Payment method</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 uppercase">{order.paymentMethod}</span>
              </div>
              <div>
                <span className="block text-3xs font-bold uppercase tracking-wider text-zinc-400">Payment status</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 uppercase">{order.paymentStatus}</span>
              </div>
              <div>
                <span className="block text-3xs font-bold uppercase tracking-wider text-zinc-400">Gateway Transaction Reference</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono break-all">{order.paymentIntentId || "N/A"}</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
