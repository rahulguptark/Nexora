export interface CSVProductRow {
  name: string
  slug: string
  description?: string
  brand?: string
  categories: string[]
  sku: string
  price: number
  compareAtPrice?: number
  weight: number
  color?: string
  size?: string
  inventory: number
  barcode?: string
  images?: string[]
  videos?: string[]
  tags?: string[]
  seoTitle?: string
  seoDescription?: string
  seoKeywords?: string
  visibility?: string
}

// Simple, robust CSV parser handling quoted cells
export function parseCSV(csvContent: string): CSVProductRow[] {
  const rows: CSVProductRow[] = []
  const lines = csvContent.split(/\r?\n/)
  if (lines.length <= 1) return []

  const header = parseCSVLine(lines[0])
  
  const nameIdx = header.findIndex(h => h.toLowerCase() === "name")
  const slugIdx = header.findIndex(h => h.toLowerCase() === "slug")
  const descIdx = header.findIndex(h => h.toLowerCase() === "description")
  const brandIdx = header.findIndex(h => h.toLowerCase() === "brand")
  const catsIdx = header.findIndex(h => h.toLowerCase() === "categories")
  const skuIdx = header.findIndex(h => h.toLowerCase() === "sku")
  const priceIdx = header.findIndex(h => h.toLowerCase() === "price")
  const compPriceIdx = header.findIndex(h => h.toLowerCase() === "compareatprice")
  const weightIdx = header.findIndex(h => h.toLowerCase() === "weight")
  const colorIdx = header.findIndex(h => h.toLowerCase() === "color")
  const sizeIdx = header.findIndex(h => h.toLowerCase() === "size")
  const invIdx = header.findIndex(h => h.toLowerCase() === "inventory")
  const barcodeIdx = header.findIndex(h => h.toLowerCase() === "barcode")
  const imagesIdx = header.findIndex(h => h.toLowerCase() === "images")
  const videosIdx = header.findIndex(h => h.toLowerCase() === "videos")
  const tagsIdx = header.findIndex(h => h.toLowerCase() === "tags")
  const seoTitleIdx = header.findIndex(h => h.toLowerCase() === "seotitle")
  const seoDescIdx = header.findIndex(h => h.toLowerCase() === "seodescription")
  const seoKeyIdx = header.findIndex(h => h.toLowerCase() === "seokeywords")
  const visIdx = header.findIndex(h => h.toLowerCase() === "visibility")

  if (nameIdx === -1 || slugIdx === -1 || skuIdx === -1 || priceIdx === -1) {
    throw new Error("Missing required headers: name, slug, sku, price")
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line)
    if (values.length === 0) continue

    const categories = catsIdx !== -1 && values[catsIdx]
      ? values[catsIdx].split(",").map(c => c.trim()).filter(Boolean)
      : []

    const images = imagesIdx !== -1 && values[imagesIdx]
      ? values[imagesIdx].split(",").map(i => i.trim()).filter(Boolean)
      : []

    const videos = videosIdx !== -1 && values[videosIdx]
      ? values[videosIdx].split(",").map(v => v.trim()).filter(Boolean)
      : []

    const tags = tagsIdx !== -1 && values[tagsIdx]
      ? values[tagsIdx].split(",").map(t => t.trim()).filter(Boolean)
      : []

    rows.push({
      name: values[nameIdx] || "",
      slug: values[slugIdx] || "",
      description: descIdx !== -1 ? values[descIdx] || undefined : undefined,
      brand: brandIdx !== -1 ? values[brandIdx] || undefined : undefined,
      categories,
      sku: values[skuIdx] || "",
      price: priceIdx !== -1 ? parseFloat(values[priceIdx]) || 0 : 0,
      compareAtPrice: compPriceIdx !== -1 && values[compPriceIdx] ? parseFloat(values[compPriceIdx]) : undefined,
      weight: weightIdx !== -1 ? parseFloat(values[weightIdx]) || 0 : 0,
      color: colorIdx !== -1 ? values[colorIdx] || undefined : undefined,
      size: sizeIdx !== -1 ? values[sizeIdx] || undefined : undefined,
      inventory: invIdx !== -1 ? parseInt(values[invIdx], 10) || 0 : 0,
      barcode: barcodeIdx !== -1 ? values[barcodeIdx] || undefined : undefined,
      images,
      videos,
      tags,
      seoTitle: seoTitleIdx !== -1 ? values[seoTitleIdx] || undefined : undefined,
      seoDescription: seoDescIdx !== -1 ? values[seoDescIdx] || undefined : undefined,
      seoKeywords: seoKeyIdx !== -1 ? values[seoKeyIdx] || undefined : undefined,
      visibility: visIdx !== -1 ? values[visIdx] || undefined : undefined,
    })
  }

  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let cell = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(cell.trim())
      cell = ""
    } else {
      cell += char
    }
  }
  result.push(cell.trim())
  
  return result.map(val => {
    // Strip surrounding quotes
    let stripped = val
    if (stripped.startsWith('"') && stripped.endsWith('"')) {
      stripped = stripped.substring(1, stripped.length - 1)
    }
    return stripped.replace(/""/g, '"') // replace escaped double quotes
  })
}
