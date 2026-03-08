import { describe, expect, it } from "vitest"
import { buildInventoryAuditQuery } from "./inventoryAuditQuery"

describe("buildInventoryAuditQuery", () => {
  it("takeのみをクエリに含める", () => {
    expect(buildInventoryAuditQuery({ take: 20 })).toBe("take=20")
  })

  it("期間指定時はUTC境界時刻を含める", () => {
    const query = buildInventoryAuditQuery({
      take: 50,
      fromDate: "2026-03-01",
      toDate: "2026-03-08",
    })

    expect(query).toContain("take=50")
    expect(query).toContain("fromUtc=2026-03-01T00%3A00%3A00.000Z")
    expect(query).toContain("toUtc=2026-03-09T00%3A00%3A00.000Z")
  })
})
