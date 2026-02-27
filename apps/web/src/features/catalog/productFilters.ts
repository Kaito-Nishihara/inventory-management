import {
  ALL_CATEGORY_ID,
  type ProductFilterState,
  type ProductSort,
} from "./types"

export function parseFilterState(searchParams: URLSearchParams): ProductFilterState {
  const keyword = searchParams.get("q") ?? ""
  const categoryId = searchParams.get("categoryId") ?? ALL_CATEGORY_ID
  const sort = parseSort(searchParams.get("sort"))
  const page = parsePage(searchParams.get("page"))

  return { keyword, categoryId, sort, page }
}

export function buildFilterSearchParams(filter: ProductFilterState): URLSearchParams {
  const params = new URLSearchParams()

  if (filter.keyword.trim().length > 0) {
    params.set("q", filter.keyword.trim())
  }

  if (filter.categoryId !== ALL_CATEGORY_ID) {
    params.set("categoryId", filter.categoryId)
  }

  if (filter.sort !== "name-asc") {
    params.set("sort", filter.sort)
  }

  if (filter.page > 1) {
    params.set("page", String(filter.page))
  }

  return params
}

function parseSort(value: string | null): ProductSort {
  if (
    value === "price-asc" ||
    value === "price-desc" ||
    value === "stock-desc" ||
    value === "newest" ||
    value === "name-asc"
  ) {
    return value
  }

  return "name-asc"
}

function parsePage(value: string | null): number {
  if (!value) {
    return 1
  }

  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed < 1) {
    return 1
  }

  return parsed
}
