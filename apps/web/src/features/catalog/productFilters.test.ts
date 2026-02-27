import { describe, expect, it } from "vitest"
import { buildFilterSearchParams, parseFilterState } from "./productFilters"

describe("productFilters", () => {
  it("parses and builds query params", () => {
    const parsed = parseFilterState(new URLSearchParams("q=キー&categoryId=cat-1&sort=stock-desc&page=3"))

    expect(parsed).toEqual({
      keyword: "キー",
      categoryId: "cat-1",
      sort: "stock-desc",
      page: 3,
    })

    const built = buildFilterSearchParams(parsed)
    expect(built.toString()).toBe("q=%E3%82%AD%E3%83%BC&categoryId=cat-1&sort=stock-desc&page=3")
  })

  it("falls back invalid page to 1", () => {
    const parsed = parseFilterState(new URLSearchParams("page=0"))
    expect(parsed.page).toBe(1)
  })
})
