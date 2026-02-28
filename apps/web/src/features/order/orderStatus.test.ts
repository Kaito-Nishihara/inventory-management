import { describe, expect, it } from "vitest"
import { getOrderStatusMeta } from "./orderStatus"

describe("orderStatus", () => {
  it("returns localized label for known status", () => {
    expect(getOrderStatusMeta("accepted").label).toBe("受付")
    expect(getOrderStatusMeta("shipped").label).toBe("出荷")
    expect(getOrderStatusMeta("completed").label).toBe("完了")
    expect(getOrderStatusMeta("cancelled").label).toBe("キャンセル")
  })

  it("falls back to raw status for unknown status", () => {
    const meta = getOrderStatusMeta("unknown-status")
    expect(meta.label).toBe("unknown-status")
    expect(meta.className).toContain("zinc")
  })
})
