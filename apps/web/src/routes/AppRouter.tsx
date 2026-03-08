import { useCallback, useMemo, useState, type FormEvent } from "react"
import { Navigate, Route, Routes, useNavigate } from "react-router-dom"
import { postAuthLogin, type LoginRequest, type PostAuthLoginResponse } from "../api/identity"
import { client } from "../api/identity/client.gen"
import { getRoleFromJwt } from "../features/auth/tokenRole"
import type { CartItem, CategoryResponse, ProductListResponse, ProductResponse } from "../features/catalog/types"
import { mapValidationMessageFromResponse } from "../features/validation/messages"
import type { CheckoutExecutionResult, CheckoutLineResult } from "../features/order/checkoutSummary"
import { mapOrderStatusChangeError } from "../features/order/orderStatusTransitions"
import type { OrderResponse } from "../features/order/types"
import type {
  AuthAuditLogResponse,
  LocationInventoryStockResponse,
  LocationTransferCreatedResponse,
  LocationInventoryTransferResponse,
  StockLocationResponse,
  InventoryOperationResult,
  InventoryTransactionResponse,
} from "../features/inventory/types"
import { buildInventoryAuditQuery } from "../features/inventory/inventoryAuditQuery"
import AdminInventoryPage from "../pages/AdminInventoryPage"
import AdminInventoryAuditPage from "../pages/AdminInventoryAuditPage"
import AdminInventoryOperationsPage from "../pages/AdminInventoryOperationsPage"
import AdminProductsPage from "../pages/AdminProductsPage"
import CheckoutPage from "../pages/CheckoutPage"
import LoginPage from "../pages/LoginPage"
import OrdersPage from "../pages/OrdersPage"
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
  const mapApiErrorResponse = useCallback(
    async (response: Response): Promise<string> => {
      const validationMessage = await mapValidationMessageFromResponse(response.clone())
      if (validationMessage) return validationMessage
      return mapApiError(response.status)
    },
    [mapApiError],
  )
  const isAdmin = useMemo(() => getRoleFromJwt(token) === "admin", [token])

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
      throw new Error(await mapApiErrorResponse(response))
    }

    return (await response.json()) as CategoryResponse[]
  }, [catalogBaseUrl, mapApiErrorResponse, token])

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
        throw new Error(await mapApiErrorResponse(response))
      }

      return (await response.json()) as ProductListResponse
    },
    [catalogBaseUrl, mapApiErrorResponse, token],
  )

  const loadProductById = useCallback(
    async (productId: string, accessToken: string) => {
      const response = await fetch(`${catalogBaseUrl}/products/${productId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(await mapApiErrorResponse(response))
      }

      return (await response.json()) as ProductResponse
    },
    [catalogBaseUrl, mapApiErrorResponse],
  )

  const fetchAdminProductsPage = useCallback(
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

      const response = await fetch(`${catalogBaseUrl}/admin/products?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(await mapApiErrorResponse(response))
      }

      return (await response.json()) as ProductListResponse
    },
    [catalogBaseUrl, mapApiErrorResponse, token],
  )

  const createAdminProduct = useCallback(
    async (draft: {
      categoryId: string
      name: string
      description: string
      price: number
    }): Promise<{ ok: boolean; code?: string; message: string; productId?: string }> => {
      if (!token) {
        return { ok: false, message: "JWT がありません。再ログインしてください。" }
      }

      const response = await fetch(`${catalogBaseUrl}/admin/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      })

      if (response.status === 201) {
        const body = (await response.json()) as { productId?: string }
        return { ok: true, message: "商品を作成しました。", productId: body.productId }
      }

      if (response.status === 400) {
        return { ok: false, code: "validation_error", message: await mapApiErrorResponse(response) }
      }
      if (response.status === 409) {
        return { ok: false, code: "conflict", message: "競合が発生しました。内容を確認して再試行してください。" }
      }
      return { ok: false, message: await mapApiErrorResponse(response) }
    },
    [catalogBaseUrl, mapApiErrorResponse, token],
  )

  const updateAdminProduct = useCallback(
    async (
      productId: string,
      draft: {
        categoryId: string
        name: string
        description: string
        price: number
      },
    ): Promise<{ ok: boolean; code?: string; message: string }> => {
      if (!token) {
        return { ok: false, message: "JWT がありません。再ログインしてください。" }
      }

      const response = await fetch(`${catalogBaseUrl}/admin/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      })

      if (response.status === 204) {
        return { ok: true, message: "商品情報を更新しました。" }
      }

      if (response.status === 404) {
        return { ok: false, code: "not_found", message: "商品が見つかりません。" }
      }
      if (response.status === 400) {
        return { ok: false, code: "validation_error", message: await mapApiErrorResponse(response) }
      }
      if (response.status === 409) {
        return { ok: false, code: "conflict", message: "競合が発生しました。内容を確認して再試行してください。" }
      }
      return { ok: false, message: await mapApiErrorResponse(response) }
    },
    [catalogBaseUrl, mapApiErrorResponse, token],
  )

  const setAdminProductPublish = useCallback(
    async (productId: string, isPublished: boolean): Promise<{ ok: boolean; code?: string; message: string }> => {
      if (!token) {
        return { ok: false, message: "JWT がありません。再ログインしてください。" }
      }

      const response = await fetch(`${catalogBaseUrl}/admin/products/${productId}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublished }),
      })

      if (response.status === 204) {
        return { ok: true, message: isPublished ? "商品を公開しました。" : "商品を非公開にしました。" }
      }
      if (response.status === 404) {
        return { ok: false, code: "not_found", message: "商品が見つかりません。" }
      }

      if (response.status === 409) {
        return { ok: false, code: "conflict", message: "競合が発生しました。内容を確認して再試行してください。" }
      }
      return { ok: false, message: await mapApiErrorResponse(response) }
    },
    [catalogBaseUrl, mapApiErrorResponse, token],
  )

  const fetchStockLocations = useCallback(async (): Promise<StockLocationResponse[]> => {
    if (!token) {
      throw new Error("JWT がありません。再ログインしてください。")
    }

    const response = await fetch(`${catalogBaseUrl}/admin/inventory/locations`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(await mapApiErrorResponse(response))
    }

    return (await response.json()) as StockLocationResponse[]
  }, [catalogBaseUrl, mapApiErrorResponse, token])

  const fetchLocationStocks = useCallback(
    async (productId: string): Promise<LocationInventoryStockResponse[]> => {
      if (!token) {
        throw new Error("JWT がありません。再ログインしてください。")
      }

      const response = await fetch(`${catalogBaseUrl}/admin/inventory/${productId}/location-stocks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(await mapApiErrorResponse(response))
      }

      return (await response.json()) as LocationInventoryStockResponse[]
    },
    [catalogBaseUrl, mapApiErrorResponse, token],
  )

  const fetchLocationTransfers = useCallback(
    async (productId: string, take = 10): Promise<LocationInventoryTransferResponse[]> => {
      if (!token) {
        throw new Error("JWT がありません。再ログインしてください。")
      }

      const response = await fetch(`${catalogBaseUrl}/admin/inventory/${productId}/transfers?take=${take}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(await mapApiErrorResponse(response))
      }

      return (await response.json()) as LocationInventoryTransferResponse[]
    },
    [catalogBaseUrl, mapApiErrorResponse, token],
  )

  const createLocationTransfer = useCallback(
    async (draft: {
      productId: string
      fromLocationId: string
      toLocationId: string
      quantity: number
      note?: string
    }): Promise<{ ok: boolean; code?: string; message: string; transferId?: string }> => {
      if (!token) {
        return { ok: false, message: "JWT がありません。再ログインしてください。" }
      }

      const response = await fetch(`${catalogBaseUrl}/admin/inventory/transfers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: draft.productId,
          fromLocationId: draft.fromLocationId,
          toLocationId: draft.toLocationId,
          quantity: draft.quantity,
          note: draft.note ?? null,
        }),
      })

      if (response.status === 201) {
        const body = (await response.json()) as LocationTransferCreatedResponse
        return { ok: true, message: "在庫移動を指示しました。", transferId: body.transferId }
      }

      if (response.status === 400) {
        return { ok: false, code: "validation_error", message: await mapApiErrorResponse(response) }
      }

      const code = (await response.text()).replaceAll('"', "")
      if (response.status === 409 && code === "insufficient_stock") {
        return { ok: false, code, message: "移動元ロケーションの在庫が不足しています。" }
      }
      if (response.status === 404 && code === "location_not_found") {
        return { ok: false, code, message: "ロケーションが見つかりません。" }
      }
      if (response.status === 404 && code === "product_not_found") {
        return { ok: false, code, message: "商品が見つかりません。" }
      }
      if (response.status === 400 && code === "invalid_request") {
        return { ok: false, code, message: "移動条件が不正です。" }
      }
      return { ok: false, code, message: await mapApiErrorResponse(response) }
    },
    [catalogBaseUrl, mapApiErrorResponse, token],
  )

  const runTransferAction = useCallback(
    async (transferId: string, action: "ship" | "receive" | "cancel"): Promise<{ ok: boolean; code?: string; message: string }> => {
      if (!token) {
        return { ok: false, message: "JWT がありません。再ログインしてください。" }
      }

      const response = await fetch(`${catalogBaseUrl}/admin/inventory/transfers/${transferId}/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const message =
          action === "ship" ? "出荷を確定しました。" : action === "receive" ? "入荷を確定しました。" : "移動指示を取消しました。"
        return { ok: true, message }
      }

      if (response.status === 400) {
        return { ok: false, code: "validation_error", message: await mapApiErrorResponse(response) }
      }

      const code = (await response.text()).replaceAll('"', "")
      if (response.status === 404 && code === "transfer_not_found") {
        return { ok: false, code, message: "移動指示が見つかりません。" }
      }
      if (response.status === 409 && code === "invalid_status") {
        return { ok: false, code, message: "現在のステータスでは実行できません。" }
      }
      if (response.status === 409 && code === "insufficient_stock") {
        return { ok: false, code, message: "移動元ロケーションの在庫が不足しています。" }
      }

      return { ok: false, code, message: await mapApiErrorResponse(response) }
    },
    [catalogBaseUrl, mapApiErrorResponse, token],
  )

  const receiveInventory = useCallback(
    async (draft: {
      productId: string
      quantity: number
      expectedVersion: number
      note?: string
    }): Promise<InventoryOperationResult> => {
      if (!token) {
        return { ok: false, message: "JWT がありません。再ログインしてください。" }
      }

      const response = await fetch(`${catalogBaseUrl}/admin/inventory/receive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      })

      if (response.status === 204) {
        return { ok: true, message: "入庫を実行しました。" }
      }
      if (response.status === 400) {
        return { ok: false, code: "validation_error", message: await mapApiErrorResponse(response) }
      }

      const code = (await response.text()).replaceAll('"', "")
      if (response.status === 409 && code === "version_conflict") {
        return { ok: false, code, message: "バージョン競合が発生しました。最新データを取得してから再試行してください。" }
      }
      if (response.status === 404) {
        return { ok: false, code, message: "商品が見つかりません。" }
      }
      return { ok: false, code, message: await mapApiErrorResponse(response) }
    },
    [catalogBaseUrl, mapApiErrorResponse, token],
  )

  const issueInventory = useCallback(
    async (draft: {
      productId: string
      quantity: number
      expectedVersion: number
      note?: string
    }): Promise<InventoryOperationResult> => {
      if (!token) {
        return { ok: false, message: "JWT がありません。再ログインしてください。" }
      }

      const response = await fetch(`${catalogBaseUrl}/admin/inventory/issue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      })

      if (response.status === 204) {
        return { ok: true, message: "出庫を実行しました。" }
      }
      if (response.status === 400) {
        return { ok: false, code: "validation_error", message: await mapApiErrorResponse(response) }
      }

      const code = (await response.text()).replaceAll('"', "")
      if (response.status === 409 && code === "version_conflict") {
        return { ok: false, code, message: "バージョン競合が発生しました。最新データを取得してから再試行してください。" }
      }
      if (response.status === 409 && code === "insufficient_available") {
        return { ok: false, code, message: "販売可能在庫が不足しています。" }
      }
      if (response.status === 404) {
        return { ok: false, code, message: "商品が見つかりません。" }
      }
      return { ok: false, code, message: await mapApiErrorResponse(response) }
    },
    [catalogBaseUrl, mapApiErrorResponse, token],
  )

  const adjustInventory = useCallback(
    async (draft: {
      productId: string
      newOnHand: number
      expectedVersion: number
      note?: string
    }): Promise<InventoryOperationResult> => {
      if (!token) {
        return { ok: false, message: "JWT がありません。再ログインしてください。" }
      }

      const response = await fetch(`${catalogBaseUrl}/admin/inventory/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      })

      if (response.status === 204) {
        return { ok: true, message: "棚卸調整を実行しました。" }
      }
      if (response.status === 400) {
        const code = (await response.text()).replaceAll('"', "")
        if (code === "invalid_on_hand") {
          return { ok: false, code, message: "在庫数が不正です。引当中の在庫を下回ることはできません。" }
        }
        return { ok: false, code: "validation_error", message: await mapApiErrorResponse(response) }
      }

      const code = (await response.text()).replaceAll('"', "")
      if (response.status === 409 && code === "version_conflict") {
        return { ok: false, code, message: "バージョン競合が発生しました。最新データを取得してから再試行してください。" }
      }
      if (response.status === 404) {
        return { ok: false, code, message: "商品が見つかりません。" }
      }
      return { ok: false, code, message: await mapApiErrorResponse(response) }
    },
    [catalogBaseUrl, mapApiErrorResponse, token],
  )

  const fetchTransactions = useCallback(
    async (
      productId: string,
      take = 20,
      fromDate?: string,
      toDate?: string,
    ): Promise<InventoryTransactionResponse[]> => {
      if (!token) {
        throw new Error("JWT がありません。再ログインしてください。")
      }

      const query = buildInventoryAuditQuery({ take, fromDate, toDate })
      const response = await fetch(`${catalogBaseUrl}/admin/inventory/${productId}/transactions?${query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(await mapApiErrorResponse(response))
      }

      return (await response.json()) as InventoryTransactionResponse[]
    },
    [catalogBaseUrl, mapApiErrorResponse, token],
  )

  const fetchAuthAuditLogs = useCallback(
    async (take = 50, fromDate?: string, toDate?: string): Promise<AuthAuditLogResponse[]> => {
      if (!token) {
        throw new Error("JWT がありません。再ログインしてください。")
      }

      const query = buildInventoryAuditQuery({ take, fromDate, toDate })
      const response = await fetch(`${identityBaseUrl}/admin/auth-audit-logs?${query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(await mapApiErrorResponse(response))
      }

      return (await response.json()) as AuthAuditLogResponse[]
    },
    [identityBaseUrl, mapApiErrorResponse, token],
  )

  const fetchOrders = useCallback(async (): Promise<OrderResponse[]> => {
    if (!token) {
      throw new Error("JWT がありません。再ログインしてください。")
    }

    const response = await fetch(`${orderBaseUrl}/orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(await mapApiErrorResponse(response))
    }

    return (await response.json()) as OrderResponse[]
  }, [mapApiErrorResponse, orderBaseUrl, token])

  const fetchOrderById = useCallback(
    async (orderId: string): Promise<OrderResponse> => {
      if (!token) {
        throw new Error("JWT がありません。再ログインしてください。")
      }

      const response = await fetch(`${orderBaseUrl}/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(await mapApiErrorResponse(response))
      }

      return (await response.json()) as OrderResponse
    },
    [mapApiErrorResponse, orderBaseUrl, token],
  )

  const changeOrderStatus = useCallback(
    async (orderId: string, nextStatus: string): Promise<{ ok: boolean; message: string }> => {
      if (!token) {
        return { ok: false, message: "JWT がありません。再ログインしてください。" }
      }

      const response = await fetch(`${orderBaseUrl}/admin/orders/${orderId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nextStatus }),
      })

      if (response.status === 204) {
        return { ok: true, message: `注文ステータスを「${nextStatus}」へ更新しました。` }
      }

      if (response.status === 404) {
        return { ok: false, message: mapOrderStatusChangeError("not_found") }
      }

      const code = (await response.text()).replaceAll('"', "")
      if (response.status === 409) {
        return { ok: false, message: mapOrderStatusChangeError(code) }
      }

      return { ok: false, message: await mapApiErrorResponse(response) }
    },
    [mapApiErrorResponse, orderBaseUrl, token],
  )

  const handleAddToCart = (product: ProductResponse) => {
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

  const handleCheckout = useCallback(async (targetProductIds?: string[]): Promise<CheckoutExecutionResult> => {
    if (!token) {
      return {
        results: [],
        message: "JWT がありません。再ログインしてください。",
      }
    }

    const targetItems = targetProductIds && targetProductIds.length > 0
      ? cartItems.filter((x) => targetProductIds.includes(x.productId))
      : cartItems

    if (targetItems.length === 0) {
      return {
        results: [],
        message: "対象の商品がありません。",
      }
    }

    setIsCheckoutLoading(true)

    try {
      const results: CheckoutLineResult[] = []

      for (const item of targetItems) {
        const response = await fetch(`${orderBaseUrl}/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ productId: item.productId, quantity: item.quantity }),
        })

        if (!response.ok) {
          const message = await mapApiErrorResponse(response)
          results.push({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            status: "failed",
            message,
          })
          continue
        }

        results.push({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          status: "success",
          message: "注文作成に成功しました。",
        })
      }

      const successfulIds = new Set(results.filter((x) => x.status === "success").map((x) => x.productId))
      setCartItems((prev) => prev.filter((x) => !successfulIds.has(x.productId)))

      const successCount = results.filter((x) => x.status === "success").length
      const failedCount = results.filter((x) => x.status === "failed").length
      const message =
        failedCount === 0
          ? `注文を作成しました（${successCount}件）。`
          : successCount > 0
            ? `一部成功（成功:${successCount}件 / 失敗:${failedCount}件）`
            : `注文に失敗しました（${failedCount}件）`

      return { results, message }
    } catch (err) {
      return {
        results: [],
        message: err instanceof Error ? err.message : "注文に失敗しました。",
      }
    } finally {
      setIsCheckoutLoading(false)
    }
  }, [cartItems, mapApiErrorResponse, orderBaseUrl, token])

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
              cartCount={cartItems.length}
              isAdmin={isAdmin}
              onLogout={handleLogout}
              onAddToCart={handleAddToCart}
              fetchCategories={fetchCategories}
              fetchProductsPage={fetchProductsPage}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/checkout"
        element={
          token ? (
            <CheckoutPage
              cartItems={cartItems}
              isCheckoutLoading={isCheckoutLoading}
              isAdmin={isAdmin}
              onLogout={handleLogout}
              onRemoveFromCart={handleRemoveFromCart}
              onCartQuantityChange={handleCartQuantityChange}
              onCheckout={handleCheckout}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/orders"
        element={
          token ? (
            <OrdersPage
              isAdmin={isAdmin}
              onLogout={handleLogout}
              fetchOrders={fetchOrders}
              fetchOrderById={fetchOrderById}
              changeOrderStatus={changeOrderStatus}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/admin/products"
        element={
          token ? (
            isAdmin ? (
              <AdminProductsPage
                onLogout={handleLogout}
                fetchCategories={fetchCategories}
                fetchAdminProductsPage={fetchAdminProductsPage}
                createAdminProduct={createAdminProduct}
                updateAdminProduct={updateAdminProduct}
                setAdminProductPublish={setAdminProductPublish}
              />
            ) : (
              <Navigate to="/products" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/admin/inventory"
        element={
          token ? (
            isAdmin ? (
              <AdminInventoryPage
                onLogout={handleLogout}
                fetchProductsPage={fetchProductsPage}
                fetchStockLocations={fetchStockLocations}
                fetchLocationStocks={fetchLocationStocks}
                fetchLocationTransfers={fetchLocationTransfers}
                createLocationTransfer={createLocationTransfer}
                shipLocationTransfer={(transferId) => runTransferAction(transferId, "ship")}
                receiveLocationTransfer={(transferId) => runTransferAction(transferId, "receive")}
                cancelLocationTransfer={(transferId) => runTransferAction(transferId, "cancel")}
              />
            ) : (
              <Navigate to="/products" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/admin/inventory/operations"
        element={
          token ? (
            isAdmin ? (
              <AdminInventoryOperationsPage
                onLogout={handleLogout}
                fetchProductsPage={fetchProductsPage}
                receiveInventory={receiveInventory}
                issueInventory={issueInventory}
                adjustInventory={adjustInventory}
                fetchTransactions={fetchTransactions}
              />
            ) : (
              <Navigate to="/products" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/admin/inventory/audit"
        element={
          token ? (
            isAdmin ? (
              <AdminInventoryAuditPage
                onLogout={handleLogout}
                fetchAdminProductsPage={fetchAdminProductsPage}
                fetchTransactions={fetchTransactions}
                fetchAuthAuditLogs={fetchAuthAuditLogs}
              />
            ) : (
              <Navigate to="/products" replace />
            )
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
