export type OrderStatusTransition = {
  nextStatus: "shipped" | "completed" | "cancelled"
  label: string
}

const TRANSITIONS: Record<string, OrderStatusTransition[]> = {
  accepted: [
    { nextStatus: "shipped", label: "出荷に更新" },
    { nextStatus: "cancelled", label: "キャンセルに更新" },
  ],
  shipped: [{ nextStatus: "completed", label: "完了に更新" }],
}

export function getAllowedOrderStatusTransitions(currentStatus: string): OrderStatusTransition[] {
  return TRANSITIONS[currentStatus] ?? []
}

export function mapOrderStatusChangeError(code?: string): string {
  if (code === "invalid_transition") return "不正なステータス遷移です。最新状態を確認してください。"
  if (code === "inventory_release_failed") return "在庫返却に失敗したためキャンセルできませんでした。"
  if (code === "not_found") return "注文が見つかりません。"
  return "ステータス更新に失敗しました。"
}
