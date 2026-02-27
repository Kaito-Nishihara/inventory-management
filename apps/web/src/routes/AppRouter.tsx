import { useCallback, useMemo, useState, type FormEvent } from "react"
import { Navigate, Route, Routes, useNavigate } from "react-router-dom"
import { postAuthLogin, type LoginRequest, type PostAuthLoginResponse } from "../api/identity"
import { client } from "../api/identity/client.gen"
import type { CartItem, CategoryResponse, ProductListResponse, ProductResponse } from "../features/catalog/types"
import LoginPage from "../pages/LoginPage"
import ProductDetailPage from "../pages/ProductDetailPage"
import ProductsPage from "../pages/ProductsPage"

type LoginResponse = PostAuthLoginResponse

type LoginStatus = "idle" | "loading" | "success" | "error"

const ADMIN_EMAIL = "admin@test.com"
const USER_EMAIL = "user@test.com"

function AppRouter() {
  const navigate = useNavigate()
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("inventory.jwt"))
  const [email, setEmail] = useState(ADMIN_EMAIL)
  const [password, setPassword] = useState("password")
  const [status, setStatus] = useState<LoginStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [tokenPreview, setTokenPreview] = useState<string | null>(null)
  const [orderMessage, setOrderMessage] = useState<string | null>(null)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)

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
    if (statusCode === 404) return "対象データが見つかりません。"
    if (statusCode === 409) return "在庫不足のため注文できません。"
    return `APIエラーが発生しました (${statusCode})`
  }, [])

  const fetchCategories = useCallback(async (): Promise<CategoryResponse[]> => {
    if (!token) {
      throw new Error("JWT がありません。再ログインしてください。")
    }

    const response = await fetch(`${catalogBaseUrl}/categories`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(mapApiError(response.status))
    }

    return (await response.json()) as CategoryResponse[]
  }, [catalogBaseUrl, mapApiError, token])

  const fetchProductsPage = useCallback(
    async (query: {
      q?: string
      categoryId?: string
      sort?: string
      page: number
      pageSize: number
    }): Promise<ProductListResponse> => {
      if (!token) {
        throw new Error("JWT がありません。再ログインしてください。")
      }

      const params = new URLSearchParams()
      params.set("page", String(query.page))
      params.set("pageSize", String(query.pageSize))
      if (query.q) params.set("q", query.q)
      if (query.categoryId) params.set("categoryId", query.categoryId)
      if (query.sort) params.set("sort", query.sort)

      const response = await fetch(`${catalogBaseUrl}/products?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(mapApiError(response.status))
      }

      return (await response.json()) as ProductListResponse
    },
    [catalogBaseUrl, mapApiError, token],
  )

  const loadProductById = useCallback(
    async (productId: string, accessToken: string) => {
      const response = await fetch(`${catalogBaseUrl}/products/${productId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(mapApiError(response.status))
      }

      return (await response.json()) as ProductResponse
    },
    [catalogBaseUrl, mapApiError],
  )

  const handleAddToCart = (product: ProductResponse) => {
    setOrderMessage(null)
    setCartItems((prev) => {
      const existing = prev.find((x) => x.productId === product.id)
      if (!existing) {
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            available: product.available,
            quantity: 1,
          },
        ]
      }

      if (existing.quantity >= product.available) {
        return prev
      }

      return prev.map((x) =>
        x.productId === product.id ? { ...x, quantity: x.quantity + 1, available: product.available } : x,
      )
    })
  }

  const handleRemoveFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((x) => x.productId !== productId))
  }

  const handleCartQuantityChange = (productId: string, quantity: number) => {
    setCartItems((prev) =>
      prev
        .map((x) =>
          x.productId === productId
            ? { ...x, quantity: Math.max(1, Math.min(quantity, Math.max(1, x.available))) }
            : x,
        )
        .filter((x) => x.quantity > 0),
    )
  }

  const handleCheckout = async () => {
    if (!token) {
      setOrderMessage("JWT がありません。再ログインしてください。")
      return
    }

    if (cartItems.length === 0) {
      setOrderMessage("カートに商品がありません。")
      return
    }

    setIsCheckoutLoading(true)
    setOrderMessage(null)

    try {
      let successCount = 0
      const failedIds = new Set<string>()
      const errors: string[] = []

      for (const item of cartItems) {
        const response = await fetch(`${orderBaseUrl}/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ productId: item.productId, quantity: item.quantity }),
        })

        if (!response.ok) {
          failedIds.add(item.productId)
          errors.push(`${item.name}: ${mapApiError(response.status)}`)
          continue
        }

        successCount += 1
      }

      setCartItems((prev) => prev.filter((x) => failedIds.has(x.productId)))

      if (successCount > 0 && errors.length === 0) {
        setOrderMessage(`注文を作成しました（${successCount}件）。`)
      } else if (successCount > 0) {
        setOrderMessage(`一部成功（${successCount}件）。失敗: ${errors.join(" / ")}`)
      } else {
        setOrderMessage(`注文に失敗しました。${errors.join(" / ")}`)
      }
    } catch (err) {
      setOrderMessage(err instanceof Error ? err.message : "注文に失敗しました。")
    } finally {
      setIsCheckoutLoading(false)
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
      setTokenPreview(`${loginResponse.accessToken.slice(0, 22)}...${loginResponse.accessToken.slice(-18)}`)
      setStatus("success")
      navigate("/products", { replace: true })
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "不明なエラーが発生しました。")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("inventory.jwt")
    setToken(null)
    setOrderMessage(null)
    setCartItems([])
    setStatus("idle")
    setTokenPreview(null)
    navigate("/login", { replace: true })
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          token ? (
            <Navigate to="/products" replace />
          ) : (
            <LoginPage
              identityBaseUrl={identityBaseUrl}
              email={email}
              password={password}
              status={status}
              error={error}
              tokenPreview={tokenPreview}
              adminEmail={ADMIN_EMAIL}
              userEmail={USER_EMAIL}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onPreset={handlePreset}
              onSubmit={handleSubmit}
            />
          )
        }
      />

      <Route
        path="/products"
        element={
          token ? (
            <ProductsPage
              orderMessage={orderMessage}
              cartItems={cartItems}
              isCheckoutLoading={isCheckoutLoading}
              onLogout={handleLogout}
              onAddToCart={handleAddToCart}
              onRemoveFromCart={handleRemoveFromCart}
              onCartQuantityChange={handleCartQuantityChange}
              onCheckout={handleCheckout}
              fetchCategories={fetchCategories}
              fetchProductsPage={fetchProductsPage}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/products/:productId"
        element={
          token ? (
            <ProductDetailPage
              token={token}
              onLogout={handleLogout}
              onAddToCart={handleAddToCart}
              fetchProductById={loadProductById}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to={token ? "/products" : "/login"} replace />} />
    </Routes>
  )
}

export default AppRouter
