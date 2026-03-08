export type ProductResponse = {
  id: string
  categoryId: string
  categoryKey: string
  categoryName: string
  name: string
  description: string
  price: number
  isPublished?: boolean
  onHand: number
  reserved: number
  available: number
  version: number
}

export type ProductListResponse = {
  items: ProductResponse[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export type CartItem = {
  productId: string
  name: string
  price: number
  available: number
  quantity: number
}

export type ProductStatus = "idle" | "loading" | "success" | "error"

export type ProductSort = "name-asc" | "price-asc" | "price-desc" | "stock-desc" | "newest"

export type ProductFilterState = {
  keyword: string
  categoryId: string
  sort: ProductSort
  page: number
}

export type CategoryResponse = {
  id: string
  key: string
  name: string
  sortOrder: number
}

export const ALL_CATEGORY_ID = "all"

export const SORT_LABELS: Record<ProductSort, string> = {
  "name-asc": "名前順",
  "price-asc": "価格が低い順",
  "price-desc": "価格が高い順",
  "stock-desc": "在庫が多い順",
  newest: "新着順",
}
