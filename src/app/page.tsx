import React from "react"
import Link from "next/link"
import prisma from "@/lib/prisma"
import { 
  ShoppingBag, 
  Search, 
  User, 
  ShieldCheck, 
  Cpu, 
  Wallet, 
  TrendingUp,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Store
} from "lucide-react"

export const revalidate = 60 // Revalidate home page every minute

export default async function Home() {
  // Safe db fetch for featured products
  const featuredProducts = await prisma.product.findMany({
    where: { isActive: true },
    take: 4,
    include: {
      variants: true,
      brand: true,
    },
    orderBy: { createdAt: "desc" },
  }).catch((error) => {
    console.error("Failed to fetch featured products for homepage:", error)
    return []
  })

  // Backup mock products if db is empty
  const fallbackProducts = [
    {
      id: "mock-1",
      name: "Eco-Conscious Tech Hoodie",
      slug: "eco-conscious-tech-hoodie",
      brand: { name: "Aether" },
      price: 89.99,
      image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=600&auto=format&fit=crop"
    },
    {
      id: "mock-2",
      name: "Zero-Waste Insulated Flask",
      slug: "zero-waste-insulated-flask",
      brand: { name: "Kanteen" },
      price: 34.50,
      image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?q=80&w=600&auto=format&fit=crop"
    },
    {
      id: "mock-3",
      name: "Recycled Leather Minimalist Wallet",
      slug: "recycled-leather-minimalist-wallet",
      brand: { name: "Modus" },
      price: 45.00,
      image: "https://images.unsplash.com/photo-1627124718185-60f17fdb96f8?q=80&w=600&auto=format&fit=crop"
    },
    {
      id: "mock-4",
      name: "Bio-Based Ergonomic Sneakers",
      slug: "bio-based-ergonomic-sneakers",
      brand: { name: "Velo" },
      price: 120.00,
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop"
    }
  ]

  const displayProducts = featuredProducts.length > 0 
    ? featuredProducts.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand || { name: "Generic" },
        price: p.variants[0]?.price || 49.99,
        image: p.tags ? JSON.parse(p.tags)[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop" : "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop"
      }))
    : fallbackProducts

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      
      {/* 1. Header/Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-zinc-50/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80 transition-colors">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-650 text-white font-bold text-xl shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
              N
            </span>
            <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Nex<span className="text-indigo-600">ora</span>
            </span>
          </Link>

          {/* Nav Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-650 dark:text-zinc-400">
            <Link href="/search" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Shop Catalog</Link>
            <Link href="/recommendations" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">For You</Link>
            <Link href="/seller" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Seller Hub</Link>
            <Link href="/admin/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Admin Panel</Link>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-4">
            <Link 
              href="/search" 
              className="p-2 text-zinc-650 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 transition-colors"
              title="Search Catalog"
            >
              <Search className="h-5 w-5" />
            </Link>
            
            <Link 
              href="/cart" 
              className="relative p-2 text-zinc-650 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 transition-colors"
              title="View Cart"
            >
              <ShoppingBag className="h-5 w-5" />
            </Link>

            <Link 
              href="/auth/login" 
              className="hidden sm:flex items-center gap-1.5 px-4 h-9 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-semibold shadow-md shadow-zinc-950/10 transition-all hover:-translate-y-0.5 duration-200"
            >
              <User className="h-3.5 w-3.5" />
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        {/* Subtle Background Gradients */}
        <div className="absolute top-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[100px] dark:bg-indigo-600/5" />
        <div className="absolute top-1/3 right-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-violet-500/10 blur-[120px] dark:bg-violet-600/5" />

        <div className="mx-auto max-w-7xl px-6 sm:px-8 text-center sm:text-left">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Hero Left Column */}
            <div className="lg:col-span-7 flex flex-col justify-center gap-6">
              {/* Pill badge */}
              <div className="inline-flex self-center sm:self-start items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                <Sparkles className="h-3 w-3" />
                Experience Modern Retail
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-zinc-950 dark:text-white leading-none">
                The Next Generation of <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-indigo-650 via-violet-600 to-indigo-650 bg-clip-text text-transparent">E-Commerce</span> is Here.
              </h1>

              <p className="max-w-2xl text-lg text-zinc-650 dark:text-zinc-400 leading-relaxed">
                Nexora is a blazing-fast, secure, and multi-tenant marketplace platform. Browse curated collections, checkout instantly with a digital wallet, or launch your own store.
              </p>

              <div className="mt-4 flex flex-col sm:flex-row gap-4 justify-center sm:justify-start">
                <Link 
                  href="/search" 
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-indigo-600 px-8 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 hover:shadow-indigo-500/30 transition-all hover:-translate-y-0.5 duration-200"
                >
                  Shop Catalog
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link 
                  href="/seller" 
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-8 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/85 transition-all hover:-translate-y-0.5 duration-200"
                >
                  <Store className="h-4 w-4" />
                  Become a Seller
                </Link>
              </div>
            </div>

            {/* Hero Right Column */}
            <div className="lg:col-span-5 relative flex items-center justify-center lg:justify-end">
              <div className="relative w-full max-w-[400px] aspect-square rounded-3xl bg-gradient-to-tr from-indigo-650/10 to-violet-650/10 p-8 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-3xl overflow-hidden shadow-2xl shadow-indigo-650/5">
                <div className="absolute inset-0 -z-10 bg-radial-gradient from-white/20 to-transparent dark:from-zinc-950/20" />
                
                {/* Floating Glassmorphic App Stats */}
                <div className="space-y-6 flex flex-col justify-center h-full">
                  <div className="flex items-center gap-4 rounded-2xl bg-white/70 dark:bg-zinc-900/70 p-4 border border-zinc-150 dark:border-zinc-850 shadow-md">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                      <Cpu className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">Elasticsearch Search</h4>
                      <p className="text-xs text-zinc-550 dark:text-zinc-405">Instant query indexing & auto-suggests</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 rounded-2xl bg-white/70 dark:bg-zinc-900/70 p-4 border border-zinc-150 dark:border-zinc-855 shadow-md translate-x-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-650 dark:bg-emerald-950/50 dark:text-emerald-405">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">Instant Wallet Pay</h4>
                      <p className="text-xs text-zinc-550 dark:text-zinc-405">Transaction-safe ledger checkout</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 rounded-2xl bg-white/70 dark:bg-zinc-900/70 p-4 border border-zinc-150 dark:border-zinc-855 shadow-md">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-405">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">Seller Dashboard</h4>
                      <p className="text-xs text-zinc-550 dark:text-zinc-405">Analytics, orders & inventory metrics</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. Platform Stats */}
      <section className="bg-zinc-100 dark:bg-zinc-900/50 py-10 transition-colors">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl font-extrabold text-indigo-650 dark:text-indigo-400">100ms</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mt-1">Search Response</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-indigo-650 dark:text-indigo-400">0%</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mt-1">Transaction Fees</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-indigo-650 dark:text-indigo-400">Active</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mt-1">Multitenancy</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-indigo-650 dark:text-indigo-400">Secure</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mt-1">MFA Encryption</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Curated Categories */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="flex flex-col sm:flex-row items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">Shop Curated Categories</h2>
              <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-2">Find exactly what you need with categories optimized for you.</p>
            </div>
            <Link href="/search" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-450 dark:hover:text-indigo-350">
              Explore All Catalog
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/search?category=apparel" className="group relative h-64 rounded-2xl overflow-hidden shadow-md">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent z-10" />
              <img 
                src="https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=600&auto=format&fit=crop" 
                alt="Apparel Category" 
                className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-6 left-6 z-20">
                <span className="text-xs font-bold text-indigo-450 tracking-wider uppercase">Collection</span>
                <h3 className="text-lg font-bold text-white mt-1">Apparel</h3>
              </div>
            </Link>

            <Link href="/search?category=electronics" className="group relative h-64 rounded-2xl overflow-hidden shadow-md">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent z-10" />
              <img 
                src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop" 
                alt="Electronics Category" 
                className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-6 left-6 z-20">
                <span className="text-xs font-bold text-indigo-450 tracking-wider uppercase">Premium Gear</span>
                <h3 className="text-lg font-bold text-white mt-1">Electronics</h3>
              </div>
            </Link>

            <Link href="/search?category=essentials" className="group relative h-64 rounded-2xl overflow-hidden shadow-md">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent z-10" />
              <img 
                src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=600&auto=format&fit=crop" 
                alt="Essentials Category" 
                className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-6 left-6 z-20">
                <span className="text-xs font-bold text-indigo-450 tracking-wider uppercase">Daily Items</span>
                <h3 className="text-lg font-bold text-white mt-1">Home Essentials</h3>
              </div>
            </Link>

            <Link href="/search?category=eco" className="group relative h-64 rounded-2xl overflow-hidden shadow-md">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent z-10" />
              <img 
                src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=600&auto=format&fit=crop" 
                alt="Eco-Friendly Category" 
                className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-6 left-6 z-20">
                <span className="text-xs font-bold text-indigo-450 tracking-wider uppercase">Sustainable</span>
                <h3 className="text-lg font-bold text-white mt-1">Eco-Conscious</h3>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Featured Arrivals */}
      <section className="bg-zinc-100/40 dark:bg-zinc-900/30 py-20 border-y border-zinc-200/50 dark:border-zinc-800/50 transition-colors">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">Featured Arrivals</h2>
            <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-2">Explore the latest items posted recently onto the Nexora platform.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {displayProducts.map((product) => (
              <div key={product.id} className="group relative flex flex-col rounded-2xl border border-zinc-200/80 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm transition-all hover:shadow-md">
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-805">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="h-full w-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                </div>
                <div className="mt-4 flex flex-col flex-1 gap-1">
                  <span className="text-3xs font-semibold uppercase tracking-wider text-indigo-650 dark:text-indigo-400">
                    {product.brand.name}
                  </span>
                  <Link href={`/products/${product.slug}`} className="text-sm font-bold text-zinc-900 dark:text-white hover:text-indigo-650 dark:hover:text-indigo-400 line-clamp-1">
                    {product.name}
                  </Link>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <span className="text-sm font-extrabold text-zinc-950 dark:text-white">
                      ${product.price.toFixed(2)}
                    </span>
                    <Link 
                      href={`/products/${product.slug}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 hover:bg-indigo-650 hover:text-white dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-indigo-500 dark:hover:text-white transition-colors"
                      title="View Details"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Secure Value Grid */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">Built for Security & Performance</h2>
            <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-2">Nexora utilizes state-of-the-art architectures to guarantee transaction integrity.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 mb-6">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 dark:text-white">Multi-Factor Auth (MFA)</h3>
              <p className="text-sm text-zinc-650 dark:text-zinc-400 mt-3 leading-relaxed">
                Protect your seller account or buyer profile with secure, time-based OTP generators (TOTP) and session token revocation rules.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-650 dark:bg-emerald-950/50 dark:text-emerald-400 mb-6">
                <Wallet className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 dark:text-white">Transactional Wallet API</h3>
              <p className="text-sm text-zinc-650 dark:text-zinc-400 mt-3 leading-relaxed">
                Check out instantly using digital wallets with complete ACID compliance, ensuring double-spend prevention and absolute database rollback.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-650 dark:bg-violet-950/50 dark:text-violet-405 mb-6">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 dark:text-white">Faceted Elasticsearch</h3>
              <p className="text-sm text-zinc-650 dark:text-zinc-405 mt-3 leading-relaxed">
                Search through thousands of SKUs instantly with synonym expansion dictionaries, dynamic filtering, and faceted category aggregation logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="mt-auto border-t border-zinc-200 bg-white dark:border-zinc-850 dark:bg-zinc-950 transition-colors">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-650 text-white font-bold text-xs">N</span>
            <span className="font-bold text-zinc-900 dark:text-white">Nexora Platform</span>
          </div>
          <div className="flex gap-8">
            <Link href="/search" className="hover:text-indigo-650 transition-colors">Catalog</Link>
            <Link href="/seller" className="hover:text-indigo-650 transition-colors">Sellers</Link>
            <Link href="/admin/dashboard" className="hover:text-indigo-650 transition-colors">Admin</Link>
            <a href="https://github.com" className="hover:text-indigo-650 transition-colors" target="_blank" rel="noreferrer">GitHub</a>
          </div>
          <div>
            &copy; {new Date().getFullYear()} Nexora, Inc. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  )
}
