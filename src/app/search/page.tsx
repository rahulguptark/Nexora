"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

interface Product {
  id: string
  name: string
  slug: string
  description: string
  brand: string
  categories: string[]
  tags: string[]
  minPrice: number
  maxPrice: number
  colors: string[]
  sizes: string[]
}

interface FacetItem {
  name: string
  count: number
}

interface Facets {
  categories: FacetItem[]
  brands: FacetItem[]
  colors: FacetItem[]
  sizes: FacetItem[]
}

interface SuggestionItem {
  name: string;
  slug: string;
}

function SearchConsole() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Primary Query states
  const [q, setQ] = useState(searchParams.get("q") || "")
  const [category, setCategory] = useState(searchParams.get("category") || "")
  const [brand, setBrand] = useState(searchParams.get("brand") || "")
  const [color, setColor] = useState(searchParams.get("color") || "")
  const [size, setSize] = useState(searchParams.get("size") || "")
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "")
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "")
  const [sort, setSort] = useState(searchParams.get("sort") || "relevance")
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1", 10))

  // Results & Facets state
  const [products, setProducts] = useState<Product[]>([])
  const [facets, setFacets] = useState<Facets>({ categories: [], brands: [], colors: [], sizes: [] })
  const [totalProducts, setTotalProducts] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Autocomplete / suggestions states
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [popularSearches, setPopularSearches] = useState<string[]>([])
  const [trendingProducts, setTrendingProducts] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Fetch search suggestions (popular, recent, trending)
  const fetchSuggestions = async (term: string) => {
    try {
      const res = await fetch(`/api/catalog/search/suggest?q=${encodeURIComponent(term)}`)
      const data = await res.json()
      if (data.success) {
        setSuggestions(data.autocomplete || [])
        setRecentSearches(data.recent || [])
        setPopularSearches(data.popular || [])
        setTrendingProducts(data.trending || [])
      }
    } catch (err) {
      console.error("Suggestions fetch error:", err)
    }
  }

  // Fetch search results
  const fetchSearchResults = async () => {
    setLoading(true)
    setError("")
    
    // Build query path
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (category) params.set("category", category)
    if (brand) params.set("brand", brand)
    if (color) params.set("color", color)
    if (size) params.set("size", size)
    if (minPrice) params.set("minPrice", minPrice)
    if (maxPrice) params.set("maxPrice", maxPrice)
    if (sort) params.set("sort", sort)
    if (page > 1) params.set("page", page.toString())

    try {
      const res = await fetch(`/api/catalog/search?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Search execution failed")
      
      setProducts(data.products || [])
      setFacets(data.facets || { categories: [], brands: [], colors: [], sizes: [] })
      setTotalProducts(data.pagination?.total || 0)
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Load suggestions on load
  useEffect(() => {
    fetchSuggestions(q)
  }, [])

  // Auto query when search parameters change
  useEffect(() => {
    fetchSearchResults()
  }, [category, brand, color, size, sort, page])

  // Handle autocomplete query debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSuggestions(q)
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [q])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowSuggestions(false)
    setPage(1)
    fetchSearchResults()
    // Refresh suggestions to update recent lists
    fetchSuggestions(q)
  }

  const handleSelectSuggestion = (queryStr: string) => {
    setQ(queryStr)
    setShowSuggestions(false)
    setPage(1)
    // Direct fetch
    setTimeout(() => {
      fetchSearchResults()
    }, 50)
  }

  const clearAllFilters = () => {
    setCategory("")
    setBrand("")
    setColor("")
    setSize("")
    setMinPrice("")
    setMaxPrice("")
    setSort("relevance")
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl">
        
        {/* Search Header Bar */}
        <div className="relative mb-8">
          <form onSubmit={handleSearchSubmit} className="relative flex gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={q}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search matching catalogs, brands, tags..."
                className="flex h-12 w-full rounded-xl border border-gray-250 bg-white px-4 text-base shadow-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              />
              
              {/* Autocomplete & suggestion dropdown popover */}
              {showSuggestions && (
                <div className="absolute top-14 left-0 z-50 w-full rounded-2xl border border-gray-150 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                  {suggestions.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-2xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                        Suggested Catalog Items
                      </h4>
                      <div className="space-y-1">
                        {suggestions.map((item) => (
                          <div
                            key={item.slug}
                            onClick={() => router.push(`/products/${item.slug}`)}
                            className="cursor-pointer rounded-lg p-2 text-sm text-zinc-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800 truncate"
                          >
                            🔍 {item.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {recentSearches.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-2xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                        Recent Searches
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => handleSelectSuggestion(term)}
                            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-zinc-650 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-2xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                      Popular Searches
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {popularSearches.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => handleSelectSuggestion(term)}
                          className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-zinc-650 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        >
                          🔥 {term}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              type="submit"
              className="flex h-12 items-center justify-center rounded-xl bg-zinc-900 px-6 font-semibold text-white shadow hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Search
            </button>
          </form>
        </div>

        {/* Display Error Message */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Main Workspace layout */}
        <div className="grid gap-8 lg:grid-cols-4">
          
          {/* 1. Sidebar Facets Filters */}
          <div className="lg:col-span-1 space-y-6">
            
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-50">
                  Search Filters
                </h3>
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Clear All
                </button>
              </div>

              {/* Price slider inputs */}
              <div className="mb-6 border-t border-gray-100 pt-4 dark:border-zinc-800">
                <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2.5">
                  Price Boundaries ($)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-gray-200 bg-transparent px-2.5 text-xs focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                  />
                  <span className="text-zinc-400 text-xs">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-gray-200 bg-transparent px-2.5 text-xs focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:focus:border-indigo-400"
                  />
                </div>
                <button
                  onClick={fetchSearchResults}
                  className="mt-3 flex h-8 w-full items-center justify-center rounded-lg bg-zinc-100 text-xs font-semibold text-zinc-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-350 dark:hover:bg-zinc-700"
                >
                  Apply Price
                </button>
              </div>

              {/* Categories bucket count */}
              {facets.categories.length > 0 && (
                <div className="mb-6 border-t border-gray-100 pt-4 dark:border-zinc-800">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                    Categories
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {facets.categories.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setCategory(category === c.name.toLowerCase() ? "" : c.name.toLowerCase())}
                        className={`flex w-full items-center justify-between text-left text-xs ${
                          category === c.name.toLowerCase()
                            ? "font-bold text-indigo-650 dark:text-indigo-400"
                            : "text-zinc-650 dark:text-zinc-400 hover:underline"
                        }`}
                      >
                        <span>{c.name}</span>
                        <span className="text-3xs text-zinc-400">({c.count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Brands bucket count */}
              {facets.brands.length > 0 && (
                <div className="mb-6 border-t border-gray-100 pt-4 dark:border-zinc-800">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                    Brands
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {facets.brands.map((b) => (
                      <button
                        key={b.name}
                        onClick={() => setBrand(brand === b.name ? "" : b.name)}
                        className={`flex w-full items-center justify-between text-left text-xs ${
                          brand === b.name
                            ? "font-bold text-indigo-650 dark:text-indigo-400"
                            : "text-zinc-650 dark:text-zinc-400 hover:underline"
                        }`}
                      >
                        <span>{b.name}</span>
                        <span className="text-3xs text-zinc-400">({b.count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Colors bucket count */}
              {facets.colors.length > 0 && (
                <div className="mb-6 border-t border-gray-100 pt-4 dark:border-zinc-800">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                    Colors
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {facets.colors.map((col) => (
                      <button
                        key={col.name}
                        onClick={() => setColor(color === col.name ? "" : col.name)}
                        className={`flex w-full items-center justify-between text-left text-xs ${
                          color === col.name
                            ? "font-bold text-indigo-650 dark:text-indigo-400"
                            : "text-zinc-650 dark:text-zinc-400 hover:underline"
                        }`}
                      >
                        <span>{col.name}</span>
                        <span className="text-3xs text-zinc-400">({col.count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sizes bucket count */}
              {facets.sizes.length > 0 && (
                <div className="border-t border-gray-100 pt-4 dark:border-zinc-800">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                    Sizes
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {facets.sizes.map((s) => (
                      <button
                        key={s.name}
                        onClick={() => setSize(size === s.name ? "" : s.name)}
                        className={`flex w-full items-center justify-between text-left text-xs ${
                          size === s.name
                            ? "font-bold text-indigo-650 dark:text-indigo-400"
                            : "text-zinc-650 dark:text-zinc-400 hover:underline"
                        }`}
                      >
                        <span>{s.name}</span>
                        <span className="text-3xs text-zinc-400">({s.count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* 2. Main Search Results Column */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Sorting & Result Counts bar */}
            <div className="flex flex-col justify-between gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                Found <strong>{totalProducts}</strong> products matching search query
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-450 uppercase tracking-wider">Sort by</span>
                <select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value); setPage(1) }}
                  className="flex h-9 w-40 rounded-lg border border-gray-200 bg-white px-2.5 text-xs focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  <option value="relevance">Best Match</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="newest">Newest Arrival</option>
                </select>
              </div>
            </div>

            {/* Products grid */}
            {loading ? (
              <div className="py-32 text-center text-zinc-500">
                Searching catalogs...
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-32 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-zinc-500">No products found. Try synonyms or check for typos.</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-3">
                {products.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/products/${p.slug}`)}
                    className="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow transition-all dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-square w-full overflow-hidden rounded-xl bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                        <span className="text-4xl text-zinc-350 dark:text-zinc-800">📦</span>
                      </div>
                      <span className="mt-3 block text-3xs font-bold uppercase tracking-wider text-indigo-650 dark:text-indigo-400">
                        {p.brand}
                      </span>
                      <h3 className="mt-1 text-sm font-semibold text-zinc-900 group-hover:text-indigo-650 dark:text-zinc-100 dark:group-hover:text-indigo-400 truncate">
                        {p.name}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-500 leading-normal">
                        {p.description}
                      </p>
                    </div>
                    <div className="mt-4 border-t border-gray-50 pt-3 dark:border-zinc-800 flex justify-between items-center">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                        ${p.minPrice.toFixed(2)}{p.minPrice !== p.maxPrice && `+`}
                      </span>
                      <span className="text-3xs text-zinc-400">
                        View details &rarr;
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-sm disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  &larr; Prev
                </button>
                <span className="text-xs text-zinc-500">
                  Page <strong>{page}</strong> of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-sm disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                >
                  Next &rarr;
                </button>
              </div>
            )}

            {/* Trending Products panel */}
            {trendingProducts.length > 0 && products.length > 0 && (
              <div className="mt-12 border-t border-gray-150 pt-8 dark:border-zinc-800">
                <h3 className="mb-6 font-sans text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Trending Products
                </h3>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                  {trendingProducts.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => router.push(`/products/${item.slug}`)}
                      className="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-3 shadow-sm hover:shadow dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="aspect-square w-full overflow-hidden rounded-xl bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
                        <span className="text-3xl text-zinc-300 dark:text-zinc-800">🔥</span>
                      </div>
                      <h4 className="mt-2 text-xs font-semibold text-zinc-900 group-hover:text-indigo-650 dark:text-zinc-150 dark:group-hover:text-indigo-400 truncate">
                        {item.name}
                      </h4>
                      <span className="mt-0.5 block text-2xs font-bold text-zinc-400">
                        ${item.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  )
}

export default function SearchConsolePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-zinc-500 bg-gray-50 dark:bg-zinc-950">
        Loading search engine...
      </div>
    }>
      <SearchConsole />
    </Suspense>
  )
}
