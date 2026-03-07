import type { InventoryOperationType } from "./types"

const OPERATION_LABELS: Record<InventoryOperationType, string> = {
  receive: "入庫",
  issue: "出庫",
  adjust: "棚卸調整",
}

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  receive: "入庫",
  issue: "出庫",
  adjust: "棚卸調整",
  reserve: "引当",
  release: "引当解除",
}

/**
 * 在庫操作種別の日本語ラベルを返す
 */
export function getOperationLabel(type: InventoryOperationType): string {
  return OPERATION_LABELS[type]
}

/**
 * 在庫履歴の取引種別ラベルを返す
 */
export function getTransactionTypeLabel(type: string): string {
  return TRANSACTION_TYPE_LABELS[type] ?? type
}

/**
 * 在庫操作の数量バリデーション
 */
export function validateOperationQuantity(
  operationType: InventoryOperationType,
  quantityText: string,
  newOnHandText: string,
): { valid: boolean; error?: string } {
  if (operationType === "adjust") {
    const newOnHand = Number(newOnHandText)
    if (!Number.isFinite(newOnHand) || newOnHand < 0) {
      return { valid: false, error: "新しい在庫数は0以上で指定してください。" }
    }
    return { valid: true }
  }

  const quantity = Number(quantityText)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { valid: false, error: "数量は1以上で指定してください。" }
  }
  return { valid: true }
}
