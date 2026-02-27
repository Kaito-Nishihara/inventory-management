export type CheckoutLineStatus = "processing" | "success" | "failed"

export type CheckoutLineResult = {
  productId: string
  name: string
  quantity: number
  status: CheckoutLineStatus
  message: string
}

export type CheckoutExecutionResult = {
  results: CheckoutLineResult[]
  message: string
}

export type CheckoutSummary = {
  total: number
  processing: number
  success: number
  failed: number
}

export function summarizeCheckoutResults(results: CheckoutLineResult[]): CheckoutSummary {
  return results.reduce<CheckoutSummary>(
    (acc, item) => {
      acc.total += 1
      if (item.status === "processing") acc.processing += 1
      if (item.status === "success") acc.success += 1
      if (item.status === "failed") acc.failed += 1
      return acc
    },
    { total: 0, processing: 0, success: 0, failed: 0 },
  )
}

export function toProcessingLines(items: Array<{ productId: string; name: string; quantity: number }>): CheckoutLineResult[] {
  return items.map((item) => ({
    productId: item.productId,
    name: item.name,
    quantity: item.quantity,
    status: "processing",
    message: "注文処理中...",
  }))
}

export function failedProductIds(results: CheckoutLineResult[]): string[] {
  return results.filter((x) => x.status === "failed").map((x) => x.productId)
}
