import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchWithAutoRefresh, __TEST_ONLY__resetRefreshState } from "./fetchWithAutoRefresh"

afterEach(() => {
  __TEST_ONLY__resetRefreshState()
})

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

  it("並行リクエストで 401 が発生しても refresh は1回だけ呼ばれる", async () => {
    const refreshAccessToken = vi.fn<() => Promise<string | null>>()
    // リフレッシュに少し時間がかかるシミュレーション
    refreshAccessToken.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve("refreshed-token"), 50)),
    )

    // 各リクエスト用の fetch モック（それぞれ独立）
    const makeFetchFn = () => {
      const fn = vi.fn<typeof fetch>()
      fn
        .mockResolvedValueOnce(new Response("", { status: 401 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      return fn
    }

    const fetch1 = makeFetchFn()
    const fetch2 = makeFetchFn()
    const fetch3 = makeFetchFn()
    const onAuthExpired = vi.fn()

    // 3つのリクエストを同時に発行
    const [res1, res2, res3] = await Promise.all([
      fetchWithAutoRefresh({
        url: "http://localhost:5002/products",
        accessToken: "expired-token",
        fetchFn: fetch1,
        refreshAccessToken,
        onAuthExpired,
      }),
      fetchWithAutoRefresh({
        url: "http://localhost:5002/categories",
        accessToken: "expired-token",
        fetchFn: fetch2,
        refreshAccessToken,
        onAuthExpired,
      }),
      fetchWithAutoRefresh({
        url: "http://localhost:5002/orders",
        accessToken: "expired-token",
        fetchFn: fetch3,
        refreshAccessToken,
        onAuthExpired,
      }),
    ])

    // 全リクエストが成功すること
    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
    expect(res3.status).toBe(200)

    // リフレッシュは1回だけ呼ばれること（排他制御の検証）
    expect(refreshAccessToken).toHaveBeenCalledTimes(1)

    // 全リクエストがリフレッシュ後のトークンでリトライされていること
    expect((fetch1.mock.calls[1]?.[1]?.headers as Headers).get("Authorization")).toBe("Bearer refreshed-token")
    expect((fetch2.mock.calls[1]?.[1]?.headers as Headers).get("Authorization")).toBe("Bearer refreshed-token")
    expect((fetch3.mock.calls[1]?.[1]?.headers as Headers).get("Authorization")).toBe("Bearer refreshed-token")

    // 各リクエストが元の URL でリトライされていること
    expect(fetch1.mock.calls[1]?.[0]).toBe("http://localhost:5002/products")
    expect(fetch2.mock.calls[1]?.[0]).toBe("http://localhost:5002/categories")
    expect(fetch3.mock.calls[1]?.[0]).toBe("http://localhost:5002/orders")
  })

  it("並行リクエスト中に refresh が失敗した場合、全リクエストで onAuthExpired が呼ばれる", async () => {
    const refreshAccessToken = vi.fn<() => Promise<string | null>>()
    refreshAccessToken.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(null), 50)),
    )

    const makeFetchFn = () => {
      const fn = vi.fn<typeof fetch>()
      fn.mockResolvedValueOnce(new Response("", { status: 401 }))
      return fn
    }

    const fetch1 = makeFetchFn()
    const fetch2 = makeFetchFn()
    const onAuthExpired = vi.fn()

    const [res1, res2] = await Promise.all([
      fetchWithAutoRefresh({
        url: "http://localhost:5002/products",
        accessToken: "expired-token",
        fetchFn: fetch1,
        refreshAccessToken,
        onAuthExpired,
      }),
      fetchWithAutoRefresh({
        url: "http://localhost:5002/categories",
        accessToken: "expired-token",
        fetchFn: fetch2,
        refreshAccessToken,
        onAuthExpired,
      }),
    ])

    expect(res1.status).toBe(401)
    expect(res2.status).toBe(401)
    expect(refreshAccessToken).toHaveBeenCalledTimes(1)
    // 各リクエストがそれぞれ onAuthExpired を呼ぶ
    expect(onAuthExpired).toHaveBeenCalledTimes(2)
  })

  it("リフレッシュ成功後のリトライも 401 を返した場合は onAuthExpired を呼ばず 401 をそのまま返す", async () => {
    const fetchFn = vi.fn<typeof fetch>()
    fetchFn
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(new Response("", { status: 401 }))
    const onAuthExpired = vi.fn()

    const response = await fetchWithAutoRefresh({
      url: "http://localhost:5002/products",
      accessToken: "old-token",
      fetchFn,
      refreshAccessToken: async () => "new-token",
      onAuthExpired,
    })

    // リトライ結果をそのまま返す（無限ループしない）
    expect(response.status).toBe(401)
    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(onAuthExpired).not.toHaveBeenCalled()
  })

  it("並行リクエスト中に refreshAccessToken が例外をスローした場合、待機中のリクエストにも例外が伝播する", async () => {
    const networkError = new Error("Network Error")
    const refreshAccessToken = vi.fn<() => Promise<string | null>>()
    refreshAccessToken.mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(networkError), 50)),
    )

    const makeFetchFn = () => {
      const fn = vi.fn<typeof fetch>()
      fn.mockResolvedValueOnce(new Response("", { status: 401 }))
      return fn
    }

    const fetch1 = makeFetchFn()
    const fetch2 = makeFetchFn()

    // 2つのリクエストを同時発行: 1つ目が refreshPromise をセット、2つ目が await で待機
    const [result1, result2] = await Promise.allSettled([
      fetchWithAutoRefresh({
        url: "http://localhost:5002/products",
        accessToken: "expired-token",
        fetchFn: fetch1,
        refreshAccessToken,
        onAuthExpired: vi.fn(),
      }),
      fetchWithAutoRefresh({
        url: "http://localhost:5002/categories",
        accessToken: "expired-token",
        fetchFn: fetch2,
        refreshAccessToken,
        onAuthExpired: vi.fn(),
      }),
    ])

    // 両リクエストとも例外が伝播すること
    expect(result1.status).toBe("rejected")
    expect(result2.status).toBe("rejected")
    expect((result1 as PromiseRejectedResult).reason).toBe(networkError)
    expect((result2 as PromiseRejectedResult).reason).toBe(networkError)

    // refresh は1回だけ呼ばれること（排他制御の検証）
    expect(refreshAccessToken).toHaveBeenCalledTimes(1)
  })

  it("refreshAccessToken が例外をスローした場合は finally でリフレッシュ状態をリセットして例外を伝播する", async () => {
    const fetchFn = vi.fn<typeof fetch>()
    fetchFn.mockResolvedValueOnce(new Response("", { status: 401 }))
    const networkError = new Error("Network Error")

    await expect(
      fetchWithAutoRefresh({
        url: "http://localhost:5002/products",
        accessToken: "old-token",
        fetchFn,
        refreshAccessToken: async () => { throw networkError },
        onAuthExpired: vi.fn(),
      }),
    ).rejects.toThrow("Network Error")

    // finally が実行されてリフレッシュ状態がリセットされること（次のリクエストが再度リフレッシュを試みられる）
    const fetchFn2 = vi.fn<typeof fetch>()
    fetchFn2
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(new Response("", { status: 200 }))
    const refreshAccessToken2 = vi.fn<() => Promise<string | null>>().mockResolvedValue("recovered-token")

    const response = await fetchWithAutoRefresh({
      url: "http://localhost:5002/products",
      accessToken: "old-token",
      fetchFn: fetchFn2,
      refreshAccessToken: refreshAccessToken2,
      onAuthExpired: vi.fn(),
    })
    expect(response.status).toBe(200)
    expect(refreshAccessToken2).toHaveBeenCalledTimes(1)
  })

  it("200 の場合はリフレッシュせずにそのまま返す", async () => {
    const fetchFn = vi.fn<typeof fetch>()
    fetchFn.mockResolvedValueOnce(new Response(JSON.stringify({ data: "ok" }), { status: 200 }))
    const refreshAccessToken = vi.fn<() => Promise<string | null>>()

    const response = await fetchWithAutoRefresh({
      url: "http://localhost:5002/products",
      accessToken: "valid-token",
      fetchFn,
      refreshAccessToken,
      onAuthExpired: vi.fn(),
    })

    expect(response.status).toBe(200)
    expect(refreshAccessToken).not.toHaveBeenCalled()
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
})
