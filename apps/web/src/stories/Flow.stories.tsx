import type { Meta, StoryObj } from "@storybook/react-vite"
import { useMemo, useState, type FormEvent } from "react"
import { MemoryRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom"
import type { CartItem, CategoryResponse, ProductListResponse, ProductResponse } from "../features/catalog/types"
import type { CheckoutExecutionResult, CheckoutLineResult } from "../features/order/checkoutSummary"
import type { OrderResponse } from "../features/order/types"
import CheckoutPage from "../pages/CheckoutPage"
import LoginPage from "../pages/LoginPage"
import OrdersPage from "../pages/OrdersPage"
import ProductDetailPage from "../pages/ProductDetailPage"
import ProductsPage from "../pages/ProductsPage"

const categories: CategoryResponse[] = [
  { id: "cat-1", key: "pc", name: "周辺機器", sortOrder: 1 },
  { id: "cat-2", key: "display", name: "ディスプレイ", sortOrder: 2 },
]

const products: ProductResponse[] = [
  {
    id: "6a9896f4-c8b8-4f46-ab0f-3186dbf61001",
    categoryId: "cat-1",
    categoryKey: "pc",
    categoryName: "周辺機器",
    name: "メカニカルキーボード",
    description: "80%配列のメカニカルキーボード",
    price: 12800,
    onHand: 25,
    reserved: 2,
    available: 23,
    version: 1,
  },
  {
    id: "6a9896f4-c8b8-4f46-ab0f-3186dbf61002",
    categoryId: "cat-2",
    categoryKey: "display",
    categoryName: "ディスプレイ",
    name: "27インチモニター",
    description: "QHD IPSモニター",
    price: 39800,
    onHand: 10,
    reserved: 1,
    available: 9,
    version: 1,
  },
]

function StoryFlowApp() {
  const navigate = useNavigate()
  const [token, setToken] = useState<string | null>(null)
  const [email, setEmail] = useState("admin@test.com")
  const [password, setPassword] = useState("password")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [tokenPreview, setTokenPreview] = useState<string | null>(null)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)
  const [orders, setOrders] = useState<OrderResponse[]>([])

  const fetchCategories = async (): Promise<CategoryResponse[]> => categories

  const fetchProductsPage = async (): Promise<ProductListResponse> => ({
    items: products,
    totalCount: products.length,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  })

  const fetchOrderById = async (orderId: string): Promise<OrderResponse> => {
    const target = orders.find((x) => x.id === orderId)
    return target ?? orders[0]
  }

  const loadProductById = async (productId: string): Promise<ProductResponse> => {
    const product = products.find((x) => x.id === productId)
    if (!product) {
      throw new Error("対象データが見つかりません。")
    }
    return product
  }

  const handleAddToCart = (product: ProductResponse) => {
    setCartItems((prev) => {
      const existing = prev.find((x) => x.productId === product.id)
      if (!existing) {
        return [...prev, { productId: product.id, name: product.name, price: product.price, available: product.available, quantity: 1 }]
      }
      return prev.map((x) =>
        x.productId === product.id ? { ...x, quantity: Math.min(x.quantity + 1, Math.max(1, x.available)) } : x,
      )
    })
  }

  const handleRemoveFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((x) => x.productId !== productId))
  }

  const handleCartQuantityChange = (productId: string, quantity: number) => {
    setCartItems((prev) =>
      prev.map((x) => (x.productId === productId ? { ...x, quantity: Math.max(1, Math.min(quantity, Math.max(1, x.available))) } : x)),
    )
  }

  const handleCheckout = async (): Promise<CheckoutExecutionResult> => {
    setIsCheckoutLoading(true)
    try {
      const now = new Date()
      const results: CheckoutLineResult[] = cartItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        status: "success",
        message: "注文作成に成功しました。",
      }))

      const newOrders: OrderResponse[] = cartItems.map((item, idx) => ({
        id: `${now.getTime()}-${idx}`,
        userId: "2",
        status: "accepted",
        createdAtUtc: now.toISOString(),
        updatedAtUtc: now.toISOString(),
        items: [{ productId: item.productId, quantity: item.quantity }],
      }))
      setOrders((prev) => [...newOrders, ...prev])
      setCartItems([])

      return { results, message: `注文を作成しました（${results.length}件）。` }
    } finally {
      setIsCheckoutLoading(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus("loading")

    if (email === "admin@test.com" && password === "password") {
      const nextToken = "storybook-demo-jwt-token"
      setToken(nextToken)
      setTokenPreview(`${nextToken.slice(0, 10)}...`)
      setStatus("success")
      setError(null)
      navigate("/products")
      return
    }

    setStatus("error")
    setError("メールアドレスまたはパスワードが正しくありません。")
  }

  const handleLogout = () => {
    setToken(null)
    setCartItems([])
    setStatus("idle")
    setTokenPreview(null)
    navigate("/login")
  }

  const identityBaseUrl = useMemo(() => "http://localhost:5001", [])

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
              adminEmail="admin@test.com"
              userEmail="user@test.com"
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onPreset={(role) => {
                setEmail(role === "admin" ? "admin@test.com" : "user@test.com")
                setPassword("password")
                setError(null)
                setStatus("idle")
              }}
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
        path="/products/:productId"
        element={
          token ? (
            <ProductDetailPage token={token} onLogout={handleLogout} onAddToCart={handleAddToCart} fetchProductById={loadProductById} />
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
              onLogout={handleLogout}
              fetchOrders={async () => orders}
              fetchOrderById={fetchOrderById}
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

const meta = {
  title: "Screens/Flow",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const InteractiveTransition: Story = {
  globals: { wireframe: false },
  render: () => (
    <MemoryRouter initialEntries={["/login"]}>
      <StoryFlowApp />
    </MemoryRouter>
  ),
}
