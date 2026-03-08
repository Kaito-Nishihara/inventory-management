import { describe, expect, it } from "vitest"
import { validateAdminProductInput } from "./adminProductValidation"

describe("validateAdminProductInput", () => {
  it("正常な入力は成功を返す", () => {
    const result = validateAdminProductInput({
      categoryId: "cat-1",
      name: "キーボード",
      description: "メカニカル",
      priceText: "12000",
    })

    expect(result).toEqual({ ok: true, price: 12000 })
  })

  it("カテゴリ未選択は失敗を返す", () => {
    const result = validateAdminProductInput({
      categoryId: "",
      name: "キーボード",
      description: "メカニカル",
      priceText: "12000",
    })

    expect(result).toEqual({ ok: false, message: "カテゴリを選択してください。" })
  })

  it("価格が不正な場合は失敗を返す", () => {
    const result = validateAdminProductInput({
      categoryId: "cat-1",
      name: "キーボード",
      description: "メカニカル",
      priceText: "0",
    })

    expect(result).toEqual({ ok: false, message: "価格は1以上で入力してください。" })
  })
})
