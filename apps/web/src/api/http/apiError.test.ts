import { describe, expect, it } from "vitest"
import { normalizeApiError } from "./apiError"

describe("normalizeApiError", () => {
  it("401 は再ログイン要求フラグを返す", async () => {
    const response = new Response("{}", { status: 401, headers: { "Content-Type": "application/json" } })
    const result = await normalizeApiError(response)
    expect(result.requiresLogin).toBe(true)
    expect(result.message).toContain("再ログイン")
  })

  it("ProblemDetails の detail を優先する", async () => {
    const response = new Response(
      JSON.stringify({ title: "Bad Request", detail: "入力が不正です", status: 400 }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )
    const result = await normalizeApiError(response)
    expect(result.message).toBe("入力が不正です")
    expect(result.requiresLogin).toBe(false)
  })

  it("validation_error を日本語メッセージ化する", async () => {
    const response = new Response(
      JSON.stringify({
        code: "validation_error",
        errors: {
          ProductId: ["required"],
        },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )
    const result = await normalizeApiError(response)
    expect(result.code).toBe("validation_error")
    expect(result.message).toBe("商品IDは必須です。")
  })

  it("ProblemDetails の汎用 title はステータス別日本語へフォールバックする", async () => {
    const response = new Response(
      JSON.stringify({ title: "Conflict", status: 409, code: "insufficient_available" }),
      { status: 409, headers: { "Content-Type": "application/json" } },
    )
    const result = await normalizeApiError(response)
    expect(result.code).toBe("insufficient_available")
    expect(result.message).toBe("競合が発生しました。内容を確認して再試行してください。")
  })
})
