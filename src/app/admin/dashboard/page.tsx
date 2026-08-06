"use client"

import React, { useState, useEffect } from "react"

interface SystemConfig {
  id: string
  guestCheckoutEnabled: boolean
  walletPaymentEnabled: boolean
  couponValidationEnabled: boolean
  maintenanceMode: boolean
  homepageBanners: string
}

interface Analytics {
  totalUsers: number
  totalSellers: number
  totalOrders: number
  totalRevenue: number
  lowStockAlerts: Array<{ variantId: string; sku: string; productName: string; stock: number }>
}

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  status: string
  createdAt: string
  roles: string[]
}

interface Seller {
  id: string
  name: string
  email: string
  isVerified: boolean
  taxIdentifier: string | null
  createdAt: string
}

interface AuditLog {
  id: string
  action: string
  tableName: string | null
  rowId: string | null
  ipAddress: string | null
  createdAt: string
  user: { email: string; firstName: string; lastName: string } | null
}

export default function AdminDashboardPanel() {
  const [activeTab, setActiveTab] = useState("overview")

  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Form states for flags
  const [guestEnabled, setGuestEnabled] = useState(true)
  const [walletEnabled, setWalletEnabled] = useState(true)
  const [couponEnabled, setCouponEnabled] = useState(true)
  const [maintenance, setMaintenance] = useState(false)
  const [bannersJson, setBannersJson] = useState("[]")

  // Telemetry states (live randomized mocks)
  const [cpu, setCpu] = useState(38)
  const [memory, setMemory] = useState(4.2)
  const [dbLatency, setDbLatency] = useState(4)

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/admin/dashboard")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load dashboard metrics")

      setAnalytics(data.analytics)
      setSystemConfig(data.systemConfig)
      setUsers(data.users || [])
      setSellers(data.sellers || [])

      if (data.systemConfig) {
        setGuestEnabled(data.systemConfig.guestCheckoutEnabled)
        setWalletEnabled(data.systemConfig.walletPaymentEnabled)
        setCouponEnabled(data.systemConfig.couponValidationEnabled)
        setMaintenance(data.systemConfig.maintenanceMode)
        setBannersJson(data.systemConfig.homepageBanners)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch("/api/admin/audit-logs")
      const data = await res.json()
      if (res.ok) {
        setAuditLogs(data.logs || [])
      }
    } catch (err) {
      console.error("Audit logs load error:", err)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    fetchAuditLogs()

    // telemetries mock updates interval
    const interval = setInterval(() => {
      setCpu(Math.floor(Math.random() * (45 - 32 + 1)) + 32)
      setMemory(parseFloat((Math.random() * (4.5 - 4.1) + 4.1).toFixed(2)))
      setDbLatency(Math.floor(Math.random() * (7 - 2 + 1)) + 2)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Validate JSON banners
      JSON.parse(bannersJson)

      const res = await fetch("/api/admin/dashboard/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestCheckoutEnabled: guestEnabled,
          walletPaymentEnabled: walletEnabled,
          couponValidationEnabled: couponEnabled,
          maintenanceMode: maintenance,
          homepageBanners: bannersJson,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update configurations")

      alert("Feature flags & CMS settings saved successfully!")
      fetchDashboardData()
    } catch (err: any) {
      alert("Error: " + err.message)
    }
  }

  const handleUpdateSellerVerification = async (sellerId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/sellers/${sellerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !currentStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to verify seller account")

      alert("Seller status toggled successfully!")
      fetchDashboardData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleToggleUserRole = async (userId: string, currentRoles: string[], roleToToggle: string) => {
    const isSeller = currentRoles.includes("seller")
    const updatedRoles = currentRoles.includes(roleToToggle)
      ? currentRoles.filter(r => r !== roleToToggle)
      : [...currentRoles, roleToToggle]

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: updatedRoles }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to toggle user role assignments")

      alert("User role changed successfully!")
      fetchDashboardData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleExportSystemReport = () => {
    if (!analytics) return
    const csvRows = [
      ["Nexora Enterprise Administration System Report"],
      ["Date", new Date().toLocaleString()],
      ["Metric", "Value"],
      ["Registered Customers", analytics.totalUsers],
      ["Registered Merchants", analytics.totalSellers],
      ["Aggregated Placed Orders", analytics.totalOrders],
      ["Total Payments Volume (Revenue)", `$${analytics.totalRevenue.toFixed(2)}`],
    ]
    const csvContent = "data:text/csv;charset=utf-8," 
      + csvRows.map(e => e.join(",")).join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "nexora_admin_report.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-zinc-550 dark:bg-zinc-950">
        Loading admin console panel...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl">
        
        {/* Header Dashboard Banner */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-gray-150 pb-6 dark:border-zinc-800">
          <div>
            <h1 className="font-sans text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Enterprise Admin Panel
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Configure parameters, monitor logs, verify sellers, and check system performance metrics.
            </p>
          </div>
          
          <button
            onClick={handleExportSystemReport}
            className="flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-xs font-semibold text-white shadow hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
          >
            Export Platforms Report (CSV)
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Tab Selection */}
        <div className="mb-6 flex gap-1 border-b border-gray-150 pb-px dark:border-zinc-850 overflow-x-auto whitespace-nowrap">
          {[
            { id: "overview", label: "Overview & Analytics" },
            { id: "users", label: `User Directory (${users.length})` },
            { id: "sellers", label: `Sellers approvals (${sellers.length})` },
            { id: "cms", label: "CMS & Features Config" },
            { id: "audits", label: `Audit logs explorer (${auditLogs.length})` },
            { id: "monitoring", label: "System Telemetry" },
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
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <span className="block text-3xs font-bold uppercase tracking-wider text-zinc-400">Aggregate Platform Revenue</span>
                <span className="mt-2 block text-2xl font-black text-zinc-900 dark:text-zinc-50">${analytics.totalRevenue.toFixed(2)}</span>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <span className="block text-3xs font-bold uppercase tracking-wider text-zinc-400">Customer Registrations</span>
                <span className="mt-2 block text-2xl font-black text-zinc-900 dark:text-zinc-50">{analytics.totalUsers}</span>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <span className="block text-3xs font-bold uppercase tracking-wider text-zinc-400">Registered Sellers</span>
                <span className="mt-2 block text-2xl font-black text-zinc-900 dark:text-zinc-50">{analytics.totalSellers}</span>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <span className="block text-3xs font-bold uppercase tracking-wider text-zinc-400">Overall Placed Orders</span>
                <span className="mt-2 block text-2xl font-black text-zinc-900 dark:text-zinc-50">{analytics.totalOrders}</span>
              </div>
            </div>

            {/* Low Stock Alerts */}
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-gray-100 bg-gray-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <h3 className="font-bold text-red-700 dark:text-red-400 text-xs uppercase tracking-wider">
                  ⚠️ Low Stock Level Alerts
                </h3>
              </div>
              {analytics.lowStockAlerts.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400">All products have healthy inventory allocations.</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-zinc-850">
                  {analytics.lowStockAlerts.map((a) => (
                    <div key={a.variantId} className="p-4 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-semibold text-zinc-850 dark:text-zinc-150">{a.productName}</span>
                        <span className="block text-3xs text-zinc-400 font-mono">SKU: {a.sku}</span>
                      </div>
                      <span className="font-bold text-red-600 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded">
                        Only {a.stock} left
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Users Registry */}
        {activeTab === "users" && (
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800 text-xs">
              <thead className="bg-gray-50/50 dark:bg-zinc-900/50">
                <tr className="text-left font-semibold text-zinc-450 uppercase tracking-wider text-2xs">
                  <th className="px-6 py-3.5">User Identity</th>
                  <th className="px-6 py-3.5">Email coordinates</th>
                  <th className="px-6 py-3.5">Account Status</th>
                  <th className="px-6 py-3.5">Assigned Roles</th>
                  <th className="px-6 py-3.5 text-right">Role Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-850 bg-white dark:bg-zinc-900">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/30 dark:hover:bg-zinc-800/10">
                    <td className="px-6 py-4 font-semibold text-zinc-850 dark:text-zinc-200">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-6 py-4 font-mono text-3xs text-zinc-550 break-all">
                      {u.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider ${
                        u.status === "active" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {u.roles.map((role) => (
                          <span key={role} className="rounded bg-gray-100 px-1.5 py-0.5 text-3xs font-semibold text-zinc-700 uppercase dark:bg-zinc-800 dark:text-zinc-350">
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleToggleUserRole(u.id, u.roles, "seller")}
                          className="text-3xs text-indigo-650 hover:underline dark:text-indigo-400"
                        >
                          {u.roles.includes("seller") ? "Strip Seller" : "Make Seller"}
                        </button>
                        <button
                          onClick={() => handleToggleUserRole(u.id, u.roles, "admin")}
                          className="text-3xs text-indigo-650 hover:underline dark:text-indigo-400"
                        >
                          {u.roles.includes("admin") ? "Strip Admin" : "Make Admin"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Sellers Registry */}
        {activeTab === "sellers" && (
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800 text-xs">
              <thead className="bg-gray-50/50 dark:bg-zinc-900/50">
                <tr className="text-left font-semibold text-zinc-450 uppercase tracking-wider text-2xs">
                  <th className="px-6 py-3.5">Store Workspace name</th>
                  <th className="px-6 py-3.5">Contact coordinates</th>
                  <th className="px-6 py-3.5">Tax Identifier</th>
                  <th className="px-6 py-3.5">Verified Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-850 bg-white dark:bg-zinc-900">
                {sellers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/30 dark:hover:bg-zinc-800/10">
                    <td className="px-6 py-4 font-semibold text-zinc-850 dark:text-zinc-200">
                      {s.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-3xs text-zinc-550 break-all">
                      {s.email}
                    </td>
                    <td className="px-6 py-4 text-zinc-500">
                      {s.taxIdentifier || "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider ${
                        s.isVerified ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      }`}>
                        {s.isVerified ? "Verified" : "Suspended / Unverified"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleUpdateSellerVerification(s.id, s.isVerified)}
                        className={`text-3xs font-bold hover:underline ${
                          s.isVerified ? "text-red-500" : "text-green-600"
                        }`}
                      >
                        {s.isVerified ? "Suspend Seller" : "Approve Seller"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: CMS & Settings */}
        {activeTab === "cms" && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-6 text-xs">
            <h3 className="font-sans text-sm font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">
              Feature Flags & Configs settings
            </h3>
            
            <form onSubmit={handleSaveConfig} className="space-y-6">
              
              <div className="grid gap-6 sm:grid-cols-2">
                
                {/* Feature Toggles */}
                <div className="space-y-4">
                  <h4 className="font-bold text-zinc-450 uppercase tracking-wider text-2xs mb-2">Feature Toggles</h4>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={guestEnabled}
                      onChange={(e) => setGuestEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-650"
                    />
                    <div>
                      <span className="block font-semibold text-zinc-800 dark:text-zinc-200">Allow Guest Checkout</span>
                      <span className="text-3xs text-zinc-450">Permits users to place orders without registration.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={walletEnabled}
                      onChange={(e) => setWalletEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-650"
                    />
                    <div>
                      <span className="block font-semibold text-zinc-800 dark:text-zinc-200">Enable Wallet Payments</span>
                      <span className="text-3xs text-zinc-450">Allows users to build balances and spend credits.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={couponEnabled}
                      onChange={(e) => setCouponEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-650"
                    />
                    <div>
                      <span className="block font-semibold text-zinc-800 dark:text-zinc-200">Coupon Validations</span>
                      <span className="text-3xs text-zinc-450">Evaluates discount coupons in the shopping cart.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={maintenance}
                      onChange={(e) => setMaintenance(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-650"
                    />
                    <div>
                      <span className="block font-semibold text-red-500">Platform Maintenance Mode</span>
                      <span className="text-3xs text-red-400">Lock database mutations for system updates.</span>
                    </div>
                  </label>
                </div>

                {/* Homepage Slider CMS */}
                <div>
                  <h4 className="font-bold text-zinc-450 uppercase tracking-wider text-2xs mb-2">Homepage Banners (CMS JSON)</h4>
                  <textarea
                    rows={8}
                    value={bannersJson}
                    onChange={(e) => setBannersJson(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-transparent p-3 font-mono text-3xs focus:outline-none dark:border-zinc-800"
                  />
                  <span className="block text-3xs text-zinc-400 mt-1">Must be a valid serialized JSON array of slides data structure.</span>
                </div>

              </div>

              <button
                type="submit"
                className="flex h-9 w-full items-center justify-center rounded-lg bg-zinc-900 text-xs font-semibold text-white shadow hover:bg-zinc-850 dark:bg-zinc-50 dark:text-zinc-900"
              >
                Save System Configurations
              </button>
            </form>
          </div>
        )}

        {/* Tab 5: Audit Logs */}
        {activeTab === "audits" && (
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-x-auto text-xs">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-zinc-800">
              <thead className="bg-gray-50/50 dark:bg-zinc-900/50">
                <tr className="text-left font-semibold text-zinc-450 uppercase tracking-wider text-2xs">
                  <th className="px-6 py-3.5">Actor</th>
                  <th className="px-6 py-3.5">Action string</th>
                  <th className="px-6 py-3.5">Target Coordinates</th>
                  <th className="px-6 py-3.5">IP Address</th>
                  <th className="px-6 py-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-850 bg-white dark:bg-zinc-900">
                {auditLogs.map((log) => {
                  const actorEmail = log.user ? log.user.email : "Automated CLI / System"
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/30 dark:hover:bg-zinc-800/10">
                      <td className="px-6 py-4 font-semibold text-zinc-800 dark:text-zinc-200">
                        {actorEmail}
                      </td>
                      <td className="px-6 py-4 font-mono text-3xs text-indigo-650 dark:text-indigo-400">
                        {log.action}
                      </td>
                      <td className="px-6 py-4 text-zinc-500 font-mono text-3xs">
                        {log.tableName}#{log.rowId?.substring(0, 8)}
                      </td>
                      <td className="px-6 py-4 text-zinc-500 font-mono text-3xs">
                        {log.ipAddress || "127.0.0.1"}
                      </td>
                      <td className="px-6 py-4 text-zinc-450 text-3xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 6: System Telemetry Monitor */}
        {activeTab === "monitoring" && (
          <div className="grid gap-6 sm:grid-cols-3">
            
            {/* CPU utilization */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 text-xs">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-zinc-450 uppercase tracking-wider text-2xs">System CPU Utilization</span>
                <span className="font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-3xs dark:bg-green-950/20">Operational</span>
              </div>
              <div className="py-4 text-center">
                <span className="text-4xl font-black text-zinc-850 dark:text-zinc-50">{cpu}%</span>
                <div className="mt-4 h-2 w-full rounded bg-gray-150 overflow-hidden dark:bg-zinc-800">
                  <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${cpu}%` }} />
                </div>
              </div>
            </div>

            {/* RAM allocation */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 text-xs">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-zinc-450 uppercase tracking-wider text-2xs">Memory RAM Allocation</span>
                <span className="font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-3xs dark:bg-green-950/20">Active</span>
              </div>
              <div className="py-4 text-center">
                <span className="text-4xl font-black text-zinc-850 dark:text-zinc-50">{memory} GB</span>
                <p className="mt-1 text-3xs text-zinc-450">Allocated out of 8.00 GB available</p>
                <div className="mt-2 h-2 w-full rounded bg-gray-150 overflow-hidden dark:bg-zinc-800">
                  <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${(memory / 8.0) * 100}%` }} />
                </div>
              </div>
            </div>

            {/* DB latencies */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 text-xs">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-zinc-450 uppercase tracking-wider text-2xs">DB Sync Latency</span>
                <span className="font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-3xs dark:bg-green-950/20">SQLite Live</span>
              </div>
              <div className="py-4 text-center">
                <span className="text-4xl font-black text-zinc-850 dark:text-zinc-50">{dbLatency} ms</span>
                <div className="mt-4 h-2 w-full rounded bg-gray-150 overflow-hidden dark:bg-zinc-800">
                  <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${(dbLatency / 15) * 100}%` }} />
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
