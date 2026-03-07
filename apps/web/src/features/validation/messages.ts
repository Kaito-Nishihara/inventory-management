export type ValidationErrorResponse = {
  code: string
  errors?: Record<string, string[]>
}

const FIELD_LABELS: Record<string, string> = {
  ProductId: "商品ID",
  CategoryId: "カテゴリID",
  FromLocationId: "移動元ロケーション",
  ToLocationId: "移動先ロケーション",
  Quantity: "数量",
  ExpectedVersion: "バージョン",
  NewOnHand: "新しい在庫数",
  Name: "商品名",
  Description: "商品説明",
  Price: "価格",
  NextStatus: "遷移先ステータス",
  Email: "メールアドレス",
  Password: "パスワード",
  RefreshToken: "リフレッシュトークン",
  Note: "メモ",
}

const CODE_MESSAGES: Record<string, string> = {
  required: "{field}は必須です。",
  string_length: "{field}の文字数が不正です。",
  range: "{field}の値が不正です。",
  email: "{field}の形式が不正です。",
  non_empty_guid: "{field}は必須です。",
}

function formatMessage(field: string, code: string): string {
  const fieldLabel = FIELD_LABELS[field] ?? field
  const template = CODE_MESSAGES[code] ?? "{field}が不正です。"
  return template.replace("{field}", fieldLabel)
}

export async function mapValidationMessageFromResponse(response: Response): Promise<string | null> {
  if (response.status !== 400) return null

  try {
    const payload = (await response.json()) as ValidationErrorResponse
    if (payload.code !== "validation_error" || !payload.errors) return null

    const first = Object.entries(payload.errors).find((x) => x[1].length > 0)
    if (!first) return null
    const [field, codes] = first
    return formatMessage(field, codes[0] ?? "")
  } catch {
    return null
  }
}
