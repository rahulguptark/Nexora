"use client"

import React, { useState, useEffect, useRef } from "react"

interface DaySales {
  day: string
  sales: number
  orders: number
}

interface ConversionFunnel {
  visits: number
  cartAdds: number
  checkouts: number
  orders: number
}

interface TrafficEntry {
  path: string
  count: number
}

interface ClickLog {
  id: string
  pagePath: string
  selector: string
  x: number
  y: number
}

export default function AnalyticsDashboard() {
  const [salesData, setSalesData] = useState<{
    totalRevenue: number
    totalOrdersCount: number
    averageOrderValue: number
    salesOverTime: DaySales[]
  } | null>(null)
  
  const [funnel, setFunnel] = useState<ConversionFunnel | null>(null)
  const [traffic, setTraffic] = useState<TrafficEntry[]>([])
  const [clicks, setClicks] = useState<ClickLog[]>([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [heatmapPath, setHeatmapPath] = useState("/")

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/admin/analytics")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to query analytics engine")

      setSalesData(data.sales)
      setFunnel(data.conversionFunnel)
      setTraffic(data.trafficLogs || [])
      setClicks(data.clickLogs || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const handleExportData = () => {
    if (!salesData) return
    const csvRows = [
      ["Nexora Sales & Telemetry Report"],
      ["Generated On", new Date().toLocaleString()],
      ["Day", "Orders Count", "Sales Amount ($)"],
      ...salesData.salesOverTime.map(d => [d.day, d.orders, d.sales.toFixed(2)]),
    ]
    const csvContent = "data:text/csv;charset=utf-8," 
      + csvRows.map(e => e.join(",")).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "sales_analytics_report.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredClicks = clicks.filter(c => c.pagePath === heatmapPath)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-zinc-550 dark:bg-zinc-950">
        Loading analytics engine details...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Header Block */}
        <div className="border-b border-gray-150 pb-4 dark:border-zinc-800 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-sans text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Platform Analytics
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Monitor conversion drops, traffic, click coordinates heatmaps, and weekly sales metrics.
            </p>
          </div>
          
          <button
            onClick={handleExportData}
            className="flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-xs font-semibold text-white shadow hover:bg-zinc-850 dark:bg-zinc-50 dark:text-zinc-900"
          >
            Export Sales Report (CSV)
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* 1. Top Level Cards */}
        {salesData && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <span className="block text-3xs font-bold uppercase tracking-wider text-zinc-400">Platform Payouts Revenue</span>
              <span className="mt-2 block text-2xl font-black text-zinc-900 dark:text-zinc-50">${salesData.totalRevenue.toFixed(2)}</span>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <span className="block text-3xs font-bold uppercase tracking-wider text-zinc-400">Overall Placed Orders</span>
              <span className="mt-2 block text-2xl font-black text-zinc-900 dark:text-zinc-50">{salesData.totalOrdersCount} orders</span>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <span className="block text-3xs font-bold uppercase tracking-wider text-zinc-400">Average Order Value (AOV)</span>
              <span className="mt-2 block text-2xl font-black text-zinc-900 dark:text-zinc-50">${salesData.averageOrderValue.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          
          {/* 2. Sales Over Time (Chart Visualization) */}
          {salesData && (
            <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-sm dark:border-zinc-850 dark:bg-zinc-900 space-y-4">
              <h3 className="font-sans text-xs font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-wider">
                Sales Performance (Last 7 Days)
              </h3>
              
              {/* Graphical representation using CSS columns */}
              <div className="flex h-48 items-end gap-3 border-b border-gray-100 pb-2 dark:border-zinc-850">
                {salesData.salesOverTime.map((d, index) => {
                  const maxSales = Math.max(...salesData.salesOverTime.map(x => x.sales)) || 1
                  const heightPercent = (d.sales / maxSales) * 100

                  return (
                    <div key={index} className="flex flex-1 flex-col items-center group relative">
                      {/* Tooltip */}
                      <span className="absolute bottom-full mb-2 hidden rounded bg-zinc-900 px-2 py-0.5 text-3xs text-white group-hover:block dark:bg-zinc-50 dark:text-zinc-950 font-bold">
                        ${d.sales.toFixed(2)}
                      </span>
                      {/* Bar */}
                      <div
                        className="w-full bg-indigo-650 rounded-t hover:bg-indigo-500 transition-all duration-500"
                        style={{ height: `${Math.max(heightPercent, 5)}%` }}
                      />
                      <span className="mt-2 text-3xs text-zinc-400 font-semibold uppercase">{d.day}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 3. Conversion Funnel Visualizer */}
          {funnel && (
            <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-sm dark:border-zinc-850 dark:bg-zinc-900 space-y-4">
              <h3 className="font-sans text-xs font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-wider">
                Conversion Funnel Drops
              </h3>
              
              <div className="space-y-4 text-xs">
                
                {/* Step 1: Catalog views */}
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>1. Catalog / Shop Views</span>
                    <span>{funnel.visits} views (100%)</span>
                  </div>
                  <div className="h-2 w-full rounded bg-gray-100 dark:bg-zinc-800">
                    <div className="h-full bg-green-500 rounded" style={{ width: "100%" }} />
                  </div>
                </div>

                {/* Step 2: Add to Cart */}
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>2. Shopping Cart Views</span>
                    <span>{funnel.cartAdds} adds ({((funnel.cartAdds / funnel.visits) * 100).toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 w-full rounded bg-gray-100 dark:bg-zinc-800">
                    <div className="h-full bg-amber-500 rounded" style={{ width: `${Math.min((funnel.cartAdds / funnel.visits) * 100, 100)}%` }} />
                  </div>
                </div>

                {/* Step 3: Checkout Page */}
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>3. Checkout Initiated</span>
                    <span>{funnel.checkouts} starts ({((funnel.checkouts / funnel.visits) * 100).toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 w-full rounded bg-gray-100 dark:bg-zinc-800">
                    <div className="h-full bg-orange-500 rounded" style={{ width: `${Math.min((funnel.checkouts / funnel.visits) * 100, 100)}%` }} />
                  </div>
                </div>

                {/* Step 4: Complete orders */}
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>4. Completed Purchases</span>
                    <span>{funnel.orders} paid ({((funnel.orders / funnel.visits) * 100).toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 w-full rounded bg-gray-100 dark:bg-zinc-800">
                    <div className="h-full bg-red-500 rounded" style={{ width: `${Math.min((funnel.orders / funnel.visits) * 100, 100)}%` }} />
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        <div className="grid gap-6 md:grid-cols-3">
          
          {/* 4. Click Heatmaps coordinates viewer */}
          <div className="md:col-span-2 rounded-2xl border border-gray-150 bg-white p-6 shadow-sm dark:border-zinc-850 dark:bg-zinc-900 space-y-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-sans text-xs font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-wider">
                Selector Click Heatmap Coordinates
              </h3>
              <select
                value={heatmapPath}
                onChange={(e) => setHeatmapPath(e.target.value)}
                className="flex h-7 rounded border border-gray-250 bg-white px-2 text-3xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              >
                <option value="/">Home Path</option>
                <option value="/search">Search Path</option>
                <option value="/cart">Cart Path</option>
                <option value="/checkout">Checkout Path</option>
              </select>
            </div>

            {/* Simulated website frame plotting red coordinate dots */}
            <div className="relative h-60 w-full rounded-xl border border-gray-100 bg-gray-50/50 overflow-hidden dark:border-zinc-850 dark:bg-zinc-950/20">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none text-gray-300 font-bold text-xs uppercase tracking-wider">
                Simulated Screen Page Frame ({heatmapPath})
              </div>

              {/* Red heatmap dots */}
              {filteredClicks.map((c) => {
                // Limit coordinate offsets within container constraints (x: 0-400, y: 0-240)
                const left = (c.x % 100) + 100 // Mock positioning scaling to fit card
                const top = (c.y % 100) + 60
                
                return (
                  <div
                    key={c.id}
                    className="absolute h-3 w-3 rounded-full bg-red-500 opacity-60 border border-white transform -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${left}px`, top: `${top}px` }}
                    title={`Click at (${c.x}, ${c.y}) on: ${c.selector}`}
                  />
                )
              })}
            </div>
            <p className="text-3xs text-zinc-400 font-semibold uppercase tracking-wider">
              Currently plotting {filteredClicks.length} logged click coordinates. Hover coordinates to inspect selectors.
            </p>
          </div>

          {/* 5. Page Traffic Logs list */}
          <div className="md:col-span-1 rounded-2xl border border-gray-150 bg-white p-6 shadow-sm dark:border-zinc-850 dark:bg-zinc-900 space-y-4 text-xs">
            <h3 className="font-sans text-xs font-bold text-zinc-900 dark:text-zinc-150 uppercase tracking-wider">
              Path Traffic Logs
            </h3>
            <div className="divide-y divide-gray-100 dark:divide-zinc-850">
              {traffic.map((entry) => (
                <div key={entry.path} className="py-2.5 flex justify-between items-center">
                  <span className="font-mono text-zinc-700 dark:text-zinc-350">{entry.path}</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{entry.count} visits</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
