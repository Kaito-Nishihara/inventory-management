type FetchWithAutoRefreshOptions = {
  url: string
  init?: RequestInit
  accessToken: string
  fetchFn: typeof fetch
  refreshAccessToken: () => Promise<string | null>
  onAuthExpired: () => void
}

function withAuthHeader(init: RequestInit | undefined, accessToken: string): RequestInit {
  const headers = new Headers(init?.headers)
  headers.set("Authorization", `Bearer ${accessToken}`)
  return {
    ...init,
    headers,
  }
}

/**
 * 並行リクエスト時のリフレッシュ競合を排他制御するためのモジュールレベル状態。
 * リフレッシュ中に別のリクエストが 401 を受けた場合、同じ Promise を共有して
 * 重複した refresh API 呼び出しを防ぐ。
 */
let refreshPromise: Promise<string | null> | null = null

export async function fetchWithAutoRefresh(options: FetchWithAutoRefreshOptions): Promise<Response> {
  const first = await options.fetchFn(options.url, withAuthHeader(options.init, options.accessToken))
  if (first.status !== 401) {
    return first
  }

  // リフレッシュの排他制御: 既に進行中なら同じ Promise を待つ
  let refreshedToken: string | null
  if (refreshPromise) {
    refreshedToken = await refreshPromise
  } else {
    refreshPromise = options.refreshAccessToken()
    try {
      refreshedToken = await refreshPromise
    } finally {
      refreshPromise = null
    }
  }

  if (!refreshedToken) {
    options.onAuthExpired()
    return first
  }

  return options.fetchFn(options.url, withAuthHeader(options.init, refreshedToken))
}

/**
 * テスト用: リフレッシュ状態をリセットする。
 */
export function resetRefreshState(): void {
  refreshPromise = null
}
