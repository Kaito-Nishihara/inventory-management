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
 *
 * 【設計上の前提】並行リクエストのうち最初に refreshPromise をセットした呼び出し元の
 * refreshAccessToken のみが実行される。2番目以降のリクエストは同じ Promise を待つだけで、
 * それぞれが渡した refreshAccessToken は無視される。
 * そのため、すべての呼び出し元が同一の refreshAccessToken 実装を渡す前提で動作している。
 * 呼び出し元ごとに異なるリフレッシュ実装を渡すケースには対応していない。
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
 * テスト専用: リフレッシュ状態をリセットする。
 * 本番コードから呼び出してはいけない。
 *
 * この関数はプロダクションコードからインポートされないため、
 * Vite/Rollup の tree-shaking によって本番バンドルから除外される。
 * もし本番コードから誤ってインポートした場合に備え、
 * VITEST 環境以外では何もしないガードを設けている。
 */
export function __TEST_ONLY__resetRefreshState(): void {
  if (!import.meta.env.VITEST) {
    return
  }
  refreshPromise = null
}
