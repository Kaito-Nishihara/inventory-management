import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { postAuthLogin, type LoginRequest, type PostAuthLoginResponse } from "./api/identity"
import { client } from "./api/identity/client.gen"
import LoginForm from "./components/login/LoginForm"
import LoginHeader from "./components/login/LoginHeader"
import LoginPresetButtons from "./components/login/LoginPresetButtons"

type LoginResponse = PostAuthLoginResponse
type ProductResponse = {
  id: string
  name: string
  description: string
  price: number
  onHand: number
  reserved: number
  available: number
  version: number
}

type LoginStatus = "idle" | "loading" | "success" | "error"
type ProductStatus = "idle" | "loading" | "success" | "error"

const ADMIN_EMAIL = "admin@test.com"
const USER_EMAIL = "user@test.com"

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("inventory.jwt"))
  const [email, setEmail] = useState(ADMIN_EMAIL)
  const [password, setPassword] = useState("password")
  const [status, setStatus] = useState<LoginStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [tokenPreview, setTokenPreview] = useState<string | null>(null)
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [productsStatus, setProductsStatus] = useState<ProductStatus>("idle")
  const [productsError, setProductsError] = useState<string | null>(null)
  const [orderMessage, setOrderMessage] = useState<string | null>(null)
  const [orderingProductId, setOrderingProductId] = useState<string | null>(null)

  const identityBaseUrl = useMemo(() => {
    const envUrl = import.meta.env.VITE_IDENTITY_API_BASE as string | undefined
    return envUrl ?? "http://localhost:5001"
  }, [])
  const catalogBaseUrl = useMemo(() => {
    const envUrl = import.meta.env.VITE_CATALOG_API_BASE as string | undefined
    return envUrl ?? "http://localhost:5002"
  }, [])
  const orderBaseUrl = useMemo(() => {
    const envUrl = import.meta.env.VITE_ORDER_API_BASE as string | undefined
    return envUrl ?? "http://localhost:5003"
  }, [])

  const mapApiError = useCallback((statusCode: number): string => {
    if (statusCode === 401) return "認証期限切れです。再ログインしてください。"
    if (statusCode === 403) return "この操作を実行する権限がありません。"
    if (statusCode === 409) return "在庫不足のため注文できません。"
    return `APIエラーが発生しました (${statusCode})`
  }, [])

  const loadProducts = useCallback(async (accessToken: string) => {
    setProductsStatus("loading")
    setProductsError(null)

    try {
      const response = await fetch(`${catalogBaseUrl}/products`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(mapApiError(response.status))
      }

      const data = (await response.json()) as ProductResponse[]
      setProducts(data)
      setProductsStatus("success")
    } catch (err) {
      setProductsStatus("error")
      setProductsError(err instanceof Error ? err.message : "商品一覧の取得に失敗しました。")
    }
  }, [catalogBaseUrl, mapApiError])

  const handleCreateOrder = async (productId: string) => {
    if (!token) {
      setOrderMessage("JWT がありません。再ログインしてください。")
      return
    }

    setOrderingProductId(productId)
    setOrderMessage(null)

    try {
      const response = await fetch(`${orderBaseUrl}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, quantity: 1 }),
      })

      if (!response.ok) {
        throw new Error(mapApiError(response.status))
      }

      setOrderMessage("注文を作成しました。")
    } catch (err) {
      setOrderMessage(err instanceof Error ? err.message : "注文に失敗しました。")
    } finally {
      setOrderingProductId(null)
    }
  }

  const handlePreset = (role: "admin" | "user") => {
    setEmail(role === "admin" ? ADMIN_EMAIL : USER_EMAIL)
    setPassword("password")
    setStatus("idle")
    setError(null)
    setTokenPreview(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus("loading")
    setError(null)
    setTokenPreview(null)

    try {
      client.setConfig({ baseUrl: identityBaseUrl })

      const loginBody: LoginRequest = { email, password }
      const { data, error: responseError, response } = await postAuthLogin({
        body: loginBody,
      })

      if (response?.status === 401) {
        throw new Error("メールアドレスまたはパスワードが正しくありません。")
      }

      if (!response?.ok) {
        console.error("Login failed:", { response, responseError })
        throw new Error(`ログインに失敗しました (${response?.status ?? "unknown"})`)
      }

      if (responseError) {
        throw new Error("ログインに失敗しました。")
      }

      const loginResponse = data as LoginResponse | undefined
      if (!loginResponse?.accessToken) {
        throw new Error("トークンが取得できませんでした。")
      }

      localStorage.setItem("inventory.jwt", loginResponse.accessToken)
      setToken(loginResponse.accessToken)
      setTokenPreview(
        `${loginResponse.accessToken.slice(0, 22)}...${loginResponse.accessToken.slice(-18)}`,
      )
      await loadProducts(loginResponse.accessToken)
      setStatus("success")
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "不明なエラーが発生しました。")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("inventory.jwt")
    setToken(null)
    setProducts([])
    setProductsStatus("idle")
    setProductsError(null)
    setOrderMessage(null)
    setStatus("idle")
    setTokenPreview(null)
  }

  useEffect(() => {
    if (token && productsStatus === "idle") {
      void loadProducts(token)
    }
  }, [token, productsStatus, loadProducts])

  if (token) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold text-white">商品一覧</h1>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => loadProducts(token)}
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
              >
                再読み込み
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-rose-400/40 bg-rose-400/10 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-400/20"
              >
                ログアウト
              </button>
            </div>
          </div>

          {productsStatus === "loading" && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              商品一覧を読み込み中...
            </div>
          )}

          {productsStatus === "error" && productsError && (
            <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {productsError}
            </div>
          )}

          {orderMessage && (
            <div className="mb-4 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              {orderMessage}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <article
                key={product.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/30"
              >
                <h2 className="text-lg font-semibold text-white">{product.name}</h2>
                <p className="mt-2 text-sm text-slate-300">{product.description}</p>
                <div className="mt-4 space-y-1 text-sm text-slate-200">
                  <p>価格: ¥{product.price.toLocaleString("ja-JP")}</p>
                  <p>販売可能在庫: {product.available}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCreateOrder(product.id)}
                  disabled={orderingProductId === product.id}
                  className="mt-4 w-full rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
                >
                  {orderingProductId === product.id ? "注文中..." : "この商品を注文"}
                </button>
              </article>
            ))}
          </div>

          {productsStatus === "success" && products.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              公開中の商品がありません。
            </div>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-24 h-72 w-72 rounded-full bg-teal-500/20 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-400/20 blur-[140px]" />
          <div className="absolute left-1/3 top-0 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-16 lg:flex-row lg:items-center lg:justify-between lg:py-24">
          <div className="flex flex-col gap-6 lg:flex-1">
            <LoginHeader identityBaseUrl={identityBaseUrl} />
            <LoginPresetButtons onSelect={handlePreset} />
          </div>

          <LoginForm
            email={email}
            password={password}
            status={status}
            errorMessage={error}
            tokenPreview={tokenPreview}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onSubmit={handleSubmit}
            adminEmail={ADMIN_EMAIL}
            userEmail={USER_EMAIL}
          />
        </div>
      </div>
    </main>
  )
}

export default App
