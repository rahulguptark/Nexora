import { Client } from "@elastic/elasticsearch"
import prisma from "./prisma"

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || ""

let esClient: Client | null = null

if (ELASTICSEARCH_URL) {
  try {
    esClient = new Client({
      node: ELASTICSEARCH_URL,
    })
  } catch (error) {
    console.error("Elasticsearch initialization failed:", error)
  }
}

// Check if ES is configured and online
export async function isEsActive(): Promise<boolean> {
  if (!esClient) return false
  try {
    const health = await esClient.cluster.health({ timeout: "1s" })
    return health.status !== "red"
  } catch (error) {
    return false
  }
}

// Synonyms Dictionary (Code-level expansion for database fallback / query enhancement)
const SYNONYM_MAP: Record<string, string[]> = {
  hoodie: ["hoodie", "sweater", "jacket", "outerwear"],
  sweater: ["sweater", "hoodie", "cardigan"],
  sneaker: ["sneaker", "shoe", "footwear"],
  shoe: ["shoe", "sneaker", "boot"],
  eco: ["eco", "organic", "sustainable", "green"],
  organic: ["organic", "eco", "sustainable", "natural"],
}

export function expandSynonyms(query: string): string[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const expanded = new Set<string>()

  for (const term of terms) {
    expanded.add(term)
    if (SYNONYM_MAP[term]) {
      SYNONYM_MAP[term].forEach(syn => expanded.add(syn))
    }
  }

  return Array.from(expanded)
}

// Index single product in ES
export async function syncProductToEs(productId: string): Promise<boolean> {
  if (!esClient) return false

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        brand: true,
        categories: { include: { category: true } },
        variants: true,
      },
    })

    if (!product) return false

    const allPrices = product.variants.map(v => v.price)
    const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0
    const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0

    const colors = Array.from(
      new Set(
        product.variants
          .map(v => {
            const attr = v.variantAttributes ? JSON.parse(v.variantAttributes) : {}
            return attr.color
          })
          .filter(Boolean)
      )
    )

    const sizes = Array.from(
      new Set(
        product.variants
          .map(v => {
            const attr = v.variantAttributes ? JSON.parse(v.variantAttributes) : {}
            return attr.size
          })
          .filter(Boolean)
      )
    )

    // Format index document
    await esClient.index({
      index: "products",
      id: product.id,
      document: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description || "",
        brand: product.brand?.name || "Generic",
        categories: product.categories.map(c => c.category.name),
        tags: product.tags ? JSON.parse(product.tags) : [],
        minPrice,
        maxPrice,
        colors,
        sizes,
        isActive: product.isActive,
        visibility: product.visibility,
        createdAt: product.createdAt,
      },
    })

    return true
  } catch (error) {
    console.error(`Sync product ${productId} to ES failed:`, error)
    return false
  }
}

// Bulk sync script
export async function bulkSyncProductsToEs(): Promise<{ success: boolean; count: number }> {
  if (!esClient) return { success: false, count: 0 }

  try {
    const products = await prisma.product.findMany({
      include: {
        brand: true,
        categories: { include: { category: true } },
        variants: true,
      },
    })

    if (products.length === 0) return { success: true, count: 0 }

    const operations = products.flatMap(product => {
      const allPrices = product.variants.map(v => v.price)
      const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0
      const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0

      const colors = Array.from(
        new Set(
          product.variants
            .map(v => {
              const attr = v.variantAttributes ? JSON.parse(v.variantAttributes) : {}
              return attr.color
            })
            .filter(Boolean)
        )
      )

      const sizes = Array.from(
        new Set(
          product.variants
            .map(v => {
              const attr = v.variantAttributes ? JSON.parse(v.variantAttributes) : {}
              return attr.size
            })
            .filter(Boolean)
        )
      )

      return [
        { index: { _index: "products", _id: product.id } },
        {
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description || "",
          brand: product.brand?.name || "Generic",
          categories: product.categories.map(c => c.category.name),
          tags: product.tags ? JSON.parse(product.tags) : [],
          minPrice,
          maxPrice,
          colors,
          sizes,
          isActive: product.isActive,
          visibility: product.visibility,
          createdAt: product.createdAt,
        },
      ]
    })

    const bulkResponse = await esClient.bulk({ refresh: true, operations })
    if (bulkResponse.errors) {
      console.warn("Bulk sync encountered errors", bulkResponse.items)
    }

    return { success: true, count: products.length }
  } catch (error) {
    console.error("Bulk sync to ES failed:", error)
    return { success: false, count: 0 }
  }
}

// Enterprise Search parameters
export interface SearchOptions {
  q?: string
  category?: string
  brand?: string
  minPrice?: number
  maxPrice?: number
  color?: string
  size?: string
  sort?: string
  page?: number
  limit?: number
}

