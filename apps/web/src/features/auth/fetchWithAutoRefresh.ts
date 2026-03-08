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

export async function fetchWithAutoRefresh(options: FetchWithAutoRefreshOptions): Promise<Response> {
  const first = await options.fetchFn(options.url, withAuthHeader(options.init, options.accessToken))
  if (first.status !== 401) {
    return first
  }

  const refreshedToken = await options.refreshAccessToken()
  if (!refreshedToken) {
    options.onAuthExpired()
    return first
  }

  return options.fetchFn(options.url, withAuthHeader(options.init, refreshedToken))
}
