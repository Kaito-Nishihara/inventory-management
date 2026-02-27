import { describe, expect, it } from "vitest"
import {
  failedProductIds,
  summarizeCheckoutResults,
  toProcessingLines,
  type CheckoutLineResult,
} from "./checkoutSummary"

describe("checkoutSummary", () => {
  it("summarizes result counts", () => {
    const results: CheckoutLineResult[] = [
      { productId: "1", name: "A", quantity: 1, status: "processing", message: "..." },
      { productId: "2", name: "B", quantity: 1, status: "success", message: "ok" },
      { productId: "3", name: "C", quantity: 2, status: "failed", message: "ng" },
    ]

    expect(summarizeCheckoutResults(results)).toEqual({
      total: 3,
      processing: 1,
      success: 1,
      failed: 1,
    })
  })

  it("builds processing lines and failed ids", () => {
    const processing = toProcessingLines([
      { productId: "1", name: "A", quantity: 1 },
      { productId: "2", name: "B", quantity: 2 },
    ])

    expect(processing.every((x) => x.status === "processing")).toBe(true)

    const ids = failedProductIds([
      ...processing,
      { productId: "x", name: "X", quantity: 1, status: "failed", message: "ng" },
    ])

    expect(ids).toEqual(["x"])
  })
})