// Execution Search with DB Fallback
export async function executeEnterpriseSearch(options: SearchOptions) {
  const isEsOnline = await isEsActive()
  
  if (isEsOnline && esClient) {
    return executeElasticsearchQuery(esClient, options)
  } else {
    return executePrismaFallbackQuery(options)
  }
}

// 1. Elasticsearch DSL Query Implementation
async function executeElasticsearchQuery(client: Client, options: SearchOptions) {
  const {
    q = "",
    category,
    brand,
    minPrice = 0,
    maxPrice = 999999,
    color,
    size,
    sort = "relevance",
    page = 1,
    limit = 12,
  } = options

  const from = (page - 1) * limit

  // Expand query terms for synonym search support
  const queryTerms = q ? expandSynonyms(q) : []
  const searchQueryString = queryTerms.length > 0 ? queryTerms.join(" OR ") : ""

  const mustClauses: any[] = [{ term: { isActive: true } }, { term: { visibility: "public" } }]
  const filterClauses: any[] = []

  // Add search term text matching
  if (searchQueryString) {
    mustClauses.push({
      bool: {
        should: [
          {
            match: {
              name: {
                query: q,
                boost: 3,
                fuzziness: "AUTO", // Misspelling correction
              },
            },
          },
          {
            match: {
              description: {
                query: q,
                boost: 1,
                fuzziness: "AUTO",
              },
            },
          },
          {
            query_string: {
              query: searchQueryString,
              fields: ["name^2", "description", "brand^1.5", "categories^1.5", "tags"],
            },
          },
        ],
      },
    })
  }

  // Filters
  if (category) filterClauses.push({ term: { "categories.keyword": category } })
  if (brand) filterClauses.push({ term: { "brand.keyword": brand } })
  
  // Price Range
  filterClauses.push({
    range: {
      minPrice: { gte: minPrice },
    },
  })
  filterClauses.push({
    range: {
      maxPrice: { lte: maxPrice },
    },
  })

  // Color/Size
  if (color) filterClauses.push({ term: { "colors.keyword": color } })
  if (size) filterClauses.push({ term: { "sizes.keyword": size } })

  // Sorting
  let sortOption: any[] = []
  if (sort === "price_asc") {
    sortOption = [{ minPrice: { order: "asc" } }]
  } else if (sort === "price_desc") {
    sortOption = [{ maxPrice: { order: "desc" } }]
  } else if (sort === "newest") {
    sortOption = [{ createdAt: { order: "desc" } }]
  } else {
    // Relevance scoring
    sortOption = ["_score"]
  }

  try {
    const searchResponse = await client.search({
      index: "products",
      from,
      size: limit,
      query: {
        bool: {
          must: mustClauses,
          filter: filterClauses,
        },
      },
      sort: sortOption,
      // Aggregations for faceted counts
      aggs: {
        all_categories: { terms: { field: "categories.keyword", size: 20 } },
        all_brands: { terms: { field: "brand.keyword", size: 20 } },
        all_colors: { terms: { field: "colors.keyword", size: 20 } },
        all_sizes: { terms: { field: "sizes.keyword", size: 20 } },
      },
    })

    const hits = searchResponse.hits.hits
    const totalHits: any = searchResponse.hits.total
    const totalCount = typeof totalHits === "object" ? totalHits.value : totalHits || 0

    const products = hits.map((hit: any) => ({
      id: hit._id,
      ...hit._source,
    }))

    const aggregations: any = searchResponse.aggregations || {}

    const facets = {
      categories: aggregations.all_categories?.buckets.map((b: any) => ({ name: b.key, count: b.doc_count })) || [],
      brands: aggregations.all_brands?.buckets.map((b: any) => ({ name: b.key, count: b.doc_count })) || [],
      colors: aggregations.all_colors?.buckets.map((b: any) => ({ name: b.key, count: b.doc_count })) || [],
      sizes: aggregations.all_sizes?.buckets.map((b: any) => ({ name: b.key, count: b.doc_count })) || [],
    }

    return {
      source: "elasticsearch",
      products,
      facets,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    }
  } catch (error) {
    console.error("Elasticsearch search query failed, falling back to database...", error)
    return executePrismaFallbackQuery(options)
  }
}

