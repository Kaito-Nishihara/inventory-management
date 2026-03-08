import { describe, expect, it, vi } from "vitest"
import { fetchWithAutoRefresh } from "./fetchWithAutoRefresh"

describe("fetchWithAutoRefresh", () => {
  it("401 の場合に refresh 後に1回だけ再試行する", async () => {
    const fetchFn = vi.fn<typeof fetch>()
    fetchFn
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } }))

    const response = await fetchWithAutoRefresh({
      url: "http://localhost:5002/products",
      accessToken: "old-token",
      fetchFn,
      refreshAccessToken: async () => "new-token",
      onAuthExpired: vi.fn(),
    })

    expect(response.status).toBe(200)
    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(fetchFn.mock.calls[1]?.[1]?.headers).toBeInstanceOf(Headers)
    expect((fetchFn.mock.calls[1]?.[1]?.headers as Headers).get("Authorization")).toBe("Bearer new-token")
  })

  it("refresh 失敗時は onAuthExpired を呼ぶ", async () => {
    const fetchFn = vi.fn<typeof fetch>()
    fetchFn.mockResolvedValueOnce(new Response("", { status: 401 }))
    const onAuthExpired = vi.fn()

    const response = await fetchWithAutoRefresh({
      url: "http://localhost:5002/products",
      accessToken: "old-token",
      fetchFn,
      refreshAccessToken: async () => null,
      onAuthExpired,
    })

    expect(response.status).toBe(401)
    expect(onAuthExpired).toHaveBeenCalledTimes(1)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})
