"use client"

import React, { useState, useEffect } from "react"

interface Preferences {
  emailTransactional: boolean
  emailMarketing: boolean
  smsAlerts: boolean
  pushNotifications: boolean
}

interface NotificationJob {
  id: string
  channel: string
  templateName: string
  recipient: string
  status: string
  retryCount: number
  maxRetries: number
  errorMessage: string | null
  createdAt: string
}

export default function NotificationCenter() {
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [queue, setQueue] = useState<NotificationJob[]>([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Form states for test notification
  const [testChannel, setTestChannel] = useState("email")
  const [testTemplate, setTestTemplate] = useState("order_placed")
  const [testRecipient, setTestRecipient] = useState("customer@example.com")
  
  // Custom mock payloads
  const [mockOrderId, setMockOrderId] = useState("order-98765")
  const [mockName, setMockName] = useState("Alice Smith")
  const [mockTotal, setMockTotal] = useState("59.99")
  const [mockOtp, setMockOtp] = useState("482910")

  const [savingPrefs, setSavingPrefs] = useState(false)
  const [processingQueue, setProcessingQueue] = useState(false)

  const fetchNotificationCenterData = async () => {
    try {
      // 1. Fetch Preferences (User Scoped)
      const prefRes = await fetch("/api/catalog/notifications/preferences")
      if (prefRes.ok) {
        const prefData = await prefRes.json()
        setPreferences(prefData.preferences)
      }

      // 2. Fetch Audit Queue (Admin Scoped)
      const queueRes = await fetch("/api/admin/notifications/process")
      if (queueRes.ok) {
        const queueData = await queueRes.json()
        setQueue(queueData.queue || [])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotificationCenterData()
  }, [])

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!preferences) return
    setSavingPrefs(true)
    try {
      const res = await fetch("/api/catalog/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update preferences")
      alert("Notification preferences saved successfully!")
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSavingPrefs(false)
    }
  }

  const handleSendTestNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Build payload matching template requirements
    let payload: Record<string, any> = {}
    if (testTemplate === "order_placed") {
      payload = { orderId: mockOrderId, name: mockName, subtotal: "49.99", tax: "10.00", total: mockTotal }
    } else if (testTemplate === "shipment_dispatched") {
      payload = { orderId: mockOrderId, name: mockName, carrier: "FedEx Express", trackingNumber: "TRK987654321", estimatedDelivery: "August 12, 2026" }
    } else if (testTemplate === "otp_auth") {
      payload = { code: mockOtp }
    }

    try {
      const res = await fetch("/api/catalog/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: testChannel,
          templateName: testTemplate,
          recipient: testRecipient,
          payload,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to submit test notification")
      
      alert(data.message)
      fetchNotificationCenterData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleProcessQueue = async () => {
    setProcessingQueue(true)
    try {
      const res = await fetch("/api/admin/notifications/process", {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Queue processing failed")

      alert(`Processed ${data.processedCount} jobs from the queue successfully!`)
      fetchNotificationCenterData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setProcessingQueue(false)
    }
  }

  const togglePreference = (key: keyof Preferences) => {
    if (!preferences) return
    setPreferences({
      ...preferences,
      [key]: !preferences[key],
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-zinc-550 dark:bg-zinc-950">
        Loading notification settings...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl space-y-8">
        
        {/* Header banner */}
        <div className="border-b border-gray-150 pb-4 dark:border-zinc-800 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-sans text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Notification Center
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Manage opt-in preferences, queue background dispatches, and trigger test carriers.
            </p>
          </div>
          
          <button
            onClick={handleProcessQueue}
            disabled={processingQueue}
            className="flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-xs font-semibold text-white shadow hover:bg-zinc-850 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {processingQueue ? "Processing..." : "Process Alert Queue"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-3">
          
          {/* 1. Preferences Opt-in Panel */}
          <div className="md:col-span-1">
            {preferences ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-6 text-xs">
                <h3 className="font-sans text-sm font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-wider">
                  Opt-In Preferences
                </h3>
                <form onSubmit={handleSavePreferences} className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.emailTransactional}
                      onChange={() => togglePreference("emailTransactional")}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-650"
                    />
                    <div>
                      <span className="block font-semibold text-zinc-800 dark:text-zinc-200">Email Transactional</span>
                      <span className="text-3xs text-zinc-450">Order receipts, registration OTPs</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.emailMarketing}
                      onChange={() => togglePreference("emailMarketing")}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-650"
                    />
                    <div>
                      <span className="block font-semibold text-zinc-800 dark:text-zinc-200">Email Marketing</span>
                      <span className="text-3xs text-zinc-450">Newsletters, discount offers</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.smsAlerts}
                      onChange={() => togglePreference("smsAlerts")}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-650"
                    />
                    <div>
                      <span className="block font-semibold text-zinc-800 dark:text-zinc-200">SMS / WhatsApp alerts</span>
                      <span className="text-3xs text-zinc-450">Urgent tracking info texts</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.pushNotifications}
                      onChange={() => togglePreference("pushNotifications")}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-650"
                    />
                    <div>
                      <span className="block font-semibold text-zinc-800 dark:text-zinc-200">Web Push Alerts</span>
                      <span className="text-3xs text-zinc-450">Browser push status alerts</span>
                    </div>
                  </label>

                  <button
                    type="submit"
                    disabled={savingPrefs}
                    className="flex h-9 w-full items-center justify-center rounded-lg bg-zinc-900 text-xs font-semibold text-white shadow hover:bg-zinc-850 dark:bg-zinc-50 dark:text-zinc-900"
                  >
                    {savingPrefs ? "Saving..." : "Save Preferences"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-250 bg-white py-12 text-center text-xs dark:bg-zinc-900 dark:border-zinc-800 text-zinc-450">
                Please log in to set notification preferences.
              </div>
            )}
          </div>

          {/* 2. Notification Playground / Dispatcher */}
          <div className="md:col-span-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-6 text-xs">
              <h3 className="font-sans text-sm font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-wider">
                Send Test Alert Payload
              </h3>
              <form onSubmit={handleSendTestNotification} className="space-y-4">
                
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-3xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Carrier Channel
                    </label>
                    <select
                      value={testChannel}
                      onChange={(e) => setTestChannel(e.target.value)}
                      className="flex h-9 w-full rounded border border-gray-200 bg-white px-2 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    >
                      <option value="email">SMTP Email</option>
                      <option value="sms">Twilio SMS</option>
                      <option value="whatsapp">WhatsApp Cloud API</option>
                      <option value="push">Browser Web Push</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-3xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Template
                    </label>
                    <select
                      value={testTemplate}
                      onChange={(e) => setTestTemplate(e.target.value)}
                      className="flex h-9 w-full rounded border border-gray-200 bg-white px-2 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                    >
                      <option value="order_placed">Order Placed Confirmation</option>
                      <option value="shipment_dispatched">Shipment Dispatched Alert</option>
                      <option value="otp_auth">MFA OTP Code</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-3xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Recipient details
                    </label>
                    <input
                      type="text"
                      required
                      value={testRecipient}
                      onChange={(e) => setTestRecipient(e.target.value)}
                      placeholder="email or phone number"
                      className="flex h-9 w-full rounded border border-gray-200 bg-transparent px-3 outline-none dark:border-zinc-800 dark:text-zinc-50"
                    />
                  </div>
                </div>

                {/* Placeholders context options */}
                <div className="border-t border-gray-50 pt-4 dark:border-zinc-850 space-y-4">
                  <h4 className="font-bold text-zinc-450 uppercase tracking-wider text-2xs">Template Variables Payload</h4>
                  
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div>
                      <label className="block text-3xs text-zinc-400 mb-1">Name</label>
                      <input
                        type="text"
                        value={mockName}
                        onChange={(e) => setMockName(e.target.value)}
                        className="flex h-8 w-full rounded border border-gray-200 bg-transparent px-2.5 outline-none dark:border-zinc-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-3xs text-zinc-400 mb-1">Order ID</label>
                      <input
                        type="text"
                        value={mockOrderId}
                        onChange={(e) => setMockOrderId(e.target.value)}
                        className="flex h-8 w-full rounded border border-gray-200 bg-transparent px-2.5 outline-none dark:border-zinc-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-3xs text-zinc-400 mb-1">Total ($)</label>
                      <input
                        type="text"
                        value={mockTotal}
                        onChange={(e) => setMockTotal(e.target.value)}
                        className="flex h-8 w-full rounded border border-gray-200 bg-transparent px-2.5 outline-none dark:border-zinc-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-3xs text-zinc-400 mb-1">OTP code</label>
                      <input
                        type="text"
                        value={mockOtp}
                        onChange={(e) => setMockOtp(e.target.value)}
                        className="flex h-8 w-full rounded border border-gray-200 bg-transparent px-2.5 outline-none dark:border-zinc-800 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="flex h-9 w-full items-center justify-center rounded-lg bg-zinc-900 text-xs font-semibold text-white shadow hover:bg-zinc-850 dark:bg-zinc-50 dark:text-zinc-900"
                >
                  Enqueue Test Alert
                </button>
              </form>
            </div>
          </div>

        </div>

        {/* 3. System Queue Logs Monitor */}
        <div className="rounded-xl border border-gray-150 bg-white shadow-sm dark:border-zinc-850 dark:bg-zinc-900 overflow-x-auto text-xs">
          <div className="bg-gray-50/50 p-4 border-b border-gray-100 dark:border-zinc-800 dark:bg-zinc-900/50">
            <h3 className="font-bold text-zinc-800 dark:text-zinc-150 uppercase tracking-wider text-2xs">
              System Dispatcher Logs queue
            </h3>
          </div>
          {queue.length === 0 ? (
            <div className="p-8 text-center text-zinc-450">Queue is currently empty.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800">
              <thead className="bg-gray-50/20 dark:bg-zinc-950/20">
                <tr className="text-left font-semibold text-zinc-400 uppercase tracking-wider text-3xs">
                  <th className="px-6 py-3">Channel</th>
                  <th className="px-6 py-3">Template</th>
                  <th className="px-6 py-3">Recipient</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-center">Retries</th>
                  <th className="px-6 py-3">Error message</th>
                  <th className="px-6 py-3">Queued At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-850 bg-white dark:bg-zinc-900">
                {queue.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50/30 dark:hover:bg-zinc-800/10">
                    <td className="px-6 py-3.5 font-bold uppercase tracking-wider text-3xs text-zinc-650 dark:text-zinc-350">
                      {job.channel}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-3xs">
                      {job.templateName}
                    </td>
                    <td className="px-6 py-3.5 truncate max-w-[150px]">
                      {job.recipient}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-3xs font-semibold uppercase ${
                        job.status === "sent" 
                          ? "bg-green-50 text-green-700" 
                          : job.status === "pending" || job.status === "retry_pending"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-red-50 text-red-700"
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center font-bold">
                      {job.retryCount} / {job.maxRetries}
                    </td>
                    <td className="px-6 py-3.5 text-red-500 font-mono text-3xs truncate max-w-[200px]" title={job.errorMessage || ""}>
                      {job.errorMessage || "—"}
                    </td>
                    <td className="px-6 py-3.5 text-zinc-450 text-3xs">
                      {new Date(job.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}