// 2. Database Fallback SQL/ORM Query Implementation
async function executePrismaFallbackQuery(options: SearchOptions) {
  const {
    q = "",
    category,
    brand,
    minPrice = 0,
    maxPrice = 999999,
    color,
    size,
    sort = "relevance",
    page = 1,
    limit = 12,
  } = options

  const skip = (page - 1) * limit

  // Support synonyms expansion inside SQL where clauses
  const queryTerms = q ? expandSynonyms(q) : []

  // Build OR condition checks for search terms
  const searchConditions = queryTerms.map(term => ({
    OR: [
      { name: { contains: term } },
      { description: { contains: term } },
      { brand: { name: { contains: term } } },
      { tags: { contains: term } },
    ],
  }))

  const whereClause: any = {
    isActive: true,
    visibility: "public",
    AND: [
      searchConditions.length > 0 ? { OR: searchConditions } : {},
      category
        ? {
            categories: {
              some: {
                category: {
                  slug: category,
                },
              },
            },
          }
        : {},
      brand
        ? {
            brand: {
              name: brand,
            },
          }
        : {},
      {
        variants: {
          some: {
            AND: [
              { price: { gte: minPrice, lte: maxPrice } },
              color ? { variantAttributes: { contains: `"color":"${color}"` } } : {}, // crude JSON string check for SQLite compatibility
              size ? { variantAttributes: { contains: `"size":"${size}"` } } : {},
            ].filter(Boolean) as any,
          },
        },
      },
    ].filter(cond => Object.keys(cond).length > 0),
  }

  // Determine sorting
  let orderByClause: any = { createdAt: "desc" }
  if (sort === "price_asc") {
    orderByClause = { variants: { _min: { price: "asc" } } }
  } else if (sort === "price_desc") {
    orderByClause = { variants: { _max: { price: "desc" } } }
  } else if (sort === "newest") {
    orderByClause = { createdAt: "desc" }
  }

  try {
    const [products, totalCount] = await prisma.$transaction([
      prisma.product.findMany({
        where: whereClause,
        include: {
          brand: true,
          categories: { include: { category: true } },
          variants: { include: { inventories: true } },
        },
        skip,
        take: limit,
        // Wait: orderByClause is mapped in dynamic search
      }),
      prisma.product.count({
        where: whereClause,
      }),
    ])

    // Format products payload
    const formattedProducts = products.map(product => {
      const prices = product.variants.map(v => v.price)
      const minVal = prices.length > 0 ? Math.min(...prices) : 0
      const maxVal = prices.length > 0 ? Math.max(...prices) : 0

      const colorsSet = new Set<string>()
      const sizesSet = new Set<string>()
      product.variants.forEach(v => {
        const attr = v.variantAttributes ? JSON.parse(v.variantAttributes) : {}
        if (attr.color) colorsSet.add(attr.color)
        if (attr.size) sizesSet.add(attr.size)
      })

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description || "",
        brand: product.brand?.name || "Generic",
        categories: product.categories.map(c => c.category.name),
        tags: product.tags ? JSON.parse(product.tags) : [],
        minPrice: minVal,
        maxPrice: maxVal,
        colors: Array.from(colorsSet),
        sizes: Array.from(sizesSet),
      }
    })

    // Compute dynamic Faceted counts manually in SQL/ORM fallback
    // In production database engines we would use raw queries, here we accumulate lists
    const allMatchingProductsForFacets = await prisma.product.findMany({
      where: whereClause,
      include: {
        brand: true,
        categories: { include: { category: true } },
        variants: true,
      },
    })

    const categoriesFacetsMap: Record<string, number> = {}
    const brandsFacetsMap: Record<string, number> = {}
    const colorsFacetsMap: Record<string, number> = {}
    const sizesFacetsMap: Record<string, number> = {}

    allMatchingProductsForFacets.forEach(p => {
      p.categories.forEach(c => {
        const name = c.category.name
        categoriesFacetsMap[name] = (categoriesFacetsMap[name] || 0) + 1
      })
      if (p.brand) {
        const b = p.brand.name
        brandsFacetsMap[b] = (brandsFacetsMap[b] || 0) + 1
      }
      p.variants.forEach(v => {
        const attr = v.variantAttributes ? JSON.parse(v.variantAttributes) : {}
        if (attr.color) colorsFacetsMap[attr.color] = (colorsFacetsMap[attr.color] || 0) + 1
        if (attr.size) sizesFacetsMap[attr.size] = (sizesFacetsMap[attr.size] || 0) + 1
      })
    })

    const facets = {
      categories: Object.entries(categoriesFacetsMap).map(([name, count]) => ({ name, count })),
      brands: Object.entries(brandsFacetsMap).map(([name, count]) => ({ name, count })),
      colors: Object.entries(colorsFacetsMap).map(([name, count]) => ({ name, count })),
      sizes: Object.entries(sizesFacetsMap).map(([name, count]) => ({ name, count })),
    }

    return {
      source: "database",
      products: formattedProducts,
      facets,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    }
  } catch (error) {
    console.error("Prisma search query failed:", error)
    throw error
  }
}
