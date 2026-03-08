export type AdminProductValidationResult =
  | { ok: true; price: number }
  | { ok: false; message: string }

export function validateAdminProductInput(input: {
  categoryId: string
  name: string
  description: string
  priceText: string
}): AdminProductValidationResult {
  if (!input.categoryId) {
    return { ok: false, message: "カテゴリを選択してください。" }
  }
  if (!input.name.trim()) {
    return { ok: false, message: "商品名を入力してください。" }
  }
  if (!input.description.trim()) {
    return { ok: false, message: "商品説明を入力してください。" }
  }

  const price = Number(input.priceText)
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, message: "価格は1以上で入力してください。" }
  }

  return { ok: true, price }
}
