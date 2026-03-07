import { describe, expect, it } from "vitest"
import { getOperationLabel, getTransactionTypeLabel, validateOperationQuantity } from "./inventoryOperations"

describe("getOperationLabel", () => {
  it("入庫ラベルを返す", () => {
    expect(getOperationLabel("receive")).toBe("入庫")
  })
  it("出庫ラベルを返す", () => {
    expect(getOperationLabel("issue")).toBe("出庫")
  })
  it("棚卸調整ラベルを返す", () => {
    expect(getOperationLabel("adjust")).toBe("棚卸調整")
  })
})

describe("getTransactionTypeLabel", () => {
  it("既知の取引種別はラベルを返す", () => {
    expect(getTransactionTypeLabel("receive")).toBe("入庫")
    expect(getTransactionTypeLabel("issue")).toBe("出庫")
    expect(getTransactionTypeLabel("adjust")).toBe("棚卸調整")
    expect(getTransactionTypeLabel("reserve")).toBe("引当")
    expect(getTransactionTypeLabel("release")).toBe("引当解除")
  })
  it("未知の種別はそのまま返す", () => {
    expect(getTransactionTypeLabel("unknown_type")).toBe("unknown_type")
  })
})

describe("validateOperationQuantity", () => {
  describe("入庫/出庫", () => {
    it("正の整数はバリデーション成功", () => {
      expect(validateOperationQuantity("receive", "5", "0")).toEqual({ valid: true })
      expect(validateOperationQuantity("issue", "10", "0")).toEqual({ valid: true })
    })
    it("0はバリデーション失敗", () => {
      const result = validateOperationQuantity("receive", "0", "0")
      expect(result.valid).toBe(false)
      expect(result.error).toBe("数量は1以上で指定してください。")
    })
    it("負数はバリデーション失敗", () => {
      const result = validateOperationQuantity("issue", "-3", "0")
      expect(result.valid).toBe(false)
    })
    it("空文字はバリデーション失敗", () => {
      const result = validateOperationQuantity("receive", "", "0")
      expect(result.valid).toBe(false)
    })
    it("非数値はバリデーション失敗", () => {
      const result = validateOperationQuantity("issue", "abc", "0")
      expect(result.valid).toBe(false)
    })
  })

  describe("棚卸調整", () => {
    it("0以上の整数はバリデーション成功", () => {
      expect(validateOperationQuantity("adjust", "1", "0")).toEqual({ valid: true })
      expect(validateOperationQuantity("adjust", "1", "100")).toEqual({ valid: true })
    })
    it("負数はバリデーション失敗", () => {
      const result = validateOperationQuantity("adjust", "1", "-1")
      expect(result.valid).toBe(false)
      expect(result.error).toBe("新しい在庫数は0以上で指定してください。")
    })
    it("非数値はバリデーション失敗", () => {
      const result = validateOperationQuantity("adjust", "1", "xyz")
      expect(result.valid).toBe(false)
    })
  })
})
