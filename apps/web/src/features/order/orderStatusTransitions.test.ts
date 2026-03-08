import { describe, expect, it } from "vitest"
import { getAllowedOrderStatusTransitions, mapOrderStatusChangeError } from "./orderStatusTransitions"

describe("getAllowedOrderStatusTransitions", () => {
  it("accepted からの遷移候補を返す", () => {
    expect(getAllowedOrderStatusTransitions("accepted")).toEqual([
      { nextStatus: "shipped", label: "出荷に更新" },
      { nextStatus: "cancelled", label: "キャンセルに更新" },
    ])
  })

  it("shipped からの遷移候補を返す", () => {
    expect(getAllowedOrderStatusTransitions("shipped")).toEqual([
      { nextStatus: "completed", label: "完了に更新" },
    ])
  })

  it("終端ステータスは遷移候補なし", () => {
    expect(getAllowedOrderStatusTransitions("completed")).toEqual([])
    expect(getAllowedOrderStatusTransitions("cancelled")).toEqual([])
  })
})

describe("mapOrderStatusChangeError", () => {
  it("既知コードを日本語メッセージに変換する", () => {
    expect(mapOrderStatusChangeError("invalid_transition")).toContain("不正なステータス遷移")
    expect(mapOrderStatusChangeError("inventory_release_failed")).toContain("在庫返却に失敗")
    expect(mapOrderStatusChangeError("not_found")).toContain("注文が見つかりません")
  })

  it("未知コードは汎用メッセージを返す", () => {
    expect(mapOrderStatusChangeError("unknown")).toBe("ステータス更新に失敗しました。")
  })
})
