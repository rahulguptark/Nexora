# Nexora Platform Performance Optimization Manual

This manual details the optimization configurations, implementation guidelines, and caching architectures utilized to achieve low page load speeds and top Core Web Vitals scores.

---

## 1. Core Web Vitals Optimizations

### Largest Contentful Paint (LCP)
To ensure LCP compiles under **2.5 seconds**:
*   **Next.js Image Components**: All product display blocks use Next.js `<Image>` instead of standard `<img>` tags. This automatically enables resizing and converts assets to the WebP format.
*   **Hero Image Preloading**: Top search catalog images are configured with the `priority` flag to trigger preload link tags in the HTML header.

### Interaction to Next Paint (INP)
To keep input latency under **200 milliseconds**:
*   **Search Debouncing**: The search suggestion bar captures typing and waits for a **300ms debounce** limit before calling suggestion queries.
*   **Asynchronous Mutations**: Cart additions and telemetry trackers run asynchronously without blocking browser repaint loops.

### Cumulative Layout Shift (CLS)
To stay under **0.1** CLS:
*   **Explicit Dimensions**: All product media placeholders have explicit aspect-ratio grids, preventing text shifts when images load.

---

## 2. Caching & Memory DB (Redis)

The platform implements a **Dual-Driver Cache Wrapper** inside [cache.ts](file:///Users/rahulgupta/Nexora/src/lib/cache.ts):
*   **Get-Or-Set Pattern**: Heavy operations (such as searching catalog items or compiling autocomplete lists) are wrapped in `getOrSetCache`:
    ```typescript
    const results = await getOrSetCache("search_suggestions", 3600, async () => {
      return prisma.product.findMany(...)
    })
    ```
*   **Fallback Resilience**: If a Redis URL is not configured in local development environments, it seamlessly falls back to high-speed in-memory maps, preventing system crashes.

---

## 3. Bundle Split & Lazy Loading

To optimize bundle payloads:
*   **Dynamic Importing**: Heavy widgets (such as telemetry graphs or click coordinate heatmaps) are split from primary entry bundles using Next.js lazy-loading dynamic imports:
    ```typescript
    import dynamic from 'next/dynamic'
    const VisualHeatmap = dynamic(() => import('@/components/VisualHeatmap'), {
      ssr: false,
      loading: () => <p>Loading telemetry coordinates...</p>
    })
    ```
*   **Tree Shaking**: Only atomic utility functions are imported from external libraries to avoid bloating client-side javascript files.

---

## 4. List Virtualization & Pagination

*   **API Pagination**: All catalog search APIs enforce strict pagination using `limit` and `skip` SQL query offsets:
    ```typescript
    const products = await prisma.product.findMany({
      take: parseInt(limit),
      skip: parseInt(offset),
    })
    ```
*   **List Virtualization**: Heavy administrative directories (such as the 1,000+ system users list) are rendered using viewport virtualization containers. This ensures only visible items have active DOM nodes, dramatically reducing memory overhead.
